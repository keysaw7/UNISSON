import type { LearnerId, PlanId } from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import type { LearnerStateRepositoryPort, MasteryModel, MasteryState } from '@unisson/learner-modeling';
import type { LearningPlan, PlannedSkill } from '../domain/learning-plan';
import {
  chooseNextActivity,
  type DueConcept,
  type LearnCandidate,
  type NextActivity,
} from '../domain/sequencer';
import type { PlanRepositoryPort } from '../ports/plan.repository.port';

const KNOWN_LEARNED = 0.5; // concept « appris » (peut être révisé)
const MASTERED_CONCEPT = 0.85;
const REVIEW_TARGET = 0.9; // rétention mémoire cible avant de proposer une révision

export interface NextActivityInput {
  learnerId: LearnerId;
  planId: PlanId;
  now?: string;
}

export interface NextActivityResult {
  activity: NextActivity;
  planId: PlanId;
  planVersion: number;
}

/**
 * Sequencer applicatif (§9). Assemble le contexte (concepts dus + prochaine brique du plan) à
 * partir du graphe et de l'état de maîtrise, puis délègue l'arbitrage à `chooseNextActivity`.
 */
export class NextActivityUseCase {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly state: LearnerStateRepositoryPort,
    private readonly model: MasteryModel,
    private readonly plans: PlanRepositoryPort,
  ) {}

  async execute(input: NextActivityInput): Promise<NextActivityResult> {
    const plan = await this.plans.getById(input.planId);
    if (!plan) throw new Error(`Plan introuvable: ${input.planId}`);
    const now = input.now ?? new Date().toISOString();

    const due = await this.collectDue(plan, input.learnerId, now);
    const learn = await this.nextLearnCandidate(plan, input.learnerId);

    return {
      activity: chooseNextActivity({ due, learn }),
      planId: plan.id,
      planVersion: plan.version,
    };
  }

  /** Concepts déjà appris mais dont la mémoire a suffisamment décru → à réviser (§8/§9). */
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

  /** Prochaine brique : remédier un concept faible, ou introduire un nouveau concept. */
  private async nextLearnCandidate(plan: LearningPlan, learnerId: LearnerId): Promise<LearnCandidate | null> {
    const nextSkill: PlannedSkill | undefined = plan.skillOrder[0];
    if (!nextSkill) return null;

    const concepts = await this.graph.getConceptsForSkill(nextSkill.skillId);
    if (concepts.length === 0) return null;

    const withMastery = await Promise.all(
      concepts.map(async (c) => ({ concept: c, state: await this.state.getMastery(learnerId, c.id) })),
    );
    const pOf = (s: MasteryState | null): number => s?.pMastery ?? 0;

    if (nextSkill.status === 'to_acquire') {
      const fresh = withMastery.find((w) => pOf(w.state) < KNOWN_LEARNED);
      if (fresh) {
        return { kind: 'introduce', conceptId: fresh.concept.id, skillId: nextSkill.skillId, skillTitle: nextSkill.title, pMastery: pOf(fresh.state) };
      }
    }

    // to_remediate (ou to_acquire dont tous les concepts sont déjà « connus ») → renforcer le plus faible.
    const weakest = withMastery
      .filter((w) => pOf(w.state) < MASTERED_CONCEPT)
      .sort((a, b) => pOf(a.state) - pOf(b.state))[0];
    if (weakest) {
      return { kind: 'remediate', conceptId: weakest.concept.id, skillId: nextSkill.skillId, skillTitle: nextSkill.title, pMastery: pOf(weakest.state) };
    }

    return null;
  }
}
