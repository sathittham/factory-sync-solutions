import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

// Fast, critical-path-only net: sign-in renders, login reaches the
// authenticated app, one route is guarded, and unknown routes 404. Deeper
// flows (theme persistence, cookie consent, a11y, admin-role access) stay in
// their own regression specs — this suite is deliberately shallow.

test.describe('Smoke', () => {
  test('sign-in page loads with email/password form', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#auth-email')).toBeVisible();
    await expect(page.locator('#auth-password')).toBeVisible();
  });

  test('login succeeds and reaches the dashboard', { tag: '@smoke' }, async ({ page }) => {
    await loginWithEmail(page);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('header')).toBeVisible();
  });

  test('unauthenticated user cannot access /quiz', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/quiz');
    await expect(page).toHaveURL('/');
  });

  test('unknown routes show 404 page', { tag: '@smoke' }, async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
  });
});
