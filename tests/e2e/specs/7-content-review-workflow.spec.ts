import { expect, test, type Locator, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

type UserMeta = { userId: string; email: string; password: string }
type Metadata = { runId: string; editor: UserMeta; reviewer: UserMeta }
const metadataFile = path.join(__dirname, '../../../playwright/.auth/content-review-users.json')
const workspaceReturnTo = '/admin/content/review?program=TKA&track=SMP'

async function metadata(): Promise<Metadata> {
    return JSON.parse(await readFile(metadataFile, 'utf8')) as Metadata
}

async function login(page: Page, user: UserMeta) {
    await page.goto(`/login?returnTo=${encodeURIComponent(workspaceReturnTo)}`)
    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="password"]').fill(user.password)
    await page.getByRole('button', { name: /Masuk|Login/i }).click()
    await page.waitForURL(/\/admin\/content\/review/)
}

async function followServerAction(page: Page, trigger: Locator) {
    const responsePromise = page.waitForResponse((response) => {
        const request = response.request()
        return request.method() === 'POST' && Boolean(request.headers()['next-action'])
    })

    await trigger.click()
    const response = await responsePromise
    expect(response.status()).toBe(303)

    const actionRedirect = response.headers()['x-action-redirect']
    expect(actionRedirect).toBeTruthy()
    const target = actionRedirect!.split(';')[0]
    expect(target).toMatch(/^\/admin\/content\/review\?/)

    // Next's client router normally follows x-action-redirect. In the headless
    // production-build runner this transition is not deterministic, so follow
    // the verified server redirect explicitly and continue testing the exact
    // destination the browser was instructed to render.
    await page.goto(target)
    await expect(page).toHaveURL(/\/admin\/content\/review/)
}

async function openQuestion(page: Page, questionId: string) {
    await page.goto(`/admin/content/review?program=TKA&track=SMP&question=${encodeURIComponent(questionId)}`)
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.getByRole('heading', { name: 'Reviewer Workspace' })).toBeVisible()
}

async function assignToReviewer(page: Page, reviewerId: string) {
    const select = page.locator('select[name="reviewer_id"]')
    await expect(select).toBeVisible()
    await select.selectOption(reviewerId)
    await followServerAction(page, page.getByRole('button', { name: 'Assign', exact: true }))
    await expect(page.getByText('Reviewer berhasil ditugaskan.')).toBeVisible()
}

async function approveStage(page: Page, note: string) {
    const notes = page.locator('textarea[name="notes"]')
    await expect(notes).toBeVisible()
    await notes.fill(note)
    await followServerAction(page, page.getByRole('button', { name: 'Approve', exact: true }))
    await expect(page.getByText('Keputusan review tersimpan.')).toBeVisible()
}

