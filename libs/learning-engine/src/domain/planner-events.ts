import type { GoalId, LearnerId, PlanId } from '@unisson/shared-kernel';

/** Événements du Planner (§6.3, §12.5). */
export const PLANNER_EVENTS = {
  PlanCreated: 'PlanCreated',
  PathReplanned: 'PathReplanned',
  MilestoneReached: 'MilestoneReached',
  GoalInfeasibleDetected: 'GoalInfeasibleDetected',
} as const;

export interface PlanCreatedPayload {
  planId: PlanId;
  goalId: GoalId;
  learnerId: LearnerId;
  version: number;
  skillCount: number;
  estimatedEffortMinutes: number;
}

export interface GoalInfeasibleDetectedPayload {
  goalId: GoalId;
  learnerId: LearnerId;
  totalEffortMinutes: number;
  budgetMinutes: number;
  /** Pistes remontées à l'utilisateur (le moteur propose, l'utilisateur tranche, §6.3). */
  options: string[];
}
