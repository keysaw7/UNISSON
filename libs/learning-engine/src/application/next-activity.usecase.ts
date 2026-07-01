import type { ConceptId, LearnerId, PlanId, SkillId } from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import type { LearnerStateRepositoryPort, MasteryModel, MasteryState } from '@unisson/learner-modeling';
import { AdvanceConceptCycleUseCase } from '../application/advance-concept-cycle.usecase';
import { INTERLEAVE_ELIGIBLE_STAGES } from '../domain/concept-learning-cycle';
import type { LearningPlan, PlannedSkill } from '../domain/learning-plan';
import {
  chooseNextActivity,
  type CycleCandidate,
  type DueConcept,
  type LearnCandidate,
  type NextActivity,
} from '../domain/sequencer';
import type { ConceptCycleRepositoryPort } from '../ports/concept-cycle.repository.port';
import type { PlanRepositoryPort } from '../ports/plan.repository.port';

const KNOWN_LEARNED = 0.5;
const MASTERED_CONCEPT = 0.85;
const REVIEW_TARGET = 0.9;

export interface NextActivityInput {
  learnerId: LearnerId;
  planId: PlanId;
  now?: string;
  /** Dernier concept servi (interleaving anti-répétition). */
  lastInterleavedConceptId?: ConceptId;
}

export interface NextActivityResult {
  activity: NextActivity;
  planId: PlanId;
  planVersion: number;
}

/**
 * Sequencer applicatif (§9 + PEDAGOG.md). Assemble le contexte cycle + maîtrise + plan,
 * puis délègue l'arbitrage à `chooseNextActivity`.
 */
