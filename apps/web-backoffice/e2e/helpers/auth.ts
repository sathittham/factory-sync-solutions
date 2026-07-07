import { type Page, expect } from '@playwright/test';

async function login(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.locator('#bo-email').fill(email);
  await page.locator('#bo-password').fill(password);
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Logs in via the email/password form on /sign-in and waits for the
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

  await login(page, email, password);
}

/**
 * Logs in as a non-superadmin staff account — used to verify SuperAdminGuard
 * redirects staff off superadmin-only routes.
 *
 * Requires E2E_STAFF_USER_EMAIL / E2E_STAFF_USER_PASSWORD (see e2e/.env.e2e.example).
 */
export async function loginWithStaffEmail(page: Page) {
  const email = process.env.E2E_STAFF_USER_EMAIL;
  const password = process.env.E2E_STAFF_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_STAFF_USER_EMAIL / E2E_STAFF_USER_PASSWORD are not set — copy e2e/.env.e2e.example to e2e/.env.e2e.local',
    );
  }

  await login(page, email, password);
}
