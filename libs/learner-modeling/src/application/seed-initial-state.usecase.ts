import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { MasteryModel } from '../domain/mastery-model';
import type { MasteryState } from '../domain/mastery-state';
import type { LearnerStateRepositoryPort } from '../ports/learner-state.repository.port';

export interface InitialPrior {
  conceptId: ConceptId;
  pMastery: number;
}

export interface SeedInitialStateInput {
  learnerId: LearnerId;
  priors: InitialPrior[];
  now?: string;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/**
 * Sème les priors du diagnostic (§6.2) dans le modèle de maîtrise (§8) comme état INITIAL. Le prior
 * n'écrase jamais une maîtrise déjà construite à partir d'evidence events (source de vérité) : on ne
 * pose que pour les concepts encore vierges. La boucle Maîtrise+Oubli corrige ensuite.
 */
export class SeedInitialStateUseCase {
  constructor(
    private readonly stateRepo: LearnerStateRepositoryPort,
    private readonly model: MasteryModel,
  ) {}

  async execute(input: SeedInitialStateInput): Promise<MasteryState[]> {
    const seeded: MasteryState[] = [];
    for (const prior of input.priors) {
      const existing = await this.stateRepo.getMastery(input.learnerId, prior.conceptId);
      if (existing) continue;
      const base = this.model.initialState(input.learnerId, prior.conceptId, input.now);
      const state: MasteryState = { ...base, pMastery: clamp01(prior.pMastery) };
      await this.stateRepo.saveMastery(state);
      seeded.push(state);
    }
    return seeded;
  }
}
