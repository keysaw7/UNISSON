import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Les libs sont résolues vers leur point d'entrée public (src/index.ts) : aucune
// résolution vers les internes d'un autre contexte n'est possible (frontière §17.2).
const alias = {
  '@unisson/shared-kernel': r('./libs/shared-kernel/src/index.ts'),
  '@unisson/learning-engine': r('./libs/learning-engine/src/index.ts'),
  '@unisson/knowledge-graph': r('./libs/knowledge-graph/src/index.ts'),
  '@unisson/learner-modeling': r('./libs/learner-modeling/src/index.ts'),
  '@unisson/assessment': r('./libs/assessment/src/index.ts'),
  '@unisson/content': r('./libs/content/src/index.ts'),
  '@unisson/ai-orchestration': r('./libs/ai-orchestration/src/index.ts'),
  '@unisson/identity': r('./libs/identity/src/index.ts'),
  '@unisson/persistence': r('./libs/persistence/src/index.ts'),
};

export default defineConfig({
  plugins: [
    // Support des décorateurs + métadonnées (NestJS) dans les tests.
    swc.vite({
      jsc: {
        target: 'es2022',
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  resolve: { alias },
  test: {
    globals: true,
    environment: 'node',
    include: ['libs/**/*.test.ts', 'apps/**/*.test.ts', 'apps/**/*.e2e.test.ts'],
    // apps/web (Next.js) a son propre vitest.config.ts (environnement jsdom, alias `@/*`,
    // matchers jest-dom) — lancé séparément via `npm run test --workspace=apps/web`.
    exclude: [...configDefaults.exclude, 'apps/web/**'],
    setupFiles: ['reflect-metadata'],
  },
});
