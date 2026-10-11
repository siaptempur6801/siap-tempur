import { Page, Locator } from '@playwright/test'

export class AuthPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginSubmitBtn: Locator
  readonly registerSubmitBtn: Locator
  readonly logoutBtn: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('input[type="email"]')
    this.passwordInput = page.locator('input[type="password"]')
    this.loginSubmitBtn = page.getByRole('button', { name: 'Masuk', exact: true })
    this.registerSubmitBtn = page.getByRole('button', { name: 'Daftar gratis', exact: true })
    this.logoutBtn = page.getByRole('button', { name: /Keluar|Logout/i })
  }

  async gotoLogin() {
    await this.page.goto('/login')
  }

  async gotoRegister() {
    await this.page.goto('/register')
  }

  async login(email: string, pass: string) {
    await this.gotoLogin()
    await this.emailInput.fill(email)
    await this.passwordInput.fill(pass)
    await this.loginSubmitBtn.click()
    await this.page.waitForURL(/cpns\/dashboard/)
  }

  async logout() {
    // Asumsi logout ada di sidebar/header
    if (await this.logoutBtn.isVisible()) {
      await this.logoutBtn.click()
      await this.page.waitForURL(/login|\//)
    }
  }
}
