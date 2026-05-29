import { test, expect } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  // Dalam pengujian nyata, kita menggunakan global setup untuk melewati login screen (menyimpan cookies session)
  // Untuk kerangka ini, kita mengasumsikan test dijalankan dengan state terotentikasi.

  test.beforeEach(async ({ page }) => {
    // Kita arahkan ke dashboard
    await page.goto('/cpns/dashboard');
  });

  test('menampilkan profil dan statistik ujian', async ({ page }) => {
    // Verifikasi ada link ke profil dan menu latihan
    await expect(page.getByRole('link', { name: /Profil/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Tryout/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Riwayat/i }).first()).toBeVisible();
  });

  test('alur Beli Paket memuat paket yang tersedia', async ({ page }) => {
    await page.goto('/cpns/dashboard/beli-paket');
    await expect(page.getByRole('heading', { name: /Beli Paket/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Pilih|Ambil/i }).first()).toBeVisible();
  });
});
