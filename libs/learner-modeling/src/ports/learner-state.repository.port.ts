import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { MasteryState } from '../domain/mastery-state';

export interface LearnerStateRepositoryPort {
  getMastery(learnerId: LearnerId, conceptId: ConceptId): Promise<MasteryState | null>;
  saveMastery(state: MasteryState): Promise<void>;
}

export const LEARNER_STATE_REPOSITORY_PORT = Symbol('LearnerStateRepositoryPort');
