import { adminUrlState } from '../admin-workflow'
import { waitForSavedFirstAnswer, finishFullTkaSection } from '../admin-workflow'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'
import { cleanupRoleUser, loginAs, provisionRoleUser } from '../admin-roles'
import { confirmTkaSectionIfPresent } from '../pages/TkaExamActions'

const authMetadataPath = path.join(process.cwd(), 'playwright/.auth/cpns-user-meta.json')
const attemptUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const resultUrl = /\/cpns\/dashboard\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const tkaAttemptUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})(?:\?.*)?$/i
const tkaResultUrl = /\/tka\/smp\/tryout\/([0-9a-f-]{36})\/result(?:\?.*)?$/i
const nav = { waitUntil: 'domcontentloaded' as const, timeout: 45_000 }

test.describe.configure({ mode: 'serial', retries: 0 })
test('Organization participant discovers, resumes, submits, and receives the shared CPNS result', async ({
  page,
  browser,
}) => {
  test.setTimeout(360_000)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !serviceRoleKey || !publishableKey)
    throw new Error('Organization lifecycle E2E requires staging credentials.')
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  if (projectRef !== 'lpgrivowdcepcxradavu')
    throw new Error(`Organization E2E blocked for non-staging project ${projectRef}.`)

  const participant = JSON.parse(readFileSync(authMetadataPath, 'utf8')) as {
    userId: string
    email: string
  }
  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
  const orgCode = `E2E-${suffix}`
  const batchCode = `B-${suffix}`
  let organizationId = ''
  let otherOrganizationId = ''
  let assignmentId = ''
  let otherAssignmentId = ''
  let sameOrgOtherBatchAssignmentId = ''
  let tkaAssignmentId = ''
  const organizationMatrixAssignments: Array<{
    id: string
    examId: string
    title: string
    slug: string
    kind: 'CPNS' | 'TKA'
    examTypeCode: 'MINI_TRYOUT' | 'DRILL'
  }> = []
  let originalTkaWallet: { existed: boolean; balance: number } | null = null
  let otherOrganizationName = ''
  let attemptId = ''
  let tkaAttemptId = ''
  const attemptsToClean: string[] = []
  let adminUserId = ''
  let adminContext: Awaited<ReturnType<typeof browser.newContext>> | null = null

  try {
    const { data: program, error: programError } = await db
      .from('programs')
      .select('id')
      .eq('code', 'CPNS')
      .single()
    if (programError) throw programError
    const { data: track, error: trackError } = await db
      .from('tracks')
      .select('id')
      .eq('program_id', program.id)
      .eq('code', 'SKD')
      .single()
    if (trackError) throw trackError
    const { data: type, error: typeError } = await db
      .from('exam_types')
      .select('id')
      .eq('code', 'FULL_TRYOUT')
      .single()
    if (typeError) throw typeError
    const { data: exams, error: examError } = await db
      .from('exams')
      .select('id, title, status')
      .eq('program_id', program.id)
      .eq('track_id', track.id)
      .eq('exam_type_id', type.id)
      .in('status', ['active', 'ACTIVE', 'published', 'PUBLISHED', 'ready', 'READY'])
      .order('title')
      .limit(10)
    if (examError) throw examError
    let exam: { id: string; title: string } | null = null
    for (const candidate of exams ?? []) {
      const { count, error } = await db
        .from('exam_question_items')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', candidate.id)
      if (error) throw error
      if ((count ?? 0) > 0) {
        exam = candidate
        break
      }
      const { data: sections, error: sectionError } = await db
        .from('exam_sections')
        .select('question_count, subject_id')
        .eq('exam_id', candidate.id)
      if (sectionError) throw sectionError
      const subjectIds = [
        ...new Set((sections ?? []).map((section) => section.subject_id).filter(Boolean)),
      ]
      if (!sections?.length || !subjectIds.length) continue
      const { data: published, error: questionError } = await db
        .from('questions')
        .select('subject_id')
        .in('subject_id', subjectIds)
        .in('status', ['PUBLISHED', 'published', 'ACTIVE', 'active'])
      if (questionError) throw questionError
      const availableBySubject = new Map<string, number>()
      for (const question of published ?? []) {
        const key = String(question.subject_id)
        availableBySubject.set(key, (availableBySubject.get(key) ?? 0) + 1)
      }
      if (
        sections.every(
          (section) =>
            Number(section.question_count) > 0 &&
            Number(section.question_count) <=
              (availableBySubject.get(String(section.subject_id)) ?? 0),
        )
      ) {
        exam = candidate
        break
      }
    }
    if (!exam) throw new Error('No ready CPNS Full Tryout content was found on staging.')

    const { data: organization, error: organizationError } = await db
      .from('organizations')
      .insert({ name: `E2E Instansi ${suffix}`, code: orgCode, type: 'instansi', status: 'active' })
      .select('id')
      .single()
    if (organizationError) throw organizationError
    organizationId = organization.id

    const now = Date.now()
    const { data: batch, error: batchError } = await db
      .from('organization_batches')
      .insert({
        organization_id: organizationId,
        code: batchCode,
        name: `Batch E2E ${suffix}`,
        status: 'active',
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        ends_at: new Date(now + 24 * 60 * 60_000).toISOString(),
      })
      .select('id')
      .single()
    if (batchError) throw batchError

    const { data: membership, error: membershipError } = await db
      .from('organization_participants')
      .insert({
        organization_id: organizationId,
        batch_id: batch.id,
        user_id: participant.userId,
        participant_code: `P-${suffix}`,
        full_name_snapshot: 'Peserta E2E Organization',
        email_snapshot: participant.email,
        status: 'active',
      })
      .select('id')
      .single()
    if (membershipError) throw membershipError

    const { data: assignment, error: assignmentError } = await db
      .from('organization_exam_assignments')
      .insert({
        organization_id: organizationId,
        batch_id: batch.id,
        exam_id: exam.id,
        assigned_by: participant.userId,
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        due_at: new Date(now + 24 * 60 * 60_000).toISOString(),
        is_active: true,
      })
      .select('id')
      .single()
    if (assignmentError) throw assignmentError
    assignmentId = assignment.id

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
    const { data: fullTryoutType, error: fullTryoutTypeError } = await db
      .from('exam_types')
      .select('id')
      .eq('code', 'FULL_TRYOUT')
      .single()
    if (fullTryoutTypeError) throw fullTryoutTypeError
    const { data: tkaExam, error: tkaExamError } = await db
      .from('exams')
      .select('id,title,status')
      .eq('program_id', tkaProgram.id)
      .eq('track_id', tkaTrack.id)
      .eq('exam_type_id', fullTryoutType.id)
      .eq('slug', 'tka-smp-full')
      .in('status', ['active', 'ACTIVE', 'published', 'PUBLISHED', 'ready', 'READY'])
      .single()
    if (tkaExamError) throw tkaExamError
    const { data: tkaAssignment, error: tkaAssignmentError } = await db
      .from('organization_exam_assignments')
      .insert({
        organization_id: organizationId,
        batch_id: batch.id,
        exam_id: tkaExam.id,
        assigned_by: participant.userId,
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        due_at: new Date(now + 24 * 60 * 60_000).toISOString(),
        is_active: true,
      })
      .select('id')
      .single()
    if (tkaAssignmentError) throw tkaAssignmentError
    tkaAssignmentId = tkaAssignment.id

    // Same participant/org/batch contract for Mini Tryout and Drill types.
    for (const [slug, kind, examTypeCode] of [
      ['qa-cpns-drill-tiu', 'CPNS', 'DRILL'],
      ['tka-smp-mini-matematika', 'TKA', 'MINI_TRYOUT'],
      ['tka-smp-drill-mat-aljabar', 'TKA', 'DRILL'],
    ] as const) {
      const { data: matrixExam, error: matrixExamError } = await db
        .from('exams')
        .select('id,title')
        .eq('slug', slug)
        .in('status', ['active', 'ACTIVE'])
        .single()
      if (matrixExamError) throw matrixExamError
      const { data: matrixAssignment, error: matrixAssignmentError } = await db
        .from('organization_exam_assignments')
        .insert({
          organization_id: organizationId,
          batch_id: batch.id,
          exam_id: matrixExam.id,
          assigned_by: participant.userId,
          starts_at: new Date(now - 5 * 60_000).toISOString(),
          due_at: new Date(now + 24 * 60 * 60_000).toISOString(),
          is_active: true,
        })
        .select('id')
        .single()
      if (matrixAssignmentError) throw matrixAssignmentError
      organizationMatrixAssignments.push({
        id: matrixAssignment.id,
        examId: matrixExam.id,
        title: matrixExam.title,
        slug,
        kind,
        examTypeCode,
      })
    }

    const { data: otherBatch, error: otherBatchError } = await db
      .from('organization_batches')
      .insert({
        organization_id: organizationId,
        code: `B2-${suffix}`,
        name: `Batch Kedua E2E ${suffix}`,
        status: 'active',
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        ends_at: new Date(now + 24 * 60 * 60_000).toISOString(),
      })
      .select('id')
      .single()
    if (otherBatchError) throw otherBatchError
    const { data: sameOrgOtherBatchAssignment, error: sameOrgOtherBatchAssignmentError } = await db
      .from('organization_exam_assignments')
      .insert({
        organization_id: organizationId,
        batch_id: otherBatch.id,
        exam_id: exam.id,
        assigned_by: participant.userId,
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        due_at: new Date(now + 24 * 60 * 60_000).toISOString(),
        is_active: true,
      })
      .select('id')
      .single()
    if (sameOrgOtherBatchAssignmentError) throw sameOrgOtherBatchAssignmentError
    sameOrgOtherBatchAssignmentId = sameOrgOtherBatchAssignment.id

    otherOrganizationName = `E2E Instansi Lain ${suffix}`
    const { data: otherOrganization, error: otherOrganizationError } = await db
      .from('organizations')
      .insert({
        name: otherOrganizationName,
        code: `E2EB-${suffix}`,
        type: 'instansi',
        status: 'active',
      })
      .select('id')
      .single()
    if (otherOrganizationError) throw otherOrganizationError
    otherOrganizationId = otherOrganization.id
    const { data: foreignBatch, error: foreignBatchError } = await db
      .from('organization_batches')
      .insert({
        organization_id: otherOrganizationId,
        code: `B2-${suffix}`,
        name: `Batch Lain E2E ${suffix}`,
        status: 'active',
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        ends_at: new Date(now + 24 * 60 * 60_000).toISOString(),
      })
      .select('id')
      .single()
    if (foreignBatchError) throw foreignBatchError
    const { data: otherAssignment, error: otherAssignmentError } = await db
      .from('organization_exam_assignments')
      .insert({
        organization_id: otherOrganizationId,
        batch_id: foreignBatch.id,
        exam_id: exam.id,
        assigned_by: participant.userId,
        starts_at: new Date(now - 5 * 60_000).toISOString(),
        due_at: new Date(now + 24 * 60 * 60_000).toISOString(),
        is_active: true,
      })
      .select('id')
      .single()
    if (otherAssignmentError) throw otherAssignmentError
    otherAssignmentId = otherAssignment.id

    await page.goto('/cpns/dashboard/assignments', nav)
    const card = page.getByTestId('organization-assignment').filter({ hasText: exam.title })
    await expect(card).toContainText(exam.title)
    await expect(card.getByText('Belum dimulai', { exact: true })).toBeVisible()

    // A guessed cross-organization assignment id must be rejected by the Server Action.
    for (const forgedAssignmentId of [sameOrgOtherBatchAssignmentId, otherAssignmentId]) {
      await card.locator('input[name="assignment_id"]').evaluate((input, forgedId) => {
        ;(input as HTMLInputElement).value = String(forgedId)
        ;(input as HTMLInputElement).form?.requestSubmit()
      }, forgedAssignmentId)
      await expect(page).toHaveURL(/\/cpns\/dashboard\/assignments\?error=not-found$/)
      await expect(page.locator('p[role="alert"]')).toContainText('bukan milik akun Anda')
      const { count, error } = await db
        .from('exam_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', participant.userId)
        .eq('assignment_id', forgedAssignmentId)
      if (error) throw error
      expect(count).toBe(0)
      await page.goto('/cpns/dashboard/assignments', nav)
    }

    await page.goto('/cpns/dashboard/assignments', nav)
    const allowedCard = page.getByTestId('organization-assignment').filter({ hasText: exam.title })
    const twinParticipantPage = await page.context().newPage()
    await twinParticipantPage.goto('/cpns/dashboard/assignments', nav)
    const twinAllowedCard = twinParticipantPage
      .getByTestId('organization-assignment')
      .filter({ hasText: exam.title })
    await expect(twinAllowedCard.getByRole('button', { name: 'Mulai', exact: true })).toBeVisible()
    await Promise.all([
      allowedCard.getByRole('button', { name: 'Mulai', exact: true }).click(),
      twinAllowedCard.getByRole('button', { name: 'Mulai', exact: true }).click(),
    ])
    await page.waitForURL(attemptUrl, nav)
    await twinParticipantPage.waitForURL(attemptUrl, nav)
    const firstAttemptUrl = page.url()
    attemptId = firstAttemptUrl.match(attemptUrl)?.[1] ?? ''
    expect(twinParticipantPage.url().match(attemptUrl)?.[1]).toBe(attemptId)
    await twinParticipantPage.close()
    if (attemptId) attemptsToClean.push(attemptId)
    expect(attemptId).not.toBe('')
    const { count: activeOrganizationAttempts, error: activeOrganizationAttemptsError } = await db
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', participant.userId)
      .eq('assignment_id', assignmentId)
      .in('status', ['in_progress', 'IN_PROGRESS', 'created', 'CREATED'])
    if (activeOrganizationAttemptsError) throw activeOrganizationAttemptsError
    expect(activeOrganizationAttempts).toBe(1)
    const firstOption = page.getByTestId('answer-option-0').first()
    await expect(firstOption).toBeVisible()
    await firstOption.click()
    await expect(firstOption).toHaveClass(/border-blue-600/)
    await waitForSavedFirstAnswer(db, attemptId)

    await page.reload(nav)
    await expect(page).toHaveURL(firstAttemptUrl)
    await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
    await page.goto('/cpns/dashboard/assignments', nav)
    const resumeCard = page.getByTestId('organization-assignment').filter({ hasText: exam.title })
    await expect(resumeCard.getByText('Sedang dikerjakan', { exact: true })).toBeVisible()
    await resumeCard.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
    await page.waitForURL(attemptUrl, nav)
    expect(page.url()).toBe(firstAttemptUrl)

    const concurrentOrganizationSubmitPage = await page.context().newPage()
    await concurrentOrganizationSubmitPage.goto(firstAttemptUrl, nav)
    await concurrentOrganizationSubmitPage.getByRole('button', { name: /^Buka soal 110$/ }).click()
    const lastQuestion = page.getByRole('button', { name: /^Buka soal \d+$/ }).last()
    await lastQuestion.click()
    await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
    await concurrentOrganizationSubmitPage
      .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
      .click()
    const finishPrompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
    await expect(finishPrompt).toBeVisible()
    const twinFinishPrompt = concurrentOrganizationSubmitPage.getByRole('heading', {
      name: 'Kumpulkan jawaban?',
      exact: true,
    })
    await expect(twinFinishPrompt).toBeVisible()
    await Promise.all([
      finishPrompt
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
      twinFinishPrompt
        .locator('..')
        .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
        .click(),
    ])
    await page.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentOrganizationSubmitPage.waitForURL(resultUrl, { ...nav, timeout: 60_000 })
    await concurrentOrganizationSubmitPage.close()
    expect(page.url().match(resultUrl)?.[1]).toBe(attemptId)
    expect(concurrentOrganizationSubmitPage.url().match(resultUrl)?.[1]).toBe(attemptId)
    await expect(
      page.getByRole('heading', { name: /Hasilnya sudah jelas|Sesi selesai/i }),
    ).toBeVisible()

    const { data: completed, error: completedError } = await db
      .from('exam_attempts')
      .select(
        'source, organization_id, batch_id, assignment_id, participant_id, status, total_score, percentage',
      )
      .eq('id', attemptId)
      .single()
    if (completedError) throw completedError
    expect(completed).toMatchObject({
      source: 'organization',
      organization_id: organizationId,
      batch_id: batch.id,
      assignment_id: assignmentId,
      participant_id: membership.id,
    })
    expect(String(completed.status).toLowerCase()).toBe('completed')

    await page.goto('/cpns/dashboard/assignments', nav)
    const completedCard = page
      .getByTestId('organization-assignment')
      .filter({ hasText: exam.title })
    await expect(completedCard.getByText('Selesai', { exact: true })).toBeVisible()
    await expect(
      completedCard.getByRole('link', { name: 'Lihat hasil', exact: true }),
    ).toHaveAttribute('href', `/cpns/dashboard/tryout/${attemptId}/result`)

    // Verify admin monitoring and the export RPC use this Organization attempt's result.
    const adminUser = await provisionRoleUser(supabaseUrl, 'ADMIN')
    adminUserId = adminUser.userId
    adminContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const adminPage = await adminContext.newPage()
    await loginAs(adminPage, adminUser, '/admin/organizations')
    const adminBatchUrl = `/admin/organizations?org=${organizationId}&batch=${batch.id}`
    await adminPage.goto(adminBatchUrl, nav)
    await adminPage
      .getByRole('navigation', { name: 'Bagian workspace' })
      .getByRole('link', { name: 'Monitoring', exact: true })
      .click()
    await expect(adminPage).toHaveURL(
      new RegExp(`/admin/organizations/${organizationId}/batches/${batch.id}/monitoring(?:\\?|$)`),
    )
    const adminMonitoringUrl = adminPage.url()
    expect(adminUrlState(adminMonitoringUrl).get('org')).toBe(organizationId)
    expect(adminUrlState(adminMonitoringUrl).get('batch')).toBe(batch.id)
    const participantRow = adminPage.locator(`tr[data-participant-id="${membership.id}"]`)
    await expect(participantRow).toBeVisible()
    await expect(participantRow).toContainText('Selesai')
    await expect(participantRow).toContainText(String(completed.total_score))
    await participantRow.getByRole('link', { name: 'Lihat Hasil', exact: true }).click()
    await expect(adminPage).toHaveURL(new RegExp(`/admin/monitoring/results/${attemptId}`))
    expect(adminUrlState(adminPage.url()).get('assignment')).toBe(assignmentId)
    expect(new URL(adminPage.url()).searchParams.get('exam')).toBe(exam.id)
    for (const section of ['TWK', 'TIU', 'TKP'])
      await expect(adminPage.locator('main table')).toContainText(section)
    await adminPage.getByRole('link', { name: '← Kembali ke Monitoring', exact: true }).click()
    await expect(adminPage).toHaveURL(adminMonitoringUrl)

    const authenticatedAdmin = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: adminLoginError } = await authenticatedAdmin.auth.signInWithPassword({
      email: adminUser.email,
      password: adminUser.password,
    })
    if (adminLoginError) throw adminLoginError
    const { data: exported, error: exportError } = await authenticatedAdmin.rpc(
      'admin_export_organization',
      {
        p_organization_id: organizationId,
        p_batch_id: batch.id,
      },
    )
    if (exportError) throw exportError
    const exportDetail = exported.detail as { columns: string[]; rows: unknown[][] }
    const scoreIndex = exportDetail.columns.indexOf('total_skor')
    const codeIndex = exportDetail.columns.indexOf('participant_code')
    const exportedParticipant = exportDetail.rows.find((row) => row[codeIndex] === `P-${suffix}`)
    expect(scoreIndex).toBeGreaterThanOrEqual(0)
    expect(exportedParticipant?.[scoreIndex]).toBe(completed.total_score)

    const wrongBatchExport = await authenticatedAdmin.rpc('admin_export_organization', {
      p_organization_id: organizationId,
      p_batch_id: otherBatch.id,
    })
    if (wrongBatchExport.error) throw wrongBatchExport.error
    expect((wrongBatchExport.data.detail as { rows: unknown[][] }).rows).toHaveLength(0)

    const exportDownload = adminPage.waitForEvent('download')
    await adminPage.getByRole('link', { name: 'Unduh XLSX', exact: true }).click()
    const download = await exportDownload
    expect(download.suggestedFilename()).toContain(`nilai-instansi-`)
    const file = await download.createReadStream()
    if (!file) throw new Error('XLSX export did not produce a download stream.')
    const firstBytes = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        if (Buffer.concat(chunks).length >= 4) {
          file.destroy()
          resolve(Buffer.concat(chunks).subarray(0, 4))
        }
      })
      file.on('error', reject)
      file.on('end', () => resolve(Buffer.concat(chunks).subarray(0, 4)))
    })
    expect(firstBytes.subarray(0, 2).toString()).toBe('PK')

    // The MVP PRD assigns organization administration to internal Siap Tempur
    // operators. A platform ADMIN therefore retains cross-organization access.
    await adminPage.goto(`/admin/organizations?org=${otherOrganizationId}`, nav)
    await expect(adminPage.locator('main h1')).toHaveText(otherOrganizationName)

    // The same participant assignment bridge supports TKA SMP's section-aware RPC context.
    await page.goto('/cpns/dashboard/assignments', nav)
    const tkaCard = page.getByTestId('organization-assignment').filter({ hasText: tkaExam.title })
    await expect(tkaCard.getByText('Belum dimulai', { exact: true })).toBeVisible()
    const tokenBeforeTka = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_tka')
      .maybeSingle()
    if (tokenBeforeTka.error) throw tokenBeforeTka.error
    originalTkaWallet = {
      existed: Boolean(tokenBeforeTka.data),
      balance: Number(tokenBeforeTka.data?.balance ?? 0),
    }
    await tkaCard.getByRole('button', { name: 'Mulai', exact: true }).click()
    await page.waitForURL(tkaAttemptUrl, nav)
    tkaAttemptId = page.url().match(tkaAttemptUrl)?.[1] ?? ''
    if (tkaAttemptId) attemptsToClean.push(tkaAttemptId)
    expect(tkaAttemptId).not.toBe('')
    const { data: activeTkaAttempt, error: activeTkaAttemptError } = await db
      .from('exam_attempts')
      .select('source,organization_id,batch_id,assignment_id,participant_id,status,metadata')
      .eq('id', tkaAttemptId)
      .single()
    if (activeTkaAttemptError) throw activeTkaAttemptError
    expect(activeTkaAttempt).toMatchObject({
      source: 'organization',
      organization_id: organizationId,
      batch_id: batch.id,
      assignment_id: tkaAssignmentId,
      participant_id: membership.id,
    })
    expect(String(activeTkaAttempt.status).toLowerCase()).toBe('in_progress')
    expect(activeTkaAttempt.metadata).toMatchObject({
      assignmentId: tkaAssignmentId,
      accessContext: 'organization',
    })
    await expect(page.getByText('Soal 1 dari 30', { exact: true })).toBeVisible()
    const tkaOption = page.getByRole('article').last().getByRole('button').first()
    await tkaOption.click()
    await expect(tkaOption).toHaveAttribute('data-selected', 'true')
    await waitForSavedFirstAnswer(db, tkaAttemptId)
    await page.reload(nav)
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await page.goto('/cpns/dashboard/assignments', nav)
    const tkaResumeCard = page
      .getByTestId('organization-assignment')
      .filter({ hasText: tkaExam.title })
    await expect(tkaResumeCard.getByText('Sedang dikerjakan', { exact: true })).toBeVisible()
    await tkaResumeCard.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
    await page.waitForURL(tkaAttemptUrl, nav)
    expect(page.url().match(tkaAttemptUrl)?.[1]).toBe(tkaAttemptId)
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await page.getByRole('button', { name: /^Buka soal 30/ }).click()
    await finishFullTkaSection(page, 'Selesaikan bagian')
    await expect(page.getByRole('heading', { name: 'Matematika' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /^Buka soal 30/ }).click()
    const mathOption = page.getByRole('article').last().getByRole('button').first()
    await mathOption.click()
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await page.getByRole('button', { name: /^Buka soal 30/ }).click()
    await finishFullTkaSection(page, 'Kirim tryout')
    await expect
      .poll(
        async () => {
          const { data, error } = await db
            .from('exam_attempts')
            .select('status')
            .eq('id', tkaAttemptId)
            .single()
          if (error) throw error
          return String(data.status).toLowerCase()
        },
        { timeout: 60_000 },
      )
      .toBe('completed')
    await expect(page).toHaveURL(tkaResultUrl, { timeout: 20_000 })
    const { data: completedTka, error: completedTkaError } = await db
      .from('exam_attempts')
      .select(
        'source,organization_id,batch_id,assignment_id,participant_id,status,total_score,metadata',
      )
      .eq('id', tkaAttemptId)
      .single()
    if (completedTkaError) throw completedTkaError
    expect(completedTka).toMatchObject({
      source: 'organization',
      organization_id: organizationId,
      batch_id: batch.id,
      assignment_id: tkaAssignmentId,
      participant_id: membership.id,
    })
    expect(String(completedTka.status).toLowerCase()).toBe('completed')
    expect(completedTka.metadata).toMatchObject({
      assignmentId: tkaAssignmentId,
      accessContext: 'organization',
    })
    await adminPage.goto(
      `/admin/monitoring?org=${organizationId}&batch=${batch.id}&assignment=${tkaAssignmentId}`,
      nav,
    )
    const tkaMonitoringRow = adminPage.locator(`tr[data-participant-id="${membership.id}"]`)
    await expect(tkaMonitoringRow).toBeVisible()
    await expect(tkaMonitoringRow).toContainText('Selesai')
    await expect(tkaMonitoringRow).toContainText(String(completedTka.total_score))
    const { data: tkaExport, error: tkaExportError } = await authenticatedAdmin.rpc(
      'admin_export_organization',
      {
        p_organization_id: organizationId,
        p_batch_id: batch.id,
      },
    )
    if (tkaExportError) throw tkaExportError
    const tkaExportDetail = tkaExport.detail as { columns: string[]; rows: unknown[][] }
    const tkaExportScoreIndex = tkaExportDetail.columns.indexOf('total_skor')
    const tkaExportCodeIndex = tkaExportDetail.columns.indexOf('participant_code')
    const tkaExportParticipant = tkaExportDetail.rows.find(
      (row) => row[tkaExportCodeIndex] === `P-${suffix}`,
    )
    expect(tkaExportScoreIndex).toBeGreaterThanOrEqual(0)
    expect(tkaExportParticipant?.[tkaExportScoreIndex]).toBe(completedTka.total_score)
    const tokenAfterTka = await db
      .from('wallets')
      .select('balance')
      .eq('user_id', participant.userId)
      .eq('wallet_type', 'exam_token_tka')
      .maybeSingle()
    if (tokenAfterTka.error) throw tokenAfterTka.error
    expect(Number(tokenAfterTka.data?.balance ?? 0)).toBe(originalTkaWallet.balance)

    // Assignment access is independent of the participant's personal TKA wallet.
    if (tokenAfterTka.data) {
      const { error } = await db
        .from('wallets')
        .update({ balance: 0 })
        .eq('user_id', participant.userId)
        .eq('wallet_type', 'exam_token_tka')
      if (error) throw error
    } else {
      const { error } = await db
        .from('wallets')
        .insert({ user_id: participant.userId, wallet_type: 'exam_token_tka', balance: 0 })
      if (error) throw error
    }

    // Distributed types share the participant assignment/result bridge; the
    // assessment engine remains the existing CPNS/TKA session flow.
    for (const matrix of organizationMatrixAssignments) {
      await page.goto('/cpns/dashboard/assignments', nav)
      const matrixCard = page
        .getByTestId('organization-assignment')
        .filter({ hasText: matrix.title })
      await expect(matrixCard.getByText('Belum dimulai', { exact: true })).toBeVisible()
      await matrixCard.getByRole('button', { name: 'Mulai', exact: true }).click()
      const targetUrl = matrix.kind === 'TKA' ? tkaAttemptUrl : attemptUrl
      await page.waitForURL(targetUrl, nav)
      const matrixAttemptId = page.url().match(targetUrl)?.[1] ?? ''
      expect(matrixAttemptId).not.toBe('')
      attemptsToClean.push(matrixAttemptId)
      const { data: startedMatrixAttempt, error: startedMatrixError } = await db
        .from('exam_attempts')
        .select('source,organization_id,batch_id,assignment_id,participant_id,status,metadata')
        .eq('id', matrixAttemptId)
        .single()
      if (startedMatrixError) throw startedMatrixError
      expect(startedMatrixAttempt).toMatchObject({
        source: 'organization',
        organization_id: organizationId,
        batch_id: batch.id,
        assignment_id: matrix.id,
        participant_id: membership.id,
      })
      expect(startedMatrixAttempt.metadata).toMatchObject({
        assignmentId: matrix.id,
        accessContext: 'organization',
        examTypeCode: matrix.examTypeCode,
      })

      if (matrix.kind === 'CPNS') {
        const option = page.getByTestId('answer-option-0').first()
        await option.click()
        await expect(option).toHaveClass(/border-blue-600/)
        await waitForSavedFirstAnswer(db, matrixAttemptId)
        await page.reload(nav)
        await expect(page.getByTestId('answer-option-0').first()).toHaveClass(/border-blue-600/)
      } else if (matrix.examTypeCode === 'DRILL') {
        await expect(page.getByText(/Soal 1\s*\/\s*10/)).toBeVisible()
        const option = page.locator('article').last().getByRole('button').first()
        await option.click()
        await expect(option).toHaveClass(/border-indigo-600/)
        await expect(page.getByText('1/10', { exact: true })).toBeVisible({ timeout: 15_000 })
        await waitForSavedFirstAnswer(db, matrixAttemptId)
        await page.reload(nav)
        await expect(page.locator('article').last().getByRole('button').first()).toHaveClass(
          /border-indigo-600/,
        )
      } else {
        const count = matrix.slug.includes('mini') ? '15' : '10'
        await expect(page.getByText(`Soal 1 dari ${count}`, { exact: true })).toBeVisible()
        const option = page.locator('article').last().getByRole('button').first()
        await option.click()
        await expect(option).toHaveAttribute('data-selected', 'true')
        await waitForSavedFirstAnswer(db, matrixAttemptId)
        await page.reload(nav)
        await expect(page.getByText(/Terjawab bagian ini:/)).toContainText(`1/${count}`)
      }

      await page.goto('/cpns/dashboard/assignments', nav)
      const resumeMatrixCard = page
        .getByTestId('organization-assignment')
        .filter({ hasText: matrix.title })
      await expect(resumeMatrixCard.getByText('Sedang dikerjakan', { exact: true })).toBeVisible()
      await resumeMatrixCard.getByRole('button', { name: 'Lanjutkan', exact: true }).click()
      await page.waitForURL(targetUrl, nav)
      expect(page.url().match(targetUrl)?.[1]).toBe(matrixAttemptId)

      if (matrix.kind === 'CPNS') {
        await page
          .getByRole('button', { name: /^Buka soal \d+$/ })
          .last()
          .click()
        await page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).click()
        const prompt = page.getByRole('heading', { name: 'Kumpulkan jawaban?', exact: true })
        await expect(prompt).toBeVisible()
        await prompt
          .locator('..')
          .getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
          .click()
        await page.waitForURL(resultUrl, { ...nav, timeout: 45_000 })
      } else if (matrix.examTypeCode === 'DRILL') {
        await page.getByRole('button', { name: /^Buka soal 10(?:,|$)/ }).click()
        await page.getByRole('button', { name: 'Selesai', exact: true }).click()
        const prompt = page.getByRole('heading', { name: 'Akhiri tryout ini?', exact: true })
        await expect(prompt).toBeVisible()
        await page.getByRole('button', { name: 'Ya, kirim jawaban', exact: true }).click()
        await page.waitForURL(tkaResultUrl, { ...nav, timeout: 45_000 })
      } else {
        const count = matrix.slug.includes('mini') ? '15' : '10'
        await page.getByRole('button', { name: new RegExp(`^Buka soal ${count}(?:\\s|$)`) }).click()
        await page.getByRole('button', { name: 'Kirim tryout', exact: true }).click()
        await confirmTkaSectionIfPresent(page)
        await expect(page).toHaveURL(tkaResultUrl, { timeout: 45_000 })
      }
      expect(page.url()).toContain(matrixAttemptId)
      const { data: finishedMatrix, error: finishedMatrixError } = await db
        .from('exam_attempts')
        .select('status,assignment_id,metadata')
        .eq('id', matrixAttemptId)
        .single()
      if (finishedMatrixError) throw finishedMatrixError
      expect(String(finishedMatrix.status).toLowerCase()).toBe('completed')
      expect(finishedMatrix.assignment_id).toBe(matrix.id)
      expect(finishedMatrix.metadata).toMatchObject({
        assignmentId: matrix.id,
        accessContext: 'organization',
      })
    }

    await page.goto('/tka/sma', nav)
    await expect(
      page.getByRole('heading', { name: 'Assessment TKA SMA belum tersedia', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('Akses assessment tambahan belum tersedia.', {
        exact: false,
      }),
    ).toBeVisible()
    const unavailableLinks = page.locator('main').getByRole('link')
    await expect(unavailableLinks).toHaveCount(1)
    await expect(unavailableLinks.first()).toHaveAttribute('href', '/tka')
  } finally {
    if (adminContext) await adminContext.close().catch(() => undefined)
    if (adminUserId) await cleanupRoleUser(supabaseUrl, adminUserId)
    if (attemptsToClean.length) {
      const { data: questions } = await db
        .from('attempt_questions')
        .select('id')
        .in('attempt_id', attemptsToClean)
      const questionIds = (questions ?? []).map((question) => question.id)
      if (questionIds.length)
        await db.from('attempt_answers').delete().in('attempt_question_id', questionIds)
      await db.from('attempt_scores').delete().in('attempt_id', attemptsToClean)
      await db.from('attempt_questions').delete().in('attempt_id', attemptsToClean)
      await db.from('attempt_section_states').delete().in('attempt_id', attemptsToClean)
      await db.from('attempt_events').delete().in('attempt_id', attemptsToClean)
      await db.from('exam_attempts').delete().in('id', attemptsToClean)
    }
    if (organizationId) await db.from('organizations').delete().eq('id', organizationId)
    if (otherOrganizationId) await db.from('organizations').delete().eq('id', otherOrganizationId)
    if (originalTkaWallet) {
      if (originalTkaWallet.existed) {
        await db
          .from('wallets')
          .update({ balance: originalTkaWallet.balance })
          .eq('user_id', participant.userId)
          .eq('wallet_type', 'exam_token_tka')
      } else {
        await db
          .from('wallets')
          .delete()
          .eq('user_id', participant.userId)
          .eq('wallet_type', 'exam_token_tka')
      }
    }
  }
})
