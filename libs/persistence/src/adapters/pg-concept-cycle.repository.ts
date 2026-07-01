import { and, eq } from 'drizzle-orm';
import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { ConceptCycleState } from '@unisson/learning-engine';
import type { ConceptCycleRepositoryPort } from '@unisson/learning-engine';
import type { Db } from '../client';
import { conceptLearningCycle, skillActivation } from '../schema';

export class PgConceptCycleRepository implements ConceptCycleRepositoryPort {
  constructor(private readonly db: Db) {}

  async get(learnerId: LearnerId, conceptId: ConceptId): Promise<ConceptCycleState | null> {
    const rows = await this.db
      .select()
      .from(conceptLearningCycle)
      .where(and(eq(conceptLearningCycle.learnerId, learnerId), eq(conceptLearningCycle.conceptId, conceptId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      learnerId: row.learnerId as LearnerId,
      conceptId: row.conceptId as ConceptId,
      skillId: row.skillId as SkillId,
      stage: row.stage as ConceptCycleState['stage'],
      consecutiveSuccesses: row.consecutiveSuccesses,
      updatedAt: row.updatedAt,
    };
  }

  async save(state: ConceptCycleState): Promise<void> {
    await this.db
      .insert(conceptLearningCycle)
      .values({
        learnerId: state.learnerId,
        conceptId: state.conceptId,
        skillId: state.skillId,
        stage: state.stage,
        consecutiveSuccesses: state.consecutiveSuccesses,
        updatedAt: state.updatedAt,
      })
      .onConflictDoUpdate({
        target: [conceptLearningCycle.learnerId, conceptLearningCycle.conceptId],
        set: {
          skillId: state.skillId,
          stage: state.stage,
          consecutiveSuccesses: state.consecutiveSuccesses,
          updatedAt: state.updatedAt,
        },
      });
  }

  async listForLearner(learnerId: LearnerId): Promise<ConceptCycleState[]> {
    const rows = await this.db.select().from(conceptLearningCycle).where(eq(conceptLearningCycle.learnerId, learnerId));
    return rows.map((row) => ({
      learnerId: row.learnerId as LearnerId,
      conceptId: row.conceptId as ConceptId,
      skillId: row.skillId as SkillId,
      stage: row.stage as ConceptCycleState['stage'],
      consecutiveSuccesses: row.consecutiveSuccesses,
      updatedAt: row.updatedAt,
    }));
  }

  async isSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(skillActivation)
      .where(and(eq(skillActivation.learnerId, learnerId), eq(skillActivation.skillId, skillId)))
      .limit(1);
    return rows.length > 0;
  }

  async markSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<void> {
    await this.db
      .insert(skillActivation)
      .values({ learnerId, skillId, activatedAt: new Date().toISOString() })
      .onConflictDoNothing();
  }
}
