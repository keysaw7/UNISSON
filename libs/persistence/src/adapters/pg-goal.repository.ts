import { asc, eq } from 'drizzle-orm';
import type { GoalId, LearnerId } from '@unisson/shared-kernel';
import type { StructuredGoal, GoalRepositoryPort } from '@unisson/learning-engine';
import type { Db } from '../client';
import { goal } from '../schema';

/** Dépôt d'objectifs structurés (§6.1). L'objectif complet est stocké en `jsonb`. */
export class PgGoalRepository implements GoalRepositoryPort {
  constructor(private readonly db: Db) {}

  async save(structuredGoal: StructuredGoal): Promise<void> {
    await this.db
      .insert(goal)
      .values({
        id: structuredGoal.id,
        learnerId: structuredGoal.learnerId,
        domain: structuredGoal.domain,
        goal: structuredGoal,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: goal.id,
        set: { goal: structuredGoal, domain: structuredGoal.domain },
      });
  }

  async getById(id: GoalId): Promise<StructuredGoal | null> {
    const rows = await this.db.select().from(goal).where(eq(goal.id, id)).limit(1);
    return rows[0] ? (rows[0].goal as StructuredGoal) : null;
  }

  async listForLearner(learnerId: LearnerId): Promise<StructuredGoal[]> {
    const rows = await this.db
      .select()
      .from(goal)
      .where(eq(goal.learnerId, learnerId))
      .orderBy(asc(goal.createdAt));
    return rows.map((r) => r.goal as StructuredGoal);
  }
}
