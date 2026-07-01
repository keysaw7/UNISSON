import type { CachePort } from '../ports/cache.port';

interface Entry {
  value: string;
  expiresAt: number | null;
}

/** Cache mémoire (dev/CI). Un cache distribué (Redis) ou sémantique (pgvector) implémentera le même port. */
export class InMemoryCache implements CachePort {
  private readonly store = new Map<string, Entry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
  }
}
