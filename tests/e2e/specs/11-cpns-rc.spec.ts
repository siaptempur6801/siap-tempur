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

async function expectTicketBalance(page: Page, balance: number) {
  const ticketLink = page.getByRole('link').filter({ hasText: 'Tiket Sisa' }).first()
  await expect(ticketLink).toBeVisible()
  await expect(ticketLink.getByText(String(balance), { exact: true })).toBeVisible()
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
    await expect(page.getByText('Siap Tempur')).toBeVisible()
    await expectTicketBalance(page, 3)
    await expect(page.getByRole('heading', { name: 'Mulai Tryout', exact: true })).toBeVisible()
  })

  test('full lifecycle, mini tryout, and drill preserve state and charge exactly once', async ({ page }) => {
    test.setTimeout(180_000)

    // FULL TRYOUT: 3 -> 2 tokens.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Siap Tryout Hari Ini?' })).toBeVisible()
    await expect(page.getByText('3 Tiket', { exact: true })).toBeVisible()

    const fullStartButton = page.getByRole('button', { name: /Mulai Tryout/i })
    const fullDialog = await openTokenDialog(page, fullStartButton)
    await expect(fullDialog.getByText('Mulai Full Tryout SKD?')).toBeVisible()
    await confirmOneToken(fullDialog, 3, 2)

    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    const fullSessionUrl = page.url()
    await expect(page.getByText('Soal #1', { exact: true })).toBeVisible()

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
    await expect(page.getByText('2 Tiket', { exact: true })).toBeVisible()
    const resumeButton = page.getByRole('button', { name: /Lanjutkan Tryout/i })
    await expect(resumeButton).toBeVisible()
    await waitForInteractivePreview(page)
    await resumeButton.click()
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(fullSessionUrl)

    // Resume is free/idempotent: balance remains 2.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(page.getByText('2 Tiket', { exact: true })).toBeVisible()
    await waitForInteractivePreview(page)
    await page.getByRole('button', { name: /Lanjutkan Tryout/i }).click()
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)

    // Finish with unanswered questions allowed, then verify result + review.
    await page.getByRole('button', { name: '110', exact: true }).click()
    await expect(page.getByText('Soal #110', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Selesai & Hitung', exact: true }).click()
    await expect(page.getByText('Selesaikan Tryout?', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Siap Tempur!', exact: true }).click()
    await page.waitForURL(RESULT_URL, { ...NAVIGATION_OPTIONS, timeout: 60_000 })
    await expect(page.getByRole('heading', { name: /Sesi Selesai!|Masih Bisa Ditingkatkan/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review Jawaban', exact: true })).toBeVisible()
    await expect(page.getByText('Pembahasan dan answer key baru dikirim setelah attempt selesai.')).toBeVisible()
    await expect(page.getByText('Pilihan Anda', { exact: true }).first()).toBeVisible()

    // MINI TRYOUT TWK: 2 -> 1 token, start a real session, then exit/resume-save.
    await page.goto('/cpns/dashboard/mini-tryout', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Latihan Fokus TWK, TIU, dan TKP' })).toBeVisible()
    const miniStartButton = page.getByRole('button', { name: 'Mulai TWK', exact: true })
    const miniDialog = await openTokenDialog(page, miniStartButton)
    await expect(miniDialog.getByText('Mulai Mini Tryout TWK?')).toBeVisible()
    await confirmOneToken(miniDialog, 2, 1)
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page.getByText('Soal #1', { exact: true })).toBeVisible()

    await waitForInteractivePreview(page)
    await page.getByRole('button', { name: 'Keluar Mini Tryout', exact: true }).click()
    await expect(page.getByText('Keluar Mini Tryout?', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Keluar', exact: true }).click()
    await page.waitForURL(/\/cpns\/dashboard\/mini-tryout(?:\?.*)?$/, NAVIGATION_OPTIONS)
    await expect(page.getByRole('button', { name: 'Lanjutkan TWK', exact: true })).toBeVisible()

    // DRILL: choose the first material with >=30 published questions; 1 -> 0.
    await page.goto('/cpns/dashboard/drilling-materi', NAVIGATION_OPTIONS)
    await expect(page.getByRole('heading', { name: 'Latihan Materi yang Mau Kamu Kuasai' })).toBeVisible()
    await waitForInteractivePreview(page)

    const drillButtons = page.getByRole('button', { name: 'Mulai Drilling', exact: true })
    const drillCount = await drillButtons.count()
    let drillStartButton: Locator | null = null
    for (let index = 0; index < drillCount; index += 1) {
      const candidate = drillButtons.nth(index)
      if (await candidate.isEnabled()) {
        drillStartButton = candidate
        break
      }
    }
    expect(drillStartButton, 'Expected at least one drilling material with >=30 published questions').not.toBeNull()

    const drillDialog = await openTokenDialog(page, drillStartButton!)
    await expect(drillDialog.getByText(/^Mulai Drilling /)).toBeVisible()
    await confirmOneToken(drillDialog, 1, 0)
    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    await expect(page.getByText('Soal #1', { exact: true })).toBeVisible()

    // Final wallet state proves all three new-session debits happened once.
    await page.goto('/cpns/dashboard', NAVIGATION_OPTIONS)
    await expectTicketBalance(page, 0)
  })
})
