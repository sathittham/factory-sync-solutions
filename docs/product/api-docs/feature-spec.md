---
version: 0.2.1
lastUpdated: 2026-06-14
author: Sathittham Sangthong
status: Implemented
---

# API Docs Publishing - Feature Spec

Generate versioned backend Swagger/OpenAPI documents from Go annotations, publish the generated artifacts to Cloudflare R2 during CI/CD, and make them readable from `web-backoffice` as a superadmin-only Help page.

---

## 1. Summary

FactorySync has Swagger annotations in `apps/backend`, generated v1 artifacts under `apps/backend/docs/v1/`, CI publishing to Cloudflare R2, and a superadmin-only API Docs page in `web-backoffice`.

This feature defines the controlled documentation pipeline:

1. Generate `swagger.json` and `swagger.yaml` from `apps/backend`.
2. Upload API-versioned, git-versioned, and environment-current copies to a private R2 bucket.
3. Add superadmin-only backoffice API endpoints that read the published spec from R2.
4. Add a Help / API Docs page in `apps/web-backoffice` that renders Swagger UI and offers JSON/YAML downloads.

The backoffice app becomes the single superadmin-facing place to inspect current and historical API behavior without exposing operational documentation publicly.

---

## 2. Goals & Non-Goals

### Goals

- Generate Swagger/OpenAPI docs from source annotations using `swaggo/swag`.
- Publish generated docs to Cloudflare R2 for `staging` and `production`.
- Support API documentation versioning, starting with `v1` and allowing future versions such as `v2`.
- Keep the published docs superadmin-only by serving them through authenticated `/api/v1/backoffice/` endpoints guarded by `SuperAdminGuard` on the frontend and `RequireBackofficeRole(..., "superadmin")` on the backend.
- Show API docs in `web-backoffice` under a superadmin-only Help route.
- Show doc metadata: environment, API version, OpenAPI version, generated time, source commit SHA, and download links.
- Ensure CI fails when docs cannot be generated or uploaded.
- Keep generated files out of normal source review unless a future decision explicitly commits them.

### Non-Goals

- Public Swagger UI for customers.
- Editing OpenAPI documents by hand.
- Generating SDK clients from the OpenAPI document.
- Replacing existing Markdown API docs in `docs/api/`.
- Public or staff-level access to API docs.
- Adding R2 credentials to frontend apps.

---

## 3. Current State

| Area | Current behavior |
|---|---|
| Backend annotations | `apps/backend/main.go` and handlers contain Swagger comments. |
| Swagger generation | Active. `swaggo/swag` is in `go.mod`; `make docs-api` runs `scripts/generate-api-docs.sh`. |
| Backend route | Non-production environments serve Swagger UI at `/api/v1/swagger/*`. |
| Backoffice UI | `/help/api-docs` renders Swagger UI for superadmins. |
| R2 | Backend deploy workflows publish API docs to a dedicated private R2 bucket/prefix. |

---

## 4. User Classes

| User Class | Access | Needs |
|---|---|---|
| Backoffice Staff | `backofficeRole: "staff"` | No access to Swagger/OpenAPI docs. |
| Super Admin | `backofficeRole: "superadmin"` | View current and historical API docs and verify deploy artifacts. |
| Developer | GitHub Actions / local CLI | Generate and publish docs during release flow. |
| End User | None | No access. |

---

## 5. Proposed Architecture

### 5.1 Artifact Flow

```text
Go source annotations
  -> swag init
  -> apps/backend/docs/{apiVersion}/swagger.json
  -> apps/backend/docs/{apiVersion}/swagger.yaml
  -> CI upload to R2 under openapi/{apiVersion}/...
  -> /api/v1/backoffice/api-docs/{apiVersion}/* reads from R2
  -> web-backoffice Help / API Docs renders selected API version in Swagger UI
```

### 5.2 R2 Storage Layout

Use the dedicated private API documentation buckets:

| Environment | R2 bucket |
|---|---|
| Staging | `apidoc-factorysyncsolutions-com-staging` |
| Production | `apidoc-factorysyncsolutions-com` |

```text
r2://apidoc-factorysyncsolutions-com-staging/
└── openapi/
    └── v1/
        ├── current/metadata.json
        ├── current/swagger.json
        ├── current/swagger.yaml
        └── versions/{gitSHA}/
            ├── metadata.json
            ├── swagger.json
            └── swagger.yaml

r2://apidoc-factorysyncsolutions-com/
└── openapi/
    └── v1/
        ├── current/metadata.json
        ├── current/swagger.json
        ├── current/swagger.yaml
        └── versions/{gitSHA}/
            ├── metadata.json
            ├── swagger.json
            └── swagger.yaml
```

Rules:

