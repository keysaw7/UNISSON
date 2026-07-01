import type { LLMPort, LlmCompletionRequest, LlmCompletionResponse } from '../ports/llm.port';

export interface AnthropicLlmAdapterOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';
const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const SYSTEM_PROMPT =
  'Tu es un moteur de génération pour un système pédagogique. Réponds UNIQUEMENT avec du JSON ' +
  'strictement valide correspondant au format demandé, sans texte autour, sans balises markdown, ' +
  'sans commentaire.';

/**
 * Adapter Anthropic pour `LLMPort` (§10.7 : « ajouter un fournisseur = un adapter »). Seul endroit
 * du système qui connaît l'API concrète du fournisseur — le domaine et l'AI Gateway n'en savent
 * rien. Le contenu (prompt, validation, cache, réparation) reste géré par l'`AiGateway`, ce fichier
 * ne fait QUE le transport HTTP.
 */
export class AnthropicLlmAdapter implements LLMPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicLlmAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.maxTokens = options.maxTokens ?? 1024;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Anthropic API error (${res.status}) pour la capacité "${request.capability}": ${body}`);
    }

    const payload = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = payload.content?.find((block) => block.type === 'text')?.text ?? '';
    return { text: stripMarkdownFence(text) };
  }
}

/** Filet de sécurité : certains modèles enveloppent le JSON dans ```json ... ``` malgré la consigne. */
function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return match ? match[1]! : trimmed;
}
