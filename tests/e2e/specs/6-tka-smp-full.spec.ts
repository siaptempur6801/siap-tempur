import { expect, test } from '@playwright/test'
import {
    freshDisposableTkaSession,
    readOwnTkaLearningProjection,
    readOwnTkaRemedial,
    readOwnTkaWrongQuestionState,
    type TkaLearningProjection,
} from '../tka.ci'
import {
    readOwnStoredTkaRecommendations,
    readOwnTkaLearningFocus,
} from '../tka-learning-focus.ci'
import {
    readOwnStoredTkaReadiness,
    readOwnTkaReadiness,
} from '../tka-readiness.ci'
import { confirmTkaSectionIfPresent } from '../pages/TkaExamActions'

function expectedWeakestNodeIds(projection: TkaLearningProjection) {
    return [...projection.knowledge]
        .filter((row) => row.attempted_questions > 0 && row.mastery_score < 0.85)
        .sort((left, right) => (
            left.mastery_score - right.mastery_score ||
            right.attempted_questions - left.attempted_questions ||
            left.accuracy - right.accuracy ||
            left.knowledge_node_id.localeCompare(right.knowledge_node_id)
        ))
        .slice(0, 3)
        .map((row) => row.knowledge_node_id)
}

async function answerFirstVisibleOption(page: import('@playwright/test').Page) {
    const questionCard = page.locator('article').last()
    const firstOption = questionCard.getByRole('button').first()
    await expect(firstOption).toBeVisible()
    await firstOption.click()
}

async function goToLastQuestion(page: import('@playwright/test').Page) {
    const navigator = page.locator('aside')
    await navigator.getByRole('button', { name: 'Buka soal 30', exact: true }).click()
    await expect(page.getByText('Soal 30 dari 30')).toBeVisible()
}

async function submitReviewAndWait(
    page: import('@playwright/test').Page,
    correct: import('@playwright/test').Locator,
    wrong: import('@playwright/test').Locator,
) {
    const reviewButton = page.getByRole('button', { name: /Periksa jawaban|Periksa lagi/i })
    await expect(reviewButton).toBeEnabled()

    const actionResponse = page.waitForResponse((response) => (
        response.request().method() === 'POST' &&
        Boolean(response.request().headers()['next-action'])
    ), { timeout: 15_000 })

    await reviewButton.click()
    await actionResponse

    await expect.poll(async () => {
        if (await correct.isVisible()) return 'correct'
        if (await wrong.isVisible() && await reviewButton.isVisible() && await reviewButton.isEnabled()) return 'wrong-ready'
        return 'pending'
    }, { timeout: 15_000 }).not.toBe('pending')

    return correct.isVisible()
}

