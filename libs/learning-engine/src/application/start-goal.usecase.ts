import {
  createEvent,
  makeId,
  type DomainEvent,
  type GoalId,
  type LearnerId,
  type OutboxPort,
} from '@unisson/shared-kernel';
import { GOAL_CONFIDENCE_THRESHOLD, goalNeedsClarification, type StructuredGoal, type SuccessCriterion } from '../domain/structured-goal';
import { GOAL_EVENTS } from '../domain/goal-events';
import type { GoalParserPort } from '../ports/goal-parser.port';
import type { GoalRepositoryPort } from '../ports/goal.repository.port';

export interface StartGoalInput {
  learnerId: LearnerId;
  rawStatement: string;
  correlationId?: string;
}

export interface StartGoalResult {
  goal: StructuredGoal;
  events: DomainEvent[];
}

/**
 * Use-case d'entrée du parcours (§6.1). L'IA propose un brouillon via `GoalParserPort` ;
 * c'est le MOTEUR qui décide de la structure finale et de la nécessité de clarifier.
 */
export class StartGoalUseCase {
  constructor(
    private readonly goalParser: GoalParserPort,
    private readonly goals: GoalRepositoryPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: StartGoalInput): Promise<StartGoalResult> {
    const raw = input.rawStatement.trim();
    if (raw.length === 0) {
      throw new Error('rawStatement vide : impossible de définir un objectif.');
    }

    const draft = await this.goalParser.parse(raw);

    // Décision métier : on borne la confiance et on force une clarification si le
    // domaine est inconnu (règle du moteur, pas de l'IA).
    const clarifications = [...draft.clarificationsNeeded];
    if (draft.domain === 'unknown' && !clarifications.length) {
      clarifications.push('Peux-tu préciser le domaine que tu souhaites apprendre ?');
    }

    const confidence = Math.max(0, Math.min(1, draft.confidence));

    const successCriteria: SuccessCriterion[] | undefined =
      draft.domain === 'japanese'
        ? [
            {
              id: 'jlpt-n5-target',
              description: `Maîtriser les compétences cibles au niveau ${draft.targetLevel || 'N5'}`,
              measurable: true,
            },
            {
              id: 'active-recall',
              description: 'Réussir le rappel actif sans indice sur chaque concept du parcours',
              measurable: true,
            },
            {
              id: 'transfer',
              description: 'Appliquer les concepts dans un contexte nouveau (transfert)',
              measurable: true,
            },
          ]
        : undefined;

    const goal: StructuredGoal = {
      id: makeId<'GoalId'>() as GoalId,
      learnerId: input.learnerId,
      domain: draft.domain,
      rawStatement: raw,
      targetSkills: draft.targetSkills,
      targetLevel: draft.targetLevel,
      motivation: draft.motivation,
      constraints: draft.constraints,
      confidence:
        clarifications.length > 0 ? Math.min(confidence, GOAL_CONFIDENCE_THRESHOLD - 0.01) : confidence,
      clarificationsNeeded: clarifications,
      successCriteria,
    };

    await this.goals.save(goal);

    const events: DomainEvent[] = [
      createEvent({
        type: GOAL_EVENTS.GoalCreated,
        aggregateType: 'StructuredGoal',
        aggregateId: goal.id,
        correlationId: input.correlationId,
        payload: {
          goalId: goal.id,
          learnerId: goal.learnerId,
          domain: goal.domain,
          targetSkills: goal.targetSkills,
          confidence: goal.confidence,
          needsClarification: goalNeedsClarification(goal),
        },
      }),
    ];

    await this.outbox.enqueue(events);
    return { goal, events };
  }
}
