import { adminUrlState } from '../admin-workflow'
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
    // Label peran kini dibaca manusia ("Admin"), bukan kode mentah ("ADMIN").
    await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible()

    const contextSelects = page.getByRole('banner').locator('select')
    await expect(contextSelects.nth(0)).toHaveValue('CPNS')
    await expect(contextSelects.nth(1)).toHaveValue('SKD')
    await expectNoHorizontalOverflow(page)

    await expectAdminModule(page, '/admin/content/questions', 'Question Bank')
    await expectAdminModule(page, '/admin/content/articles', 'Articles')
    await expectAdminModule(page, '/admin/assessments', 'Assessment')
    await expectAdminModule(page, '/admin/events', 'Event')
    await expectAdminModule(page, '/admin/commerce/products', 'Products')
    await expectAdminModule(page, '/admin/commerce/orders', 'Orders')
    // Modul People & Insights: sebelumnya `user.read`, `user.manage`,
    // `role.manage`, `report.read`, dan `audit.read` tidak punya halaman sama
    // sekali, sehingga SUPPORT dan SCHOOL_ADMIN tidak punya tempat mendarat.
    await expectAdminModule(page, '/admin/monitoring/reports', 'Reports')
    await expectAdminModule(page, '/admin/settings/audit', 'Audit Log')
    // `entitlement.manage` dan `settings.manage`: produksi memegang 426 dompet
    // token dan katalog 40 fitur, keduanya sebelumnya hanya bisa lewat SQL.
    await expectAdminModule(page, '/admin/users/access', 'Entitlements')
    await expectAdminModule(page, '/admin/settings', 'Settings')
    // MVP CPNS Instansi Managed Service §6.1-6.2.
    await expectAdminModule(page, '/admin/organizations', 'Instansi')
  })

  test('ADMIN dapat membuka Instansi', async ({ page }) => {
    await page.goto('/admin/organizations')
    await expect(page.locator('main h1')).toHaveText('Instansi')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Daftar instansi', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Instansi baru', exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // Form instansi baru harus memuat semua kolom yang PRD §6.1 minta,
    // termasuk kontak PIC yang sebelumnya tidak punya kolom sama sekali.
    await page.getByRole('link', { name: 'Instansi baru', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Instansi baru', exact: true })).toBeVisible()
    for (const label of ['Nama instansi', 'Kode', 'Jenis', 'Status', 'Kota', 'Provinsi', 'Alamat', 'Nama PIC', 'Telepon PIC', 'Email PIC', 'Catatan']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expectNoHorizontalOverflow(page)
  })

  test('Event page keeps assessment context across refresh and Back', async ({ page }) => {
    await page.goto('/admin/assessments?program=CPNS&track=SKD')
    const row = page.locator('tr[data-assessment-id]').filter({hasText:'Siap'}).first()
    await row.getByRole('link',{name:'Lihat',exact:true}).click()
    await page.getByRole('navigation',{name:'Bagian workspace'}).getByRole('link',{name:'Distribusi',exact:true}).click()
    await page.waitForURL(/\/distribution(?:\?|$)/)
    const assessmentUrl = page.url()
    const assessmentId = adminUrlState(assessmentUrl).get('assessment')
    await page.getByRole('link',{name:'Buat Event',exact:true}).click()
    await expect(page.locator('input[name="next_exam_id"]')).toHaveValue(assessmentId!)
    const form = page.locator('form').filter({has: page.locator('input[name="code"]')})
    await form.getByRole('button',{name:'Lanjut',exact:true}).click()
    await expect(form.getByRole('alert')).toHaveText('Nama dan kode event wajib diisi.')
    await form.locator('[name="title"]').fill('Event konteks E2E')
    await form.locator('[name="code"]').fill('E2E-CONTEXT')
    await form.getByRole('button',{name:'Lanjut',exact:true}).click()
    const assessmentSelector = form.getByRole('group',{name:'Pilih assessment'})
    await expect(assessmentSelector).toBeVisible()
    await expect(assessmentSelector.getByRole('combobox',{name:'Program'})).toBeVisible()
    await expect(form.locator('input[name="next_exam_id"]')).toHaveValue(assessmentId!)
    await expect(form.getByRole('group',{name:'Pendaftaran',exact:true})).toBeVisible()
    const eventCapacity = form.locator('input[name="capacity"]')
    await expect(eventCapacity).toBeVisible()
    await eventCapacity.fill('250')
    await form.getByRole('button',{name:'Lanjut',exact:true}).click()
    await expect(form.getByRole('group',{name:'Jadwal event',exact:true})).toBeVisible()
    await expect(eventCapacity).toHaveValue('250')
    await form.getByRole('button',{name:'Lanjut',exact:true}).click()
    await form.getByRole('button',{name:'Lanjut',exact:true}).click()
    await expect(form.getByRole('alert')).toHaveText('Waktu mulai dan selesai wajib diisi.')
    await expect(form.getByRole('group',{name:/Jadwal event/})).toBeVisible()
    await page.reload()
    await expect(page.locator('input[name="next_exam_id"]')).toHaveValue(assessmentId!)
    await page.getByRole('link',{name:'Batal',exact:true}).click()
    await expect(page).toHaveURL(assessmentUrl)
  })

  test('ADMIN dapat membuka Settings dan melihat konfigurasi platform', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page.locator('main h1')).toHaveText('Settings')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
    // Katalog fitur berasal dari database (40 baris di produksi), bukan daftar
    // yang di-hardcode.
    await expect(page.getByRole('heading', { name: 'Katalog fitur', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Template sertifikat', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Periode & track', exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('ADMIN dapat membuka Users dan melihat daftar pengguna', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.locator('main h1')).toHaveText('Users')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
    // Komposisi peran dirender dari database, bukan daftar yang di-hardcode.
    await page.getByRole('navigation',{name:'Users views'}).getByRole('link',{name:'Roles & Permissions',exact:true}).click()
    await expect(page.getByRole('heading',{name:'Admin',exact:true})).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('Assessment page exposes canonical Drill subject → knowledge-node contract', async ({ page }) => {
    await page.goto('/admin/assessments?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Assessment')

    await page.getByRole('link', { name: 'Buat Assessment', exact: true }).first().click()
    const dialog = page.locator('main')
    await expect(dialog.getByRole('heading', { name: 'Buat Assessment', exact: true })).toBeVisible()

    const examType = dialog.locator('select[name="exam_type_code"]')
    await examType.selectOption('DRILL')
    await expect(dialog.getByText('Drill mengambil soal dari satu submateri.', { exact: false })).toBeVisible()
    await expect(dialog.getByRole('combobox', { name: 'Subtes / mata pelajaran', exact: true })).toBeVisible()
    await expect(dialog.getByRole('combobox', { name: 'Submateri', exact: true })).toBeVisible()
    await expect(dialog.locator('select[name="subject_code"]')).toBeVisible()
    await expect(dialog.locator('select[name="knowledge_node_id"]')).toBeVisible()
    await expect(dialog.locator('input[name="question_count"]')).toBeVisible()

    await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Assessment', exact: true }).click()
    await expect(page.locator('input[name="question_count"]')).toHaveCount(0)
  })

  test('Program/Track context appears only in relevant workspaces and survives global navigation', async ({ page }) => {
    await page.goto('/admin?program=TKA&track=SMP')
    await expect(page.locator('main h1')).toHaveText('Dashboard')

    const headerSelects = page.getByRole('banner').locator('select')
    await expect(headerSelects.nth(0)).toHaveValue('TKA')
    await expect(headerSelects.nth(1)).toHaveValue('SMP')
    await expect(page.locator('main select')).toHaveCount(0)

    const sidebar = page.getByRole('navigation', { name: 'Menu admin' })
    await sidebar.getByRole('link', { name: 'Users', exact: true }).click()
    await expect(page.locator('main h1')).toHaveText('Users')
    await expect(page.getByRole('banner').locator('select')).toHaveCount(0)

    await sidebar.getByRole('button', { name: 'Commerce' }).click()
    await sidebar.getByRole('link', { name: 'Orders', exact: true }).click()
    await expect(page.locator('main h1')).toHaveText('Orders')
    await expect(page.getByRole('banner').locator('select')).toHaveCount(0)

    await sidebar.getByRole('link', { name: 'Assessment', exact: true }).click()
    await expect(page.locator('main h1')).toHaveText('Assessment')
    await expect(headerSelects.nth(0)).toHaveValue('TKA')
    await expect(headerSelects.nth(1)).toHaveValue('SMP')
  })

  test('legacy CPNS admin routes resolve inside canonical Admin Workspace when authenticated', async ({ page }) => {
    await page.goto('/cpns/admin?tab=products&program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/commerce\/products/)
    await expect(page.locator('main h1')).toHaveText('Products')

    await page.goto('/cpns/admin/tryout-config')
    await expect(page).toHaveURL(/\/admin\/assessments/)
    await expect(page.locator('main h1')).toHaveText('Assessment')

    await page.goto('/cpns/admin/event')
    await expect(page).toHaveURL(/\/admin\/events/)
    await expect(page.locator('main h1')).toHaveText('Event')
  })

  test('Admin Workspace remains usable on mobile width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Dashboard')
    await expect(page.getByLabel('Buka menu')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByLabel('Buka menu').click()
    // The mobile drawer uses the same navigation model as the desktop sidebar.
    const drawer = page.getByRole('dialog',{name:'Menu admin',exact:true})
    await drawer.getByRole('button',{name:'Content',exact:true}).click()
    await expect(drawer.getByRole('link', { name: 'Question Bank', exact: true })).toBeVisible()
    await expect(drawer.getByRole('link', { name: 'Assessment', exact: true })).toBeVisible()
    await drawer.getByRole('button',{name:'Commerce',exact:true}).click()
    await expect(drawer.getByRole('link', { name: 'Products', exact: true })).toBeVisible()
    await page.getByLabel('Tutup menu').last().click()

    // All workspaces remain reachable from the mobile drawer.
    await page.getByRole('button',{name:'Buka menu',exact:true}).click()
    await expect(drawer.getByRole('button',{name:'Commerce',exact:true})).toHaveAttribute('aria-expanded','false')
    await drawer.getByRole('button',{name:'Commerce',exact:true}).click()
    await expect(drawer.getByRole('link',{name:'Orders',exact:true})).toBeVisible()
    await drawer.getByRole('link',{name:'Settings',exact:true}).click()
    await expect(page.locator('main h1')).toHaveText('Settings')
    await expect(page.getByRole('navigation',{name:'Settings views'}).getByRole('link',{name:'Audit Log',exact:true})).toBeVisible()
    await expect(page.getByRole('dialog',{name:'Menu admin',exact:true})).not.toBeVisible()

    await page.goto('/admin/assessments?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Assessment')
    await expectNoHorizontalOverflow(page)
  })
})

/**
 * Smoke responsif untuk SELURUH permukaan admin.
 *
 * Sebelumnya hanya `/admin` dan `/admin/assessments` yang diperiksa pada
 * 390px, sementara `docs/ADMIN_UI_UX_STANDARD.md` §10 menetapkan mobile 390×844,
 * tablet 1024×768, dan desktop sebagai target minimum untuk halaman kritis — dan
 * §14 menjadikannya syarat Definition of Done. Artinya 14 dari 16 route hanya
 * "diklaim" responsif, tidak pernah diuji.
 *
 * Yang diperiksa: heading benar-benar render (bukan error boundary), tidak ada
 * overflow horizontal tingkat dokumen, dan tidak ada tautan ke halaman login
 * yang bocor ke pengguna yang sudah masuk. Tabel lebar memang boleh ada selama
 * ia hidup di dalam container scroll-nya sendiri (`overflow-x-auto`), karena
 * itulah yang membuat halaman tidak melebar.
 */
const ADMIN_ROUTES: Array<{ path: string; heading: string }> = [
  { path: '/admin', heading: 'Dashboard' },
  { path: '/admin/content/questions', heading: 'Question Bank' },
  { path: '/admin/content/review', heading: 'Review' },
  { path: '/admin/content/articles', heading: 'Articles' },
  { path: '/admin/assessments', heading: 'Assessment' },
  { path: '/admin/events', heading: 'Event' },
  { path: '/admin/commerce/products', heading: 'Products' },
  { path: '/admin/commerce/orders', heading: 'Orders' },
  { path: '/admin/users', heading: 'Users' },
  { path: '/admin/organizations', heading: 'Instansi' },
  { path: '/admin/users/access', heading: 'Entitlements' },
  { path: '/admin/settings', heading: 'Settings' },
  { path: '/admin/monitoring/reports', heading: 'Reports' },
  { path: '/admin/settings/audit', heading: 'Audit Log' },
]

test.describe('Admin workspace responsive smoke', () => {
  test.setTimeout(300_000)

  for (const viewport of [{ width: 390, height: 844, label: 'mobile' }, { width: 1024, height: 768, label: 'tablet' }]) {
    for (const route of ADMIN_ROUTES) {
      test(`${route.path} tidak overflow di ${viewport.label} ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(`${route.path}?program=CPNS&track=SKD`)

        // Halaman benar-benar render — bukan error boundary. Memakai
        // `toContainText` karena judul seperti "Users" dirender sebagai
        // `Users &amp; Roles` di HTML, dan `toHaveText` membandingkan teks mentah
        // dari DOM alih-alih hasil decode.
        await expect(page.locator('main h1')).toContainText(route.heading)
        await expect(page.getByText('Halaman ini belum bisa dibuka.', { exact: true })).toHaveCount(0)
        await expectNoHorizontalOverflow(page)

        // Pengguna yang sudah masuk tidak boleh ditawari tautan masuk lagi.
        await expect(page.locator('main').getByRole('link', { name: /^Masuk$/ })).toHaveCount(0)
      })
    }
  }

  test('halaman admin punya jalan keluar navigasi di mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/admin/settings?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Settings')
    await page.getByRole('button', {name: 'Buka menu', exact: true}).click()
    const drawer = page.getByRole('dialog', {name:'Menu admin', exact:true})
    await expect(drawer).toBeVisible()
    await drawer.getByRole('link',{name:'Settings', exact:true}).click()
    await expect(drawer).not.toBeVisible()
    await page.getByRole('link',{name:'Audit Log', exact:true}).click()
    await expect(page.locator('main h1')).toHaveText('Audit Log')
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
/**
 * Paginasi & pencarian daftar admin (S5–S7).
 *
 * Sebelumnya setiap daftar memuat satu jendela tetap dan diam tentang sisanya
 * (soal 80, exam 80, product/event 50), dan `/admin/users` mencetak "100 dari N"
 * tanpa cara menuju sisanya. Pencariannya disaring di klien atas baris yang
 * sudah terpotong, sehingga mencari soal ke-500 selalu dijawab "tidak ada" —
 * jawaban yang salah, bukan sekadar kosong.
 */
/**
 * Dialog konfirmasi aksi destruktif (S10).
 *
 * Di sini hanya dibuktikan bahwa halaman benar-benar merender dengan dialog
 * terpasang. Perilaku dialognya sendiri — trigger membuka dialog, dan tombol
 * konfirmasi mengirim form induknya — diuji di unit test
 * (`tests/unit/admin-confirm-submit.test.ts`), karena di sinilah semuanya sempat
 * gagal: render prop ditolak React ("Functions cannot be passed directly to
 * Client Components"), dan bentuk salah berikutnya menaruh tombol konfirmasi di
 * luar form sehingga SELURUH halaman jatuh ke error boundary.
 *
 * Sengaja TIDAK mengklik sampai konfirmasi di staging: itu akan mengarsipkan
 * produk nyata pada setiap run.
 */
test.describe('Admin destructive action confirmation', () => {
  test.setTimeout(120_000)

  test('halaman produk merender tombol arsip yang memakai dialog konfirmasi', async ({ page }) => {
    await page.goto('/admin/commerce/products?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Products')
    await expect(page.getByText('Halaman ini belum bisa dibuka.', { exact: true })).toHaveCount(0)
    await page.locator('summary').filter({hasText:'Lainnya'}).first().click()
    await expect(page.getByRole('button', { name: 'Arsipkan', exact: true }).first()).toBeVisible()
  })
})

test.describe('Admin list pagination and search', () => {
  test.setTimeout(120_000)

  test('Question Bank menyatakan posisi daftar dan mencari di sisi database', async ({ page }) => {
    await page.goto('/admin/content/questions?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Question Bank')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)

    // Daftar menyatakan posisinya alih-alih menampilkan potongan seolah seluruhnya.
    await expect(page.getByText(/Menampilkan \d+–\d+ dari \d+ soal|Belum ada soal/).first()).toBeVisible()

    // Filter hidup di URL, dan setiap perubahan filter mengembalikan ke halaman 1.
    await page.fill('input[name="q"]', 'TWK')
    await page.getByRole('button', { name: 'Terapkan' }).click()
    await expect(page).toHaveURL(/[?&]q=TWK/)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await expect(page.getByText(/Filter aktif/)).toBeVisible()

    // Paginasi hanya dirender bila memang ada lebih dari satu halaman — dan bila
    // ada, ia wajib membawa filter yang sedang aktif.
    const next = page.getByRole('link', { name: /Halaman berikutnya/ })
    if (await next.count() > 0) {
      await next.first().click()
      await expect(page).toHaveURL(/[?&]page=2/)
      await expect(page).toHaveURL(/[?&]q=TWK/)
      await expect(page.getByRole('link', { name: /Halaman sebelumnya/ })).toBeVisible()
    }

    await expectNoHorizontalOverflow(page)
  })
})

test.describe('Admin content modules after legacy tree removal', () => {
  test.setTimeout(120_000)

  test('reviewer workspace renders at its canonical route', async ({ page }) => {
    await page.goto('/admin/content/review?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.locator('main h1')).toHaveText('Review')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
    await expectNoHorizontalOverflow(page)

    // Panel review massal untuk batch CPNS. Alur review normal hanya satu soal
    // per form; panel ini yang memakai RPC massal (`claim_pilot_review_stage` +
    // `bulk_review_pilot_stage`) sehingga satu batch 80 soal tidak perlu ~1.700
    // klik. Sejak alur disederhanakan, panel ini berada di mode khusus yang
    // dibuka lewat tombol "Buka review massal" (`?bulk=1`) — yang dibuktikan di
    // sini adalah panelnya benar-benar terpasang di halaman kanonik pada konteks
    // CPNS/SKD, bukan sekadar ada di dalam repo.
    await page.getByRole('link', { name: 'Buka review massal', exact: true }).click()
    await expect(page).toHaveURL(/\/content\/review\/bulk(?:\?|$)/)
    await expect(page.getByRole('heading', { name: 'Review massal — batch' })).toBeVisible()
    await expect(page.getByText('cpns-full-tryout-1', { exact: true })).toBeVisible()
    await expect(page.getByText('Sebaran status', { exact: true })).toBeVisible()
    await expect(page.getByText('Belum ada reviewer', { exact: true })).toBeVisible()
    // Langkah 1 selalu tampil untuk pemegang content.review; label tombolnya
    // mengikuti keadaan batch (siapkan draft vs sudah disiapkan semua).
    await expect(page.getByRole('heading', { name: 'Langkah 1 · Siapkan & klaim' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Siapkan \d+ soal|Sudah disiapkan)$/ })).toBeVisible()
    // Panel menjelaskan fungsinya sendiri (bukan sekadar tiga tombol), menyebut
    // posisi tahap, dan menyediakan daftar soal untuk spot-check sebelum
    // memutuskan puluhan soal sekaligus.
    await expect(page.getByText('Apa ini?', { exact: true })).toBeVisible()
    await expect(page.getByText('Keputusan tetap milik Anda.', { exact: false })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Soal di batch ini/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Periksa' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Terbitkan \d+ soal$/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('review massal tidak bocor ke konteks TKA', async ({ page }) => {
    // Panel batch terikat konteks CPNS/SKD. Di konteks lain halaman review harus
    // tetap seperti semula: tidak ada panel batch maupun tombol massal.
    await page.goto('/admin/content/review?program=TKA&track=SMP')
    await expect(page.locator('main h1')).toHaveText('Review')
    await expect(page.getByRole('heading', { name: 'Review massal — batch' })).toHaveCount(0)
    await expect(page.getByText('cpns-full-tryout-1', { exact: true })).toHaveCount(0)
  })

  test('articles list renders and links into the article editor', async ({ page }) => {
    await page.goto('/admin/content/articles?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/articles/)
    await expect(page.locator('main h1')).toHaveText('Articles')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)

    // Halaman listing tidak boleh kosong karena error. Kalau ada artikel, salah
    // satunya harus menautkan ke editor; kalau tidak ada, harus tampil empty state
    // yang jujur — bukan halaman kosong tanpa penjelasan.
    const editLinks = page.getByRole('link', { name: 'Ubah', exact: true })
    if (await editLinks.count() === 0) {
      await expect(page.getByText('Belum ada artikel', { exact: true })).toBeVisible()
    } else {
      await editLinks.first().click()
      await expect(page).toHaveURL(/\/admin\/content\/articles\/[^/]+\/edit/)
      await expect(page.locator('main h1')).toHaveText('Edit Artikel')
    }
  })

  test('article create page renders at its canonical route', async ({ page }) => {
    await page.goto('/admin/content/articles/new?program=CPNS&track=SKD')
    await expect(page).toHaveURL(/\/admin\/content\/articles\/new/)
    await expect(page.locator('main h1')).toHaveText('Buat Artikel Baru')
    await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
  })

  test('every moved module is reachable through the admin sidebar', async ({ page }) => {
    // Membuktikan navigasi internal tidak menunjuk rute yang sudah dihapus.
    await page.goto('/admin?program=CPNS&track=SKD')
    await expect(page.locator('main h1')).toHaveText('Dashboard')

    await page.getByRole('navigation',{name:'Menu admin'}).getByRole('button',{name:'Content',exact:true}).click()
    await page.getByRole('navigation',{name:'Menu admin'}).getByRole('link', { name: 'Review', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.locator('main h1')).toHaveText('Review')

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
