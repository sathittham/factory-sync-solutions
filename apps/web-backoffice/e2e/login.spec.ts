import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

test.describe('Login', () => {
  test(
    'logs in with email/password and reaches the dashboard',
    { tag: '@regression' },
    async ({ page }) => {
      await loginWithEmail(page);

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('header')).toBeVisible();
    },
  );

  test(
    'invalid credentials show an inline error and stay on /sign-in',
    { tag: '@regression' },
    async ({ page }) => {
      await page.goto('/sign-in');
      await page.locator('#bo-email').fill('not-a-real-account@factorysyncsolutions.com');
      await page.locator('#bo-password').fill('wrong-password-123');
      await page.locator('button[type="submit"]').click();

      // SignInPage renders Firebase auth errors as a centered destructive-text
      // paragraph (see mapFirebaseError / signin.errorInvalidCredential).
      await expect(page.locator('p.text-destructive')).toBeVisible();
      await expect(page).toHaveURL(/\/sign-in/);
    },
  );
});
