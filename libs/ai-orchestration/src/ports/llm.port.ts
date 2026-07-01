/**
 * Port de sortie unique vers un modèle (§10). Le domaine ne connaît jamais ce port ;
 * seule la couche AI Orchestration l'utilise. Un fournisseur = un adapter.
 */
export interface LlmCompletionRequest {
  /** Capacité demandée (ex: 'parse_goal') — sert au routage et à la télémétrie. */
  capability: string;
  prompt: string;
}

export interface LlmCompletionResponse {
  text: string;
}

export interface LLMPort {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse>;
}

export const LLM_PORT = Symbol('LLMPort');
