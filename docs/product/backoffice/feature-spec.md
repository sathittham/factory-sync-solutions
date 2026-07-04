---
version: 1.2.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: In Progress - scaffold + pages built; audit UI/API planned
---

# Backoffice — Feature Spec

> Separate web app (`apps/web-backoffice`) for FactorySync staff to manage
> the platform: CRUD projects, invite owners, manage project members, view all
> quiz results, manage backoffice staff roles, and let superadmins audit
> user/staff activity. Backed by a new route group `/api/v1/backoffice/`
> protected by the `backofficeRole` Firebase custom claim.

---

## 1. Summary

`web-backoffice` is deployed to `backoffice.factorysync.com`, gated by
Cloudflare Access (email allowlist for FactorySync staff). It uses the same
Firebase project and backend API as `web-app` but authenticates against
the `backofficeRole` custom claim instead of the `role` claim.

Two roles exist:

| Role | Claim value | Who |
|------|-------------|-----|
| **Super Admin** | `backofficeRole: "superadmin"` | FactorySync CTO / engineering lead |
| **Staff** | `backofficeRole: "staff"` | FactorySync support / operations |

See [ADR-021](../../architecture/decisions.md#adr-021) and
[ADR-022](../../architecture/decisions.md#adr-022) for the architecture rationale.

---

## 2. Goals & Non-Goals

### Goals

- List, create, and edit projects (company workspaces) as a FactorySync operator.
- Deactivate and reactivate projects (superadmin only).
- Invite an owner into any existing project.
- Manage project members (view, change role, remove) from a single place.
- List all users across all projects.
- Remove a user account (superadmin only).
- View all quiz results across all projects with filtering and CSV export.
- Manage backoffice staff — grant / revoke `backofficeRole` claims (superadmin only).
- Let superadmins search the platform audit log.
- Let superadmins view each user's or staff member's own activity timeline.
- Bilingual (TH/EN) via `useLocale()`.
- Consistent design with `web-app` (same shadcn/ui, same Tailwind config).

### Non-Goals

- Self-service claim assignment (claims are set by superadmin only).
- Editing or deleting individual quiz submissions.
- Billing, seat limits, or subscription management.
- SSO / SAML for backoffice login.

---

## 3. RBAC Matrix

| Capability | Super Admin | Staff |
|---|:---:|:---:|
| View all projects | ✅ | ✅ |
| Create project | ✅ | ✅ |
| Edit project (name, industry, size) | ✅ | ✅ |
| Deactivate / reactivate project | ✅ | — |
| View project members | ✅ | ✅ |
| Invite owner into project | ✅ | ✅ |
| Change project member role | ✅ | ✅ |
| Remove project member | ✅ | ✅ |
| View all users | ✅ | ✅ |
| Remove user account | ✅ | — |
| View all quiz results | ✅ | ✅ |
| Export all results (CSV) | ✅ | ✅ |
| Promote / demote `role == "admin"` claim | ✅ | — |
| View backoffice staff list | ✅ | — |
| Grant `backofficeRole` claim | ✅ | — |
| Revoke `backofficeRole` claim | ✅ | — |
| Change staff role (superadmin ↔ staff) | ✅ | — |
| View platform audit log | ✅ | — |
| View any user's activity timeline | ✅ | — |

---

## 4. UI Layout

### Global structure — sidebar

```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────┐  ┌────────────────────────────────────────┐  │
│  │ Sidebar    │  │ Page content                           │  │
│  │            │  │                                        │  │
│  │ 🏭 FactorySync│  │                                        │  │
│  │ Backoffice │  │                                        │  │
│  │ ──────── │  │                                        │  │
│  │ Dashboard  │  │                                        │  │
│  │ Projects   │  │                                        │  │
│  │ Users      │  │                                        │  │
│  │ Results    │  │                                        │  │
│  │ Staff*     │  │                                        │  │
│  │ Audit*     │  │                                        │  │
│  │ ──────── │  │                                        │  │
│  │ [user name]│  │                                        │  │
│  │ [Sign Out] │  │                                        │  │
│  └────────────┘  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
* Staff and Audit menu items shown only to superadmin
```

Mobile: sidebar collapses; hamburger opens a shadcn `Sheet`.

### UnauthorizedPage (`/unauthorized`)

Shown when `BackofficeGuard` or `SuperAdminGuard` redirects a user who lacks
the required claim. Renders a centered card with:
- A lock icon and "Access Denied" / "ไม่มีสิทธิ์เข้าถึง" heading.
- A message explaining that backoffice access requires a FactorySync account role.
- A "Back to sign-in" link (`→ /sign-in`).

This page requires **no auth** — it must be reachable without a valid session.

---

### Dashboard page (`/dashboard`)

```
┌──────────────────────────────────────────────────────────────┐
│  Dashboard                                                    │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 24       │  │ 187      │  │ 3.41     │  │ 8        │    │
│  │ Projects │  │ Users    │  │ Avg Score│  │ Staff    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                               │
│  Recent Quiz Results (last 10)                                │
│  [table: company, score, diagnosis, date]                     │
└──────────────────────────────────────────────────────────────┘
```

### Projects page (`/projects`)

```
┌──────────────────────────────────────────────────────────────┐
│  Projects                              [+ New Project]        │
│  [Search…]  [Industry ▾]  [Status ▾]                         │
├──────────────────────────────────────────────────────────────┤
│  Company Name   Reg ID         Industry  Members  Status  Act │
│  Acme Co.       0123456789012  Mfg.      5        Active  ⋯  │
│  Beta Ltd.      9876543210987  Food      2        Active  ⋯  │
└──────────────────────────────────────────────────────────────┘
```

Row action menu (⋯ dropdown): View Detail | Deactivate (superadmin only).

### Project Detail page (`/projects/:projectID`)

```
┌──────────────────────────────────────────────────────────────┐
│  ← Projects   Acme Co.   [Active badge]   [Deactivate*]      │
│                                                               │
│  [Members]  [Settings]  ← shadcn Tabs                        │
│                                                               │
│  Members tab:                                                 │
│  [+ Invite Owner]                                             │
│  Name    Email         Role       Joined     Actions          │
│  Jane D. jane@acme.co  Owner      10 มิ.ย.   [Change Role] [Remove] │
│  John S. john@acme.co  Manager    09 มิ.ย.   [Change Role] [Remove] │
│                                                               │
│  Settings tab:                                                │
│  Company Name  [______________________]                       │
│  Industry      [Select ▾]                                     │
│  Size          [Select ▾]                                     │
│                              [Save Changes]                   │
└──────────────────────────────────────────────────────────────┘
* Deactivate visible to superadmin only
```

### Users page (`/users`)

```
┌──────────────────────────────────────────────────────────────┐
│  Users                                                        │
│  [Search…]  [Project ▾]  [Role ▾]                            │
├──────────────────────────────────────────────────────────────┤
│  Name    Email          Company    Role   Joined    Actions   │
│  Jane D. jane@acme.co   Acme Co.  admin  10 มิ.ย.  [View] [Delete*] │
└──────────────────────────────────────────────────────────────┘
* Delete visible to superadmin only
```

Clicking a row or **View** opens a `Dialog` with full profile fields.
Superadmins also see **View Activity**, which opens that user's activity
timeline from `GET /backoffice/users/{uid}/activity`.

### Results page (`/results`)

```
┌──────────────────────────────────────────────────────────────┐
│  Quiz Results                           [Export CSV ↓]        │
│  [Search company…]  [Project ▾]  [Diagnosis ▾]  [Date ▾]    │
├──────────────────────────────────────────────────────────────┤
│  Company   Quiz      Score  Diagnosis     Date     ▾          │
│  Acme Co.  shindan   3.47   Established  10 มิ.ย.   (expand)  │
│  ├─ expanded: dimension scores, strengths, weaknesses         │
└──────────────────────────────────────────────────────────────┘
```

### Staff page (`/staff`) — superadmin only

```
┌──────────────────────────────────────────────────────────────┐
│  Staff Management                    [+ Add Staff]            │
├──────────────────────────────────────────────────────────────┤
│  Name      Email              Role         Since    Actions   │
│  Alice T.  alice@factorysync  superadmin   5 มิ.ย.  [Change Role] [Remove] │
│  Bob S.    bob@factorysync    staff        7 มิ.ย.  [Change Role] [Remove] │
└──────────────────────────────────────────────────────────────┘
```

"Add Staff" opens a Dialog to enter a Firebase UID or email + select role.
Each row has **View Activity** for superadmins to inspect staff account changes
and actions.

### Audit page (`/audit`) — superadmin only

```
┌──────────────────────────────────────────────────────────────┐
│  Audit Log                                                   │
│  [Event Type ▾] [Actor UID] [Target UID] [Project ID]        │
├──────────────────────────────────────────────────────────────┤
│  Time              Event                    Actor   Target   │
│  14 Jun 2026 15:30 backoffice.staff_role... alice   bob      │
│  14 Jun 2026 15:12 project.member_removed   staff1  user2    │
└──────────────────────────────────────────────────────────────┘
```

The page lists audit events newest first and supports filters for event type,
actor UID, target UID, resource type, and project ID. Metadata is rendered as a
compact key/value block in an expandable row or detail dialog.

---

## 5. Backend API — new route group `/api/v1/backoffice/`

All routes require `Authorization: Bearer {firebase-id-token}` and
`backofficeRole ∈ {"superadmin", "staff"}` (enforced by `RequireBackofficeRole`
middleware). Superadmin-only routes use an additional `RequireBackofficeRole` for
`"superadmin"` only.

### 5.1 Projects

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/projects` | staff+ | List all projects |
| `POST` | `/backoffice/projects` | staff+ | Create project |
| `GET` | `/backoffice/projects/{projectID}` | staff+ | Get project detail |
| `PUT` | `/backoffice/projects/{projectID}` | staff+ | Update project (name, industry, size) |
| `POST` | `/backoffice/projects/{projectID}/deactivate` | superadmin | Deactivate project |
| `POST` | `/backoffice/projects/{projectID}/reactivate` | superadmin | Reactivate project |
| `GET` | `/backoffice/projects/{projectID}/members` | staff+ | List project members |
| `PUT` | `/backoffice/projects/{projectID}/members/{uid}/role` | staff+ | Change member's project role |
| `DELETE` | `/backoffice/projects/{projectID}/members/{uid}` | staff+ | Remove member from project |
| `POST` | `/backoffice/projects/{projectID}/invite-owner` | staff+ | Send owner invitation — **backend spec exists; API client method not yet implemented** |

### 5.2 Users

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/users` | staff+ | List all users |
| `GET` | `/backoffice/users/{uid}` | staff+ | Get user detail |
| `DELETE` | `/backoffice/users/{uid}` | superadmin | Delete user account |
| `PUT` | `/backoffice/users/{uid}/role` | superadmin | Promote/demote `role` claim (`"admin"` / `"user"`) |

### 5.3 Results

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/results` | staff+ | List all results (with profile enrichment) |
| `GET` | `/backoffice/results/{assessmentID}` | staff+ | Get single result detail |
| `GET` | `/backoffice/export` | staff+ | CSV export of all results |

### 5.4 Staff management

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/staff` | superadmin | List all backoffice staff |
| `PUT` | `/backoffice/staff/{uid}` | superadmin | Set `backofficeRole` claim |
| `DELETE` | `/backoffice/staff/{uid}` | superadmin | Revoke `backofficeRole` claim |

### 5.5 Audit

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/audit` | superadmin | Search platform audit events |
| `GET` | `/backoffice/users/{uid}/activity` | superadmin | View actor/target events for a single user or staff member |

### 5.6 Dashboard stats

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/stats` | staff+ | Aggregate counts (projects, users, avg score, staff count) |

---

## 6. Backend Service Structure

New service: `apps/backend/services/backoffice/`

```
services/backoffice/
├── handler.go    — HTTP handlers; route group /api/v1/backoffice/
├── service.go    — business logic (calls existing result, profile services)
└── models.go     — request/response types
```

Reuses existing services internally:
- `result.Service` for quiz results
- `profile.Service` for user profiles
- `audit.Logger` / audit query service for activity events
- Firebase Admin SDK (`authClient`) for claim management

Middleware wiring in `main.go`:
```go
r.Route("/api/v1/backoffice", func(r chi.Router) {
    r.Use(middleware.FirebaseAuth(authClient))
    r.Use(middleware.RequireBackofficeRole(authClient, "superadmin", "staff"))
    backoffice.Handler.Routes(r)
})
```

---

## 7. Frontend Auth Flow

```
Firebase onAuthStateChanged
  ↓ user signed in
getIdTokenResult(forceRefresh=true)
  ↓ read claims.backofficeRole
dispatch setUser + setBackofficeRole(role)
  ↓
BackofficeGuard: isBackofficeUser?
  no → /unauthorized
  yes → render page

SuperAdminGuard: isSuperAdmin?
  no → /unauthorized
  yes → render /staff
```

---

## 8. i18n Keys (backoffice namespace)

See `src/lib/i18n.tsx` in `apps/web-backoffice` for the full key list. Keys
follow the same `namespace.key` pattern as `web-app`.

---

## 9. Security

- All `/backoffice/` backend routes sit behind `FirebaseAuth` + `RequireBackofficeRole` — unauthenticated → 401, authenticated but no claim → 403.
- Cloudflare Access adds a network-layer gate: only users on the FactorySync email allowlist can reach `backoffice.factorysync.com` at all.
- Claims are set via Firebase Admin SDK server-side only — never from a client request body.
- Destructive routes (deactivate, delete, staff management) require `"superadmin"` claim — enforced per-route with a nested `RequireBackofficeRole(authClient, "superadmin")` middleware.
- Audit routes require `"superadmin"`; regular backoffice staff must not be able
  to query platform-wide user/staff activity.
- Backoffice mutation handlers must write audit events with the actor UID from
  `middleware.GetUID(r)` and target UID from the affected user/staff record.

---

## 10. Acceptance Criteria

### Auth & navigation

- [ ] Navigating to `backoffice.factorysync.com` without a session redirects to `/sign-in`.
- [ ] Signing in with a Google account that has no `backofficeRole` claim redirects to `/unauthorized`.
- [ ] `/unauthorized` page renders the access-denied message and "Back to sign-in" link without requiring auth.
- [ ] Signing in with `backofficeRole: "staff"` lands on `/dashboard`; Staff menu item is hidden.
- [ ] Signing in with `backofficeRole: "superadmin"` lands on `/dashboard`; Staff menu item is visible.
- [ ] Sign-out clears Redux auth state and redirects to `/sign-in`.

### Dashboard

- [ ] Dashboard stat cards show correct counts: total projects, total users, average quiz score, staff count.
- [ ] Recent results table renders the last 10 quiz results with company name, score, diagnosis, and date.
- [ ] Clicking a recent result row navigates to `/results` (or expands inline detail).

### Projects page

- [ ] Projects page lists all projects with company name, reg ID, industry, member count, and status badge.
- [ ] Search input filters the visible rows by company name in real time.
- [ ] "+ New Project" button opens a create-project dialog; submitting creates the project and adds it to the list.
- [ ] Row action menu (⋯) offers "View Detail" and "Deactivate" (superadmin only).
- [ ] "Deactivate" option is hidden for staff role.

### Project Detail page

- [ ] Members tab loads and displays all project members with name, email, role badge, joined date, and action buttons.
- [ ] "Change Role" button opens a dialog with a role selector (`Select`); confirming calls `PUT /backoffice/projects/{id}/members/{uid}/role` and updates the badge in the table.
- [ ] "Remove" button opens a confirmation dialog; confirming calls `DELETE /backoffice/projects/{id}/members/{uid}` and removes the row.
- [ ] "Invite Owner" button is present; **note: `backofficeApi.inviteOwner` is not yet implemented** — this button should be disabled or hidden until the endpoint is wired.
- [ ] Settings tab pre-fills current name, industry, and size; "Save Changes" calls `PUT /backoffice/projects/{id}` and shows a success/error indicator.
- [ ] "Deactivate" button (header, superadmin only) calls the deactivate endpoint and updates the project status badge.

### Users page

- [ ] Users page lists all users; clicking a row opens a detail dialog with all profile fields.
- [ ] "Delete" button is visible only to superadmin; clicking opens a confirmation dialog before calling `DELETE /backoffice/users/{uid}`.

### Results page

- [ ] Results page lists all quiz results across all projects; filters by company name, project, diagnosis, and date range narrow the visible rows.
- [ ] Clicking a row expands inline dimension scores, strengths, and weaknesses.
- [ ] "Export CSV" downloads a `text/csv` file via `GET /backoffice/export`.

### Staff page (superadmin only)

- [ ] Staff page is only accessible to superadmin; a staff-role user navigating to `/staff` is redirected to `/unauthorized`.
- [ ] Staff list shows all backoffice staff with name, email, role badge, joined date, and action buttons.
- [ ] "+ Add Staff" button opens a dialog with a Firebase UID input and a role selector (`Select` with `staff` / `superadmin`); submitting calls `PUT /backoffice/staff/{uid}` and adds/updates the row.
- [ ] "Change Role" button opens a dialog pre-filled with the current role; confirming calls `PUT /backoffice/staff/{uid}` and updates the role badge.
- [ ] "Revoke Access" button opens a confirmation dialog; confirming calls `DELETE /backoffice/staff/{uid}` and removes the row.
- [ ] Error state (e.g. unknown UID on add) shows an inline error message in the dialog.
- [ ] "View Activity" opens the selected staff member's timeline.

### Audit page (superadmin only)

- [ ] Audit page is only accessible to superadmin; staff users are redirected to `/unauthorized`.
- [ ] Audit page calls `GET /backoffice/audit` and renders events newest first.
- [ ] Filters update query params for event type, actor UID, target UID, project ID, and resource type.
- [ ] User detail dialog exposes "View Activity" for superadmins and calls `GET /backoffice/users/{uid}/activity`.
- [ ] Backoffice staff CRUD writes `backoffice.staff_role_granted`, `backoffice.staff_role_changed`, or `backoffice.staff_role_revoked`.
- [ ] Backoffice user CRUD writes `backoffice.user_deleted` and `backoffice.user_role_changed`.
- [ ] Project/member changes made from backoffice include `projectID`, actor UID, target UID where applicable, and old/new values in metadata.

### General

- [ ] All text renders in the active locale (TH/EN) via `useLocale()`.
- [ ] `tsc --noEmit` and `biome check` pass.
- [ ] `make test-api` passes (backend `/backoffice/` route group).

---

## 11. Deployment

- Cloudflare Pages project: `factory-sync-backoffice`
- Domain: `backoffice.factorysync.com`
- Cloudflare Access policy: allow only `@factorysync.com` emails (or specific allowlist)
- Deploy commands:
  ```bash
  npm run deploy:staging   # → factory-sync-backoffice-staging (branch: staging)
  npm run deploy:prod      # → factory-sync-backoffice (branch: main)
  ```
- Environment variables: same `VITE_FIREBASE_*` as `web-app` (same Firebase project)

---

## 12. References

- Scaffold: [apps/web-backoffice/](../../../apps/web-backoffice/)
- Backend middleware: [middleware/auth.go](../../../apps/backend/middleware/auth.go)
- ADR-021 (separate app): [decisions.md](../../architecture/decisions.md#adr-021)
- ADR-022 (backofficeRole claim): [decisions.md](../../architecture/decisions.md#adr-022)
- Existing admin spec: [admin/feature-spec.md](../admin/feature-spec.md)
- Project & RBAC spec: [project/feature-spec.md](../project/feature-spec.md)
- Audit logging spec: [audit/feature-spec.md](../audit/feature-spec.md)

---

*Version: 1.2.0*
*Last updated: 3 July 2026*
