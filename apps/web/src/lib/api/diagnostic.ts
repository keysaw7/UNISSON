import 'server-only';
import { api } from './http';
import type { AnswerDiagnosticResponse, StartDiagnosticResponse } from './types';

export type DeclaredLevel = 'beginner' | 'novice' | 'intermediate' | 'advanced';

/** Diagnostic adaptatif graph-aware (§6.2) : démarre une session et sert l'item-sonde le plus informatif. */
export function startDiagnostic(input: {
  learnerId: string;
  domain: string;
  targetSkills: string[];
  declaredLevel?: DeclaredLevel;
  budget?: number;
}): Promise<StartDiagnosticResponse> {
  const { learnerId, ...body } = input;
  return api.post<StartDiagnosticResponse>(`/learners/${encodeURIComponent(learnerId)}/diagnostic`, body);
}

/** Traite une réponse au probe courant ; à l'arrêt, sème les priors dans le modèle de maîtrise. */
export function answerDiagnostic(input: {
  learnerId: string;
  sessionId: string;
  conceptId: string;
  correct: boolean;
}): Promise<AnswerDiagnosticResponse> {
  return api.post<AnswerDiagnosticResponse>(
    `/learners/${encodeURIComponent(input.learnerId)}/diagnostic/${encodeURIComponent(input.sessionId)}`,
    { conceptId: input.conceptId, correct: input.correct },
  );
}
