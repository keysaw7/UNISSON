import 'server-only';
import type { ActivityType } from '@unisson/assessment';
import type { ConceptCycleStage, CycleTransitionEvent } from '@unisson/learning-engine';
import { api } from './http';
import type { EvidenceResponse, MasteryResponse, SubmitAnswerResponse } from './types';

export function submitAnswer(input: {
  learnerId: string;
  activityId: string;
  activityType: ActivityType;
  expected: string | string[];
  learnerAnswer: string;
  conceptsCovered: string[];
  skillId?: string;
  cycleStage?: ConceptCycleStage;
  difficulty?: number;
  signals?: { latencyMs?: number; usedHint?: boolean; attempts?: number; selfConfidence?: number };
}): Promise<SubmitAnswerResponse> {
  const { learnerId, ...body } = input;
  return api.post<SubmitAnswerResponse>(`/learners/${encodeURIComponent(learnerId)}/answers`, body);
}

export function submitEvidence(input: {
  learnerId: string;
  conceptId: string;
  skillId?: string;
  cycleStage?: ConceptCycleStage;
  correct: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
  evidenceWeight?: number;
  usedHint?: boolean;
}): Promise<EvidenceResponse> {
  const { learnerId, ...body } = input;
  return api.post<EvidenceResponse>(`/learners/${encodeURIComponent(learnerId)}/evidence`, body);
}

export function advanceCycle(input: {
  learnerId: string;
  conceptId: string;
  skillId: string;
  event: CycleTransitionEvent;
}): Promise<{ state: { stage: ConceptCycleStage } }> {
  const { learnerId, ...body } = input;
  return api.post(`/learners/${encodeURIComponent(learnerId)}/cycle/advance`, body);
}

export function getMastery(learnerId: string, conceptId: string): Promise<MasteryResponse> {
  return api.get<MasteryResponse>(
    `/learners/${encodeURIComponent(learnerId)}/mastery/${encodeURIComponent(conceptId)}`,
  );
}

export function listCycleStates(learnerId: string): Promise<{ states: Array<{ conceptId: string; stage: ConceptCycleStage }> }> {
  return api.get(`/learners/${encodeURIComponent(learnerId)}/cycle`);
}
