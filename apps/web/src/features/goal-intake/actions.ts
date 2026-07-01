'use server';

import { getLearnerId } from '@/lib/get-learner-id';
import { goalsApi, graphApi } from '@/lib/api';
import type { SkillDto, StructuredGoalResponse } from '@/lib/api/types';
import { ApiError } from '@/lib/api/http';

export interface GoalFormState {
  goal?: StructuredGoalResponse;
  /** Compétences réellement disponibles dans le graphe pour le domaine détecté (§7). */
  availableSkills?: SkillDto[];
  error?: string;
}

/**
 * Goal Intake (§6.1) : l'IA (`parse_goal`) PROPOSE une cible ; on croise ensuite avec le graphe
 * réel (`GET /graph/skills`) pour que l'apprenant confirme des compétences qui existent
 * effectivement — le moteur décide, jamais l'IA seule.
 */
export async function submitGoalAction(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const statement = String(formData.get('statement') ?? '').trim();
  if (!statement) return { error: 'Décrivez votre objectif en une phrase, par exemple « je veux apprendre le japonais pour voyager ».' };

  try {
    const learnerId = await getLearnerId();
    const goal = await goalsApi.createGoal({ learnerId, statement });
    const availableSkills = goal.domain !== 'unknown' ? await graphApi.listSkills(goal.domain) : [];
    return { goal, availableSkills };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Erreur inattendue lors du traitement de votre objectif.';
    return { error: message };
  }
}
