import type { LearnerId } from '@unisson/shared-kernel';
import type { Learner } from '../domain/learner';

/** Dépôt d'apprenants pseudonymes (§13.2). */
export interface LearnerRepositoryPort {
  save(learner: Learner): Promise<void>;
  getById(id: LearnerId): Promise<Learner | null>;
}

export const LEARNER_REPOSITORY_PORT = Symbol('LearnerRepositoryPort');
