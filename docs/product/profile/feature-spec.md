---
version: 1.0.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done — ProfileDialog active, ProfilePage unrouted
---

# User Profile — Feature Spec

> Authenticated users can update their company and contact information after
> registration. Two editing surfaces exist: a **`ProfileDialog`** (the active
> path — opened from the nav) and a **`ProfilePage`** (built but not yet routed).
> Both call `PUT /api/v1/profile` and update Redux on success.

---

## 1. Summary

The profile feature lets registered users keep their company and contact
information up to date. Registration captures these fields once; the profile
editor allows changing them at any time without re-registering.

Two surfaces exist for the same action:

| Surface | File | Access | Status |
|---------|------|--------|--------|
| `ProfileDialog` | `apps/fs-app-web/src/components/ProfileDialog.tsx` | Nav dropdown / mobile drawer | ✅ Active — mounted in `Layout` |
| `ProfilePage` | `apps/fs-app-web/src/pages/ProfilePage.tsx` | No route | ⚠️ Built — not in `router.tsx` |

`ProfileDialog` is the current editing surface. It is opened by the user's
avatar/name in the nav header or by the "Profile" link in the mobile drawer.
`ProfilePage` contains identical form logic in a standalone page layout and is
ready to be routed at `/profile` when needed.

**Immutable fields** (set at registration — never editable via this feature):
`companyRegId`, `uid`, `email`, `displayName`, `role`, `consentVersion`, `consentAt`.

---

## 2. Goals & Non-Goals

### Goals

- Allow updating: company name, industry type, company size, contact name,
  contact email, contact phone.
- Pre-fill the form with the user's current profile from Redux.
- Submit button disabled until the form has unsaved changes (`isDirty`).
- Display a 3-second success banner on save; show an inline error message on failure.
- Update Redux `authSlice` (`setProfile`) immediately on success — no page
  reload needed for the nav to reflect the new company name.
- Track `profile_save`, `profile_save_success`, `profile_save_error` via analytics.
- Bilingual (TH/EN) via `useLocale()`.

### Non-Goals

- Changing the company registration ID — immutable after registration.
- Changing the Google account (email, display name, avatar) — managed by Google.
- Managing email notification preferences — `emailNotifications` field exists in
  the backend model but is not exposed in the form UI (future work, see §10).
- Deleting the account or profile.
- Profile picture upload (Google avatar is shown read-only).

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| `ProfileDialog` | `apps/fs-app-web/src/components/ProfileDialog.tsx` | ✅ Built + mounted in Layout |
| `ProfilePage` | `apps/fs-app-web/src/pages/ProfilePage.tsx` | ✅ Built — ❌ no route |
| Backend `UpdateProfile` handler | `apps/fs-backend/services/profile/handler.go` | ✅ Built |
| `UpdateProfileRequest` model | `apps/fs-backend/services/profile/models.go` | ✅ Built |
| `emailNotifications` field | `UpdateProfileRequest` + `Profile` struct | ✅ Backend — ❌ not in form UI |

---

## 4. UI Layout

### `ProfileDialog` (three-section modal)

```
┌─────────────────────────────────────────────────────────────┐
│  Update Profile                                             │
│  Edit your company and contact information                  │
├─────────────────────────────────────────────────────────────┤
│  ─── ACCOUNT ────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [Avatar]  Display Name                   [Google]   │    │
│  │           email@example.com                         │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  Registration ID    0123456789012                    │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ─── CONTACT PERSON ─────────────────────────────────────── │
│  [Contact Name input]                                       │
│  [Contact Email input]   [Contact Phone input]              │
├─────────────────────────────────────────────────────────────┤
│  ─── COMPANY PROFILE ────────────────────────────────────── │
│  [Company Name input]                                       │
│  [Industry Type ▾]       [Company Size ▾]                   │
├─────────────────────────────────────────────────────────────┤
│  [✓ Saved successfully!]  ←  3 s success banner             │
│  [Save Changes]           ←  disabled if no changes         │
└─────────────────────────────────────────────────────────────┘
```

