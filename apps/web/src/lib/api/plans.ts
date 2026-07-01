import 'server-only';
import type { LearningPlan } from '@unisson/learning-engine';
import { api } from './http';
import type { CreatePlanResponse, NextActivityResponse } from './types';

/** Curriculum Planner (§6.3) : construit le sous-DAG requis, ordonné (glouton pondéré). */
export function createPlan(input: {
  learnerId: string;
  goalId?: string;
  domain: string;
  targetSkills: string[];
  motivation?: string;
  minutesPerDay?: number;
  horizonDays?: number;
}): Promise<CreatePlanResponse> {
  const { learnerId, ...body } = input;
  return api.post<CreatePlanResponse>(`/learners/${encodeURIComponent(learnerId)}/plan`, body);
}

export function getPlan(planId: string): Promise<LearningPlan> {
  return api.get<LearningPlan>(`/plans/${encodeURIComponent(planId)}`);
}

/**
 * Liste des plans d'un apprenant — nécessite `GET /learners/:learnerId/plans` côté API
 * (cf. plan frontend §5, todo `backend-list-plans`).
 */
export function listPlansForLearner(learnerId: string): Promise<LearningPlan[]> {
  return api.get<LearningPlan[]>(`/learners/${encodeURIComponent(learnerId)}/plans`);
}

/** Sequencer (§9) : quelle activité maintenant (révision urgente, remédiation, nouveau concept) ? */
export function getNextActivity(input: { learnerId: string; planId: string }): Promise<NextActivityResponse> {
  return api.get<NextActivityResponse>(
    `/learners/${encodeURIComponent(input.learnerId)}/plans/${encodeURIComponent(input.planId)}/next-activity`,
  );
}
