import type { LLMPort, LlmCompletionRequest, LlmCompletionResponse } from '../ports/llm.port';
import { stripMarkdownFence } from './strip-markdown-fence';

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
export type Verbosity = 'low' | 'medium' | 'high';

export interface OpenAiLlmAdapterOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  organization?: string;
  /**
   * Modèles de raisonnement (gpt-5*, o1, o3, o4…) uniquement. Ignoré pour les autres modèles
   * (l'API rejette ce paramètre s'il est envoyé à un modèle qui ne le supporte pas).
   * Défaut si non précisé et modèle de raisonnement détecté : 'minimal' — nos capacités
   * (extraction JSON structurée) sont des tâches déterministes qui n'ont pas besoin de
   * délibération, cf. recommandation OpenAI pour l'extraction/formatage.
   */
  reasoningEffort?: ReasoningEffort;
  /** Idem, modèles de raisonnement uniquement. Défaut : 'low' (sortie JSON compacte). */
  verbosity?: Verbosity;
  /**
   * Plafond de tokens généRÉS, raisonnement compris (le raisonnement est facturé et consomme ce
   * budget même s'il n'apparaît pas dans la réponse). Sans cette limite, un modèle de raisonnement
   * peut consommer tout son budget interne en délibération et renvoyer une sortie vide
   * (`finish_reason: 'length'`) — cf. `complete()` qui détecte explicitement ce cas.
   */
  maxCompletionTokens?: number;
}

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_REASONING_MAX_COMPLETION_TOKENS = 2048;

/** Familles de modèles où `reasoning_effort`/`verbosity` sont acceptés par l'API. */
const REASONING_MODEL_PREFIXES = ['gpt-5', 'o1', 'o3', 'o4'];

function isReasoningModel(model: string): boolean {
  return REASONING_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

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
 *
 * Prend en compte les modèles de **raisonnement** (gpt-5*, o-series) : `reasoning_effort` +
 * `verbosity` (Chat Completions accepte ces deux champs pour ces modèles), `max_completion_tokens`
 * au lieu de l'ancien `max_tokens`, et une erreur explicite si le raisonnement consomme tout le
 * budget de tokens avant de produire une sortie visible.
 */
export class OpenAiLlmAdapter implements LLMPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly organization?: string;
  private readonly reasoningEffort?: ReasoningEffort;
  private readonly verbosity?: Verbosity;
  private readonly maxCompletionTokens?: number;
  private readonly reasoningModel: boolean;

  constructor(options: OpenAiLlmAdapterOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_MODEL;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.organization = options.organization;
    this.reasoningModel = isReasoningModel(this.model);
    this.reasoningEffort = options.reasoningEffort ?? (this.reasoningModel ? 'minimal' : undefined);
    this.verbosity = options.verbosity ?? (this.reasoningModel ? 'low' : undefined);
    this.maxCompletionTokens =
      options.maxCompletionTokens ?? (this.reasoningModel ? DEFAULT_REASONING_MAX_COMPLETION_TOKENS : undefined);
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: request.prompt },
      ],
    };
    if (this.maxCompletionTokens !== undefined) body.max_completion_tokens = this.maxCompletionTokens;
    // Ces deux champs ne sont acceptés que par les modèles de raisonnement (l'API rejette la
    // requête si on les envoie à gpt-4o-mini par ex.) — on ne les inclut donc jamais pour un
    // modèle non détecté comme tel, sauf override explicite via les options.
    if (this.reasoningEffort !== undefined) body.reasoning_effort = this.reasoningEffort;
    if (this.verbosity !== undefined) body.verbosity = this.verbosity;

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        ...(this.organization ? { 'openai-organization': this.organization } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`OpenAI API error (${res.status}) pour la capacité "${request.capability}": ${errBody}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
    };
    const choice = payload.choices?.[0];
    const text = choice?.message?.content ?? '';

    if (!text && choice?.finish_reason === 'length') {
      throw new Error(
        `OpenAI (${this.model}) a épuisé son budget de tokens en raisonnement avant de produire une sortie ` +
          `pour la capacité "${request.capability}" — augmenter maxCompletionTokens (OPENAI_MAX_COMPLETION_TOKENS).`,
      );
    }

    return { text: stripMarkdownFence(text) };
  }
}
