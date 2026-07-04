# Authentication & Authorization — Feature Spec

**Status:** ✅ Shipped — email/password + Google Sign-In live; guards enforced in `web-app` and `web-backoffice`; backend middleware verifies every request.

---

## Table of Contents

1. [App surfaces](#app-surfaces)
2. [Summary](#summary)
3. [Goals & Non-Goals](#goals--non-goals)
4. [Current State](#current-state)
5. [Design Overview](#design-overview)
6. [Security Invariants](#security-invariants)
7. [Acceptance Criteria](#acceptance-criteria)
8. [Testing](#testing)
9. [Open Items & Future Work](#open-items--future-work)
10. [References](#references)

---

> Firebase Authentication (Google Sign-In + Email/Password) wired to the Go backend via
> verified ID tokens. The frontend never manages sessions or stores passwords — it holds a
> short-lived Firebase ID token attached as a `Bearer` header on every API call; the backend
> verifies it with the Firebase Admin SDK and takes the UID only from the verified context.
> Authorization is claim-based: `role == "admin"` gates `/admin` in `web-app`, and a separate
> `backofficeRole` claim (`staff` / `superadmin`) gates the entire `web-backoffice` app.

This README is the design index for the Authentication & Authorization feature. The formal
requirements live in the ISO 29110 SRS — see [feature-spec.md](./feature-spec.md). Each
non-trivial component is documented in a dedicated sub-document; see [References](#references).

---

## App surfaces

| web-app | web-backoffice | backend |
|:-------:|:--------------:|:-------:|
| ✅ | ✅ | ✅ |

Two apps, two auth surfaces, one Firebase project: `web-app` (email/password + Google, with
a registration step) and `web-backoffice` (Google only, no registration — staff are added by
ops). The backend middleware is shared and provider-agnostic. `web-official` is public and
has no auth surface. Per-app flows live in [user-journeys.md](./user-journeys.md).

---

## Summary

| Component | Description |
|-----------|-------------|
| **`LoginForm`** (web-app) | Self-contained form with three modes (sign-in / sign-up / reset) plus the Google popup; also covers the `/auth/action` invitation password setup — see [login-form.md](./login-form.md) |
| **Auth state** (both apps) | `authSlice` + `useAuth` bootstrap + `api.ts` token attachment; `loading` blocks guards until Firebase resolves the session — see [auth-state.md](./auth-state.md) |
| **Route guards** (both apps) | `AuthGuard` / `RegisterGuard` / `AdminGuard` in web-app; `BackofficeGuard` / `SuperAdminGuard` in web-backoffice — see [route-guards.md](./route-guards.md) |
| **Backend middleware** | `FirebaseAuth` verifies the token and injects UID/email/displayName into context; `RequireAdmin` and `RequireBackofficeRole` check custom claims — see [auth-middleware.md](./auth-middleware.md) |

---

## Goals & Non-Goals

### Goals

- Email/password + Google Sign-In via Firebase Auth.
- Password reset by email (`sendPasswordResetEmail`).
- Sign-up flow: create Firebase Auth account → redirect to `/register` for profile completion.
- Single source of auth truth: Firebase Auth + a Firestore profile document.
- Stateless backend — verify the token on every request, extract claims from it.
- Admin elevation via Firebase custom claims (set out-of-band, not by users).
- TH/EN bilingual — all UI copy goes through `useLocale()`.
- Track sign-in events via analytics.

### Non-Goals

- Social logins other than Google.
- Magic link / passwordless email sign-in.
- Persistent sessions (Firebase handles token refresh natively).
- Frontend refresh-token management (handled by the Firebase SDK).
- Self-service admin promotion (admin claims are set via Firebase Admin SDK by ops).
- Remember-me / stay-logged-in toggle (Firebase default: session persists until explicit sign-out).

---

## Current State

See [status.md](./status.md) for the per-component implementation checklist. Everything in
scope is shipped across all three surfaces.

---

## Design Overview

```mermaid
flowchart LR
  subgraph web-app / web-backoffice
    L[LoginForm / Google popup] --> FB[Firebase Auth]
    FB -->|onAuthStateChanged| H[useAuth hook → authSlice]
    H -->|Bearer ID token| A[api.ts helper]
  end
  A --> M[FirebaseAuth middleware]
  M -->|verified UID/email/name in context| S[Service handlers]
  M -->|admin routes| RA[RequireAdmin — role claim]
  M -->|backoffice routes| RB[RequireBackofficeRole — backofficeRole claim]
  S --> D[(Firestore: users/{uid} profile)]
```

Sign-in, sign-out, and redirect sequences are specified in full in
[feature-spec.md §4–§10](./feature-spec.md#4-sign-in-flow); the invitation password setup
flow (`/auth/action`) is in [feature-spec.md §4](./feature-spec.md#invitation-password-setup-authaction).

### Authorization tiers

| Tier | App | Guard | Required condition |
|------|-----|-------|--------------------|
| Authenticated | web-app | `AuthGuard` | Firebase user exists |
| Registered | web-app | `RegisterGuard` | Profile exists in Firestore |
| Admin | web-app | `AdminGuard` | Custom claim `role == "admin"` |
| Backoffice staff | web-backoffice | `BackofficeGuard` | `backofficeRole ∈ {"staff","superadmin"}` |
| Backoffice superadmin | web-backoffice | `SuperAdminGuard` | `backofficeRole == "superadmin"` |

### Data model

Auth owns no Firestore collection. Identity lives in Firebase Auth; roles live in Firebase
custom claims (`role`, `backofficeRole`), set out-of-band via the Admin SDK. The profile
document is read to derive `isRegistered` / `isAdmin`:

| Collection | Document ID | Read for | Notes |
|------------|-------------|----------|-------|
| `users` | `<userID>` | Profile existence (`isRegistered`) and `role` copy (`isAdmin`) | Owned by the [profile](../profile/feature-spec.md) feature |

### API contract

Auth is middleware, not endpoints — there is no `/api/v1/auth/…` route. The middleware
layers apply to route groups:

| Middleware | Applied to | Failure |
|------------|-----------|---------|
| `FirebaseAuth` | every protected route group | `401 UNAUTHORIZED` |
| `RequireAdmin` | `/api/v1/admin/…` (layered after `FirebaseAuth`) | `403 FORBIDDEN` |
| `RequireBackofficeRole` | `/api/v1/backoffice/…` (layered after `FirebaseAuth`) | `403 FORBIDDEN` |

The `/auth/action` invitation flow calls `POST /api/v1/invitations/accept` with
`contactName` and `contactPhone` after verifying the Firebase `oobCode` — see
[login-form.md](./login-form.md).

### Configuration

Both `web-app` and `web-backoffice` connect to the same Firebase project (identical
`VITE_FIREBASE_*` values, separate `.env` files):

| Variable | App | Required |
|----------|-----|----------|
| `VITE_FIREBASE_API_KEY` · `VITE_FIREBASE_AUTH_DOMAIN` · `VITE_FIREBASE_PROJECT_ID` · `VITE_FIREBASE_STORAGE_BUCKET` · `VITE_FIREBASE_MESSAGING_SENDER_ID` · `VITE_FIREBASE_APP_ID` | web-app, web-backoffice | Yes |
| `VITE_API_BASE_URL` | web-app, web-backoffice | No — defaults to `/api/v1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | backend | Yes — Firebase Admin SDK service account path |

Never commit any of these values — `.env*` and `firebase-sa.json` are git-ignored.

---

## Security Invariants

| Invariant | Where enforced |
|-----------|----------------|
| UID taken from `middleware.GetUID(r)`, never the request body/path | `apps/backend/middleware/auth.go` + every handler |
| Every protected request verifies the ID token via the Firebase Admin SDK | `FirebaseAuth` middleware |
| Custom claims (`role`, `backofficeRole`) are set via the Admin SDK out-of-band — never from a client request | ops task, `RequireAdmin` / `RequireBackofficeRole` re-check server-side |
| The frontend never stores passwords or manages sessions — only the auto-refreshed Firebase ID token | Firebase SDK, `api.ts` |
| Guards never flash unauthenticated content — `loading` blocks redirects until the session resolves | `AuthGuard` / `authSlice.loading` |
| A `401` from the API forces client-side `logout()` — no stale sessions | `useAuth` |

---

## Acceptance Criteria

Mirrors [feature-spec.md §14](./feature-spec.md#14-acceptance-criteria); the feature is
shipped (spec status: Done).

**Sign-in / sign-up / reset** — see [login-form.md](./login-form.md)
- [x] Clicking "Sign in with Google" opens the Google OAuth popup and signs in.
- [x] Entering a valid email + password and clicking "Sign In" authenticates the user.
- [x] Clicking "Sign up" shows the create-account form; submitting creates a Firebase Auth account and redirects to `/register`.
- [x] Clicking "Forgot password?" switches to the reset form; submitting a known email shows the confirmation message.
- [x] Firebase error codes map to human-readable messages (wrong password, weak password, email in use, etc.).
- [x] "Passwords do not match" error shows if the sign-up confirm field differs.

**Invitation password setup** — see [login-form.md](./login-form.md)
- [x] Invitation password setup links open `/auth/action`, not Firebase's default hosted reset-password page.
- [x] `/auth/action` requires contact name, contact phone, new password, and matching confirm password before accepting the invitation.

**Redirects & guards** — see [route-guards.md](./route-guards.md)
- [x] A new authenticated user with no profile is redirected to `/register`.
- [x] A returning registered user is redirected to `/results`.
- [x] On hard refresh, the app shows a loading skeleton until Firebase resolves the session — no flash of unauthenticated redirect.
- [x] An expired or invalid token causes the frontend to call `logout()` and redirect to `/`.
- [x] Clicking "Sign out" clears all Redux auth state and redirects to `/`.
- [x] A non-admin user navigating to `/admin` is redirected to `/`.
- [x] An admin user sees the admin nav link and can access `/admin`.

**Token handling & general** — see [auth-state.md](./auth-state.md)
- [x] Every API call attaches a fresh Bearer token; no raw UID is sent in the request body.
- [x] `sign_in_success` and `sign_in_error` events are tracked for both `email` and `google` methods.
- [x] All sign-in UI copy renders in the active locale (TH/EN).
- [x] `make lint-web` and `make test-web` pass.

---

## Testing

From [feature-spec.md §15](./feature-spec.md#15-testing):

| Layer | Target | Notes |
|-------|--------|-------|
| Unit (Vitest) | `authSlice` reducers | `setUser` / `setProfile` / `logout` / `setLoading`; derived booleans update correctly |
| Unit (Vitest) | `api.ts` | Bearer header attached; `ApiError` on non-2xx; `data` unwrapped |
| Integration (`handler_test.go`) | all protected handlers | 401 without `Authorization`; 403 on admin endpoints for non-admin UIDs |
| E2E (Playwright) | guard redirects | `/quiz` unauthenticated → `/`; `/admin` non-admin → `/`; hard-refresh skeleton; sign-out |

---

## Open Items & Future Work

None — the feature is shipped. The spec's non-goals (other social logins, magic links,
remember-me, self-service admin promotion) remain deliberately out of scope; changes go
through a new CR.

---

## References

### Sub-documents

| Doc | Covers |
|-----|--------|
| [feature-spec.md](./feature-spec.md) | ISO 29110 SRS — formal requirements, full flow diagrams |
| [status.md](./status.md) | Current implementation status per component |
| [user-journeys.md](./user-journeys.md) | Per-app user flows (operator · invited user · backoffice staff) |
| [login-form.md](./login-form.md) | `LoginForm` modes + `/auth/action` invitation setup (web-app) |
| [auth-state.md](./auth-state.md) | `authSlice` + `useAuth` bootstrap + `api.ts` token attachment |
| [route-guards.md](./route-guards.md) | Route trees and guards for web-app and web-backoffice |
| [auth-middleware.md](./auth-middleware.md) | Backend `FirebaseAuth` / `RequireAdmin` / `RequireBackofficeRole` |
| [mockups/app.md](./mockups/app.md) | ASCII wireframes — sign-in and `/auth/action` (web-app) |

### ISO 29110 artifacts

- Scope changes → [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md)
- New risks → [docs/iso29110/risk-register.md](../../iso29110/risk-register.md)

### Cross-references

- [User flow](../user-flow.md) — cross-cutting app navigation
- [Register](../register/feature-spec.md) — profile completion after first sign-in
- [Backoffice](../backoffice/feature-spec.md) — the staff portal gated by `backofficeRole` (see its §7)
- Backoffice sign-in wireframes: [../backoffice/mockups/backoffice.md](../backoffice/mockups/backoffice.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
