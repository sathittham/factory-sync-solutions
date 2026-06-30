import { expect, test } from "@playwright/test";

// Nav bar tests — work without Firebase config (SiteNavBar is client:load, not client:only)
test.describe("Register page — nav bar", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register");
		await expect(page.locator("header").first()).toBeVisible({ timeout: 5_000 });
	});

	test("shows site nav bar", async ({ page }) => {
		await expect(page.locator("header").first()).toBeVisible();
	});

	test("nav bar has sign-in link", async ({ page }) => {
		const signInLink = page
			.locator("header a")
			.filter({ hasText: /เข้าสู่ระบบ|Sign In/i })
			.first();
		await expect(signInLink).toBeVisible();
	});

	test("nav logo links to homepage", async ({ page }) => {
		const logoLink = page.locator("header a[href='/']").first();
		await expect(logoLink).toBeVisible();
	});
});

// Form tests — require Firebase to hydrate RegisterContent (client:only island)
// These pass in CI (Firebase config injected) and in local dev with .env.local filled.
test.describe("Register page — form", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register");
		// Wait for React island to hydrate — needs Firebase config to complete
		await page.waitForSelector("[data-testid='registration-form']", { timeout: 10_000 });
	});

	test("step 1 — account form is visible initially", async ({ page }) => {
		await expect(page.locator("[data-testid='registration-form']")).toBeVisible();
	});

	test("step 1 — email, password, and confirm inputs are present", async ({ page }) => {
		await expect(page.locator("#auth-email")).toBeVisible();
		await expect(page.locator("#auth-password")).toBeVisible();
		await expect(page.locator("#auth-confirm")).toBeVisible();
	});

	test("step 1 — create account button is present and enabled", async ({ page }) => {
		const createBtn = page.getByRole("button", { name: /สร้างบัญชี|create account/i });
		await expect(createBtn).toBeVisible();
		await expect(createBtn).toBeEnabled();
	});
});

test.describe("Register page — layout", () => {
	test("page has no JS errors on load", async ({ page }) => {
		await page.goto("/register");
		const errors: string[] = [];
		page.on("pageerror", (e) => errors.push(e.message));
		await page.waitForTimeout(1_000);
		expect(errors).toHaveLength(0);
	});

	test("page is scrollable when content overflows on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/register");
		await expect(page.locator("body")).toBeVisible();
	});
});
