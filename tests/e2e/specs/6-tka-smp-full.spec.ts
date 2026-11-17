import { expect, test } from '@playwright/test'
import { cleanupCiTkaUser, freshDisposableTkaSession } from '../tka.ci'

test('TKA SMP full tryout shows its token cost and is available to an active learner', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const session = await freshDisposableTkaSession(page)
  try {
    await page.goto('/tka/smp/tryout')

    const fullTryout = page.locator('article').filter({
      has: page.getByRole('heading', { name: 'Tryout Lengkap TKA SMP', exact: true }),
    })
    await expect(fullTryout).toBeVisible()
    await expect(fullTryout.getByRole('button', { name: /Mulai Tryout · 1 token/ })).toBeEnabled()
  } finally {
    await cleanupCiTkaUser(session.userId)
  }
})
