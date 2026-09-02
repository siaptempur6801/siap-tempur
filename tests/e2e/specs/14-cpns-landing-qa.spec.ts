import { test, expect } from '@playwright/test';

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

test.describe('CPNS landing release QA', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('CTA publik mengarah ke flow yang benar', async ({ page }) => {
    await page.goto('/cpns');

    await expect(page.getByRole('heading', { level: 1, name: /Bukan cuma latihan SKD.*Tahu bagian mana yang harus kamu kejar/i })).toBeVisible();

    await expect(page.getByRole('link', { name: /Mulai belajar CPNS/i }).first()).toHaveAttribute(
      'href',
      '/login?returnTo=/cpns/dashboard',
    );
    await expect(page.getByRole('link', { name: 'Mulai Drill', exact: true }).first()).toHaveAttribute(
      'href',
      '/login?returnTo=/cpns/dashboard/drilling-materi',
    );
    await expect(page.getByRole('link', { name: 'Lihat Mini Tryout', exact: true }).first()).toHaveAttribute(
      'href',
      '/login?returnTo=/cpns/dashboard/mini-tryout',
    );
    await expect(page.getByRole('link', { name: 'Lihat Full Tryout', exact: true }).first()).toHaveAttribute(
      'href',
      '/cpns/full-tryout',
    );
    await expect(page.getByRole('link', { name: /Lihat paket token/i }).first()).toHaveAttribute(
      'href',
      '/login?returnTo=/cpns/dashboard/beli-paket',
    );
  });

  test('mobile menu, anchor navigation, dan sticky CTA bekerja tanpa menutupi final CTA', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/cpns');

    const menuButton = page.getByRole('button', { name: 'Buka menu CPNS' });
    await expect(menuButton).toBeVisible();

    const menuButtonBox = await menuButton.boundingBox();
    expect(menuButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(menuButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await menuButton.click();
    await expect(page.getByTestId('cpns-mobile-menu')).toBeVisible();
    await page.getByTestId('cpns-mobile-menu').getByRole('link', { name: 'Peta SKD', exact: true }).click();
    await expect(page).toHaveURL(/#peta-skd$/);
    await expect(page.getByTestId('cpns-mobile-menu')).toHaveCount(0);

    await page.locator('#peta-skd').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('cpns-mobile-sticky-cta')).toBeVisible();

    const stickyStart = page.getByTestId('cpns-mobile-sticky-cta').getByRole('link', { name: /Mulai/i });
    await expect(stickyStart).toHaveAttribute('href', '/login?returnTo=/cpns/dashboard');

    await page.locator('#final-cta').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('cpns-mobile-sticky-cta')).toHaveCount(0);
  });

  test('tidak ada horizontal overflow pada viewport release target', async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/cpns');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(
        dimensions.scrollWidth,
        `horizontal overflow pada viewport ${viewport.width}x${viewport.height}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  });

  test('landmark, heading, FAQ, dan fokus keyboard dasar tetap aksesibel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/cpns');

    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Navigasi CPNS' })).toBeVisible();

    const firstFaq = page.locator('#faq details').first();
    await firstFaq.locator('summary').focus();
    await expect(firstFaq.locator('summary')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(firstFaq).toHaveAttribute('open', '');

    const primaryCta = page.getByRole('link', { name: /Mulai belajar CPNS/i }).first();
    const primaryBox = await primaryCta.boundingBox();
    expect(primaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
