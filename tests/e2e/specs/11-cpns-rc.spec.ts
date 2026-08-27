import { expect, test } from '@playwright/test'

const SESSION_URL = /\/cpns\/dashboard\/tryout\/[0-9a-f-]{36}(?:\?.*)?$/i
const NAVIGATION_OPTIONS = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

test.describe('CPNS SKD release-candidate', () => {
  // This suite mutates a disposable wallet/attempt state. Retrying an individual
  // test would inherit the attempt created by the failed try, invalidating the
  // exactly-once token assertion. Provision/cleanup remains project-scoped.
  test.describe.configure({ retries: 0 })

  test('dashboard uses canonical track/wallet state', async ({ page }) => {
    await page.goto('/cpns/dashboard', NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(/\/cpns\/dashboard(?:\?.*)?$/)
    await expect(page.getByText('Siap Tempur')).toBeVisible()
    await expect(page.getByText('Tiket Sisa')).toBeVisible()
    await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mulai Tryout', exact: true })).toBeVisible()
  })

  test('new Full Tryout consumes one token and resume consumes none', async ({ page }) => {
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Siap Tryout Hari Ini?' })).toBeVisible()
    await expect(page.getByText('3 Tiket', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Mulai Tryout/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Mulai Full Tryout SKD?')).toBeVisible()
    await dialog.getByRole('button', { name: /Gunakan .* Token/i }).click()

    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    const sessionUrl = page.url()
    await expect(page).toHaveURL(SESSION_URL)

    await page.reload(NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(sessionUrl)

    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByText('2 Tiket', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lanjutkan Tryout/i })).toBeVisible()

    await page.getByRole('button', { name: /Lanjutkan Tryout/i }).click()
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(sessionUrl)

    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByText('2 Tiket', { exact: true })).toBeVisible()
  })
})