Max width: `max-w-lg`. Max height: `max-h-[90vh]` with `overflow-y-auto`.

### `ProfilePage` (standalone card)

```
┌──────────────────────────────────────────────────────────────┐
│  [icon]  Update Profile                                      │
│          Edit your company and contact information           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Email       email@example.com                        │    │
│  │ ─────────────────────────────────────────────────   │    │
│  │ Reg. ID     0123456789012                            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [Company Name input]                                        │
│  [Industry Type ▾]    [Company Size ▾]                       │
│                                                              │
│  ─── Contact ────────────────────────────────────────────   │
│  [Contact Name input]                                        │
│  [Contact Email input]  [Contact Phone input]                │
│                                                              │
│  [✓ Saved!]  / [Error message]                               │
│  [Save Changes]  ← disabled if no changes                    │
└──────────────────────────────────────────────────────────────┘
```

Max width: `max-w-lg`, vertically centred in the viewport.

---

## 5. Form Fields

| Field | Input type | Zod rule | Backend rule |
|-------|-----------|----------|--------------|
| `companyName` | `text` | `min(1)` | `omitempty,min=2,max=200` |
| `industryType` | `SelectField` | `min(1)` | `omitempty` |
| `companySize` | `SelectField` | `min(1)` | `omitempty,oneof=small medium large` |
| `contactName` | `text` | `min(1)` | `omitempty,min=2,max=100` |
| `contactEmail` | `email` | `email()` | `omitempty,email` |
| `contactPhone` | `text` | `min(9)` | `omitempty` |

Validation is `omitempty` on the backend — any field can be omitted individually.
The frontend sends all six fields; it doesn't do partial sends.

`industryType` options: `manufacturing`, `food`, `automotive`, `electronics`,
`textile`, `chemical`, `construction`, `agriculture`, `logistics`, `energy`,
`pharma`, `plastics`, `printing`, `metal`, `wood`, `other`.

`companySize` options: `small`, `medium`, `large`.

---

## 6. Open / Close Trigger (`ProfileDialog`)

`ProfileDialog` is mounted once, permanently, at the bottom of `Layout`. It
receives `open` / `onOpenChange` props. Three triggers exist in the nav:

| Trigger | Context | Analytics event |
|---------|---------|-----------------|
| User avatar / name button in desktop nav dropdown | `NavDesktop` component | `profile_open { source: 'desktop_dropdown' }` |
| User summary row in mobile drawer | `NavMobile` component | `profile_open { source: 'mobile_drawer' }` |
| "Profile" nav link in mobile drawer | `NavMobile` component | `profile_open { source: 'mobile_nav' }` |

Opening the dialog resets the form to the **latest profile in Redux** (via
`useEffect([open, profile, reset])`). This ensures that if another device/tab
updated the profile, the dialog doesn't show stale data when re-opened.

---

## 7. Submit Flow

```mermaid
sequenceDiagram
    participant U as User
    participant PD as ProfileDialog / ProfilePage
    participant API as Go API
    participant ST as Redux (authSlice)

    U->>PD: edits fields → form becomes dirty
    U->>PD: clicks "Save Changes"
    PD->>PD: Zod validates all fields
    alt validation fails
        PD->>U: inline field errors
    else validation passes
        PD->>PD: trackEvent('profile_save', { industry, size })
        PD->>API: PUT /api/v1/profile  { companyName, industryType, … }
        API->>API: pkg.Validate.Struct(req)
        API->>API: service.UpdateProfile(ctx, uid, &req)
        API-->>PD: 200  ProfileResponse
        PD->>ST: dispatch(setProfile(updated))
        PD->>PD: setSuccess(true)
        PD->>PD: trackEvent('profile_save_success', { industry, size })
        PD->>PD: setTimeout → setSuccess(false) after 3 s
    end

    alt API error
        PD->>PD: setError(err.message)
        PD->>PD: trackEvent('profile_save_error', { error })
    end
```

---

## 8. Backend API

### PUT `/api/v1/profile`

Update mutable fields on the authenticated user's profile.

