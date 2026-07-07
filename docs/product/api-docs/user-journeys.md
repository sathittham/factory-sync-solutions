# API Docs Publishing — User Journeys

How each actor moves through the API docs pipeline and viewer. See
[README.md](./README.md) for the design spec and [feature-spec.md](./feature-spec.md) for
the formal requirements.

> Reflects what is **built today** — all journeys below are fully shipped. End users and
> staff have **no** journey here by design (docs are superadmin-only).

---

## Table of Contents

- [Super admin — inspecting the API docs](#super-admin--inspecting-the-api-docs)
- [Backoffice staff — denied by design](#backoffice-staff--denied-by-design)
- [Developer / CI — generating and publishing docs](#developer--ci--generating-and-publishing-docs)

---

## Super admin — inspecting the API docs

A FactorySync superadmin (`backofficeRole == "superadmin"`) opens the Help page in
`web-backoffice` to verify what the deployed API actually exposes.

```mermaid
flowchart TD
    A["web-backoffice sidebar — Help item (superadmin only)"] --> B["/help/api-docs"]
    B --> C["GET /backoffice/api-docs/versions → version Select"]
    C --> D["GET /backoffice/api-docs/v1/metadata → env · apiVersion · gitSHA · generatedAt"]
    D --> E["GET /backoffice/api-docs/v1/openapi.json → data.spec → Swagger UI"]
    E --> F{"Download?"}
    F -->|"Download JSON"| G["Save swagger.json from data.spec"]
    F -->|"Download YAML"| H["GET .../openapi.yaml → data.yaml → save"]
    E -->|"fetch fails / artifact missing"| I["Localized error state (names the generation command in local dev)"]
```

**Guard(s):** `BackofficeGuard` + `SuperAdminGuard` on the route; every endpoint checks
`RequireBackofficeRole(authClient, "superadmin")` server-side. Detail in
[help-page.md](./help-page.md) and [api-docs-service.md](./api-docs-service.md).

---

## Backoffice staff — denied by design

Staff (`backofficeRole == "staff"`) are explicitly out of scope for Swagger/OpenAPI
access — there is no degraded view, only denial.

```mermaid
flowchart LR
    A["Staff signs in to web-backoffice"] --> B["Sidebar renders — no Help item"]
    A --> C["Types /help/api-docs directly"] --> D["SuperAdminGuard blocks the route"]
    A --> E["Calls /backoffice/api-docs/* directly"] --> F["403 FORBIDDEN — before any R2 read"]
```

**Guard(s):** sidebar visibility + `SuperAdminGuard` (client) and
`RequireBackofficeRole(..., "superadmin")` (server, authoritative).

---

## Developer / CI — generating and publishing docs

Developers generate locally; GitHub Actions publishes on deploy.

```mermaid
flowchart TD
    A["Developer edits handler Swagger annotations"] --> B["make docs-api → swag init"]
    B -->|"invalid annotations"| C["Generation fails — command errors"]
    B -->|ok| D["apps/backend/docs/v1/swagger.json + swagger.yaml (git-ignored)"]
    D --> E["Local backend serves from disk (no R2 env vars) → local backoffice renders"]
    D --> F["Deploy workflow (staging / production)"]
    F --> G["Upload openapi/v1/versions/{gitSHA}/ to the env's private R2 bucket"]
    G --> H["Update openapi/v1/current/"]
    G -->|"upload fails"| I["CI job fails — release not complete"]
```

**Guard(s):** CI uses dedicated API-docs R2 credentials from GitHub Actions secrets
(read/write, scoped to the target docs bucket); the backend runtime uses read-only
credentials. Detail in [docs-pipeline.md](./docs-pipeline.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
