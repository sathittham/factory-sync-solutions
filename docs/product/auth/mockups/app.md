# web-app · Authentication — ASCII Mockups

Surface: `web-app` (React). Design system: shadcn/ui · Tailwind.
The auth screens render outside the authenticated app shell: a two-column layout with the
`AuthPanel` branding on one side and the `LoginForm` on the other. `/auth/action` reuses
the same shell. Backoffice sign-in wireframes live in
[../../backoffice/mockups/backoffice.md](../../backoffice/mockups/backoffice.md).

---

## 1. `/` — SignInPage

### 1a. State: loading (session resolving)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                            ◌  Loading…                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Full-screen spinner until onAuthStateChanged resolves — prevents a
flash-of-unauthenticated redirect on hard refresh.
```

### 1b. State: signed out — `signin` mode (default)

```
┌───────────────────────────────┬──────────────────────────────────┐
│                               │   Sign in                EN ▾    │
│   ◉ FactorySync               │                                  │
│                               │   Email     [________________]   │
│   Factory Health Check        │   Password  [________________]   │
│   <branding / AuthPanel>      │                                  │
│                               │            [ Sign In ]           │
│                               │   ── or ─────────────────────    │
│                               │      [ G  Sign in with Google ]  │
│                               │                                  │
│                               │   Forgot password?  ·  Sign up   │
└───────────────────────────────┴──────────────────────────────────┘
```

### 1c. State: `signup` mode

```
   ┌──────────────────────────────────┐
   │   Create account                 │
   │                                  │
   │   Email      [________________]  │
   │   Password   [________________]  │
   │   Confirm    [________________]  │
   │   ⚠ Passwords do not match       │  ← shown only when confirm differs
   │                                  │
   │            [ Sign Up ]           │
   │   Already have an account? Sign in│
   └──────────────────────────────────┘

Submit → Firebase account created → redirect /register.
```

### 1d. State: `reset` mode — confirmation shown

```
   ┌──────────────────────────────────┐
   │   Reset password                 │
   │                                  │
   │   Email      [________________]  │
   │                                  │
   │   ✓ Reset link sent — check      │
   │     your inbox                   │
   │                                  │
   │            [ Send link ]         │
   │   Back to sign in                │
   └──────────────────────────────────┘
```

### 1e. State: sign-in error (inline, no navigation)

```
   ┌──────────────────────────────────┐
   │   Sign in                        │
   │   ⚠ Incorrect email or password  │  ← Firebase code mapped to
   │                                  │    a localized message
   │   Email     [________________]   │
   │   Password  [________________]   │
   │            [ Sign In ]           │
   └──────────────────────────────────┘
```

---

## 2. `/auth/action` — Invitation password setup

Public page (no auth); the `oobCode` from the invitation email is the credential.

### 2a. State: default form

```
┌───────────────────────────────┬──────────────────────────────────┐
│                               │   Set up your account     EN ▾   │
│   ◉ FactorySync               │                                  │
│                               │   Contact name   [____________]  │
│   <branding / AuthPanel>      │   Contact phone  [____________]  │
│                               │   New password   [____________]  │
│                               │   Confirm        [____________]  │
│                               │                                  │
│                               │        [ Set password ]          │
└───────────────────────────────┴──────────────────────────────────┘

Validation: name 2–100 chars · phone 9–30 chars · password ≥ 8 chars ·
confirm must match. Submit → verify oobCode → set password → accept
invitation → sign out → success (2b).
```

### 2b. State: success

```
   ┌──────────────────────────────────┐
   │   ✓ Account ready                │
   │                                  │
   │   Your password is set. Sign in  │
   │   to get started.                │
   │                                  │
   │          [ Go to sign in ]       │
   └──────────────────────────────────┘
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
