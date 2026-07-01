import type { GoalId, LearnerId } from '@unisson/shared-kernel';
import type { StructuredGoal } from '../domain/structured-goal';

/** Dépôt d'objectifs structurés (§6.1). */
export interface GoalRepositoryPort {
  save(goal: StructuredGoal): Promise<void>;
  getById(id: GoalId): Promise<StructuredGoal | null>;
  listForLearner(learnerId: LearnerId): Promise<StructuredGoal[]>;
}

export const GOAL_REPOSITORY_PORT = Symbol('GoalRepositoryPort');
