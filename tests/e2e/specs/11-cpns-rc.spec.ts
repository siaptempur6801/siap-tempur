import { expect, test, type Locator, type Page } from '@playwright/test'

const SESSION_URL = /\/cpns\/dashboard\/tryout\/[0-9a-f-]{36}(?:\?.*)?$/i
const RESULT_URL = /\/cpns\/dashboard\/tryout\/[0-9a-f-]{36}\/result(?:\?.*)?$/i
const NAVIGATION_OPTIONS = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

async function waitForInteractivePreview(page: Page) {
  // Vercel Preview may finish DOMContentLoaded before the client bundle has
  // hydrated the server-rendered controls. Network idle gives React/Next enough
  // time to attach event handlers without making navigation depend on `load`.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined)
}

async function expectDashboardTokenBalance(page: Page, balance: number) {
  const dashboard = page.getByTestId('cpns-dashboard-ready')
  await expect(dashboard).toBeVisible()

  const accessCard = dashboard.locator('article').filter({ hasText: 'Akses tryout' }).first()
  await expect(accessCard).toBeVisible()
  await expect(accessCard).toContainText(String(balance))
  await expect(accessCard).toContainText('token tersisa')
}

async function expectListingTokenBalance(page: Page, balance: number) {
  const tokenLabel = page.getByText('Saldo token', { exact: true }).first()
  await expect(tokenLabel).toBeVisible()
  await expect(tokenLabel.locator('..')).toContainText(String(balance))
}

async function openTokenDialog(page: Page, startButton: Locator) {
  await waitForInteractivePreview(page)
  await expect(startButton).toBeVisible()
  await expect(startButton).toBeEnabled()
  await startButton.click()

  const dialog = page.getByRole('dialog')
  try {
    await dialog.waitFor({ state: 'attached', timeout: 3_000 })
  } catch {
    // A click issued during the last hydration edge can be dropped. Repeating
    // the pre-confirmation click is safe because no mutation happens until the
    // explicit token confirmation below.
    await startButton.click()
  }

  await expect(dialog).toBeVisible({ timeout: 10_000 })
  return dialog
}

