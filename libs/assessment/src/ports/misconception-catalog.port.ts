import type { ConceptId } from '@unisson/shared-kernel';
import type { Misconception } from '../domain/misconception';

/** Catalogue de misconceptions (§6.4). Détection par pattern → remédiation ciblée. */
export interface MisconceptionCatalogPort {
  detect(conceptId: ConceptId, learnerAnswer: string): Promise<Misconception | null>;
  listForConcept(conceptId: ConceptId): Promise<Misconception[]>;
}

export const MISCONCEPTION_CATALOG_PORT = Symbol('MisconceptionCatalogPort');
