# Status

> Tracks build progress for the Legal Documents feature against
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

**Shipped end to end.** All four PDPA-aligned policies (Terms, Privacy, Cookie, Marketing)
render bilingually (TH/EN) in both surfaces: the `LegalModal` dialog inside the `web-app`
registration flow, and five standalone routes on `web-official` (`/terms`, `/privacy`,
`/cookies`, `/marketing`, `/cookie-settings`). Consent gating is live — registration cannot
be submitted without accepting Terms + Privacy, marketing consent is opt-in, and
`consentVersion` + `consentAt` are persisted with every new Firestore profile.

Known deliberate gaps (tracked as future work, not partial implementation): registration-time
`marketingConsent` is not persisted to the profile (cookie-consent handles it client-side),
there is no server-side consent audit trail, and no automatic re-consent on version bump.

No dedicated backend service — no Go coverage number to record. Consent gating is covered by
the register feature's tests; `make lint-web` passes for both apps.

---

## Build Checklist

Single phase — the feature shipped as one unit.

- [x] `LegalModal` dialog — `apps/web-app/src/components/LegalModal.tsx`
- [x] `LegalContent` island — `apps/web-official/src/components/legal/LegalContent.tsx`
- [x] `/terms` page — `apps/web-official/src/pages/terms.astro`
- [x] `/privacy` page — `apps/web-official/src/pages/privacy.astro`
- [x] `/cookies` page — `apps/web-official/src/pages/cookies.astro`
- [x] `/marketing` page — `apps/web-official/src/pages/marketing.astro`
- [x] `/cookie-settings` page — `apps/web-official/src/pages/cookie-settings.astro`
- [x] Consent checkboxes in registration — `apps/web-app/src/pages/RegisterPage.tsx`
- [x] `consentVersion` + `consentAt` stored in Firestore — `apps/backend/services/profile/service.go`
- [x] Contact address active — `info@factorysyncsolutions.com`

### Tests

- [x] Consent gating (Zod `z.literal(true)`) — covered by register feature tests
- [x] `make lint-web` passes for `web-app` and `web-official`

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Re-consent prompt on `consentVersion` bump
- [ ] Server-side consent audit trail (timestamped grant/withdrawal records)
- [ ] Sync registration-time `marketingConsent` to the Firestore profile
- [ ] Token-based one-click unsubscribe endpoint for marketing emails
- [ ] `/cookies` + `/marketing` footer links on `web-app`

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [legal-modal.md](./legal-modal.md) · [legal-content.md](./legal-content.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
