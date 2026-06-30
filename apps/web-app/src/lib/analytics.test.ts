import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// gtag pushes `arguments` objects onto dataLayer — index access only.
type GtagCall = { 0: string; 1: string; 2?: Record<string, unknown> };

function consentCalls(): GtagCall[] {
  return (globalThis.dataLayer ?? []).filter(
    (e): e is GtagCall => typeof e === 'object' && e !== null && (e as GtagCall)[0] === 'consent',
  );
}

async function freshAnalytics() {
  vi.resetModules();
  return await import('./analytics');
}

function clearCookies() {
  for (const raw of document.cookie.split(';')) {
    const name = raw.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

describe('analytics consent gating', () => {
  beforeEach(() => {
    // @ts-expect-error — reset module-managed globals between tests
    globalThis.dataLayer = undefined;
    // @ts-expect-error — reset module-managed globals between tests
    globalThis.gtag = undefined;
    localStorage.clear();
    clearCookies();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initAnalytics pushes a denied consent default as its first dataLayer entry', async () => {
    const { initAnalytics } = await freshAnalytics();
    initAnalytics();

    const first = globalThis.dataLayer[0] as GtagCall;
    expect(first[0]).toBe('consent');
    expect(first[1]).toBe('default');
    expect(first[2]).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
  });

  it('initAnalytics replays stored consent as an update', async () => {
    localStorage.setItem('fss-cookie-consent', 'partial');
    localStorage.setItem('fss-analytics-consent', 'true');
    localStorage.setItem('fss-marketing-consent', 'false');

    const { initAnalytics } = await freshAnalytics();
    initAnalytics();

    const updates = consentCalls().filter((c) => c[1] === 'update');
    expect(updates).toHaveLength(1);
    expect(updates[0][2]).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
    });
  });

  it('initAnalytics pushes no update without a stored choice', async () => {
    const { initAnalytics } = await freshAnalytics();
    initAnalytics();

    expect(consentCalls().filter((c) => c[1] === 'update')).toHaveLength(0);
  });

  it('updateConsentMode pushes the chosen signals', async () => {
    const { initAnalytics, updateConsentMode } = await freshAnalytics();
    initAnalytics();
    updateConsentMode(false, true);

    const updates = consentCalls().filter((c) => c[1] === 'update');
    expect(updates[updates.length - 1]?.[2]).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });

  it('updateConsentMode deletes _ga* cookies on revocation, keeps others', async () => {
    document.cookie = '_ga=GA1.1.123';
    document.cookie = '_ga_ABC123=GS1.1.456';
    document.cookie = 'fss_other=keep';

    const { initAnalytics, updateConsentMode } = await freshAnalytics();
    initAnalytics();
    updateConsentMode(false, false);

    expect(document.cookie).not.toContain('_ga=');
    expect(document.cookie).not.toContain('_ga_ABC123=');
    expect(document.cookie).toContain('fss_other=keep');
  });

  it('updateConsentMode does not throw before initAnalytics', async () => {
    document.cookie = '_ga=GA1.1.123';
    const { updateConsentMode } = await freshAnalytics();

    expect(() => updateConsentMode(false, false)).not.toThrow();
    expect(document.cookie).not.toContain('_ga=');
  });
});
