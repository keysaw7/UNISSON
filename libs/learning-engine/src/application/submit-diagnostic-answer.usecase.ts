import {
  createEvent,
  type ConceptId,
  type DiagnosticSessionId,
  type DomainEvent,
  type OutboxPort,
} from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import {
  isComplete,
  observe,
  selectNextConcept,
  toPriors,
  type ConceptPrior,
  type DiagnosticSession,
} from '../domain/diagnostic';
import { DIAGNOSTIC_EVENTS } from '../domain/diagnostic-events';
import type { DiagnosticSessionRepositoryPort } from '../ports/diagnostic-session.repository.port';
import { buildDiagnosticGraph } from './diagnostic-graph';
import { probe, type DiagnosticProbe } from './start-diagnostic.usecase';

export interface SubmitDiagnosticAnswerInput {
  sessionId: DiagnosticSessionId;
  conceptId: ConceptId;
  correct: boolean;
  correlationId?: string;
}

export interface SubmitDiagnosticAnswerResult {
  session: DiagnosticSession;
  nextProbe: DiagnosticProbe | null;
  done: boolean;
  priors: ConceptPrior[] | null;
  events: DomainEvent[];
}

export class DiagnosticSessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session de diagnostic introuvable : ${id}`);
    this.name = 'DiagnosticSessionNotFoundError';
  }
}

/**
 * Traite une réponse du diagnostic (§6.2) : MàJ bayésienne + propagation sur le graphe, sélection
 * de l'item suivant, arrêt (budget/incertitude). À l'arrêt, émet `DiagnosticCompleted` +
 * `InitialStateEstimated` (priors) — que le composition root sèmera dans le modèle de maîtrise.
 */
export class SubmitDiagnosticAnswerUseCase {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly sessions: DiagnosticSessionRepositoryPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: SubmitDiagnosticAnswerInput): Promise<SubmitDiagnosticAnswerResult> {
    const session = await this.sessions.get(input.sessionId);
    if (!session) throw new DiagnosticSessionNotFoundError(input.sessionId);

    const nodes = await buildDiagnosticGraph(this.graph, session.targetSkills);
    const belief = observe(nodes, session.belief, input.conceptId, input.correct);
    const asked = session.asked.includes(input.conceptId) ? session.asked : [...session.asked, input.conceptId];

    const updated: DiagnosticSession = { ...session, belief, asked, updatedAt: new Date().toISOString() };

    const answered = createEvent({
      type: DIAGNOSTIC_EVENTS.DiagnosticItemAnswered,
      aggregateType: 'DiagnosticSession',
      aggregateId: updated.id,
      correlationId: input.correlationId,
      payload: {
        sessionId: updated.id,
        learnerId: updated.learnerId,
        conceptId: input.conceptId,
        correct: input.correct,
        itemsAsked: asked.length,
      },
    });
    const events: DomainEvent[] = [answered];

    let nextConceptId = isComplete(updated) ? null : selectNextConcept(nodes, belief, asked);
    const done = nextConceptId === null;
    let priors: ConceptPrior[] | null = null;

    if (done) {
      updated.status = 'completed';
      priors = toPriors(belief);
      events.push(
        createEvent({
          type: DIAGNOSTIC_EVENTS.DiagnosticCompleted,
          aggregateType: 'DiagnosticSession',
          aggregateId: updated.id,
          correlationId: answered.correlationId,
          causationId: answered.eventId,
          payload: { sessionId: updated.id, learnerId: updated.learnerId, itemsAsked: asked.length },
        }),
        createEvent({
          type: DIAGNOSTIC_EVENTS.InitialStateEstimated,
          aggregateType: 'DiagnosticSession',
          aggregateId: updated.id,
          correlationId: answered.correlationId,
          causationId: answered.eventId,
          payload: { sessionId: updated.id, learnerId: updated.learnerId, priors },
        }),
      );
      nextConceptId = null;
    }

    await this.sessions.save(updated);
    await this.outbox.enqueue(events);

    return { session: updated, nextProbe: probe(nodes, nextConceptId), done, priors, events };
  }
}
