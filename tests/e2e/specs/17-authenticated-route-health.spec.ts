import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

/**
 * Smoke test route ber-autentikasi.
 *
 * Menjaga agar seluruh route utama CPNS & TKA tetap merender halaman nyata:
 * bukan 5xx, selalu punya <main>, tidak kosong, dan tidak memunculkan critical
 * console error (uncaught exception / hydration mismatch / React error).
 *
 * Hanya berjalan pada project `chromium-authenticated`, yang aktif ketika
 * E2E_PARTICIPANT_EMAIL & E2E_PARTICIPANT_PASSWORD diisi (lihat playwright.config.ts).
 */

const CRITICAL_PATTERNS = [
  /hydration/i,
  /minified react error/i,
  /uncaught/i,
  /is not a function/i,
  /cannot read propert/i,
];

/** Route yang harus berakhir di path yang sama. */
const STABLE_ROUTES = [
  '/cpns/dashboard',
  '/cpns/dashboard/materi',
  '/cpns/dashboard/belajar-materi',
  '/cpns/dashboard/drilling-materi',
  '/cpns/dashboard/mini-tryout',
  '/cpns/dashboard/tryout',
  '/cpns/dashboard/riwayat',
  '/cpns/dashboard/ranking',
  '/cpns/dashboard/profile',
  '/cpns/dashboard/beli-paket',
  '/cpns/dashboard/event',
  '/cpns/dashboard/pilih-jalur',
  '/tka/smp',
  '/tka/smp/progress',
  '/tka/smp/riwayat',
  '/tka/smp/pass',
  '/tka/smp/wrong-questions',
  '/tka/smp/focus',
  '/tka/smp/pilih-jalur',
  '/tka/smp/profile',
  '/tka/smp/mini-tryout',
  '/tka/smp/tryout',
  '/tka/smp/diagnostic',
  '/tka/sd',
  '/tka/sma',
];

/** Redirect yang memang disengaja oleh produk. */
const INTENTIONAL_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: '/tka', to: '/tka/smp' },
  { from: '/tka/smp/beli-token', to: '/tka/smp/pass' },
];

function collectCriticalErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test.describe('Route ber-autentikasi tetap sehat', () => {
  for (const route of STABLE_ROUTES) {
    test(`${route} merender halaman nyata`, async ({ page }) => {
      const errors = collectCriticalErrors(page);

      const response = await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForTimeout(200);

      expect(response?.status() ?? 0, `status HTTP ${route}`).toBeLessThan(500);
      expect(new URL(page.url()).pathname, `redirect tak terduga dari ${route}`).toBe(route);
      await expect(page.locator('main, [role="main"]').first(), `tanpa <main> di ${route}`).toBeVisible();

      const textLength = (await page.locator('body').innerText()).trim().length;
      expect(textLength, `halaman ${route} terlalu kosong`).toBeGreaterThan(200);

      const critical = errors.filter((text) => CRITICAL_PATTERNS.some((pattern) => pattern.test(text)));
      expect(critical, `critical console error di ${route}`).toEqual([]);
    });
  }

  for (const { from, to } of INTENTIONAL_REDIRECTS) {
    test(`${from} diarahkan ke ${to}`, async ({ page }) => {
      await page.goto(from, { waitUntil: 'networkidle' });
      expect(new URL(page.url()).pathname).toBe(to);
      await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    });
  }
});
