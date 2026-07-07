# Status

> Tracks build progress for the User Profile feature against
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

**Shipped and active, with two known gaps.** Both editing surfaces are live:
`ProfileDialog` is mounted in `Layout` and opened from three nav triggers (desktop
dropdown, mobile drawer user row, mobile "Profile" link), and `ProfilePage` is routed at
`/profile` with account, profile, notification, activity, and security tabs. The backend
`UpdateProfile` and `GetActivity` handlers are built; saves do a selective field update,
dispatch `setProfile` to Redux, and show a 3-second success banner.

Two gaps are tracked as open work, not partial implementation claims: the Activity tab
still formats timestamps with raw `toLocaleString()` instead of `formatDateTime()` from
`@/lib/dayjs`, and the `emailNotifications` field is persisted by the backend but has no
toggle in either form UI. `ProfileDialog` and `ProfilePage` also duplicate their Zod
schema and submit logic — extraction to a shared hook/component is pending.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as each suite lands.

---

## Build Checklist

Single phase — mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] `ProfileDialog` — `apps/web-app/src/components/ProfileDialog.tsx` (mounted in `Layout`)
- [x] `ProfilePage` — `apps/web-app/src/pages/ProfilePage.tsx` (routed at `/profile`)
- [x] Backend `UpdateProfile` handler — `apps/backend/services/profile/handler.go`
- [x] Backend `GetActivity` handler — `apps/backend/services/profile/handler.go`
- [x] `UpdateProfileRequest` model — `apps/backend/services/profile/models.go`
- [x] Profile Activity tab — `apps/web-app/src/pages/ProfilePage.tsx`
- [ ] Activity tab date-formatting cleanup — `formatDateTime()` instead of raw `toLocaleString()`
- [x] `emailNotifications` field in backend model — `UpdateProfileRequest` + `Profile` struct
- [ ] `emailNotifications` toggle in the form UI (shadcn `Switch`)

### Tests

- [ ] Vitest `ProfileDialog` suite — pre-fill, re-open reset, button states, `setProfile` dispatch, error path
- [ ] `services/profile/service_test.go` — `ErrProfileNotFound`, immutable fields untouched, `updatedAt` refreshed
- [ ] Playwright E2E — save flow, disabled pristine submit, 500 error, Activity loading/empty/localized states

Coverage recorded:

- [ ] `go test ./services/profile/... -cover` → **n/a — not yet recorded**

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Activity tab cleanup — `formatDateTime()`, consistent icons, loading/empty/error tests
- [ ] Expose `emailNotifications` in the UI
- [ ] De-duplicate form logic into `useProfileForm` hook or `<ProfileForm>` component

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [profile-dialog.md](./profile-dialog.md) · [profile-page.md](./profile-page.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
