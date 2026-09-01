import { expect, test, type Locator, type Page } from '@playwright/test'

const MOBILE_VIEWPORT = { width: 390, height: 844 }

async function expectNoHorizontalOverflow(page: Page) {
    const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
    }))

    expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1)
    expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function expectTouchTarget(locator: Locator) {
    await expect(locator).toBeVisible()
    const box = await locator.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(44)
}

test.describe('Product Experience mobile accessibility regression', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize(MOBILE_VIEWPORT)
    })

    test('CPNS landing keeps primary journey readable and touch friendly on mobile', async ({ page }) => {
        await page.goto('/cpns')

        await expect(page.getByRole('heading', { name: /Persiapan SKD yang tidak berhenti di skor/i })).toBeVisible()
        const primaryCta = page.getByRole('link', { name: /Mulai persiapan/i }).first()
        await expectTouchTarget(primaryCta)
        await primaryCta.focus()
        await expect(primaryCta).toBeFocused()
        await expectNoHorizontalOverflow(page)
    })

    test('login exposes password toggle and validation errors to assistive technology', async ({ page }) => {
        await page.goto('/login?returnTo=%2Fcpns')

        const passwordToggle = page.getByRole('button', { name: 'Tampilkan kata sandi', exact: true })
        await expectTouchTarget(passwordToggle)
        await passwordToggle.focus()
        await expect(passwordToggle).toBeFocused()
        await passwordToggle.click()
        await expect(page.getByRole('button', { name: 'Sembunyikan kata sandi', exact: true })).toBeVisible()

        await page.getByRole('button', { name: 'Masuk', exact: true }).click()
        const email = page.locator('#email-address')
        const password = page.locator('#password')
        await expect(email).toHaveAttribute('aria-invalid', 'true')
        await expect(password).toHaveAttribute('aria-invalid', 'true')
        await expect(page.locator('#login-email-error')).toHaveAttribute('role', 'alert')
        await expect(page.locator('#login-password-error')).toHaveAttribute('role', 'alert')
        await expectNoHorizontalOverflow(page)
    })

    test('register exposes accessible field errors and a touch-friendly password toggle', async ({ page }) => {
        await page.goto('/register?returnTo=%2Ftka%2Fsmp')

        const passwordToggle = page.getByRole('button', { name: 'Tampilkan kata sandi', exact: true })
        await expectTouchTarget(passwordToggle)
        await passwordToggle.focus()
        await expect(passwordToggle).toBeFocused()

        await page.getByRole('button', { name: 'Daftar gratis', exact: true }).click()
        await expect(page.locator('#fullName')).toHaveAttribute('aria-invalid', 'true')
        await expect(page.locator('#email-address')).toHaveAttribute('aria-invalid', 'true')
        await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true')
        await expect(page.locator('#register-name-error')).toHaveAttribute('role', 'alert')
        await expect(page.locator('#register-email-error')).toHaveAttribute('role', 'alert')
        await expect(page.locator('#register-password-error')).toHaveAttribute('role', 'alert')
        await expectNoHorizontalOverflow(page)
    })

    test('TKA public entry remains readable without horizontal overflow', async ({ page }) => {
        await page.goto('/tka')

        await expect(page.getByRole('heading', { name: /Fokus dulu ke TKA SMP/i })).toBeVisible()
        const smpEntry = page.getByRole('link', { name: /TKA SMP.*Masuk & mulai/i })
        await expectTouchTarget(smpEntry)
        await smpEntry.focus()
        await expect(smpEntry).toBeFocused()
        await expectNoHorizontalOverflow(page)
    })
})
