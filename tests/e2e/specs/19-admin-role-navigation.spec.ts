import { expect, test, type Locator, type Page } from '@playwright/test'
import {
    cleanupRoleUser,
    loginAs,
    provisionRoleUser,
    requireEnv,
    type E2eRole,
    type ProvisionedUser,
} from '../admin-roles'

/** Real role navigation, scoped to the visible desktop sidebar or mobile drawer. */

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

const PRIMARY_MODULES = ['Dashboard', 'Assessment', 'Content', 'Event', 'Instansi', 'Monitoring', 'Commerce', 'Users', 'Settings']
const ALL_MODULES = [...PRIMARY_MODULES, 'Question Bank', 'Review', 'Articles', 'Products', 'Orders', 'Entitlements', 'Reports', 'Audit Log']

/** Sidebar yang sedang terlihat. Lihat catatan scope di atas. */
function sidebar(page: Page): Locator {
    return page.locator('nav[aria-label="Menu admin"]:visible')
}

async function expectMenus(page: Page, visible: string[], hidden: string[]) {
    const nav = sidebar(page)
    for (const label of visible) {
        await expect(nav.getByRole(['Content', 'Commerce'].includes(label) ? 'button' : 'link', { name: label, exact: true }), `menu "${label}" seharusnya terlihat`).toBeVisible()
    }
    for (const label of hidden) {
        await expect(nav.getByRole(['Content', 'Commerce'].includes(label) ? 'button' : 'link', { name: label, exact: true }), `menu "${label}" seharusnya TIDAK terlihat`).toHaveCount(0)
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
            await expectMenus(page, PRIMARY_MODULES, without(PRIMARY_MODULES))
            await expect(sidebar(page).getByRole('button', { name: 'Content', exact: true })).toHaveAttribute('aria-expanded', 'false')
            await expect(sidebar(page).getByRole('button', { name: 'Commerce', exact: true })).toHaveAttribute('aria-expanded', 'false')
            await sidebar(page).getByRole('button', { name: 'Content', exact: true }).click()
            await expect(sidebar(page).getByRole('link', { name: 'Question Bank', exact: true })).toBeVisible()
            await sidebar(page).getByRole('link', { name: 'Question Bank', exact: true }).click()
            await expect(page.locator('main h1')).toHaveText('Question Bank')
            await page.reload()
            await expect(sidebar(page).getByRole('button', { name: 'Content', exact: true })).toHaveAttribute('aria-expanded', 'true')
            await page.goto('/admin')
            // Label peran dibaca manusia, bukan kode mentah.
            await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible()
            // Dashboard ADMIN memang menampilkan antrean content.
            await expect(page.getByText('Antrean review', { exact: true })).toBeVisible()
            await expect(page.getByText('Perlu perhatian', { exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('FINANCE membuka orders, reports, dan akses pengguna dari workspace utamanya', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'FINANCE', '/admin')
        try {
            await expect(page.locator('main h1')).toHaveText('Dashboard')
            const visible = ['Dashboard', 'Monitoring', 'Commerce', 'Users']
            // Inti perbaikannya: FINANCE punya admin.access, tetapi TIDAK boleh
            // melihat modul content, assessment, maupun product.
            await expectMenus(page, visible, without(visible))

            // Dashboard-nya juga harus sadar-peran: FINANCE tidak boleh disuguhi
            // metrik review content maupun antreannya.
            await expect(page.getByText('Antrean review', { exact: true })).toHaveCount(0)
            await expect(page.getByText('Perlu perhatian', { exact: true })).toHaveCount(0)
            await expect(page.getByText('Workspace Anda', { exact: true })).toBeVisible()
            // Quick action yang ditawarkan hanya yang bisa dipakai.
            await expect(page.locator('main').getByRole('link', { name: 'Orders', exact: true })).toBeVisible()
            await expect(page.getByRole('link', { name: 'Bank soal', exact: true })).toHaveCount(0)
            await expect(page.getByRole('link', { name: 'Kelola ujian', exact: true })).toHaveCount(0)

            await sidebar(page).getByRole('link', { name: 'Monitoring', exact: true }).click()
            await page.getByRole('navigation', { name: 'Monitoring views' }).getByRole('link', { name: 'Reports', exact: true }).click()
            await expect(page.locator('main h1')).toHaveText('Reports')
            await sidebar(page).getByRole('link', { name: 'Users', exact: true }).click()
            await expect(page.locator('main h1')).toHaveText('Users')
            await expect(page.getByRole('heading', { name: 'Daftar pengguna' })).toBeVisible()
            await expect(page.getByRole('navigation', { name: 'Users views' }).getByRole('link', { name: 'Roles & Permissions' })).toHaveCount(0)
            await page.getByRole('row').filter({has:page.locator(`a[href^="/admin/users/${user.userId}"]`)}).getByRole('link',{name:'Lihat User',exact:true}).click()
            await page.getByRole('navigation', { name: 'User detail views' }).getByRole('link', { name: 'Entitlements', exact: true }).click()
            await expect(page.getByRole('heading', { name: 'Entitlements', exact: true })).toBeVisible()
            await page.getByRole('link', { name: 'Kelola token & voucher', exact: true }).click()
            await expect(page.locator('main h1')).toHaveText('Entitlements')
            await expect(sidebar(page).getByRole('link', { name: 'Users', exact: true })).toHaveAttribute('aria-current', 'page')
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('SUPPORT hanya melihat Dashboard, Commerce, dan Users', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'SUPPORT', '/admin')
        try {
            await expect(page.locator('main h1')).toHaveText('Dashboard')
            const visible = ['Dashboard', 'Commerce', 'Users']
            await expectMenus(page, visible, without(visible))

            // SUPPORT punya user.read → halaman Users harus benar-benar membuka.
            await sidebar(page).getByRole('link', { name: 'Users', exact: true }).click()
            await expect(page).toHaveURL(/\/admin\/users/)
            await expect(page.locator('main h1')).toHaveText('Users')
            // Tanpa role.manage, tombol memberi/mencabut peran tidak ditawarkan.
            await expect(page.getByRole('button', { name: 'Beri', exact: true })).toHaveCount(0)
            await page.getByText('Catatan akses', { exact: true }).click()
            await expect(page.getByText(/role\.manage/).first()).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('SCHOOL_ADMIN mendarat di Instansi, bukan dead-end', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        // Tanpa admin.access, peran ini dulu dilempar diam-diam ke /cpns/dashboard.
        // Kini ia mendarat di pekerjaan utamanya: mengelola instansi & batch.
        const user = await provisionAndLogin(page, 'SCHOOL_ADMIN', '/admin/organizations')
        try {
            await expect(page).toHaveURL(/\/admin\/organizations/)
            await expect(page.locator('main h1')).toHaveText('Instansi')
            await expect(page.getByText('Akses tidak tersedia', { exact: true })).toHaveCount(0)
            const visible = ['Instansi', 'Monitoring']
            await expectMenus(page, visible, without(visible))

            // Halaman instansi harus benar-benar membuka, bukan sekadar ada di menu.
            await expect(page.getByRole('heading', { name: 'Daftar instansi', exact: true })).toBeVisible()
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('CONTENT_EDITOR mendarat di Review dan tidak melihat Question Bank', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'CONTENT_EDITOR', '/admin/content/review')
        try {
            await expect(page.locator('main h1')).toHaveText('Review')
            const visible = ['Content', 'Review', 'Articles']
            // Question Bank butuh question.manage, yang tidak dimiliki editor.
            await expectMenus(page, visible, without(visible))
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })

    test('CONTENT_REVIEWER mendarat di Review dan tidak melihat modul operasional', async ({ page }) => {
        const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
        const user = await provisionAndLogin(page, 'CONTENT_REVIEWER', '/admin/content/review')
        try {
            await expect(page.locator('main h1')).toHaveText('Review')
            const visible = ['Content', 'Review', 'Articles']
            await expectMenus(page, visible, without(visible))
        } finally {
            await cleanupRoleUser(supabaseUrl, user.userId)
        }
    })
})

test('ADMIN uses disclosures, contextual tabs, icon mode, and the mobile drawer', async ({ page }) => {
    const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const user = await provisionAndLogin(page, 'ADMIN', '/admin')
    try {
        const nav = sidebar(page)
        await page.getByRole('button', { name: 'Ciutkan sidebar', exact: true }).click()
        await expect(page.getByRole('button', { name: 'Perluas sidebar', exact: true })).toBeVisible()
        await expect(nav.getByRole('link', { name: 'Monitoring', exact: true })).toHaveAttribute('title', 'Monitoring')
        await expect.poll(() => page.locator('aside').first().evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(68)
        await nav.getByRole('button', { name: 'Commerce', exact: true }).click()
        await expect(nav.getByRole('button', { name: 'Commerce', exact: true })).toHaveAttribute('aria-expanded', 'true')
        await nav.getByRole('link', { name: 'Orders', exact: true }).click()
        await expect(page.locator('main h1')).toHaveText('Orders')
        await expect(nav.getByRole('link', { name: 'Orders', exact: true })).toHaveAttribute('aria-current', 'page')
        const order = page.locator('main a[href^="/admin/commerce/orders/"]').first()
        if (await order.count()) {
            await order.click()
            await expect(page.getByRole('heading', { name: 'Payment information' })).toBeVisible()
        }
        await nav.getByRole('link', { name: 'Monitoring', exact: true }).click()
        await page.getByRole('navigation', { name: 'Monitoring views' }).getByRole('link', { name: 'Reports', exact: true }).click()
        await expect(nav.getByRole('link', { name: 'Monitoring', exact: true })).toHaveAttribute('aria-current', 'page')
        await nav.getByRole('link', { name: 'Settings', exact: true }).click()
        await page.getByRole('navigation', { name: 'Settings views' }).getByRole('link', { name: 'Audit Log', exact: true }).click()
        await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page')
        await nav.getByRole('link', { name: 'Users', exact: true }).click()
        await page.getByRole('navigation', { name: 'Users views' }).getByRole('link', { name: 'Roles & Permissions', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Peran & permission', exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: 'Daftar pengguna', exact: true })).toHaveCount(0)
        await page.getByRole('navigation', { name: 'Users views' }).getByRole('link', { name: 'Users', exact: true }).click()
        await page.getByRole('row').filter({has:page.locator(`a[href^="/admin/users/${user.userId}"]`)}).getByRole('link',{name:'Lihat User',exact:true}).click()
        await page.getByRole('navigation', { name: 'User detail views' }).getByRole('link', { name: 'Entitlements', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Entitlements', exact: true })).toBeVisible()

        await page.goto('/admin')
        await expect(page.locator('main h1')).toHaveText('Dashboard')
        await page.setViewportSize({ width: 390, height: 844 })
        await expect(sidebar(page)).toHaveCount(0)
        await page.getByRole('button', { name: 'Buka menu', exact: true }).click()
        const drawer = page.getByRole('dialog', { name: 'Menu admin', exact: true })
        await expect(drawer).toBeVisible()
        await expect(drawer.getByRole('button', { name: 'Content', exact: true })).toHaveAttribute('aria-expanded', 'false')
        await drawer.getByRole('button', { name: 'Content', exact: true }).click()
        await drawer.getByRole('link', { name: 'Articles', exact: true }).click()
        await expect(drawer).not.toBeVisible()
        await expect(page.locator('main h1')).toHaveText('Articles')
        await page.getByRole('button', { name: 'Buka menu', exact: true }).click()
        await expect(drawer.getByRole('button', { name: 'Content', exact: true })).toHaveAttribute('aria-expanded', 'true')
        await page.setViewportSize({ width: 900, height: 900 })
        await expect(drawer).not.toBeVisible()
        await expect(sidebar(page)).toBeVisible()
        expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
        await page.setViewportSize({ width: 390, height: 844 })
        await page.getByRole('button', { name: 'Buka menu', exact: true }).click()
        await page.keyboard.press('Escape')
        await expect(drawer).not.toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        await expect(page.getByRole('button', { name: 'Buka menu', exact: true })).toBeFocused()
    } finally {
        await cleanupRoleUser(supabaseUrl, user.userId)
    }
})
