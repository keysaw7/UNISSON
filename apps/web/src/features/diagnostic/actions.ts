'use server';

import { getLearnerId } from '@/lib/get-learner-id';
import { answerDiagnostic, startDiagnostic, type DeclaredLevel } from '@/lib/api/diagnostic';
import type { AnswerDiagnosticResponse, StartDiagnosticResponse } from '@/lib/api/types';

export async function startDiagnosticAction(input: {
  domain: string;
  targetSkills: string[];
  declaredLevel?: DeclaredLevel;
}): Promise<StartDiagnosticResponse> {
  const learnerId = await getLearnerId();
  return startDiagnostic({ learnerId, ...input });
}

export async function answerDiagnosticAction(input: {
  sessionId: string;
  conceptId: string;
  correct: boolean;
}): Promise<AnswerDiagnosticResponse> {
  const learnerId = await getLearnerId();
  return answerDiagnostic({ learnerId, ...input });
}
