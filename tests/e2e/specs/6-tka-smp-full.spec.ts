import { expect, test } from '@playwright/test'
import {
    freshDisposableTkaSession,
    readOwnTkaLearningProjection,
    readOwnTkaRemedial,
    readOwnTkaWrongQuestionState,
} from '../tka.ci'

async function answerFirstVisibleOption(page: import('@playwright/test').Page) {
    const questionCard = page.locator('article').last()
    const firstOption = questionCard.getByRole('button').first()
    await expect(firstOption).toBeVisible()
    await firstOption.click()
}

async function goToLastQuestion(page: import('@playwright/test').Page) {
    const navigator = page.locator('aside')
    await navigator.getByRole('button', { name: '30', exact: true }).click()
    await expect(page.getByText('Soal 30 / 30')).toBeVisible()
}

async function resolveFirstSingleChoiceWrongQuestion(page: import('@playwright/test').Page) {
    await expect(page.getByText('TKA SMP · Mode Ulang Soal Salah')).toBeVisible()
    await expect(page.getByText('Pilih satu jawaban yang paling tepat.')).toBeVisible()

    const optionButtons = page.locator('article button').filter({
        hasNotText: /Periksa jawaban|Periksa lagi|Lanjut/i,
    })
    const optionCount = await optionButtons.count()
    expect(optionCount).toBeGreaterThan(1)

    const correct = page.getByText('Benar! Soal ini sudah dituntaskan.', { exact: true })
    const wrong = page.getByText('Belum tepat. Pilih jawaban lain lalu coba lagi.', { exact: true })
    const feedback = page.getByText(/^(Benar! Soal ini sudah dituntaskan\.|Belum tepat\. Pilih jawaban lain lalu coba lagi\.)$/)

    let resolved = false
    for (let index = 0; index < optionCount; index += 1) {
        await optionButtons.nth(index).click()
        await page.getByRole('button', { name: /Periksa jawaban|Periksa lagi/i }).click()
        await expect(feedback).toBeVisible({ timeout: 15_000 })

        if (await correct.isVisible()) {
            resolved = true
            break
        }
        await expect(wrong).toBeVisible()
    }
    expect(resolved).toBe(true)
    await expect(page.getByRole('button', { name: /Lanjut/i })).toBeVisible()
}

async function resolveSingleChoiceRemedialAtPosition(
    page: import('@playwright/test').Page,
    position: number,
) {
    await expect(page.getByText('TKA SMP · Remedial Otomatis')).toBeVisible()
    await page.getByRole('button', { name: `Remedial ${position}`, exact: true }).click()
    await expect(page.getByText('Pilih satu jawaban yang paling tepat.')).toBeVisible()

    const optionButtons = page.locator('article button').filter({
        hasNotText: /Periksa jawaban|Periksa lagi|Lanjut Remedial/i,
    })
    const optionCount = await optionButtons.count()
    expect(optionCount).toBeGreaterThan(1)

    const correct = page.getByText('Benar! Evidence mastery sudah diperbarui.', { exact: true })
    const wrong = page.getByText('Belum tepat. Pelajari lagi pilihannya lalu coba ulang.', { exact: true })
    const feedback = page.getByText(/^(Benar! Evidence mastery sudah diperbarui\.|Belum tepat\. Pelajari lagi pilihannya lalu coba ulang\.)$/)

    let resolved = false
    for (let index = 0; index < optionCount; index += 1) {
        await optionButtons.nth(index).click()
        await page.getByRole('button', { name: /Periksa jawaban|Periksa lagi/i }).click()
        await expect(feedback).toBeVisible({ timeout: 15_000 })
        if (await correct.isVisible()) {
            resolved = true
            break
        }
        await expect(wrong).toBeVisible()
    }
    expect(resolved).toBe(true)
}

