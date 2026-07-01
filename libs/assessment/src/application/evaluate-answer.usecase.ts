import {
  createEvent,
  type ConceptId,
  type DomainEvent,
  type LearnerId,
  type OutboxPort,
} from '@unisson/shared-kernel';
import type { AssessmentEvidence } from '../domain/assessment-evidence';
import { ASSESSMENT_EVENTS } from '../domain/assessment-events';
import { computeEvidenceWeight } from '../domain/error-analysis';
import type { GradingInput, GradingStrategyPort } from '../ports/grading-strategy.port';
import type { MisconceptionCatalogPort } from '../ports/misconception-catalog.port';

export interface EvaluateAnswerInput extends GradingInput {
  learnerId: LearnerId;
  correlationId?: string;
}

export interface EvaluateAnswerResult {
  evidence: AssessmentEvidence;
  events: DomainEvent[];
}

/**
 * Cœur de l'Assessment (§6.4) : corrige (via `GradingStrategyPort`), attribue une erreur éventuelle
 * à une misconception connue, puis émet des ÉVÉNEMENTS (pas un verdict). `AnswerEvaluated` alimente
 * le modèle de maîtrise ; `MisconceptionDetected`/`SlipDetected` pilotent la remédiation.
 * Le moteur décide ; l'IA ne fait que classer/rédiger plus tard.
 */
export class EvaluateAnswerUseCase {
  constructor(
    private readonly grading: GradingStrategyPort,
    private readonly catalog: MisconceptionCatalogPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: EvaluateAnswerInput): Promise<EvaluateAnswerResult> {
    const evidence = await this.grading.grade(input);

    // Attribution : une erreur peut trahir une misconception connue sur l'un des concepts couverts.
    let matchedMisconception: { conceptId: ConceptId; id: string; description: string; remediationHint: string } | null =
      null;
    if (!evidence.correct) {
      for (const conceptId of evidence.conceptsCovered) {
        const m = await this.catalog.detect(conceptId, input.learnerAnswer);
        if (m) {
          matchedMisconception = { conceptId, id: m.id, description: m.description, remediationHint: m.remediationHint };
          break;
        }
      }
    }

    if (matchedMisconception) {
      evidence.errorType = 'misconception';
      evidence.attributedConcept = matchedMisconception.conceptId;
      evidence.evidenceWeight = computeEvidenceWeight('misconception', evidence.signals);
    }

    const primaryConcept = evidence.attributedConcept ?? evidence.conceptsCovered[0];

    const answerEvaluated = createEvent({
      type: ASSESSMENT_EVENTS.AnswerEvaluated,
      aggregateType: 'Assessment',
      aggregateId: evidence.activityId,
      correlationId: input.correlationId,
      payload: { learnerId: input.learnerId, activityId: evidence.activityId, evidence },
    });
    const events: DomainEvent[] = [answerEvaluated];

    if (matchedMisconception) {
      events.push(
        createEvent({
          type: ASSESSMENT_EVENTS.MisconceptionDetected,
          aggregateType: 'Assessment',
          aggregateId: evidence.activityId,
          correlationId: answerEvaluated.correlationId,
          causationId: answerEvaluated.eventId,
          payload: {
            learnerId: input.learnerId,
            conceptId: matchedMisconception.conceptId,
            misconceptionId: matchedMisconception.id,
            description: matchedMisconception.description,
            remediationHint: matchedMisconception.remediationHint,
          },
        }),
      );
    } else if (evidence.errorType === 'slip' && primaryConcept) {
      events.push(
        createEvent({
          type: ASSESSMENT_EVENTS.SlipDetected,
          aggregateType: 'Assessment',
          aggregateId: evidence.activityId,
          correlationId: answerEvaluated.correlationId,
          causationId: answerEvaluated.eventId,
          payload: { learnerId: input.learnerId, conceptId: primaryConcept },
        }),
      );
    }

    await this.outbox.enqueue(events);
    return { evidence, events };
  }
}
