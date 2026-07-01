import { and, eq } from 'drizzle-orm';
import type { LearningObject, LearningObjectLookupKey, LearningObjectRepositoryPort } from '@unisson/content';
import type { Db } from '../client';
import { learningObject } from '../schema';

/** Dépôt d'objets pédagogiques générés (§7). */
export class PgLearningObjectRepository implements LearningObjectRepositoryPort {
  constructor(private readonly db: Db) {}

  async save(object: LearningObject, meta?: { provider?: string }): Promise<void> {
    await this.db
      .insert(learningObject)
      .values({
        id: object.id,
        targetRef: object.targetRef,
        format: object.format,
        difficulty: object.difficulty,
        contentRef: object.contentRef,
        provider: meta?.provider ?? 'unknown',
        createdAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: learningObject.id,
        set: {
          contentRef: object.contentRef,
          provider: meta?.provider ?? 'unknown',
        },
      });
  }

  async findByKey(key: LearningObjectLookupKey): Promise<LearningObject | null> {
    const rows = await this.db
      .select()
      .from(learningObject)
      .where(
        and(
          eq(learningObject.targetRef, key.targetRef),
          eq(learningObject.format, key.format),
          eq(learningObject.difficulty, key.difficulty),
        ),
      )
      .limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async getById(id: string): Promise<LearningObject | null> {
    const rows = await this.db.select().from(learningObject).where(eq(learningObject.id, id)).limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  private toDomain(row: typeof learningObject.$inferSelect): LearningObject {
    return {
      id: row.id,
      targetRef: row.targetRef,
      format: row.format as LearningObject['format'],
      difficulty: row.difficulty,
      contentRef: row.contentRef,
    };
  }
}
