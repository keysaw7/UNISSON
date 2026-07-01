import type { GoalId, LearnerId } from '@unisson/shared-kernel';
import type { StructuredGoal } from '../domain/structured-goal';
import type { GoalRepositoryPort } from '../ports/goal.repository.port';

export class InMemoryGoalRepository implements GoalRepositoryPort {
  private readonly goals = new Map<GoalId, StructuredGoal>();

  async save(goal: StructuredGoal): Promise<void> {
    this.goals.set(goal.id, goal);
  }

  async getById(id: GoalId): Promise<StructuredGoal | null> {
    return this.goals.get(id) ?? null;
  }

  async listForLearner(learnerId: LearnerId): Promise<StructuredGoal[]> {
    return [...this.goals.values()]
      .filter((g) => g.learnerId === learnerId)
      .sort((a, b) => b.id.localeCompare(a.id));
  }
}
