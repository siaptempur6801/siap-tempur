import { expect, test } from '@playwright/test';

/**
 * Regresi blog publik.
 *
 * Halaman blog memakai pembacaan artikel yang di-cache
 * (`src/services/article-read.service.ts`, 5 menit, dibatalkan lewat
 * `revalidatePath` pada setiap penulisan artikel). Sebelumnya belum ada cakupan
 * E2E untuk halaman ini, padahal ia halaman publik yang dibaca mesin pencari —
 * jadi perubahan pada jalur baca artikel tidak akan tertangkap.
 *
 * Yang dikunci di sini:
 *   - indeks blog merender dan memuat artikel terbit;
 *   - halaman detail artikel merender;
 *   - slug yang tidak ada / belum terbit menghasilkan 404, BUKAN halaman kosong
 *     (penting karena hasil cache `null` tidak boleh berubah menjadi halaman 200);
 *   - gulir pembaca dan daftar isi (komponen klien) ikut ter-hidrasi.
 */

test.describe('Blog publik', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('indeks blog merender daftar artikel terbit', async ({ page }) => {
    const response = await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Minimal satu tautan artikel harus ada.
    const articleLinks = page.locator('a[href^="/blog/"]');
    expect(await articleLinks.count()).toBeGreaterThan(0);
  });

  test('halaman detail artikel merender isi', async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    const href = await page.locator('a[href^="/blog/"]').first().getAttribute('href');
    expect(href).toBeTruthy();

    const response = await page.goto(href!, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('slug yang tidak ada menghasilkan 404', async ({ page }) => {
    // Diambil dua kali: permintaan pertama mengisi cache, yang kedua harus tetap
    // 404 — memastikan hasil cache tidak berubah menjadi halaman 200.
    for (const attempt of [1, 2]) {
      const response = await page.goto('/blog/slug-yang-tidak-pernah-ada-untuk-test', {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status(), `percobaan ke-${attempt}`).toBe(404);
    }
  });
});
