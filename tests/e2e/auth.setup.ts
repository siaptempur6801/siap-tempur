import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { AuthPage } from './pages/AuthPage';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

setup('authenticate as participant', async ({ page }) => {
  const email = process.env.E2E_PARTICIPANT_EMAIL || 'e2e-participant@siaptempur.test';
  const password = process.env.E2E_PARTICIPANT_PASSWORD || 'E2EParticipant123!';

  const authPage = new AuthPage(page);
  
  await authPage.gotoLogin();
  await authPage.emailInput.fill(email);
  await authPage.passwordInput.fill(password);
  await authPage.loginSubmitBtn.click();
  
  // Wait until the page receives the cookies and navigates to the dashboard
  await page.waitForURL(/cpns\/dashboard/);
  
  // Verify login success by checking an element in the dashboard
  await expect(page.getByRole('link', { name: /Profil/i })).toBeVisible();

  // Save the auth state to use in tests
  await page.context().storageState({ path: authFile });
});
