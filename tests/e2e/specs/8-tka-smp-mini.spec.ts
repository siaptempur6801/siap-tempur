import { expect, test, type Page } from '@playwright/test'
import {
  freshDisposableTkaSession,
  readOwnTkaLearningProjection,
  readOwnTkaWrongQuestionState,
  type DisposableTkaSession,
} from '../tka.ci'
import { readOwnTkaReadiness } from '../tka-readiness.ci'
import { confirmTkaSectionIfPresent, dismissSessionReward } from '../pages/TkaExamActions'

async function examCard(page: Page, title: string) {
  const card = page.locator('article').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  })
  await expect(card).toBeVisible()
  return card
}

async function answerFirstVisibleOption(page: Page) {
  const questionCard = page.locator('article').last()
  const firstOption = questionCard.getByRole('button').first()
  await expect(firstOption).toBeVisible()
  await firstOption.click()
}

async function assertNoDocumentOverflow(page: Page) {
  const report = await page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const documentWidth = document.documentElement.scrollWidth
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className.slice(0, 180) : '',
          text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
          width: Math.round(rect.width * 10) / 10,
        }
      })
      .filter((item) => item.width > 0 && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 12)
    return { viewportWidth, documentWidth, offenders }
  })
  expect(report.documentWidth, JSON.stringify(report, null, 2)).toBeLessThanOrEqual(
    report.viewportWidth + 1,
  )
}

async function assertHistoryOpensResult(page: Page, examTitle: string) {
  const history = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Pilih sesi untuk melanjutkan atau melihat hasil',
      exact: true,
    }),
  })
  await expect(history).toBeVisible()
  const entry = history.getByRole('link').filter({ hasText: examTitle }).first()
  await expect(entry).toBeVisible()
  await entry.click()
  await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result$/i)
  await expect(
    page.getByRole('heading', {
      name: 'Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Kembali ke Tryout', exact: true }).click()
  await page.waitForURL(/\/tka\/smp\/tryout(?:\?.*)?$/)
}

async function assertMiniProjection(session: DisposableTkaSession) {
  const projection = await readOwnTkaLearningProjection(session)
  expect(projection.knowledge.length).toBeGreaterThan(0)
  expect(projection.knowledge.reduce((sum, row) => sum + row.attempted_questions, 0)).toBe(15)
  expect(projection.subjects).toHaveLength(1)
  expect(projection.subjects[0]?.attempts).toBe(1)
  expect(projection.subjects[0]?.questions_answered).toBe(1)
  for (const row of projection.knowledge) {
    expect(row.mastery_score).toBeGreaterThanOrEqual(0)
    expect(row.mastery_score).toBeLessThanOrEqual(1)
    expect(['needs_work', 'developing', 'proficient', 'mastered']).toContain(row.mastery_level)
  }
}