**Auth:** Firebase ID token (Bearer). UID is extracted from context — never from
the request body.

**Request body**

```jsonc
{
  "companyName": "Acme Co.",
  "industryType": "manufacturing",
  "companySize": "medium",
  "contactName": "Jane Doe",
  "contactEmail": "jane@acme.com",
  "contactPhone": "0812345678"
}
```

All fields are optional (`omitempty`). Fields not present in the body are not
modified in Firestore (the service does a selective field update, not a full
document replace).

**Response — 200** (`ProfileResponse`)
```jsonc
{
  "success": true,
  "data": {
    "uid": "firebase-uid",
    "email": "jane@gmail.com",
    "displayName": "Jane Doe",
    "companyName": "Acme Co.",
    "companyRegId": "0123456789012",
    "industryType": "manufacturing",
    "companySize": "medium",
    "contactName": "Jane Doe",
    "contactEmail": "jane@acme.com",
    "contactPhone": "0812345678",
    "role": "user",
    "consentVersion": "1.0",
    "emailNotifications": false,
    "createdAt": "2026-06-01T08:00:00Z"
  }
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Body parse failure or field validation error |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `NOT_FOUND` | Profile does not exist for this UID (`ErrProfileNotFound`) |
| 500 | `INTERNAL_ERROR` | Firestore write failed |

---

### GET `/api/v1/profile`

Return the current user's profile. Used by `useAuth` on sign-in to populate
Redux. Not called by the profile editor directly (Redux already holds the data).

**Response — 200:** same `ProfileResponse` shape as above.

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 404 | `NOT_FOUND` | Profile not found — triggers `RegisterGuard` redirect |

---

### GET `/api/v1/profile/check/{regId}`

Check whether a 13-digit company registration ID is already registered. Used
exclusively by `RegisterPage` during the DBD lookup step. Not used by the
profile editor.

---

## 9. Firestore Document (`users/{uid}`)

| Field | Type | Mutable via editor |
|-------|------|-------------------|
| `uid` | string | ❌ |
| `email` | string | ❌ |
| `displayName` | string | ❌ |
| `companyName` | string | ✅ |
| `companyRegId` | string | ❌ |
| `industryType` | string | ✅ |
| `companySize` | string | ✅ |
| `contactName` | string | ✅ |
| `contactEmail` | string | ✅ |
| `contactPhone` | string | ✅ |
| `role` | string | ❌ (admin-only via `SetUserRole`) |
| `consentVersion` | string | ❌ |
| `consentAt` | string | ❌ |
| `emailNotifications` | bool | ✅ (backend only — not in form yet) |
| `createdAt` | string | ❌ |
| `updatedAt` | string | ✅ (set by service on every update) |

---

## 10. Open Tasks

### 10.1 Route `ProfilePage`

`ProfilePage` is a fully functional standalone edit form but has no entry in
`router.tsx`. If a dedicated settings page is preferred over the modal pattern,
add `{ path: "profile", element: <ProfilePage /> }` inside the `RegisterGuard`
children.

### 10.2 Expose `emailNotifications` in the UI

`UpdateProfileRequest` already accepts `emailNotifications *bool` and the
backend persists it. Neither `ProfileDialog` nor `ProfilePage` renders a toggle
for it. Add a checkbox or toggle (shadcn `Switch`) to let users opt in/out of
email notifications without contacting support.

### 10.3 De-duplicate form logic

`ProfileDialog` and `ProfilePage` share identical Zod schema, `industryKeys`,
`sizeKeys`, and `onSubmit` logic. Extract to a shared
`useProfileForm(profile, onSuccess)` hook or a `<ProfileForm>` component to
avoid drift.

---

## 11. Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `profile_open` | Dialog opened from nav | `{ source: 'desktop_dropdown' \| 'mobile_drawer' \| 'mobile_nav' }` |
| `profile_save` | Form submitted (before API call) | `{ industry, size }` |
| `profile_save_success` | API returns 200 | `{ industry, size }` |
| `profile_save_error` | API call fails | `{ error: string }` |

> `ProfilePage` does **not** track analytics events — only `ProfileDialog` has
> `trackEvent` calls.

---

## 12. i18n Key Map

| Key | TH (approx.) | EN |
|-----|-------------|----|
| `profile.title` | อัปเดตโปรไฟล์ | Update Profile |
| `profile.subtitle` | แก้ไขข้อมูลบริษัทและผู้ติดต่อ | Edit your company and contact information |
| `profile.email` | อีเมล | Email |
| `profile.regId` | เลขนิติบุคคล | Registration ID |
| `profile.userSection` | บัญชีผู้ใช้ | Account |
| `profile.contactSection` | ผู้ติดต่อ | Contact Person |
| `profile.companySection` | ข้อมูลบริษัท | Company Profile |
| `profile.save` | บันทึกการเปลี่ยนแปลง | Save Changes |
| `profile.saving` | กำลังบันทึก… | Saving… |
| `profile.saved` | บันทึกสำเร็จแล้ว | Saved successfully! |
| `profile.error` | เกิดข้อผิดพลาด กรุณาลองใหม่ | An error occurred, please try again |

---

## 13. Acceptance Criteria

- [ ] Opening `ProfileDialog` pre-fills all fields with the current Redux profile data.
- [ ] Re-opening the dialog after external changes resets the form to the latest Redux data.
- [ ] The "Save Changes" button is disabled when the form has no unsaved changes.
- [ ] Changing any field enables the button.
- [ ] Submitting the form calls `PUT /api/v1/profile` and dispatches `setProfile` on success.
- [ ] A 3-second success banner appears after a successful save.
- [ ] The nav immediately reflects the updated company name / contact name after save.
- [ ] An inline error message appears when the API returns a non-2xx response.
- [ ] The registration ID and email fields are read-only and not included in the PUT body.
- [ ] Closing the dialog via X, backdrop, or Escape discards unsaved changes without an API call.
- [ ] All copy renders in the active locale (TH/EN).
- [ ] `make lint-web` and `make test-api` pass.

---

## 14. Testing

- **Unit (Vitest — ProfileDialog):**
  - Opening with a profile pre-fills defaultValues correctly.
  - Re-opening resets form to the latest profile (useEffect `[open, profile, reset]` dependency).
  - `isSubmitting` disables the button; `!isDirty` disables the button when form is pristine.
  - `onSubmit` dispatches `setProfile` on 200 and sets `success: true`.
  - `onSubmit` sets `error` on `ApiError`.
- **Integration (service_test.go):**
  - `UpdateProfile` returns `ErrProfileNotFound` for a UID with no profile document.
  - `UpdateProfile` does not overwrite `companyRegId` or `role` when they are absent from the request.
  - `UpdateProfile` sets `updatedAt` to a new ISO timestamp.
- **E2E (Playwright):**
  - Open dialog from nav → assert `data-testid="profile-dialog"` visible.
  - Change company name → click save → assert success banner visible and nav company name updated.
  - Submit without changes → assert button is `disabled`.
  - API returns 500 → assert error message visible.

---

## 15. References

- Profile dialog: [ProfileDialog.tsx](../../../apps/fs-app-web/src/components/ProfileDialog.tsx)
- Profile page: [ProfilePage.tsx](../../../apps/fs-app-web/src/pages/ProfilePage.tsx)
- Backend handler: [handler.go](../../../apps/fs-backend/services/profile/handler.go)
- Profile models: [models.go](../../../apps/fs-backend/services/profile/models.go)
- Auth slice (`setProfile`): [authSlice.ts](../../../apps/fs-app-web/src/store/authSlice.ts)
- Layout (dialog mount + triggers): [Layout.tsx](../../../apps/fs-app-web/src/components/Layout.tsx)
- Register feature (initial profile creation): [register/feature-spec.md](../register/feature-spec.md)
- Auth feature (`GetProfile` on sign-in): [auth/feature-spec.md](../auth/feature-spec.md)
- Backoffice user/profile management (FactorySync staff view of all profiles): [backoffice/feature-spec.md §4](../backoffice/feature-spec.md)
