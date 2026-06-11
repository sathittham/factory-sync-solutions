import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
	test("landing page loads with 200", async ({ page }) => {
		const res = await page.goto("/");
		expect(res?.status()).toBe(200);
	});

	test("register page loads with 200", async ({ page }) => {
		const res = await page.goto("/register");
		expect(res?.status()).toBe(200);
	});

	test("unknown route returns 404", async ({ page }) => {
		const res = await page.goto("/not-a-page");
		expect(res?.status()).toBe(404);
	});

	test("header is visible on landing page", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("header").first()).toBeVisible();
	});

	test("header is visible on register page", async ({ page }) => {
		await page.goto("/register");
		await expect(page.locator("header").first()).toBeVisible();
	});

	test("logo links back to homepage", async ({ page }) => {
		await page.goto("/register");
		await page.locator("header a[href='/']").first().click();
		await expect(page).toHaveURL("/");
	});
});
