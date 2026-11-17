import { expect, test } from '@playwright/test'

test.describe('Admin Workspace canonical routing', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('legacy tab route resolves to canonical Product workspace before authentication', async ({
    page,
  }) => {
    await page.goto('/cpns/admin?tab=products&program=TKA&track=SMP')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcommerce%2Fproducts$/)
    // Kebijakan: tautan "Kembali" hanya menuju halaman publik. `returnTo` di sini butuh login
    // (admin), jadi Kembali diarahkan ke beranda supaya pengguna tidak terpantul balik ke login.
    await expect(page.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/')
  })

  test('legacy assessment routes resolve to canonical modules', async ({ page }) => {
    await page.goto('/cpns/admin/tryout-config')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fassessments$/)

    await page.goto('/cpns/admin/event')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fevents$/)
  })

  test('legacy content routes stay inside canonical Admin Workspace', async ({ page }) => {
    await page.goto('/cpns/admin/create')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Fquestions%2Fnew$/)

    await page.goto('/cpns/admin/articles/create')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Farticles%2Fnew$/)
  })

  /**
   * Penutup pemindahan modul admin 2026-09-18.
   *
   * Empat halaman dulu tinggal di `app/cpns/admin/**` dan dipakai sebagai modul
   * oleh delegator di `app/admin/content/**`. Setelah pohon legacy dihapus,
   * keempatnya adalah page nyata di pohon kanonik. Test ini berjalan TANPA
   * kredensial admin, jadi tetap menjadi jaring pengaman bila gate staging
   * sedang tidak bisa dijalankan.
   */
  test('every removed legacy path redirects instead of 404', async ({ page }) => {
    const legacyPaths = [
      '/cpns/admin',
      '/cpns/admin/review',
      '/cpns/admin/articles',
      '/cpns/admin/articles/create',
      '/cpns/admin/create',
      '/cpns/admin/event',
      '/cpns/admin/tryout-akbar',
      '/cpns/admin/tryout-config',
      '/cpns/admin/keuangan',
      '/cpns/admin/voucher',
      '/cpns/admin/export',
    ]

    for (const path of legacyPaths) {
      // `page.goto` mengembalikan response AKHIR setelah redirect diikuti,
      // jadi yang diperiksa adalah bahwa rute ini tidak berakhir di 404 dan
      // mendarat di dalam workspace kanonik. Tanpa login, halaman admin
      // meneruskan ke /login?returnTo=/admin...
      const response = await page.goto(path)
      expect(response?.status(), `${path} tidak boleh 404`).not.toBe(404)
      await expect(page, `${path} harus mendarat di /admin`).toHaveURL(/\/login\?returnTo=%2Fadmin/)
    }
  })

  test('legacy tab routes for content and review resolve canonically', async ({ page }) => {
    await page.goto('/cpns/admin?tab=review')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Freview$/)

    await page.goto('/cpns/admin?tab=articles')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Farticles$/)

    await page.goto('/cpns/admin?tab=questions')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Fquestions$/)
  })

  test('legacy tab for TKA context resolves to the TKA-relevant canonical module', async ({
    page,
  }) => {
    // Konteks program/track TIDAK ikut ke `returnTo` karena layout admin hanya
    // membawa pathname. Yang penting di sini: tab-nya tetap dipetakan ke modul
    // kanonik yang benar, bukan jatuh ke root admin.
    await page.goto('/cpns/admin?tab=exams&program=TKA&track=SMP')
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fassessments$/)
  })
})
