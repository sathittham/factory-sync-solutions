# Authentication & Authorization — User Journeys

How each app's users move through auth. See [README.md](./README.md) for the design spec
and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — all journeys below are fully shipped; there are no
> roadmap steps in this feature.

---

## Table of Contents

- [Factory operator — sign in on web-app](#factory-operator--sign-in-on-web-app)
- [Invited user — password setup via /auth/action](#invited-user--password-setup-via-authaction)
- [Backoffice staff — sign in on web-backoffice](#backoffice-staff--sign-in-on-web-backoffice)
- [Any user — sign out](#any-user--sign-out)

---

## Factory operator — sign in on web-app

An operator lands on `/`; the `LoginForm` offers email/password (with sign-up and reset
sub-modes) and Google. After Firebase resolves, the profile fetch decides where they land.

```mermaid
flowchart TD
    A["/ — SignInPage"] --> B{"loading?"}
    B -->|Yes| C["Full-screen spinner"]
    B -->|No| D{"Mode / provider"}
    D -->|"Email + password"| E["signInWithEmailAndPassword"]
    D -->|"Sign up link"| F["createUserWithEmailAndPassword"]
    D -->|"Forgot password?"| G["sendPasswordResetEmail → in-form confirmation"]
    D -->|"Google button"| H["signInWithPopup"]
    E --> I{"GET /profile"}
    F --> I
    H --> I
    E -->|"Firebase error"| J["Human-readable error shown inline"]
    J --> A
    I -->|"Profile exists"| K["/results"]
    I -->|"404 — no profile"| L["/register — complete profile"]
    I -->|"401 — token rejected"| M["logout() → back to /"]
```

**Guard(s):** none on `/` itself; everything past sign-in sits behind `AuthGuard` →
`RegisterGuard` / `AdminGuard`. Detail in [login-form.md](./login-form.md) and
[route-guards.md](./route-guards.md).

---

## Invited user — password setup via /auth/action

Customer members and project owners invited by backoffice staff receive an email linking to
the branded `/auth/action` page (not Firebase's hosted reset page).

```mermaid
flowchart TD
    A["Invitation email link"] --> B["/auth/action — public page, sign-in visual shell"]
    B --> C["Form: contact name · contact phone · new password · confirm"]
    C --> D{"Fields valid?"}
    D -->|No| C
    D -->|Yes| E["Verify oobCode → set password → sign in once"]
    E --> F["Update display name"]
    F --> G["POST /api/v1/invitations/accept — contactName + contactPhone"]
    G --> H["Sign out → success state shown"]
```

**Guard(s):** the page is public (no auth); the `oobCode` from the invitation email is the
credential. The global auth bootstrap skips automatic empty-body invitation acceptance
while on `/auth/action` so this form's payload is the source of truth. Detail in
[login-form.md](./login-form.md).

---

## Backoffice staff — sign in on web-backoffice

Staff sign in with Google only; the `backofficeRole` claim decides access. Cloudflare
Access gates the domain before the app is even reached.

```mermaid
flowchart TD
    A["/sign-in — Google only"] --> B["signInWithPopup"]
    B --> C["getIdTokenResult(forceRefresh) → read backofficeRole claim"]
    C --> D{"backofficeRole?"}
    D -->|"staff"| E["/dashboard — all pages except /staff"]
    D -->|"superadmin"| F["/dashboard — all pages incl. /staff"]
    D -->|"absent / other"| G["/unauthorized — access denied card"]
    E --> H{"Navigate to /staff?"}
    H -->|Yes| G
```

**Guard(s):** `BackofficeGuard` on the whole authenticated section; `SuperAdminGuard` on
`/staff`; backend re-checks the claim via `RequireBackofficeRole`. Detail in
[route-guards.md](./route-guards.md) and [auth-middleware.md](./auth-middleware.md).

---

## Any user — sign out

```mermaid
flowchart LR
    A["Nav dropdown — Sign out"] --> B["signOut(auth)"]
    B --> C["onAuthStateChanged fires — user = null"]
    C --> D["logout() zeroes all Redux auth state"]
    D --> E["Guards redirect: web-app → / · web-backoffice → /sign-in"]
```

**Guard(s):** none — sign-out is always allowed; guards react on the next render cycle.

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
