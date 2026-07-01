import type { GoalConstraints } from '../domain/structured-goal';

/**
 * Brouillon d'objectif proposé par une IA (out-port). Le moteur reste maître de la
 * décision : ce port ne fait que PROPOSER une structure candidate.
 */
export interface ParsedGoalDraft {
  domain: string;
  targetSkills: string[];
  targetLevel: string;
  motivation?: string;
  constraints: GoalConstraints;
  confidence: number;
  clarificationsNeeded: string[];
}

export interface GoalParserPort {
  parse(rawStatement: string): Promise<ParsedGoalDraft>;
}

/** Token d'injection (les interfaces n'existent pas à l'exécution). */
export const GOAL_PARSER_PORT = Symbol('GoalParserPort');
