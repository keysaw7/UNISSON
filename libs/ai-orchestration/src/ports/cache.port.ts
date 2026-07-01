/**
 * Cache du Gateway (§10.2, §10.6). Clé = hash(capability + version de prompt + entrée normalisée) ;
 * versionner le prompt invalide proprement le cache (ADR-011). Exact-match ici ; le sémantique
 * (similarité d'embeddings, pgvector) est une extension future derrière le même port.
 */
export interface CachePort {
  get(key: string, seedText?: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number, seedText?: string): Promise<void>;
}

export const CACHE_PORT = Symbol('CachePort');
