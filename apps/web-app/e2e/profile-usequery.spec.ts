import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

/**
 * Regression checklist for CR-003 Phase 2 — moving the profile off Redux onto
 * TanStack Query (`useProfileQuery`). Mirrors the step-7 checklist in
 * docs/architecture/profile-usequery-design.md and targets the guard failure
 * modes in §3.7 (register-dialog flash, transient redirects during the profile
 * fetch). Run this BEFORE merging the read-migration steps.
 *
 * Requires a registered system-admin test account:
 *   E2E_USER_EMAIL / E2E_USER_PASSWORD   (see e2e/.env.e2e.example)
 * Point at staging with E2E_BASE_URL=https://app-staging.factorysyncsolutions.com
 *
 * Skips cleanly (does not fail) when credentials are absent, so the spec stays
 * repeatable in any environment.
 */

const NO_PROFILE_DIALOG = /No Company Account Found|ไม่พบบัญชีบริษัท/i;
const hasCreds = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

test.describe('CR-003 Phase 2 — profile via TanStack Query', () => {
  test.skip(!hasCreds, 'requires E2E_USER_EMAIL / E2E_USER_PASSWORD (see e2e/.env.e2e.example)');

  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page);
  });

  test('dashboard hydrates from the profile query without a RegisterGuard flash', async ({
    page,
  }) => {
    // Already on /dashboard after login. The "no company account" dialog must
    // NOT appear for a registered user — the classic mis-gating symptom when
    // the guard reads a still-pending profile as "unregistered".
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(NO_PROFILE_DIALOG)).toHaveCount(0);
    await expect(page.getByText(/Welcome back|ยินดีต้อนรับกลับ/i)).toBeVisible();
  });

  test('AdminGuard lets a system admin reach /admin (no transient redirect to /)', async ({
    page,
  }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    // Admin content actually renders (proves canManageUsers resolved from the
    // query, not a redirect back to landing while the profile was pending).
    await expect(
      page.getByTestId('admin-users-table').or(page.getByTestId('admin-assessment-table')),
    ).toBeVisible();
  });

  test('CompanySettingsGuard lets a permitted user reach /company-settings', async ({ page }) => {
    await page.goto('/company-settings');
    await expect(page).toHaveURL(/\/company-settings/);
    await expect(page.getByText(NO_PROFILE_DIALOG)).toHaveCount(0);
  });

  test('profile save persists across reload (mutation → query cache coherence)', async ({
    page,
  }) => {
    await page.goto('/profile');
    const form = page.getByTestId('profile-form');
    await expect(form).toBeVisible();

    // Idempotent: set a fixed, valid phone so re-runs are stable.
    const phone = page.locator('#pp-contactPhone');
    await phone.fill('0812345678');
    await page.getByTestId('profile-submit-btn').click();

    await expect(page.getByText(/Changes saved successfully|บันทึกเรียบร้อยแล้ว/i)).toBeVisible();

    // Reload: the saved value must survive (came from the server, not just
    // local component state).
    await page.reload();
    await expect(page.locator('#pp-contactPhone')).toHaveValue('0812345678');
  });

  test('results page loads for an authenticated user', async ({ page }) => {
    await page.goto('/results');
    await expect(page).toHaveURL(/\/results/);
    await expect(page.getByText(NO_PROFILE_DIALOG)).toHaveCount(0);
  });

  test('quiz route is reachable and renders the stepper', async ({ page }) => {
    await page.goto('/quiz');
    await expect(page).toHaveURL(/\/quiz/);
    await expect(
      page.getByTestId('quiz-stepper').or(page.getByTestId('quiz-question-card')),
    ).toBeVisible();
  });

  test('no uncaught runtime errors across the migrated authenticated routes', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    for (const route of ['/dashboard', '/admin', '/company-settings', '/profile', '/results']) {
      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(route.replace('/', '\\/')));
    }

    expect(errors, `page errors: ${errors.join(' | ')}`).toEqual([]);
  });
});
