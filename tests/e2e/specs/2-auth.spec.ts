import { test, expect } from '@playwright/test'
import { AuthPage } from '../pages/AuthPage'

test.describe('Authentication Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
  })

  test('harus memvalidasi input kosong saat register', async ({ page }) => {
    await authPage.gotoRegister()
    await authPage.registerSubmitBtn.click()

    await expect(page.locator('#fullName')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#register-name-error')).toHaveAttribute('role', 'alert')
    await expect(page.locator('#register-email-address')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#register-email-error')).toHaveAttribute('role', 'alert')
    await expect(page.locator('#register-password')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#register-password-error')).toHaveAttribute('role', 'alert')
  })

  test.skip('login dengan kredensial valid harus redirect ke dashboard', async () => {
    // Memerlukan akun peserta staging terisolasi; gate ber-kredensial menguji ini.
  })

  test.skip('logout harus menghapus sesi dan kembali ke login/home', async () => {
    // Memerlukan sesi peserta staging terisolasi; gate ber-kredensial menguji ini.
  })
})
