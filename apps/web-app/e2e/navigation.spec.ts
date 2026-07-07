import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('sign-in page loads successfully', { tag: '@regression' }, async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('unknown routes show 404 page', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.getByText('404')).toBeVisible();
  });

  test('unauthenticated user cannot access /quiz', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/quiz');
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated user cannot access /admin', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/');
  });

  test('unauthenticated user cannot access /results', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/results');
    await expect(page).toHaveURL('/');
  });

  // `/` renders a bare SignInPage (no header/footer chrome) — dashboard/admin
  // chrome visibility is covered by smoke.spec.ts and login.spec.ts instead.
  test('sign-in form is visible on the root route', { tag: '@regression' }, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('signin-google-btn')).toBeVisible();
  });
});
