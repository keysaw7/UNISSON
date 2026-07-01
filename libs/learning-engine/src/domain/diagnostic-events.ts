import type { ConceptId, DiagnosticSessionId, LearnerId } from '@unisson/shared-kernel';
import type { ConceptPrior } from './diagnostic';

/** Événements du diagnostic adaptatif (§6.2). */
export const DIAGNOSTIC_EVENTS = {
  DiagnosticStarted: 'DiagnosticStarted',
  DiagnosticItemAnswered: 'DiagnosticItemAnswered',
  DiagnosticCompleted: 'DiagnosticCompleted',
  InitialStateEstimated: 'InitialStateEstimated',
} as const;

export interface DiagnosticStartedPayload {
  sessionId: DiagnosticSessionId;
  learnerId: LearnerId;
  domain: string;
  regionSize: number;
}

export interface DiagnosticItemAnsweredPayload {
  sessionId: DiagnosticSessionId;
  learnerId: LearnerId;
  conceptId: ConceptId;
  correct: boolean;
  itemsAsked: number;
}

export interface InitialStateEstimatedPayload {
  sessionId: DiagnosticSessionId;
  learnerId: LearnerId;
  priors: ConceptPrior[];
}
