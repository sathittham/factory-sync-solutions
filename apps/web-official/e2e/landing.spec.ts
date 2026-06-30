import { type Page, expect, test } from "@playwright/test";

// Switch the nav-bar locale to EN.
// The locale button has aria-label "ภาษา" (TH) — distinct from the theme button.
async function switchToEnglish(page: Page) {
	await page.getByRole("button", { name: "ภาษา" }).click();
	await page.getByRole("menuitemradio", { name: /english/i }).click();
}

test.describe("Landing page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("renders hero section", async ({ page }) => {
		await expect(page.locator("#hero")).toBeVisible();
	});

	test("renders expert section", async ({ page }) => {
		await expect(page.locator("#expert")).toBeVisible();
	});

	test("renders services section", async ({ page }) => {
		await expect(page.locator("#services")).toBeVisible();
	});

	test("renders dimensions section", async ({ page }) => {
		await expect(page.locator("#dimensions")).toBeVisible();
	});

	test("renders results section", async ({ page }) => {
		await expect(page.locator("#results")).toBeVisible();
	});

	test("renders process section", async ({ page }) => {
		await expect(page.locator("#process")).toBeVisible();
	});

	test("renders contact section", async ({ page }) => {
		await expect(page.locator("#contact")).toBeVisible();
	});

	test("nav bar sign-in link points to app", async ({ page }) => {
		const signInLink = page
			.locator("header a")
			.filter({ hasText: /เข้าสู่ระบบ|Sign In/i })
			.first();
		await expect(signInLink).toBeVisible();
		const href = await signInLink.getAttribute("href");
		expect(href).toMatch(/^https?:\/\//);
	});

	test("has footer", async ({ page }) => {
		await expect(page.locator("footer")).toBeVisible();
	});

	test("page title contains FactorySync", async ({ page }) => {
		await expect(page).toHaveTitle(/FactorySync/i);
	});
});

test.describe("Landing page — locale switching", () => {
	test.beforeEach(async ({ page }) => {
		// Clear stored locale before page scripts run so the default (TH) is applied.
		await page.addInitScript(() => localStorage.removeItem("fss-locale"));
		await page.goto("/");
	});

	test("defaults to Thai", async ({ page }) => {
		await expect(page.getByText("ตรวจสุขภาพโรงงานอัจฉริยะ")).toBeVisible();
	});

	test("switches hero heading to English", async ({ page, isMobile }) => {
		// Locale switcher is hidden in the desktop nav on mobile; tested separately via hamburger menu.
		test.skip(isMobile, "locale switcher in desktop nav hidden on mobile");
		await switchToEnglish(page);
		await expect(page.getByText("Intelligent Factory Health Check")).toBeVisible({ timeout: 3_000 });
	});
});
