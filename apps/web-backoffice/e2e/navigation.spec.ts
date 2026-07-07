import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

test.describe('Navigation', () => {
  test('sign-in page loads successfully', { tag: '@regression' }, async ({ page }) => {
    const response = await page.goto('/sign-in');
    expect(response?.status()).toBe(200);
    await expect(page.locator('#bo-email')).toBeVisible();
    await expect(page.locator('#bo-password')).toBeVisible();
  });

  test(
    'unauthenticated user visiting a guarded route is redirected to /sign-in',
    { tag: '@regression' },
    async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/sign-in/);
    },
  );

  test('unknown route renders the 404 page', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('Page not found')).toBeVisible();
  });

  test('/unauthorized is reachable without auth', { tag: '@regression' }, async ({ page }) => {
    const response = await page.goto('/unauthorized');
    expect(response?.status()).toBe(200);
    // UnauthorizedPage only redirects when the signed-in user IS a backoffice
    // user — an unauthenticated visitor sees the card (title/message/sign-out).
    await expect(page.getByRole('heading', { name: /ไม่มีสิทธิ์เข้าถึง|Unauthorized/i })).toBeVisible();
  });

  test(
    'header and sidebar chrome are visible once authenticated',
    { tag: '@regression' },
    async ({ page }) => {
      await loginWithEmail(page);

      await expect(page.locator('header')).toBeVisible();
      // The sidebar trigger always renders in the header regardless of
      // viewport (desktop inline sidebar vs. mobile Sheet-based sidebar).
      await expect(page.locator('[data-sidebar="trigger"]')).toBeVisible();
    },
  );
});
