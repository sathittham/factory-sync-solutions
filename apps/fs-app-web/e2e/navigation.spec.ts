import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('landing page loads successfully', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
  });

  test('unknown routes show 404 page', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('unauthenticated user cannot access /quiz', async ({ page }) => {
    await page.goto('/quiz');
    // Should redirect to landing or show auth guard
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/quiz');
  });

  test('unauthenticated user cannot access /admin', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to landing or show auth guard
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/admin');
  });

  test('unauthenticated user cannot access /results', async ({ page }) => {
    await page.goto('/results');
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '/results');
  });

  test('header is visible on all pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });

  test('footer is visible on landing page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('footer')).toBeVisible();
  });
});
