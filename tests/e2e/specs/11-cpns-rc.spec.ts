import { expect, test, type Locator, type Page } from '@playwright/test'
import { verifySignoutConfirmation } from '../pages/SignoutConfirmation'
import { verifyProfileSettingsDialogs } from '../pages/ProfileSettings'
import { verifyExamDialogs } from '../pages/ExamDialogs'

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

  test('learner signout supports keyboard cancellation and failed pending requests', async ({
    page,
  }, testInfo) => {
    await verifySignoutConfirmation(page, '/cpns/dashboard', 'cpns', testInfo)
  })

  test('dashboard uses canonical track/wallet state', async ({ page }) => {
    await page.goto('/cpns/dashboard', NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(/\/cpns\/dashboard(?:\?.*)?$/)
    await expect(
      page.getByRole('heading', {
        name: 'Apa yang sebaiknya kamu kerjakan hari ini?',
        exact: true,
      }),
    ).toBeVisible()
    await expectDashboardTokenBalance(page, 3)
  })

  test('learner work surfaces remain visibly rendered with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of [
      '/cpns/dashboard/tryout',
      '/cpns/dashboard/mini-tryout',
      '/cpns/dashboard/drilling-materi',
      '/cpns/dashboard/profile?tab=settings',
    ]) {
      await page.goto(path, NAVIGATION_OPTIONS)
      const heading = page.getByRole('heading', { level: 1 }).first()
      await expect(heading).toBeVisible()
      // Visibility alone accepts opacity:0; inspect every ancestor of the real heading.
      expect(
        await heading.evaluate((element) => {
          for (let node: Element | null = element; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none')
              return false
          }
          return true
        }),
      ).toBe(true)
    }
  })

  test('token confirmation stays reachable on short mobile screens and cancels without charging', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 568 })
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await page.evaluate(() => {
      document.body.style.overflow = 'clip'
    })
    const start = page.getByRole('button', { name: 'Mulai Full Tryout', exact: true })
    const dialog = await openTokenDialog(page, start)
    await expect(dialog).toHaveAccessibleName('Konfirmasi Token')
    await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeFocused()
    const box = await dialog.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeGreaterThanOrEqual(16)
    expect(box!.y + box!.height).toBeLessThanOrEqual(552)
    await expect(
      dialog.getByRole('heading', { name: 'Konfirmasi Token', exact: true }),
    ).toBeInViewport()
    const confirm = dialog.getByRole('button', { name: /Gunakan 1 Token/i })
    await expect(confirm).toBeInViewport()
    expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Shift+Tab')
    await expect(
      dialog.getByRole('region', { name: 'Ringkasan sesi dan token', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(dialog.getByRole('button', { name: 'Tutup dialog', exact: true })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(confirm).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(dialog.getByRole('button', { name: 'Tutup dialog', exact: true })).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath('token-confirmation-mobile.png') })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(start).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('clip')
    await expectListingTokenBalance(page, 3)
    await expect(start).not.toHaveAttribute('data-press-lock', 'true')
    await openTokenDialog(page, start)
    await page.mouse.click(2, 2)
    await expect(dialog).not.toBeVisible()
    await expect(start).toBeFocused()
    await page.reload(NAVIGATION_OPTIONS)
    await expectListingTokenBalance(page, 3)
    // Hold a request in the browser, before it can reach the server or charge tokens.
    let pendingRequest: import('@playwright/test').Route | undefined
    await page.route('**/cpns/dashboard/tryout', async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        pendingRequest = route
        return
      }
      await route.continue()
    })
    try {
      await openTokenDialog(page, start)
      await dialog.getByRole('button', { name: /Gunakan 1 Token/i }).click()
      await expect(dialog.getByRole('button', { name: 'Memulai...', exact: true })).toBeDisabled()
      await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      await page.mouse.click(2, 2)
      await expect(dialog).toBeVisible()
      await expect.poll(() => Boolean(pendingRequest)).toBe(true)
      await pendingRequest!.abort('failed')
      pendingRequest = undefined
      await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeEnabled()
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
      await expect(dialog).not.toBeVisible()
    } finally {
      await pendingRequest?.abort('failed')
      await page.unroute('**/cpns/dashboard/tryout')
    }
    await page.reload(NAVIGATION_OPTIONS)
    await expectListingTokenBalance(page, 3)
  })

  test('profile dialogs explain validation and clear cancelled destructive confirmation', async ({
    page,
  }, testInfo) => {
    await verifyProfileSettingsDialogs(page, '/cpns/dashboard/profile?tab=settings', testInfo)
  })

  test('full lifecycle, mini tryout, and drill preserve state and charge exactly once', async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000)

    // FULL TRYOUT: 3 -> 2 tokens.
    await page.goto('/cpns/dashboard/tryout', NAVIGATION_OPTIONS)
    await expect(
      page.getByRole('heading', { name: 'Uji kesiapanmu dalam satu sesi penuh.', exact: true }),
    ).toBeVisible()
    await expectListingTokenBalance(page, 3)

    const fullStartButton = page.getByRole('button', { name: 'Mulai Full Tryout', exact: true })
    const fullDialog = await openTokenDialog(page, fullStartButton)
    await expect(fullDialog.getByText('Mulai Full Tryout SKD?')).toBeVisible()
    await confirmOneToken(fullDialog, 3, 2)

    await page.waitForURL(SESSION_URL, NAVIGATION_OPTIONS)
    const fullSessionUrl = page.url()
    await expect(page.getByText('Soal 1', { exact: true })).toBeVisible()
    await expect(page.getByText('dari 110', { exact: true })).toBeVisible()
    await verifyExamDialogs(page, testInfo)

    // Answer question 1 and wait for the Next.js server action response.
    // Locator berbasis data-testid, bukan teks tombol: filter teks /^A/ cocok
    // dengan tombol apa pun yang diawali "A" dan rapuh terhadap perubahan copy.
    const firstOption = page.getByTestId('answer-option-0').first()
    await expect(firstOption).toBeVisible()
    const answerSaved = page.waitForResponse(
      (response) => {
        const request = response.request()
        return (
          request.method() === 'POST' &&
          Boolean(request.headers()['next-action']) &&
          response.url().includes('/cpns/dashboard/tryout/')
        )
      },
      { timeout: 20_000 },
    )
    await firstOption.click()
    const answerResponse = await answerSaved
    expect(answerResponse.ok()).toBeTruthy()
    await expect(firstOption).toHaveClass(/border-blue-600/)

    // A real reload must restore the selected answer from the server, not only
    // from client state/localStorage.
    await page.reload(NAVIGATION_OPTIONS)
    await expect(page).toHaveURL(fullSessionUrl)
    const persistedFirstOption = page.getByTestId('answer-option-0').first()
    await expect(persistedFirstOption).toHaveClass(/border-blue-600/)

    // Real browser offline/online events, with multiple edits while disconnected.
    // The acknowledged A remains on the server; reconnect must save only the
    // latest pending selection before reload, without charging another token.
    const saveActionId = answerResponse.request().headers()['next-action']
    await page.context().setOffline(true)
    try {
      await page.getByTestId('answer-option-2').first().click()
      await expect(page.getByText('Gagal menyimpan jawaban', { exact: true }).first()).toBeVisible()
      await page.getByTestId('answer-option-3').first().click()
      await page.getByTestId('answer-option-2').first().click()
      await expect(page.getByTestId('answer-option-2').first()).toHaveClass(/border-blue-600/)
    } finally {
      const onlineSave = page.waitForResponse(
        (response) => response.request().headers()['next-action'] === saveActionId,
        { timeout: 20_000 },
      )
      await page.context().setOffline(false)
      expect((await onlineSave).ok()).toBeTruthy()
    }
    await page.reload(NAVIGATION_OPTIONS)
    await expect(page.getByTestId('answer-option-2').first()).toHaveClass(/border-blue-600/)

    // A failed latest edit must block manual completion and recover on reconnect.
    let blockedSaves = 0
    let completionActions = 0
    const failAnswerSave = async (route: import('@playwright/test').Route) => {
      const actionId = route.request().headers()['next-action']
      if (actionId === saveActionId) {
        blockedSaves += 1
        await route.abort('failed')
      } else {
        if (actionId) completionActions += 1
        await route.continue()
      }
    }
    await page.route('**/cpns/dashboard/tryout/**', failAnswerSave)
    try {
      await page.getByTestId('answer-option-1').first().click()
      await expect(page.getByText('Gagal menyimpan jawaban', { exact: true }).first()).toBeVisible()
      await page.getByRole('button', { name: 'Buka soal 110', exact: true }).click()
      await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
      await page
        .getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click()
      await expect(
        page.getByText('Jawaban belum berhasil disimpan. Coba lagi sebelum menyelesaikan sesi.', {
          exact: true,
        }),
      ).toBeVisible()
      await expect(page).toHaveURL(fullSessionUrl)
      expect(blockedSaves).toBe(2)
      expect(completionActions).toBe(0)
    } finally {
      await page.unroute('**/cpns/dashboard/tryout/**', failAnswerSave)
    }
    const recoveredSave = page.waitForResponse(
      (response) => response.request().headers()['next-action'] === saveActionId,
      { timeout: 20_000 },
    )
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    expect((await recoveredSave).ok()).toBeTruthy()
    await page.reload(NAVIGATION_OPTIONS)
    await page.getByRole('button', { name: /^Buka soal 1(?:,|$)/ }).click()
    await expect(page.getByTestId('answer-option-1').first()).toHaveClass(/border-blue-600/)

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
    // Navigator punya aria-label eksplisit (`Buka soal <n>`), bukan hanya angka.
    await page.getByRole('button', { name: 'Buka soal 110', exact: true }).click()
    await expect(page.getByText('Soal 110', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()

    const finishPrompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
    await expect(finishPrompt).toBeVisible()
    await finishPrompt
      .locator('..')
      .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
      .click()

    await page.waitForURL(RESULT_URL, { ...NAVIGATION_OPTIONS, timeout: 60_000 })
    await expect(
      page.getByRole('heading', { name: /Hasilnya sudah jelas|Sesi selesai/i }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Pahami jawabanmu satu per satu.', exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Jawaban kamu', { exact: true }).first()).toBeVisible()

    // MINI TRYOUT TWK: 2 -> 1 token, start a real session, then exit/resume-save.
    await page.goto('/cpns/dashboard/mini-tryout', NAVIGATION_OPTIONS)
    await expect(
      page.getByRole('heading', {
        name: 'Uji satu bagian sebelum mencoba sesi penuh.',
        exact: true,
      }),
    ).toBeVisible()
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
    await expect(
      page.getByRole('heading', {
        name: 'Perkuat materi yang paling perlu kamu kuasai.',
        exact: true,
      }),
    ).toBeVisible()
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
    expect(
      drillStartButton,
      'Expected at least one Latihan Fokus material with >=30 published questions',
    ).not.toBeNull()

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
