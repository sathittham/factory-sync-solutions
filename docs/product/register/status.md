# Status

> Tracks build progress for the Company Registration feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Related Documents](#related-documents)

---

## Current State

**Shipped end to end.** The one-time onboarding form at `/register` is live: a signed-in
user with no profile is routed here, fills company + contact details, accepts Terms +
Privacy, passes Turnstile (when configured) and lands on `/quiz` with the profile in Redux.
Both assistive features are live — the DBD lookup auto-fills company name and estimated
size from the 13-digit registration ID, and the duplicate-ID pre-check shows a blue notice
and pre-fills the form when the ID was already used by another user. Every successful
sign-up fires a Slack notification to #registrations.

Turnstile is configuration-gated: when `VITE_CF_TURNSTILE_SITE_KEY` is absent the widget is
skipped and the form submits with a placeholder token — deliberate behaviour for local dev,
not a gap.

Consent content (policies, `LegalModal`) is owned by the [legal](../legal/status.md)
feature; this feature owns only the gating checkbox and the `consentVersion`/`consentAt`
pass-through.

---

## Build Checklist

Single phase — the feature shipped as one unit. Mirrors
[feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] Registration page — `apps/web-app/src/pages/RegisterPage.tsx`
- [x] Form schema (Zod) — `RegisterPage.tsx` (`schema` const)
- [x] DBD lookup — `GET /api/v1/dbd/:regId` via `handleDbdLookup`
- [x] Duplicate-ID check — `GET /api/v1/profile/check/:regId`
- [x] Backend handler — `apps/backend/services/profile/handler.go`
- [x] Backend service — `apps/backend/services/profile/service.go`
- [x] Profile model — `apps/backend/services/profile/models.go`
- [x] Slack notification — `NotifyRegistration()` via `NotificationService`
- [x] Turnstile widget — `apps/web-app/src/components/Turnstile.tsx`
- [x] Legal modals — `apps/web-app/src/components/LegalModal.tsx` (owned by [legal](../legal/README.md))
- [x] Auth panel (right column) — `apps/web-app/src/components/AuthPanel.tsx`
- [x] Analytics events — `registration_submit` · `registration_success` · `registration_error`
- [x] Route guard — redirects `/register` → `/quiz` when `isRegistered`

### Tests

Per [feature-spec.md § 14](./feature-spec.md#14-testing):

- [x] Unit (Vitest) — `estimateCompanySize` boundaries; Zod schema valid/invalid payloads
- [x] Integration (`handler_test.go`) — 201 / 409 / 400 / Turnstile-failure paths
- [x] E2E (Playwright) — happy path, DBD prefill, validation, already-registered guard
- [x] `make lint-web` and `make test-web` pass

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [registration-form.md](./registration-form.md) · [dbd-lookup.md](./dbd-lookup.md) · [turnstile-widget.md](./turnstile-widget.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
