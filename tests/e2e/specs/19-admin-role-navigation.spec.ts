import { expect, test, type Locator, type Page } from '@playwright/test'
import {
    cleanupRoleUser,
    loginAs,
    provisionRoleUser,
    requireEnv,
    type E2eRole,
    type ProvisionedUser,
} from '../admin-roles'

/**
 * Alur peran di Admin Workspace.
 *
 * ## Regresi yang dikunci di sini
 *
 * Visibilitas menu dulu ditentukan satu boolean `admin.access`. Karena
 * `FINANCE` dan `SUPPORT` memang punya `admin.access` di database, keduanya
 * melihat SELURUH menu Content/Assessment/Commerce padahal tidak punya satu pun
 * permission di sana — dan setiap halaman yang dibuka menjalankan query
 * beratnya lebih dulu sebelum menampilkan "Akses tidak tersedia".
 *
 * Sebaliknya `CONTENT_EDITOR`/`CONTENT_REVIEWER` hanya kebagian menu yang
 * ditebak dari daftar permission yang di-hardcode, dan `SCHOOL_ADMIN` tidak
 * mendapat permukaan apa pun sehingga dilempar diam-diam ke dashboard peserta.
 *
 * Test ini membuktikan perilaku yang benar untuk peran-peran itu dengan
 * pengguna staging sungguhan, bukan simulasi.
 *
 * ## Kenapa selector di-scope
 *
 * Sidebar yang sama dirender TIGA kali di DOM: sekali untuk desktop, sekali di
 * dalam drawer mobile, dan bottom-nav mobile memuat sebagian item yang sama.
 * `getByRole('link', { name })` tanpa scope akan melanggar strict mode. Semua
 * pemeriksaan di sini karena itu di-scope ke `<nav aria-label="Menu admin">`
 * yang sedang terlihat — pada viewport desktop hanya salinan desktop yang
 * tampil, dan di situlah menu lengkap berada.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

const ALL_MODULES = ['Dashboard', 'Question Bank', 'Review Queue', 'Articles', 'Exams', 'Events', 'Products', 'Orders & Payments', 'Entitlements', 'Instansi & Batch', 'Users & Roles', 'Reports', 'Audit Log', 'Settings']

/** Sidebar yang sedang terlihat. Lihat catatan scope di atas. */
function sidebar(page: Page): Locator {
    return page.locator('nav[aria-label="Menu admin"]:visible')
}

async function expectMenus(page: Page, visible: string[], hidden: string[]) {
    const nav = sidebar(page)
    for (const label of visible) {
        await expect(nav.getByRole('link', { name: label, exact: true }), `menu "${label}" seharusnya terlihat`).toBeVisible()
    }
    for (const label of hidden) {
        await expect(nav.getByRole('link', { name: label, exact: true }), `menu "${label}" seharusnya TIDAK terlihat`).toHaveCount(0)
    }
}

function without(labels: string[]) {
    return ALL_MODULES.filter((label) => !labels.includes(label))
}

/**
 * Provisikan pengguna berperan `role`, login, dan pastikan mendarat di
 * `landingPath` — halaman pendaratan yang benar untuk peran itu.
 */
async function provisionAndLogin(page: Page, role: E2eRole, landingPath: string): Promise<ProvisionedUser> {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const user = await provisionRoleUser(supabaseUrl, role)
    try {
        await loginAs(page, user, landingPath)
    } catch (error) {
        await cleanupRoleUser(supabaseUrl, user.userId)
        throw error
    }
    return user
}

