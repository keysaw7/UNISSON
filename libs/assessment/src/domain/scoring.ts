import { normalize, similarity } from './text-matching';

export interface ScoreResult {
  correct: boolean;
  score: number; // 0..1
}

/** Seuils de correction fuzzy (réglables par domaine). */
export const CORRECT_SIMILARITY = 0.85;
export const PARTIAL_SIMILARITY = 0.5;

const asVariants = (expected: string | string[]): string[] => (Array.isArray(expected) ? expected : [expected]);

/**
 * Correction DÉTERMINISTE (§6.4) : correspondance exacte après normalisation. 0 coût, 0 latence,
 * fiable — la méthode par défaut pour QCM / correspondance exacte.
 */
export function gradeExact(expected: string | string[], answer: string): ScoreResult {
  const a = normalize(answer);
  const correct = asVariants(expected).some((e) => normalize(e) === a);
  return { correct, score: correct ? 1 : 0 };
}

/**
 * Correction FUZZY (§6.4) : règles + similarité (tolérance typo, variantes). Prend la meilleure
 * similarité parmi les réponses acceptées. Correct au-dessus du seuil, partiel entre les deux.
 */
export function gradeFuzzy(expected: string | string[], answer: string): ScoreResult {
  const best = Math.max(...asVariants(expected).map((e) => similarity(e, answer)));
  if (best >= CORRECT_SIMILARITY) return { correct: true, score: 1 };
  if (best >= PARTIAL_SIMILARITY) return { correct: false, score: Number(best.toFixed(3)) };
  return { correct: false, score: 0 };
}