export class NextActivityUseCase {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly state: LearnerStateRepositoryPort,
    private readonly model: MasteryModel,
    private readonly plans: PlanRepositoryPort,
    private readonly cycles: ConceptCycleRepositoryPort,
    private readonly cycleResolver: AdvanceConceptCycleUseCase,
  ) {}

  async execute(input: NextActivityInput): Promise<NextActivityResult> {
    const plan = await this.plans.getById(input.planId);
    if (!plan) throw new Error(`Plan introuvable: ${input.planId}`);
    const now = input.now ?? new Date().toISOString();

    const due = await this.collectDue(plan, input.learnerId, now);
    const cycleStates = await this.cycles.listForLearner(input.learnerId);
    const blockingActiveRecall = cycleStates
      .filter((s) => s.stage === 'activeRecall')
      .map((s) => this.toCandidate(s.conceptId, s.skillId, s.stage, plan, input.learnerId));
    const remediation = await Promise.all(
      cycleStates
        .filter((s) => s.stage === 'remediation')
        .map(async (s) => {
          const skill = plan.skillOrder.find((sk) => sk.skillId === s.skillId);
          const st = await this.state.getMastery(input.learnerId, s.conceptId);
          return {
            conceptId: s.conceptId,
            skillId: s.skillId,
            cycleStage: s.stage,
            skillTitle: skill?.title ?? String(s.skillId),
            pMastery: st?.pMastery ?? 0,
          } satisfies CycleCandidate;
        }),
    );

    const interleavePool = await this.collectInterleavePool(plan, input.learnerId, cycleStates);
    const learn = await this.nextLearnCandidate(plan, input.learnerId);

    const resolvedLearn = learn
      ? {
          ...learn,
          cycleStage: learn.cycleStage ?? (await this.cycleResolver.resolve(input.learnerId, learn.conceptId, learn.skillId)).stage,
        }
      : null;

    const resolvedBlocking = await Promise.all(
      blockingActiveRecall.map(async (b) => ({
        ...(await b),
        cycleStage: 'activeRecall' as const,
      })),
    );

    return {
      activity: chooseNextActivity({
        due,
        learn: resolvedLearn,
        blockingActiveRecall: resolvedBlocking,
        remediation,
        interleavePool,
        lastInterleavedConceptId: input.lastInterleavedConceptId,
      }),
      planId: plan.id,
      planVersion: plan.version,
    };
  }

  private toCandidate(
    conceptId: ConceptId,
    skillId: SkillId,
    cycleStage: CycleCandidate['cycleStage'],
    plan: LearningPlan,
    learnerId: LearnerId,
  ): Promise<CycleCandidate> {
    return (async () => {
      const skill = plan.skillOrder.find((s) => s.skillId === skillId);
      const st = await this.state.getMastery(learnerId, conceptId);
      return {
        conceptId,
        skillId,
        cycleStage,
        skillTitle: skill?.title ?? String(skillId),
        pMastery: st?.pMastery ?? 0,
      };
    })();
  }

  private async collectInterleavePool(
    plan: LearningPlan,
    learnerId: LearnerId,
    cycleStates: Awaited<ReturnType<ConceptCycleRepositoryPort['listForLearner']>>,
  ): Promise<CycleCandidate[]> {
    const eligible = cycleStates.filter((s) => INTERLEAVE_ELIGIBLE_STAGES.includes(s.stage));
    if (eligible.length < 2) return [];

    return Promise.all(
      eligible.map(async (s) => {
        const skill = plan.skillOrder.find((sk) => sk.skillId === s.skillId);
        const st = await this.state.getMastery(learnerId, s.conceptId);
        return {
          conceptId: s.conceptId,
          skillId: s.skillId,
          cycleStage: s.stage,
          skillTitle: skill?.title ?? String(s.skillId),
          pMastery: st?.pMastery ?? 0,
        };
      }),
    );
  }

  private async collectDue(plan: LearningPlan, learnerId: LearnerId, now: string): Promise<DueConcept[]> {
    const due: DueConcept[] = [];
    for (const skill of plan.skillOrder) {
      const concepts = await this.graph.getConceptsForSkill(skill.skillId);
      for (const concept of concepts) {
        const st = await this.state.getMastery(learnerId, concept.id);
        if (!st || st.pMastery < KNOWN_LEARNED) continue;
        if (this.model.memoryRetention(st, now) < REVIEW_TARGET) {
          due.push({ conceptId: concept.id, skillId: skill.skillId, retrievability: this.model.retrievability(st, now) });
        }
      }
    }
    return due.sort((a, b) => a.retrievability - b.retrievability);
  }

  private async nextLearnCandidate(plan: LearningPlan, learnerId: LearnerId): Promise<LearnCandidate | null> {
    for (const nextSkill of plan.skillOrder) {
      const candidate = await this.learnCandidateForSkill(nextSkill, learnerId);
      if (candidate) return candidate;
    }
    return null;
  }

  /** Parcourt les compétences du plan (interleaving au niveau compétence, pas seulement skillOrder[0]). */
  private async learnCandidateForSkill(nextSkill: PlannedSkill, learnerId: LearnerId): Promise<LearnCandidate | null> {
    const concepts = await this.graph.getConceptsForSkill(nextSkill.skillId);
    if (concepts.length === 0) return null;

    const withMastery = await Promise.all(
      concepts.map(async (c) => ({
        concept: c,
        state: await this.state.getMastery(learnerId, c.id),
        cycle: await this.cycleResolver.resolve(learnerId, c.id, nextSkill.skillId),
      })),
    );
    const pOf = (s: MasteryState | null): number => s?.pMastery ?? 0;

    if (nextSkill.status === 'to_acquire') {
      const fresh = withMastery.find((w) => pOf(w.state) < KNOWN_LEARNED);
      if (fresh) {
        return {
          kind: 'introduce',
          conceptId: fresh.concept.id,
          skillId: nextSkill.skillId,
          skillTitle: nextSkill.title,
          pMastery: pOf(fresh.state),
          cycleStage: fresh.cycle.stage,
        };
      }
    }

    const weakest = withMastery
      .filter((w) => pOf(w.state) < MASTERED_CONCEPT)
      .sort((a, b) => pOf(a.state) - pOf(b.state))[0];
    if (weakest) {
      return {
        kind: 'remediate',
        conceptId: weakest.concept.id,
        skillId: nextSkill.skillId,
        skillTitle: nextSkill.title,
        pMastery: pOf(weakest.state),
        cycleStage: weakest.cycle.stage,
      };
    }

    return null;
  }
}
