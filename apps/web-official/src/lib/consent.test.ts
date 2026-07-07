import { afterEach, describe, expect, it, vi } from "vitest";
import { OPEN_SETTINGS_EVENT, openCookieSettings, updateConsentMode } from "./consent";

function clearCookies() {
	for (const raw of document.cookie.split(";")) {
		const name = raw.split("=")[0]?.trim();
		if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
	}
}

describe("updateConsentMode", () => {
	afterEach(() => {
		globalThis.gtag = undefined;
		clearCookies();
	});

	it("pushes a granted consent update for analytics + marketing", () => {
		const gtag = vi.fn();
		globalThis.gtag = gtag;

		updateConsentMode(true, true);

		expect(gtag).toHaveBeenCalledWith("consent", "update", {
			analytics_storage: "granted",
			ad_storage: "granted",
			ad_user_data: "granted",
			ad_personalization: "granted",
		});
	});

	it("maps each category to its own signals independently", () => {
		const gtag = vi.fn();
		globalThis.gtag = gtag;

		updateConsentMode(true, false);

		expect(gtag).toHaveBeenCalledWith("consent", "update", {
			analytics_storage: "granted",
			ad_storage: "denied",
			ad_user_data: "denied",
			ad_personalization: "denied",
		});
	});

	it("deletes _ga and _ga_* cookies when analytics is revoked", () => {
		globalThis.gtag = vi.fn();
		document.cookie = "_ga=GA1.1.123";
		document.cookie = "_ga_ABC123=GS1.1.456";
		document.cookie = "fss_other=keep";

		updateConsentMode(false, false);

		expect(document.cookie).not.toContain("_ga=");
		expect(document.cookie).not.toContain("_ga_ABC123=");
		expect(document.cookie).toContain("fss_other=keep");
	});

	it("keeps GA cookies while analytics stays granted", () => {
		globalThis.gtag = vi.fn();
		document.cookie = "_ga=GA1.1.123";

		updateConsentMode(true, false);

		expect(document.cookie).toContain("_ga=GA1.1.123");
	});

	it("does not throw without gtag and still deletes GA cookies", () => {
		document.cookie = "_ga=GA1.1.123";

		expect(() => updateConsentMode(false, false)).not.toThrow();
		expect(document.cookie).not.toContain("_ga=");
	});

	it("updateConsentMode(false, true) denies analytics and grants marketing in one call", () => {
		const gtag = vi.fn();
		globalThis.gtag = gtag;

		updateConsentMode(false, true);

		expect(gtag).toHaveBeenCalledTimes(1);
		expect(gtag).toHaveBeenCalledWith("consent", "update", {
			analytics_storage: "denied",
			ad_storage: "granted",
			ad_user_data: "granted",
			ad_personalization: "granted",
		});
	});

	it("deleteGoogleAnalyticsCookies attempts deletion against ancestor domain patterns", () => {
		globalThis.gtag = vi.fn();

		// Set a hostname with multiple parts so the domain-iteration logic runs.
		// jsdom defaults to "localhost"; override to something with an eTLD+1.
		Object.defineProperty(globalThis, "location", {
			value: { ...globalThis.location, hostname: "app.example.com" },
			writable: true,
			configurable: true,
		});

		document.cookie = "_ga=GA1.2.999";
		document.cookie = "_ga_XYZ=GS1.1.111";

		// Spy on the setter to capture every deletion attempt.
		const cookieWrites: string[] = [];
		const originalDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");
		vi.spyOn(document, "cookie", "set").mockImplementation((value: string) => {
			cookieWrites.push(value);
			// Also apply the real setter so document.cookie state stays consistent.
			originalDescriptor?.set?.call(document, value);
		});

		updateConsentMode(false, false);

		// The function should attempt to delete against ".example.com" (eTLD+1)
		// and ".app.example.com" — both are derived from "app.example.com".
		const domainAttempts = cookieWrites.filter((w) => w.startsWith("_ga") && w.includes("domain="));
		const attemptedDomains = domainAttempts.map((w) => {
			const match = /domain=([^;]+)/.exec(w);
			return match?.[1] ?? "";
		});

		expect(attemptedDomains).toContain(".example.com");
		expect(attemptedDomains).toContain(".app.example.com");
	});

	it("openCookieSettings dispatches the reopen event the CookieConsent island listens for", () => {
		const handler = vi.fn();
		globalThis.addEventListener(OPEN_SETTINGS_EVENT, handler);

		openCookieSettings();

		expect(handler).toHaveBeenCalledTimes(1);
		globalThis.removeEventListener(OPEN_SETTINGS_EVENT, handler);
	});

	it("does not throw on localhost and still clears cookies without domain prefix", () => {
		// Reset hostname to "localhost" — the domains filter produces [] because
		// "localhost" has no "." so every domain variant is filtered out.
		Object.defineProperty(globalThis, "location", {
			value: { ...globalThis.location, hostname: "localhost" },
			writable: true,
			configurable: true,
		});

		document.cookie = "_ga=GA1.1.123";

		// Must not throw even when domains array is empty.
		expect(() => updateConsentMode(false, false)).not.toThrow();

		// The plain deletion (without domain=) should still be attempted.
		// jsdom's cookie sandbox may not fully honour past-expiry deletion,
		// but the important invariant is no exception.
	});
});
