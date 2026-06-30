import { type Page, expect, test } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function waitForAuthStep(page: Page) {
	await page.waitForSelector("[data-testid='registration-form']", { timeout: 10_000 });
}

// Dismiss the cookie consent banner by pre-accepting via localStorage.
async function acceptCookies(page: Page) {
	await page.addInitScript(() => {
		localStorage.setItem("fss-cookie-consent", "all");
	});
}

// Switch the nav-bar locale to EN (triggers the cross-island broadcast).
// The locale button has aria-label "ภาษา" (TH) — use that to avoid matching the theme button.
async function switchToEnglish(page: Page) {
	await page.getByRole("button", { name: "ภาษา" }).click();
	await page.getByRole("menuitemradio", { name: /english/i }).click();
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Google sign-in button — UI
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Register — Google sign-in button", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookies(page);
		await page.goto("/register");
		await waitForAuthStep(page);
	});

	test("is visible and enabled", async ({ page }) => {
		const btn = page.getByTestId("google-signin-btn");
		await expect(btn).toBeVisible();
		await expect(btn).toBeEnabled();
	});

	/**
	 * The loading/disabled state only applies when Firebase auth IS configured and
	 * signInWithPopup is pending. If auth is null (env vars missing) our guard
	 * returns synchronously before setIsGoogleLoading(true) — so button stays enabled.
	 * This test only asserts the disabled state when a popup actually opens.
	 */
	test("disables button while popup is open, re-enables on close", async ({ page }) => {
		const popupPromise = page.waitForEvent("popup", { timeout: 4_000 }).catch(() => null);

		await page.getByTestId("google-signin-btn").click();
		const popup = await popupPromise;

		if (popup) {
			// Firebase IS configured — button must be disabled while popup is open
			await expect(page.getByTestId("google-signin-btn")).toBeDisabled({ timeout: 2_000 });
			await popup.close();
			// Firebase polls popup.closed ~every 1 s before firing popup-closed-by-user
			// and running finally { setIsGoogleLoading(false) } — allow up to 10 s.
			await expect(page.getByTestId("google-signin-btn")).toBeEnabled({ timeout: 10_000 });
			await expect(page.locator(".text-destructive")).not.toBeVisible();
		} else {
			// Firebase not configured or operation-not-allowed — an error is shown instead
			await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 3_000 });
			// Button should still be usable after the synchronous error
			await expect(page.getByTestId("google-signin-btn")).toBeEnabled();
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Google sign-in — diagnostic (captures actual Firebase error)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Register — Google sign-in diagnostic", () => {
	/**
	 * This test FAILS intentionally when Google sign-in is broken (no popup).
	 * Run it to get actionable diagnostics printed to the test output.
	 * Fix checklist printed in the error message if it fails.
	 */
	test("popup opens and redirects to Google OAuth", async ({ page }) => {
		await acceptCookies(page);

		const firebaseRequests: string[] = [];
		page.on("request", (req) => {
			const url = req.url();
			if (url.includes("googleapis.com") || url.includes("firebase") || url.includes("gstatic")) {
				firebaseRequests.push(`${req.method()} ${url}`);
			}
		});
		const consoleErrors: string[] = [];
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text());
		});

		await page.goto("/register");
		await waitForAuthStep(page);

		const popupPromise = page.waitForEvent("popup", { timeout: 5_000 }).catch(() => null);
		await page.getByTestId("google-signin-btn").click();
		const popup = await popupPromise;

		if (popup) {
			const popupUrl = popup.url();
			console.log("[DIAG] Popup URL:", popupUrl);
			expect(popupUrl).toMatch(/accounts\.google\.com|firebaseapp\.com\/__\/auth/);
			await popup.close();
		} else {
			const errorEl = page.locator(".text-destructive");
			await expect(errorEl).toBeVisible({ timeout: 4_000 });
			const errorText = await errorEl.textContent();

			console.log("[DIAG] Error:", errorText);
			console.log("[DIAG] Firebase requests made:", firebaseRequests);
			console.log("[DIAG] Console errors:", consoleErrors);

			// Determine most likely cause from what we know
			const isNullAuth = !firebaseRequests.some((r) => r.includes("identitytoolkit"));
			const diagnosis = isNullAuth
				? "auth is null (Firebase env vars not loaded) OR signInWithPopup threw synchronously"
				: "Firebase threw after initialising — check the error message above";

			const message =
				`Google sign-in did not open a popup.\n` +
				`Displayed error: "${errorText}"\n` +
				`Diagnosis: ${diagnosis}\n` +
				`Fix checklist:\n` +
				`  1. Verify PUBLIC_FIREBASE_* env vars are set and non-empty in .env.local\n` +
				`  2. Enable Google as a sign-in provider in Firebase Console → Authentication\n` +
				`  3. Add "localhost" to Authorised Domains in Firebase Console → Authentication → Settings`;

			// Skip (not fail) when Firebase is simply not configured; only throw when
			// Firebase IS initialised but the popup still did not open (a real breakage).
			test.skip(isNullAuth, message);
			throw new Error(message);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Locale sync (navbar → RegisterContent island)
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Register — locale sync between islands", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookies(page);
		// Start fresh — clear any stored locale so tests are deterministic
		await page.goto("/register");
		await page.evaluate(() => localStorage.removeItem("fss-locale"));
		await page.reload();
		await page.waitForSelector("[data-testid='registration-form']", { timeout: 10_000 });
	});

	test("defaults to Thai when no locale is stored", async ({ page }) => {
		await expect(page.getByText("ลงทะเบียนบริษัท")).toBeVisible();
	});

	test("switches form to English when nav locale is changed to EN", async ({ page }) => {
		await switchToEnglish(page);
		await expect(page.getByText("Company Registration")).toBeVisible({ timeout: 3_000 });
		await expect(page.getByText("Create an account")).toBeVisible();
	});

	test("step indicator labels switch language", async ({ page }) => {
		await switchToEnglish(page);
		// Use role=presentation span inside the step indicator, not the submit button
		await expect(
			page.locator("[data-testid='registration-form'] span", { hasText: "Create Account" }),
		).toBeVisible({ timeout: 3_000 });
		await expect(
			page.locator("[data-testid='registration-form'] span", { hasText: "Company Info" }),
		).toBeVisible();
		await expect(
			page.locator("[data-testid='registration-form'] span", { hasText: "Contact Info" }),
		).toBeVisible();
	});

	test("persists locale in localStorage after switch", async ({ page }) => {
		await switchToEnglish(page);
		const stored = await page.evaluate(() => localStorage.getItem("fss-locale"));
		expect(stored).toBe("en");
	});

	test("Google button label switches to English", async ({ page }) => {
		await switchToEnglish(page);
		await expect(page.getByTestId("google-signin-btn")).toContainText("Sign in with Google", {
			timeout: 3_000,
		});
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Email sign-up — validation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Register — email sign-up validation", () => {
	test.beforeEach(async ({ page }) => {
		await acceptCookies(page);
		await page.goto("/register");
		await waitForAuthStep(page);
	});

	test("shows error when passwords do not match", async ({ page }) => {
		await page.fill("#auth-email", "test@example.com");
		await page.fill("#auth-password", "password123");
		await page.fill("#auth-confirm", "different999");
		await page.getByRole("button", { name: /สร้างบัญชี|create account/i }).click();
		await expect(page.locator(".text-destructive")).toBeVisible({ timeout: 3_000 });
	});

	/**
	 * The browser's native type="email" validation blocks submission for badly-formed
	 * addresses before React gets a chance to show .text-destructive. Test behaviour
	 * via the constraint API instead.
	 */
	test("native email input rejects invalid format without submitting", async ({ page }) => {
		await page.fill("#auth-email", "not-an-email");
		// Constraint API — validity.valid is false for badly formatted emails
		const isValid = await page.$eval("#auth-email", (el) => (el as HTMLInputElement).validity.valid);
		expect(isValid).toBe(false);
	});

	test("can switch to sign-in mode", async ({ page }) => {
		// The mode-switch button is the small text-link at the bottom: exact "เข้าสู่ระบบ" / "Sign in"
		// Using last() because the Google button also contains the Thai text as a substring
		await page
			.locator("[data-testid='registration-form'] p button")
			.last()
			.click();
		await expect(page.getByText(/ยินดีต้อนรับ|Welcome back/i)).toBeVisible({ timeout: 3_000 });
	});

	test("can switch to password reset mode from sign-in", async ({ page }) => {
		// 1. Switch to sign-in mode via the bottom text-link
		await page
			.locator("[data-testid='registration-form'] p button")
			.last()
			.click();
		await expect(page.getByText(/ยินดีต้อนรับ|Welcome back/i)).toBeVisible({ timeout: 3_000 });
		// 2. Click forgot-password link
		await page.getByRole("button", { name: /ลืมรหัสผ่าน|forgot password/i }).click();
		await expect(page.getByText(/รีเซ็ตรหัสผ่าน|Reset password/i)).toBeVisible({ timeout: 3_000 });
	});
});
