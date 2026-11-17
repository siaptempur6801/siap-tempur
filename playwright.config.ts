import { defineConfig, devices } from '@playwright/test';

// Final RC retrigger after repairing Vercel ↔ GitHub author authentication.
const hasParticipantCredentials = Boolean(
  process.env.E2E_PARTICIPANT_EMAIL && process.env.E2E_PARTICIPANT_PASSWORD,
);
const tkaStagingE2EEnabled = process.env.E2E_TKA_STAGING === '1';
const contentReviewStagingE2EEnabled = process.env.E2E_CONTENT_REVIEW_STAGING === '1';
const adminStagingE2EEnabled = process.env.E2E_ADMIN_STAGING === '1';
const remoteE2EEnabled = process.env.E2E_REMOTE_BASE_URL === '1';
const vercelAutomationBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

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
        /.*9-tka-smp-monetization\.spec\.ts/,
        /.*13-tka-diagnostic\.spec\.ts/,
        /.*(?:10-admin-workspace-authenticated|27-admin-task-flows|28-admin-canonical-routes|29-admin-performance)\.spec\.ts/,
        /.*11-cpns-rc\.spec\.ts/,
        /.*7-content-review-workflow\.spec\.ts/,
        /.*17-authenticated-route-health\.spec\.ts/,
        /.*(?:19-admin-role-navigation|20-instansi-join|21-instansi-exam|22-landing-authenticated|23-organization-participant-lifecycle|24-event-context-lifecycle|25-organization-dual-assignment-isolation|26-event-assessment-matrix)\.spec\.ts/,
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
            testMatch: /.*(?:3-dashboard|17-authenticated-route-health)\.spec\.ts/,
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
            testMatch: /.*(?:6-tka-smp-full|8-tka-smp-mini|9-tka-smp-monetization|13-tka-diagnostic)\.spec\.ts/,
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
    ...(adminStagingE2EEnabled
      ? [
          {
            name: 'admin-setup',
            testMatch: /.*admin\.setup\.ts/,
            teardown: 'admin-cleanup',
          },
          {
            name: 'chromium-admin-staging',
            testMatch: /.*(?:10-admin-workspace-authenticated|27-admin-task-flows|28-admin-canonical-routes|29-admin-performance)\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: 'playwright/.auth/admin-user.json',
              ...(vercelAutomationBypass
                ? {
                    extraHTTPHeaders: {
                      'x-vercel-protection-bypass': vercelAutomationBypass,
                      'x-vercel-set-bypass-cookie': 'true',
                    },
                  }
                : {}),
            },
            dependencies: ['admin-setup'],
          },
          {
            /**
             * Alur peran. Project terpisah karena spec ini login sendiri sebagai
             * beberapa peran berbeda, jadi ia HARUS mulai tanpa sesi tersimpan —
             * memakai storageState admin akan membuat `goto('/login')` langsung
             * teralih ke dashboard dan login berikutnya tidak pernah terjadi.
             *
             * Tidak bergantung pada `admin-setup`: helper CI sudah dijalankan gate
             * sebelum app dinyalakan, dan setiap test memprovisikan usernya sendiri
             * lalu membersihkannya di `finally`.
             */
            name: 'chromium-admin-roles',
            testMatch: /.*(?:19-admin-role-navigation|20-instansi-join|21-instansi-exam|22-landing-authenticated)\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: { cookies: [], origins: [] },
              ...(vercelAutomationBypass
                ? {
                    extraHTTPHeaders: {
                      'x-vercel-protection-bypass': vercelAutomationBypass,
                      'x-vercel-set-bypass-cookie': 'true',
                    },
                  }
                : {}),
            },
          },
          {
            name: 'admin-cleanup',
            testMatch: /.*admin\.cleanup\.ts/,
          },
        ]
      : []),
  ],
  ...(remoteE2EEnabled
    ? {}
    : {
        webServer: {
          command: 'npm run start',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }),
});
