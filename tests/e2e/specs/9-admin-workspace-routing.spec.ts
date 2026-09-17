import { expect, test } from '@playwright/test'

test.describe('Admin Workspace canonical routing', () => {
    test.use({ storageState: { cookies: [], origins: [] } })

    test('legacy tab route resolves to canonical Product workspace before authentication', async ({ page }) => {
        await page.goto('/cpns/admin?tab=products&program=TKA&track=SMP')
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcommerce%2Fproducts$/)
        // Kebijakan: tautan "Kembali" hanya menuju halaman publik. `returnTo` di sini butuh login
        // (admin), jadi Kembali diarahkan ke beranda supaya pengguna tidak terpantul balik ke login.
        await expect(page.getByRole('link', { name: 'Kembali' })).toHaveAttribute('href', '/')
    })

    test('legacy assessment routes resolve to canonical modules', async ({ page }) => {
        await page.goto('/cpns/admin/tryout-config')
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fassessment%2Fexams$/)

        await page.goto('/cpns/admin/event')
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fassessment%2Fevents$/)
    })

    test('legacy content routes stay inside canonical Admin Workspace', async ({ page }) => {
        await page.goto('/cpns/admin/create')
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Fquestions$/)

        await page.goto('/cpns/admin/articles/create')
        await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fcontent%2Farticles%2Fcreate$/)
    })
})
