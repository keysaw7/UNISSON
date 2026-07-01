import type { AssessmentEvidence, EvidenceSignals } from '../domain/assessment-evidence';

/** Type d'activité → détermine la méthode de correction (§6.4). */
export type ActivityType = 'exact' | 'short_answer' | 'free_text';

export interface GradingInput {
  activityId: string;
  activityType: ActivityType;
  /** Réponse(s) attendue(s). Plusieurs variantes acceptées possibles. */
  expected: string | string[];
  learnerAnswer: string;
  conceptsCovered: string[];
  difficulty?: number;
  signals?: Partial<EvidenceSignals>;
}

/**
 * Routage de correction (§6.4) : déterministe → règles/fuzzy → IA → modèle spécialisé.
 * L'implémentation choisit la méthode la moins chère fiable. Produit une ÉVIDENCE, pas un verdict.
 */
export interface GradingStrategyPort {
  grade(input: GradingInput): Promise<AssessmentEvidence>;
}

export const GRADING_STRATEGY_PORT = Symbol('GradingStrategyPort');
