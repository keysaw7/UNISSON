import type { LearnerId } from '@unisson/shared-kernel';
import type { Learner } from '../domain/learner';
import type { LearnerRepositoryPort } from '../ports/learner.repository.port';

export class InMemoryLearnerRepository implements LearnerRepositoryPort {
  private readonly learners = new Map<LearnerId, Learner>();

  async save(learner: Learner): Promise<void> {
    this.learners.set(learner.id, learner);
  }

  async getById(id: LearnerId): Promise<Learner | null> {
    return this.learners.get(id) ?? null;
  }
}
