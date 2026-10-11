import { expect, type Page, type TestInfo } from '@playwright/test'

/** Exercises presentation on an already-owned session without submitting or editing answers. */
export async function verifyExamDialogs(page: Page, testInfo: TestInfo) {
  const originalViewport = page.viewportSize()!
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    const openNavigation = page.getByRole('button', { name: 'Buka navigasi soal', exact: true })
    if (viewport.width < 1024) {
      await openNavigation.click()
      const drawer = page.getByRole('dialog', { name: 'Navigasi Soal', exact: true })
      const closeNavigation = drawer.getByRole('button', {
        name: 'Tutup navigasi soal',
        exact: true,
      })
      await expect(closeNavigation).toBeFocused()
      expect((await closeNavigation.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await page.keyboard.press('Shift+Tab')
      expect(await drawer.evaluate((el) => el.contains(document.activeElement))).toBe(true)
      const exitTrigger = drawer.getByRole('button', { name: 'Keluar Tryout', exact: true })
      await exitTrigger.click()
      const exit = page.getByRole('alertdialog', { name: 'Keluar Tryout?', exact: true })
      await expect(exit.getByRole('button', { name: 'Batal', exact: true })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(exit).not.toBeVisible()
      await expect(drawer).toBeVisible()
      await expect(exitTrigger).toBeFocused()
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
      await page.screenshot({ path: testInfo.outputPath(`exam-navigation-${viewport.width}.png`) })
      await page.keyboard.press('Escape')
      await expect(drawer).not.toBeVisible()
      await expect(openNavigation).toBeFocused()
      await openNavigation.click()
      await drawer.getByRole('button', { name: /^Buka soal 110(?:,|$)/ }).click()
      await expect(drawer).not.toBeVisible()
    } else {
      await page.getByRole('button', { name: /^Buka soal 110(?:,|$)/ }).click()
    }
    await expect(page.getByText('Soal 110', { exact: true })).toBeVisible()
    const finishTrigger = page.getByRole('button', { name: 'Kumpulkan jawaban', exact: true })
    // Reopening after cancellation must respect the existing repeat-click guard.
    await expect(finishTrigger).not.toHaveAttribute('data-press-lock', 'true')
    await finishTrigger.click()
    const finish = page.getByRole('alertdialog', { name: 'Kumpulkan jawaban?', exact: true })
    await expect(finish.getByRole('button', { name: 'Batal', exact: true })).toBeFocused()
    await expect(finish).toHaveAccessibleDescription(
      'Setelah dikumpulkan, jawaban tidak bisa diubah.',
    )
    const bounds = (await finish.boundingBox())!
    expect(bounds.y).toBeGreaterThanOrEqual(16)
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height - 16)
    expect(
      (await finish.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }).boundingBox())!
        .height,
    ).toBeGreaterThanOrEqual(44)
    await page.keyboard.press('Shift+Tab')
    await expect(
      finish.getByRole('button', { name: 'Kumpulkan jawaban', exact: true }),
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(finish.getByRole('button', { name: 'Batal', exact: true })).toBeFocused()
    await page.screenshot({ path: testInfo.outputPath(`exam-confirmation-${viewport.width}.png`) })
    await page.keyboard.press('Escape')
    await expect(finish).not.toBeVisible()
    await expect(finishTrigger).toBeFocused()
  }
  await page.setViewportSize(originalViewport)
  await page.getByRole('button', { name: /^Buka soal 1(?:,|$)/ }).click()
}
