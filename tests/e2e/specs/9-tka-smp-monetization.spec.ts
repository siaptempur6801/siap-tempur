import { expect, test, type Page } from '@playwright/test'
import { freshDisposableTkaSession, type DisposableTkaSession } from '../tka.ci'
import {
    cleanupCiTkaUser,
    clearM4Artifacts,
    consumeM4MiniQuota,
    grantM4Pass,
    provisionSecondaryTkaSession,
    readOrderAs,
    readPaymentAs,
    seedM4Order,
    setTkaSmpMonetizationEnforcement,
} from '../tka.m4'

async function assertNoDocumentOverflow(page: Page) {
    const report = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
    }))
    expect(report.documentWidth, JSON.stringify(report)).toBeLessThanOrEqual(report.viewportWidth + 1)
}

function examCard(page: Page, title: string) {
    return page.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) })
}

test.describe.serial('TKA SMP Monetization staging surface', () => {
    let currentSession: DisposableTkaSession | null = null

    async function fresh(page: Page) {
        currentSession = await freshDisposableTkaSession(page)
        return currentSession
    }

    test.beforeAll(async () => {
        await setTkaSmpMonetizationEnforcement(true)
    })

    test.afterAll(async () => {
        if (currentSession) {
            await clearM4Artifacts(currentSession).catch(() => undefined)
            await cleanupCiTkaUser(currentSession.userId).catch(() => undefined)
        }
        await setTkaSmpMonetizationEnforcement(false)
    })

    test('authenticated learner can discover active SMP pass catalog with sandbox Snap loader', async ({ page }) => {
        test.setTimeout(60_000)
        await fresh(page)
        await page.setViewportSize({ width: 390, height: 844 })

        await page.goto('/tka/smp/progress')
        const passLink = page.getByRole('link', { name: 'Tempur Pass', exact: true })
        await expect(passLink).toBeVisible()
        await passLink.click()
        await page.waitForURL(/\/tka\/smp\/pass$/i)

        await expect(page.getByRole('heading', { name: 'Pilih Tempur Pass', exact: true })).toBeVisible()
        await expect(page.getByTestId('tka-pass-status-inactive')).toContainText('Belum ada Tempur Pass aktif.')
        await expect(page.getByRole('heading', { name: 'Buka akses premium TKA SMP', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Pilih 30 Hari', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Pilih 90 Hari', exact: true })).toBeVisible()
        await expect(page.getByText('Rp29.000', { exact: true })).toBeVisible()
        await expect(page.getByText('Rp69.000', { exact: true })).toBeVisible()
        await expect(page.getByText('+ biaya admin Rp500 saat checkout', { exact: true }).first()).toBeVisible()

        const snapScript = page.locator('script#midtrans-snap')
        await expect(snapScript).toHaveAttribute('src', 'https://app.sandbox.midtrans.com/snap/snap.js')
        await expect(snapScript).toHaveAttribute('data-client-key', /.+/)
        await assertNoDocumentOverflow(page)
    })

    test('Full Tryout is denied without a usable Tempur Pass when enforcement is enabled', async ({ page }) => {
        await fresh(page)
        await page.goto('/tka/smp')

        const full = examCard(page, 'Tryout Lengkap TKA SMP')
        await expect(full).toBeVisible()
        await full.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
        await expect(page.getByText('Paket aktif diperlukan untuk membuka tryout ini.', { exact: true })).toBeVisible()
        await expect(page).toHaveURL(/\/tka\/smp$/)
    })

    test('expired Tempur Pass stays inactive and cannot unlock Full Tryout', async ({ page }) => {
        const session = await fresh(page)
        const grant = await grantM4Pass(session, 'expired')
        expect(grant.entitlementCount).toBe(10)

        await page.goto('/tka/smp/pass')
        await expect(page.getByTestId('tka-pass-status-inactive')).toContainText('Belum ada Tempur Pass aktif.')

        await page.goto('/tka/smp')
        const full = examCard(page, 'Tryout Lengkap TKA SMP')
        await full.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
        await expect(page.getByText('Paket aktif diperlukan untuk membuka tryout ini.', { exact: true })).toBeVisible()
    })

    test('active Tempur Pass shows expiry/renewal UX and unlocks Full Tryout', async ({ page }) => {
        const session = await fresh(page)
        const grant = await grantM4Pass(session, 'active')
        expect(grant.entitlementCount).toBe(10)

        await page.goto('/tka/smp/pass')
        await expect(page.getByTestId('tka-pass-status-active')).toContainText('Tempur Pass aktif')
        await expect(page.getByRole('heading', { name: 'Perpanjang Tempur Pass TKA SMP', exact: true })).toBeVisible()
        await expect(page.getByRole('button', { name: 'Perpanjang 30 Hari', exact: true })).toBeVisible()

        await page.goto('/tka/smp')
        const full = examCard(page, 'Tryout Lengkap TKA SMP')
        await full.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
        await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
        await expect(page.getByText(/Bahasa Indonesia|Matematika/i).first()).toBeVisible()
    })

    test('Mini free quota is denied after one attempt without pass', async ({ page }) => {
        const session = await fresh(page)
        const seeded = await consumeM4MiniQuota(session, 'tka-smp-mini-bahasa-indonesia')
        expect(seeded.attemptNumber).toBe(1)

        await page.goto('/tka/smp')
        const mini = examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
        const locked = mini.getByRole('button', { name: 'Kuota gratis habis · Butuh Tempur Pass', exact: true })
        await expect(locked).toBeVisible()
        await expect(locked).toBeDisabled()
    })

    test('active Tempur Pass bypasses exhausted Mini quota', async ({ page }) => {
        const session = await fresh(page)
        await consumeM4MiniQuota(session, 'tka-smp-mini-matematika')
        await grantM4Pass(session, 'active')

        await page.goto('/tka/smp')
        const mini = examCard(page, 'Mini Tryout Matematika TKA SMP')
        await expect(mini.getByText('Tempur Pass aktif', { exact: true })).toBeVisible()
        await mini.getByRole('button', { name: 'Mulai Tryout', exact: true }).click()
        await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    })

    test('orders and payments are owner-only across two authenticated learners', async ({ page }) => {
        const owner = await fresh(page)
        const order = await seedM4Order(owner)
        expect(order.amount).toBe(29_500)

        const attacker = await provisionSecondaryTkaSession()
        try {
            const ownerOrder = await readOrderAs(owner, order.orderId)
            const ownerPayment = await readPaymentAs(owner, order.orderId)
            expect(ownerOrder?.id).toBe(order.orderId)
            expect(ownerOrder?.order_number).toBe(order.orderNumber)
            expect(ownerPayment?.order_id).toBe(order.orderId)

            const attackerOrder = await readOrderAs(attacker, order.orderId)
            const attackerPayment = await readPaymentAs(attacker, order.orderId)
            expect(attackerOrder).toBeNull()
            expect(attackerPayment).toBeNull()
        } finally {
            await cleanupCiTkaUser(attacker.userId)
        }
    })

    test('unauthenticated learner is redirected to login with pass returnTo', async ({ browser }) => {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const page = await context.newPage()
        await page.goto('/tka/smp/pass')
        await page.waitForURL(/\/login\?returnTo=%2Ftka%2Fsmp%2Fpass/i)
        await expect(page.locator('input[type="email"]')).toBeVisible()
        await context.close()
    })
})
