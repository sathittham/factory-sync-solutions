"use client";

import { useEffect } from "react";

// Preferences handed off to the app (app.factorysyncsolutions.com) so language,
// theme, and cookie consent stay consistent across the subdomain boundary.
// localStorage is NOT shared across subdomains, so we pass them as query params
// on outbound app links and let the app seed its own localStorage on boot.
const HANDOFF_KEYS: Record<string, string> = {
	lang: "fss-locale",
	theme: "fss-theme",
	consent: "fss-cookie-consent",
	analytics: "fss-analytics-consent",
	marketing: "fss-marketing-consent",
};

function readStored(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

// Rewrites an anchor's href in place with the current preferences, just before
// navigation — so a theme/language change right before clicking is reflected.
function decorate(anchor: HTMLAnchorElement, appHost: string) {
	let url: URL;
	try {
		url = new URL(anchor.href);
	} catch {
		return;
	}
	if (url.host !== appHost) return;

	for (const [param, storageKey] of Object.entries(HANDOFF_KEYS)) {
		const value = readStored(storageKey);
		if (value !== null) url.searchParams.set(param, value);
	}
	anchor.href = url.toString();
}

export function AppHandoff({ appUrl }: { readonly appUrl: string }) {
	useEffect(() => {
		let appHost: string;
		try {
			appHost = new URL(appUrl).host;
		} catch {
			return; // appUrl is "#" or invalid — nothing to hand off to
		}

		const handle = (event: Event) => {
			const target = event.target as Element | null;
			const anchor = target?.closest?.("a") ?? null;
			if (anchor instanceof HTMLAnchorElement) decorate(anchor, appHost);
		};

		// pointerdown covers mouse/touch (incl. middle-click); keydown covers
		// keyboard activation. Capture phase so we run before navigation.
		document.addEventListener("pointerdown", handle, true);
		document.addEventListener("keydown", handle, true);
		return () => {
			document.removeEventListener("pointerdown", handle, true);
			document.removeEventListener("keydown", handle, true);
		};
	}, [appUrl]);

	return null;
}
