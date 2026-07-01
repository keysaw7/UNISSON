import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { schema } from './schema';

export type Db = NodePgDatabase<typeof schema>;

/** Pool de connexions Postgres. `DATABASE_URL` requis (ex. postgres://user:pass@host:5432/db). */
export function createPool(connectionString = process.env.DATABASE_URL): Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL manquant : impossible de créer le pool Postgres.');
  }
  return new Pool({ connectionString });
}

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}

/**
 * Exécute `fn` dans UNE transaction (support de l'outbox transactionnel §12.3 : écrire l'état
 * métier et les lignes outbox de façon atomique). Les adapters PG acceptent un `Executor` =
 * `Db` **ou** transaction, donc partager le même `tx` rend l'unité de travail atomique.
 */
export async function runInTransaction<T>(db: Db, fn: (tx: Db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx as unknown as Db));
}
