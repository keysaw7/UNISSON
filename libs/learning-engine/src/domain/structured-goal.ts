import type { GoalId, LearnerId } from '@unisson/shared-kernel';

export interface GoalConstraints {
  minutesPerDay?: number;
  deadline?: string; // ISO
  preferredFormats?: string[];
}

/**
 * Objectif structuré (§6.1) — la CIBLE exploitable dans le graphe, produite par le
 * moteur (pas par l'IA). `targetSkills` = frontière cible pour le Planner.
 */
export interface StructuredGoal {
  id: GoalId;
  learnerId: LearnerId;
  domain: string;
  rawStatement: string;
  targetSkills: string[];
  targetLevel: string;
  motivation?: string;
  constraints: GoalConstraints;
  /** Confiance du parsing (0..1) : sous un seuil, le moteur exige des clarifications. */
  confidence: number;
  clarificationsNeeded: string[];
}

/** Seuil en-dessous duquel le moteur considère l'objectif ambigu. */
export const GOAL_CONFIDENCE_THRESHOLD = 0.6;

export function goalNeedsClarification(goal: Pick<StructuredGoal, 'confidence' | 'clarificationsNeeded'>): boolean {
  return goal.confidence < GOAL_CONFIDENCE_THRESHOLD || goal.clarificationsNeeded.length > 0;
}
