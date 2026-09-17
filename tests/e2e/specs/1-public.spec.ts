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
    await expect(page.getByRole('heading', { name: /Jangan cuma tahu skormu/i })).toBeVisible();
    await expect(homePage.cpnsCard).toBeVisible();
    await expect(homePage.tkaCard).toBeVisible();
  });

  test('entry login dari root mempertahankan returnTo root', async ({ page }) => {
    await expect(homePage.loginLink).toHaveAttribute('href', '/login?returnTo=%2F');
    await homePage.loginLink.click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
    await expect(page.getByRole('link', { name: /Kembali/i })).toHaveAttribute('href', '/');
  });

  test('TKA public memperkenalkan pilihan jenjang SD SMP SMA', async ({ page }) => {
    await page.goto('/tka');
    await expect(page.getByRole('heading', { name: /Persiapan TKA untuk setiap jenjang belajar/i })).toBeVisible();
    await expect(page.getByText('TKA SD', { exact: true })).toBeVisible();
    await expect(page.getByText('TKA SMP', { exact: true })).toBeVisible();
    await expect(page.getByText('TKA SMA', { exact: true })).toBeVisible();

    const registrationEntry = page.getByRole('link', { name: /Mulai persiapan TKA/i });
    await expect(registrationEntry).toHaveAttribute('href', '/register?returnTo=%2Ftka');
    // Kebijakan 2026-09-17: ketiga jenjang TKA aktif, jadi tidak ada lagi kartu "coming soon".
    await expect(page.getByRole('link', { name: /TKA SD.*Buka jenjang/i })).toHaveAttribute('href', '/tka/sd');
    await expect(page.getByRole('link', { name: /TKA SMP.*Buka jenjang/i })).toHaveAttribute('href', '/tka/smp');
    await expect(page.getByRole('link', { name: /TKA SMA.*Buka jenjang/i })).toHaveAttribute('href', '/tka/sma');
    await expect(page.getByText('Segera hadir', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Belum tersedia', { exact: true })).toHaveCount(0);
  });

  test('menampilkan halaman 404 jika URL tidak valid', async ({ page }) => {
    const response = await page.goto('/url-tidak-ada-12345');
    expect(response?.status()).toBe(404);
    await expect(page.locator('text=/not found|tidak ditemukan|404/i').first()).toBeVisible();
  });
});
