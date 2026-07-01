import type { ConceptId } from '@unisson/shared-kernel';

/**
 * Misconception : modèle mental erroné SYSTÉMATIQUE rattaché à un concept (§6.4). Le catalogue est
 * amorcé par des experts/IA puis enrichi par minage des erreurs agrégées.
 */
export interface Misconception {
  id: string;
  conceptId: ConceptId;
  description: string;
  /** Réponses fautives typiques (normalisées) qui trahissent cette misconception. */
  wrongAnswerPatterns: string[];
  /** Piste de remédiation (le moteur décide la stratégie, l'IA produit le texte). */
  remediationHint: string;
}
