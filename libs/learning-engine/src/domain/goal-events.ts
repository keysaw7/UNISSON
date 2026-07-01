import type { GoalId, LearnerId } from '@unisson/shared-kernel';

/** Événements Goal Intake (§6.1, §12.5). */
export const GOAL_EVENTS = {
  GoalCreated: 'GoalCreated',
} as const;

export interface GoalCreatedPayload {
  goalId: GoalId;
  learnerId: LearnerId;
  domain: string;
  targetSkills: string[];
  confidence: number;
  needsClarification: boolean;
}
