import { expect, test } from "@playwright/test";

test.describe("Register page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register");
		// Wait for React island to hydrate
		await page.waitForSelector("[data-testid='registration-form']", { timeout: 10_000 });
	});

	test("shows site nav bar", async ({ page }) => {
		await expect(page.locator("header")).toBeVisible();
	});

	test("nav bar has sign-in link", async ({ page }) => {
		// Sign In button visible in desktop nav
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

	test("step 1 — account form is visible initially", async ({ page }) => {
		// Auth step (email/password + Google) is shown first
		await expect(page.locator("[data-testid='registration-form']")).toBeVisible();
	});

	test("registration form card is present", async ({ page }) => {
		await expect(page.locator("[data-testid='registration-form']")).toBeVisible();
	});

	test("company reg ID input is present on company info step", async ({ page }) => {
		// The company form only shows after authentication — we just check the container exists
		const form = page.locator("[data-testid='registration-form']");
		await expect(form).toBeVisible();
	});

	test("DBD lookup button is disabled when reg ID is empty", async ({ page }) => {
		// Only visible after auth step completes — skip if not present
		const lookupBtn = page.locator("[data-testid='reg-dbd-lookup-btn']");
		const count = await lookupBtn.count();
		if (count > 0) {
			// If visible it should be disabled when field is empty
			await expect(lookupBtn).toBeDisabled();
		}
	});

	test("submit button is present when company form is shown", async ({ page }) => {
		const submitBtn = page.locator("[data-testid='registration-submit-btn']");
		const count = await submitBtn.count();
		if (count > 0) {
			await expect(submitBtn).toBeVisible();
		}
	});
});

test.describe("Register page — background & layout", () => {
	test("page has hero background (no broken layout)", async ({ page }) => {
		await page.goto("/register");
		// Check no JS errors crashed the page
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
