import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import {
  asId,
  InMemoryEventBus,
  OutboxRelay,
  type ConceptId,
  type LearnerId,
} from '@unisson/shared-kernel';
import {
  FsrsBayesianMasteryModel,
  MASTERY_EVENTS,
  RecordEvidenceUseCase,
} from '@unisson/learner-modeling';
import { createDb, createPool, runInTransaction, type Db } from './client';
import { runMigrations } from './migrate';
import { seedKnowledgeGraph } from './seed';
import { PgKnowledgeGraphRepository } from './adapters/pg-knowledge-graph.repository';
import {
  PgEvidenceRepository,
  PgLearnerStateRepository,
} from './adapters/pg-learner-state.repository';
import { PgEventJournal, PgOutbox } from './adapters/pg-outbox';

/**
 * Tests d'intégration Postgres réels. Sautés si `DATABASE_URL` n'est pas défini → la CI reste
 * verte sans base. Pour les exécuter : `npm run db:up && DATABASE_URL=... npm test`.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)('Persistance Postgres (intégration)', () => {
  let pool: Pool;
  let db: Db;
  const learner = asId<'LearnerId'>('it-learner') as LearnerId;
  const concept = asId<'ConceptId'>('hiragana-a') as ConceptId;

  beforeAll(async () => {
    pool = createPool();
    db = createDb(pool);
    await runMigrations(pool);
    await seedKnowledgeGraph(db);
    await pool.query('DELETE FROM evidence_event WHERE learner_id = $1', [learner]);
    await pool.query('DELETE FROM mastery_state WHERE learner_id = $1', [learner]);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('résout la fermeture transitive via WITH RECURSIVE', async () => {
    const repo = new PgKnowledgeGraphRepository(db);
    const ids = await repo.getTransitivePrerequisiteIds(asId<'SkillId'>('sentence'));
    expect(ids).toContain(asId<'SkillId'>('hiragana'));
    expect(ids).toHaveLength(6);
  });

  it('enregistre une preuve dans UNE transaction (état + evidence + outbox atomiques)', async () => {
    const model = new FsrsBayesianMasteryModel();

    const result = await runInTransaction(db, async (tx) => {
      const usecase = new RecordEvidenceUseCase(
        new PgEvidenceRepository(tx),
        new PgLearnerStateRepository(tx),
        model,
        new PgOutbox(tx),
      );
      return usecase.execute({ learnerId: learner, conceptId: concept, correct: true, correlationId: 'it-1' });
    });
    expect(result.state.pMastery).toBeGreaterThan(0);

    // Relais → bus + journal, puis marquage publié.
    const bus = new InMemoryEventBus();
    const journal = new PgEventJournal(db);
    const relay = new OutboxRelay(new PgOutbox(db), bus, journal);
    const published = await relay.drain();
    expect(published).toBeGreaterThanOrEqual(2);

    const journaled = await journal.byType(MASTERY_EVENTS.MasteryUpdated);
    expect(journaled.some((e) => e.correlationId === 'it-1')).toBe(true);
  });
});
