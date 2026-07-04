# Status

> Tracks build progress for the Cookie Consent & Analytics feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Future Work](#future-work)
- [Related Documents](#related-documents)

---

## Current State

**Consent UI shipped; enforcement code built but not yet verified.** The banner, the
three-category settings modal, the `fss-*` localStorage keys, the footer re-open event
(`OPEN_SETTINGS_EVENT`), and the official → app handoff are all built and live. Staging
builds already strip the analytics IDs, so no tag loads there.

At spec time (v1.1.0, Draft, 2026-06-10) the gap was enforcement: the official site loaded
**no** analytics tag at all, the app loaded GTM/GA **unconditionally** via
`initAnalytics()`, and neither app emitted any Consent Mode signal. The spec's scope — the
`consent('default')` bootstrap, the stored-choice replay, the `updateConsentMode()` helper
with `_ga*` cookie deletion, and the GTM container — is tracked in the checklist below.

> Note (2026-07-04, doc-vs-code review): the implementation has landed since the spec was
> written. Verified present in code: the `Layout.astro` consent bootstrap + `<noscript>`
> fallback, `apps/web-official/src/lib/consent.ts`, the gated `initAnalytics()` +
> `updateConsentMode()` in `analytics.ts`, handler wiring in both `CookieConsent.tsx`
> files, and `PUBLIC_GTM_ID` in `.env.example`. The Vitest suites exist and pass (official
> 8/8, app 6/6) and `apps/web-app/e2e/cookie-consent.spec.ts` covers the documented e2e
> assertions. Code items below are ticked as **built**; the spec stays Draft until the
> acceptance criteria are manually verified (GTM Preview / GA4 DebugView) and the GTM
> container is provisioned — those two items remain open.
>
> Second-pass review (2026-07-04) additionally found and fixed: the official footer's
> "Cookie Settings" entry never dispatched `OPEN_SETTINGS_EVENT` (no withdrawal path —
> see the corrected item below), and the official confirm button read "Save Settings"
> while the AC say "Confirm My Selection" (i18n aligned to the app's label).

No backend service — no Go coverage number to record.

---

## Build Checklist

### Already built (pre-existing, unchanged by this spec)

- [x] Consent banner + settings modal — `apps/web-official/src/components/CookieConsent.tsx` (app equivalent in `apps/web-app/src/components/CookieConsent.tsx`)
- [x] Consent state (3 categories) — `localStorage`: `fss-cookie-consent`, `fss-analytics-consent`, `fss-marketing-consent`
- [x] Re-open settings from footer — `OPEN_SETTINGS_EVENT` custom event. Correction (2026-07-04): the listener existed but nothing dispatched the event on `web-official` — the footer linked only to the static `/cookie-settings` guidance page, so the official site had **no in-site withdrawal path** after first choice. Fixed: the footer "Cookie Settings" link now dispatches the event (`chrome.tsx`); `web-app`'s footer opens the settings dialog directly and was never affected.
- [x] Cross-app handoff (official → app) — `apps/web-official/src/components/AppHandoff.tsx` + `apps/web-app/index.html` boot script
- [x] Staging IDs stripped from build — `.github/workflows/deploy-staging.yml`

### This spec's scope (Consent Mode v2 + GTM)

- [x] Consent Mode default + GTM bootstrap in `<head>` — `apps/web-official/src/layouts/Layout.astro` (`PUBLIC_GTM_ID`)
- [x] `updateConsentMode()` helper incl. `_ga*` cookie deletion — `apps/web-official/src/lib/consent.ts`
- [x] Wire the helper into the existing banner/modal handlers — `CookieConsent.tsx` (no UI change)
- [x] GTM `<noscript>` fallback after `<body>` — `Layout.astro`
- [x] Fix `initAnalytics()` gating: defaults → replay → inject — `apps/web-app/src/lib/analytics.ts`
- [x] `PUBLIC_GTM_ID` added to `apps/web-official/.env.example` (production only, never commit real IDs)
- [ ] GTM container configured (GA4 tag, consent overview, publish) — see [gtm-container.md](./gtm-container.md)

### Tests

- [x] Vitest (both apps) — `updateConsentMode()` shape, `gtag`-absent path, revocation deletes `_ga*`
- [x] Playwright (`web-app`) — banner → denied default → Accept All → granted update → persistence → handoff — `e2e/cookie-consent.spec.ts`
- [ ] Manual — GTM Preview shows `gcs=G100` denied / `gcs=G111` granted; GA4 DebugView; TH + EN

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Server-side GTM (sGTM)
- [ ] Server-side consent record (timestamp + policy version)
- [ ] Re-prompt on policy `consentVersion` bump
- [ ] Third-party marketing vendors under GTM additional consent checks
- [ ] Cookie-consent Playwright spec for `web-official` (the Playwright setup itself exists — smoke/landing/navigation already run against staging in CI)

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [consent-mode.md](./consent-mode.md) · [gtm-container.md](./gtm-container.md)
- [Legal feature](../legal/README.md) — `/cookies` policy + `/cookie-settings` page
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.2*
*Last updated: 4 July 2026*
