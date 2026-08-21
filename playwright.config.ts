import { defineConfig, devices } from '@playwright/test';

const hasParticipantCredentials = Boolean(
  process.env.E2E_PARTICIPANT_EMAIL && process.env.E2E_PARTICIPANT_PASSWORD,
);
const tkaStagingE2EEnabled = process.env.E2E_TKA_STAGING === '1';
const contentReviewStagingE2EEnabled = process.env.E2E_CONTENT_REVIEW_STAGING === '1';

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
        /.*\.cleanup\.ts/,
        /.*3-dashboard\.spec\.ts/,
        /.*6-tka-smp-full\.spec\.ts/,
        /.*8-tka-smp-mini\.spec\.ts/,
        /.*7-content-review-workflow\.spec\.ts/,
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
            testMatch: /.*auth\.setup\.ts/,
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
    ...(tkaStagingE2EEnabled
      ? [
          {
            name: 'tka-setup',
            testMatch: /.*tka\.setup\.ts/,
            teardown: 'tka-cleanup',
          },
          {
            name: 'chromium-tka-staging',
            testMatch: /.*(?:6-tka-smp-full|8-tka-smp-mini)\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: 'playwright/.auth/tka-user.json',
            },
            dependencies: ['tka-setup'],
          },
          {
            name: 'tka-cleanup',
            testMatch: /.*tka\.cleanup\.ts/,
          },
        ]
      : []),
    ...(contentReviewStagingE2EEnabled
      ? [
          {
            name: 'content-review-setup',
            testMatch: /.*content-review\.setup\.ts/,
            teardown: 'content-review-cleanup',
          },
          {
            name: 'chromium-content-review-staging',
            testMatch: /.*7-content-review-workflow\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: { cookies: [], origins: [] },
            },
            dependencies: ['content-review-setup'],
          },
          {
            name: 'content-review-cleanup',
            testMatch: /.*content-review\.cleanup\.ts/,
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