- Buckets must not enable public `r2.dev` access.
- Buckets must not be exposed through a public custom domain.
- Frontend apps never receive R2 credentials.
- The backend reads objects using server-side credentials only.
- `apiVersion` must match the routed API version (`v1`, future `v2`, etc.).
- CI writes `openapi/{apiVersion}/versions/{gitSHA}/...` first, then updates `openapi/{apiVersion}/current/...` after successful upload.

### 5.3 Backend Serving Model

Backoffice should not fetch directly from R2. The backend provides superadmin-only endpoints:

- `GET /api/v1/backoffice/api-docs/versions`
- `GET /api/v1/backoffice/api-docs/{apiVersion}/metadata`
- `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.json`
- `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.yaml`

These endpoints still use the standard response helpers. The JSON endpoint returns the OpenAPI document inside `data.spec`; the backoffice UI unwraps that object and passes it to Swagger UI. The YAML endpoint returns the YAML text inside `data.yaml` for the download button. This keeps authorization in the existing Firebase custom-claim model and avoids exposing signed R2 URLs in browser history or logs.

---

## 6. Functional Requirements

### FR-001 - Generate Swagger Artifacts

The system shall generate `swagger.json` and `swagger.yaml` from `apps/backend` source annotations for each supported API version.

Acceptance criteria:

- Running the docs generation command from repo root creates both JSON and YAML artifacts.
- Generation uses `apps/backend/main.go` as the entry point.
- Generated artifacts include all routed `/api/v1` services.
- Generated artifacts declare the API version they document, starting with `apiVersion: "v1"`.
- Generation fails the command when annotations are invalid.

### FR-002 - Publish Artifacts to R2

The CI pipeline shall upload generated artifacts to the environment-specific R2 bucket.

Acceptance criteria:

- Staging deploy uploads to the staging docs bucket.
- Production deploy uploads to the production docs bucket.
- Each deploy writes `openapi/{apiVersion}/versions/{gitSHA}/metadata.json`, `swagger.json`, and `swagger.yaml`.
- Each deploy updates `openapi/{apiVersion}/current/metadata.json`, `swagger.json`, and `swagger.yaml`.
- Upload failure fails the CI job before the release is considered complete.

### FR-003 - Store Artifact Metadata

The pipeline shall publish metadata alongside the Swagger/OpenAPI files.

Required metadata:

| Field | Type | Description |
|---|---|---|
| `environment` | string | `staging` or `production` |
| `apiVersion` | string | API version documented by this artifact, e.g. `v1` |
| `gitSHA` | string | Source commit used to generate docs |
| `generatedAt` | string | ISO 8601 UTC timestamp |
| `openapiVersion` | string | Version from generated spec; v1 uses Swagger/OpenAPI `2.0` from `swaggo/swag` |
| `jsonKey` | string | R2 object key for JSON |
| `yamlKey` | string | R2 object key for YAML |

Acceptance criteria:

- `GET /api/v1/backoffice/api-docs/{apiVersion}/metadata` returns the metadata through `pkg.RespondJSON`.
- Backoffice UI displays `environment`, `apiVersion`, short `gitSHA`, and `generatedAt`.
- Dates in the UI use `formatDateTime()` from `@/lib/dayjs`.

### FR-004 - Backoffice API Endpoints

The backend shall expose superadmin-only API docs endpoints under `/api/v1/backoffice/api-docs`.

Acceptance criteria:

- Endpoints require Firebase Auth.
- Endpoints require `backofficeRole` of `superadmin`.
- Staff users with `backofficeRole: "staff"` receive 403 and trigger no R2 read.
- API version path parameters are validated against the supported version list. Unsupported versions return 404 or validation error through `pkg.RespondError`.
- Handlers use `pkg.RespondJSON` / `pkg.RespondError`; raw JSON writes are not used.
- R2 read failures are wrapped with `fmt.Errorf("context: %w", err)`.
- Missing docs return a domain sentinel error, for example `ErrAPIDocsNotFound`, mapped to 404.
- Unauthorized users cannot infer R2 bucket names or object keys from errors.

### FR-005 - Backoffice Help Page

`web-backoffice` shall add a Help / API Docs page for superadmins only.

Acceptance criteria:

- Route: `/help/api-docs`.
- Route is nested under `SuperAdminGuard`.
- Sidebar includes the Help item only for superadmins.
- Staff users cannot see the Help item and cannot open the route directly.
- All visible text uses `useLocale()`.
- UI uses shadcn/ui components only.
- API version is selected with a shadcn `Select`, not a native `<select>`.
- Page renders Swagger UI from the authenticated JSON endpoint.
- Page includes Download JSON and Download YAML buttons.
- Page has loading, empty, and error states.
- Page remains usable at 320px width.

### FR-006 - Local Development Workflow

Developers shall be able to generate and view docs locally without R2.

Acceptance criteria:

