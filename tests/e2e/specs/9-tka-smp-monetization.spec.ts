import { expect, test } from '@playwright/test'
import { freshDisposableTkaSession } from '../tka.ci'

async function assertNoDocumentOverflow(page: import('@playwright/test').Page) {
    const report = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
    }))
    expect(report.documentWidth, JSON.stringify(report)).toBeLessThanOrEqual(report.viewportWidth + 1)
}

test.describe.serial('TKA SMP Monetization staging surface', () => {
    test('authenticated learner sees active SMP pass catalog and sandbox Snap loader', async ({ page }) => {
        test.setTimeout(60_000)
        await freshDisposableTkaSession(page)
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/tka/smp/pass')

        await expect(page.getByRole('heading', { name: 'Pilih Tempur Pass', exact: true })).toBeVisible()
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

    test('unauthenticated learner is redirected to login with pass returnTo', async ({ browser }) => {
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const page = await context.newPage()
        await page.goto('/tka/smp/pass')
        await page.waitForURL(/\/login\?returnTo=%2Ftka%2Fsmp%2Fpass/i)
        await expect(page.locator('input[type="email"]')).toBeVisible()
        await context.close()
    })
})
