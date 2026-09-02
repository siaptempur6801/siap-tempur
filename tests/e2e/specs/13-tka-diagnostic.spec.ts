import { expect, test } from '@playwright/test'
import { freshDisposableTkaSession } from '../tka.ci'

test('TKA SMP diagnostic maps seven competencies and recommends next learning priorities', async ({ page }) => {
    test.setTimeout(180_000)
    await freshDisposableTkaSession(page)

    await page.goto('/tka/smp/diagnostic')
    await expect(page.getByRole('heading', { name: 'Temukan fokus belajar sebelum mulai banyak tryout.', exact: true })).toBeVisible()
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
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Selesaikan Bahasa Indonesia', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Matematika', exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Soal 1 dari 16', { exact: true })).toBeVisible()
    await page.getByTestId('diagnostic-option').first().click()
    await page.getByRole('button', { name: 'Buka soal diagnostik 16', exact: true }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Lihat hasil diagnostik', exact: true }).click()

    await page.waitForURL(/\/tka\/smp\/diagnostic\/[0-9a-f-]+\/result$/i, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Peta kemampuan awalmu sudah siap.', exact: true })).toBeVisible()
    const competencyCards = page.getByTestId('diagnostic-competency-card')
    await expect(competencyCards).toHaveCount(7)
    await expect(page.getByTestId('diagnostic-recommendation-card')).toHaveCount(3)

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
    await expect(page.getByRole('heading', { name: 'Mulai dari tiga prioritas ini', exact: true })).toBeVisible()
})