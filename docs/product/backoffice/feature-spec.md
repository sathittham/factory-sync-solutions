---
version: 1.0.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
status: Planned
---

# Backoffice — Feature Spec

> Separate web app (`apps/fs-backoffice-web`) for FactorySync staff to manage
> the platform: CRUD projects, invite owners, manage project members, view all
> quiz results, and manage backoffice staff roles. Backed by a new route group
> `/api/v1/backoffice/` protected by the `backofficeRole` Firebase custom claim.

---

## 1. Summary

`fs-backoffice-web` is deployed to `backoffice.factorysync.com`, gated by
Cloudflare Access (email allowlist for FactorySync staff). It uses the same
Firebase project and backend API as `fs-app-web` but authenticates against
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
- Bilingual (TH/EN) via `useLocale()`.
- Consistent design with `fs-app-web` (same shadcn/ui, same Tailwind config).

### Non-Goals

- Self-service claim assignment (claims are set by superadmin only).
- Editing or deleting individual quiz submissions.
- Billing, seat limits, or subscription management.
- Audit log UI (future work).
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
│  │ ──────── │  │                                        │  │
│  │ [user name]│  │                                        │  │
│  │ [Sign Out] │  │                                        │  │
│  └────────────┘  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
* Staff menu item shown only to superadmin
```

Mobile: sidebar collapses; hamburger opens a shadcn `Sheet`.

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
| `POST` | `/backoffice/projects/{projectID}/invite-owner` | staff+ | Send owner invitation |

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

### 5.5 Dashboard stats

| Method | Path | Role | Description |
|--------|------|------|-------------|
| `GET` | `/backoffice/stats` | staff+ | Aggregate counts (projects, users, avg score, staff count) |

---

## 6. Backend Service Structure

New service: `apps/fs-backend/services/backoffice/`

```
services/backoffice/
├── handler.go    — HTTP handlers; route group /api/v1/backoffice/
├── service.go    — business logic (calls existing result, profile services)
└── models.go     — request/response types
```

Reuses existing services internally:
- `result.Service` for quiz results
- `profile.Service` for user profiles
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

See `src/lib/i18n.tsx` in `apps/fs-backoffice-web` for the full key list. Keys
follow the same `namespace.key` pattern as `fs-app-web`.

---

## 9. Security

- All `/backoffice/` backend routes sit behind `FirebaseAuth` + `RequireBackofficeRole` — unauthenticated → 401, authenticated but no claim → 403.
- Cloudflare Access adds a network-layer gate: only users on the FactorySync email allowlist can reach `backoffice.factorysync.com` at all.
- Claims are set via Firebase Admin SDK server-side only — never from a client request body.
- Destructive routes (deactivate, delete, staff management) require `"superadmin"` claim — enforced per-route with a nested `RequireBackofficeRole(authClient, "superadmin")` middleware.

---

## 10. Acceptance Criteria

- [ ] Navigating to `backoffice.factorysync.com` without a session redirects to `/sign-in`.
- [ ] Signing in with a Google account that has no `backofficeRole` claim redirects to `/unauthorized`.
- [ ] Signing in with `backofficeRole: "staff"` lands on `/dashboard`; Staff menu item is hidden.
- [ ] Signing in with `backofficeRole: "superadmin"` lands on `/dashboard`; Staff menu item is visible.
- [ ] Projects page lists all projects; search by name filters the list.
- [ ] Project Detail — Members tab shows all members with role badges.
- [ ] Project Detail — Settings tab allows updating name/industry/size (staff+).
- [ ] Deactivate project button is visible and functional for superadmin; hidden for staff.
- [ ] Users page lists all users; clicking a row opens a detail dialog.
- [ ] Delete user button visible only for superadmin.
- [ ] Results page shows all quiz results; Export CSV downloads a file.
- [ ] Staff page is accessible only to superadmin; staff role navigating to `/staff` is redirected.
- [ ] All text renders in the active locale (TH/EN).
- [ ] `tsc --noEmit` and `biome check` pass.

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
- Environment variables: same `VITE_FIREBASE_*` as `fs-app-web` (same Firebase project)

---

## 12. References

- Scaffold: [apps/fs-backoffice-web/](../../../apps/fs-backoffice-web/)
- Backend middleware: [middleware/auth.go](../../../apps/fs-backend/middleware/auth.go)
- ADR-021 (separate app): [decisions.md](../../architecture/decisions.md#adr-021)
- ADR-022 (backofficeRole claim): [decisions.md](../../architecture/decisions.md#adr-022)
- Existing admin spec: [admin/feature-spec.md](../admin/feature-spec.md)
- Project & RBAC spec: [project/feature-spec.md](../project/feature-spec.md)
