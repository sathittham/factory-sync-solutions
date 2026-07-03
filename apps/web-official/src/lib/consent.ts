// Google Consent Mode v2 bridge. The consent *default* (all gated signals
// denied) is set by the inline head script in Layout.astro before GTM loads;
// this module pushes the *update* when the user makes or changes a choice.
// See docs/product/cookie-consent/feature-spec.md.

// Custom DOM event contract: any element (e.g. the "Manage cookie preferences"
// button on /cookie-settings) can call openCookieSettings() to reopen the
// consent modal owned by the CookieConsent island — they live in separate
// React islands, so a DOM event is the bridge between them.
export const OPEN_SETTINGS_EVENT = "fss:open-cookie-settings";

export function openCookieSettings() {
	globalThis.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

export function updateConsentMode(analytics: boolean, marketing: boolean) {
	globalThis.gtag?.("consent", "update", {
		analytics_storage: analytics ? "granted" : "denied",
		ad_storage: marketing ? "granted" : "denied",
		ad_user_data: marketing ? "granted" : "denied",
		ad_personalization: marketing ? "granted" : "denied",
	});
	if (!analytics) deleteGoogleAnalyticsCookies();
}

// Consent Mode stops FUTURE cookie writes on revocation but leaves existing
// _ga / _ga_* cookies in place until expiry (~13 months). PDPA withdrawal
// should remove them actively. GA sets them on the eTLD+1, so expire against
// each ancestor domain.
function deleteGoogleAnalyticsCookies() {
	const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	const hosts = globalThis.location.hostname.split(".");
	const domains = hosts.map((_, i) => hosts.slice(i).join(".")).filter((d) => d.includes("."));
	for (const raw of document.cookie.split(";")) {
		const name = raw.split("=")[0]?.trim() ?? "";
		if (name !== "_ga" && !name.startsWith("_ga_")) continue;
		document.cookie = `${name}=; ${expired}`;
		for (const d of domains) {
			document.cookie = `${name}=; ${expired}; domain=.${d}`;
		}
	}
}
