import type { LearnerId } from '@unisson/shared-kernel';
import type { Learner } from '../domain/learner';
import type { LearnerRepositoryPort } from '../ports/learner.repository.port';

export interface EnsureLearnerExistsInput {
  learnerId: LearnerId;
}

/**
 * Garantit qu'un `learnerId` pseudonyme existe côté moteur au premier contact.
 * La source de vérité de l'identité reste le cookie signé du BFF (§13.2).
 */
export class EnsureLearnerExistsUseCase {
  constructor(private readonly learners: LearnerRepositoryPort) {}

  async execute(input: EnsureLearnerExistsInput): Promise<Learner> {
    const existing = await this.learners.getById(input.learnerId);
    if (existing) return existing;

    const learner: Learner = {
      id: input.learnerId,
      createdAt: new Date().toISOString(),
    };
    await this.learners.save(learner);
    return learner;
  }
}
