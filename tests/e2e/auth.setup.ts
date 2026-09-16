import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { AuthPage } from './pages/AuthPage';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate as participant', async ({ page }) => {
  const email = process.env.E2E_PARTICIPANT_EMAIL;
  const password = process.env.E2E_PARTICIPANT_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_PARTICIPANT_EMAIL dan E2E_PARTICIPANT_PASSWORD wajib diatur untuk tes dashboard.',
    );
  }

  const authPage = new AuthPage(page);
  
  await authPage.gotoLogin();
  await authPage.emailInput.fill(email);
  await authPage.passwordInput.fill(password);
  await authPage.loginSubmitBtn.click();
  
  // Login tanpa returnTo berakhir di /onboarding (pilih program) sesuai
  // resolvePostLoginRedirect(); user yang datang dengan returnTo langsung
  // menuju halaman tujuannya dan melewati langkah ini.
  await page.waitForURL(/onboarding|cpns\/dashboard/);
  if (page.url().includes('/onboarding')) {
    await page.getByRole('link', { name: /Buka CPNS/i }).click();
    await page.waitForURL(/cpns\/dashboard/);
  }

  // Verify login success by checking an element in the dashboard
  await expect(page.getByRole('link', { name: /Profil/i }).first()).toBeVisible();

  // Save the auth state to use in tests
  await page.context().storageState({ path: authFile });
});
