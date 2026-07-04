import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: path.resolve(import.meta.dirname, 'e2e/.env.e2e.local') });

// When E2E_BASE_URL is set (e.g. staging), run against that deployment instead
// of spinning up the local dev server.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5174';
const targetsRemote = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: targetsRemote
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5174',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
