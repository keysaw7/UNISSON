import type { ErrorType, EvidenceSignals } from './assessment-evidence';

/** Contexte de classification d'une réponse (§6.4). */
export interface ErrorAnalysisInput {
  correct: boolean;
  score: number;
  difficulty: number; // 0..1
  signals: EvidenceSignals;
  /** Une misconception connue a-t-elle été détectée (catalogue) ? */
  misconceptionMatched?: boolean;
}

// En-dessous : réponse « impulsive ». Une erreur très rapide évoque l'étourderie (slip).
const SLIP_LATENCY_MS = 2000;
// Bonne réponse quasi instantanée sur un item difficile + faible confiance → probable devinette.
const GUESS_LATENCY_MS = 1200;

/**
 * Classifie une réponse selon la taxonomie propriétaire (§6.4). L'IA *classera* les cas complexes
 * plus tard ; ici, des règles interprétables couvrent le déterministe/fuzzy.
 *
 *  - `misconception` : modèle mental erroné (matché OU erreur délibérée lente, non partielle).
 *  - `slip`          : connaît mais inattention (erreur très rapide).
 *  - `partial`       : incomplet (0 < score < 1).
 *  - `guess`         : correct mais probablement aléatoire.
 *  - `correct`       : réussi.
 */
export function classifyError(input: ErrorAnalysisInput): ErrorType {
  const { correct, score, difficulty, signals, misconceptionMatched } = input;
  const latency = signals.latencyMs;

  if (correct) {
    const guessLike = latency <= GUESS_LATENCY_MS && difficulty >= 0.6 && (signals.selfConfidence ?? 1) < 0.5;
    return guessLike ? 'guess' : 'correct';
  }

  if (misconceptionMatched) return 'misconception';
  if (score > 0) return 'partial';
  if (latency <= SLIP_LATENCY_MS) return 'slip';
  // Erreur lente, délibérée, sans réponse partielle → modèle mental erroné.
  return 'misconception';
}

/**
 * Fiabilité de la preuve pour le modèle de maîtrise (§6.4 → §8). Un hasard chanceux n'augmente
 * presque pas la maîtrise ; un lapsus ne la baisse presque pas ; un indice l'affaiblit.
 */
export function computeEvidenceWeight(errorType: ErrorType, signals: EvidenceSignals): number {
  let w = 1;
  if (signals.usedHint) w *= 0.5;
  if (signals.attempts > 1) w *= 1 / signals.attempts;

  switch (errorType) {
    case 'guess':
      w *= 0.2;
      break;
    case 'slip':
      w *= 0.3;
      break;
    case 'partial':
      w *= 0.7;
      break;
    case 'misconception':
    case 'missing_prerequisite':
      w *= 0.85;
      break;
    default:
      break;
  }

  if (signals.selfConfidence !== undefined) {
    // Confiance alignée avec le résultat → preuve légèrement plus fiable.
    w *= 0.85 + 0.15 * signals.selfConfidence;
  }
  return Math.max(0.05, Math.min(1, w));
}
