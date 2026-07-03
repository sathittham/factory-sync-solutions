# Status

> Tracks build progress for the Authentication & Authorization feature against
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

**Shipped end to end** (spec status: Done — email/password added; backoffice auth
documented). Both providers (email/password + Google) are live in `web-app`, including
sign-up, password reset, and the branded `/auth/action` invitation password setup.
`web-backoffice` signs in with Google only and gates every page on the `backofficeRole`
custom claim, with `/unauthorized` as the deny page. The backend verifies the Firebase ID
token on every protected request and layers `RequireAdmin` / `RequireBackofficeRole` claim
checks on the admin and backoffice route groups.

All components in the spec's current-state tables ([feature-spec.md §3](./feature-spec.md#3-current-state))
are marked ✅ Built — there is no partial or deferred work in scope. Roles are set
out-of-band via the Firebase Admin SDK; there is no self-service elevation by design.

No dedicated backend auth service — the middleware lives in `apps/backend/middleware/auth.go`,
so there is no per-service Go coverage number to record; the deny paths (401/403) are
asserted in each service's handler tests.

---

## Build Checklist

Single phase — mirrors the spec's component tables.

### `web-app`

- [x] Firebase client config — `apps/web-app/src/lib/firebase.ts`
- [x] API auth helper — `apps/web-app/src/lib/api.ts`
- [x] Auth state (Redux) — `apps/web-app/src/store/authSlice.ts`
- [x] Auth initializer hook — `apps/web-app/src/hooks/useAuth.ts`
- [x] Sign-in page — `apps/web-app/src/pages/SignInPage.tsx`
- [x] Login form (email/pw + Google + sign-up + reset) — `apps/web-app/src/components/login-form.tsx`
- [x] Auth panel (branding) — `apps/web-app/src/components/AuthPanel.tsx`
- [x] `AuthGuard` — `apps/web-app/src/components/guards/AuthGuard.tsx`
- [x] `RegisterGuard` — `apps/web-app/src/components/guards/RegisterGuard.tsx`
- [x] `AdminGuard` — `apps/web-app/src/components/guards/AdminGuard.tsx`
- [x] Router (route tree) — `apps/web-app/src/router.tsx`
- [x] Sign-out (Layout) — `apps/web-app/src/components/Layout.tsx`

### `web-backoffice`

- [x] Firebase client config — `apps/web-backoffice/src/lib/firebase.ts`
- [x] API auth helper — `apps/web-backoffice/src/lib/api.ts`
- [x] Auth state (Redux) — `apps/web-backoffice/src/store/authSlice.ts`
- [x] Auth initializer hook — `apps/web-backoffice/src/hooks/useAuth.ts`
- [x] Sign-in page (Google only) — `apps/web-backoffice/src/pages/SignInPage.tsx`
- [x] `AuthGuard` — `apps/web-backoffice/src/components/guards/AuthGuard.tsx`
- [x] `BackofficeGuard` — `apps/web-backoffice/src/components/guards/BackofficeGuard.tsx`
- [x] `SuperAdminGuard` — `apps/web-backoffice/src/components/guards/SuperAdminGuard.tsx`
- [x] `UnauthorizedPage` — `apps/web-backoffice/src/pages/UnauthorizedPage.tsx`
- [x] Router (route tree) — `apps/web-backoffice/src/router.tsx`

### Backend (shared by both apps)

- [x] `FirebaseAuth` middleware — `apps/backend/middleware/auth.go`
- [x] `RequireAdmin` middleware — `apps/backend/middleware/auth.go`
- [x] `RequireBackofficeRole` middleware — `apps/backend/middleware/auth.go`
- [x] Context extractors (`GetUID`, `GetEmail`, `GetDisplayName`) — `apps/backend/middleware/auth.go`

### Tests

Intended coverage per [feature-spec.md §15](./feature-spec.md#15-testing). The spec does
not record which suites have landed — verify with `make test-web` / `make test-api` and
tick as confirmed.

- [ ] Vitest — `authSlice` reducers and derived booleans
- [ ] Vitest — `api.ts` Bearer attachment / `ApiError` / envelope unwrap
- [ ] `handler_test.go` — 401 without token on all protected handlers; 403 on admin endpoints
- [ ] Playwright — guard redirects, hard-refresh skeleton, sign-out

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [login-form.md](./login-form.md) · [auth-state.md](./auth-state.md) · [route-guards.md](./route-guards.md) · [auth-middleware.md](./auth-middleware.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
