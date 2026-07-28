import { defineConfig, devices } from '@playwright/test';

const hasParticipantCredentials = Boolean(
  process.env.E2E_PARTICIPANT_EMAIL && process.env.E2E_PARTICIPANT_PASSWORD,
);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium-public',
      testIgnore: [
        /.*\.setup\.ts/,
        /.*3-dashboard\.spec\.ts/,
      ],
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
    },
    ...(hasParticipantCredentials
      ? [
          {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
          },
          {
            name: 'chromium-authenticated',
            testMatch: /.*3-dashboard\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
          },
        ]
      : []),
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
