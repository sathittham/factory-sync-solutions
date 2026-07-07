# AdminPage + Tabs (web-app)

## Summary

The `/admin` page and everything on it. Lives at `apps/web-app/src/pages/AdminPage.tsx`
— the tabs and dialogs (`QuizTab`, `UsersTab`, `UserDetailDialog`, `RoleChangeDialog`,
`RoleToggleButton`) are all inline components in that file. Route access is gated by
`AdminGuard` (`apps/web-app/src/components/guards/AdminGuard.tsx`).

## Implementation

All state is local component state — no Redux. API calls go through `api.get` / `api.put`,
which attach the Firebase ID token automatically (CSV export is the exception — see below).

- `AdminPage` — page header (title, subtitle, desktop CSV export button) + shadcn `Tabs`
  with `quiz` as the default tab, hosting `<QuizTab />` and `<UsersTab />`.
- `QuizTab` — local state: `assessments`, `loading`, `industryFilter`, `sizeFilter`,
  `selectedId`, `detailLoading`, `detailData`. Fetches `GET /admin/assessments` on mount
  and on every filter change (`useEffect` dependency array). The three stat cards are
  computed from the loaded array — no extra API call. Clicking a row toggles the inline
  detail panel: if `a.scores` is already populated from a previous expand it is reused;
  otherwise `GET /admin/assessments/{id}` fetches the full detail.
- `UsersTab` — local state: `users`, `loading`, `updatingUid`, `toast`, `roleDialog`,
  `detailUser`, `roleFilter`. Fetches `GET /admin/users` once on mount; `roleFilter`
  is applied **client-side** (no re-fetch). `confirmRoleChange` calls
  `PUT /admin/users/{uid}/role`, optimistically updates the local array on success, and
  shows a success/error toast.
- `UserDetailDialog` — shadcn `Dialog` (max-w-lg), 2-col grid of all profile fields.
  Opens on any user row click; closes via ✕ or backdrop.
- `RoleChangeDialog` — shadcn `Dialog` (max-w-md) confirmation before committing a role
  change. Promote uses a violet confirm button; demote uses the default/outline variant.
  The i18n message interpolates the display name (`contactName || displayName || email`).
- `RoleToggleButton` — inline role-action button in the users table; stops event
  propagation so clicking it does not also open the detail dialog.

### CSV export bypasses the API client

The export button uses raw `fetch` (not `api.get`) to receive the binary blob, then
triggers a download named `assessments-YYYY-MM-DD.csv` via an object URL. The handler is
currently duplicated in `AdminPage` (header button) and `QuizTab` (mobile-only button) —
extraction to a shared helper is an open task.

### Known cosmetic filter

`industryFilter` / `sizeFilter` are sent as query params but the backend ignores them, so
changing them re-fetches the same unfiltered list (see [admin-api.md](./admin-api.md)).

## Usage

Route registration: `/admin` wrapped in `AdminGuard`.

```
# pseudocode — guard is convenience; the backend is authoritative
AdminGuard: role != "admin"  → redirect "/"
AdminPage:
  Tabs default "quiz" → QuizTab | UsersTab

# pseudocode — role change flow
RoleToggleButton click → roleDialog = { user, newRole }
RoleChangeDialog confirm → PUT /admin/users/{uid}/role { role: newRole }
  200   → update users[] in place · toast success · trackEvent("admin_role_change")
  error → toast error · trackEvent("admin_role_change_error")
```

Analytics events: `admin_export_csv`, `admin_export_csv_error`, `admin_role_change`,
`admin_role_change_error`. All UI text via `useLocale()` (key map in
[feature-spec.md § 10](./feature-spec.md#10-i18n-key-map-admin-namespace)); dates via
`formatDateTime()`.

## Acceptance Criteria

- Given a non-admin user, when they navigate to `/admin`, then `AdminGuard` redirects to `/`.
- Given the page loads, when assessments arrive, then the stat cards reflect the loaded array (total, average, diagnosis distribution).
- Given a collapsed row, when clicked, then the detail panel expands (fetching `GET /admin/assessments/{id}` only if scores are not cached).
- Given the Users tab, when the role filter changes, then rows narrow client-side with no network call.
- Given a confirmed role change, when the API returns 200, then the role badge updates optimistically and a success toast shows; on failure an error toast shows and the table is unchanged.
- Given the locale is switched, when any tab renders, then all text follows TH/EN via `useLocale()`.

## Status

- [x] `AdminPage.tsx` with both tabs and all dialogs — `apps/web-app/src/pages/AdminPage.tsx`
- [x] `AdminGuard` route guard — `apps/web-app/src/components/guards/AdminGuard.tsx`
- [ ] Extract shared `exportAssessmentsCsv` helper (dedupe `AdminPage` / `QuizTab`)
- [ ] Vitest coverage for stat calculations and `getScoreColor` thresholds

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
