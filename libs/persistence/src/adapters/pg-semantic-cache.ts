import { sql } from 'drizzle-orm';
import type { Db } from '../client';

const SIMILARITY_THRESHOLD = 0.92;
const EMBED_DIM = 64;

function hashEmbed(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBED_DIM]! += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

function parseVector(text: string): number[] | null {
  const inner = text.replace(/[[\]]/g, '');
  if (!inner.trim()) return null;
  return inner.split(',').map((v) => Number.parseFloat(v.trim()));
}

/** Cache sémantique Postgres/pgvector (§10.6) — complète le cache exact de l'AI Gateway. */
export class PgSemanticCache {
  constructor(private readonly db: Db) {}

  async get(_key: string, seedText?: string): Promise<string | null> {
    if (!seedText) return null;
    const embedding = hashEmbed(seedText);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const rows = await this.db.execute<{ response_text: string; embedding: string }>(sql`
      SELECT response_text, embedding::text AS embedding
      FROM semantic_cache
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT 3
    `);

    for (const row of rows.rows) {
      const stored = parseVector(row.embedding);
      if (stored && cosineSimilarity(embedding, stored) >= SIMILARITY_THRESHOLD) {
        return row.response_text;
      }
    }
    return null;
  }

  async set(key: string, value: string, _ttlSeconds?: number, seedText?: string): Promise<void> {
    if (!seedText) return;
    const embedding = hashEmbed(seedText);
    const vectorLiteral = `[${embedding.join(',')}]`;
    const now = new Date().toISOString();

    await this.db.execute(sql`
      INSERT INTO semantic_cache (cache_key, seed_text, response_text, embedding, created_at)
      VALUES (${key}, ${seedText}, ${value}, ${vectorLiteral}::vector, ${now})
      ON CONFLICT (cache_key) DO UPDATE SET
        seed_text = EXCLUDED.seed_text,
        response_text = EXCLUDED.response_text,
        embedding = EXCLUDED.embedding,
        created_at = EXCLUDED.created_at
    `);
  }
}
