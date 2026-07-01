import type { CachePort } from '../ports/cache.port';

/**
 * Cache en deux niveaux : exact (rapide) puis sémantique (similarité, pgvector en prod).
 * Le second niveau est optionnel — sans DB, seul l'exact est actif.
 */
export class LayeredCache implements CachePort {
  constructor(
    private readonly exact: CachePort,
    private readonly semantic?: CachePort,
  ) {}

  async get(key: string, seedText?: string): Promise<string | null> {
    const exactHit = await this.exact.get(key, seedText);
    if (exactHit) return exactHit;
    if (this.semantic && seedText) return this.semantic.get(key, seedText);
    return null;
  }

  async set(key: string, value: string, ttlSeconds?: number, seedText?: string): Promise<void> {
    await this.exact.set(key, value, ttlSeconds, seedText);
    if (this.semantic && seedText) await this.semantic.set(key, value, ttlSeconds, seedText);
  }
}
