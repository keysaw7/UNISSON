import type { ConceptId, LearnerId, SkillId } from '@unisson/shared-kernel';
import type { ConceptCycleState } from '../domain/concept-learning-cycle';
import type { ConceptCycleRepositoryPort } from '../ports/concept-cycle.repository.port';

export class InMemoryConceptCycleRepository implements ConceptCycleRepositoryPort {
  private readonly cycles = new Map<string, ConceptCycleState>();
  private readonly activatedSkills = new Set<string>();

  private key(learnerId: LearnerId, conceptId: ConceptId): string {
    return `${learnerId}:${conceptId}`;
  }

  private skillKey(learnerId: LearnerId, skillId: SkillId): string {
    return `${learnerId}:${skillId}`;
  }

  async get(learnerId: LearnerId, conceptId: ConceptId): Promise<ConceptCycleState | null> {
    return this.cycles.get(this.key(learnerId, conceptId)) ?? null;
  }

  async save(state: ConceptCycleState): Promise<void> {
    this.cycles.set(this.key(state.learnerId, state.conceptId), { ...state });
  }

  async listForLearner(learnerId: LearnerId): Promise<ConceptCycleState[]> {
    return [...this.cycles.values()].filter((s) => s.learnerId === learnerId);
  }

  async isSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<boolean> {
    return this.activatedSkills.has(this.skillKey(learnerId, skillId));
  }

  async markSkillActivated(learnerId: LearnerId, skillId: SkillId): Promise<void> {
    this.activatedSkills.add(this.skillKey(learnerId, skillId));
  }
}
