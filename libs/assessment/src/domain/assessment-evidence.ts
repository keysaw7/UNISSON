import type { ActivityId, ConceptId } from '@unisson/shared-kernel';

/** Taxonomie d'erreurs propriétaire (§6.4) : l'IA classe, le moteur décide. */
export type ErrorType =
  | 'correct'
  | 'slip'
  | 'guess'
  | 'partial'
  | 'misconception'
  | 'missing_prerequisite';

export interface EvidenceSignals {
  latencyMs: number;
  usedHint: boolean;
  attempts: number;
  selfConfidence?: number;
}

/**
 * L'Assessment produit une ÉVIDENCE pondérée, pas un verdict binaire (§6.4).
 * `evidenceWeight` module l'impact sur le modèle de maîtrise.
 */
export interface AssessmentEvidence {
  activityId: ActivityId;
  conceptsCovered: ConceptId[];
  correct: boolean;
  score: number; // 0..1
  errorType: ErrorType;
  attributedConcept?: ConceptId;
  signals: EvidenceSignals;
  evidenceWeight: number; // 0..1
}
