import { defineConfig, devices } from '@playwright/test'

const remoteE2EEnabled = process.env.E2E_REMOTE_BASE_URL === '1'
const vercelAutomationBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const protectedPreviewHeaders = vercelAutomationBypass
  ? {
      'x-vercel-protection-bypass': vercelAutomationBypass,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-cpns' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    ...(protectedPreviewHeaders ? { extraHTTPHeaders: protectedPreviewHeaders } : {}),
  },
  projects: [
    {
      name: 'cpns-setup',
      testMatch: /.*cpns\.setup\.ts/,
      teardown: 'cpns-cleanup',
    },
    {
      name: 'chromium-cpns-rc',
      testMatch: /.*11-cpns-rc\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/cpns-user.json',
      },
      dependencies: ['cpns-setup'],
    },
    {
      name: 'cpns-cleanup',
      testMatch: /.*cpns\.cleanup\.ts/,
    },
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
})
