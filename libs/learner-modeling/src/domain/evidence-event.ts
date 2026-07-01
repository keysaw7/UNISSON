import { randomUUID } from 'node:crypto';
import type { ConceptId, LearnerId } from '@unisson/shared-kernel';

/**
 * Preuve d'apprentissage (§12.2). C'est la **source de vérité** append-only : l'état de
 * maîtrise (`MasteryState`) n'en est qu'une projection recalculable (ADR-025). On ne modifie
 * ni ne supprime jamais un evidence event — on en ajoute.
 */
export interface EvidenceEvent {
  readonly id: string;
  readonly learnerId: LearnerId;
  readonly conceptId: ConceptId;
  readonly occurredAt: string; // ISO — temps métier
  /** Réponse correcte ou non (signal binaire principal). */
  readonly correct: boolean;
  /** Score continu 0..1 (partiel possible : QCM à points, auto-éval…). */
  readonly score: number;
  /** Difficulté de l'item servi (0..1), utile pour pondérer la preuve. */
  readonly difficulty: number;
  /** Temps de réponse en ms (signal secondaire : hésitation, devinette rapide…). */
  readonly responseTimeMs?: number;
  /**
   * Fiabilité de la preuve 0..1 (§6.4 / ADR-019). Une auto-évaluation vaut moins qu'un exercice
   * corrigé objectivement ; un « slip » suspecté abaisse le poids.
   */
  readonly evidenceWeight: number;
}

export interface NewEvidence {
  learnerId: LearnerId;
  conceptId: ConceptId;
  correct: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
  evidenceWeight?: number;
  occurredAt?: string;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** Construit un evidence event normalisé (valeurs bornées, défauts raisonnables). */
export function createEvidence(input: NewEvidence): EvidenceEvent {
  const score = input.score ?? (input.correct ? 1 : 0);
  return {
    id: randomUUID(),
    learnerId: input.learnerId,
    conceptId: input.conceptId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    correct: input.correct,
    score: clamp01(score),
    difficulty: clamp01(input.difficulty ?? 0.5),
    responseTimeMs: input.responseTimeMs,
    evidenceWeight: clamp01(input.evidenceWeight ?? 1),
  };
}
