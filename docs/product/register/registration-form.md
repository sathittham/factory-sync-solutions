# Registration Form (web-app)

## Summary

Single-page onboarding form at `/register` that collects company, contact and consent data
and creates the user's Firestore profile. Lives at
`apps/web-app/src/pages/RegisterPage.tsx` (form + Zod `schema` const + route guard), with
the `AuthPanel` brand/sign-out column at `apps/web-app/src/components/AuthPanel.tsx`.

## Implementation

- `RegisterPage()` — renders the guard, the form card (form left, `AuthPanel` right — the
  right column is hidden below the `md` breakpoint), the Turnstile widget and the submit
  button. On success it dispatches `setProfile(profile)` and navigates to `/quiz`.
- Zod schema (client-side; the backend re-validates):
  - `companyRegId` — required, exactly 13 digits (`/^\d{13}$/`)
  - `companyName` — required, min 1 char
  - `industryType` — required, one of 16 enum values ([feature-spec.md § 4.1](./feature-spec.md#41-industry-type-values))
  - `companySize` — required, `small` / `medium` / `large`
  - `contactName` — required, min 1 char
  - `contactEmail` — required, valid email — pre-filled from Firebase and **disabled**
  - `contactPhone` — required, min 9 chars
  - `acceptTerms` — must be `true` (blocking); `marketingConsent` — optional boolean
- All labels/errors resolve i18n keys under `register.*` via `useLocale()` (TH/EN).

### Route guard

Applied synchronously before any form renders: unauthenticated → `/`; registered → `/quiz`
(→ `/results` when `hasCompletedQuiz`). State comes from the Redux `auth` slice.

### Error states

| Scenario | UX |
|----------|----|
| Invalid reg ID format | Red helper text under the field |
| Turnstile token missing | Inline red banner: "กรุณายืนยัน captcha" |
| API 409 (already registered) | Inline red banner with server message |
| API 5xx | Inline red banner: generic `register.error` i18n string |
| DBD lookup fails | Silent — user fills fields manually |
| Reg ID used by another user | Blue notice, form pre-filled; registration still proceeds |

### Analytics events

| Event | Trigger | Properties |
|-------|---------|------------|
| `registration_submit` | Form submit starts | `industry`, `size` |
| `registration_success` | 201 response received | `industry`, `size` |
| `registration_error` | API error or Turnstile fail | `error` (message string) |

## Usage

Call chain on submit (backend contract in
[feature-spec.md § 8](./feature-spec.md#8-backend-api)):

```
# pseudocode — submit flow
validate(form) via Zod              → inline errors, stop
require turnstileToken              → red banner, stop   (only if site key set)
POST /api/v1/profile {form fields, turnstileToken, consentVersion}
  201 → dispatch(setProfile(data)); navigate('/quiz'); track registration_success
  400 CAPTCHA_FAILED / VALIDATION_ERROR → banner; track registration_error
  409 CONFLICT (ErrAlreadyRegistered)   → banner with server message
```

Consent links inside the checkbox labels open the `LegalModal` — owned by the
[legal](../legal/legal-modal.md) feature; this form only owns the gating checkbox.

## Acceptance Criteria

- Given an unauthenticated visitor, when they navigate to `/register`, then they are redirected to `/`.
- Given a registered user, when they navigate to `/register`, then they are redirected to `/quiz` (or `/results` if the quiz is done).
- Given an empty form, when submitted, then every required field shows a validation error and no request is sent.
- Given `acceptTerms` unchecked, when submitted, then the form is blocked.
- Given a valid form + token, when submitted, then the profile is created (201), Redux gets `setProfile`, and the user lands on `/quiz`.
- Given a duplicate UID, when submitted, then the API responds `409` and a red banner shows the server message.

## Status

- [x] `RegisterPage.tsx` implemented (form + Zod schema + route guard)
- [x] `AuthPanel.tsx` right column (hidden on mobile)
- [x] Analytics events wired (`registration_submit` / `_success` / `_error`)
- [x] Tests — Zod schema unit tests (Vitest); `handler_test.go` integration; Playwright E2E

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
