import { expect, test } from '@playwright/test';
import { loginWithEmail } from './helpers/auth';

// Covers the superadmin-only routes gated by SuperAdminGuard
// (src/router.tsx). The test account (E2E_USER_EMAIL) holds
// backofficeRole=superadmin on the staging Firebase project, so these
// verify reachability + key page content for a superadmin visitor.
//
// Not covered here: a non-superadmin staff account being redirected to
// /unauthorized when hitting these routes. No staff-only test account
// exists yet — see docs/product/web-backoffice/test-plan.md §6.

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
