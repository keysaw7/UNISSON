import { createEvent, type DomainEvent, type OutboxPort } from '@unisson/shared-kernel';
import { createEvidence, type EvidenceEvent, type NewEvidence } from '../domain/evidence-event';
import { MASTERY_EVENTS } from '../domain/mastery-events';
import type { MasteryModel } from '../domain/mastery-model';
import { masteryStage, type MasteryState } from '../domain/mastery-state';
import type { EvidenceRepositoryPort } from '../ports/evidence.repository.port';
import type { LearnerStateRepositoryPort } from '../ports/learner-state.repository.port';

export interface RecordEvidenceInput extends NewEvidence {
  /** Trace une séance / un parcours (§12.6). */
  correlationId?: string;
}

export interface RecordEvidenceResult {
  evidence: EvidenceEvent;
  state: MasteryState;
  events: DomainEvent[];
}

/**
 * Boucle centrale de l'apprentissage (§8, §12.2). Reçoit une preuve, l'ajoute au journal
 * (source de vérité), met à jour la PROJECTION de maîtrise via le `MasteryModel`, puis publie
 * les événements métier dans l'outbox — le tout comme une unité de travail.
 *
 * Le MOTEUR décide : c'est ici qu'on transforme un signal brut en état pédagogique et en
 * intentions (`ReviewDue`, `GapDetected`) que d'autres contextes consommeront.
 */
export class RecordEvidenceUseCase {
  constructor(
    private readonly evidenceRepo: EvidenceRepositoryPort,
    private readonly stateRepo: LearnerStateRepositoryPort,
    private readonly model: MasteryModel,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: RecordEvidenceInput): Promise<RecordEvidenceResult> {
    const evidence = createEvidence(input);

    // 1) Append au journal des preuves (append-only).
    await this.evidenceRepo.append(evidence);

    // 2) Projection : état précédent (ou prior) → nouvel état.
    const previous =
      (await this.stateRepo.getMastery(evidence.learnerId, evidence.conceptId)) ??
      this.model.initialState(evidence.learnerId, evidence.conceptId, evidence.occurredAt);
    const state = this.model.applyEvidence(previous, evidence);
    await this.stateRepo.saveMastery(state);

    // 3) Événements métier (traçabilité causale : tout découle de la preuve enregistrée).
    const correlationId = input.correlationId;
    const events: DomainEvent[] = [];

    const recorded = createEvent({
      type: MASTERY_EVENTS.EvidenceRecorded,
      aggregateType: 'LearnerMastery',
      aggregateId: `${evidence.learnerId}:${evidence.conceptId}`,
      correlationId,
      payload: {
        evidenceId: evidence.id,
        learnerId: evidence.learnerId,
        conceptId: evidence.conceptId,
        correct: evidence.correct,
        score: evidence.score,
      },
    });
    events.push(recorded);

    const retrievability = this.model.retrievability(state, evidence.occurredAt);
    events.push(
      createEvent({
        type: MASTERY_EVENTS.MasteryUpdated,
        aggregateType: 'LearnerMastery',
        aggregateId: `${evidence.learnerId}:${evidence.conceptId}`,
        correlationId: recorded.correlationId,
        causationId: recorded.eventId,
        payload: {
          learnerId: evidence.learnerId,
          conceptId: evidence.conceptId,
          pMastery: state.pMastery,
          stability: state.stability,
          retrievability,
          stage: masteryStage(state),
        },
      }),
    );

    if (!evidence.correct && masteryStage(state) === 'unknown') {
      events.push(
        createEvent({
          type: MASTERY_EVENTS.GapDetected,
          aggregateType: 'LearnerMastery',
          aggregateId: `${evidence.learnerId}:${evidence.conceptId}`,
          correlationId: recorded.correlationId,
          causationId: recorded.eventId,
          payload: { learnerId: evidence.learnerId, conceptId: evidence.conceptId, pMastery: state.pMastery },
        }),
      );
    }

    await this.outbox.enqueue(events);
    return { evidence, state, events };
  }
}
