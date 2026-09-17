import { expect, test } from '@playwright/test'
import { freshDisposableTkaSession, readOwnTkaLearningProjection } from '../tka.ci'
import { readOwnStoredTkaRecommendations } from '../tka-learning-focus.ci'
import { confirmTkaSectionIfPresent } from '../pages/TkaExamActions'

test('TKA SMP diagnostic maps seven competencies and drives the first focused drill', async ({ page }) => {
    test.setTimeout(300_000)
    const learner = await freshDisposableTkaSession(page)

    await page.goto('/tka/smp/diagnostic')
    await expect(page.getByRole('heading', { name: 'Tes Diagnostik TKA SMP', exact: true })).toBeVisible()
    const overview = page.locator('section').first()
    await expect(overview.getByText('28', { exact: true })).toBeVisible()
    await expect(overview.getByText('soal', { exact: true })).toBeVisible()
    await expect(overview.getByText('7', { exact: true })).toBeVisible()
    await expect(overview.getByText('kompetensi', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Mulai Tes Diagnostik', exact: true }).click()
    await page.waitForURL(/\/tka\/smp\/diagnostic\/[0-9a-f-]+$/i)

    await expect(page.getByText('Tes Diagnostik TKA SMP', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Bahasa Indonesia', exact: true })).toBeVisible()
    await expect(page.getByText('Soal 1 dari 12', { exact: true })).toBeVisible()

    await page.getByTestId('diagnostic-option').first().click()
    await page.getByRole('button', { name: 'Buka soal diagnostik 12', exact: true }).click()
    await page.getByRole('button', { name: 'Selesaikan Bahasa Indonesia', exact: true }).click()
    await confirmTkaSectionIfPresent(page)

    await expect(page.getByRole('heading', { name: 'Matematika', exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Soal 1 dari 16', { exact: true })).toBeVisible()
    await page.getByTestId('diagnostic-option').first().click()
    await page.getByRole('button', { name: 'Buka soal diagnostik 16', exact: true }).click()
    await page.getByRole('button', { name: 'Lihat hasil diagnostik', exact: true }).click()
    await confirmTkaSectionIfPresent(page)

    await page.waitForURL(/\/tka\/smp\/diagnostic\/[0-9a-f-]+\/result$/i, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Peta kemampuan awalmu sudah siap.', exact: true })).toBeVisible()
    const competencyCards = page.getByTestId('diagnostic-competency-card')
    const recommendationCards = page.getByTestId('diagnostic-recommendation-card')
    await expect(competencyCards).toHaveCount(7)
    // Rekomendasi utama dirender terpisah; `diagnostic-recommendation-card` hanya untuk
    // pilihan fokus berikutnya (maksimal 2 kartu: slice(1, 3)).
    await expect(recommendationCards).toHaveCount(2)

    for (const competency of [
        'Pemahaman Tekstual',
        'Pemahaman Inferensial',
        'Evaluasi dan Apresiasi',
        'Bilangan',
        'Aljabar',
        'Geometri dan Pengukuran',
        'Data dan Peluang',
    ]) {
        await expect(competencyCards.getByRole('heading', { name: competency, exact: true })).toBeVisible()
    }

    await expect(page.getByText('Baseline tersimpan', { exact: true })).toBeVisible()
    await expect(page.getByText(/28 soal dipetakan/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mulai dari prioritas utama', exact: true })).toBeVisible()

    const baselineProjection = await readOwnTkaLearningProjection(learner)
    expect(baselineProjection.knowledge).toHaveLength(0)
    expect(baselineProjection.subjects).toHaveLength(0)

    const firstRecommendation = recommendationCards.first()
    const recommendedTopic = (await firstRecommendation.getByRole('heading').textContent())?.trim() ?? ''
    expect(recommendedTopic).not.toBe('')
    await expect(firstRecommendation.getByTestId('diagnostic-start-drill')).toBeEnabled()
    await firstRecommendation.getByTestId('diagnostic-start-drill').click()

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i, { timeout: 20_000 })
    await expect(page.getByText('Soal 1 dari 10', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: recommendedTopic, exact: true })).toBeVisible()

    for (let index = 1; index <= 10; index += 1) {
        await expect(page.getByText(`Soal ${index} dari 10`, { exact: true })).toBeVisible()
        const questionCard = page.locator('article').last()
        await questionCard.getByRole('button').first().click()

        if (index < 10) {
            await page.getByRole('button', { name: 'Selanjutnya', exact: true }).click()
        }
    }

    await page.getByRole('button', { name: 'Kirim tryout', exact: true }).click()
    await confirmTkaSectionIfPresent(page)
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result(?:\?.*)?$/i, { timeout: 30_000 })

    await expect(page.getByTestId('tka-learning-focus')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Fokus belajar berikutnya', exact: true })).toBeVisible()

    const projection = await readOwnTkaLearningProjection(learner)
    expect(projection.knowledge.length).toBeGreaterThan(0)
    expect(projection.subjects.length).toBeGreaterThan(0)
    expect(projection.knowledge.reduce((sum, row) => sum + Number(row.attempted_questions || 0), 0)).toBeGreaterThanOrEqual(10)

    const storedFocus = await readOwnStoredTkaRecommendations(learner)
    expect(storedFocus.length).toBeGreaterThan(0)
    expect(storedFocus.length).toBeLessThanOrEqual(3)
    expect(storedFocus[0]?.priority).toBe(1)

    await page.goto('/tka/smp/progress')
    await expect(page.getByRole('heading', { name: 'Perkembangan belajar TKA SMP', exact: true })).toBeVisible()
    await expect(page.getByTestId('tka-learning-focus')).toBeVisible()
})
