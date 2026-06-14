import { type Page, expect } from '@playwright/test';

/**
 * Logs in via the email/password form on the landing page and waits for the
 * authenticated redirect to /dashboard.
 *
 * Requires E2E_USER_EMAIL / E2E_USER_PASSWORD (see e2e/.env.e2e.example).
 */
export async function loginWithEmail(page: Page) {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_USER_EMAIL / E2E_USER_PASSWORD are not set — copy e2e/.env.e2e.example to e2e/.env.e2e.local',
    );
  }

  await page.goto('/');
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/);
}
