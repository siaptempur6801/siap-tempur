import { createWorkflowEvent } from '../admin-workflow'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser } from '../admin-roles'
import { confirmTkaSectionIfPresent } from '../pages/TkaExamActions'

const authMetadataPath = path.join(process.cwd(), 'playwright/.auth/cpns-user-meta.json')
const attemptUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const resultUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const tkaAttemptUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const tkaResultUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const nav = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

function wibInput(minutesFromNow: number) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(Date.now() + minutesFromNow * 60_000))
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
    return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}

async function createEvent(page: Page, title: string, code: string, examId: string, program: 'CPNS' | 'TKA', track: 'SKD' | 'SMP', record: (id: string) => void) {
    const eventId = await createWorkflowEvent(page,title,code,examId,program,track,wibInput)
    record(eventId)
    await page.getByRole('link',{name:'Pantau Peserta',exact:true}).click()
    await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring(?:\\?|$)`))
    await expect(page.locator('main h1')).toHaveText('Monitoring Peserta', { timeout: 30_000 })
    await page.goBack()
    await expect(page.getByRole('link',{name:'Pantau Peserta',exact:true})).toBeVisible()
    return eventId
}

test.describe.configure({ mode: 'serial', retries: 0 })

test('Event runs CPNS Mini/Drill and TKA SMP Mini/Drill through isolated assessment sessions', async ({ page, browser }) => {
    test.setTimeout(360_000)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Event assessment matrix E2E requires staging credentials.')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef !== 'lpgrivowdcepcxradavu') throw new Error(`Event E2E blocked for non-staging project ${projectRef}.`)

    const participant = JSON.parse(readFileSync(authMetadataPath, 'utf8')) as { userId: string }
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const waitForStoredFirstAnswer = async (attemptId: string) => {
        const { data: question, error: questionError } = await db.from('attempt_questions')
            .select('id').eq('attempt_id', attemptId).eq('position', 1).single()
        if (questionError) throw questionError
        await expect.poll(async () => {
            const { data, error } = await db.from('attempt_answers')
                .select('id,answered_at,selected_option_id').eq('attempt_question_id', question.id).maybeSingle()
            if (error) throw error
            if (!data?.answered_at) return false
            if (data.selected_option_id) return true
            const { count, error: optionError } = await db.from('attempt_answer_options')
                .select('option_id', { count: 'exact', head: true }).eq('attempt_answer_id', data.id)
            if (optionError) throw optionError
            return (count ?? 0) > 0
        }, { timeout: 20_000 }).toBe(true)
    }
    const suffix = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    const events: string[] = []
    const attempts: string[] = []
    let adminUserId = ''
    let adminContext: Awaited<ReturnType<typeof browser.newContext>> | null = null
    let originalTkaWallet: { existed: boolean; balance: number } | null = null

    try {
        const matrix = [
            { slug: 'qa-cpns-mini-tiu', domain: 'CPNS', track: 'SKD', type: 'MINI_TRYOUT' },
            { slug: 'qa-cpns-drill-tiu', domain: 'CPNS', track: 'SKD', type: 'DRILL' },
            { slug: 'tka-smp-mini-matematika', domain: 'TKA', track: 'SMP', type: 'MINI_TRYOUT' },
            { slug: 'tka-smp-drill-mat-aljabar', domain: 'TKA', track: 'SMP', type: 'DRILL' },
        ] as const
        const walletBefore = await db.from('wallets').select('balance')
            .eq('user_id', participant.userId).eq('wallet_type', 'exam_token_tka_smp').maybeSingle()
        if (walletBefore.error) throw walletBefore.error
        originalTkaWallet = { existed: Boolean(walletBefore.data), balance: Number(walletBefore.data?.balance ?? 0) }
        if (walletBefore.data) {
            const { error } = await db.from('wallets').update({ balance: 0 })
                .eq('user_id', participant.userId).eq('wallet_type', 'exam_token_tka_smp')
            if (error) throw error
        } else {
            const { error } = await db.from('wallets').insert({ user_id: participant.userId, wallet_type: 'exam_token_tka_smp', balance: 0 })
            if (error) throw error
        }
        const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
        adminUserId = admin.userId
        adminContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const adminPage = await adminContext.newPage()
        await loginAs(adminPage, admin, '/admin/events')

        for (const [index, item] of matrix.entries()) {
            const { data: exam, error: examError } = await db.from('exams')
                .select('id,title,exam_type_id,program_id,track_id').eq('slug', item.slug).in('status', ['active', 'ACTIVE']).single()
            if (examError) throw examError
            const { data: type, error: typeError } = await db.from('exam_types').select('code').eq('id', exam.exam_type_id).single()
            if (typeError) throw typeError
            expect(type.code).toBe(item.type)

            const title = `[QA] Event matrix ${item.domain} ${item.type} ${suffix}-${index}`
            const code = `QA-MATRIX-${item.domain}-${item.type}-${suffix}-${index}`
            const eventId = await createEvent(
                adminPage, title, code, exam.id, item.domain, item.track,
                (id) => events.push(id),
            )
            await page.goto('/cpns/dashboard/event', nav)
            const card = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await expect(card).toBeVisible()

            if (index === 0) {
                // Two authenticated tabs register together; only one canonical row is allowed.
                const twinPage = await page.context().newPage()
                try {
                    await twinPage.goto('/cpns/dashboard/event', nav)
                    const twinCard = twinPage.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
                    const registrationsStarted = await Promise.allSettled([
                        card.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click(),
                        twinCard.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click(),
                    ])
                    expect(registrationsStarted.some((result) => result.status === 'fulfilled')).toBe(true)
                    await expect(card.getByText('Terdaftar', { exact: true })).toBeVisible({ timeout: 30_000 })
                } finally {
                    await twinPage.close()
                }
                const registrations = await db.from('event_registrations').select('id', { count: 'exact', head: true })
                    .eq('event_id', eventId).eq('user_id', participant.userId)
                if (registrations.error) throw registrations.error
                expect(registrations.count).toBe(1)
            } else {
                await card.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click()
                await expect(card.getByText('Terdaftar', { exact: true })).toBeVisible({ timeout: 30_000 })
            }

            await page.goto('/cpns/dashboard/event', nav)
            const registeredCard = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await registeredCard.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
            await page.getByRole('button', { name: 'Gas Mulai!', exact: true }).click()
            const isTka = item.domain === 'TKA'
            const targetUrl = isTka ? tkaAttemptUrl : attemptUrl
            await page.waitForURL(targetUrl, nav)
            const attemptId = page.url().match(targetUrl)?.[1] ?? ''
            expect(attemptId).not.toBe('')
            attempts.push(attemptId)
            const { data: attempt, error: attemptError } = await db.from('exam_attempts')
                .select('exam_id,status,metadata').eq('id', attemptId).single()
            if (attemptError) throw attemptError
            expect(attempt.exam_id).toBe(exam.id)
            expect(String(attempt.status).toLowerCase()).toBe('in_progress')
            expect(attempt.metadata).toMatchObject({ eventId, eventRegistrationId: expect.any(String), examTypeCode: item.type })

            if (!isTka) {
                const answer = page.getByTestId('answer-option-0').first()
                await answer.click()
                await expect(answer).toHaveClass(/border-blue-600/)
                await waitForStoredFirstAnswer(attemptId)
                await page.reload(nav)
                await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
            } else if (item.type === 'DRILL') {
                await expect(page.getByText(/Soal 1\s*\/\s*10/)).toBeVisible()
                const answer = page.locator('article').last().getByRole('button').first()
                await answer.click()
                await expect(answer).toHaveClass(/border-indigo-600/)
                await expect(page.getByText('1/10', { exact: true })).toBeVisible({ timeout: 15_000 })
                await waitForStoredFirstAnswer(attemptId)
                await page.reload(nav)
                await expect(page.locator('article').last().getByRole('button').first()).toHaveClass(/border-indigo-600/)
            } else {
                const total = item.type === 'MINI_TRYOUT' ? '15' : '10'
                await expect(page.getByText(`Soal 1 dari ${total}`, { exact: true })).toBeVisible()
                const answer = page.locator('article').last().getByRole('button').first()
                await answer.click()
                await expect(answer).toHaveAttribute('data-selected', 'true')
                await expect(page.getByText(/Terjawab bagian ini:/)).toContainText(`1/${total}`)
                await waitForStoredFirstAnswer(attemptId)
                await page.reload(nav)
                await expect(page.getByText(/Terjawab bagian ini:/)).toContainText(`1/${total}`)
            }

            // Leave and reopen Event to prove the same context resumes its attempt.
            await page.goto('/cpns/dashboard/event', nav)
            const resumeCard = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await resumeCard.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
            await page.getByRole('button', { name: 'Gas Mulai!', exact: true }).click()
            await page.waitForURL(targetUrl, nav)
            expect(page.url().match(targetUrl)?.[1]).toBe(attemptId)

            if (!isTka) {
                await page.getByRole('button', { name: /^Buka soal \d+$/ }).last().click()
                await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
                const prompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
                await expect(prompt).toBeVisible()
                await prompt.locator('..').getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
                await page.waitForURL(resultUrl, { ...nav, timeout: 45_000 })
            } else if (item.type === 'DRILL') {
                await page.getByRole('button', { name: /^Buka soal 10(?:,|$)/ }).click()
                await page.getByRole('button', { name: 'Selesai', exact: true }).click()
                const prompt = page.getByRole('heading', { name: 'Akhiri tryout ini?', exact: true })
                await expect(prompt).toBeVisible()
                await page.getByRole('button', { name: 'Ya, kirim jawaban', exact: true }).click()
                await page.waitForURL(tkaResultUrl, { ...nav, timeout: 45_000 })
            } else {
                const total = item.type === 'MINI_TRYOUT' ? '15' : '10'
                await page.getByRole('button', { name: new RegExp(`^Buka soal ${total}(?:\\s|$)`) }).click()
                await page.getByRole('button', { name: 'Kirim tryout', exact: true }).click()
                await confirmTkaSectionIfPresent(page)
                await expect(page).toHaveURL(tkaResultUrl, { timeout: 45_000 })
            }
            expect(page.url()).toContain(attemptId)
            const completed = await db.from('exam_attempts').select('status,exam_id,metadata').eq('id', attemptId).single()
            if (completed.error) throw completed.error
            expect(String(completed.data.status).toLowerCase()).toBe('completed')
            expect(completed.data.exam_id).toBe(exam.id)
            expect(completed.data.metadata).toMatchObject({ eventId, examTypeCode: item.type })
        }
    } finally {
        if (adminContext) await adminContext.close().catch(() => undefined)
        if (adminUserId) await cleanupRoleUser(supabaseUrl, adminUserId)
        if (attempts.length) {
            const { data: questions } = await db.from('attempt_questions').select('id').in('attempt_id', attempts)
            const questionIds = (questions ?? []).map((row) => row.id)
            if (questionIds.length) await db.from('attempt_answers').delete().in('attempt_question_id', questionIds)
            await db.from('attempt_scores').delete().in('attempt_id', attempts)
            await db.from('attempt_questions').delete().in('attempt_id', attempts)
            await db.from('attempt_section_states').delete().in('attempt_id', attempts)
            await db.from('attempt_events').delete().in('attempt_id', attempts)
            await db.from('exam_attempts').delete().in('id', attempts)
        }
        for (const eventId of events) await db.from('events').delete().eq('id', eventId)
        if (originalTkaWallet) {
            if (originalTkaWallet.existed) {
                await db.from('wallets').update({ balance: originalTkaWallet.balance })
                    .eq('user_id', participant.userId).eq('wallet_type', 'exam_token_tka_smp')
            } else {
                await db.from('wallets').delete()
                    .eq('user_id', participant.userId).eq('wallet_type', 'exam_token_tka_smp')
            }
        }
    }
})

test('Event participant start action rejects a future start and a closed window at the HTTP boundary', async ({ page, browser }) => {
    test.setTimeout(180_000)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Event timing E2E requires staging credentials.')
    if (new URL(supabaseUrl).hostname.split('.')[0] !== 'lpgrivowdcepcxradavu') throw new Error('Event timing E2E only runs on staging.')
    const participant = JSON.parse(readFileSync(authMetadataPath, 'utf8')) as { userId: string }
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const suffix = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    const createdEventIds: string[] = []
    let adminUserId = ''
    let adminContext: Awaited<ReturnType<typeof browser.newContext>> | null = null
    try {
        const { data: exam, error: examError } = await db.from('exams').select('id').eq('slug', 'qa-cpns-mini-tiu').single()
        if (examError) throw examError
        const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
        adminUserId = admin.userId
        adminContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
        const adminPage = await adminContext.newPage()
        await loginAs(adminPage, admin, '/admin/events')

        for (const condition of ['future', 'closed'] as const) {
            const title = `[QA] Event timing ${condition} ${suffix}`
            const eventId = await createEvent(
                adminPage, title, `QA-TIMING-${condition}-${suffix}`, exam.id, 'CPNS', 'SKD',
                (id) => createdEventIds.push(id),
            )
            await page.goto('/cpns/dashboard/event', nav)
            const card = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await card.getByRole('button', { name: 'Daftar Sekarang', exact: true }).click()
            await expect(card.getByText('Terdaftar', { exact: true })).toBeVisible({ timeout: 30_000 })

            const now = Date.now()
            const future = new Date(now + 20 * 60_000).toISOString()
            const later = new Date(now + 120 * 60_000).toISOString()
            const past = new Date(now - 20 * 60_000).toISOString()
            const eventUpdate = condition === 'future'
                ? { starts_at: future, ends_at: later, status: 'live' }
                : { starts_at: past, ends_at: past, status: 'closed' }
            const { error: updateEventError } = await db.from('events').update(eventUpdate).eq('id', eventId)
            if (updateEventError) throw updateEventError
            const { error: updateSessionError } = await db.from('event_sessions').update(
                condition === 'future' ? { starts_at: future, ends_at: later, status: 'live' } : { starts_at: past, ends_at: past, status: 'closed' },
            ).eq('event_id', eventId)
            if (updateSessionError) throw updateSessionError

            await page.goto('/cpns/dashboard/event', nav)
            const timedCard = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await expect(timedCard.getByText(condition === 'future' ? /Event akan dimulai dalam/ : /Event telah berakhir pada/)).toBeVisible()
            await expect(timedCard.getByRole('button').last()).toBeDisabled()

            // Open the participant confirmation while the server sees an active window,
            // then move the window before confirmation to exercise the actual Server Action boundary.
            const restoreEvent = await db.from('events').update({ starts_at: past, ends_at: later, status: 'live' }).eq('id', eventId)
            if (restoreEvent.error) throw restoreEvent.error
            const restoreSession = await db.from('event_sessions').update({ starts_at: past, ends_at: later, status: 'live' }).eq('event_id', eventId)
            if (restoreSession.error) throw restoreSession.error
            await page.goto('/cpns/dashboard/event', nav)
            const activeCard = page.getByRole('heading', { name: title, exact: true }).locator('xpath=../../..')
            await activeCard.getByRole('button', { name: /Mulai Tryout|Lanjutkan/, exact: true }).click()
            await expect(page.getByRole('button', { name: 'Gas Mulai!', exact: true })).toBeVisible()

            const boundaryEvent = await db.from('events').update(eventUpdate).eq('id', eventId)
            if (boundaryEvent.error) throw boundaryEvent.error
            const boundarySession = await db.from('event_sessions').update(
                condition === 'future' ? { starts_at: future, ends_at: later, status: 'live' } : { starts_at: past, ends_at: past, status: 'closed' },
            ).eq('event_id', eventId)
            if (boundarySession.error) throw boundarySession.error

            await page.getByRole('button', { name: 'Gas Mulai!', exact: true }).click()
            await expect(page.getByText(condition === 'future' ? /Event belum dimulai|Sesi event belum dimulai/ : 'Waktu masuk event sudah ditutup'))
                .toBeVisible({ timeout: 20_000 })
            const { count, error: attemptsError } = await db.from('exam_attempts')
                .select('id', { count: 'exact', head: true }).eq('user_id', participant.userId)
                .filter('metadata->>eventId', 'eq', eventId)
            if (attemptsError) throw attemptsError
            expect(count).toBe(0)
        }
    } finally {
        if (adminContext) await adminContext.close().catch(() => undefined)
        if (adminUserId) await cleanupRoleUser(supabaseUrl, adminUserId)
        if (createdEventIds.length) {
            await db.from('event_registrations').delete().in('event_id', createdEventIds)
            await db.from('event_sessions').delete().in('event_id', createdEventIds)
            await db.from('events').delete().in('id', createdEventIds)
        }
    }
})
