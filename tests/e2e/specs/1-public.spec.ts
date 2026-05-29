import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Public Pages Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('harus memuat halaman utama dengan benar', async ({ page }) => {
    // Memverifikasi navigasi sukses
    await expect(page).toHaveTitle(/Siap Tempur|CPNS/i);
  });

  test('harus memiliki tautan aktif ke Login/Register', async ({ page }) => {
    await expect(homePage.getStartedButton).toBeVisible();
    await homePage.getStartedButton.click();
    await expect(page).toHaveURL(/login/);
  });

  test('harus menampilkan halaman 404 jika URL tidak valid', async ({ page }) => {
    const response = await page.goto('/url-tidak-ada-12345');
    // Next.js App Router 404 akan berstatus 404
    expect(response?.status()).toBe(404);
    await expect(page.locator('text=/not found|tidak ditemukan|404/i').first()).toBeVisible();
  });
});
