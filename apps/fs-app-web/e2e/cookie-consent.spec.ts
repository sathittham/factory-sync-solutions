import { test, expect } from "@playwright/test";

test.describe("Cookie Consent", () => {
	test.beforeEach(async ({ page }) => {
		// Clear consent so banner appears
		await page.goto("/");
		await page.evaluate(() => localStorage.removeItem("fss-cookie-consent"));
		await page.reload();
	});

	test("shows cookie banner on first visit", async ({ page }) => {
		const acceptBtn = page.getByTestId("cookie-accept-all-btn");
		await expect(acceptBtn).toBeVisible();

		const settingsBtn = page.getByTestId("cookie-settings-btn");
		await expect(settingsBtn).toBeVisible();
	});

	test("accept all hides the banner", async ({ page }) => {
		const acceptBtn = page.getByTestId("cookie-accept-all-btn");
		await acceptBtn.click();

		// Banner should disappear
		await expect(acceptBtn).not.toBeVisible();

		// Consent should be stored
		const consent = await page.evaluate(() => localStorage.getItem("fss-cookie-consent"));
		expect(consent).toBe("all");
	});

	test("opens cookie settings dialog", async ({ page }) => {
		const settingsBtn = page.getByTestId("cookie-settings-btn");
		await settingsBtn.click();

		// Settings dialog should be visible with confirm button
		const confirmBtn = page.getByTestId("cookie-confirm-btn");
		await expect(confirmBtn).toBeVisible();
	});

	test("confirm selection with defaults saves essential only", async ({ page }) => {
		const settingsBtn = page.getByTestId("cookie-settings-btn");
		await settingsBtn.click();

		const confirmBtn = page.getByTestId("cookie-confirm-btn");
		await confirmBtn.click();

		// Dialog should close
		await expect(confirmBtn).not.toBeVisible();

		// Consent should be stored as essential
		const consent = await page.evaluate(() => localStorage.getItem("fss-cookie-consent"));
		expect(consent).toBe("essential");
	});

	test("does not show banner after consent is given", async ({ page }) => {
		// Accept all first
		await page.getByTestId("cookie-accept-all-btn").click();

		// Reload and verify banner doesn't appear
		await page.reload();
		const acceptBtn = page.getByTestId("cookie-accept-all-btn");
		await expect(acceptBtn).not.toBeVisible();
	});
});
