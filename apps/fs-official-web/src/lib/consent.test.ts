import { afterEach, describe, expect, it, vi } from "vitest";
import { updateConsentMode } from "./consent";

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
});
