import { z } from 'zod';
import type { ParsedGoalDraft } from '@unisson/learning-engine';
import type { LLMPort } from '../ports/llm.port';

/**
 * Schéma de sortie de la capacité `parse_goal` (§10.3). Toute réponse du modèle est
 * validée AVANT de revenir au domaine — jamais de texte brut non vérifié.
 */
const ParseGoalOutputSchema = z.object({
  domain: z.string().min(1),
  targetSkills: z.array(z.string()).default([]),
  targetLevel: z.string().default('unknown'),
  motivation: z.string().optional(),
  constraints: z
    .object({
      minutesPerDay: z.number().positive().optional(),
      deadline: z.string().optional(),
      preferredFormats: z.array(z.string()).optional(),
    })
    .default({}),
  confidence: z.number().min(0).max(1),
  clarificationsNeeded: z.array(z.string()).default([]),
});

export class SchemaValidationError extends Error {
  constructor(capability: string, details: string) {
    super(`Sortie IA invalide pour "${capability}": ${details}`);
    this.name = 'SchemaValidationError';
  }
}

function buildPrompt(rawStatement: string): string {
  // Prompt volontairement minimal en Phase 0 (le Prompt Store versionné viendra ensuite).
  return [
    'Extrais un objectif d’apprentissage structuré au format JSON strict avec les clés:',
    'domain, targetSkills[], targetLevel, motivation?, constraints{}, confidence(0..1), clarificationsNeeded[].',
    `Énoncé: "${rawStatement}"`,
  ].join('\n');
}

export class ParseGoalCapability {
  constructor(private readonly llm: LLMPort) {}

  async run(rawStatement: string): Promise<ParsedGoalDraft> {
    const response = await this.llm.complete({
      capability: 'parse_goal',
      prompt: buildPrompt(rawStatement),
    });

    let json: unknown;
    try {
      json = JSON.parse(response.text);
    } catch {
      throw new SchemaValidationError('parse_goal', 'réponse non-JSON');
    }

    const parsed = ParseGoalOutputSchema.safeParse(json);
    if (!parsed.success) {
      throw new SchemaValidationError('parse_goal', parsed.error.issues.map((i) => i.message).join('; '));
    }

    return {
      domain: parsed.data.domain,
      targetSkills: parsed.data.targetSkills,
      targetLevel: parsed.data.targetLevel,
      motivation: parsed.data.motivation,
      constraints: parsed.data.constraints,
      confidence: parsed.data.confidence,
      clarificationsNeeded: parsed.data.clarificationsNeeded,
    };
  }
}
