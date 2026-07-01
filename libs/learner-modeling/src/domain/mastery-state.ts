import type { ConceptId, LearnerId } from '@unisson/shared-kernel';

/**
 * État latent unifié Maîtrise + Oubli (§8). Projection recalculable à partir des
 * evidence events (source de vérité, §12.2).
 */
export interface MasteryState {
  learnerId: LearnerId;
  conceptId: ConceptId;
  /** Probabilité de connaître (0..1). */
  pMastery: number;
  /** Résistance à l'oubli : plus elle est haute, plus la rétrievabilité décroît lentement. */
  stability: number;
  lastReviewedAt: string; // ISO
}

/** Stades de maîtrise consommés par le Format Selector (§6.5). */
export type MasteryStage = 'unknown' | 'emerging' | 'developing' | 'proficient' | 'mastered';

export function masteryStage(state: Pick<MasteryState, 'pMastery'>): MasteryStage {
  const p = state.pMastery;
  if (p < 0.1) return 'unknown';
  if (p < 0.4) return 'emerging';
  if (p < 0.7) return 'developing';
  if (p < 0.9) return 'proficient';
  return 'mastered';
}
