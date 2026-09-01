import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly loginLink: Locator;
  readonly cpnsCard: Locator;
  readonly tkaCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginLink = page.getByRole('link', { name: /^Masuk$/i }).first();
    this.cpnsCard = page.getByRole('link', { name: /SiapTempur CPNS/i }).first();
    this.tkaCard = page.getByRole('link', { name: /SiapTempur TKA SMP/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }
}
