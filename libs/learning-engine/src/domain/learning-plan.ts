import type { GoalId, LearnerId, PlanId, SkillId } from '@unisson/shared-kernel';

/** Statut d'une compétence dans le plan (§6.3, étape 2). */
export type PlannedSkillStatus = 'mastered' | 'to_acquire' | 'to_remediate';

/**
 * Compétence planifiée. `rationale` rend le plan **explicable** (« les kana d'abord car ils
 * débloquent tout le reste »).
 */
export interface PlannedSkill {
  skillId: SkillId;
  title: string;
  status: PlannedSkillStatus;
  /** Score de priorité (approche B) : plus haut = servi plus tôt. */
  priority: number;
  prerequisites: SkillId[];
  /** Effort estimé en minutes (heuristique, affinable par télémétrie). */
  estimatedEffortMinutes: number;
  rationale: string;
}

/** Hypothèses du plan : servent à détecter la DÉRIVE et à justifier une re-planification (§6.3). */
export interface PlanAssumptions {
  minutesPerDay?: number;
  deadline?: string;
  /** Effort total requis (min) vs budget disponible (min) sur l'horizon. */
  totalEffortMinutes: number;
  budgetMinutes?: number;
  feasible: boolean;
}

/**
 * Plan d'apprentissage VERSIONNÉ (§6.3). Ce n'est pas un script rigide : un espace ordonné +
 * des priorités. Le Sequencer (§9) décide de l'activité au moment présent.
 */
export interface LearningPlan {
  id: PlanId;
  goalId: GoalId;
  learnerId: LearnerId;
  domain: string;
  version: number;
  /** Compétences non maîtrisées, ordonnées (tri topologique glouton pondéré). */
  skillOrder: PlannedSkill[];
  estimatedEffortMinutes: number;
  assumptions: PlanAssumptions;
  createdAt: string;
}

/** Prochaine compétence non maîtrisée à travailler selon l'ordre du plan. */
export function nextSkill(plan: LearningPlan): PlannedSkill | null {
  return plan.skillOrder.find((s) => s.status !== 'mastered') ?? null;
}
