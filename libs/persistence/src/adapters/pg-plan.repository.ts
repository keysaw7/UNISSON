import { asc, desc, eq } from 'drizzle-orm';
import type { GoalId, LearnerId, PlanId } from '@unisson/shared-kernel';
import type { LearningPlan, PlanRepositoryPort } from '@unisson/learning-engine';
import type { Db } from '../client';
import { learningPlan } from '../schema';

/** Dépôt de plans versionnés (§6.3). Le plan complet est stocké en `jsonb` (état, pas event-sourcé). */
export class PgPlanRepository implements PlanRepositoryPort {
  constructor(private readonly db: Db) {}

  async save(plan: LearningPlan): Promise<void> {
    await this.db
      .insert(learningPlan)
      .values({
        id: plan.id,
        goalId: plan.goalId,
        learnerId: plan.learnerId,
        domain: plan.domain,
        version: plan.version,
        plan,
        createdAt: plan.createdAt,
      })
      .onConflictDoUpdate({ target: learningPlan.id, set: { plan, version: plan.version } });
  }

  async getById(id: PlanId): Promise<LearningPlan | null> {
    const rows = await this.db.select().from(learningPlan).where(eq(learningPlan.id, id)).limit(1);
    return rows[0] ? (rows[0].plan as LearningPlan) : null;
  }

  async getLatestForGoal(goalId: GoalId): Promise<LearningPlan | null> {
    const rows = await this.db
      .select()
      .from(learningPlan)
      .where(eq(learningPlan.goalId, goalId))
      .orderBy(desc(learningPlan.version))
      .limit(1);
    return rows[0] ? (rows[0].plan as LearningPlan) : null;
  }

  async listForLearner(learnerId: LearnerId): Promise<LearningPlan[]> {
    const rows = await this.db
      .select()
      .from(learningPlan)
      .where(eq(learningPlan.learnerId, learnerId))
      .orderBy(asc(learningPlan.createdAt));
    return rows.map((r) => r.plan as LearningPlan);
  }
}
