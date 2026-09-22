import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
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
    await page.getByRole('button', { name: 'Masuk', exact: true }).click()
    await page.waitForURL(/\/admin\/content\/review/)
}

async function followServerAction(page: Page, trigger: Locator) {
    const responsePromise = page.waitForResponse((response) => {
        const request = response.request()
        return request.method() === 'POST' && Boolean(request.headers()['next-action'])
    })

    await trigger.click()
    const response = await responsePromise
    // Server Action dengan JS aktif dijawab 200 (redirect ditangani router di
    // klien); jawaban 303 hanya untuk submit tanpa JS. Keduanya sukses.
    expect([200, 303]).toContain(response.status())

    const actionRedirect = response.headers()['x-action-redirect']
    expect(actionRedirect).toBeTruthy()
    const target = actionRedirect!.split(';')[0]
    expect(target).toMatch(/^\/admin\/content\/review\?/)

    await page.goto(target)
    await expect(page).toHaveURL(/\/admin\/content\/review/)
}

async function openQuestion(page: Page, questionId: string) {
    await page.goto(`/admin/content/review?program=TKA&track=SMP&question=${encodeURIComponent(questionId)}`)
    await expect(page).toHaveURL(/\/admin\/content\/review/)
    await expect(page.getByRole('heading', { name: 'Reviewer Workspace' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Progres review' })).toBeVisible()
    const previewTop = await page.getByRole('heading', { name: 'Periksa isi soal' }).evaluate((element) => element.getBoundingClientRect().top)
    const actionTop = await page.getByRole('heading', { name: 'Tindakan berikutnya' }).evaluate((element) => element.getBoundingClientRect().top)
    expect(previewTop).toBeLessThan(actionTop)
}

async function assignToReviewer(page: Page) {
    // Aturan C: CONTENT_REVIEWER hanya bisa mengklaim untuk dirinya sendiri;
    // dropdown "Tugaskan" hanya untuk pemegang content.assign/question.manage.
    await followServerAction(page, page.getByRole('button', { name: 'Klaim untuk saya', exact: true }))
    await expect(page.getByText('Reviewer berhasil ditugaskan.')).toBeVisible()
}

async function approveStage(page: Page, note: string) {
    const notes = page.locator('textarea[name="notes"]')
    await expect(notes).toBeVisible()
    await notes.fill(note)
    await followServerAction(page, page.getByRole('button', { name: 'Setujui', exact: true }))
    await expect(page.getByText('Keputusan review tersimpan.')).toBeVisible()
}

test('article workspace loads with schema-v2 content permissions', async ({ browser }) => {
    const users = await metadata()

    const editorContext = await browser.newContext()
    const editorPage = await editorContext.newPage()
    await login(editorPage, users.editor)
    await editorPage.goto('/admin/content/articles')
    await expect(editorPage.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible()
    await expect(editorPage.getByText(/Gagal memuat artikel/i)).toHaveCount(0)
    await expect(editorPage.getByRole('link', { name: 'Artikel baru', exact: true })).toBeVisible()
    await editorContext.close()

    const reviewerContext = await browser.newContext()
    const reviewerPage = await reviewerContext.newPage()
    await login(reviewerPage, users.reviewer)
    await reviewerPage.goto('/admin/content/articles')
    await expect(reviewerPage.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible()
    await expect(reviewerPage.getByText(/Gagal memuat artikel/i)).toHaveCount(0)
    await expect(reviewerPage.getByRole('link', { name: 'Artikel baru', exact: true })).toHaveCount(0)
    await reviewerContext.close()
})

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
    await expect(editorPage.getByRole('banner').getByText('Editor Konten', { exact: true })).toBeVisible()

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
    await form.getByLabel('Isi opsi A').fill('Jawaban benar')
    await form.getByLabel('Isi opsi B').fill('Distraktor satu')
    await form.getByLabel('Isi opsi C').fill('Distraktor dua')
    await form.getByLabel('Isi opsi D').fill('Distraktor tiga')
    await form.getByLabel('Jawaban benar A').check()
    await expect(form.getByLabel('Jawaban benar A')).toBeChecked()
    await form.getByLabel('Pembahasan').fill('Pembahasan E2E: pilihan A adalah jawaban yang benar.')
    await followServerAction(editorPage, form.getByRole('button', { name: 'Simpan draft' }))
    await expect(editorPage.getByText('Draft soal tersimpan.')).toBeVisible()

    const questionId = new URL(editorPage.url()).searchParams.get('question') || ''
    expect(questionId).toMatch(/^[0-9a-f-]{36}$/i)

    await expect(editorPage.getByRole('heading', { name: 'Edit draft / revisi' })).toBeVisible()
    await expect(editorPage.getByLabel('Pertanyaan')).toHaveValue(uniqueStem)
    // Regresi: form edit pernah menampilkan opsi contoh kosong (A–D) alih-alih
    // opsi tersimpan setelah editor dipindah ke ReviewQuestionFields.
    await expect(editorPage.getByLabel('Isi opsi A')).toHaveValue('Jawaban benar')
    await expect(editorPage.getByLabel('Isi opsi D')).toHaveValue('Distraktor tiga')
    await expect(editorPage.getByLabel('Jawaban benar A')).toBeChecked()
    await expect(editorPage.getByLabel('Pembahasan')).toHaveValue('Pembahasan E2E: pilihan A adalah jawaban yang benar.')

    await followServerAction(editorPage, editorPage.getByRole('button', { name: /Kirim ke Editorial Review/ }))
    await expect(editorPage.getByText('Soal dikirim ke Editorial Review.')).toBeVisible()
    await expect(editorPage.getByRole('button', { name: 'Setujui', exact: true })).toHaveCount(0)
    await editorContext.close()

    const reviewerContext = await browser.newContext()
    const reviewerPage = await reviewerContext.newPage()
    await login(reviewerPage, users.reviewer)
    const evidenceDir = process.env.REVIEW_EVIDENCE_DIR
    if (evidenceDir) mkdirSync(evidenceDir, { recursive: true })
    await reviewerPage.goto('/admin/content/review?program=TKA&track=SMP')
    await reviewerPage.getByRole('link', { name: 'Buka review massal', exact: true }).click()
    await expect(reviewerPage).toHaveURL(/program=CPNS.*track=SKD.*bulk=1/)
    await expect(reviewerPage.getByRole('heading', { name: 'Review massal — batch' })).toBeVisible()
    await expect(reviewerPage.getByRole('button', { name: /Siapkan \d+ soal|Sudah disiapkan/ })).toBeVisible()
    await expect(reviewerPage.getByRole('link', { name: 'Kembali ke antrean', exact: true })).toBeVisible()
    if (evidenceDir) await reviewerPage.screenshot({ path: path.join(evidenceDir, 'review-batch-desktop.png'), fullPage: false })
    await reviewerPage.setViewportSize({ width: 390, height: 844 })
    await reviewerPage.reload()
    await expect(reviewerPage.getByRole('heading', { name: 'Review massal — batch' })).toBeVisible()
    expect(await reviewerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (evidenceDir) await reviewerPage.screenshot({ path: path.join(evidenceDir, 'review-batch-mobile.png'), fullPage: false })
    await reviewerPage.setViewportSize({ width: 1440, height: 900 })
    await openQuestion(reviewerPage, questionId)
    await expect(reviewerPage.getByRole('banner').getByText('Reviewer Konten', { exact: true })).toBeVisible()
    if (evidenceDir) await reviewerPage.screenshot({ path: path.join(evidenceDir, 'review-desktop.png'), fullPage: false })
    await reviewerPage.setViewportSize({ width: 390, height: 844 })
    await reviewerPage.reload()
    await expect(reviewerPage.getByRole('heading', { name: 'Reviewer Workspace' })).toBeVisible()
    await expect(reviewerPage.getByRole('link', { name: 'Kembali ke antrean', exact: true })).toBeVisible()
    await expect(reviewerPage.getByRole('heading', { name: 'Review Queue', exact: true })).toBeHidden()
    expect(await reviewerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (evidenceDir) await reviewerPage.screenshot({ path: path.join(evidenceDir, 'review-mobile.png'), fullPage: false })
    await reviewerPage.setViewportSize({ width: 1440, height: 900 })

    await assignToReviewer(reviewerPage)
    await approveStage(reviewerPage, 'Editorial E2E approved')
    await expect(reviewerPage.getByText('Academic Review', { exact: true }).last()).toBeVisible()

    await assignToReviewer(reviewerPage)
    await approveStage(reviewerPage, 'Academic E2E approved')
    await expect(reviewerPage.getByText('Technical QA', { exact: true }).last()).toBeVisible()

    await assignToReviewer(reviewerPage)
    await approveStage(reviewerPage, 'Technical QA E2E approved')
    await expect(reviewerPage.getByText('Disetujui', { exact: true }).last()).toBeVisible()

    await followServerAction(reviewerPage, reviewerPage.getByRole('button', { name: 'Publish Question' }))
    await expect(reviewerPage.getByText('Soal berhasil dipublish.')).toBeVisible()
    await expect(reviewerPage.getByText('Terbit', { exact: true }).last()).toBeVisible()

    const reviewRounds = reviewerPage.getByRole('heading', { name: 'Review Rounds' }).locator('xpath=ancestor::section[1]')
    await expect(reviewRounds).toContainText('Round 1 · Editorial Review')
    await expect(reviewRounds).toContainText('Editorial E2E approved')
    await expect(reviewRounds).toContainText('Round 1 · Academic Review')
    await expect(reviewRounds).toContainText('Academic E2E approved')
    await expect(reviewRounds).toContainText('Round 1 · Technical QA')
    await expect(reviewRounds).toContainText('Technical QA E2E approved')

    const auditTrail = reviewerPage.getByRole('heading', { name: 'Audit Trail' }).locator('xpath=ancestor::section[1]')
    // Label manusiawi; kode aksi mentah tetap tersedia lewat atribut title.
    await expect(auditTrail).toContainText('Soal diterbitkan')
    await expect(auditTrail).toContainText('Review disetujui')

    await reviewerContext.close()
})

test('review workspace stays usable on mobile and tablet widths', async ({ browser }) => {
    const users = await metadata()
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await login(page, users.editor)

    await expect(page.getByRole('heading', { name: 'Reviewer Workspace' })).toBeVisible()
    await expect(page.getByLabel('Buka menu')).toBeVisible()
    await expect(page.getByRole('banner').locator('select').nth(0)).toHaveValue('TKA')
    await expect(page.getByRole('banner').locator('select').nth(1)).toHaveValue('SMP')

    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(mobileOverflow).toBe(false)

    await page.getByLabel('Buka menu').click()
    await expect(page.getByRole('link', { name: 'Review Queue', exact: true })).toBeVisible()
    const closeMobileMenu = page.getByLabel('Tutup menu').last()
    await expect(closeMobileMenu).toBeVisible()
    await closeMobileMenu.click()

    await page.setViewportSize({ width: 1024, height: 768 })
    await expect(page.getByRole('link', { name: 'Review Queue', exact: true })).toBeVisible()
    const tabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(tabletOverflow).toBe(false)

    await context.close()
})
