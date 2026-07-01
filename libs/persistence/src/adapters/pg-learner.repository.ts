import { eq } from 'drizzle-orm';
import type { Learner, LearnerRepositoryPort } from '@unisson/identity';
import type { LearnerId } from '@unisson/shared-kernel';
import type { Db } from '../client';
import { learner as learnerTable } from '../schema';

/** Dépôt d'apprenants pseudonymes (§13.2). */
export class PgLearnerRepository implements LearnerRepositoryPort {
  constructor(private readonly db: Db) {}

  async save(learner: Learner): Promise<void> {
    await this.db
      .insert(learnerTable)
      .values({
        id: learner.id,
        createdAt: learner.createdAt,
      })
      .onConflictDoNothing();
  }

  async getById(id: LearnerId): Promise<Learner | null> {
    const rows = await this.db.select().from(learnerTable).where(eq(learnerTable.id, id)).limit(1);
    return rows[0] ? { id: rows[0].id as LearnerId, createdAt: rows[0].createdAt } : null;
  }
}
