import {
  createEvent,
  makeId,
  type DomainEvent,
  type GoalId,
  type LearnerId,
  type OutboxPort,
  type PlanId,
  type SkillId,
} from '@unisson/shared-kernel';
import type { Concept, KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import type { LearnerStateRepositoryPort, MasteryState } from '@unisson/learner-modeling';
import type { LearningPlan, PlannedSkillStatus } from '../domain/learning-plan';
import { PLANNER_EVENTS } from '../domain/planner-events';
import type { PlannerSkillInput, PlannerStrategyPort } from '../domain/planner-strategy';
import type { PlanRepositoryPort } from '../ports/plan.repository.port';

/** Seuils de classification d'une compétence par agrégation de la maîtrise de ses concepts. */
const MASTERED_CONCEPT = 0.85;
const KNOWN_CONCEPT = 0.5;
const EFFORT_PER_CONCEPT_MIN = 15;

export interface CreatePlanInput {
  goalId: GoalId;
  learnerId: LearnerId;
  domain: string;
  targetSkills: SkillId[];
  motivation?: string;
  minutesPerDay?: number;
  horizonDays?: number;
  correlationId?: string;
}

export interface CreatePlanResult {
  plan: LearningPlan;
  events: DomainEvent[];
}

/**
 * Curriculum Planner (§6.3, ADR-016). Transforme « où je suis / où je vais » en chemin ordonné :
 * 1) clôture transitive des prérequis depuis la cible ; 2) soustraction de l'acquis (par concept) ;
 * 3) ordonnancement (tri topologique glouton pondéré) ; 4) faisabilité vs budget.
 *
 * Le moteur PROPOSE : si infaisable, il remonte des options, l'utilisateur tranche.
 */
export class CreatePlanUseCase {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly state: LearnerStateRepositoryPort,
    private readonly strategy: PlannerStrategyPort,
    private readonly plans: PlanRepositoryPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: CreatePlanInput): Promise<CreatePlanResult> {
    // 1) Ensemble requis = cibles + clôture transitive des prérequis.
    const required = new Set<SkillId>(input.targetSkills);
    for (const target of input.targetSkills) {
      for (const dep of await this.graph.getTransitivePrerequisiteIds(target)) required.add(dep);
    }

    // 2) Classer chaque compétence requise + estimer l'effort restant.
    const requiredIds = [...required];
    const skillInputs: PlannerSkillInput[] = [];
    for (const skillId of requiredIds) {
      const skill = await this.graph.getSkill(skillId);
      const concepts = await this.graph.getConceptsForSkill(skillId);
      const masteries = await Promise.all(
        concepts.map((c) => this.state.getMastery(input.learnerId, c.id)),
      );

      const { status, effortMinutes } = this.classify(concepts, masteries);
      const prerequisites = (await this.graph.getPrerequisites(skillId))
        .map((e) => e.requiresSkillId)
        .filter((id) => required.has(id));

      skillInputs.push({
        skillId,
        title: skill?.title ?? skillId,
        status,
        estimatedEffortMinutes: effortMinutes,
        prerequisites,
      });
    }

    // 3) Ordonner (les maîtrisées sont exclues de l'ordre mais servent de prérequis satisfaits).
    const skillOrder = this.strategy.order({
      skills: skillInputs,
      motivation: input.motivation,
    });

    // 4) Faisabilité.
    const totalEffortMinutes = skillOrder.reduce((sum, s) => sum + s.estimatedEffortMinutes, 0);
    const budgetMinutes =
      input.minutesPerDay && input.horizonDays ? input.minutesPerDay * input.horizonDays : undefined;
    const feasible = budgetMinutes === undefined || totalEffortMinutes <= budgetMinutes;

    const version = ((await this.plans.getLatestForGoal(input.goalId))?.version ?? 0) + 1;
    const plan: LearningPlan = {
      id: makeId<'PlanId'>() as PlanId,
      goalId: input.goalId,
      learnerId: input.learnerId,
      domain: input.domain,
      version,
      skillOrder,
      estimatedEffortMinutes: totalEffortMinutes,
      assumptions: {
        minutesPerDay: input.minutesPerDay,
        deadline: undefined,
        totalEffortMinutes,
        budgetMinutes,
        feasible,
      },
      createdAt: new Date().toISOString(),
    };
    await this.plans.save(plan);

    // Événements.
    const events: DomainEvent[] = [
      createEvent({
        type: PLANNER_EVENTS.PlanCreated,
        aggregateType: 'LearningPlan',
        aggregateId: plan.id,
        correlationId: input.correlationId,
        payload: {
          planId: plan.id,
          goalId: plan.goalId,
          learnerId: plan.learnerId,
          version: plan.version,
          skillCount: skillOrder.length,
          estimatedEffortMinutes: totalEffortMinutes,
        },
      }),
    ];

    if (!feasible && budgetMinutes !== undefined) {
      events.push(
        createEvent({
          type: PLANNER_EVENTS.GoalInfeasibleDetected,
          aggregateType: 'LearningPlan',
          aggregateId: plan.id,
          correlationId: events[0]!.correlationId,
          causationId: events[0]!.eventId,
          payload: {
            goalId: plan.goalId,
            learnerId: plan.learnerId,
            totalEffortMinutes,
            budgetMinutes,
            options: [
              'réduire le périmètre (moins de compétences cibles)',
              'allonger le délai',
              'augmenter le temps quotidien',
            ],
          },
        }),
      );
    }

    await this.outbox.enqueue(events);
    return { plan, events };
  }

  /** Agrège la maîtrise des concepts d'une compétence → statut + effort restant estimé. */
  private classify(
    concepts: Concept[],
    masteries: (MasteryState | null)[],
  ): { status: PlannedSkillStatus; effortMinutes: number } {
    if (concepts.length === 0) {
      return { status: 'to_acquire', effortMinutes: EFFORT_PER_CONCEPT_MIN };
    }

    const p = concepts.map((_, i) => masteries[i]?.pMastery ?? 0);
    const masteredCount = p.filter((v) => v >= MASTERED_CONCEPT).length;
    const knownCount = p.filter((v) => v >= KNOWN_CONCEPT).length;

    let status: PlannedSkillStatus;
    if (masteredCount === concepts.length) status = 'mastered';
    else if (knownCount > 0 || masteredCount > 0) status = 'to_remediate';
    else status = 'to_acquire';

    // Effort : seuls les concepts non encore maîtrisés comptent, pondérés par la difficulté.
    let effortMinutes = 0;
    concepts.forEach((c, i) => {
      if (p[i]! < MASTERED_CONCEPT) effortMinutes += EFFORT_PER_CONCEPT_MIN * (1 + c.difficulty);
    });
    return { status, effortMinutes: Math.round(effortMinutes) };
  }
}
