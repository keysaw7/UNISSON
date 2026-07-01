import { z } from 'zod';
import type { ContentRequest } from '@unisson/content';
import { AiGateway, type ValidationResult } from '../gateway/ai-gateway';

/**
 * Schéma de sortie de la capacité `generate_content` (§6.5, §10.3). Le Format Selector décide de
 * la FORME (abstraite) ; cette capacité ne fait QUE produire le contenu concret pour cette forme —
 * jamais l'inverse. Toute sortie IA est validée avant de revenir au domaine.
 */
const GenerateContentOutputSchema = z.object({
  body: z.string().min(1),
  title: z.string().optional(),
});

export interface GeneratedContent {
  body: string;
  title?: string;
}

const PROMPT_VERSION = 'v1';

function buildPrompt(request: ContentRequest): string {
  const variantLine =
    request.contextVariant !== undefined ? `contextVariant: ${request.contextVariant}` : '';
  const formatHint =
    request.format === 'activation_probe'
      ? 'Pose UNE question de rappel ou de prédiction (sans exposer le contenu). Pas de leçon.'
      : request.format === 'generation_exercise'
        ? 'Demandez à l\'apprenant d\'expliquer avec ses propres mots ou de créer un exemple.'
        : request.format === 'transfer_probe'
          ? 'Proposez une situation ou formulation NOUVELLE jamais vue pour tester le transfert.'
          : '';
  return [
    'Génère un contenu pédagogique pour l’item suivant. Réponds en JSON strict avec les clés :',
    'body (string, le contenu), title (string, optionnel).',
    `targetRef: ${request.targetRef}`,
    `format: ${request.format}`,
    `difficulty: ${request.difficulty}`,
    variantLine,
    formatHint,
  ]
    .filter(Boolean)
    .join('\n');
}

function parse(rawText: string): ValidationResult<GeneratedContent> {
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return { success: false, errors: 'réponse non-JSON' };
  }
  const parsed = GenerateContentOutputSchema.safeParse(json);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') };
  }
  return { success: true, data: parsed.data };
}

/** Capacité `generate_content` (§6.5, §10.3) : ne décrit QUE prompt + schéma ; le Gateway orchestre le reste. */
export class GenerateContentCapability {
  constructor(private readonly gateway: AiGateway) {}

  run(request: ContentRequest): Promise<GeneratedContent> {
    return this.gateway.execute({
      name: 'generate_content',
      promptVersion: PROMPT_VERSION,
      cacheKeySeed: `${request.targetRef}:${request.format}:${request.difficulty}:${request.contextVariant ?? 0}`,
      buildPrompt: () => buildPrompt(request),
      buildRepairPrompt: (previous, errors) =>
        [
          buildPrompt(request),
          `Ta réponse précédente était invalide : ${previous}`,
          `Erreurs : ${errors}`,
          'Corrige et renvoie UNIQUEMENT le JSON valide.',
        ].join('\n'),
      parse,
      cacheTtlSeconds: 60 * 60 * 24 * 90, // §10.4 : cache sémantique 90j pour generate_exercise-like
    });
  }
}
