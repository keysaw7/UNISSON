import { describe, it, expect } from 'vitest';
import { asId, type LearnerId } from '@unisson/shared-kernel';
import { InMemoryLearnerRepository } from '../adapters/in-memory-learner.repository';
import { EnsureLearnerExistsUseCase } from './ensure-learner-exists.usecase';

const learnerId = asId<'LearnerId'>('learner-abc') as LearnerId;

describe('EnsureLearnerExistsUseCase', () => {
  it('crée un apprenant s’il n’existe pas', async () => {
    const repo = new InMemoryLearnerRepository();
    const useCase = new EnsureLearnerExistsUseCase(repo);

    const created = await useCase.execute({ learnerId });
    expect(created.id).toBe(learnerId);
    expect(created.createdAt).toBeTruthy();

    const again = await useCase.execute({ learnerId });
    expect(again.id).toBe(learnerId);
    expect(again.createdAt).toBe(created.createdAt);
  });
});
