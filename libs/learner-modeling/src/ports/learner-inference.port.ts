import type { ConceptId, LearnerId } from '@unisson/shared-kernel';

export interface InferencePrior {
  conceptId: ConceptId;
  pMastery: number;
}

/**
 * Port d'inférence avancée (Phase 6, §15) — DKT/RL derrière un service Python isolé.
 * Stub BKT pour l'instant ; remplaçable sans toucher au domaine.
 */
export interface LearnerInferencePort {
  inferPriors(learnerId: LearnerId, conceptIds: ConceptId[]): Promise<InferencePrior[]>;
}

export const LEARNER_INFERENCE_PORT = Symbol('LearnerInferencePort');
