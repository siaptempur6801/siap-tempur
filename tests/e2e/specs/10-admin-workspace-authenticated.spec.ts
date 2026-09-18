import { expect, test, type Page } from '@playwright/test'

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  expect(overflow).toBe(false)
}

async function expectAdminModule(page: Page, path: string, heading: string) {
  await page.goto(`${path}?program=CPNS&track=SKD`)
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`))
  await expect(page.locator('main h1')).toHaveText(heading)
  await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
}

test.describe('Authenticated Admin Workspace closure', () => {
  test.setTimeout(120_000)

  test('ADMIN can load canonical dashboard and every core module', async ({ page }) => {
    await page.goto('/admin?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Dashboard')
    await expect(page.getByText('ADMIN', { exact: true }).first()).toBeVisible()

    const contextSelects = page.getByRole('banner').locator('select')
    await expect(contextSelects.nth(0)).toHaveValue('CPNS')
    await expect(contextSelects.nth(1)).toHaveValue('SKD')
    await expectNoHorizontalOverflow(page)

    await expectAdminModule(page, '/admin/content/questions', 'Question Bank')
    await expectAdminModule(page, '/admin/content/articles', 'Articles')
    await expectAdminModule(page, '/admin/assessment/exams', 'Exams')
    await expectAdminModule(page, '/admin/assessment/events', 'Events')
    await expectAdminModule(page, '/admin/commerce/products', 'Products')
    await expectAdminModule(page, '/admin/commerce', 'Orders & Payments')
  })

  test('Exam modal exposes canonical Drill subject → knowledge-node contract', async ({ page }) => {
    await page.goto('/admin/assessment/exams?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Exams')

    await page.getByRole('button', { name: 'Buat exam', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Buat exam', exact: true })).toBeVisible()

    const examType = dialog.locator('select[name="exam_type_code"]')
    await examType.selectOption('DRILL')
    await expect(dialog.getByText('Drill = pendalaman submateri', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Subtes', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Submateri / Knowledge Node', { exact: true })).toBeVisible()
    await expect(dialog.locator('select[name="subject_code"]')).toBeVisible()
    await expect(dialog.locator('select[name="knowledge_node_id"]')).toBeVisible()
    await expect(dialog.locator('input[name="question_count"]')).toBeVisible()

    await page.getByRole('button', { name: 'Tutup modal' }).click()
    await expect(dialog).not.toBeVisible()
  })

  test('Program/Track selector supports TKA SMP context without duplicate page selectors', async ({ page }) => {
    await page.goto('/admin?program=TKA&track=SMP')
    await expect(page.locator('main h1')).toHaveText('Dashboard')

    const headerSelects = page.getByRole('banner').locator('select')
    await expect(headerSelects.nth(0)).toHaveValue('TKA')
    await expect(headerSelects.nth(1)).toHaveValue('SMP')
    await expect(page.locator('main select')).toHaveCount(0)
  })

  test('legacy CPNS admin routes resolve inside canonical Admin Workspace when authenticated', async ({ page }) => {
    await page.goto('/cpns/admin?tab=products&program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/commerce\/products/)
    await expect(page.locator('main h1')).toHaveText('Products')

    await page.goto('/cpns/admin/tryout-config')
    await expect(page).toHaveURL(/\/admin\/assessment\/exams/)
    await expect(page.locator('main h1')).toHaveText('Exams')

    await page.goto('/cpns/admin/event')
    await expect(page).toHaveURL(/\/admin\/assessment\/events/)
    await expect(page.locator('main h1')).toHaveText('Events')
  })

  test('Admin Workspace remains usable on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Dashboard')
    await expect(page.getByLabel('Buka menu')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByLabel('Buka menu').click()
    await expect(page.getByRole('link', { name: 'Question Bank', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Exams', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Products', exact: true })).toBeVisible()
    await page.getByLabel('Tutup menu').last().click()

    await page.goto('/admin/assessment/exams?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Exams')
    await expectNoHorizontalOverflow(page)
  })
})

/**
 * Penutup untuk pemindahan modul admin 2026-09-18.
 *
 * Empat halaman ini dulu tinggal di `app/cpns/admin/**` dan dipakai sebagai modul
 * oleh delegator di `app/admin/content/**` (`import X from
 * '@/app/cpns/admin/review/page'`). Setelah pohon legacy dihapus, keempatnya
 * adalah page nyata di pohon kanonik.
 *
 * Inti test ini adalah integritas otorisasi: halaman-halaman itu DULU dilindungi
 * `app/cpns/admin/layout.tsx`, yang kini tidak ada. Yang harus terbukti adalah
 * `app/admin/layout.tsx` mengambil alih sepenuhnya — dan halaman tetap merender
 * untuk pemegang ADMIN_ACCESS.
 */
test.describe('Admin content modules after legacy tree removal', () => {
  test.setTimeout(120_000)

  test('reviewer workspace renders at its canonical route', async ({ page }) => {
    await page.goto('/admin/content/review?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.locator('main h1')).toHaveText('Reviewer Workspace')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)
  })

  test('articles list renders and links into the article editor', async ({ page }) => {
    await page.goto('/admin/content/articles?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/articles/)
    await expect(page.locator('main h1')).toHaveText('Articles')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)

    // Halaman listing tidak boleh kosong karena error. Kalau ada artikel, salah
    // satunya harus menautkan ke editor; kalau tidak ada, harus tampil empty state
    // yang jujur — bukan halaman kosong tanpa penjelasan.
    const editLinks = page.getByRole('link', { name: 'Edit', exact: true })
    if (await editLinks.count() === 0) {
      await expect(page.getByText('Belum ada artikel', { exact: true })).toBeVisible()
    } else {
      await editLinks.first().click()
      await expect(page).toHaveURL(/\/admin\/content\/articles\/[^/]+\/edit/)
      await expect(page.locator('main h1')).toHaveText('Edit Artikel')
    }
  })

  test('article create page renders at its canonical route', async ({ page }) => {
    await page.goto('/admin/content/articles/create?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/articles\/create/)
    await expect(page.locator('main h1')).toHaveText('Buat Artikel Baru')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
  })

  test('every moved module is reachable through the admin sidebar', async ({ page }) => {
    // Membuktikan navigasi internal tidak menunjuk rute yang sudah dihapus.
    await page.goto('/admin?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Dashboard')

    await page.getByRole('link', { name: 'Review Queue', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.locator('main h1')).toHaveText('Reviewer Workspace')

    await page.getByRole('link', { name: 'Articles', exact: true }).first().click()
    await expect(page).toHaveURL(/\/admin\/content\/articles/)
    await expect(page.locator('main h1')).toHaveText('Articles')
  })

  test('no legacy admin route returns 404 after the tree removal', async ({ page }) => {
    // `/cpns/admin/export` tidak pernah ada di peta redirect proxy — ia satu-satunya
    // rute legacy yang benar-benar dirender lalu redirect sendiri. Sekarang harus
    // mengalir lewat next.config.ts seperti rute legacy lain.
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
      const response = await page.goto(path)
      expect(response?.status(), `${path} harus redirect, bukan 404`).not.toBe(404)
      await expect(page, `${path} harus mendarat di dalam /admin`).toHaveURL(/\/admin(\/|\?|$)/)
    }
  })
})
