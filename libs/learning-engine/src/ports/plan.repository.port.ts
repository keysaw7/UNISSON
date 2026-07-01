import type { GoalId, LearnerId, PlanId } from '@unisson/shared-kernel';
import type { LearningPlan } from '../domain/learning-plan';

/** Dépôt de plans VERSIONNÉS (§6.3). Chaque re-planification crée une nouvelle version. */
export interface PlanRepositoryPort {
  save(plan: LearningPlan): Promise<void>;
  getById(id: PlanId): Promise<LearningPlan | null>;
  getLatestForGoal(goalId: GoalId): Promise<LearningPlan | null>;
  listForLearner(learnerId: LearnerId): Promise<LearningPlan[]>;
}

export const PLAN_REPOSITORY_PORT = Symbol('PlanRepositoryPort');
