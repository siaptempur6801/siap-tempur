import { expect, type Page, type TestInfo } from '@playwright/test'

/** Pending/failure checks abort in the browser; they never revoke the fixture session. */
export async function verifySignoutConfirmation(
  page: Page,
  path: string,
  program: 'cpns' | 'tka',
  testInfo: TestInfo,
) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('data-interaction-guard', 'ready')
    const profileMenu = page.getByRole('button', { name: 'Buka menu profil', exact: true })
    const mobileCpns = program === 'cpns' && viewport.width < 768
    if (mobileCpns) {
      await profileMenu.click()
      await page.keyboard.press('Escape')
      await expect(profileMenu).toBeFocused()
      await expect(
        page.getByRole('navigation', { name: 'Menu profil', exact: true }),
      ).not.toBeVisible()
      await profileMenu.click()
    }
    const trigger = page.getByRole('button', { name: 'Keluar', exact: true })
    await trigger.click()
    const dialog = page.getByRole('alertdialog', {
      name: program === 'tka' ? 'Yakin ingin keluar?' : 'Yakin mau keluar?',
    })
    await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeFocused()
    for (const button of await dialog.getByRole('button').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await dialog.getAttribute('aria-describedby')).toBeTruthy()
    const bounds = await dialog.boundingBox()
    expect(bounds!.y).toBeGreaterThanOrEqual(16)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 16)
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true)
    }
    await page.screenshot({ path: testInfo.outputPath(`signout-${program}-${viewport.width}.png`) })
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(mobileCpns ? profileMenu : trigger).toBeFocused()
    if (mobileCpns) await profileMenu.click()
    await trigger.click()
    let held: import('@playwright/test').Route | undefined
    let requests = 0
    await page.route(`**${path}`, async (route) => {
      if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
        requests += 1
        held = route
        return
      }
      await route.continue()
    })
    try {
      await dialog.getByRole('button', { name: 'Ya, Keluar', exact: true }).click()
      await expect(dialog.getByRole('button', { name: 'Keluar...', exact: true })).toBeDisabled()
      await expect(dialog.getByRole('button', { name: 'Batal', exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await page.mouse.click(2, 2)
      await expect(dialog).toBeVisible()
      await expect.poll(() => Boolean(held)).toBe(true)
      expect(requests).toBe(1)
      await held!.abort('failed')
      held = undefined
      await expect(dialog.getByRole('alert')).toContainText('Periksa koneksi')
      await expect(dialog.getByRole('button', { name: 'Ya, Keluar', exact: true })).toBeEnabled()
      await dialog.getByRole('button', { name: 'Batal', exact: true }).click()
      await expect(dialog).not.toBeVisible()
      await expect(mobileCpns ? profileMenu : trigger).toBeFocused()
    } finally {
      await held?.abort('failed')
      await page.unroute(`**${path}`)
    }
    await page.reload()
    await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
  }
}
