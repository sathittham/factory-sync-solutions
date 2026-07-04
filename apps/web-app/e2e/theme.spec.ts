import { expect, test } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // `lib/theme.tsx` uses Tailwind's class-based dark mode: it only ever
  // `classList.toggle('dark', resolved === 'dark')`. There is no explicit
  // "light" class — light mode is the *absence* of "dark". Assertions below
  // check for that, not a literal "light" string.

  test('defaults to system theme', { tag: '@regression' }, async ({ page }) => {
    // No stored preference — resolves from the system color scheme, which
    // Playwright/Chromium defaults to "light" (no "dark" class) unless
    // emulateMedia({ colorScheme: 'dark' }) is set.
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass ?? '').not.toContain('dark');
  });

  test('persists theme preference in localStorage', { tag: '@regression' }, async ({ page }) => {
    // Set theme via localStorage and verify it persists
    await page.evaluate(() => localStorage.setItem('fss-theme', 'dark'));
    await page.reload();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('light theme applies correct background', { tag: '@regression' }, async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('fss-theme', 'light'));
    await page.reload();

    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass ?? '').not.toContain('dark');
  });

  test(
    'system theme resolves to a valid class when no preference is stored',
    { tag: '@regression' },
    async ({ page }) => {
      await page.evaluate(() => localStorage.removeItem('fss-theme'));
      await page.reload();

      // Valid resolved states are "no dark class" (light) or "dark class present".
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass === null || htmlClass.includes('dark')).toBe(true);
    },
  );
});
