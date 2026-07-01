import type { LLMPort, LlmCompletionRequest, LlmCompletionResponse } from '../ports/llm.port';
import { stripMarkdownFence } from './strip-markdown-fence';

export interface OpenAiLlmAdapterOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  organization?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_PROMPT =
  'Tu es un moteur de génération pour un système pédagogique. Réponds UNIQUEMENT avec du JSON ' +
  'strictement valide correspondant au format demandé, sans texte autour, sans balises markdown, ' +
  'sans commentaire.';

/**
 * Adapter OpenAI pour `LLMPort` (§10.7 : « ajouter un fournisseur = un adapter »). Seul endroit
 * du système qui connaît l'API concrète du fournisseur — le domaine et l'AI Gateway n'en savent
 * rien. Le contenu (prompt, validation, cache, réparation) reste géré par l'`AiGateway`, ce fichier
 * ne fait QUE le transport HTTP. `response_format: json_object` force une sortie JSON côté modèle,
 * en complément du filet de sécurité `stripMarkdownFence`.
 */
export class OpenAiLlmAdapter implements LLMPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly organization?: string;

  constructor(options: OpenAiLlmAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.organization = options.organization;
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        ...(this.organization ? { 'openai-organization': this.organization } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: request.prompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI API error (${res.status}) pour la capacité "${request.capability}": ${body}`);
    }

    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content ?? '';
    return { text: stripMarkdownFence(text) };
  }
}
