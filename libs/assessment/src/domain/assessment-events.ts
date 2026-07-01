import type { ActivityId, ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { AssessmentEvidence } from './assessment-evidence';

/** Catalogue d'événements du contexte Assessment (§6.4 / §12.5). */
export const ASSESSMENT_EVENTS = {
  AnswerEvaluated: 'AnswerEvaluated',
  MisconceptionDetected: 'MisconceptionDetected',
  MissingPrerequisiteDetected: 'MissingPrerequisiteDetected',
  SlipDetected: 'SlipDetected',
} as const;

export interface AnswerEvaluatedPayload {
  learnerId: LearnerId;
  activityId: ActivityId;
  evidence: AssessmentEvidence;
}

export interface MisconceptionDetectedPayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
  misconceptionId: string;
  description: string;
  remediationHint: string;
}

export interface SlipDetectedPayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
}
