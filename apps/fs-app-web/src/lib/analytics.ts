declare global {
  // biome-ignore lint/style/noVar: globalThis augmentation requires var
  var dataLayer: unknown[];
  // biome-ignore lint/style/noVar: globalThis augmentation requires var
  var gtag: (...args: unknown[]) => void;
}

const GTM_ID = import.meta.env.VITE_GTM_ID || '';
const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

// Same keys as CookieConsent.tsx — duplicated here to avoid a circular import
// (CookieConsent imports trackEvent from this module).
const CONSENT_KEY = 'fss-cookie-consent';
const ANALYTICS_KEY = 'fss-analytics-consent';
const MARKETING_KEY = 'fss-marketing-consent';

let initialized = false;

function ensureGtag() {
  globalThis.dataLayer = globalThis.dataLayer || [];
  if (!globalThis.gtag) {
    globalThis.gtag = function gtag() {
      // biome-ignore lint/style/noArguments: gtag requires arguments object
      globalThis.dataLayer.push(arguments);
    };
  }
}

function consentSignals(analytics: boolean, marketing: boolean) {
  return {
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
  };
}

function storedConsent(): { analytics: boolean; marketing: boolean } | null {
  try {
    if (!localStorage.getItem(CONSENT_KEY)) return null;
    return {
      analytics: localStorage.getItem(ANALYTICS_KEY) === 'true',
      marketing: localStorage.getItem(MARKETING_KEY) === 'true',
    };
  } catch {
    return null;
  }
}

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  // Google Consent Mode v2 (advanced): deny all gated signals BEFORE any tag
  // loads — Google tags then send only cookieless pings until granted.
  // Order matters: default → replay stored choice → inject scripts.
  ensureGtag();
  globalThis.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });

  // Replay a prior choice (incl. one seeded by the official-site handoff in
  // index.html) so a returning visitor's first hit is not sent as denied.
  const stored = storedConsent();
  if (stored) {
    globalThis.gtag('consent', 'update', consentSignals(stored.analytics, stored.marketing));
  }

  // Google Tag Manager
  if (GTM_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(script);
    globalThis.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    // GTM noscript fallback
    const noscript = document.createElement('noscript');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`;
    iframe.height = '0';
    iframe.width = '0';
    iframe.style.display = 'none';
    iframe.style.visibility = 'hidden';
    noscript.appendChild(iframe);
    document.body.insertBefore(noscript, document.body.firstChild);
  }

  // Google Analytics 4 (legacy fallback when no GTM container is provisioned)
  if (GA_ID) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);

    globalThis.gtag('js', new Date());
    globalThis.gtag('config', GA_ID);
  }
}

// Pushes the Consent Mode update when the user makes or changes a choice.
export function updateConsentMode(analytics: boolean, marketing: boolean) {
  if (globalThis.gtag) {
    globalThis.gtag('consent', 'update', consentSignals(analytics, marketing));
  }
  if (!analytics) deleteGoogleAnalyticsCookies();
}

// Consent Mode stops FUTURE cookie writes on revocation but leaves existing
// _ga / _ga_* cookies in place until expiry (~13 months). PDPA withdrawal
// should remove them actively. GA sets them on the eTLD+1, so expire against
// each ancestor domain.
function deleteGoogleAnalyticsCookies() {
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  const hosts = globalThis.location.hostname.split('.');
  const domains = hosts.map((_, i) => hosts.slice(i).join('.')).filter((d) => d.includes('.'));
  for (const raw of document.cookie.split(';')) {
    const name = raw.split('=')[0]?.trim() ?? '';
    if (name !== '_ga' && !name.startsWith('_ga_')) continue;
    document.cookie = `${name}=; ${expired}`;
    for (const d of domains) {
      document.cookie = `${name}=; ${expired}; domain=.${d}`;
    }
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (globalThis.gtag) {
    globalThis.gtag('event', eventName, params);
  }
}

export function trackPageView(path: string) {
  if (globalThis.gtag && GA_ID) {
    globalThis.gtag('config', GA_ID, { page_path: path });
  }
}
