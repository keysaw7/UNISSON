import { z } from 'zod';
import type { ParsedGoalDraft } from '@unisson/learning-engine';
import { AiGateway, type ValidationResult } from '../gateway/ai-gateway';

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

const PROMPT_VERSION = 'v1';

function buildPrompt(rawStatement: string): string {
  return [
    'Extrais un objectif d’apprentissage structuré au format JSON strict avec les clés:',
    'domain, targetSkills[], targetLevel, motivation?, constraints{}, confidence(0..1), clarificationsNeeded[].',
    `Énoncé: "${rawStatement}"`,
  ].join('\n');
}

function parse(rawText: string): ValidationResult<ParsedGoalDraft> {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return { success: false, errors: 'réponse non-JSON' };
  }
  const parsed = ParseGoalOutputSchema.safeParse(json);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  return { success: true, data: parsed.data };
}

/** Capacité `parse_goal` (§6.1, §10.3) : ne décrit QUE prompt + schéma ; le Gateway orchestre le reste. */
export class ParseGoalCapability {
  constructor(private readonly gateway: AiGateway) {}

  run(rawStatement: string): Promise<ParsedGoalDraft> {
    return this.gateway.execute({
      name: 'parse_goal',
      promptVersion: PROMPT_VERSION,
      cacheKeySeed: rawStatement.trim().toLowerCase(),
      buildPrompt: () => buildPrompt(rawStatement),
      buildRepairPrompt: (previous, errors) =>
        [
          buildPrompt(rawStatement),
          `Ta réponse précédente était invalide : ${previous}`,
          `Erreurs : ${errors}`,
          'Corrige et renvoie UNIQUEMENT le JSON valide.',
        ].join('\n'),
      parse,
      cacheTtlSeconds: 60 * 60 * 24, // 1 jour : un objectif reformulé identique peut être resservi
    });
  }
}
