import type { Format, LearningObject } from '../domain/learning-object';

export interface LearningObjectLookupKey {
  targetRef: string;
  format: Format;
  difficulty: number;
}

/** Dépôt d'objets pédagogiques générés (§7, couche 2). */
export interface LearningObjectRepositoryPort {
  save(object: LearningObject, meta?: { provider?: string }): Promise<void>;
  findByKey(key: LearningObjectLookupKey): Promise<LearningObject | null>;
  getById(id: string): Promise<LearningObject | null>;
}

export const LEARNING_OBJECT_REPOSITORY_PORT = Symbol('LearningObjectRepositoryPort');
