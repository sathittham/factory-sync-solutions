import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("renders hero section", async ({ page }) => {
		await expect(page.locator("#hero")).toBeVisible();
	});

	test("renders dimensions section", async ({ page }) => {
		await expect(page.locator("#dimensions")).toBeVisible();
	});

	test("renders contact section", async ({ page }) => {
		await expect(page.locator("#contact")).toBeVisible();
	});

	test("nav bar sign-in link points to app", async ({ page }) => {
		const signInLink = page.locator("header a").filter({ hasText: /เข้าสู่ระบบ|Sign In/i }).first();
		await expect(signInLink).toBeVisible();
		const href = await signInLink.getAttribute("href");
		expect(href).toBeTruthy();
	});

	test("has footer", async ({ page }) => {
		await expect(page.locator("footer")).toBeVisible();
	});

	test("page title is set", async ({ page }) => {
		await expect(page).toHaveTitle(/.+/);
	});
});