- A local command generates OpenAPI files into `apps/backend/docs/`.
- Local backend can serve generated docs from disk when R2 env vars are absent.
- Local backoffice can render docs against the local backend.
- Local mode supports the same API version path shape, e.g. `apps/backend/docs/v1/swagger.json`.
- Missing local artifacts show a clear backoffice error with the generation command.

### FR-007 - Documentation Links

Project docs shall point readers to the source-of-truth setup and product behavior.

Acceptance criteria:

- [docs/api/swagger.md](../../api/swagger.md) documents the active generation and publishing workflow.
- [docs/operations/env-variables.md](../../operations/env-variables.md) documents R2 docs variables.
- [docs/operations/deployment.md](../../operations/deployment.md) documents the CI upload step.

---

## 7. Interface Requirements

### 7.1 Backend API

All endpoints in this section are guarded by Firebase Auth and `RequireBackofficeRole(authClient, "superadmin")`.

#### `GET /api/v1/backoffice/api-docs/versions`

Returns API documentation versions available in the current environment.

Response `200`:

```json
{
  "success": true,
  "data": {
    "versions": [
      {
        "apiVersion": "v1",
        "label": "API v1",
        "isCurrent": true
      }
    ]
  }
}
```

#### `GET /api/v1/backoffice/api-docs/{apiVersion}/metadata`

Response `200`:

```json
{
  "success": true,
  "data": {
    "environment": "staging",
    "apiVersion": "v1",
    "gitSHA": "abc123def456",
    "generatedAt": "2026-06-14T08:00:00Z",
    "openapiVersion": "2.0",
    "jsonKey": "openapi/v1/current/swagger.json",
    "yamlKey": "openapi/v1/current/swagger.yaml"
  }
}
```

#### `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.json`

Response `200`:

```json
{
  "success": true,
  "data": {
    "spec": {
      "swagger": "2.0",
      "info": {
        "title": "FactorySync Solutions API",
        "version": "v1"
      }
    }
  }
}
```

Errors:

- `404`: docs artifact missing.
- `500`: R2 or filesystem read error.

The frontend passes `data.spec` to Swagger UI rather than asking Swagger UI to fetch this URL directly.

#### `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.yaml`

Response `200`:

```json
{
  "success": true,
  "data": {
    "yaml": "swagger: \"2.0\"\ninfo:\n  title: FactorySync Solutions API\n  version: v1\n"
  }
}
```

Errors:

- `404`: docs artifact missing.
- `500`: R2 or filesystem read error.

### 7.2 Frontend Route

| Route | Guard | Description |
|---|---|---|
| `/help/api-docs` | `BackofficeGuard` + `SuperAdminGuard` | Internal Swagger/OpenAPI viewer with API version selector. |

### 7.3 Environment Variables

Backend:

```env
API_DOCS_SOURCE=r2                  # r2 | filesystem
API_DOCS_R2_ACCOUNT_ID=9cfbba8b3a373fdc0d11abaf64071719
API_DOCS_R2_ACCESS_KEY_ID=
API_DOCS_R2_ACCESS_KEY_SECRET=
API_DOCS_R2_BUCKET=apidoc-factorysyncsolutions-com-staging
API_DOCS_R2_PREFIX=openapi
API_DOCS_SUPPORTED_VERSIONS=v1
API_DOCS_DEFAULT_VERSION=v1
API_DOCS_LOCAL_DIR=docs             # relative to apps/backend in local dev
```

CI:

```env
API_DOCS_R2_ACCOUNT_ID=9cfbba8b3a373fdc0d11abaf64071719
API_DOCS_R2_ACCESS_KEY_ID=...
API_DOCS_R2_ACCESS_KEY_SECRET=...
API_DOCS_R2_BUCKET=apidoc-factorysyncsolutions-com-staging   # staging
# API_DOCS_R2_BUCKET=apidoc-factorysyncsolutions-com         # production
API_DOCS_R2_PREFIX=openapi
```

Use dedicated API docs R2 credentials instead of the upload service `R2_*` credentials. Backend runtime credentials should be scoped to object read for the current environment's docs bucket. CI publishing credentials should be scoped to object read/write for the target docs bucket.

---

## 8. Security Requirements

- API docs buckets are private.
- No R2 secret is exposed to Vite, React, or Cloudflare Pages.
- Backoffice endpoints use `RequireBackofficeRole(authClient, "superadmin")`.
- Staff users are explicitly out of scope for Swagger/OpenAPI access.
- The frontend route is protected by `SuperAdminGuard`, and the backend remains authoritative.
- Error responses do not reveal bucket names, credentials, or full object keys unless the caller is authenticated and the field is intentionally returned as metadata.
- The OpenAPI spec must not include secrets, service account paths, internal credentials, or example bearer tokens.
- CI secrets must be stored in GitHub Actions secrets, not repository files.

