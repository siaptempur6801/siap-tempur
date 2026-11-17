import { expect, test } from '@playwright/test'
import { cleanupCiTkaUser, freshDisposableTkaSession } from '../tka.ci'
import { verifyProfileSettingsDialogs } from '../pages/ProfileSettings'

test('TKA profile dialogs remain usable on short mobile screens', async ({ page }, testInfo) => {
  await verifyProfileSettingsDialogs(page, '/tka/smp/profile?tab=settings', testInfo)
})

test('legacy access route returns to TKA dashboard', async ({ page }) => {
  await page.goto('/tka/smp/pass')
  await expect(page).toHaveURL(/\/tka\/smp$/)
  await expect(page.getByRole('main')).toBeVisible()
})

test('TKA exam page presents token access instead of premium entitlement state', async ({ page }) => {
  test.setTimeout(90_000)
  const session = await freshDisposableTkaSession(page)
  try {
    await page.goto('/tka/smp/tryout')

    const exam = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'Tryout Lengkap TKA SMP', exact: true }),
    })
    await expect(exam).toBeVisible()
    await expect(page.getByRole('region', { name: 'Informasi token TKA' })).toContainText(
      'Saldo kamu 50 token',
    )
    await expect(exam.getByRole('button', { name: /Mulai Tryout · 1 token/ })).toBeEnabled()
  } finally {
    await cleanupCiTkaUser(session.userId)
  }
})
