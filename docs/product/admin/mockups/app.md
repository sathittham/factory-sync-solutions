# web-app · Admin Dashboard — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
One route (`/admin`, gated by `canManageUsers()` — admin claim or owner/system_admin/
manager permission) with two shadcn `Tabs` and four dialogs (`UserDetailDialog`,
`RoleChangeDialog`, `InviteMemberDialog`, `PermissionsDialog`). Layouts follow
[feature-spec.md § 4](../feature-spec.md#4-ui-layout).

---

## 1. `/admin` — Assessments tab (default)

### 1a. State: loaded

```
┌──────────────────────┬──────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Admin Dashboard                    EN ▾    ☼    ◍ User  │
│                       ├──────────────────────────────────────────────────────────────┤
│    Dashboard          │   Admin Dashboard                          [Export CSV ↓]    │
│    Quizzes            │   Manage users and assessments                               │
│    Results            │                                                              │
│  ▰ Admin              │   [Assessments] [Users]              ← shadcn Tabs           │
│                       │   ┌────────────┐ ┌────────────┐ ┌──────────────────────┐    │
│                       │   │ 42         │ │ 3.24       │ │ • Established: 18    │    │
│                       │   │ Total      │ │ Avg Score  │ │ • Advanced:    12    │    │
│                       │   │ Submissions│ │ /5.00      │ │ • Developing:   8    │    │
│                       │   └────────────┘ └────────────┘ │ • Beginning:    4    │    │
│                       │                                 └──────────────────────┘    │
│                       │   [Industry ▾ All]  [Size ▾ All]      [Export CSV ↓] ←mobile │
│                       │   ┌───────────┬───────────┬─────────┬───────┬─────────────┐ │
│                       │   │ ID        │ Company   │ Quiz    │ Score │ Diagnosis   │ │
│                       │   ├───────────┼───────────┼─────────┼───────┼─────────────┤ │
│                       │   │ a1b2c3d4… │ Acme Co.  │[shindan]│ 3.47  │[Established]│ │
│  ───────────────────  │   │ f7e8d9c0… │ Beta Ltd. │[factory]│ 4.12  │[Advanced]   │ │
│  ◍ Admin User…    ⇅   │   └───────────┴───────────┴─────────┴───────┴─────────────┘ │
└──────────────────────┴──────────────────────────────────────────────────────────────┘

Industry/size selects are shadcn Select. Changing either re-fetches via TanStack
Query (keyed on both filters) — the backend now applies them (see admin-api.md).
```

### 1b. State: row expanded (inline detail panel)

```
   ┌───────────┬───────────┬─────────┬───────┬─────────────┐
   │ a1b2c3d4… │ Acme Co.  │[shindan]│ 3.47  │[Established]│  ← clicked (collapse on 2nd click)
   ├───────────┴───────────┴─────────┴───────┴─────────────┤
   │  Company: Acme Co.      Industry: manufacturing        │
   │  Size: medium           Contact: Jane Doe (jane@acme…) │
   │                                                        │
   │  Dimension scores (2-col grid)                         │
   │  ┌──────────────────────┬──────────────────────┐       │
   │  │ Dimension 1     3.5  │ Dimension 2     4.0  │       │
   │  │ Dimension 3     2.8  │ …                    │       │
   │  └──────────────────────┴──────────────────────┘       │
   │  ┌── Strengths ─────────┐ ┌── Weaknesses ──────┐       │
   │  │ • …                  │ │ • …                │       │
   │  └──────────────────────┘ └────────────────────┘       │
   ├───────────┬───────────┬─────────┬───────┬─────────────┤
   │ f7e8d9c0… │ Beta Ltd. │[factory]│ 4.12  │[Advanced]   │
   └───────────┴───────────┴─────────┴───────┴─────────────┘

First expand fetches GET /admin/assessments/{id}; re-expand uses cached scores.
```

### 1c. State: empty

```
   ┌────────────────────────────────────────────────────────┐
   │                                                        │
   │                  No assessments                        │
   │          (admin.noAssessments — TH/EN)                 │
   │                                                        │
   └────────────────────────────────────────────────────────┘
```

---

## 2. `/admin` — Users tab

### 2a. State: loaded

```
   [Assessments] [Users]
   ┌────────────────────────────────────────────────────────────────────────────────┐
   │  [All] [Owner] [System Admin] [Manager] [User]   [Search…]   [Invite Member +] │
   ├───┬──────────────┬───────────────┬───────────┬───────────┬──────────┬─────────┤
   │   │ Name         │ Email(desktop)│ Company   │ Role      │Registered│         │
   ├───┼──────────────┼───────────────┼───────────┼───────────┼──────────┼─────────┤
   │ ◍ │ Jane D.      │ jane@…        │ Acme Co.  │ [Owner]   │ 10 มิ.ย. │ [✎]     │
   │ ◍ │ John S.      │ john@…        │ Beta Ltd. │ [Manager] │ 09 มิ.ย. │ [✎]     │
   │ ◍ │ Somchai P.   │ somchai@…     │ Gamma Co. │ [Pending] │ invited  │[↻] [✕]  │
   └───┴──────────────┴───────────────┴───────────┴───────────┴──────────┴─────────┘

Role chips + search narrow rows client-side (no re-fetch); "Owner"/"System Admin"
etc. are computed counts, not fixed labels. Avatar (◍) shows photoURL or initial
fallback. Row click on a *registered* row → UserDetailDialog (screen 3); the
pencil (✎) stops propagation → RoleChangeDialog (screen 4). A pending row instead
shows Resend (↻) / Cancel (✕) icon buttons — no detail dialog. Dates via
formatDateTime() — Thai locale shows Buddhist Era. The list excludes legacy
`admin`/`superadmin` role accounts (managed elsewhere).
```

---

## 3. `UserDetailDialog`

shadcn `Dialog`, max-w-lg. Opens on any user row click.

```
┌────────────────────────────────────────────────┐
│  User Detail                                ✕  │
│                                                │
│  Contact Name    Jane Doe    Role      [admin] │
│  Account Email   jane@…      Phone     0812…   │
│  Contact Email   jane@acme…  Reg. ID   01234…  │
│  Company         Acme Co.    Industry  manuf…  │
│  Size            medium      Registered 1 มิ.ย.│
│  Last Updated    10 มิ.ย.                      │
└────────────────────────────────────────────────┘
```

---

## 4. `RoleChangeDialog`

shadcn `Dialog`, max-w-md — confirmation before committing the role change
(never `window.confirm`).

### 4a. State: promote

```
┌───────────────────────────────────────────────┐
│  Promote to Admin                              │
│                                                │
│  Confirm promoting Jane Doe                    │
│                                                │
│            [Cancel]   [Promote to Admin]       │  ← violet confirm
└───────────────────────────────────────────────┘
```

### 4b. State: demote

```
┌───────────────────────────────────────────────┐
│  Demote to User                                │
│                                                │
│  Confirm demoting Jane Doe                     │
│                                                │
│            [Cancel]   [Demote to User]         │  ← outline confirm
└───────────────────────────────────────────────┘

Confirm → PUT /manage/users/{uid}/role → success toast "Role updated
successfully" / error toast "Failed to update role".
```

---

## 5. `InviteMemberDialog`

shadcn `Dialog`, max-w-sm — `@tanstack/react-form` + Zod email validation.

```
┌───────────────────────────────────────────────┐
│  Invite Member                                 │
│                                                │
│  Email     [ jane@example.com          ]       │
│  Role      [ User ▾ ]                          │
│                                                │
│            [Cancel]   [Send Invite]            │
└───────────────────────────────────────────────┘

Submit → POST /manage/invitations. 409 → "user already exists" inline error;
403 → "not permitted" inline error; 200 → dialog closes, success toast, pending
row appears in the Users table.
```

---

*Version: 2.0.0*
*Last updated: 5 July 2026*
