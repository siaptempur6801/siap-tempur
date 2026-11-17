import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly loginLink: Locator;
  readonly cpnsCard: Locator;
  readonly tkaCard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginLink = page.getByRole('link', { name: /^Masuk$/i }).first();
    // Locator berbasis data-testid supaya tidak rapuh terhadap perubahan copywriting.
    this.cpnsCard = page.getByTestId('program-card-cpns').first();
    this.tkaCard = page.getByTestId('program-card-tka').first();
  }

  async goto() {
    await this.page.goto('/');
  }
}
