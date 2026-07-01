import { z } from 'zod';
import type { ContentRequest } from '@unisson/content';
import type { LLMPort } from '../ports/llm.port';
import { SchemaValidationError } from './parse-goal.capability';

/**
 * Schéma de sortie de la capacité `generate_content` (§6.5, §10.3). Le Format Selector décide de
 * la FORME (abstraite) ; cette capacité ne fait QUE produire le contenu concret pour cette forme —
 * jamais l'inverse. Toute sortie IA est validée avant de revenir au domaine.
 */
const GenerateContentOutputSchema = z.object({
  body: z.string().min(1),
  title: z.string().optional(),
});

function buildPrompt(request: ContentRequest): string {
  return [
    'Génère un contenu pédagogique pour l’item suivant. Réponds en JSON strict avec les clés :',
    'body (string, le contenu), title (string, optionnel).',
    `targetRef: ${request.targetRef}`,
    `format: ${request.format}`,
    `difficulty: ${request.difficulty}`,
  ].join('\n');
}

export class GenerateContentCapability {
  constructor(private readonly llm: LLMPort) {}

  async run(request: ContentRequest): Promise<{ body: string; title?: string }> {
    const response = await this.llm.complete({ capability: 'generate_content', prompt: buildPrompt(request) });

    let json: unknown;
    try {
      json = JSON.parse(response.text);
    } catch {
      throw new SchemaValidationError('generate_content', 'réponse non-JSON');
    }

    const parsed = GenerateContentOutputSchema.safeParse(json);
    if (!parsed.success) {
      throw new SchemaValidationError('generate_content', parsed.error.issues.map((i) => i.message).join('; '));
    }
    return parsed.data;
  }
}
