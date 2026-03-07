declare global {
	interface Window {
		dataLayer: unknown[];
		gtag: (...args: unknown[]) => void;
	}
}

const GTM_ID = import.meta.env.VITE_GTM_ID || "";
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || "";

let initialized = false;

export function initAnalytics() {
	if (initialized) return;
	initialized = true;

	// Google Tag Manager
	if (GTM_ID) {
		window.dataLayer = window.dataLayer || [];
		const script = document.createElement("script");
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
		document.head.appendChild(script);
		window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

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

		window.dataLayer = window.dataLayer || [];
		window.gtag = function gtag() {
			// biome-ignore lint/style/noArguments: gtag requires arguments object
			window.dataLayer.push(arguments);
		};
		window.gtag("js", new Date());
		window.gtag("config", GA_ID);
	}
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
	if (window.gtag) {
		window.gtag("event", eventName, params);
	}
}

export function trackPageView(path: string) {
	if (window.gtag && GA_ID) {
		window.gtag("config", GA_ID, { page_path: path });
	}
}
