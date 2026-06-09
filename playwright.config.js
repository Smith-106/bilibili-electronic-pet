import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = process.env.FRONTEND_SMOKE_PORT || '4173';
const COMPANION_PORT = process.env.COMPANION_SMOKE_PORT || '4174';

export default defineConfig({
  testDir: './tests/ui-smoke',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  outputDir: 'output/playwright/test-results',
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'output/playwright/report' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'admin-desktop',
      testMatch: /admin\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${FRONTEND_PORT}`,
      },
    },
    {
      name: 'companion-desktop',
      testMatch: /companion\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${COMPANION_PORT}`,
      },
    },
    {
      name: 'companion-mobile',
      testMatch: /companion\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
        baseURL: `http://127.0.0.1:${COMPANION_PORT}`,
      },
    },
  ],
  webServer: [
    {
      command: `npm --prefix frontend run dev -- --host 127.0.0.1 --port ${FRONTEND_PORT}`,
      url: `http://127.0.0.1:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npm --prefix pet-companion-web run dev -- --host 127.0.0.1 --port ${COMPANION_PORT}`,
      url: `http://127.0.0.1:${COMPANION_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