test('author → reviewer → editorial → academic → technical QA → published', async ({ browser }) => {
    test.setTimeout(120_000)
    const users = await metadata()
    const uniqueStem = `E2E Content Workflow ${users.runId}`

    const editorContext = await browser.newContext()
    const editorPage = await editorContext.newPage()
    await login(editorPage, users.editor)

    await editorPage.goto('/cpns/admin/review?program=TKA&track=SMP')
    await expect(editorPage).toHaveURL(/\/admin\/content\/review\?program=TKA&track=SMP/)

    await editorPage.goto('/admin/content/review?program=TKA&track=SMP&new=1')
    await expect(editorPage).toHaveURL(/\/admin\/content\/review/)
    await expect(editorPage.getByRole('heading', { name: 'Reviewer Workspace' })).toBeVisible()
    await expect(editorPage.getByText('CONTENT_EDITOR', { exact: true })).toBeVisible()

    const createSection = editorPage.locator('section').filter({
        has: editorPage.getByRole('heading', { name: 'Buat draft soal' }),
    })
    await expect(createSection).toBeVisible()
    const form = createSection.locator('form')

    await form.getByLabel('Subject').selectOption('BIN')
    await form.getByLabel('Tipe soal').selectOption('single_choice')
    await form.getByLabel('Pertanyaan').fill(uniqueStem)
    await form.getByLabel('Difficulty').selectOption('medium')
    await form.getByLabel('Cognitive level').fill('application')
    await form.getByLabel('Estimasi detik').fill('60')
    await form.getByLabel('Source reference').fill('CI reviewer workspace')
    await form.getByLabel(/Options — key\|content\|score\|correct\|group\|groupOrder\|imageUrl/).fill([
        'A|Jawaban benar||true|||',
        'B|Distraktor satu||false|||',
        'C|Distraktor dua||false|||',
        'D|Distraktor tiga||false|||',
    ].join('\n'))
    await form.getByLabel('Pembahasan').fill('Pembahasan E2E: pilihan A adalah jawaban yang benar.')
    await followServerAction(editorPage, form.getByRole('button', { name: 'Simpan draft' }))
    await expect(editorPage.getByText('Draft soal tersimpan.')).toBeVisible()

    const questionId = new URL(editorPage.url()).searchParams.get('question') || ''
    expect(questionId).toMatch(/^[0-9a-f-]{36}$/i)

    await expect(editorPage.getByRole('heading', { name: 'Edit draft / revisi' })).toBeVisible()
    await expect(editorPage.getByLabel('Pertanyaan')).toHaveValue(uniqueStem)
    await expect(editorPage.getByLabel('Pembahasan')).toHaveValue('Pembahasan E2E: pilihan A adalah jawaban yang benar.')

    await followServerAction(editorPage, editorPage.getByRole('button', { name: /Kirim ke Editorial Review/ }))
    await expect(editorPage.getByText('Soal dikirim ke Editorial Review.')).toBeVisible()
    await expect(editorPage.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0)
    await editorContext.close()

    const reviewerContext = await browser.newContext()
    const reviewerPage = await reviewerContext.newPage()
    await login(reviewerPage, users.reviewer)
    await openQuestion(reviewerPage, questionId)
    await expect(reviewerPage.getByText('CONTENT_REVIEWER', { exact: true })).toBeVisible()

    await assignToReviewer(reviewerPage, users.reviewer.userId)
    await approveStage(reviewerPage, 'Editorial E2E approved')
    await expect(reviewerPage.getByText('academic_review', { exact: true }).last()).toBeVisible()

    await assignToReviewer(reviewerPage, users.reviewer.userId)
    await approveStage(reviewerPage, 'Academic E2E approved')
    await expect(reviewerPage.getByText('technical_qa', { exact: true }).last()).toBeVisible()

    await assignToReviewer(reviewerPage, users.reviewer.userId)
    await approveStage(reviewerPage, 'Technical QA E2E approved')
    await expect(reviewerPage.getByText('approved', { exact: true }).last()).toBeVisible()

    await followServerAction(reviewerPage, reviewerPage.getByRole('button', { name: 'Publish Question' }))
    await expect(reviewerPage.getByText('Soal berhasil dipublish.')).toBeVisible()
    await expect(reviewerPage.getByText('published', { exact: true }).last()).toBeVisible()

    const reviewRounds = reviewerPage.locator('section').filter({
        has: reviewerPage.getByRole('heading', { name: 'Review Rounds' }),
    })
    await expect(reviewRounds).toContainText('Round 1 · Editorial Review')
    await expect(reviewRounds).toContainText('Editorial E2E approved')
    await expect(reviewRounds).toContainText('Round 1 · Academic Review')
    await expect(reviewRounds).toContainText('Academic E2E approved')
    await expect(reviewRounds).toContainText('Round 1 · Technical QA')
    await expect(reviewRounds).toContainText('Technical QA E2E approved')

    const auditTrail = reviewerPage.locator('section').filter({
        has: reviewerPage.getByRole('heading', { name: 'Audit Trail' }),
    })
    await expect(auditTrail).toContainText('question.workflow.published')
    await expect(auditTrail).toContainText('content.review.approved')

    await reviewerContext.close()
})
