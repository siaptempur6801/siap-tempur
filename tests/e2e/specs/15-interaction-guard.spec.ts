import { expect, test } from '@playwright/test'

test('prevents rapid button clicks and form submissions', async ({ page }) => {
    await page.goto('/cpns')
    await page.locator('html[data-interaction-guard="ready"]').waitFor()

    const result = await page.evaluate(async () => {
        const navigationButton = document.createElement('button')
        navigationButton.type = 'button'
        let navigationClicks = 0
        navigationButton.addEventListener('click', () => navigationClicks += 1)
        document.body.append(navigationButton)

        navigationButton.click()
        navigationButton.click()

        const protectedButton = document.createElement('button')
        protectedButton.type = 'button'
        protectedButton.dataset.preventDouble = 'true'
        let protectedClicks = 0
        protectedButton.addEventListener('click', () => protectedClicks += 1)
        document.body.append(protectedButton)

        protectedButton.click()
        protectedButton.click()
        const rapidProtectedClicks = protectedClicks

        await new Promise((resolve) => window.setTimeout(resolve, 750))
        protectedButton.click()

        const form = document.createElement('form')
        let formSubmissions = 0
        form.addEventListener('submit', (event) => {
            event.preventDefault()
            formSubmissions += 1
        })
        document.body.append(form)

        form.requestSubmit()
        form.requestSubmit()

        const repeatButton = document.createElement('button')
        repeatButton.type = 'button'
        repeatButton.dataset.preventDouble = 'true'
        repeatButton.dataset.allowRepeat = 'true'
        let repeatButtonClicks = 0
        repeatButton.addEventListener('click', () => repeatButtonClicks += 1)
        document.body.append(repeatButton)

        repeatButton.click()
        repeatButton.click()

        return {
            navigationClicks,
            rapidProtectedClicks,
            protectedClicksAfterWindow: protectedClicks,
            formSubmissions,
            repeatButtonClicks,
        }
    })

    expect(result).toEqual({
        navigationClicks: 2,
        rapidProtectedClicks: 1,
        protectedClicksAfterWindow: 2,
        formSubmissions: 1,
        repeatButtonClicks: 2,
    })
})
