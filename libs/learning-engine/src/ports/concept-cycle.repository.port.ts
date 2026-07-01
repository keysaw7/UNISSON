import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { ConceptCycleState } from '../domain/concept-learning-cycle';

export interface ConceptCycleRepositoryPort {
  get(learnerId: LearnerId, conceptId: ConceptId): Promise<ConceptCycleState | null>;
  save(state: ConceptCycleState): Promise<void>;
  listForLearner(learnerId: LearnerId): Promise<ConceptCycleState[]>;
  isSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<boolean>;
  markSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<void>;
}

export const CONCEPT_CYCLE_REPOSITORY_PORT = Symbol('ConceptCycleRepositoryPort');
