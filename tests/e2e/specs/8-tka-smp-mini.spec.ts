import { expect, test, type Page } from '@playwright/test'

async function examCard(page: Page, title: string) {
    const card = page.locator('article').filter({
        has: page.getByRole('heading', { name: title, exact: true }),
    })
    await expect(card).toBeVisible()
    return card
}

async function answerFirstVisibleOption(page: Page) {
    const questionCard = page.locator('article').last()
    const firstOption = questionCard.getByRole('button').first()
    await expect(firstOption).toBeVisible()
    await firstOption.click()
}

async function assertNoDocumentOverflow(page: Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    expect(overflow).toBe(false)
}

async function finishMini(page: Page, expectedSubject: string) {
    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+$/i)
    await expect(page.getByText('TKA SMP · Mini Tryout')).toBeVisible()
    await expect(page.getByRole('heading', { name: expectedSubject, exact: true })).toBeVisible()
    await expect(page.getByText('Soal 1 / 15')).toBeVisible()
    await expect(page.getByText(/Terjawab total:/)).toContainText('0/15')
    await assertNoDocumentOverflow(page)

    await answerFirstVisibleOption(page)
    await page.getByRole('button', { name: 'Tandai', exact: true }).click()
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/15')
    await page.waitForTimeout(800)

    // Browser reload proves answer + flag resume from the persisted attempt state.
    await page.reload()
    await expect(page.getByRole('heading', { name: expectedSubject, exact: true })).toBeVisible()
    await expect(page.getByText(/Terjawab section:/)).toContainText('1/15')
    await expect(page.getByRole('button', { name: 'Ditandai', exact: true })).toBeVisible()

    const navigator = page.locator('aside')
    await navigator.getByRole('button', { name: '15', exact: true }).click()
    await expect(page.getByText('Soal 15 / 15')).toBeVisible()

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Kirim Tryout', exact: true }).click()

    await page.waitForURL(/\/tka\/smp\/tryout\/[0-9a-f-]+\/result$/i, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Tryout selesai.' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review & Pembahasan' })).toBeVisible()
    await expect(page.getByText('Mini Tryout · TKA/SMP')).toBeVisible()
    await expect(page.getByText(/1\/15/).first()).toBeVisible()
}

test.describe.serial('TKA SMP Mini Tryout core', () => {
    test('Bahasa Indonesia: 15 questions, mobile resume, result, and one-free-attempt limit', async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto('/tka/smp')

        await expect(page.getByText('Track aktif')).toBeVisible()
        const card = await examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
        await expect(card.getByText('35 menit')).toBeVisible()
        await expect(card.getByText(/Gratis 1x tersisa/)).toBeVisible()
        await assertNoDocumentOverflow(page)

        const startButton = card.getByRole('button', { name: 'Mulai Tryout', exact: true })
        await expect(startButton).toBeEnabled()
        await startButton.click()
        await finishMini(page, 'Bahasa Indonesia')

        await page.goto('/tka/smp')
        const usedCard = await examCard(page, 'Mini Tryout Bahasa Indonesia TKA SMP')
        const locked = usedCard.getByRole('button', { name: 'Kuota gratis habis · Butuh Tempur Pass', exact: true })
        await expect(locked).toBeDisabled()
    })

    test('Matematika: 15 questions, tablet resume, result, and one-free-attempt limit', async ({ page }) => {
        test.setTimeout(120_000)
        await page.setViewportSize({ width: 1024, height: 768 })
        await page.goto('/tka/smp')

        await expect(page.getByText('Track aktif')).toBeVisible()
        const card = await examCard(page, 'Mini Tryout Matematika TKA SMP')
        await expect(card.getByText('35 menit')).toBeVisible()
        await expect(card.getByText(/Gratis 1x tersisa/)).toBeVisible()
        await assertNoDocumentOverflow(page)

        const startButton = card.getByRole('button', { name: 'Mulai Tryout', exact: true })
        await expect(startButton).toBeEnabled()
        await startButton.click()
        await finishMini(page, 'Matematika')

        await page.goto('/tka/smp')
        const usedCard = await examCard(page, 'Mini Tryout Matematika TKA SMP')
        const locked = usedCard.getByRole('button', { name: 'Kuota gratis habis · Butuh Tempur Pass', exact: true })
        await expect(locked).toBeDisabled()
    })
})
