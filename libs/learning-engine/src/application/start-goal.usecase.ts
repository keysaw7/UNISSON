import { makeId, type GoalId, type LearnerId } from '@unisson/shared-kernel';
import { GOAL_CONFIDENCE_THRESHOLD, type StructuredGoal } from '../domain/structured-goal';
import type { GoalParserPort } from '../ports/goal-parser.port';

export interface StartGoalInput {
  learnerId: LearnerId;
  rawStatement: string;
}

/**
 * Use-case d'entrée du parcours (§6.1). L'IA propose un brouillon via `GoalParserPort` ;
 * c'est le MOTEUR qui décide de la structure finale et de la nécessité de clarifier.
 */
export class StartGoalUseCase {
  constructor(private readonly goalParser: GoalParserPort) {}

  async execute(input: StartGoalInput): Promise<StructuredGoal> {
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

    return {
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
    };
  }
}
