import { describe, expect, it } from 'vitest';
import {
  asId,
  InMemoryEventBus,
  InMemoryEventJournal,
  InMemoryOutbox,
  OutboxRelay,
  type ConceptId,
  type LearnerId,
} from '@unisson/shared-kernel';
import {
  InMemoryEvidenceRepository,
  InMemoryLearnerStateRepository,
} from '../adapters/in-memory-learner-state.repository';
import { FsrsBayesianMasteryModel } from '../domain/mastery-model';
import { MASTERY_EVENTS } from '../domain/mastery-events';
import { RecordEvidenceUseCase } from './record-evidence.usecase';

const learner = asId<'LearnerId'>('learner-42') as LearnerId;
const concept = asId<'ConceptId'>('hiragana-ka') as ConceptId;

function setup() {
  const evidenceRepo = new InMemoryEvidenceRepository();
  const stateRepo = new InMemoryLearnerStateRepository();
  const model = new FsrsBayesianMasteryModel();
  const outbox = new InMemoryOutbox();
  const usecase = new RecordEvidenceUseCase(evidenceRepo, stateRepo, model, outbox);
  return { evidenceRepo, stateRepo, model, outbox, usecase };
}

describe('RecordEvidenceUseCase', () => {
  it('enregistre la preuve, met à jour la projection et enfile les événements', async () => {
    const { usecase, evidenceRepo, stateRepo, outbox } = setup();

    const res = await usecase.execute({ learnerId: learner, conceptId: concept, correct: true });

    expect(await evidenceRepo.listByLearnerConcept(learner, concept)).toHaveLength(1);
    expect(await stateRepo.getMastery(learner, concept)).not.toBeNull();

    const types = res.events.map((e) => e.type);
    expect(types).toContain(MASTERY_EVENTS.EvidenceRecorded);
    expect(types).toContain(MASTERY_EVENTS.MasteryUpdated);

    // Traçabilité causale : MasteryUpdated est causé par EvidenceRecorded.
    const recorded = res.events.find((e) => e.type === MASTERY_EVENTS.EvidenceRecorded)!;
    const updated = res.events.find((e) => e.type === MASTERY_EVENTS.MasteryUpdated)!;
    expect(updated.causationId).toBe(recorded.eventId);
    expect(updated.correlationId).toBe(recorded.correlationId);

    expect(await outbox.pullUnpublished()).toHaveLength(res.events.length);
  });

  it('la projection stockée = replay des preuves accumulées (source de vérité §12.2)', async () => {
    const { usecase, evidenceRepo, stateRepo, model } = setup();

    const t0 = '2026-01-01T00:00:00.000Z';
    const days = (n: number) => new Date(Date.parse(t0) + n * 86_400_000).toISOString();
    await usecase.execute({ learnerId: learner, conceptId: concept, correct: true, occurredAt: days(0) });
    await usecase.execute({ learnerId: learner, conceptId: concept, correct: false, occurredAt: days(2) });
    await usecase.execute({ learnerId: learner, conceptId: concept, correct: true, occurredAt: days(3) });

    const stored = await stateRepo.getMastery(learner, concept);
    const evidence = await evidenceRepo.listByLearnerConcept(learner, concept);
    const replayed = model.project(learner, concept, evidence);

    expect(stored!.pMastery).toBeCloseTo(replayed.pMastery, 10);
    expect(stored!.stability).toBeCloseTo(replayed.stability, 10);
  });

  it('propage les événements jusqu’au bus et au journal via le relais', async () => {
    const { usecase, outbox } = setup();
    const bus = new InMemoryEventBus();
    const journal = new InMemoryEventJournal();
    const relay = new OutboxRelay(outbox, bus, journal);

    const masteryUpdates: unknown[] = [];
    bus.subscribe(MASTERY_EVENTS.MasteryUpdated, (e) => {
      masteryUpdates.push(e.payload);
    });

    await usecase.execute({ learnerId: learner, conceptId: concept, correct: true, correlationId: 'session-1' });
    await relay.drain();

    expect(masteryUpdates).toHaveLength(1);
    const journaled = await journal.byType(MASTERY_EVENTS.EvidenceRecorded);
    expect(journaled).toHaveLength(1);
    expect(journaled[0]!.correlationId).toBe('session-1');
  });

  it('émet GapDetected quand une réponse fausse laisse le concept « inconnu »', async () => {
    const { usecase } = setup();
    const res = await usecase.execute({ learnerId: learner, conceptId: concept, correct: false });
    expect(res.events.map((e) => e.type)).toContain(MASTERY_EVENTS.GapDetected);
  });
});
