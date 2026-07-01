import { and, asc, eq } from 'drizzle-orm';
import { asId, type ConceptId, type LearnerId } from '@unisson/shared-kernel';
import type {
  EvidenceEvent,
  EvidenceRepositoryPort,
  LearnerStateRepositoryPort,
  MasteryState,
} from '@unisson/learner-modeling';
import type { Db } from '../client';
import { evidenceEvent, masteryState } from '../schema';

/** Projection de maîtrise (upsert sur (learner, concept)). */
export class PgLearnerStateRepository implements LearnerStateRepositoryPort {
  constructor(private readonly db: Db) {}

  async getMastery(learnerId: LearnerId, conceptId: ConceptId): Promise<MasteryState | null> {
    const rows = await this.db
      .select()
      .from(masteryState)
      .where(and(eq(masteryState.learnerId, learnerId), eq(masteryState.conceptId, conceptId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      learnerId: asId<'LearnerId'>(row.learnerId),
      conceptId: asId<'ConceptId'>(row.conceptId),
      pMastery: row.pMastery,
      stability: row.stability,
      lastReviewedAt: row.lastReviewedAt,
    };
  }

  async saveMastery(state: MasteryState): Promise<void> {
    await this.db
      .insert(masteryState)
      .values({
        learnerId: state.learnerId,
        conceptId: state.conceptId,
        pMastery: state.pMastery,
        stability: state.stability,
        lastReviewedAt: state.lastReviewedAt,
      })
      .onConflictDoUpdate({
        target: [masteryState.learnerId, masteryState.conceptId],
        set: {
          pMastery: state.pMastery,
          stability: state.stability,
          lastReviewedAt: state.lastReviewedAt,
        },
      });
  }
}

/** Journal des preuves (append-only, source de vérité §12.2). */
export class PgEvidenceRepository implements EvidenceRepositoryPort {
  constructor(private readonly db: Db) {}

  async append(evidence: EvidenceEvent): Promise<void> {
    await this.db.insert(evidenceEvent).values({
      id: evidence.id,
      learnerId: evidence.learnerId,
      conceptId: evidence.conceptId,
      occurredAt: evidence.occurredAt,
      correct: evidence.correct,
      score: evidence.score,
      difficulty: evidence.difficulty,
      responseTimeMs: evidence.responseTimeMs ?? null,
      evidenceWeight: evidence.evidenceWeight,
    });
  }

  async listByLearnerConcept(learnerId: LearnerId, conceptId: ConceptId): Promise<EvidenceEvent[]> {
    const rows = await this.db
      .select()
      .from(evidenceEvent)
      .where(and(eq(evidenceEvent.learnerId, learnerId), eq(evidenceEvent.conceptId, conceptId)))
      .orderBy(asc(evidenceEvent.occurredAt));
    return rows.map((r) => ({
      id: r.id,
      learnerId: asId<'LearnerId'>(r.learnerId),
      conceptId: asId<'ConceptId'>(r.conceptId),
      occurredAt: r.occurredAt,
      correct: r.correct,
      score: r.score,
      difficulty: r.difficulty,
      responseTimeMs: r.responseTimeMs ?? undefined,
      evidenceWeight: r.evidenceWeight,
    }));
  }
}
