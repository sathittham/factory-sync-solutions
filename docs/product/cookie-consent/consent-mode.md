# Consent Mode Bootstrap & `updateConsentMode()`

## Summary

The Consent Mode v2 wiring on both web surfaces: an inline bootstrap that sets denied
defaults and loads GTM (`apps/web-official/src/layouts/Layout.astro` head script for the
official site; the top of `initAnalytics()` in `apps/web-app/src/lib/analytics.ts` for the
app), plus an `updateConsentMode()` helper (`apps/web-official/src/lib/consent.ts` and an
export from the app's `analytics.ts`) called from the existing `CookieConsent.tsx` handlers.

## Implementation

### Bootstrap (runs before the tag, in order)

```
# pseudocode — must run BEFORE the GTM/gtag script is appended
1. gtag('consent', 'default', {
     ad_storage / ad_user_data / ad_personalization / analytics_storage: denied,
     functionality_storage / security_storage: granted,
     wait_for_update: 500 })
2. if localStorage has fss-cookie-consent:            # replay a prior choice
     gtag('consent', 'update', {
       analytics_storage: fss-analytics-consent == "true" ? granted : denied,
       ad_* signals:      fss-marketing-consent == "true" ? granted : denied })
3. append the GTM container script (id from env)
```

- Official site: an `is:inline` script at the top of `<head>` in `Layout.astro`, before the
  theme script, plus a `<noscript>` GTM iframe fallback right after `<body>`. The script
  always renders — the consent defaults and stored-choice replay run in every environment —
  but the GTM injection (step 3) is skipped when `PUBLIC_GTM_ID` is unset, so staging
  builds load no tag. The `<noscript>` fallback renders only when the ID is set.
- App: the same three steps as the first actions of `initAnalytics()`. The inline boot
  script in `index.html` that seeds `localStorage` from the handoff query params runs
  before the app bundle, so it precedes the `initAnalytics()` call in `main.tsx` and
  seeded consent is replayed correctly.
- `wait_for_update: 500` only matters for the replay path; on a true first visit, hits
  after 500 ms go out as denied cookieless pings — expected advanced-mode behaviour.

### `updateConsentMode(analytics, marketing)`

```
# pseudocode — called from the existing banner/modal handlers, no UI change
if window.gtag exists:
  gtag('consent', 'update', {
    analytics_storage: analytics ? granted : denied,
    ad_storage / ad_user_data / ad_personalization: marketing ? granted : denied })
if !analytics:
  delete _ga and _ga_* cookies        # expire against each ancestor domain (eTLD+1)
```

### Cookie deletion on revocation (non-obvious)

A Consent Mode `update` to `denied` only stops **future** cookie writes — existing `_ga` /
`_ga_*` cookies would persist until expiry (~13 months). PDPA withdrawal should remove them
actively, so the helper expires them against every ancestor domain (GA sets them on the
eTLD+1). The deletion path must run even when `gtag` is absent.

## Configuration

| Env var | App | Description |
|---------|-----|-------------|
| `PUBLIC_GTM_ID` | web-official | GTM container ID (`GTM-XXXXXXX`); production only — staging omits it |
| `VITE_GTM_ID` | web-app | Already referenced by `analytics.ts` |
| `VITE_GA_MEASUREMENT_ID` | web-app | Legacy GA4-direct fallback — `deploy-production.yml` injects it from repo vars if set; leave the var empty so GTM is the only loader |

Never commit real IDs.

## Usage

Call sites: `handleAcceptAll` and `handleConfirm` in each app's `CookieConsent.tsx`
(immediately after the existing `saveConsent(...)`), and the withdrawal path from the
footer settings modal.

```
# pseudocode
handleAcceptAll: saveConsent(true, true);              updateConsentMode(true, true)
handleConfirm:   saveConsent(analytics, marketing);    updateConsentMode(analytics, marketing)
withdraw:        saveConsent(false, false);            updateConsentMode(false, false)   # deletes _ga*
```

## Acceptance Criteria

- Given a first visit, when the page loads, then the denied `consent default` is pushed before the GTM script is appended (no granted hit, no `_ga*` cookie).
- Given a stored choice, when the page loads, then the `update` replays it before GA4's first call — no denied first hit and no banner.
- Given Accept All, when clicked, then GA4 dispatches a granted hit on the same page without navigation.
- Given withdrawal, when confirmed, then all gated signals return to `denied` and existing `_ga` / `_ga_*` cookies are deleted and do not reappear.
- Given a staging build, when loaded, then no GTM/GA request is made (ID absent).

## Status

- [x] Head bootstrap + `<noscript>` fallback — `apps/web-official/src/layouts/Layout.astro`
- [x] `updateConsentMode()` helper — `apps/web-official/src/lib/consent.ts`
- [x] `initAnalytics()` gating fix + exported helper — `apps/web-app/src/lib/analytics.ts`
- [x] Handler wiring in both `CookieConsent.tsx` files
- [x] Vitest suites (both apps) — helper shape, `gtag`-absent path, revocation deletion

See the note in [status.md](./status.md): the code has landed and unit tests pass, but the
acceptance criteria are not yet manually verified (GTM Preview / GA4 DebugView).

---

*Version: 1.0.1*
*Last updated: 4 July 2026*
