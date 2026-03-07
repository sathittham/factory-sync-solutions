declare global {
	// biome-ignore lint/style/noVar: globalThis augmentation requires var
	var dataLayer: unknown[];
	// biome-ignore lint/style/noVar: globalThis augmentation requires var
	var gtag: (...args: unknown[]) => void;
}

const GTM_ID = import.meta.env.VITE_GTM_ID || "";
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

let initialized = false;

export function initAnalytics() {
	if (initialized) return;
	initialized = true;

	// Google Tag Manager
	if (GTM_ID) {
		globalThis.dataLayer = globalThis.dataLayer || [];
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
		document.head.appendChild(script);
		globalThis.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

		// GTM noscript fallback
		const noscript = document.createElement("noscript");
		const iframe = document.createElement("iframe");
		iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`;
		iframe.height = "0";
		iframe.width = "0";
		iframe.style.display = "none";
		iframe.style.visibility = "hidden";
		noscript.appendChild(iframe);
		document.body.insertBefore(noscript, document.body.firstChild);
	}

	// Google Analytics 4 (standalone, if no GTM or as fallback)
	if (GA_ID) {
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
		document.head.appendChild(script);

		globalThis.dataLayer = globalThis.dataLayer || [];
		globalThis.gtag = function gtag() {
			// biome-ignore lint/style/noArguments: gtag requires arguments object
			globalThis.dataLayer.push(arguments);
		};
		globalThis.gtag("js", new Date());
		globalThis.gtag("config", GA_ID);
	}
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
	if (globalThis.gtag) {
		globalThis.gtag("event", eventName, params);
	}
}

export function trackPageView(path: string) {
	if (globalThis.gtag && GA_ID) {
		globalThis.gtag("config", GA_ID, { page_path: path });
	}
}
