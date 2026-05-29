import { test, expect } from '@playwright/test';

test.describe('Role Permission Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // Dalam tes otentikasi sungguhan, kita login sebagai guest lalu mencoba mengakses rute terproteksi

  test('Guest tidak bisa mengakses rute Admin', async ({ page }) => {
    // Navigasi ke halaman admin tanpa token auth
    await page.goto('/cpns/admin');
    
    // Harus dialihkan ke login
    await expect(page).toHaveURL(/login/);
  });

  test('Guest tidak bisa mengakses Dashboard Reguler', async ({ page }) => {
    // Navigasi ke halaman dashboard tanpa auth
    await page.goto('/cpns/dashboard');
    
    // Harus dialihkan ke login dengan parameter '?next='
    await expect(page).toHaveURL(/login/);
  });

  // Jika kita login sebagai reguler user:
  // test('User Reguler tidak bisa mengakses rute Admin', async ({ page }) => {
  //   await loginAsRegularUser(page);
  //   const response = await page.goto('/cpns/admin');
  //   expect(response?.status()).toBe(403);
  //   await expect(page.locator('text=/Unauthorized|Akses Ditolak/i')).toBeVisible();
  // });
});
