import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { EvidenceEvent } from '../domain/evidence-event';

/**
 * Journal des preuves par apprenant/concept (append-only, §12.2). Source de vérité de la
 * maîtrise : on ajoute, on ne modifie jamais.
 */
export interface EvidenceRepositoryPort {
  append(evidence: EvidenceEvent): Promise<void>;
  listByLearnerConcept(learnerId: LearnerId, conceptId: ConceptId): Promise<EvidenceEvent[]>;
}

export const EVIDENCE_REPOSITORY_PORT = Symbol('EvidenceRepositoryPort');