async function assertProgressDashboard(
  page: Page,
  session: DisposableTkaSession,
  examTitle: string,
) {
  const readiness = await readOwnTkaReadiness(session)
  const openWrong = await readOwnTkaWrongQuestionState(session)

  const progressLink = page.getByRole('link', { name: /Perkembangan|Progress/i }).first()
  await expect(progressLink).toBeVisible()
  await progressLink.click()
  await page.waitForURL(/\/tka\/smp\/progress$/i)

  await expect(
    page.getByRole('heading', { name: 'Perkembangan belajar TKA SMP', exact: true }),
  ).toBeVisible()
  const readinessCard = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Kesiapan TKA SMP', exact: true }) })
  await expect(readinessCard).toBeVisible()
  await expect(readinessCard).toContainText(`${readiness.readiness_percent.toFixed(1)}%`)

  const completedCard = page.locator('article').filter({ hasText: 'Tryout selesai' }).first()
  await expect(completedCard).toContainText('1')
  const gapCard = page.locator('article').filter({ hasText: 'Soal perlu diulang' }).first()
  await expect(gapCard).toContainText(String(openWrong.length))

  await expect(
    page.getByRole('heading', { name: 'Lihat kekuatan tiap mata pelajaran', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('BIN', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('MAT', { exact: true }).first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Fokus belajar berikutnya', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(examTitle, { exact: true })).toBeVisible()
  await expect(page.getByText('Langkah berikutnya', { exact: true })).toBeVisible()
  await assertNoDocumentOverflow(page)
}

async function finishMini(page: Page, expectedSubject: string) {
  await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
  await expect(page.getByText('TKA SMP · Mini Tryout')).toBeVisible()
  await expect(page.getByRole('heading', { name: expectedSubject, exact: true })).toBeVisible()
  await expect(page.getByText('Soal 1 dari 15')).toBeVisible()
  await expect(page.getByText(/Terjawab total:/)).toContainText('0/15')
  await assertNoDocumentOverflow(page)

  await answerFirstVisibleOption(page)
  await page.getByRole('button', { name: 'Tandai untuk ditinjau', exact: true }).click()
  await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/15')
  await page.waitForTimeout(800)

  // Browser reload proves answer + flag resume from the persisted attempt state.
  await page.reload()
  await expect(page.getByRole('heading', { name: expectedSubject, exact: true })).toBeVisible()
  await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/15')
  await expect(page.getByRole('button', { name: 'Ditandai', exact: true })).toBeVisible()

  const navigator = page.locator('aside')
  await navigator.getByRole('button', { name: 'Buka soal 15', exact: true }).click()
  await expect(page.getByText('Soal 15 dari 15')).toBeVisible()

  await page.getByRole('button', { name: 'Kirim tryout', exact: true }).click()
  await confirmTkaSectionIfPresent(page)

  await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result(?:\?.*)?$/i, { timeout: 20_000 })
  await expect(
    page.getByRole('heading', {
      name: 'Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.',
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Tinjau jawaban satu per satu', exact: true }),
  ).toBeVisible()
  await dismissSessionReward(page)
  await expect(page.getByText('Mini Tryout · TKA/SMP')).toBeVisible()
  await expect(page.getByText(/1\/15/).first()).toBeVisible()
}

test.describe.serial('TKA SMP Mini Tryout core', () => {
  test('Focus page drill starts once across two tabs, autosaves, resumes, and completes', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const learner = await freshDisposableTkaSession(page)
    await page.goto('/tka/smp/focus')
    const card = page.getByTestId('tka-learning-hierarchy').filter({ hasText: /Aljabar/i })
    await expect(card).toBeVisible()
    await expect(card.getByText('Aljabar', { exact: true }).first()).toBeVisible()
    const twinPage = await page.context().newPage()
    await twinPage.goto('/tka/smp/focus')
    const twinCard = twinPage.getByTestId('tka-learning-hierarchy').filter({ hasText: /Aljabar/i })
    await expect(twinCard).toBeVisible()
    await Promise.all([
      card.getByRole('button', { name: 'Latih topik Aljabar' }).click(),
      twinCard.getByRole('button', { name: 'Latih topik Aljabar' }).click(),
    ])
    await Promise.all([
      page.getByRole('button', { name: 'Gunakan 1 Token TKA', exact: true }).click(),
      twinPage.getByRole('button', { name: 'Gunakan 1 Token TKA', exact: true }).click(),
    ])
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    await twinPage.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    const attemptId = page.url().match(/\/tryout\/([0-9a-f-]+)$/i)?.[1]
    expect(attemptId).toBeTruthy()
    expect(twinPage.url().match(/\/tryout\/([0-9a-f-]+)$/i)?.[1]).toBe(attemptId)
    await expect(page.getByText(/Soal 1 dari 10/)).toBeVisible()

    const firstOption = page.locator('article').last().getByRole('button').first()
    await firstOption.click()
    await expect(page.getByText(/Terjawab total:/)).toContainText('1/10')

    await page.reload()
    await expect(page.getByText(/Soal 1 dari 10/)).toBeVisible()
    await expect(page.locator('article').last().getByRole('button').first()).toHaveAttribute(
      'data-selected',
      'true',
    )
    await expect(page.getByText(/Terjawab total:/)).toContainText('1/10')

    for (let index = 1; index < 10; index += 1) {
      await page.getByRole('button', { name: 'Selanjutnya', exact: true }).click()
    }
    await expect(page.getByText(/Soal 10 dari 10/)).toBeVisible()
    await twinPage.goto(`/tka/smp/tryout/${attemptId}`)
    await twinPage.getByRole('button', { name: /^Buka soal 10/ }).click()
    await expect(twinPage.getByText(/Soal 10 dari 10/)).toBeVisible()
    await Promise.all([
      page.getByRole('button', { name: 'Kirim tryout', exact: true }).click(),
      twinPage.getByRole('button', { name: 'Kirim tryout', exact: true }).click(),
    ])
    await Promise.all([confirmTkaSectionIfPresent(page), confirmTkaSectionIfPresent(twinPage)])
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result(?:\?.*)?$/i, { timeout: 30_000 })
    await twinPage.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result(?:\?.*)?$/i, {
      timeout: 30_000,
    })
    await twinPage.close()
    expect(learner.userId).toBeTruthy()
  })

  test('SD & SMA aktif: pengunjung anonim diarahkan ke login dan tetap aman di mobile', async ({
    browser,
  }) => {
    // Kebijakan 2026-09-17: SD dan SMA bukan lagi "coming soon" — keduanya permukaan aplikasi
    // sehingga pengunjung anonim diarahkan ke login (sama seperti SMP).
    for (const level of ['sd', 'sma']) {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      const page = await context.newPage()
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/tka/${level}`)

      await expect(page).toHaveURL(new RegExp(`/login\\?returnTo=%2Ftka%2F${level}$`, 'i'))
      await assertNoDocumentOverflow(page)
      await context.close()
    }
  })

  test('Bahasa Indonesia: mobile resume, result, history, projection, dashboard, and token debit', async ({
    page,
  }) => {
    test.setTimeout(150_000)
    const session = await freshDisposableTkaSession(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tka/smp')

    await expect(page.getByTestId('tka-track-active')).toBeVisible()
    await page.goto('/tka/smp/focus')
    const hierarchy = page.getByTestId('tka-learning-hierarchy')
    await expect(hierarchy).toBeVisible()
    await expect(
      hierarchy.getByRole('heading', { name: 'Pilih mata pelajaran, lalu materi', exact: true }),
    ).toBeVisible()
    await expect(hierarchy.getByTestId('tka-subject-bin')).toContainText('Bahasa Indonesia')
    await expect(hierarchy.getByTestId('tka-subject-mat')).toContainText('Matematika')
    await expect(hierarchy.getByText('Pemahaman Tekstual', { exact: true })).toBeVisible()
    await expect(hierarchy.getByText('Bilangan', { exact: true })).toBeVisible()
    await expect(hierarchy.getByRole('button', { name: /Latih topik/i }).first()).toBeVisible()
    await page.goto('/tka/smp/mini-tryout')
    const card = await examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
    await expect(card.getByText('35 menit')).toBeVisible()
    await expect(card.getByText(/1 token per sesi baru/)).toBeVisible()
    await assertNoDocumentOverflow(page)

    const startButton = card.getByRole('button', { name: /Mulai Mini Tryout · 1 token/ })
    await expect(startButton).toBeEnabled()
    await startButton.click()
    await page.getByRole('button', { name: 'Gunakan 1 Token TKA', exact: true }).click()
    await finishMini(page, 'Bahasa Indonesia')
    await assertMiniProjection(session)
    await assertProgressDashboard(page, session, 'Mini Tryout Bahasa Indonesia TKA SMP')

    await page.goto('/tka/smp/riwayat')
    await assertHistoryOpensResult(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
    await page.goto('/tka/smp/mini-tryout')
    const usedCard = await examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
    await expect(
      usedCard.getByRole('button', { name: /Mulai Mini Tryout · 1 token/ }),
    ).toBeEnabled()
    await expect(page.getByRole('region', { name: 'Informasi token TKA' })).toContainText(
      'Saldo kamu 49 token',
    )

    await page.goto('/tka/smp?error=Tahun+target+tidak+valid.')
    await expect(page.getByText('Tahun target tidak valid.')).toBeVisible()
    await assertNoDocumentOverflow(page)
  })

  test('Matematika: tablet resume, result, history, projection, and token debit', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const session = await freshDisposableTkaSession(page)
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/tka/smp')

    await expect(page.getByTestId('tka-track-active')).toBeVisible()
    await page.goto('/tka/smp/mini-tryout')
    const card = await examCard(page, 'Mini Tryout Matematika TKA SMP')
    await expect(card.getByText('35 menit')).toBeVisible()
    await expect(card.getByText(/1 token per sesi baru/)).toBeVisible()
    await assertNoDocumentOverflow(page)

    const startButton = card.getByRole('button', { name: /Mulai Mini Tryout · 1 token/ })
    await expect(startButton).toBeEnabled()
    await startButton.click()
    await page.getByRole('button', { name: 'Gunakan 1 Token TKA', exact: true }).click()
    await finishMini(page, 'Matematika')
    await assertMiniProjection(session)

    await page.goto('/tka/smp/riwayat')
    await assertHistoryOpensResult(page, 'Mini Tryout Matematika TKA SMP')
    await page.goto('/tka/smp/mini-tryout')
    const usedCard = await examCard(page, 'Mini Tryout Matematika TKA SMP')
    await expect(
      usedCard.getByRole('button', { name: /Mulai Mini Tryout · 1 token/ }),
    ).toBeEnabled()
    await expect(page.getByRole('region', { name: 'Informasi token TKA' })).toContainText(
      'Saldo kamu 49 token',
    )
    await assertNoDocumentOverflow(page)
  })

  test('unauthenticated learner is redirected to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/tka/smp')
    await page.waitForURL(/\/login\?returnTo=%2Ftka%2Fsmp/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await context.close()
  })
})
