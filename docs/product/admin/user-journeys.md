# Admin Dashboard — User Journeys

How each actor moves through the `/admin` page. See [README.md](./README.md) for the
design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today**. The assessments industry/size filter is now applied
> server-side (in-memory, post-enrichment) — no longer cosmetic. See
> [status.md](./status.md) for what changed since the original ship date.

---

## Table of Contents

- [Admin — reviewing assessments](#admin--reviewing-assessments)
- [Admin — managing user roles](#admin--managing-user-roles)
- [Admin — inviting a member](#admin--inviting-a-member)
- [Non-admin — guard redirect](#non-admin--guard-redirect)

---

## Admin — reviewing assessments

An admin lands on `/admin` (Assessments tab is the default), scans the stat cards, drills
into a submission's dimension detail, and exports everything as CSV.

```mermaid
flowchart TD
    A["/admin — Assessments tab (default)"] --> B["GET /admin/assessments → stat cards + table"]
    B --> C{"Clicks a row?"}
    C -->|"scores already cached"| D["Inline detail panel from cache"]
    C -->|"first expand"| E["GET /admin/assessments/{id} (direct Firestore Get)"]
    E --> D
    D -->|"click again"| B
    B --> F{"Changes industry/size filter?"}
    F -->|yes| G["Re-fetch — server applies both filters"]
    G --> B
    B --> H["Clicks Export CSV"]
    H --> I["GET /admin/export → assessments-YYYY-MM-DD.csv download"]
```

**Guard(s):** `AdminGuard` on the route; every API call requires a Bearer token with the
`role == "admin"` custom claim (`FirebaseAuth` + `RequireAdmin`). Detail in
[admin-page.md](./admin-page.md) and [admin-api.md](./admin-api.md).

---

## Admin — managing user roles

An admin switches to the Users tab, inspects a profile, and promotes or demotes a user
through a confirmation dialog.

```mermaid
flowchart TD
    A["Users tab — GET /manage/users (registered + pending)"] --> B{"Action?"}
    B -->|"role filter / search"| C["Rows narrowed client-side — no re-fetch"]
    B -->|"click registered row"| D["UserDetailDialog — full profile grid"]
    B -->|"edit-role action"| E["RoleChangeDialog — confirm (user/manager/system_admin/owner)"]
    E -->|cancel| A
    E -->|confirm| F["PUT /manage/users/{uid}/role"]
    F -->|200| G["Invalidate users query + success toast + analytics event"]
    F -->|error| H["Error toast — table unchanged"]
```

**Guard(s):** same as above — `AdminGuard` + backend `RequireFirestoreRole` on
`/manage/*` (owner / system_admin / admin). The backend dual-writes Firebase custom
claims first, then the Firestore profile. Detail in [admin-api.md](./admin-api.md).

---

## Admin — inviting a member

An admin invites a new user by email, the invitee receives a password-setup email, and
the pending invite is visible (and manageable) in the Users tab until accepted.

```mermaid
flowchart TD
    A["Users tab — Invite Member button"] --> B["InviteMemberDialog: email + role"]
    B -->|submit| C["POST /manage/invitations"]
    C -->|"200"| D["Pending row appears · email sent (notifSvc.SendInvitation)"]
    C -->|"409 email already registered"| E["Inline form error"]
    D --> F{"Invitee action?"}
    F -->|"clicks emailed link, sets password, signs in"| G["POST /invitations/accept (authenticated, no role check)"]
    G --> H["Firestore profile created · invitation doc deleted · pending row disappears"]
    D --> I{"Admin action on pending row?"}
    I -->|Resend| J["POST /manage/invitations/{uid}/resend — new 24h expiry"]
    I -->|Cancel| K["DELETE /manage/invitations/{uid} — Firebase user + invitation doc removed"]
```

**Guard(s):** `/manage/invitations*` requires `RequireFirestoreRole` (owner /
system_admin / admin); `/invitations/accept` requires only a valid Firebase token — the
invitee has no profile or role yet when they accept. Detail in
[admin-api.md](./admin-api.md).

---

## Non-admin — guard redirect

Any authenticated user without user-management permission who navigates to `/admin` is
bounced by the route guard; direct API calls are refused by the backend independently.

```mermaid
flowchart LR
    A["Navigate to /admin"] --> B{"canManageUsers(profile, isAdmin)?"}
    B -->|no| C["AdminGuard redirects to /"]
    B -->|yes| D["AdminPage renders"]
    E["Direct API call without required claim/role"] --> F["403 FORBIDDEN (401 if unauthenticated)"]
```

**Guard(s):** `AdminGuard` (client) is convenience only — `RequireAdmin` /
`RequireFirestoreRole` (server) is authoritative.

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 2.0.0*
*Last updated: 5 July 2026*
