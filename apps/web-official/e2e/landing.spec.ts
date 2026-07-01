import { type Page, expect, test } from "@playwright/test";

// Switch the nav-bar locale to EN via the desktop Settings menu.
// The desktop nav exposes a single "การตั้งค่า" (Settings) button that opens a
// menu containing the locale + theme radiogroups. The locale option reads
// "EN English", so match it loosely.
//
// The nav is a client:load island: a click that lands before hydration is a
// no-op, so retry opening the menu until the option actually appears.
async function switchToEnglish(page: Page) {
	const settings = page.getByRole("button", { name: "การตั้งค่า" });
	const englishOption = page.getByRole("menuitemradio", { name: /english/i });
	await expect(async () => {
		await settings.click();
		await expect(englishOption).toBeVisible({ timeout: 1_000 });
	}).toPass({ timeout: 10_000 });
	await englishOption.click();
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

	test("nav bar sign-in link points to app", async ({ page, isMobile }) => {
		// The header sign-in button is desktop-only (lg:inline-flex); on mobile it
		// lives inside the hamburger drawer.
		test.skip(isMobile, "header sign-in link is in the drawer on mobile");
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
		await expect(page.getByText("Intelligent Factory Health Check")).toBeVisible({
			timeout: 5_000,
		});
	});
});
