import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Kesehatan console browser pada halaman publik.
 *
 * Objective "staging-ready" mensyaratkan console browser bersih dari critical
 * error. Test ini fokus pada kelas error yang benar-benar merusak pengalaman:
 * uncaught exception, hydration mismatch, dan React error. Error jaringan pihak
 * ketiga (mis. script pembayaran) sengaja tidak digagalkan di sini karena bukan
 * bagian dari halaman publik dan tidak deterministik di CI.
 */
const CRITICAL_PATTERNS = [
  /hydration/i,
  /minified react error/i,
  /text content does not match/i,
  /server rendered html/i,
  /uncaught/i,
  /is not a function/i,
  /cannot read propert/i,
];

const PUBLIC_ROUTES = [
  '/',
  '/cpns',
  '/tka',
  '/login',
  '/register',
  '/forgot-password',
  '/blog',
  '/event',
  '/syarat-ketentuan',
  '/kebijakan-privasi',
  '/kebijakan-pengembalian',
  '/halaman-tidak-ada-untuk-test-console',
];

function collectConsole(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  return { consoleErrors, pageErrors };
}

test.describe('Console health halaman publik', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const route of PUBLIC_ROUTES) {
    test(`tidak ada critical console error di ${route}`, async ({ page }) => {
      const { consoleErrors, pageErrors } = collectConsole(page);

      const response = await page.goto(route, { waitUntil: 'networkidle' });

      // Halaman harus benar-benar termuat (bukan 5xx).
      expect(response?.status() ?? 0).toBeLessThan(500);
      // Beri kesempatan hydration & efek sisi client berjalan.
      await page.waitForTimeout(400);

      const criticalConsoleErrors = consoleErrors.filter((text) =>
        CRITICAL_PATTERNS.some((pattern) => pattern.test(text)),
      );

      expect(criticalConsoleErrors, `console error kritis di ${route}`).toEqual([]);
      expect(pageErrors, `uncaught exception di ${route}`).toEqual([]);
    });
  }
});
