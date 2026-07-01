import { createDb, createPool } from '../client';
import { runMigrations } from '../migrate';
import { seedKnowledgeGraph } from '../seed';

/** `npm run db:setup` — migre le schéma puis charge le graphe Japonais N5. */
async function main(): Promise<void> {
  const pool = createPool();
  try {
    await runMigrations(pool);
    await seedKnowledgeGraph(createDb(pool));
    console.log('✓ Base migrée et graphe N5 chargé.');
  } finally {
    await pool.end();
  }
}

void main();
