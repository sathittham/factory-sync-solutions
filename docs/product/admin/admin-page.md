# AdminPage + Tabs (web-app)

## Summary

The `/admin` page and everything on it. Lives at `apps/web-app/src/pages/AdminPage.tsx`
— the tabs and dialogs (`QuizTab`, `UsersTab`, `UserDetailDialog`, `RoleChangeDialog`,
`InviteMemberDialog`, `PermissionsDialog`, `RoleToggleButton`) are all inline components
in that file. Route access is gated by `AdminGuard`
(`apps/web-app/src/components/guards/AdminGuard.tsx`).

## Implementation

All server state goes through **TanStack Query** (`useQuery` / `useMutation`) — not local
`useState` + `useEffect` + manual `fetch`. This matches the project-wide CR-003 standard
in `.claude/rules/react.md`. Requests go through the `api` helper (`@/lib/api`), which
attaches the Firebase ID token automatically — CSV export is the one exception (see
below).

- `AdminPage` — page header (title, subtitle, desktop CSV export button) + shadcn `Tabs`
  with `quiz` as the default tab, hosting `<QuizTab />` and `<UsersTab />`.
- `QuizTab` — local UI state: `industryFilter`, `sizeFilter`, `selectedId`. Server state:
  `useQuery(['admin-assessments', industryFilter, sizeFilter])` against
  `GET /admin/assessments[?industryType=&companySize=]` — each filter combination is
  cached independently, and the backend now actually applies both filters (no longer
  cosmetic — see [admin-api.md](./admin-api.md)). The three stat cards are computed from
  the loaded array — no extra API call. Clicking a row toggles the inline detail panel;
  a second `useQuery` (`enabled: !!selectedId && !hasInlineScores`) fetches
  `GET /admin/assessments/{id}` only when the row's `scores` aren't already cached from a
  previous expand.
- `UsersTab` — server state: `useQuery(['manage-users'])` against `GET /manage/users`
  (not `/admin/users` — the frontend now calls the `/manage/*` group exclusively). The
  query's `select` filters out `role === "admin"` / `"superadmin"` rows — those belong to
  a different administrative tier and aren't managed from this screen. Client-side UI
  state: a role filter, a name/email search box, and stat chips per role
  (owner / system_admin / manager / user counts) — all computed from the already-loaded
  array, no re-fetch. Role changes, invites, and pending-invite actions are
  `useMutation` calls that call `queryClient.invalidateQueries(['manage-users'])` on
  success rather than hand-rolled optimistic array updates:
  - `roleMutation` → `PUT /manage/users/{uid}/role`
  - `cancelInvitationMutation` → `DELETE /manage/invitations/{uid}`
  - `resendInvitationMutation` → `POST /manage/invitations/{uid}/resend`
- `UserDetailDialog` — shadcn `Dialog` (max-w-lg), 2-col grid of all profile fields.
  Opens on any registered user's row click; closes via ✕ or backdrop.
- `RoleChangeDialog` — shadcn `Dialog` (max-w-md) confirmation before committing a role
  change. Roles are `user` / `manager` / `system_admin` / `owner` (not a binary
  admin/user toggle). The i18n message interpolates the display name (`contactName ||
  displayName || email`).
- `InviteMemberDialog` — shadcn `Dialog` (max-w-sm), `@tanstack/react-form` + Zod email
  validation. Submits `POST /manage/invitations { email, role }`; maps `409` →
  "already exists", `403` → "forbidden", other `400` → server message, else a generic
  error — all via `t()`.
- `PermissionsDialog` — a static reference table (not a `DataTable` — no fetch/sort/
  filter) showing which of the four roles can view company results, manage users, invite
  members, edit roles, and view all assessments. Purely explanatory; it does not read or
  write anything.
- `RoleToggleButton` (rendered as a pencil "edit role" icon) — inline role-action button
  in the users table; stops event propagation so clicking it does not also open the
  detail dialog. For a pending invitation row, this slot instead renders **resend** and
  **cancel** icon buttons.