async function confirmOneToken(dialog: Locator, currentBalance: number, balanceAfter: number) {
  await expect(dialog.getByText('Konfirmasi Token')).toBeVisible()
  await expect(dialog.getByText(String(currentBalance), { exact: true })).toBeVisible()
  await expect(dialog.getByText(String(balanceAfter), { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: /Gunakan 1 Token/i }).click()
}

test.describe('CPNS SKD release-candidate', () => {
  // This suite mutates one disposable wallet/attempt state sequentially.
  // Retrying an individual stateful test would inherit mutations from the
  // failed try and invalidate exactly-once token assertions.
  test.describe.configure({ retries: 0, mode: 'serial' })

  test('dashboard uses canonical track/wallet state', async ({ page }) => {
    await page.goto('/cpns/dashboard', NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(/\/cpns\/dashboard(?:\?.*)?$/)
    await expect(page.getByRole('heading', { name: 'Apa yang sebaiknya kamu kerjakan hari ini?', exact: true })).toBeVisible()
    await expectDashboardTokenBalance(page, 3)
  })

  test('full lifecycle, mini tryout, and drill preserve state and charge exactly once', async ({ page }) => {
    test.setTimeout(180_000)

    // FULL TRYOUT: 3 -> 2 tokens.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Uji kesiapanmu dalam satu sesi penuh.', exact: true })).toBeVisible()
    await expectListingTokenBalance(page, 3)

    const fullStartButton = page.getByRole('button', { name: 'Mulai Full Tryout', exact: true })
    const fullDialog = await openTokenDialog(page, fullStartButton)
    await expect(fullDialog.getByText('Mulai Full Tryout SKD?')).toBeVisible()
    await confirmOneToken(fullDialog, 3, 2)

    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    const fullSessionUrl = page.url()
    await expect(page.getByText('Soal 1', { exact: true })).toBeVisible()
    await expect(page.getByText('dari 110', { exact: true })).toBeVisible()

    // Answer question 1 and wait for the Next.js server action response.
    const firstOption = page.locator('button').filter({ hasText: /^A/ }).first()
    await expect(firstOption).toBeVisible()
    const answerSaved = page.waitForResponse((response) => {
      const request = response.request()
      return request.method() === 'POST'
        && Boolean(request.headers()['next-action'])
        && response.url().includes('/cpns/dashboard/tryout/')
    }, { timeout: 20_000 })
    await firstOption.click()
    const answerResponse = await answerSaved
    expect(answerResponse.ok()).toBeTruthy()
    await expect(firstOption).toHaveClass(/border-blue-600/)

    // A real reload must restore the selected answer from the server, not only
    // from client state/localStorage.
    await page.reload(NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(fullSessionUrl)
    const persistedFirstOption = page.locator('button').filter({ hasText: /^A/ }).first()
    await expect(persistedFirstOption).toHaveClass(/border-blue-600/)

    // Returning to listing shows the one-token debit and active resume state.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expectListingTokenBalance(page, 2)
    const resumeButton = page.getByRole('button', { name: 'Lanjutkan Full Tryout', exact: true })
    await expect(resumeButton).toBeVisible()
    await waitForInteractivePreview(page)
    await resumeButton.click()
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(fullSessionUrl)

    // Resume is free/idempotent: balance remains 2.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expectListingTokenBalance(page, 2)
    await waitForInteractivePreview(page)
    await page.getByRole('button', { name: 'Lanjutkan Full Tryout', exact: true }).click()
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)

    // Finish with unanswered questions allowed, then verify result + review.
    await page.getByRole('button', { name: '110', exact: true }).click()
    await expect(page.getByText('Soal 110', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()

    const finishPrompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
    await expect(finishPrompt).toBeVisible()
    await finishPrompt.locator('..').getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()

    await page.waitForURL(RESULT_URL, { ...NAVIGATION_OPTIONS, timeout: 60_000 })
    await expect(page.getByRole('heading', { name: /Hasilnya sudah jelas|Sesi selesai/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Pahami jawabanmu satu per satu.', exact: true })).toBeVisible()
    await expect(page.getByText('Jawaban kamu', { exact: true }).first()).toBeVisible()

    // MINI TRYOUT TWK: 2 -> 1 token, start a real session, then exit/resume-save.
    await page.goto('/cpns/dashboard/mini-tryout', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Uji satu bagian sebelum mencoba sesi penuh.', exact: true })).toBeVisible()
    await expectListingTokenBalance(page, 2)
    const miniStartButton = page.getByRole('button', { name: 'Mulai TWK', exact: true })
    const miniDialog = await openTokenDialog(page, miniStartButton)
    await expect(miniDialog.getByText('Mulai Mini Tryout TWK?')).toBeVisible()
    await confirmOneToken(miniDialog, 2, 1)
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page.getByText('Soal 1', { exact: true })).toBeVisible()

    await waitForInteractivePreview(page)
    await page.getByRole('button', { name: 'Keluar Mini Tryout', exact: true }).click()
    await expect(page.getByText('Keluar Mini Tryout?', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Keluar', exact: true }).click()
    await page.waitForURL(/\/cpns\/dashboard\/mini-tryout(?:\?.*)?$/, NAVIGATION_OPTIONS)
    await expect(page.getByRole('button', { name: 'Lanjutkan TWK', exact: true })).toBeVisible()

    // LATIHAN FOKUS: choose the first material with >=30 published questions; 1 -> 0.
    await page.goto('/cpns/dashboard/drilling-materi', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Perkuat materi yang paling perlu kamu kuasai.', exact: true })).toBeVisible()
    await waitForInteractivePreview(page)

    const drillButtons = page.getByRole('button', { name: 'Mulai Latihan Fokus', exact: true })
    const drillCount = await drillButtons.count()
    let drillStartButton: Locator | null = null
    for (let index = 0; index < drillCount; index += 1) {
      const candidate = drillButtons.nth(index)
      if (await candidate.isEnabled()) {
        drillStartButton = candidate
        break
      }
    }
    expect(drillStartButton, 'Expected at least one Latihan Fokus material with >=30 published questions').not.toBeNull()

    const drillDialog = await openTokenDialog(page, drillStartButton!)
    await expect(drillDialog.getByText(/^Mulai Latihan Fokus /).first()).toBeVisible()
    await confirmOneToken(drillDialog, 1, 0)
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page.getByText('Soal 1', { exact: true })).toBeVisible()

    // Final wallet state proves all three new-session debits happened once.
    await page.goto('/cpns/dashboard', NAVIGATION_OPTIONS)
    await expectDashboardTokenBalance(page, 0)
  })
})
