import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { InferencePrior, LearnerInferencePort } from '../ports/learner-inference.port';

/** Inférence naïve (prior uniforme) — placeholder Phase 6 avant DKT/RL. */
export class StubLearnerInferenceAdapter implements LearnerInferencePort {
  async inferPriors(_learnerId: LearnerId, conceptIds: ConceptId[]): Promise<InferencePrior[]> {
    return conceptIds.map((conceptId) => ({ conceptId, pMastery: 0.3 }));
  }
}
