import { test, expect } from '@playwright/test'

test.describe('Dashboard Flow', () => {
  // Dalam pengujian nyata, kita menggunakan global setup untuk melewati login screen (menyimpan cookies session)
  // Untuk kerangka ini, kita mengasumsikan test dijalankan dengan state terotentikasi.

  test.beforeEach(async ({ page }) => {
    // Kita arahkan ke dashboard
    await page.goto('/cpns/dashboard')
  })

  test('menampilkan profil dan statistik ujian', async ({ page }) => {
    // Dashboard siap dirender dengan data user.
    await expect(page.getByTestId('cpns-dashboard-ready')).toBeVisible()

    // Locator berbasis href, bukan label: label navigasi berubah ("Riwayat" -> "Hasil")
    // dan sebelumnya membuat test ini gagal padahal produknya benar.
    await expect(page.locator('a[href="/cpns/dashboard/profile"]').first()).toBeVisible()
    await expect(page.locator('a[href="/cpns/dashboard/tryout"]').first()).toBeVisible()
    await expect(page.locator('a[href="/cpns/dashboard/riwayat"]').first()).toBeVisible()
  })

  test('alur Beli Paket memuat paket yang tersedia', async ({ page }) => {
    await page.goto('/cpns/dashboard/beli-paket')
    await expect(page.getByRole('heading', { name: /Beli Paket/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Pilih|Ambil/i }).first()).toBeVisible()
  })
})
