import { expect, test } from '@playwright/test'

test('CPNS dashboard shell fits the mobile visual viewport and keeps navigation reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/cpns/dashboard')

  const shell = page.locator('[data-experience-mode="learning"][data-program="cpns"]')
  const bottomNavigation = page.getByRole('navigation', { name: 'Navigasi utama' })
  await expect(shell).toBeVisible()
  await expect(page.getByTestId('cpns-dashboard-ready')).toBeVisible()
  await expect(bottomNavigation).toBeVisible()

  const measurements = await page.evaluate(() => {
    const shellElement = document.querySelector<HTMLElement>(
      '[data-experience-mode="learning"][data-program="cpns"]',
    )
    const navigationElement = document.querySelector<HTMLElement>(
      'nav[aria-label="Navigasi utama"]',
    )
    if (!shellElement || !navigationElement) return null

    return {
      shellHeight: shellElement.getBoundingClientRect().height,
      navigationBottom: navigationElement.getBoundingClientRect().bottom,
      visualViewportHeight: window.visualViewport?.height ?? window.innerHeight,
    }
  })

  expect(measurements).not.toBeNull()
  expect(
    Math.abs(measurements!.shellHeight - measurements!.visualViewportHeight),
  ).toBeLessThanOrEqual(4)
  expect(measurements!.navigationBottom).toBeLessThanOrEqual(measurements!.visualViewportHeight + 2)

  const homeLink = bottomNavigation.getByRole('link', { name: 'Beranda' })
  const homeLinkBox = await homeLink.boundingBox()
  expect(homeLinkBox).not.toBeNull()
  expect(homeLinkBox!.height).toBeGreaterThanOrEqual(44)
})
