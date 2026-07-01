// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * Règles de frontières (§17.2) — imposées par l'outillage, pas par la discipline.
 *
 * 1. `domain/` et `ports/` n'importent JAMAIS d'infra (adapters, frameworks, SDK, DB).
 * 2. Les imports inter-contextes passent par le nom de package (`@unisson/*`) — la
 *    résolution ne mappe que le point d'entrée public `src/index.ts` de chaque lib.
 * 3. Seul `apps/api` (composition root) connaît les implémentations concrètes.
 */
const forbiddenInPureLayers = [
  { group: ['**/adapters', '**/adapters/**'], message: 'Domain/Ports ne doivent pas importer d’adapters (infra).' },
  { group: ['@nestjs/*', '@nestjs/**'], message: 'Domain/Ports doivent rester agnostiques du framework (NestJS interdit ici).' },
  { group: ['drizzle-orm', 'drizzle-orm/**', 'pg', 'pg/**'], message: 'Pas d’accès persistance depuis Domain/Ports.' },
  { group: ['zod'], message: 'Le domaine reste pur : la validation de schéma vit dans les capabilities/adapters.' },
];

export default tseslint.config(
  {
    // apps/web (Next.js) a son propre eslint.config.mjs (eslint-config-next) : frontières/règles
    // NestJS+domaine ci-dessus ne s'y appliquent pas.
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/*.tsbuildinfo', 'apps/web/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['libs/**/src/domain/**/*.ts', 'libs/**/src/ports/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: forbiddenInPureLayers }],
    },
  },
  {
    files: ['**/*.test.ts', 'apps/*/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