### Users table uses the shared `DataTable`

Both tabs render through `@tanstack/react-table` via the reusable `DataTable`
(`components/ui/data-table.tsx`) rather than hand-rolled `<tr>` markup — the users table's
contact column composes a shadcn `Avatar` (`photoURL`, falling back to the first letter of
the name/email) with a `RoleBadge` that renders a distinct "pending" style when
`user.isPending` is set.

### CSV export bypasses the API client

The export button uses raw `fetch` (not `api.get`) to receive the binary blob, then
triggers a download named `assessments-YYYY-MM-DD.csv` via an object URL. The handler is
still duplicated in `AdminPage` (header button) and `QuizTab` (mobile-only button) —
extraction to a shared helper remains an open task (see [status.md](./status.md)).

## Usage

Route registration: `/admin` wrapped in `AdminGuard`.

```
# pseudocode — guard reflects the permission model, not a bare claim check
AdminGuard: canManageUsers(profile, isAdmin) === false → redirect "/"
  canManageUsers = isAdmin
    || profile.permissions?.canManageUsers === true
    || (profile.projectRole || profile.role) ∈ {"admin","owner","system_admin"}
AdminPage:
  Tabs default "quiz" → QuizTab | UsersTab

# pseudocode — role change flow
RoleToggleButton (pencil icon) click → roleDialog = user
RoleChangeDialog confirm → roleMutation.mutate({ uid, role })
  → PUT /manage/users/{uid}/role { role }
  200   → invalidate ['manage-users'] · toast success · trackEvent("admin_role_change")
  error → toast error · trackEvent("admin_role_change_error")

# pseudocode — invite flow
"Invite Member" button → InviteMemberDialog open
submit → POST /manage/invitations { email, role }
  200 → close dialog · toast "invite sent" · invalidate ['manage-users']
         (pending row appears via GET /manage/users' invitation merge)
pending row → [Resend] → POST /manage/invitations/{uid}/resend
            → [Cancel] → DELETE /manage/invitations/{uid}
```

Analytics events: `admin_export_csv`, `admin_export_csv_error`, `admin_role_change`,
`admin_role_change_error`. All UI text via `useLocale()` (key map in
[feature-spec.md § 10](./feature-spec.md#10-i18n-key-map-admin-namespace)); dates via
`formatDateTime()`.

## Acceptance Criteria

- Given a user without user-management permission, when they navigate to `/admin`, then `AdminGuard` redirects to `/`.
- Given the page loads, when assessments arrive, then the stat cards reflect the loaded array (total, average, diagnosis distribution).
- Given a collapsed row, when clicked, then the detail panel expands (fetching `GET /admin/assessments/{id}` only if scores are not cached).
- Given the Users tab, when the industry/size filter changes on Assessments, or role filter/search changes on Users, then rows narrow — Assessments re-fetches server-side (filters are applied), Users narrows client-side with no network call.
- Given a confirmed role change, when the API returns 200, then the users query is invalidated, the table reflects the new role, and a success toast shows; on failure an error toast shows and the table is unchanged.
- Given a valid invite submission, when the API returns 200, then the invite dialog closes, a success toast shows, and a pending row appears in the users table.
- Given the locale is switched, when any tab renders, then all text follows TH/EN via `useLocale()`.

## Status

- [x] `AdminPage.tsx` with both tabs, all dialogs, and the invite flow — `apps/web-app/src/pages/AdminPage.tsx`
- [x] `AdminGuard` route guard (permission-based, not a bare claim check) — `apps/web-app/src/components/guards/AdminGuard.tsx`
- [x] Server state migrated to TanStack Query (`useQuery`/`useMutation`)
- [ ] Extract shared `exportAssessmentsCsv` helper (dedupe `AdminPage` / `QuizTab`)
- [ ] Vitest coverage for stat calculations and `getScoreColor` thresholds

---

*Version: 2.0.0*
*Last updated: 5 July 2026*
