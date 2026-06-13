import { expect, test } from '@playwright/test';

test.describe('Auth Action Page (/auth/action)', () => {
  test('shows error card with no oobCode', async ({ page }) => {
    await page.goto('/auth/action?mode=resetPassword');
    // The invalid-link error card renders an h1
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shows password form with valid mode and oobCode', async ({ page }) => {
    await page.goto('/auth/action?mode=resetPassword&oobCode=fake-code-for-test');
    // Form renders on the client — Firebase confirmPasswordReset is only called on submit
    await expect(
      page.getByRole('button', { name: /บันทึกรหัสผ่าน|Save password/i }),
    ).toBeVisible();
  });

  test('unauthenticated access is allowed (no redirect)', async ({ page }) => {
    await page.goto('/auth/action?mode=resetPassword&oobCode=fake-code');
    // Must NOT redirect to home; URL stays at /auth/action
    await expect(page).toHaveURL(/\/auth\/action/);
  });
});
