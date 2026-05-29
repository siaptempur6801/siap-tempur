import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly getStartedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedButton = page.getByRole('button', { name: /Masuk \/ Daftar|Mulai Latihan Sekarang/i }).first();
  }

  async goto() {
    await this.page.goto('/');
  }
}
