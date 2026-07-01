import type { LLMPort, LlmCompletionRequest, LlmCompletionResponse } from '../ports/llm.port';

/**
 * Adapter LLM factice pour la Phase 0 (walking skeleton). Il simule une sortie
 * structurée valide sans appeler de vrai modèle. Sera remplacé par de vrais adapters
 * (OpenAI, Anthropic, local…) sans toucher au domaine.
 */
export class StubLlmAdapter implements LLMPort {
  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    if (request.capability === 'parse_goal') {
      return { text: JSON.stringify(this.fakeParseGoal(request.prompt)) };
    }
    return { text: '{}' };
  }

  private fakeParseGoal(prompt: string): unknown {
    const p = prompt.toLowerCase();
    if (p.includes('japon')) {
      return {
        domain: 'japanese',
        targetSkills: ['hiragana', 'katakana', 'vocab-n5', 'grammar-particles'],
        targetLevel: 'N5',
        motivation: p.includes('voyage') ? 'voyage' : undefined,
        constraints: {},
        confidence: 0.86,
        clarificationsNeeded: [],
      };
    }
    if (p.includes('dévelop') || p.includes('develop') || p.includes('code') || p.includes('program')) {
      return {
        domain: 'programming',
        targetSkills: ['variables', 'control-flow', 'functions'],
        targetLevel: 'beginner',
        constraints: {},
        confidence: 0.7,
        clarificationsNeeded: ['Quel langage ou quel type de développement vises-tu ?'],
      };
    }
    return {
      domain: 'unknown',
      targetSkills: [],
      targetLevel: 'unknown',
      constraints: {},
      confidence: 0.4,
      clarificationsNeeded: [],
    };
  }
}
