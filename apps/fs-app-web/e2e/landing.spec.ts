import { expect, test } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with CTA button', async ({ page }) => {
    const heroCta = page.getByTestId('hero-cta-btn');
    await expect(heroCta).toBeVisible();
  });

  test('renders bottom CTA section', async ({ page }) => {
    const bottomCta = page.getByTestId('bottom-cta-btn');
    await expect(bottomCta).toBeVisible();
  });

  test('hero CTA opens sign-in dialog with Google button', async ({ page }) => {
    // Click hero CTA to open the sign-in dialog
    await page.getByTestId('hero-cta-btn').click();

    // Google sign-in button should appear in the dialog
    const signinBtn = page.getByTestId('signin-google-btn');
    await expect(signinBtn).toBeVisible();
  });

  test('renders LINE contact button', async ({ page }) => {
    const lineBtn = page.getByTestId('line-cta-btn');
    await expect(lineBtn).toBeVisible();
  });

  test('has footer', async ({ page }) => {
    await expect(page.locator('footer')).toBeVisible();
  });
});
