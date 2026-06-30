import { expect, test } from '@playwright/test';

test.describe('Cookie Consent', () => {
  test.beforeEach(async ({ page }) => {
    // Clear consent so banner appears
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('fss-cookie-consent'));
    await page.reload();
  });

  test('shows cookie banner on first visit', async ({ page }) => {
    const acceptBtn = page.getByTestId('cookie-accept-all-btn');
    await expect(acceptBtn).toBeVisible();

    const settingsBtn = page.getByTestId('cookie-settings-btn');
    await expect(settingsBtn).toBeVisible();
  });

  test('accept all hides the banner', async ({ page }) => {
    const acceptBtn = page.getByTestId('cookie-accept-all-btn');
    await acceptBtn.click();

    // Banner should disappear
    await expect(acceptBtn).not.toBeVisible();

    // Consent should be stored
    const consent = await page.evaluate(() => localStorage.getItem('fss-cookie-consent'));
    expect(consent).toBe('all');
  });

  test('opens cookie settings dialog', async ({ page }) => {
    const settingsBtn = page.getByTestId('cookie-settings-btn');
    await settingsBtn.click();

    // Settings dialog should be visible with confirm button
    const confirmBtn = page.getByTestId('cookie-confirm-btn');
    await expect(confirmBtn).toBeVisible();
  });

  test('confirm selection with defaults saves essential only', async ({ page }) => {
    const settingsBtn = page.getByTestId('cookie-settings-btn');
    await settingsBtn.click();

    const confirmBtn = page.getByTestId('cookie-confirm-btn');
    await confirmBtn.click();

    // Dialog should close
    await expect(confirmBtn).not.toBeVisible();

    // Consent should be stored as essential
    const consent = await page.evaluate(() => localStorage.getItem('fss-cookie-consent'));
    expect(consent).toBe('essential');
  });

  test('does not show banner after consent is given', async ({ page }) => {
    // Accept all first
    await page.getByTestId('cookie-accept-all-btn').click();

    // Reload and verify banner doesn't appear
    await page.reload();
    const acceptBtn = page.getByTestId('cookie-accept-all-btn');
    await expect(acceptBtn).not.toBeVisible();
  });
});

// gtag pushes `arguments` objects onto dataLayer; normalize to arrays so they
// survive page.evaluate serialization.
const readConsentCalls = () =>
  ((globalThis as { dataLayer?: unknown[] }).dataLayer ?? [])
    .filter((e): e is IArguments => typeof e === 'object' && e !== null && 0 in e)
    .map((e) => Array.from(e as ArrayLike<unknown>))
    .filter((e) => e[0] === 'consent');

test.describe('Consent Mode v2', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('defaults all gated signals to denied before any choice', async ({ page }) => {
    const calls = await page.evaluate(readConsentCalls);
    const def = calls.find((c) => c[1] === 'default');
    expect(def?.[2]).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(calls.filter((c) => c[1] === 'update')).toHaveLength(0);
  });

  test('accept all pushes a granted consent update on the same page', async ({ page }) => {
    await page.getByTestId('cookie-accept-all-btn').click();

    const calls = await page.evaluate(readConsentCalls);
    const update = calls.findLast((c) => c[1] === 'update');
    expect(update?.[2]).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });

  test('confirming analytics-only grants analytics and denies marketing', async ({ page }) => {
    await page.getByTestId('cookie-settings-btn').click();
    // Settings panel order: analytics switch first, marketing second
    await page.getByRole('switch').first().click();
    await page.getByTestId('cookie-confirm-btn').click();

    const calls = await page.evaluate(readConsentCalls);
    const update = calls.findLast((c) => c[1] === 'update');
    expect(update?.[2]).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
    });
  });

  test('a stored choice is replayed as an update on the next visit', async ({ page }) => {
    await page.getByTestId('cookie-accept-all-btn').click();
    await page.reload();

    const calls = await page.evaluate(readConsentCalls);
    const update = calls.findLast((c) => c[1] === 'update');
    expect(update?.[2]).toMatchObject({ analytics_storage: 'granted' });
  });

  test('handoff query params seed consent and are stripped from the URL', async ({ page }) => {
    await page.goto('/?consent=all&analytics=true&marketing=true&lang=th');

    // Boot script strips handoff params via history.replaceState
    await page.waitForFunction(() => globalThis.location.search === '');
    const seeded = await page.evaluate(() => ({
      consent: localStorage.getItem('fss-cookie-consent'),
      analytics: localStorage.getItem('fss-analytics-consent'),
    }));
    expect(seeded.consent).toBe('all');
    expect(seeded.analytics).toBe('true');

    // Seeded consent suppresses the banner and is replayed into Consent Mode
    await expect(page.getByTestId('cookie-accept-all-btn')).not.toBeVisible();
    const calls = await page.evaluate(readConsentCalls);
    const update = calls.findLast((c) => c[1] === 'update');
    expect(update?.[2]).toMatchObject({ analytics_storage: 'granted' });
  });
});
