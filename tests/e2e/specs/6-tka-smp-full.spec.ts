import { expect, test } from '@playwright/test'

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

test('TKA SMP full tryout persists, changes section, submits, and opens review', async ({ page }) => {
    await page.goto('/tka/smp')

    await expect(page.getByRole('heading', { name: /TKA Sekolah Menengah Pertama/i })).toBeVisible()
    await expect(page.getByText('Track aktif')).toBeVisible()
    await expect(page.getByText('Tryout Lengkap TKA SMP')).toBeVisible()

    const startButton = page.getByRole('button', { name: 'Mulai Tryout', exact: true })
    await expect(startButton).toBeEnabled()
    await startButton.click()

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    await expect(page.getByRole('heading', { name: 'Bahasa Indonesia' })).toBeVisible()
    await expect(page.getByText('Soal 1 / 30')).toBeVisible()

    await answerFirstVisibleOption(page)
    await page.getByRole('button', { name: 'Tandai', exact: true }).click()
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/30')
    await page.waitForTimeout(800)

    // Reload is the browser-level proof that the answer/flag came back from persisted attempt state.
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
    await expect(page.getByRole('heading', { name: 'Tryout selesai.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review & Pembahasan' })).toBeVisible()
    await expect(page.getByText('Full Tryout · TKA/SMP')).toBeVisible()
    await expect(page.getByText(/2\/60/)).toBeVisible()
})
