# Backoffice — User Journeys

How FactorySync staff move through the backoffice. See [README.md](./README.md) for the
design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — scaffold + pages are live; the audit surface and the
> invite-owner client method are roadmap and shown dashed.

---

## Table of Contents

- [Backoffice staff — day-to-day operations](#backoffice-staff--day-to-day-operations)
- [Super admin — staff management and audit](#super-admin--staff-management-and-audit)
- [Unauthorized user — denied access](#unauthorized-user--denied-access)

---

## Backoffice staff — day-to-day operations

A FactorySync support/operations person (`backofficeRole: "staff"`) manages projects,
members, users, and results. The Staff and Audit menu items are hidden for this role.

```mermaid
flowchart TD
    A["Cloudflare Access — email allowlist"] --> B["/sign-in — Google popup"]
    B --> C{"backofficeRole = staff?"}
    C -->|Yes| D["/dashboard — stat cards + recent results"]
    C -->|No| U["/unauthorized"]
    D --> E["/projects — list, search, + New Project"]
    E --> F["/projects/:projectID — Members · Settings tabs"]
    F --> G["Change member role / remove member"]
    F -.->|roadmap| H["Invite Owner (client method not yet wired)"]
    D --> I["/users — list, detail dialog"]
    D --> J["/results — filters, inline detail, Export CSV"]
    D --> K["Navigate to /staff?"]
    K --> U
```

**Guard(s):** Cloudflare Access (network layer) → `BackofficeGuard`
(`backofficeRole ∈ {staff, superadmin}`) → backend `RequireBackofficeRole` on every
`/api/v1/backoffice/` call. Detail in [auth/route-guards.md](../auth/route-guards.md) and
[backoffice-service.md](./backoffice-service.md).

---

## Super admin — staff management and audit

The CTO / engineering lead (`backofficeRole: "superadmin"`) sees everything staff see, plus
destructive actions and the Staff and Audit pages.

```mermaid
flowchart TD
    A["/dashboard"] --> B["/staff — + Add Staff · Change Role · Revoke Access"]
    B --> C["PUT/DELETE /backoffice/staff/{uid} — sets backofficeRole claim"]
    A --> D["/projects/:projectID — Deactivate / Reactivate"]
    A --> E["/users — Delete user · promote/demote admin claim"]
    A -.->|roadmap| F["/audit — search platform events, filters"]
    E -.->|roadmap| G["View Activity — per-user timeline"]
    B -.->|roadmap| H["View Activity — per-staff timeline"]
    C -.->|roadmap| I["Audit events written: backoffice.staff_role_*"]
```

**Guard(s):** `SuperAdminGuard` on `/staff` (and `/audit` when built); superadmin-only
endpoints nest `RequireBackofficeRole(authClient, "superadmin")` server-side. Claims are
set via the Firebase Admin SDK only — never from a client request.

---

## Unauthorized user — denied access

Anyone signed in without a recognised `backofficeRole` claim (including regular `web-app`
users who somehow pass Cloudflare Access).

```mermaid
flowchart LR
    A["/sign-in — Google popup"] --> B{"claim absent / unrecognised"}
    B --> C["/unauthorized — Access Denied card"]
    C --> D["Back to sign-in link → /sign-in"]
```

**Guard(s):** `BackofficeGuard` redirects here; the page itself requires no auth (it must
be reachable without a valid session).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
