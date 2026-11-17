import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { cleanupRoleUser, provisionRoleUser } from '../admin-roles'

const authMetadataPath = path.join(process.cwd(), 'playwright/.auth/cpns-user-meta.json')
const attemptUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const resultUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const nav = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

test('one participant keeps same-assessment attempts, answers, resume, and results isolated across organizations', async ({ page }) => {
    test.setTimeout(240_000)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !serviceRoleKey || !publishableKey) throw new Error('Dual-organization E2E requires staging credentials.')
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    if (projectRef !== 'lpgrivowdcepcxradavu') throw new Error(`Dual-organization E2E blocked for non-staging project ${projectRef}.`)

    const participant = JSON.parse(readFileSync(authMetadataPath, 'utf8')) as { userId: string; email: string }
    const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const suffix = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
    const fixtureOrganizations: string[] = []
    const fixtureAssignments: Array<{ organizationId: string; batchId: string; assignmentId: string }> = []
    const attemptIds: string[] = []
    let adminUserId = ''

    try {
        const { data: exam, error: examError } = await db.from('exams')
            .select('id,title').eq('slug', 'qa-cpns-mini-tiu').in('status', ['active', 'ACTIVE']).single()
        if (examError) throw examError

        const now = Date.now()
        for (const label of ['A', 'B']) {
            const orgCode = `E2EDUAL-${label}-${suffix}`
            const { data: organization, error: organizationError } = await db.from('organizations')
                .insert({ name: `E2E Dual Org ${label} ${suffix}`, code: orgCode, type: 'instansi', status: 'active' })
                .select('id,name').single()
            if (organizationError) throw organizationError
            fixtureOrganizations.push(organization.id)

            const { data: batch, error: batchError } = await db.from('organization_batches').insert({
                organization_id: organization.id,
                code: `DUAL-${label}-${suffix}`,
                name: `Batch ${label} ${suffix}`,
                status: 'active',
                starts_at: new Date(now - 60_000).toISOString(),
                ends_at: new Date(now + 60 * 60_000).toISOString(),
            }).select('id').single()
            if (batchError) throw batchError

            const { error: membershipError } = await db.from('organization_participants').insert({
                organization_id: organization.id,
                batch_id: batch.id,
                user_id: participant.userId,
                participant_code: `DUAL-${label}-${suffix}`,
                full_name_snapshot: `Peserta Dual ${label}`,
                email_snapshot: participant.email,
                status: 'active',
            })
            if (membershipError) throw membershipError

            const { data: assignment, error: assignmentError } = await db.from('organization_exam_assignments').insert({
                organization_id: organization.id,
                batch_id: batch.id,
                exam_id: exam.id,
                assigned_by: participant.userId,
                starts_at: new Date(now - 60_000).toISOString(),
                due_at: new Date(now + 60 * 60_000).toISOString(),
                is_active: true,
            }).select('id').single()
            if (assignmentError) throw assignmentError
            fixtureAssignments.push({ organizationId: organization.id, batchId: batch.id, assignmentId: assignment.id })
        }

        const startFor = async (label: 'A' | 'B') => {
            await page.goto('/cpns/dashboard/assignments', nav)
            const card = page.getByTestId('organization-assignment').filter({ hasText: `E2E Dual Org ${label} ${suffix}` })
            await expect(card).toContainText(exam.title)
            const action = card.getByRole('button', { name: /Mulai|Lanjutkan/, exact: true })
            await action.click()
            await page.waitForURL(attemptUrl, nav)
            const id = page.url().match(attemptUrl)?.[1] ?? ''
            expect(id).not.toBe('')
            if (!attemptIds.includes(id)) attemptIds.push(id)
            return { id, card }
        }
        const waitForAnswerSaved = async (attemptId: string) => {
            const { data: attemptQuestion, error: questionError } = await db.from('attempt_questions')
                .select('id').eq('attempt_id', attemptId).eq('position', 1).single()
            if (questionError) throw questionError
            await expect.poll(async () => {
                const { data, error } = await db.from('attempt_answers').select('answered_at,selected_option_id')
                    .eq('attempt_question_id', attemptQuestion.id).maybeSingle()
                if (error) throw error
                return Boolean(data?.answered_at && data.selected_option_id)
            }, { timeout: 20_000 }).toBe(true)
        }

        const first = await startFor('A')
        const answerA = page.getByTestId('answer-option-0').first()
        await answerA.click()
        await expect(answerA).toHaveClass(/border-blue-600/)
        await waitForAnswerSaved(first.id)
        await page.reload(nav)
        await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)

        const second = await startFor('B')
        expect(second.id).not.toBe(first.id)
        const attemptRows = await db.from('exam_attempts')
            .select('id,source,organization_id,batch_id,assignment_id,metadata')
            .in('id', [first.id, second.id])
        if (attemptRows.error) throw attemptRows.error
        expect(attemptRows.data).toHaveLength(2)
        const rowA = attemptRows.data.find((row) => row.id === first.id)
        const rowB = attemptRows.data.find((row) => row.id === second.id)
        expect(rowA).toMatchObject({
            source: 'organization', organization_id: fixtureAssignments[0].organizationId,
            batch_id: fixtureAssignments[0].batchId, assignment_id: fixtureAssignments[0].assignmentId,
        })
        expect(rowB).toMatchObject({
            source: 'organization', organization_id: fixtureAssignments[1].organizationId,
            batch_id: fixtureAssignments[1].batchId, assignment_id: fixtureAssignments[1].assignmentId,
        })
        expect(rowA?.metadata).toMatchObject({ assignmentId: fixtureAssignments[0].assignmentId })
        expect(rowB?.metadata).toMatchObject({ assignmentId: fixtureAssignments[1].assignmentId })

        await expect(page.getByTestId('answer-option-0').first()).not.toHaveClass(/border-blue-600/)
        const answerB = page.getByTestId('answer-option-1').first()
        await answerB.click()
        await expect(answerB).toHaveClass(/border-blue-600/)
        await waitForAnswerSaved(second.id)
        await page.reload(nav)
        await expect(page.getByTestId('answer-option-1').first()).toHaveClass(/border-blue-600/)

        // Reopen both assignment cards; each resume must restore its own answer.
        await page.goto('/cpns/dashboard/assignments', nav)
        const cardA = page.getByTestId('organization-assignment').filter({ hasText: `E2E Dual Org A ${suffix}` })
        await cardA.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
        await page.waitForURL(attemptUrl, nav)
        expect(page.url().match(attemptUrl)?.[1]).toBe(first.id)
        await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
        await page.goto('/cpns/dashboard/assignments', nav)
        const cardB = page.getByTestId('organization-assignment').filter({ hasText: `E2E Dual Org B ${suffix}` })
        await cardB.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
        await page.waitForURL(attemptUrl, nav)
        expect(page.url().match(attemptUrl)?.[1]).toBe(second.id)
        await expect(page.getByTestId('answer-option-1').first()).toHaveClass(/border-blue-600/)

        const submitCurrentAttempt = async (attemptId: string) => {
            await page.getByRole('button', { name: /^Buka soal \d+$/ }).last().click()
            await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
            const prompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
            await expect(prompt).toBeVisible()
            await prompt.locator('..').getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
            await page.waitForURL(resultUrl, { ...nav, timeout: 45_000 })
            expect(page.url().match(resultUrl)?.[1]).toBe(attemptId)
        }

        await submitCurrentAttempt(second.id)
        await page.goto('/cpns/dashboard/assignments', nav)
        await cardA.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
        await page.waitForURL(attemptUrl, nav)
        await submitCurrentAttempt(first.id)

        const completed = await db.from('exam_attempts')
            .select('id,status,total_score,organization_id,assignment_id').in('id', [first.id, second.id])
        if (completed.error) throw completed.error
        expect(completed.data).toHaveLength(2)
        expect(completed.data.every((row) => String(row.status).toLowerCase() === 'completed')).toBe(true)
        expect(completed.data.find((row) => row.id === first.id)).toMatchObject({
            organization_id: fixtureAssignments[0].organizationId, assignment_id: fixtureAssignments[0].assignmentId,
        })
        expect(completed.data.find((row) => row.id === second.id)).toMatchObject({
            organization_id: fixtureAssignments[1].organizationId, assignment_id: fixtureAssignments[1].assignmentId,
        })

        const admin = await provisionRoleUser(supabaseUrl, 'ADMIN')
        adminUserId = admin.userId
        const adminClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
        const { error: loginError } = await adminClient.auth.signInWithPassword({ email: admin.email, password: admin.password })
        if (loginError) throw loginError
        for (let index = 0; index < fixtureAssignments.length; index += 1) {
            const fixture = fixtureAssignments[index]
            const { data: exported, error: exportError } = await adminClient.rpc('admin_export_organization', {
                p_organization_id: fixture.organizationId,
                p_batch_id: fixture.batchId,
            })
            if (exportError) throw exportError
            const detail = exported.detail as { columns: string[]; rows: unknown[][] }
            const attempt = completed.data.find((row) => row.id === (index === 0 ? first.id : second.id))
            expect(detail.rows).toHaveLength(1)
            const scoreIndex = detail.columns.indexOf('total_skor')
            expect(scoreIndex).toBeGreaterThanOrEqual(0)
            expect(detail.rows[0][scoreIndex]).toBe(attempt?.total_score)
        }
    } finally {
        if (adminUserId) await cleanupRoleUser(supabaseUrl, adminUserId)
        if (attemptIds.length) {
            const { data: questions } = await db.from('attempt_questions').select('id').in('attempt_id', attemptIds)
            const questionIds = (questions ?? []).map((row) => row.id)
            if (questionIds.length) await db.from('attempt_answers').delete().in('attempt_question_id', questionIds)
            await db.from('attempt_scores').delete().in('attempt_id', attemptIds)
            await db.from('attempt_questions').delete().in('attempt_id', attemptIds)
            await db.from('attempt_section_states').delete().in('attempt_id', attemptIds)
            await db.from('attempt_events').delete().in('attempt_id', attemptIds)
            await db.from('exam_attempts').delete().in('id', attemptIds)
        }
        for (const organizationId of fixtureOrganizations) await db.from('organizations').delete().eq('id', organizationId)
    }
})
