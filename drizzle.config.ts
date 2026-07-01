import { defineConfig } from 'drizzle-kit';

/** Optionnel : migrations générées par drizzle-kit. Le runtime utilise `runMigrations` (DDL). */
export default defineConfig({
  schema: './libs/persistence/src/schema.ts',
  out: './libs/persistence/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://unisson:unisson@localhost:5432/unisson',
  },
});
