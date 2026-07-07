# Admin Dashboard — User Journeys

How each actor moves through the `/admin` page. See [README.md](./README.md) for the
design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — all journeys below are fully shipped. The only caveat:
> the assessments industry/size filter re-fetches but does not actually narrow results
> (backend ignores the params — see [status.md](./status.md)).

---

## Table of Contents

- [Admin — reviewing assessments](#admin--reviewing-assessments)
- [Admin — managing user roles](#admin--managing-user-roles)
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
    C -->|"first expand"| E["GET /admin/assessments/{id}"]
    E --> D
    D -->|"click again"| B
    B --> F{"Changes industry/size filter?"}
    F -->|yes| G["Re-fetch — params sent but not applied server-side (known issue)"]
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
    A["Users tab — GET /admin/users (once, on mount)"] --> B{"Action?"}
    B -->|"role filter"| C["Rows narrowed client-side — no re-fetch"]
    B -->|"click row"| D["UserDetailDialog — full profile grid"]
    B -->|"Promote / Demote button"| E["RoleChangeDialog — confirm"]
    E -->|cancel| A
    E -->|confirm| F["PUT /admin/users/{uid}/role"]
    F -->|200| G["Optimistic table update + success toast + analytics event"]
    F -->|error| H["Error toast — table unchanged"]
```

**Guard(s):** same as above — `AdminGuard` + `RequireAdmin`. The backend dual-writes the
Firestore profile and Firebase custom claims; a demoted user's existing token stays valid
up to ~1 hour. Detail in [admin-api.md](./admin-api.md).

---

## Non-admin — guard redirect

Any authenticated user without the `role == "admin"` claim who navigates to `/admin` is
bounced by the route guard; direct API calls are refused by the backend independently.

```mermaid
flowchart LR
    A["Navigate to /admin"] --> B{"role == 'admin'?"}
    B -->|no| C["AdminGuard redirects to /"]
    B -->|yes| D["AdminPage renders"]
    E["Direct API call without admin claim"] --> F["403 FORBIDDEN (401 if unauthenticated)"]
```

**Guard(s):** `AdminGuard` (client) is convenience only — `RequireAdmin` (server) is
authoritative.

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
