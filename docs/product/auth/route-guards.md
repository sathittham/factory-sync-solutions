# Route Guards (web-app · web-backoffice)

## Summary

Guard components that wrap route sub-trees and redirect users who don't satisfy the tier.
Live under `apps/web-app/src/components/guards/` (`AuthGuard`, `RegisterGuard`,
`AdminGuard`) and `apps/web-backoffice/src/components/guards/` (`AuthGuard`,
`BackofficeGuard`, `SuperAdminGuard`), wired in each app's `src/router.tsx`.

## Implementation

### web-app route tree

```
/                     → SignInPage        (no guard)
│
└── AuthGuard         (requires isAuthenticated)
    ├── /register     → RegisterPage
    ├── RegisterGuard (requires isRegistered)
    │   ├── /quiz     → QuizPage
    │   └── /results  → ResultPage
    └── AdminGuard    (requires isAdmin)
        └── /admin    → AdminPage

*             → NotFoundPage             (no guard)
```

| Guard | Loading state | Not satisfied | Satisfied |
|-------|--------------|---------------|-----------|
| `AuthGuard` | Shows skeleton | redirect `/` | render children |
| `RegisterGuard` | — | redirect `/register` | render children |
| `AdminGuard` | — | redirect `/` | render children |

`AuthGuard` is the only guard that handles `loading` (it owns the full-screen skeleton);
the inner guards only render after `loading` is false, so they never need one.

`SignInPage` itself redirects an already-authenticated user away from `/`:
registered → `/results`, unregistered → `/register`.

### web-backoffice guards

`BackofficeGuard` wraps the entire authenticated section; `SuperAdminGuard` wraps `/staff`
only. Both read `backofficeRole` populated from `getIdTokenResult(forceRefresh=true)`.

```
# pseudocode
BackofficeGuard:  backofficeRole ∈ {"staff","superadmin"} ? render : redirect /unauthorized
SuperAdminGuard:  backofficeRole == "superadmin"          ? render : redirect /unauthorized
```

### Key differences between the two apps

| Aspect | web-app | web-backoffice |
|--------|---------|----------------|
| Sign-in methods | Email/password + Google | Google only |
| Registration step | Required (Firestore profile) | None — staff added by ops |
| Auth claim checked | `role` | `backofficeRole` |
| Unauthenticated redirect | `/` (landing page) | `/sign-in` |
| Unauthorized redirect | `/` | `/unauthorized` |
| Backend middleware | `RequireAdmin` | `RequireBackofficeRole` |

Guards are UX, not security — the backend re-checks every claim server-side
([auth-middleware.md](./auth-middleware.md)).

## Usage

Call site: `apps/web-app/src/router.tsx` and `apps/web-backoffice/src/router.tsx` — each
guard renders an outlet for its child routes when satisfied.

## Acceptance Criteria

- Given an unauthenticated user, when navigating to any guarded route, then they are redirected to the app's sign-in entry.
- Given an authenticated-but-unregistered user, when navigating to `/quiz` or `/results`, then they are redirected to `/register`.
- Given a non-admin user, when navigating to `/admin`, then they are redirected to `/`.
- Given a signed-in user without a `backofficeRole` claim, when opening any backoffice page, then they land on `/unauthorized`.
- Given a `staff` user, when navigating to `/staff`, then they are redirected to `/unauthorized`.
- Given a hard refresh on a guarded route, when the session is still resolving, then a skeleton shows — no flash redirect.

## Status

- [x] web-app guards (`AuthGuard`, `RegisterGuard`, `AdminGuard`) + router wiring
- [x] web-backoffice guards (`AuthGuard`, `BackofficeGuard`, `SuperAdminGuard`) + router wiring
- [x] `UnauthorizedPage` deny page (web-backoffice)
- [ ] Playwright guard-redirect suite recorded in [status.md](./status.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
