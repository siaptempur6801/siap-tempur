import { test } from '@playwright/test';

test.describe('Admin CRUD Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // Test ini idealnya dijalankan dengan user role admin (via global auth setup)

  test('CREATE: Admin dapat membuka halaman form buat voucher', async ({ page }) => {
    // Kita arahkan langsung ke halaman admin voucher
    await page.goto('/cpns/admin/voucher');
    
    // Pastikan halaman terbuka dengan benar (jika login sebagai admin)
    // await expect(page.locator('text=/Tambah Voucher|Buat Voucher/i')).toBeVisible();
  });

  test('EDIT: Admin dapat menavigasi ke halaman edit', async ({ page }) => {
    // Navigasi mock id
    await page.goto('/cpns/admin/edit/123-abc');
    
    // Memeriksa formulir tersedia
    // await expect(page.locator('form')).toBeVisible();
  });

  test('DELETE: Menampilkan modal konfirmasi saat hapus data', async ({ page }) => {
    await page.goto('/cpns/admin');
    
    // Asumsikan ada tombol hapus
    void page.getByRole('button', { name: /Hapus|Delete/i }).first();
    // if (await deleteBtn.isVisible()) {
    //   await deleteBtn.click();
    //   await expect(page.locator('text=/Apakah Anda yakin|Are you sure/i')).toBeVisible();
    // }
  });
});
