import type { Format, LearningObject } from '../domain/learning-object';

export interface ContentRequest {
  targetRef: string;
  format: Format;
  difficulty: number;
  /** Variante de formulation/contexte pour la variabilité (PEDAGOG § phase 12). */
  contextVariant?: number;
}

/** Génère/récupère un objet pédagogique concret (via cache ou AI Gateway). */
export interface ContentGeneratorPort {
  generate(request: ContentRequest): Promise<LearningObject>;
}

export const CONTENT_GENERATOR_PORT = Symbol('ContentGeneratorPort');
