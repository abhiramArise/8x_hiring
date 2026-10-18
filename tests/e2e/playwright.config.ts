import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  testDir: fileURLToPath(new URL('.', import.meta.url)),
  testMatch: 'slate.spec.ts',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  outputDir: fileURLToPath(new URL('../../work/playwright/results', import.meta.url)),
  reporter: [
    ['list'],
    ['json', { outputFile: fileURLToPath(new URL('../../work/playwright/results.json', import.meta.url)) }],
    ['html', { outputFolder: fileURLToPath(new URL('../../work/playwright/report', import.meta.url)), open: 'never' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://slate-workspace.vercel.app/',
    browserName: 'chromium',
    viewport: { width: 1440, height: 900 },
    storageState: { cookies: [], origins: [] },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
