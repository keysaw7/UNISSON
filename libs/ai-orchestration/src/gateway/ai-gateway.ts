import { createHash } from 'node:crypto';
import type { LLMPort } from '../ports/llm.port';
import type { CachePort } from '../ports/cache.port';
import type { TelemetryPort } from '../ports/telemetry.port';

/** Sortie IA qui ne satisfait pas le contrat de la capacité — jamais propagée telle quelle au domaine. */
export class SchemaValidationError extends Error {
  constructor(capability: string, details: string) {
    super(`Sortie IA invalide pour "${capability}": ${details}`);
    this.name = 'SchemaValidationError';
  }
}

export type ValidationResult<Output> = { success: true; data: Output } | { success: false; errors: string };

/**
 * Contrat d'une capacité (§10.3) : le prompt et la validation sont spécifiques à la capacité ;
 * cache, réparation, fallback et télémétrie sont GÉNÉRIQUES et gérés par le Gateway.
 */
export interface CapabilityDefinition<Output> {
  /** Nom de la capacité (routage + télémétrie), ex. 'parse_goal'. */
  name: string;
  /** Version du prompt (ADR-011) : entre dans la clé de cache, versionne l'artefact. */
  promptVersion: string;
  /** Représentation normalisée de l'entrée — sert de base à la clé de cache (pas le prompt entier). */
  cacheKeySeed: string;
  buildPrompt: () => string;
  buildRepairPrompt: (previousRawText: string, errors: string) => string;
  parse: (rawText: string) => ValidationResult<Output>;
  /** Tentatives de réparation (re-ask) après l'essai initial. Défaut : 1. */
  maxRepairAttempts?: number;
  /** TTL du cache en secondes. Absent = pas d'expiration. */
  cacheTtlSeconds?: number;
}

function cacheKey(name: string, promptVersion: string, seed: string): string {
  return createHash('sha256').update(`${name}:${promptVersion}:${seed}`).digest('hex');
}

/**
 * AI Gateway (§10.2) : le SEUL endroit qui orchestre cache, validation, boucle de réparation,
 * fallback et télémétrie. Les capabilities ne décrivent QUE leur prompt et leur schéma — jamais
 * cette logique transverse, pour éviter qu'elle ne soit dupliquée (et divergente) capacité par
 * capacité. Garantie (§10.5) : rien de non validé n'atteint le domaine.
 */
export const AI_GATEWAY = Symbol('AiGateway');

export class AiGateway {
  constructor(
    private readonly primary: LLMPort,
    private readonly cache: CachePort,
    private readonly telemetry: TelemetryPort,
    private readonly fallback?: LLMPort,
  ) {}

  async execute<Output>(def: CapabilityDefinition<Output>): Promise<Output> {
    const key = cacheKey(def.name, def.promptVersion, def.cacheKeySeed);
    const cached = await this.cache.get(key);
    if (cached) {
      const parsed = def.parse(cached);
      if (parsed.success) {
        await this.telemetry.record({
          capability: def.name,
          promptVersion: def.promptVersion,
          latencyMs: 0,
          attempts: 0,
          validOnFirstTry: true,
          cacheHit: true,
          success: true,
        });
        return parsed.data;
      }
      // Entrée de cache corrompue/obsolète : on l'ignore et on ré-exécute normalement.
    }

    const maxAttempts = def.maxRepairAttempts ?? 1;
    const start = Date.now();
    let rawText = '';
    let lastErrors = '';
    let usedFallback = false;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      const prompt = attempt === 0 ? def.buildPrompt() : def.buildRepairPrompt(rawText, lastErrors);
      const llm = usedFallback && this.fallback ? this.fallback : this.primary;

      let response;
      try {
        response = await llm.complete({ capability: def.name, prompt });
      } catch (err) {
        if (!usedFallback && this.fallback) {
          usedFallback = true;
          attempt -= 1; // retente le même essai avec le modèle de secours
          continue;
        }
        await this.telemetry.record({
          capability: def.name,
          promptVersion: def.promptVersion,
          latencyMs: Date.now() - start,
          attempts: attempt + 1,
          validOnFirstTry: false,
          cacheHit: false,
          success: false,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      rawText = response.text;
      const parsed = def.parse(rawText);
      if (parsed.success) {
        await this.cache.set(key, rawText, def.cacheTtlSeconds);
        await this.telemetry.record({
          capability: def.name,
          model: usedFallback ? 'fallback' : 'primary',
          promptVersion: def.promptVersion,
          latencyMs: Date.now() - start,
          attempts: attempt + 1,
          validOnFirstTry: attempt === 0 && !usedFallback,
          cacheHit: false,
          success: true,
        });
        return parsed.data;
      }
      lastErrors = parsed.errors;
    }

    await this.telemetry.record({
      capability: def.name,
      promptVersion: def.promptVersion,
      latencyMs: Date.now() - start,
      attempts: maxAttempts + 1,
      validOnFirstTry: false,
      cacheHit: false,
      success: false,
      errorMessage: lastErrors,
    });
    throw new SchemaValidationError(def.name, lastErrors);
  }
}
