import type { AssessmentEvidence } from '../domain/assessment-evidence';

export interface GradingInput {
  activityId: string;
  expectedAnswer: string;
  learnerAnswer: string;
}

/**
 * Routage de correction (§6.4) : déterministe → règles/fuzzy → IA → modèle spécialisé.
 * L'implémentation choisit la méthode la moins chère fiable.
 */
export interface GradingStrategyPort {
  grade(input: GradingInput): Promise<AssessmentEvidence>;
}

export const GRADING_STRATEGY_PORT = Symbol('GradingStrategyPort');
