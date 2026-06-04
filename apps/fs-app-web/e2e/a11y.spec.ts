import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
	test("landing page has proper document title", async ({ page }) => {
		await page.goto("/");
		await expect(page).toHaveTitle(/FactorySync Solutions/);
	});

	test("all images have alt attributes", async ({ page }) => {
		await page.goto("/");
		const images = page.locator("img");
		const count = await images.count();

		for (let i = 0; i < count; i++) {
			const alt = await images.nth(i).getAttribute("alt");
			expect(alt, `Image ${i} missing alt attribute`).not.toBeNull();
		}
	});

	test("interactive elements are keyboard accessible", async ({ page }) => {
		await page.goto("/");

		// Tab to the first CTA button
		await page.keyboard.press("Tab");
		const focused = page.locator(":focus");
		await expect(focused).toBeVisible();
	});

	test("cookie consent toggle has correct ARIA role", async ({ page }) => {
		await page.goto("/");
		await page.evaluate(() => localStorage.removeItem("fss-cookie-consent"));
		await page.reload();

		// Open settings
		await page.getByTestId("cookie-settings-btn").click();

		// Toggle switches should have role="switch"
		const switches = page.locator("[role='switch']");
		const count = await switches.count();
		expect(count).toBeGreaterThanOrEqual(2); // analytics + marketing
	});

	test("base font size is at least 17px for readability", async ({ page }) => {
		await page.goto("/");
		const fontSize = await page.evaluate(() => {
			return parseFloat(getComputedStyle(document.documentElement).fontSize);
		});
		expect(fontSize).toBeGreaterThanOrEqual(17);
	});
});
