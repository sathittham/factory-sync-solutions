# LoginForm & /auth/action (web-app)

## Summary

Self-contained sign-in component that handles all Firebase Auth calls for `web-app`. Lives
at `apps/web-app/src/components/login-form.tsx`, rendered by `SignInPage.tsx` alongside the
`AuthPanel` branding column. Also covered here: the public `/auth/action` invitation
password setup page, which shares the sign-in visual shell.

## Implementation

### Modes

| Mode | Trigger | Firebase call |
|------|---------|---------------|
| `signin` (default) | Email + password form | `signInWithEmailAndPassword` |
| `signup` | "Sign up" link | `createUserWithEmailAndPassword` |
| `reset` | "Forgot password?" link | `sendPasswordResetEmail` |
| — | Google button (all modes) | `signInWithPopup(googleProvider)` |

- Firebase error codes map to human-readable messages (wrong password, weak password,
  email in use, …); errors render inline in the form — no navigation.
- Sign-up validates that the confirm field matches ("Passwords do not match").
- `reset` shows an in-form confirmation on success; the user completes the reset via
  Firebase's hosted action handler from the email link.
- A new email/password account has no display name (`displayName` stored as `''`); like a
  new Google user, it has no profile → `useAuth` gets a 404 on `/profile` → redirect to
  `/register`.
- Analytics: `sign_in_click` / `sign_in_success` / `sign_in_error` with
  `method ∈ {'email','email_signup','google'}` (popup-closed is not an error).
- All copy is bilingual via `useLocale()`.

### `/auth/action` — invitation password setup

Backend invitation emails link to this branded public route instead of Firebase's hosted
reset-password page. One form collects everything the invited user needs:

| Field | Validation |
|-------|------------|
| Contact name | Required, 2–100 chars |
| Contact phone | Required, 9–30 chars |
| New password | Required, min 8 chars |
| Confirm password | Must match new password |

On submit: verify the Firebase `oobCode` → set the password → sign the invited user in once
→ update the display name → `POST /api/v1/invitations/accept` with `contactName` and
`contactPhone` → sign out → show the success state. The global auth bootstrap skips
automatic empty-body invitation acceptance while the browser is on `/auth/action`, so this
form's payload is the source of truth for the new profile's contact fields.

## Usage

Call site: `apps/web-app/src/pages/SignInPage.tsx`.

```
# pseudocode — SignInPage decides what to show after loading resolves
if loading          → full-screen spinner
if !isAuthenticated → render <AuthPanel /> + <LoginForm />
if isRegistered     → navigate /results
else                → navigate /register
```

```
# pseudocode — LoginForm handles its own Firebase calls
submit(mode, fields):
  trackEvent('sign_in_click', method)
  call the Firebase function for the mode
  ok  → trackEvent('sign_in_success', method)   # useAuth takes over via onAuthStateChanged
  err → trackEvent('sign_in_error', method); show mapped message inline
```

## Acceptance Criteria

- Given the sign-in page, when a valid email + password is submitted, then the user is authenticated and redirected per profile state.
- Given "Sign up" mode, when the account is created, then the user is redirected to `/register`.
- Given "Forgot password?" mode, when a known email is submitted, then an in-form confirmation shows (no navigation).
- Given a Firebase error, when a call rejects, then a human-readable localized message renders inline.
- Given an invitation link, when opened, then `/auth/action` renders (not Firebase's hosted page) and requires all four fields before accepting.

## Status

- [x] `login-form.tsx` implemented — three modes + Google (TH + EN)
- [x] `/auth/action` invitation setup wired to `POST /api/v1/invitations/accept`
- [x] Analytics events tracked for email and Google methods

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
