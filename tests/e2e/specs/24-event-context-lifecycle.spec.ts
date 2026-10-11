import {
  createWorkflowEvent,
  waitForSavedFirstAnswer,
  finishFullTkaSection,
} from '../admin-workflow'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser } from '../admin-roles'

const authMetadataPath = path.join(process.cwd(), 'playwright/.auth/cpns-user-meta.json')
const attemptUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const resultUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const tkaAttemptUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const tkaResultUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const nav = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

function wibInput(minutesFromNow: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + minutesFromNow * 60_000))
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}

async function createEventWithSession(
  page: Page,
  title: string,
  code: string,
  examId: string,
  onCreated: (eventId: string) => void,
  program = 'CPNS',
  track = 'SKD',
) {
  const eventId = await createWorkflowEvent(page, title, code, examId, program, track, wibInput)
  onCreated(eventId)
  return eventId
}

test.describe.configure({ mode: 'serial', retries: 0 })

test('Event Direct isolation, Event A/B isolation, resume, result, and leaderboard use the Event attempt', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey)
    throw new Error('Event lifecycle E2E requires staging service credentials.')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  if (projectRef !== 'lpgrivowdcepcxradavu')
    throw new Error(`Event E2E blocked for non-staging project ${projectRef}.`)

  const participant = JSON.parse(readFileSync(authMetadataPath, 'utf8')) as {
    userId: string
    email: string
  }
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
  const eventAName = `[QA] Event A ${suffix}`
  const eventBName = `[QA] Event B ${suffix}`
  const tkaEventName = `[QA] Event TKA SMP ${suffix}`
  const eventACode = `QA-EVENT-A-${suffix}`
  const eventBCode = `QA-EVENT-B-${suffix}`
  const tkaEventCode = `QA-EVENT-TKA-${suffix}`
  let adminUserId = ''
  let eventAId = ''
  let eventBId = ''
  let tkaEventId = ''
  let tkaExamId = ''
  let directAttemptId = ''
  let eventAAttemptId = ''
  let eventBAttemptId = ''
  let tkaEventAttemptId = ''
  const createdEventIds: string[] = []
  let adminContext: Awaited<ReturnType<typeof browser.newContext>> | null = null

  try {
    const { error: walletResetError } = await db.from('wallets').upsert(
      {
        user_id: participant.userId,
        wallet_type: 'exam_token_cpns',
        balance: 3,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,wallet_type' },
    )
    if (walletResetError) throw walletResetError

    // Race two Direct starts for the same user and assessment. Both tabs
    // must converge on the one canonical attempt and debit the token once.
    await page.goto('/cpns/dashboard/tryout', nav)
    const twinDirectStartPage = await page.context().newPage()
    await twinDirectStartPage.goto('/cpns/dashboard/tryout', nav)
    await Promise.all([
      page.getByRole('button', { name: 'Mulai Full Tryout', exact: true }).click(),
      twinDirectStartPage.getByRole('button', { name: 'Mulai Full Tryout', exact: true }).click(),
    ])
    const directConfirm = page.getByRole('dialog')
    const twinDirectStartConfirm = twinDirectStartPage.getByRole('dialog')
    await expect(directConfirm).toBeVisible()
    await expect(twinDirectStartConfirm).toBeVisible()
    await Promise.all([
      directConfirm.getByRole('button', { name: /Gunakan 1 Token/i }).click(),
      twinDirectStartConfirm.getByRole('button', { name: /Gunakan 1 Token/i }).click(),
    ])
    await Promise.all([
      page.waitForURL(attemptUrl, nav),
      twinDirectStartPage.waitForURL(attemptUrl, nav),
    ])
    directAttemptId = page.url().match(attemptUrl)?.[1] ?? ''
    expect(twinDirectStartPage.url().match(attemptUrl)?.[1]).toBe(directAttemptId)
    await twinDirectStartPage.close()
    expect(directAttemptId).not.toBe('')
    const { data: directRow, error: directReadError } = await db
      .from('exam_attempts')
      .select('exam_id,status,metadata')
      .eq('id', directAttemptId)
      .single()
    if (directReadError) throw directReadError
    expect(directRow.status.toLowerCase()).toBe('in_progress')
    const { data: walletAfterDirect, error: walletAfterDirectError } = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_cpns')
      .single()
    if (walletAfterDirectError) throw walletAfterDirectError
    expect(Number(walletAfterDirect.balance)).toBe(2)
    const directFirstOption = page.getByTestId('answer-option-0').first()
    await directFirstOption.click()
    await expect(directFirstOption).toHaveClass(/border-blue-600/)

    const adminUser = await provisionRoleUser(supabaseUrl, 'ADMIN')
    adminUserId = adminUser.userId
    adminContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const adminPage = await adminContext.newPage()
    await loginAs(adminPage, adminUser, '/admin/events')
    eventAId = await createEventWithSession(
      adminPage,
      eventAName,
      eventACode,
      directRow.exam_id,
      (id) => createdEventIds.push(id),
    )
    eventBId = await createEventWithSession(
      adminPage,
      eventBName,
      eventBCode,
      directRow.exam_id,
      (id) => createdEventIds.push(id),
    )

    const { data: tkaProgram, error: tkaProgramError } = await db
      .from('programs')
      .select('id')
      .eq('code', 'TKA')
      .single()
    if (tkaProgramError) throw tkaProgramError
    const { data: tkaTrack, error: tkaTrackError } = await db
      .from('tracks')
      .select('id')
      .eq('program_id', tkaProgram.id)
      .eq('code', 'SMP')
      .single()
    if (tkaTrackError) throw tkaTrackError
    const { data: tkaType, error: tkaTypeError } = await db
      .from('exam_types')
      .select('id')
      .eq('code', 'FULL_TRYOUT')
      .single()
    if (tkaTypeError) throw tkaTypeError
    const { data: tkaExam, error: tkaExamError } = await db
      .from('exams')
      .select('id,title,slug,status,token_cost')
      .eq('program_id', tkaProgram.id)
      .eq('track_id', tkaTrack.id)
      .eq('exam_type_id', tkaType.id)
      .in('status', ['active', 'ACTIVE'])
      .eq('slug', 'tka-smp-full')
      .single()
    if (tkaExamError) throw tkaExamError
    tkaExamId = tkaExam.id
    tkaEventId = await createEventWithSession(
      adminPage,
      tkaEventName,
      tkaEventCode,
      tkaExam.id,
      (id) => createdEventIds.push(id),
      'TKA',
      'SMP',
    )
    await adminContext.close()
    adminContext = null

    const registerEvent = async (title: string, questionCount = '110') => {
      await page.goto('/cpns/dashboard/event', nav)
      const card = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
      await expect(card).toContainText(questionCount)
      await card.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click()
      await expect(card.getByText('Terdaftar', { exact: true })).toBeVisible({ timeout: 30_000 })
    }

    const startEvent = async (title: string, targetUrl = attemptUrl) => {
      await page.goto('/cpns/dashboard/event', nav)
      const card = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
      await card.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
      await page.getByRole('button', { name: 'Gas Mulai!', exact: true }).click()
      await expect(page).toHaveURL(targetUrl, { timeout: 30_000 })
      return page.url().match(targetUrl)?.[1] ?? ''
    }

    await registerEvent(eventAName)
    const eventARegistration = await db
      .from('event_registrations')
      .select('id,event_id,session_id')
      .eq('event_id', eventAId)
      .eq('user_id', participant.userId)
      .single()
    if (eventARegistration.error) throw eventARegistration.error
    expect(eventARegistration.data.event_id).toBe(eventAId)
    const eventARegistrationCount = await db
      .from('event_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventAId)
      .eq('user_id', participant.userId)
    if (eventARegistrationCount.error) throw eventARegistrationCount.error
    expect(eventARegistrationCount.count).toBe(1)

    const twinEventPage = await page.context().newPage()
    await twinEventPage.goto('/cpns/dashboard/event', nav)
    const twinEventCard = twinEventPage
      .getByRole('heading', { name: eventAName, exact: true })
      .locator('xpath=../../..')
    await twinEventCard.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
    await page.goto('/cpns/dashboard/event', nav)
    const eventACard = page
      .getByRole('heading', { name: eventAName, exact: true })
      .locator('xpath=../../..')
    await eventACard.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
    await expect(page.getByRole('button', { name: 'Gas Mulai!', exact: true })).toBeVisible()
    await expect(
      twinEventPage.getByRole('button', { name: 'Gas Mulai!', exact: true }),
    ).toBeVisible()
    await Promise.all([
      page.getByRole('button', { name: 'Gas Mulai!', exact: true }).click(),
      twinEventPage.getByRole('button', { name: 'Gas Mulai!', exact: true }).click(),
    ])
    await page.waitForURL(attemptUrl, nav)
    await twinEventPage.waitForURL(attemptUrl, nav)
    eventAAttemptId = page.url().match(attemptUrl)?.[1] ?? ''
    expect(twinEventPage.url().match(attemptUrl)?.[1]).toBe(eventAAttemptId)
    await twinEventPage.close()
    expect(eventAAttemptId).not.toBe(directAttemptId)
    const { data: eventAAttempt, error: eventAReadError } = await db
      .from('exam_attempts')
      .select('exam_id,status,metadata')
      .eq('id', eventAAttemptId)
      .single()
    if (eventAReadError) throw eventAReadError
    expect(eventAAttempt.exam_id).toBe(directRow.exam_id)
    expect(eventAAttempt.status.toLowerCase()).toBe('in_progress')
    expect(eventAAttempt.metadata).toMatchObject({ eventId: eventAId })
    const { data: walletAfterEventA, error: walletAfterEventAError } = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_cpns')
      .single()
    if (walletAfterEventAError) throw walletAfterEventAError
    expect(Number(walletAfterEventA.balance)).toBe(2)
    const eventAFirstOption = page.getByTestId('answer-option-0').first()
    await expect(eventAFirstOption).not.toHaveClass(/border-blue-600/)
    await eventAFirstOption.click()
    await expect(eventAFirstOption).toHaveClass(/border-blue-600/)
    await waitForSavedFirstAnswer(db, eventAAttemptId)
    await page.reload(nav)
    await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)

    await registerEvent(eventBName)
    eventBAttemptId = await startEvent(eventBName)
    expect(eventBAttemptId).not.toBe(directAttemptId)
    expect(eventBAttemptId).not.toBe(eventAAttemptId)
    const { data: eventBAttempt, error: eventBReadError } = await db
      .from('exam_attempts')
      .select('exam_id,status,metadata')
      .eq('id', eventBAttemptId)
      .single()
    if (eventBReadError) throw eventBReadError
    expect(eventBAttempt.exam_id).toBe(directRow.exam_id)
    expect(eventBAttempt.status.toLowerCase()).toBe('in_progress')
    expect(eventBAttempt.metadata).toMatchObject({ eventId: eventBId })
    const { data: walletAfterEventB, error: walletAfterEventBError } = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_cpns')
      .single()
    if (walletAfterEventBError) throw walletAfterEventBError
    expect(Number(walletAfterEventB.balance)).toBe(2)
    await expect(page.getByTestId('answer-option-0').first()).not.toHaveClass(/border-blue-600/)

    // Re-enter Event A while Event B also has an active attempt: it must resume A.
    const resumedEventAId = await startEvent(eventAName)
    expect(resumedEventAId).toBe(eventAAttemptId)
    await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
    const concurrentEventSubmitPage = await page.context().newPage()
    await concurrentEventSubmitPage.goto(`/cpns/dashboard/tryout/${eventAAttemptId}`, nav)
    await concurrentEventSubmitPage.getByRole('button', { name: /^Buka soal 110$/ }).click()
    await page.getByRole('button', { name: /^Buka soal 110$/ }).click()
    await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
    await concurrentEventSubmitPage
      .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
      .click()
    const confirmSubmit = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
    await expect(confirmSubmit).toBeVisible()
    const twinConfirmSubmit = concurrentEventSubmitPage.getByRole('heading', {
      name: 'Kumpulkan jawaban?',
      exact: true,
    })
    await expect(twinConfirmSubmit).toBeVisible()
    await Promise.all([
      confirmSubmit
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
      twinConfirmSubmit
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
    ])
    await page.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentEventSubmitPage.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentEventSubmitPage.close()
    expect(page.url().match(resultUrl)?.[1]).toBe(eventAAttemptId)
    await expect(
      page.getByRole('heading', { name: /Hasilnya sudah jelas|Sesi selesai/i }),
    ).toBeVisible()

    const { data: attempts, error: attemptCheckError } = await db
      .from('exam_attempts')
      .select('id,status,total_score,metadata')
      .in('id', [directAttemptId, eventAAttemptId, eventBAttemptId])
    if (attemptCheckError) throw attemptCheckError
    const byId = new Map((attempts ?? []).map((row) => [row.id, row]))
    expect(String(byId.get(directAttemptId)?.status).toLowerCase()).toBe('in_progress')
    expect(String(byId.get(eventAAttemptId)?.status).toLowerCase()).toBe('completed')
    expect(String(byId.get(eventBAttemptId)?.status).toLowerCase()).toBe('in_progress')
    expect(byId.get(eventAAttemptId)?.metadata).toMatchObject({ eventId: eventAId })

    const { data: ranking, error: rankingError } = await db
      .from('event_rankings')
      .select('event_id,user_id,attempt_id,score')
      .eq('event_id', eventAId)
      .eq('user_id', participant.userId)
      .single()
    if (rankingError) throw rankingError
    expect(ranking.attempt_id).toBe(eventAAttemptId)
    expect(Number(ranking.score)).toBe(Number(byId.get(eventAAttemptId)?.total_score))

    const { error: closeError } = await db
      .from('events')
      .update({ status: 'closed' })
      .eq('id', eventAId)
    if (closeError) throw closeError
    await page.goto(`/cpns/live/${eventAId}`, nav)
    await expect(page.getByRole('heading', { name: 'Leaderboard Event', exact: true })).toBeVisible(
      { timeout: 30_000 },
    )
    await expect(page.getByText('CI CPNS SKD', { exact: true })).toBeVisible()

    // Event completion cannot complete or replace the original Direct session.
    await page.goto('/cpns/dashboard/tryout', nav)
    await page.getByRole('button', { name: 'Lanjutkan Full Tryout', exact: true }).click()
    await page.waitForURL(attemptUrl, nav)
    expect(page.url().match(attemptUrl)?.[1]).toBe(directAttemptId)
    await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
    const walletBeforeDirectSubmit = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_cpns')
      .single()
    if (walletBeforeDirectSubmit.error) throw walletBeforeDirectSubmit.error
    const concurrentDirectSubmitPage = await page.context().newPage()
    await concurrentDirectSubmitPage.goto(`/cpns/dashboard/tryout/${directAttemptId}`, nav)
    await concurrentDirectSubmitPage.getByRole('button', { name: /^Buka soal 110$/ }).click()
    await page.getByRole('button', { name: /^Buka soal 110$/ }).click()
    await Promise.all([
      page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click(),
      concurrentDirectSubmitPage
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
    ])
    const directSubmitConfirm = page.getByRole('heading', {
      name: 'Kumpulkan jawaban?',
      exact: true,
    })
    const twinDirectConfirm = concurrentDirectSubmitPage.getByRole('heading', {
      name: 'Kumpulkan jawaban?',
      exact: true,
    })
    await expect(directSubmitConfirm).toBeVisible()
    await Promise.all([
      directSubmitConfirm
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
      twinDirectConfirm
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
    ])
    await page.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentDirectSubmitPage.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentDirectSubmitPage.close()
    const { data: directCompleted, error: directCompletedError } = await db
      .from('exam_attempts')
      .select('status')
      .eq('id', directAttemptId)
      .single()
    if (directCompletedError) throw directCompletedError
    expect(String(directCompleted.status).toLowerCase()).toBe('completed')
    const walletAfterDirectSubmit = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_cpns')
      .single()
    if (walletAfterDirectSubmit.error) throw walletAfterDirectSubmit.error
    expect(Number(walletAfterDirectSubmit.data.balance)).toBe(
      Number(walletBeforeDirectSubmit.data.balance),
    )

    // TKA SMP Event uses the same distribution context and the existing section-aware RPC engine.
    await registerEvent(tkaEventName, '60')
    const tkaEventRegistration = await db
      .from('event_registrations')
      .select('id,event_id,session_id,status')
      .eq('event_id', tkaEventId)
      .eq('user_id', participant.userId)
      .maybeSingle()
    if (tkaEventRegistration.error) throw tkaEventRegistration.error
    expect(
      tkaEventRegistration.data,
      `TKA Event registration missing for ${tkaEventId}`,
    ).toMatchObject({ event_id: tkaEventId })
    tkaEventAttemptId = await startEvent(tkaEventName, tkaAttemptUrl)
    const { data: tkaAttempt, error: tkaAttemptError } = await db
      .from('exam_attempts')
      .select('exam_id,status,metadata')
      .eq('id', tkaEventAttemptId)
      .single()
    if (tkaAttemptError) throw tkaAttemptError
    expect(tkaAttempt.exam_id).toBe(tkaExamId)
    expect(String(tkaAttempt.status).toLowerCase()).toBe('in_progress')
    expect(tkaAttempt.metadata).toMatchObject({ eventId: tkaEventId, accessContext: 'event' })
    await expect(page.getByText('Soal 1 dari 30', { exact: true })).toBeVisible()
    const tkaFirstOption = page.getByRole('article').last().getByRole('button').first()
    await tkaFirstOption.click()
    await expect(tkaFirstOption).toHaveAttribute('data-selected', 'true')
    await waitForSavedFirstAnswer(db, tkaEventAttemptId)
    await page.reload(nav)
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await expect(page.getByRole('article').last().getByRole('button').first()).toHaveAttribute(
      'data-selected',
      'true',
    )

    const resumedTkaEventId = await startEvent(tkaEventName, tkaAttemptUrl)
    expect(resumedTkaEventId).toBe(tkaEventAttemptId)
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await page.getByRole('button', { name: /^Buka soal 30/ }).click()
    await finishFullTkaSection(page, 'Selesaikan bagian')
    await expect(page.getByRole('heading', { name: 'Matematika' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^Buka soal 30/ }).click()
    await finishFullTkaSection(page, 'Kirim tryout')
    await expect(page).toHaveURL(tkaResultUrl, { timeout: 60_000 })
    const { data: completedTkaAttempt, error: completedTkaAttemptError } = await db
      .from('exam_attempts')
      .select('status,total_score,metadata')
      .eq('id', tkaEventAttemptId)
      .single()
    if (completedTkaAttemptError) throw completedTkaAttemptError
    expect(String(completedTkaAttempt.status).toLowerCase()).toBe('completed')
    expect(completedTkaAttempt.metadata).toMatchObject({
      eventId: tkaEventId,
      accessContext: 'event',
    })
    const completedTkaRegistration = await db
      .from('event_registrations')
      .select('id,event_id,session_id,status')
      .eq('event_id', tkaEventId)
      .eq('user_id', participant.userId)
      .maybeSingle()
    if (completedTkaRegistration.error) throw completedTkaRegistration.error
    expect(
      completedTkaRegistration.data,
      `TKA Event registration lost after submit for ${tkaEventId}`,
    ).toMatchObject({ event_id: tkaEventId })
    const { error: closeTkaEventError } = await db
      .from('events')
      .update({ status: 'closed' })
      .eq('id', tkaEventId)
    if (closeTkaEventError) throw closeTkaEventError
    await page.goto(`/cpns/live/${tkaEventId}`, nav)
    await expect(page.getByRole('heading', { name: 'Leaderboard Event', exact: true })).toBeVisible(
      { timeout: 30_000 },
    )
    await expect(page.getByText('CI CPNS SKD', { exact: true })).toBeVisible()
    await expect
      .poll(
        async () => {
          const { data, error } = await db
            .from('event_rankings')
            .select('attempt_id,score')
            .eq('event_id', tkaEventId)
            .eq('user_id', participant.userId)
            .maybeSingle()
          if (error) throw error
          return data
        },
        { timeout: 15_000 },
      )
      .toMatchObject({
        attempt_id: tkaEventAttemptId,
        score: Number(completedTkaAttempt.total_score),
      })
    const { data: tkaRanking, error: tkaRankingError } = await db
      .from('event_rankings')
      .select('attempt_id,score')
      .eq('event_id', tkaEventId)
      .eq('user_id', participant.userId)
      .single()
    if (tkaRankingError) throw tkaRankingError
    expect(tkaRanking.attempt_id).toBe(tkaEventAttemptId)
    expect(Number(tkaRanking.score)).toBe(Number(completedTkaAttempt.total_score))
  } finally {
    if (adminContext) await adminContext.close().catch(() => undefined)
    if (adminUserId) await cleanupRoleUser(supabaseUrl, adminUserId)
    const attemptIds = [
      directAttemptId,
      eventAAttemptId,
      eventBAttemptId,
      tkaEventAttemptId,
    ].filter(Boolean)
    if (attemptIds.length) {
      const { data: questions } = await db
        .from('attempt_questions')
        .select('id')
        .in('attempt_id', attemptIds)
      const questionIds = (questions ?? []).map((question) => question.id)
      if (questionIds.length)
        await db.from('attempt_answers').delete().in('attempt_question_id', questionIds)
      await db.from('attempt_scores').delete().in('attempt_id', attemptIds)
      await db.from('attempt_questions').delete().in('attempt_id', attemptIds)
      await db.from('attempt_section_states').delete().in('attempt_id', attemptIds)
      await db.from('attempt_events').delete().in('attempt_id', attemptIds)
      await db.from('event_rankings').delete().in('attempt_id', attemptIds)
      await db.from('exam_attempts').delete().in('id', attemptIds)
    }
    const eventIds = [...new Set([...createdEventIds, eventAId, eventBId].filter(Boolean))]
    if (eventIds.length) {
      await db.from('event_registrations').delete().in('event_id', eventIds)
      await db.from('event_sessions').delete().in('event_id', eventIds)
      await db.from('events').delete().in('id', eventIds)
    }
  }
})
