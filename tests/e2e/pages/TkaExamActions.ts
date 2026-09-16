import type { Page } from '@playwright/test'

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
        await confirm.click()
    } catch {
        // Modal tidak muncul — tidak ada yang perlu dikonfirmasi di sini.
    }
}
