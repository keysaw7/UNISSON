import { defineConfig, devices } from '@playwright/test';

/**
 * E2e du parcours complet (§2 du plan frontend : "Playwright pour l'e2e du parcours complet
 * goal → diagnostic → plan → session → feedback"). Nécessite l'API (`npm run start:api`) et le
 * frontend (`npm run dev`, ou `webServer` ci-dessous) démarrés — voir `tests/e2e/README.md`.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
