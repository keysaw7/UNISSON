import 'server-only';
import { api } from './http';
import type { StructuredGoalResponse } from './types';

/** Goal Intake (§6.1) : transforme un objectif flou en objectif structuré exploitable. */
export function createGoal(input: { learnerId: string; statement: string }): Promise<StructuredGoalResponse> {
  return api.post<StructuredGoalResponse>('/goals', { learnerId: input.learnerId, statement: input.statement });
}

export function listGoalsForLearner(learnerId: string): Promise<StructuredGoalResponse[]> {
  return api.get<StructuredGoalResponse[]>(`/learners/${learnerId}/goals`);
}

export function getGoal(id: string): Promise<StructuredGoalResponse | null> {
  return api.get<StructuredGoalResponse>(`/goals/${id}`).catch(() => null);
}
