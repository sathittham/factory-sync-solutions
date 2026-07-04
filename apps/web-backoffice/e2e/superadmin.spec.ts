import { expect, test } from '@playwright/test';
import { loginWithEmail, loginWithStaffEmail } from './helpers/auth';

// Covers the superadmin-only routes gated by SuperAdminGuard
// (src/router.tsx). The test account (E2E_USER_EMAIL) holds
// backofficeRole=superadmin on the staging Firebase project, so these
// verify reachability + key page content for a superadmin visitor, plus
// (via E2E_STAFF_USER_EMAIL) that a non-superadmin staff account never
// reaches these routes.
//
// Staff end up at /dashboard, not /unauthorized: SuperAdminGuard navigates
// to /unauthorized, but UnauthorizedPage immediately bounces any signed-in
// backoffice user (isBackofficeUser=true — true for staff too, not just
// superadmin) onward to /dashboard. So /unauthorized's card is only ever
// seen by a non-backoffice visitor (see navigation.spec.ts), never by staff
// denied a superadmin-only route.

const superadminRoutes = ['/staff', '/audit', '/help/api-docs'];

test.describe('Superadmin-only routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithEmail(page);
  });

  test(
    '/staff is reachable and renders the staff table',
    { tag: '@regression' },
    async ({ page }) => {
      const response = await page.goto('/staff');
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: /จัดการทีมงาน|Staff/i, level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /เพิ่มทีมงาน|Add Staff/i })).toBeVisible();
    },
  );

  test(
    '/audit is reachable and renders the audit log filters',
    { tag: '@regression' },
    async ({ page }) => {
      const response = await page.goto('/audit');
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: /บันทึกกิจกรรม|Audit Log/i, level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /ค้นหา|Search/i })).toBeVisible();
    },
  );

  test(
    '/help/api-docs is reachable and renders the API docs viewer',
    { tag: '@regression' },
    async ({ page }) => {
      const response = await page.goto('/help/api-docs');
      expect(response?.status()).toBe(200);
      await expect(
        page.getByRole('heading', { name: /เอกสาร API|API Docs/i, level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Swagger UI' })).toBeVisible();
    },
  );
});

test.describe('Non-superadmin redirect off superadmin-only routes', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithStaffEmail(page);
  });

  for (const route of superadminRoutes) {
    test(
      `staff visiting ${route} is bounced to /dashboard, not ${route}`,
      { tag: '@regression' },
      async ({ page }) => {
        await page.goto(route);
        await expect(page).toHaveURL(/\/dashboard/);
        await expect(page.locator('header')).toBeVisible();
      },
    );
  }
});
