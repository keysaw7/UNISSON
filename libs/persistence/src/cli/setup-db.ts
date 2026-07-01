import { createDb, createPool } from '../client';
import { runMigrations } from '../migrate';
import { seedKnowledgeGraph } from '../seed';

/** `npm run db:setup` — migre le schéma puis charge le graphe Japonais N5. */
async function main(): Promise<void> {
  const pool = createPool();
  try {
    await runMigrations(pool);
    await seedKnowledgeGraph(createDb(pool));
    console.log('✓ Base migrée et graphes multi-domaines chargés (Japonais N5 + Espagnol A1).');
  } finally {
    await pool.end();
  }
}

void main();
