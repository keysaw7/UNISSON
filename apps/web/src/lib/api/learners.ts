import 'server-only';
import type { ActivityType } from '@unisson/assessment';
import { api } from './http';
import type { EvidenceResponse, MasteryResponse, SubmitAnswerResponse } from './types';

/** Assessment & Analyse d'erreurs (§6.4) : ferme la boucle réponse → évidence pondérée → maîtrise. */
export function submitAnswer(input: {
  learnerId: string;
  activityId: string;
  activityType: ActivityType;
  expected: string | string[];
  learnerAnswer: string;
  conceptsCovered: string[];
  difficulty?: number;
  signals?: { latencyMs?: number; usedHint?: boolean; attempts?: number; selfConfidence?: number };
}): Promise<SubmitAnswerResponse> {
  const { learnerId, ...body } = input;
  return api.post<SubmitAnswerResponse>(`/learners/${encodeURIComponent(learnerId)}/answers`, body);
}

/** Enregistre une preuve « brute » (hors flux answers), met à jour Maîtrise + Oubli (§8). */
export function submitEvidence(input: {
  learnerId: string;
  conceptId: string;
  correct: boolean;
  score?: number;
  difficulty?: number;
  responseTimeMs?: number;
  evidenceWeight?: number;
}): Promise<EvidenceResponse> {
  const { learnerId, ...body } = input;
  return api.post<EvidenceResponse>(`/learners/${encodeURIComponent(learnerId)}/evidence`, body);
}

export function getMastery(learnerId: string, conceptId: string): Promise<MasteryResponse> {
  return api.get<MasteryResponse>(
    `/learners/${encodeURIComponent(learnerId)}/mastery/${encodeURIComponent(conceptId)}`,
  );
}