async function resolveFirstSingleChoiceWrongQuestion(page: import('@playwright/test').Page) {
    await expect(page.getByText('TKA SMP · Soal yang perlu diulang')).toBeVisible()
    await expect(page.getByText('Pilih satu jawaban yang paling tepat.')).toBeVisible()

    const questionCard = page.getByRole('article')
    const optionButtons = questionCard.getByRole('button').filter({
        hasNotText: /Periksa jawaban|Periksa lagi|Lanjut/i,
    })
    const optionCount = await optionButtons.count()
    expect(optionCount).toBeGreaterThan(1)

    const correct = questionCard.getByText('Benar. Soal ini sudah selesai diulang.', { exact: true })
    const wrong = questionCard.getByText('Belum tepat. Pelajari pembahasan lalu coba jawaban lain.', { exact: true })

    let resolved = false
    for (let index = 0; index < optionCount; index += 1) {
        await optionButtons.nth(index).click()
        if (await submitReviewAndWait(page, correct, wrong)) {
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
    await expect(page.getByRole('heading', { name: 'Latihan perbaikan', exact: true })).toBeVisible()
    await page.getByRole('button', { name: `Latihan perbaikan ${position}`, exact: true }).click()
    await expect(page.getByText('Pilih satu jawaban yang paling tepat.')).toBeVisible()

    const questionCard = page.getByRole('article')
    const optionButtons = questionCard.getByRole('button').filter({
        hasNotText: /Periksa jawaban|Periksa lagi|Lanjut latihan/i,
    })
    const optionCount = await optionButtons.count()
    expect(optionCount).toBeGreaterThan(1)

    const correct = questionCard.getByText('Benar. Perkembangan topik ini sudah diperbarui.', { exact: true })
    const wrong = questionCard.getByText('Belum tepat. Pelajari kembali pilihannya lalu coba lagi.', { exact: true })

    let resolved = false
    for (let index = 0; index < optionCount; index += 1) {
        await optionButtons.nth(index).click()
        if (await submitReviewAndWait(page, correct, wrong)) {
            resolved = true
            break
        }
        await expect(wrong).toBeVisible()
    }
    expect(resolved).toBe(true)
}

test('TKA SMP full tryout creates automatic remedial and closes the learning loop', async ({ page }) => {
    test.setTimeout(240_000)
    const session = await freshDisposableTkaSession(page)
    await page.goto('/tka/smp')

    await expect(page.getByRole('heading', { name: /Apa yang sebaiknya kamu kerjakan hari ini/i })).toBeVisible()
    await expect(page.getByText('Jalur belajar aktif')).toBeVisible()

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
    await expect(page.getByText('Soal 1 dari 30')).toBeVisible()

    await answerFirstVisibleOption(page)
    await page.getByRole('button', { name: 'Tandai untuk ditinjau', exact: true }).click()
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await page.waitForTimeout(800)

    // Reload proves answer + flag are persisted independently of local browser state.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Bahasa Indonesia' })).toBeVisible()
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await expect(page.getByRole('button', { name: 'Ditandai', exact: true })).toBeVisible()

    await goToLastQuestion(page)
    await page.getByRole('button', { name: 'Selesaikan bagian', exact: true }).click()
    await confirmTkaSectionIfPresent(page)

    await expect(page.getByRole('heading', { name: 'Matematika' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Soal 1 dari 30')).toBeVisible()

    await answerFirstVisibleOption(page)
    await expect(page.getByText(/Terjawab bagian ini:/)).toContainText('1/30')
    await goToLastQuestion(page)

    await page.getByRole('button', { name: 'Kirim tryout', exact: true }).click()
    await confirmTkaSectionIfPresent(page)

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result$/i, { timeout: 20_000 })
    const resultUrl = page.url()
    const attemptMatch = resultUrl.match(/\/tryout\/([0-9a-f-]+)\/result$/i)
    expect(attemptMatch).not.toBeNull()
    const attemptId = attemptMatch?.[1] ?? ''

    await expect(page.getByRole('heading', { name: 'Sesi selesai. Sekarang lihat apa yang perlu diperbaiki.', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tinjau jawaban satu per satu', exact: true })).toBeVisible()
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

    const storedReadinessBefore = await readOwnStoredTkaReadiness(session)
    const readinessBefore = await readOwnTkaReadiness(session)
    expect(storedReadinessBefore.calculation_version).toBe('tka_smp_readiness_v1')
    expect(storedReadinessBefore.readiness_score).toBeCloseTo(readinessBefore.readiness_score, 6)
    expect(storedReadinessBefore.confidence_score).toBeCloseTo(readinessBefore.confidence_score, 6)
    expect(readinessBefore.subjects.map((row) => row.subject_code).sort()).toEqual(['BIN', 'MAT'])
    expect(readinessBefore.subjects.every((row) => row.evidenced_nodes > 0)).toBe(true)
    const readinessCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Kesiapan TKA SMP' }) })
    await expect(readinessCard).toBeVisible()
    await expect(readinessCard).toContainText(`${readinessBefore.readiness_percent.toFixed(1)}%`)

    const expectedBefore = expectedWeakestNodeIds(projectionBeforeRemedial)
    expect(expectedBefore).toHaveLength(3)
    const storedRecommendationsBefore = await readOwnStoredTkaRecommendations(session)
    expect(storedRecommendationsBefore.map((row) => row.knowledge_node_id)).toEqual(expectedBefore)
    expect(storedRecommendationsBefore.map((row) => row.priority)).toEqual([1, 2, 3])
    expect(storedRecommendationsBefore.every((row) => row.reason_code === 'weakest_mastery_v1')).toBe(true)

    const focusBefore = await readOwnTkaLearningFocus(session)
    expect(focusBefore.map((row) => row.knowledge_node_id)).toEqual(expectedBefore)
    focusBefore.forEach((row) => {
        expect(row.score).toBeCloseTo(1 - row.mastery_score, 5)
        expect(row.attempted_questions).toBeGreaterThan(0)
    })
    await expect(page.getByRole('heading', { name: 'Fokus belajar berikutnya' })).toBeVisible()
    await expect(page.getByText(focusBefore[0].topic_name, { exact: true })).toBeVisible()

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

    const remedialLink = page.getByRole('link', { name: 'Mulai latihan (10)', exact: true })
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

    const storedReadinessAfterRemedial = await readOwnStoredTkaReadiness(session)
    expect(storedReadinessAfterRemedial.readiness_score).toBeGreaterThan(storedReadinessBefore.readiness_score)
    expect(storedReadinessAfterRemedial.confidence_score).toBeGreaterThanOrEqual(storedReadinessBefore.confidence_score)
    expect(storedReadinessAfterRemedial.calculated_at).not.toBe(storedReadinessBefore.calculated_at)
    const readinessAfterRemedial = await readOwnTkaReadiness(session)
    expect(readinessAfterRemedial.readiness_score).toBeCloseTo(storedReadinessAfterRemedial.readiness_score, 6)
    expect(readinessAfterRemedial.confidence_score).toBeCloseTo(storedReadinessAfterRemedial.confidence_score, 6)

    // Read persisted rows before the defensive focus RPC: the progress trigger must already be current.
    const expectedAfterRemedial = expectedWeakestNodeIds(projectionAfterRemedial)
    const storedRecommendationsAfterRemedial = await readOwnStoredTkaRecommendations(session)
    expect(storedRecommendationsAfterRemedial.map((row) => row.knowledge_node_id)).toEqual(expectedAfterRemedial)
    const focusAfterRemedial = await readOwnTkaLearningFocus(session)
    expect(focusAfterRemedial.map((row) => row.knowledge_node_id)).toEqual(expectedAfterRemedial)

    const openAfterRemedial = await readOwnTkaWrongQuestionState(session)
    expect(openAfterRemedial.length).toBe(openBeforeRemedial.length - 1)

    // Slice 3.2 remains usable alongside the focused remedial queue.
    await page.goto(resultUrl)
    await expect(page.getByRole('heading', { name: 'Kesiapan TKA SMP' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fokus belajar berikutnya' })).toBeVisible()
    const repeatWrongLink = page.getByRole('link', { name: /Ulangi soal \(\d+\)/i })
    await expect(repeatWrongLink).toBeVisible()
    await repeatWrongLink.click()
    await page.waitForURL(/\/tka\/smp\/wrong-questions$/i)
    await resolveFirstSingleChoiceWrongQuestion(page)

    const openAfterRepeatWrong = await readOwnTkaWrongQuestionState(session)
    expect(openAfterRepeatWrong.length).toBe(openAfterRemedial.length - 1)

    const projectionAfterRepeatWrong = await readOwnTkaLearningProjection(session)
    expect(projectionAfterRepeatWrong.knowledge.reduce((sum, row) => sum + row.attempted_questions, 0)).toBe(62)

    const storedReadinessAfterRepeatWrong = await readOwnStoredTkaReadiness(session)
    expect(storedReadinessAfterRepeatWrong.readiness_score).toBeGreaterThan(storedReadinessAfterRemedial.readiness_score)
    expect(storedReadinessAfterRepeatWrong.confidence_score).toBeGreaterThanOrEqual(storedReadinessAfterRemedial.confidence_score)
    const readinessAfterRepeatWrong = await readOwnTkaReadiness(session)
    expect(readinessAfterRepeatWrong.readiness_score).toBeCloseTo(storedReadinessAfterRepeatWrong.readiness_score, 6)

    const expectedAfterRepeatWrong = expectedWeakestNodeIds(projectionAfterRepeatWrong)
    const storedRecommendationsAfterRepeatWrong = await readOwnStoredTkaRecommendations(session)
    expect(storedRecommendationsAfterRepeatWrong.map((row) => row.knowledge_node_id)).toEqual(expectedAfterRepeatWrong)

    const focusAfterRepeatWrong = await readOwnTkaLearningFocus(session)
    expect(focusAfterRepeatWrong.map((row) => row.knowledge_node_id)).toEqual(expectedAfterRepeatWrong)
    const remedialAfterRepeatWrong = await readOwnTkaRemedial(session, attemptId)

    // Final Milestone 3 closure: the consolidated dashboard must reflect the same
    // persisted state after exam -> remedial -> Repeat Wrong, not a stale snapshot.
    await page.goto(resultUrl)
    const progressLink = page.getByRole('link', { name: /Perkembangan|Progress/i }).first()
    await expect(progressLink).toBeVisible()
    await progressLink.click()
    await page.waitForURL(/\/tka\/smp\/progress$/i)

    await expect(page.getByRole('heading', { name: 'Perkembangan belajar TKA SMP', exact: true })).toBeVisible()
    const finalReadinessCard = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Kesiapan TKA SMP' }) })
    await expect(finalReadinessCard).toContainText(`${readinessAfterRepeatWrong.readiness_percent.toFixed(1)}%`)

    const completedCard = page.locator('article').filter({ hasText: 'Tryout selesai' }).first()
    await expect(completedCard).toContainText('1')
    const gapCard = page.locator('article').filter({ hasText: 'Soal perlu diulang' }).first()
    await expect(gapCard).toContainText(String(openAfterRepeatWrong.length))
    const remedialCard = page.locator('article').filter({ hasText: 'Latihan perbaikan' }).first()
    await expect(remedialCard).toContainText(String(remedialAfterRepeatWrong.session?.pending_items ?? 0))

    await expect(page.getByRole('heading', { name: 'Lihat kekuatan tiap mata pelajaran', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Fokus belajar berikutnya', exact: true })).toBeVisible()
    if (focusAfterRepeatWrong[0]) {
        await expect(page.getByText(focusAfterRepeatWrong[0].topic_name, { exact: true }).first()).toBeVisible()
    }
    await expect(page.getByText('Tryout Lengkap TKA SMP', { exact: true })).toBeVisible()
    await expect(page.getByText('Langkah berikutnya', { exact: true })).toBeVisible()
})
