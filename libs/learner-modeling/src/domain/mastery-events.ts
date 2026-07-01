import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { MasteryStage } from './mastery-state';

/** Catalogue d'événements du contexte Learner Modeling (§12.5). */
export const MASTERY_EVENTS = {
  EvidenceRecorded: 'EvidenceRecorded',
  MasteryUpdated: 'MasteryUpdated',
  ReviewDue: 'ReviewDue',
  GapDetected: 'GapDetected',
} as const;

export interface EvidenceRecordedPayload {
  evidenceId: string;
  learnerId: LearnerId;
  conceptId: ConceptId;
  correct: boolean;
  score: number;
}

export interface MasteryUpdatedPayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
  pMastery: number;
  stability: number;
  retrievability: number;
  stage: MasteryStage;
}

export interface ReviewDuePayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
  retrievability: number;
}

export interface GapDetectedPayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
  pMastery: number;
}
