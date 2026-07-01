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
    if (request.capability === 'generate_content') {
      return { text: JSON.stringify(this.fakeGenerateContent(request.prompt)) };
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
    if (p.includes('espagnol') || p.includes('spanish') || p.includes('español')) {
      return {
        domain: 'spanish',
        targetSkills: ['greetings', 'basic-vocab', 'basic-conversation'],
        targetLevel: 'A1',
        motivation: p.includes('voyage') ? 'voyage' : undefined,
        constraints: {},
        confidence: 0.85,
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

  /** Simule `generate_content` : extrait les paramètres du prompt et produit un corps déterministe. */
  private fakeGenerateContent(prompt: string): unknown {
    const extract = (key: string): string => prompt.match(new RegExp(`^${key}: (.*)$`, 'm'))?.[1]?.trim() ?? '';
    const targetRef = extract('targetRef') || 'concept';
    const format = extract('format') || 'explanation';
    const difficulty = extract('difficulty') || '0.5';

    return {
      title: `${format} — ${targetRef}`,
      body: `[stub] contenu « ${format} » pour « ${targetRef} » (difficulté ${difficulty}).`,
    };
  }
}
