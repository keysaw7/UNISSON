import type { GoalId, LearnerId, PlanId } from '@unisson/shared-kernel';
import type { LearningPlan } from '../domain/learning-plan';
import type { PlanRepositoryPort } from '../ports/plan.repository.port';

export class InMemoryPlanRepository implements PlanRepositoryPort {
  private readonly plans = new Map<PlanId, LearningPlan>();

  async save(plan: LearningPlan): Promise<void> {
    this.plans.set(plan.id, plan);
  }

  async getById(id: PlanId): Promise<LearningPlan | null> {
    return this.plans.get(id) ?? null;
  }

  async getLatestForGoal(goalId: GoalId): Promise<LearningPlan | null> {
    return (
      [...this.plans.values()]
        .filter((p) => p.goalId === goalId)
        .sort((a, b) => b.version - a.version)[0] ?? null
    );
  }

  async listForLearner(learnerId: LearnerId): Promise<LearningPlan[]> {
    return [...this.plans.values()].filter((p) => p.learnerId === learnerId);
  }
}
