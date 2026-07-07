import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

// Fast critical-path net: sign-in renders, auth works end-to-end, guarded
// routes reject unauthenticated visitors, and unknown routes 404. Deeper
// per-page and role-based coverage lives in navigation.spec.ts / login.spec.ts.

test.describe('Smoke', () => {
  test('sign-in page loads with the email/password form', { tag: '@smoke' }, async ({ page }) => {
    const response = await page.goto('/sign-in');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#bo-email')).toBeVisible();
    await expect(page.locator('#bo-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login succeeds and dashboard chrome renders', { tag: '@smoke' }, async ({ page }) => {
    await loginWithEmail(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible();
  });

  test(
    'unauthenticated visit to a guarded route redirects to /sign-in',
    { tag: '@smoke' },
    async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/sign-in/);
    },
  );

  test('unknown route renders the 404 page', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
  });
});
