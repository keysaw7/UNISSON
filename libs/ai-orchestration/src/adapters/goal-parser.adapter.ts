import type { GoalParserPort, ParsedGoalDraft } from '@unisson/learning-engine';
import type { LLMPort } from '../ports/llm.port';
import { ParseGoalCapability } from '../capabilities/parse-goal.capability';

/**
 * Implémente le port `GoalParserPort` du moteur en s'appuyant sur la capacité
 * `parse_goal` de l'AI Gateway. C'est le pont adapter (§10.1) entre le domaine et l'IA.
 */
export class GoalParserAdapter implements GoalParserPort {
  private readonly capability: ParseGoalCapability;

  constructor(llm: LLMPort) {
    this.capability = new ParseGoalCapability(llm);
  }

  parse(rawStatement: string): Promise<ParsedGoalDraft> {
    return this.capability.run(rawStatement);
  }
}
