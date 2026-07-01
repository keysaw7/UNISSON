import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = process.env.WEB_PORT ?? '3001';
const API_PORT = process.env.E2E_API_PORT ?? '3099';
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 120_000,
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `PORT=${API_PORT} npm run start:api`,
      url: `${API_URL}/health`,
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
    {
      command: process.env.CI
        ? `PORT=${WEB_PORT} UNISSON_API_URL=${API_URL} npm run start --workspace=apps/web`
        : `PORT=${WEB_PORT} UNISSON_API_URL=${API_URL} npm run dev -w apps/web`,
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: 120_000,
      cwd: '../..',
    },
  ],
});