test('TKA SMP full tryout creates automatic remedial and closes the learning loop', async ({ page }) => {
    test.setTimeout(150_000)
    const session = await freshDisposableTkaSession(page)
    await page.goto('/tka/smp')

    await expect(page.getByRole('heading', { name: /TKA Sekolah Menengah Pertama/i })).toBeVisible()
    await expect(page.getByText('Track aktif')).toBeVisible()

    const fullCard = page.locator('article').filter({
        has: page.getByRole('heading', { name: 'Tryout Lengkap TKA SMP', exact: true }),
    })
    await expect(fullCard).toBeVisible()
    const startButton = fullCard.getByRole('button', { name: 'Mulai Tryout', exact: true })
    await expect(startButton).toBeEnabled()
    await startButton.click()

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    await expect(page.getByText('TKA SMP · Full Tryout')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bahasa Indonesia' })).toBeVisible()
    await expect(page.getByText('Soal 1 / 30')).toBeVisible()

    await answerFirstVisibleOption(page)
    await page.getByRole('button', { name: 'Tandai', exact: true }).click()
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/30')
    await page.waitForTimeout(800)

    // Reload proves answer + flag are persisted independently of local browser state.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Bahasa Indonesia' })).toBeVisible()
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/30')
    await expect(page.getByRole('button', { name: 'Ditandai', exact: true })).toBeVisible()

    await goToLastQuestion(page)
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Selesai Section', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Matematika' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Soal 1 / 30')).toBeVisible()

    await answerFirstVisibleOption(page)
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/30')
    await goToLastQuestion(page)

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Kirim Tryout', exact: true }).click()

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result$/i, { timeout: 20_000 })
    const resultUrl = page.url()
    const attemptMatch = resultUrl.match(/\/tryout\/([0-9a-f-]+)\/result$/i)
    expect(attemptMatch).not.toBeNull()
    const attemptId = attemptMatch?.[1] ?? ''

    await expect(page.getByRole('heading', { name: 'Tryout selesai.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review & Pembahasan' })).toBeVisible()
    await expect(page.getByText('Full Tryout · TKA/SMP')).toBeVisible()
    await expect(page.getByText(/2\/60/)).toBeVisible()

    const projectionBeforeRemedial = await readOwnTkaLearningProjection(session)
    expect(projectionBeforeRemedial.knowledge.length).toBeGreaterThan(0)
    expect(projectionBeforeRemedial.knowledge.reduce((sum, row) => sum + row.attempted_questions, 0)).toBe(60)
    expect(projectionBeforeRemedial.subjects).toHaveLength(2)
    expect(projectionBeforeRemedial.subjects.reduce((sum, row) => sum + row.questions_answered, 0)).toBe(2)
    for (const row of projectionBeforeRemedial.knowledge) {
        expect(row.mastery_score).toBeGreaterThanOrEqual(0)
        expect(row.mastery_score).toBeLessThanOrEqual(1)
        expect(['needs_work', 'developing', 'proficient', 'mastered']).toContain(row.mastery_level)
    }

    const openBeforeRemedial = await readOwnTkaWrongQuestionState(session)
    expect(openBeforeRemedial.length).toBeGreaterThanOrEqual(58)
    expect(openBeforeRemedial.reduce((sum, row) => sum + row.unanswered_count, 0)).toBeGreaterThanOrEqual(58)

    const remedialBefore = await readOwnTkaRemedial(session, attemptId)
    expect(remedialBefore.session).not.toBeNull()
    expect(remedialBefore.session?.status).toBe('active')
    expect(remedialBefore.session?.total_items).toBe(10)
    expect(remedialBefore.session?.completed_items).toBe(0)
    expect(remedialBefore.session?.pending_items).toBe(10)
    expect(remedialBefore.items).toHaveLength(10)

    const countsBySubject = new Map<string, number>()
    for (const item of remedialBefore.items) {
        countsBySubject.set(item.subject_id, (countsBySubject.get(item.subject_id) ?? 0) + 1)
    }
    expect(Array.from(countsBySubject.values()).sort((a, b) => a - b)).toEqual([5, 5])

    const singleChoiceRemedial = remedialBefore.items.find((item) => item.status === 'pending' && item.response_type === 'single_choice')
    expect(singleChoiceRemedial).toBeDefined()

    const remedialLink = page.getByRole('link', { name: 'Mulai Remedial (10)', exact: true })
    await expect(remedialLink).toBeVisible()
    await remedialLink.click()
    await page.waitForURL(/\/tka\/smp\/remedial\/[0-9a-f-]+$/i)

    await resolveSingleChoiceRemedialAtPosition(page, singleChoiceRemedial?.position ?? 1)

    const remedialAfter = await readOwnTkaRemedial(session, attemptId)
    expect(remedialAfter.session?.completed_items).toBe(1)
    expect(remedialAfter.session?.pending_items).toBe(9)

    const projectionAfterRemedial = await readOwnTkaLearningProjection(session)
    expect(projectionAfterRemedial.knowledge.reduce((sum, row) => sum + row.attempted_questions, 0)).toBe(61)
    expect(projectionAfterRemedial.knowledge.reduce((sum, row) => sum + row.correct_questions, 0)).toBe(
        projectionBeforeRemedial.knowledge.reduce((sum, row) => sum + row.correct_questions, 0) + 1,
    )

    const openAfterRemedial = await readOwnTkaWrongQuestionState(session)
    expect(openAfterRemedial.length).toBe(openBeforeRemedial.length - 1)

    // Slice 3.2 remains usable alongside the focused remedial queue.
    await page.goto(resultUrl)
    const repeatWrongLink = page.getByRole('link', { name: /Ulang Soal Salah \(\d+\)/i })
    await expect(repeatWrongLink).toBeVisible()
    await repeatWrongLink.click()
    await page.waitForURL(/\/tka\/smp\/wrong-questions$/i)
    await resolveFirstSingleChoiceWrongQuestion(page)

    const openAfterRepeatWrong = await readOwnTkaWrongQuestionState(session)
    expect(openAfterRepeatWrong.length).toBe(openAfterRemedial.length - 1)

    const projectionAfterRepeatWrong = await readOwnTkaLearningProjection(session)
    expect(projectionAfterRepeatWrong.knowledge.reduce((sum, row) => sum + row.attempted_questions, 0)).toBe(62)
})
