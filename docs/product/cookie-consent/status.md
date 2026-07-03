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

**Consent UI shipped; enforcement specified but not baselined.** The banner, the
three-category settings modal, the `fss-*` localStorage keys, the footer re-open event
(`OPEN_SETTINGS_EVENT`), and the official → app handoff are all built and live. Staging
builds already strip the analytics IDs, so no tag loads there.

At spec time (v1.1.0, Draft, 2026-06-10) the gap was enforcement: the official site loaded
**no** analytics tag at all, the app loaded GTM/GA **unconditionally** via
`initAnalytics()`, and neither app emitted any Consent Mode signal. The spec's scope — the
`consent('default')` bootstrap, the stored-choice replay, the `updateConsentMode()` helper
with `_ga*` cookie deletion, and the GTM container — is tracked in the checklist below.

> Note (2026-07-03): the implementation appears to have landed since the spec was written —
> `Layout.astro` and `analytics.ts` now contain the consent bootstrap and
> `updateConsentMode()`, and `apps/web-official/src/lib/consent.ts` exists. The spec has
> not been re-baselined (still Draft) and no verification of the acceptance criteria is
> recorded, so the wiring items below stay unticked until the spec/AC are signed off.

No backend service — no Go coverage number to record.

---

## Build Checklist

### Already built (pre-existing, unchanged by this spec)

- [x] Consent banner + settings modal — `apps/web-official/src/components/CookieConsent.tsx` (app equivalent in `apps/web-app/src/components/CookieConsent.tsx`)
- [x] Consent state (3 categories) — `localStorage`: `fss-cookie-consent`, `fss-analytics-consent`, `fss-marketing-consent`
- [x] Re-open settings from footer — `OPEN_SETTINGS_EVENT` custom event
- [x] Cross-app handoff (official → app) — `apps/web-official/src/components/AppHandoff.tsx` + `apps/web-app/index.html` boot script
- [x] Staging IDs stripped from build — `.github/workflows/deploy-staging.yml`

### This spec's scope (Consent Mode v2 + GTM)

- [ ] Consent Mode default + GTM bootstrap in `<head>` — `apps/web-official/src/layouts/Layout.astro` (`PUBLIC_GTM_ID`)
- [ ] `updateConsentMode()` helper incl. `_ga*` cookie deletion — `apps/web-official/src/lib/consent.ts`
- [ ] Wire the helper into the existing banner/modal handlers — `CookieConsent.tsx` (no UI change)
- [ ] GTM `<noscript>` fallback after `<body>` — `Layout.astro`
- [ ] Fix `initAnalytics()` gating: defaults → replay → inject — `apps/web-app/src/lib/analytics.ts`
- [ ] `PUBLIC_GTM_ID` added to `apps/web-official/.env.example` (production only, never commit real IDs)
- [ ] GTM container configured (GA4 tag, consent overview, publish) — see [gtm-container.md](./gtm-container.md)

### Tests

- [ ] Vitest (both apps) — `updateConsentMode()` shape, `gtag`-absent path, revocation deletes `_ga*`
- [ ] Playwright (`web-app`) — banner → denied default → Accept All → granted update → persistence → handoff
- [ ] Manual — GTM Preview shows `gcs=G100` denied / `gcs=G111` granted; GA4 DebugView; TH + EN

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Server-side GTM (sGTM)
- [ ] Server-side consent record (timestamp + policy version)
- [ ] Re-prompt on policy `consentVersion` bump
- [ ] Third-party marketing vendors under GTM additional consent checks
- [ ] Playwright e2e setup for `web-official`

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [consent-mode.md](./consent-mode.md) · [gtm-container.md](./gtm-container.md)
- [Legal feature](../legal/README.md) — `/cookies` policy + `/cookie-settings` page
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
