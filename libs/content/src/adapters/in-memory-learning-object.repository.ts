import type { LearningObject } from '../domain/learning-object';
import type { LearningObjectLookupKey, LearningObjectRepositoryPort } from '../ports/learning-object.repository.port';

function lookupKey(key: LearningObjectLookupKey): string {
  return `${key.targetRef}:${key.format}:${key.difficulty.toFixed(3)}`;
}

export class InMemoryLearningObjectRepository implements LearningObjectRepositoryPort {
  private readonly byId = new Map<string, LearningObject>();
  private readonly byKey = new Map<string, string>();

  async save(object: LearningObject, _meta?: { provider?: string }): Promise<void> {
    this.byId.set(object.id, object);
    this.byKey.set(
      lookupKey({ targetRef: object.targetRef, format: object.format, difficulty: object.difficulty }),
      object.id,
    );
  }

  async findByKey(key: LearningObjectLookupKey): Promise<LearningObject | null> {
    const id = this.byKey.get(lookupKey(key));
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async getById(id: string): Promise<LearningObject | null> {
    return this.byId.get(id) ?? null;
  }
}
