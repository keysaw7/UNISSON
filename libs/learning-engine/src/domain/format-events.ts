import type { ConceptId, LearnerId } from '@unisson/shared-kernel';
import type { Format } from '@unisson/content';

/** Événements du Format Selector (§6.5). */
export const FORMAT_EVENTS = {
  FormatSelected: 'FormatSelected',
  FormatEfficacyRecorded: 'FormatEfficacyRecorded',
} as const;

export interface FormatSelectedPayload {
  learnerId: LearnerId;
  conceptId: ConceptId;
  format: Format;
  difficulty: number;
  rationale: string;
  fallbackFormats: Format[];
}

export interface FormatEfficacyRecordedPayload {
  formatType: Format;
  conceptType: string;
  stabilityGainPerMinute: number;
  observations: number;
}