---

## 9. Implementation Plan

### Phase 1 - Generation

- Add `swaggo/swag` generation workflow for `apps/backend`.
- Add a root or backend script, for example `npm run docs:api` or `make docs-api`.
- Ensure generated docs include backoffice, upload, profile, quiz, result, dbd, and admin routes.
- Generate into versioned local folders, starting with `apps/backend/docs/v1/`.
- Add generated docs output to `.gitignore` if not already ignored.

### Phase 2 - R2 Publishing

- Add a CI script that uploads JSON, YAML, and metadata to R2.
- Wire upload into staging and production deploy workflows.
- Upload to `openapi/{apiVersion}/versions/{gitSHA}/...` and `openapi/{apiVersion}/current/...`.
- Verify upload by fetching object metadata after upload.

### Phase 3 - Backend Read API

- Add an `apidocs` or `backoffice` submodule for reading docs from R2 or local filesystem.
- Define sentinel errors such as `ErrAPIDocsNotFound` and `ErrAPIDocsUnavailable`.
- Add `/api-docs` routes under the existing backoffice route group, guarded by superadmin role.
- Add table-driven tests for superadmin success, staff forbidden, unsupported API version, missing artifact, R2 read failure, and success.

### Phase 4 - Backoffice UI

- Add `/help/api-docs` route and sidebar item behind `SuperAdminGuard`.
- Add a Swagger UI viewer component.
- Add a shadcn `Select` for API versions returned by the backend.
- Add i18n keys in Thai and English.
- Add loading/error states and download buttons.
- Add Vitest coverage for rendering and error states.

### Phase 5 - Docs And Rollout

- Update `docs/api/swagger.md` from planned-only to active workflow.
- Update operations docs for env vars and deployment.
- Verify staging before production release.

---

## 10. Test Plan

| Test Case | Requirement | Type | Expected Result |
|---|---|---|---|
| TC-001 | FR-001 | CLI | Docs generation creates JSON and YAML. |
| TC-002 | FR-001 | CLI | Invalid annotations fail generation. |
| TC-003 | FR-002 | CI | Staging upload writes versioned and current R2 objects. |
| TC-004 | FR-003 | Backend unit | Metadata endpoint returns expected fields via `pkg.RespondJSON`. |
| TC-005 | FR-004 | Backend unit | Missing artifact maps sentinel error to 404. |
| TC-006 | FR-004 | Backend unit | Staff user receives 403 before any R2 read. |
| TC-007 | FR-004 | Backend unit | Unsupported API version returns a controlled error. |
| TC-008 | FR-005 | Frontend unit | Superadmin Help page renders metadata, version selector, and viewer after successful fetch. |
| TC-009 | FR-005 | Frontend unit | Staff users do not see the Help sidebar item. |
| TC-010 | FR-005 | Frontend unit | Help page renders localized error state on failed fetch. |
| TC-011 | FR-006 | Manual local | Local filesystem mode renders generated docs without R2 env vars. |
| TC-012 | Security | Review | Generated spec contains no secrets or private credentials. |

---

## 11. Open Questions

1. Should docs generation run during every test workflow, or only deploy workflows?
2. Should `current/` production docs point to the latest `main` tag or latest successful production deploy?
3. Should the backoffice Help section later include Markdown runbooks from `docs/operations/`, or only API docs in v1?
4. When `v2` exists, should older API versions remain visible indefinitely or follow a retention period?

---

## 12. Decisions For v1

| Decision | Rationale |
|---|---|
| Serve docs through `/api/v1/backoffice/api-docs/*` instead of direct R2 URLs. | Reuses existing Firebase custom-claim auth and keeps R2 private. |
| Restrict Swagger/OpenAPI access to superadmins only. | API docs expose internal operational surface area and should not be available to all staff. |
| Publish both `openapi/{apiVersion}/current/` and `openapi/{apiVersion}/versions/{gitSHA}/`. | Backoffice gets a stable URL per API version while engineering keeps traceability. |
| Keep generated artifacts out of source control. | Source annotations remain the source of truth; CI proves generation works. |
| Start with `v1` and model versioning explicitly. | The current API is under `/api/v1`; future versions should not require redesigning the docs pipeline. |
| Publish Swagger/OpenAPI 2.0 artifacts for v1. | `swaggo/swag` natively emits Swagger 2.0; Swagger UI renders it correctly, and future OpenAPI 3 conversion can be introduced as a separate migration. |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.2.1 | 2026-06-14 | Sathittham Sangthong | Clarify v1 publishes Swagger/OpenAPI 2.0 artifacts |
| 0.2.0 | 2026-06-14 | Sathittham Sangthong | Restrict access to superadmins and add API versioning |
| 0.1.0 | 2026-06-14 | Sathittham Sangthong | Initial draft |
