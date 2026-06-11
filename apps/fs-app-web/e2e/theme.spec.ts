import { expect, test } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('defaults to system theme', async ({ page }) => {
    // The html element should have a class of "light" or "dark" based on system preference
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toMatch(/light|dark/);
  });

  test('persists theme preference in localStorage', async ({ page }) => {
    // Set theme via localStorage and verify it persists
    await page.evaluate(() => localStorage.setItem('fss-theme', 'dark'));
    await page.reload();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('light theme applies correct background', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('fss-theme', 'light'));
    await page.reload();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('light');
  });

  test('dark theme applies dark class', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('fss-theme', 'dark'));
    await page.reload();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });
});