test.describe('Alur peran Admin Workspace', () => {
    test('ADMIN melihat seluruh modul dan mendarat di Dashboard', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'ADMIN', '/admin')
        try {
            await expect(page.locator('main h1')).toHaveText('Dashboard')
            await expectMenus(page, ALL_MODULES, [])
            // Label peran dibaca manusia, bukan kode mentah.
            await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible()
            // Dashboard ADMIN memang menampilkan antrean content.
            await expect(page.getByText('Antrean review', { exact: true })).toBeVisible()
            await expect(page.getByText('Perlu perhatian', { exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('FINANCE hanya melihat Dashboard, Orders & Payments, Entitlements, dan Reports', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'FINANCE', '/admin')
        try {
            await expect(page.locator('main h1')).toHaveText('Dashboard')
            const visible = ['Dashboard', 'Orders & Payments', 'Entitlements', 'Reports']
            // Inti perbaikannya: FINANCE punya admin.access, tetapi TIDAK boleh
            // melihat modul content, assessment, maupun product.
            await expectMenus(page, visible, without(visible))

            // Dashboard-nya juga harus sadar-peran: FINANCE tidak boleh disuguhi
            // metrik review content maupun antreannya.
            await expect(page.getByText('Antrean review', { exact: true })).toHaveCount(0)
            await expect(page.getByText('Perlu perhatian', { exact: true })).toHaveCount(0)
            await expect(page.getByText('Tidak ada antrean konten', { exact: true })).toBeVisible()
            // Quick action yang ditawarkan hanya yang bisa dipakai.
            await expect(page.getByRole('link', { name: 'Pesanan & pembayaran', exact: true })).toBeVisible()
            await expect(page.getByRole('link', { name: 'Bank soal', exact: true })).toHaveCount(0)
            await expect(page.getByRole('link', { name: 'Kelola ujian', exact: true })).toHaveCount(0)

            // Entitlements harus benar-benar membuka — inilah pekerjaan FINANCE
            // yang sebelumnya hanya bisa dilakukan lewat SQL langsung.
            await sidebar(page).getByRole('link', { name: 'Entitlements', exact: true }).click()
            await expect(page).toHaveURL(/\/admin\/entitlements/)
            await expect(page.locator('main h1')).toHaveText('Entitlements')
            await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
            await expect(page.getByRole('heading', { name: 'Dompet pengguna', exact: true })).toBeVisible()
            await expect(page.getByRole('heading', { name: 'Voucher', exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('SUPPORT hanya melihat Dashboard, Orders & Payments, dan Users & Roles', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'SUPPORT', '/admin')
        try {
            await expect(page.locator('main h1')).toHaveText('Dashboard')
            const visible = ['Dashboard', 'Orders & Payments', 'Users & Roles']
            await expectMenus(page, visible, without(visible))

            // SUPPORT punya user.read → halaman Users harus benar-benar membuka.
            await sidebar(page).getByRole('link', { name: 'Users & Roles', exact: true }).click()
            await expect(page).toHaveURL(/\/admin\/users/)
            await expect(page.locator('main h1')).toHaveText('Users & Roles')
            // Tanpa role.manage, tombol memberi/mencabut peran tidak ditawarkan.
            await expect(page.getByRole('button', { name: 'Beri', exact: true })).toHaveCount(0)
            await expect(page.getByText(/role\.manage/).first()).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('SCHOOL_ADMIN mendarat di Instansi & Batch, bukan dead-end', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        // Tanpa admin.access, peran ini dulu dilempar diam-diam ke /cpns/dashboard.
        // Kini ia mendarat di pekerjaan utamanya: mengelola instansi & batch.
        const user = await provisionAndLogin(page, 'SCHOOL_ADMIN', '/admin/organizations')
        try {
            await expect(page).toHaveURL(/\/admin\/organizations/)
            await expect(page.locator('main h1')).toHaveText('Instansi & Batch')
            await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
            const visible = ['Instansi & Batch', 'Reports']
            await expectMenus(page, visible, without(visible))

            // Halaman instansi harus benar-benar membuka, bukan sekadar ada di menu.
            await expect(page.getByRole('heading', { name: 'Daftar instansi', exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('CONTENT_EDITOR mendarat di Review Queue dan tidak melihat Question Bank', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'CONTENT_EDITOR', '/admin/content/review')
        try {
            await expect(page.locator('main h1')).toHaveText('Reviewer Workspace')
            const visible = ['Review Queue', 'Articles']
            // Question Bank butuh question.manage, yang tidak dimiliki editor.
            await expectMenus(page, visible, without(visible))
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('CONTENT_REVIEWER mendarat di Review Queue dan tidak melihat modul operasional', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'CONTENT_REVIEWER', '/admin/content/review')
        try {
            await expect(page.locator('main h1')).toHaveText('Reviewer Workspace')
            const visible = ['Review Queue', 'Articles']
            await expectMenus(page, visible, without(visible))
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })
})
