import type { LLMPort } from '../ports/llm.port';
import { AnthropicLlmAdapter } from '../adapters/anthropic-llm.adapter';
import { OpenAiLlmAdapter, type ReasoningEffort, type Verbosity } from '../adapters/openai-llm.adapter';
import { StubLlmAdapter } from '../adapters/stub-llm.adapter';

/** Sous-ensemble de `process.env` utilisé pour la sélection — évite de dépendre de `process` dans les tests. */
export interface LlmProviderEnv {
  LLM_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  OPENAI_ORGANIZATION?: string;
  /** Modèles de raisonnement (gpt-5*, o-series) uniquement — ignorés pour les autres modèles OpenAI. */
  OPENAI_REASONING_EFFORT?: string;
  OPENAI_VERBOSITY?: string;
  OPENAI_MAX_COMPLETION_TOKENS?: string;
}

export interface SelectedLlmProviders {
  primary: LLMPort;
  fallback?: LLMPort;
}

/**
 * Sélectionne le(s) fournisseur(s) LLM à partir des variables d'environnement (§10.7, §17.2 :
 * même bascule que Postgres vs. mémoire). Sans configuration → `StubLlmAdapter` (dev/CI,
 * déterministe). Avec une ou deux clés API → fournisseur réel en primaire, l'autre fournisseur
 * disponible (ou le stub) en secours automatique côté `AiGateway`.
 *
 * `LLM_PROVIDER` permet de forcer explicitement le choix (`anthropic` | `openai` | `stub`) ;
 * sans cette variable, la détection automatique préfère Anthropic puis OpenAI si plusieurs
 * clés sont présentes. Demander un fournisseur dont la clé est absente échoue tôt (erreur de
 * configuration explicite plutôt qu'un repli silencieux surprenant).
 */
export function selectLlmProviders(env: LlmProviderEnv): SelectedLlmProviders {
  const anthropic = env.ANTHROPIC_API_KEY
    ? new AnthropicLlmAdapter({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL })
    : undefined;
  const openai = env.OPENAI_API_KEY
    ? new OpenAiLlmAdapter({
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        organization: env.OPENAI_ORGANIZATION,
        reasoningEffort: env.OPENAI_REASONING_EFFORT as ReasoningEffort | undefined,
        verbosity: env.OPENAI_VERBOSITY as Verbosity | undefined,
        maxCompletionTokens: env.OPENAI_MAX_COMPLETION_TOKENS
          ? Number(env.OPENAI_MAX_COMPLETION_TOKENS)
          : undefined,
      })
    : undefined;

  const requested = env.LLM_PROVIDER?.trim().toLowerCase();

  if (requested === 'stub') {
    return { primary: new StubLlmAdapter() };
  }
  if (requested === 'anthropic') {
    if (!anthropic) throw missingKeyError('anthropic', 'ANTHROPIC_API_KEY');
    return { primary: anthropic, fallback: openai ?? new StubLlmAdapter() };
  }
  if (requested === 'openai') {
    if (!openai) throw missingKeyError('openai', 'OPENAI_API_KEY');
    return { primary: openai, fallback: anthropic ?? new StubLlmAdapter() };
  }
  if (requested) {
    throw new Error(`LLM_PROVIDER="${requested}" inconnu (valeurs acceptées : anthropic, openai, stub).`);
  }

  if (anthropic) return { primary: anthropic, fallback: openai ?? new StubLlmAdapter() };
  if (openai) return { primary: openai, fallback: new StubLlmAdapter() };
  return { primary: new StubLlmAdapter() };
}

function missingKeyError(provider: string, key: string): Error {
  return new Error(`LLM_PROVIDER="${provider}" demandé mais ${key} est absente de l'environnement.`);
}
