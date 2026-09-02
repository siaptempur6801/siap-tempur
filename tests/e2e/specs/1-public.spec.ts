import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Public Pages Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    await homePage.goto();
  });

  test('memuat landing utama multi-program', async ({ page }) => {
    await expect(page).toHaveTitle(/SiapTempur.*CPNS.*TKA|SiapTempur/i);
    await expect(page.getByRole('heading', { name: /Jangan cuma banyak latihan.*Tahu apa yang harus diperbaiki/i })).toBeVisible();
    await expect(homePage.cpnsCard).toBeVisible();
    await expect(homePage.tkaCard).toBeVisible();
  });

  test('entry login dari root mempertahankan returnTo root', async ({ page }) => {
    await expect(homePage.loginLink).toHaveAttribute('href', '/login?returnTo=%2F');
    await homePage.loginLink.click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
    await expect(page.getByRole('link', { name: /Kembali/i })).toHaveAttribute('href', '/');
  });

  test('TKA public memperkenalkan satu dashboard SD SMP SMA dengan SMP tersedia', async ({ page }) => {
    await page.goto('/tka');
    await expect(page.getByRole('heading', { name: /Satu dashboard untuk perjalanan TKA dari SD sampai SMA/i })).toBeVisible();
    await expect(page.getByText('TKA SD', { exact: true })).toBeVisible();
    await expect(page.getByText('TKA SMP', { exact: true })).toBeVisible();
    await expect(page.getByText('TKA SMA', { exact: true })).toBeVisible();

    const dashboardEntry = page.getByRole('link', { name: /Masuk ke Dashboard TKA/i });
    await expect(dashboardEntry).toHaveAttribute('href', '/login?returnTo=%2Ftka');
    await expect(page.getByRole('link', { name: 'Lihat TKA SMP', exact: true })).toHaveAttribute('href', '/tka/smp');
    await expect(page.getByText('Segera hadir', { exact: true })).toHaveCount(2);
    await expect(page.getByText('Tersedia', { exact: true })).toBeVisible();
  });

  test('menampilkan halaman 404 jika URL tidak valid', async ({ page }) => {
    const response = await page.goto('/url-tidak-ada-12345');
    expect(response?.status()).toBe(404);
    await expect(page.locator('text=/not found|tidak ditemukan|404/i').first()).toBeVisible();
  });
});
