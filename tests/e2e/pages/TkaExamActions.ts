import { expect, type Page } from '@playwright/test'

/**
 * Konfirmasi "selesaikan bagian" pada sesi ujian TKA.
 *
 * Aplikasi memakai modal kustom (`data-testid="tka-section-confirm"`), bukan lagi
 * `window.confirm()`. Helper ini hanya mengklik modal bila memang muncul, sehingga
 * suite tetap kompatibel selama masa transisi (dan tidak menggantung bila suatu
 * saat alurnya memakai dialog native yang ditangani pemanggil lewat page.once).
 */
export async function confirmTkaSectionIfPresent(page: Page, timeoutMs = 4000) {
    const confirm = page.getByTestId('tka-section-confirm')
    try {
        await confirm.waitFor({ state: 'visible', timeout: timeoutMs })
    } catch {
        // Modal tidak muncul — tidak ada yang perlu dikonfirmasi di sini.
        return
    }
    // A visible confirmation must be clickable; never swallow an interaction failure.
    await confirm.click()
}


/** A fresh completed tryout grants XP before the next learning action. */
export async function dismissSessionReward(page: Page) {
    const reward = page.getByRole('dialog', { name: /^\+[0-9.,]+ XP$/ })
    await expect(reward).toBeVisible()
    await reward.getByRole('button', { name: 'Lanjut lihat hasil', exact: true }).click()
    await expect(reward).not.toBeVisible()
}
