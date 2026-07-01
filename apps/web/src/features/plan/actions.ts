'use server';

import { getLearnerId } from '@/lib/get-learner-id';
import { plansApi } from '@/lib/api';
import type { CreatePlanResponse } from '@/lib/api/types';

export interface PlanFormState {
  result?: CreatePlanResponse;
  error?: string;
}

/** Curriculum Planner (§6.3) : sous-DAG requis → soustraction de l'acquis → tri glouton pondéré. */
export async function createPlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const domain = String(formData.get('domain') ?? 'japanese');
  const goalId = formData.get('goalId') ? String(formData.get('goalId')) : undefined;
  const motivation = formData.get('motivation') ? String(formData.get('motivation')) : undefined;
  const targetSkills = String(formData.get('targetSkills') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const minutesPerDayRaw = formData.get('minutesPerDay');
  const horizonDaysRaw = formData.get('horizonDays');

  if (targetSkills.length === 0) {
    return { error: 'Aucune compétence cible — retournez à l’étape objectif.' };
  }

  try {
    const learnerId = await getLearnerId();
    const result = await plansApi.createPlan({
      learnerId,
      domain,
      goalId,
      motivation,
      targetSkills,
      minutesPerDay: minutesPerDayRaw ? Number(minutesPerDayRaw) : undefined,
      horizonDays: horizonDaysRaw ? Number(horizonDaysRaw) : undefined,
    });
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Erreur lors de la création du plan.' };
  }
}
