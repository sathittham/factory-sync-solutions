import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

test.describe('Login', () => {
  test(
    'logs in with email/password and reaches the dashboard',
    { tag: '@regression' },
    async ({ page }) => {
      await loginWithEmail(page);

      await expect(page.getByText(/ยินดีต้อนรับกลับ|Welcome back/i)).toBeVisible();
    },
  );

  test('system admin can access /admin', { tag: '@regression' }, async ({ page }) => {
    await loginWithEmail(page);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
  });
});
