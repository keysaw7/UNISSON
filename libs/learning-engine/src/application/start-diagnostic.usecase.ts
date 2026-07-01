import {
  createEvent,
  makeId,
  type DiagnosticSessionId,
  type DomainEvent,
  type LearnerId,
  type OutboxPort,
  type SkillId,
} from '@unisson/shared-kernel';
import type { KnowledgeGraphRepositoryPort } from '@unisson/knowledge-graph';
import {
  initialBelief,
  isComplete,
  selectNextConcept,
  type DeclaredLevel,
  type DiagnosticNode,
  type DiagnosticSession,
} from '../domain/diagnostic';
import { DIAGNOSTIC_EVENTS } from '../domain/diagnostic-events';
import type { DiagnosticSessionRepositoryPort } from '../ports/diagnostic-session.repository.port';
import { buildDiagnosticGraph } from './diagnostic-graph';

const DEFAULT_BUDGET = 10;
const DEFAULT_CONFIDENCE_TARGET = 0.6;

export interface StartDiagnosticInput {
  learnerId: LearnerId;
  domain: string;
  targetSkills: SkillId[];
  declaredLevel?: DeclaredLevel;
  budget?: number;
  confidenceTarget?: number;
  correlationId?: string;
}

export interface DiagnosticProbe {
  conceptId: string;
  skillId: string;
  difficulty: number;
}

export interface StartDiagnosticResult {
  session: DiagnosticSession;
  nextProbe: DiagnosticProbe | null;
  done: boolean;
  events: DomainEvent[];
}

/** Démarre un diagnostic adaptatif (§6.2) : construit la région, pose un prior, sélectionne l'item le plus informatif. */
export class StartDiagnosticUseCase {
  constructor(
    private readonly graph: KnowledgeGraphRepositoryPort,
    private readonly sessions: DiagnosticSessionRepositoryPort,
    private readonly outbox: OutboxPort,
  ) {}

  async execute(input: StartDiagnosticInput): Promise<StartDiagnosticResult> {
    const nodes = await buildDiagnosticGraph(this.graph, input.targetSkills);
    const belief = initialBelief(nodes, input.declaredLevel ?? 'beginner');
    const now = new Date().toISOString();

    const session: DiagnosticSession = {
      id: makeId<'DiagnosticSessionId'>() as DiagnosticSessionId,
      learnerId: input.learnerId,
      domain: input.domain,
      targetSkills: input.targetSkills,
      budget: input.budget ?? DEFAULT_BUDGET,
      confidenceTarget: input.confidenceTarget ?? DEFAULT_CONFIDENCE_TARGET,
      belief,
      asked: [],
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };

    const nextConceptId = isComplete(session) ? null : selectNextConcept(nodes, belief, []);
    if (!nextConceptId) session.status = 'completed';
    await this.sessions.save(session);

    const events: DomainEvent[] = [
      createEvent({
        type: DIAGNOSTIC_EVENTS.DiagnosticStarted,
        aggregateType: 'DiagnosticSession',
        aggregateId: session.id,
        correlationId: input.correlationId,
        payload: {
          sessionId: session.id,
          learnerId: session.learnerId,
          domain: session.domain,
          regionSize: nodes.length,
        },
      }),
    ];
    await this.outbox.enqueue(events);

    return { session, nextProbe: probe(nodes, nextConceptId), done: session.status === 'completed', events };
  }
}

export function probe(nodes: DiagnosticNode[], conceptId: string | null): DiagnosticProbe | null {
  if (!conceptId) return null;
  const n = nodes.find((x) => x.conceptId === conceptId);
  if (!n) return null;
  return { conceptId: n.conceptId, skillId: n.skillId, difficulty: n.difficulty };
}
