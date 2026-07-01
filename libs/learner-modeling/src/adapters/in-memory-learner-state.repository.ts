import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { EvidenceEvent } from '../domain/evidence-event';
import type { MasteryState } from '../domain/mastery-state';
import type { EvidenceRepositoryPort } from '../ports/evidence.repository.port';
import type { LearnerStateRepositoryPort } from '../ports/learner-state.repository.port';

const key = (l: LearnerId, c: ConceptId): string => `${l}:${c}`;

/** Adapter mémoire (dev/tests). En prod, remplacé par l'adapter Postgres derrière le même port. */
export class InMemoryLearnerStateRepository implements LearnerStateRepositoryPort {
  private readonly states = new Map<string, MasteryState>();

  async getMastery(learnerId: LearnerId, conceptId: ConceptId): Promise<MasteryState | null> {
    return this.states.get(key(learnerId, conceptId)) ?? null;
  }

  async saveMastery(state: MasteryState): Promise<void> {
    this.states.set(key(state.learnerId, state.conceptId), state);
  }
}

export class InMemoryEvidenceRepository implements EvidenceRepositoryPort {
  private readonly events: EvidenceEvent[] = [];

  async append(evidence: EvidenceEvent): Promise<void> {
    this.events.push(evidence);
  }

  async listByLearnerConcept(learnerId: LearnerId, conceptId: ConceptId): Promise<EvidenceEvent[]> {
    return this.events
      .filter((e) => e.learnerId === learnerId && e.conceptId === conceptId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }
}
