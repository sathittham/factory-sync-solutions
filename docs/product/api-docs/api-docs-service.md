# API Docs Read Service (backend)

## Summary

Superadmin-only backend endpoints that serve the published OpenAPI artifacts to
`web-backoffice`. Lives under the existing backoffice route group; reads from R2 in
deployed environments and from the local filesystem in dev. The backoffice never fetches
R2 directly — authorization stays in the existing Firebase custom-claim model and no
signed R2 URLs appear in browser history or logs.

## Implementation

All four routes are guarded by Firebase Auth + `RequireBackofficeRole(authClient, "superadmin")`
and respond via `pkg.RespondJSON` / `pkg.RespondError` — never raw JSON.

- `GET /api/v1/backoffice/api-docs/versions` — versions available in this environment:
  `data.versions[]` of `{apiVersion, label, isCurrent}` (v1 only today).
- `GET /api/v1/backoffice/api-docs/{apiVersion}/metadata` — the published
  `metadata.json` (environment, apiVersion, gitSHA, generatedAt, openapiVersion,
  jsonKey, yamlKey).
- `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.json` — the OpenAPI document
  inside `data.spec`; the frontend unwraps it and hands it to Swagger UI (Swagger UI is
  never pointed at this URL directly).
- `GET /api/v1/backoffice/api-docs/{apiVersion}/openapi.yaml` — the YAML text inside
  `data.yaml`, powering the download button.

### Behavior and edge cases

- `{apiVersion}` is validated against the supported-version list
  (`API_DOCS_SUPPORTED_VERSIONS`); unsupported values return a controlled 404/validation
  error via `pkg.RespondError`.
- Missing artifacts map the domain sentinel `ErrAPIDocsNotFound` → 404;
  `ErrAPIDocsUnavailable` covers source failures. R2/filesystem read errors are wrapped
  with `fmt.Errorf("context: %w", err)` and map to 500.
- Staff (`backofficeRole == "staff"`) receive 403 **before** any R2 read happens.
- Error responses never reveal bucket names, credentials, or full object keys to
  unauthorized callers.
- Source selection: `API_DOCS_SOURCE=r2 | filesystem`. When R2 env vars are absent
  locally, the service reads `apps/backend/docs/{apiVersion}/…` from disk — the same
  version-path shape as R2. Non-production environments additionally serve Swagger UI at
  `/api/v1/swagger/*`.

## Configuration

Backend runtime credentials are read-only, scoped to the current environment's docs
bucket (distinct from the CI publishing credentials):

| Env var | Description |
|---------|-------------|
| `API_DOCS_SOURCE` | `r2` or `filesystem` |
| `API_DOCS_R2_ACCOUNT_ID` / `API_DOCS_R2_ACCESS_KEY_ID` / `API_DOCS_R2_ACCESS_KEY_SECRET` | Read-scoped R2 credentials |
| `API_DOCS_R2_BUCKET` | Environment's docs bucket |
| `API_DOCS_R2_PREFIX` | `openapi` |
| `API_DOCS_SUPPORTED_VERSIONS` | Comma list of allowed `{apiVersion}` values — `v1` |
| `API_DOCS_DEFAULT_VERSION` | `v1` |
| `API_DOCS_LOCAL_DIR` | Filesystem-mode directory, relative to `apps/backend` — `docs` |

## Usage

```
# pseudocode — handler contract
version not in supportedVersions → pkg.RespondError(w, 404, "NOT_FOUND", msg)
caller not superadmin            → 403 FORBIDDEN (middleware, before any read)
read(source, key) fails:
    errors.Is(err, ErrAPIDocsNotFound) → pkg.RespondError(w, 404, "NOT_FOUND", msg)
    default (wrapped err)              → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
ok → pkg.RespondJSON(w, 200, {spec | yaml | metadata | versions})
```

Consumed by the Help page — see [help-page.md](./help-page.md). Artifacts are produced by
the [docs pipeline](./docs-pipeline.md).

## Acceptance Criteria

- Given a superadmin token, when each endpoint is called for `v1`, then the expected envelope (`data.versions` / `data` metadata / `data.spec` / `data.yaml`) returns 200.
- Given a staff token, when any endpoint is called, then `403 FORBIDDEN` with no R2 read performed.
- Given an unsupported `{apiVersion}`, when called, then a controlled error via `pkg.RespondError` (no R2 key probing).
- Given a missing artifact, when called, then `ErrAPIDocsNotFound` maps to `404`.
- Given filesystem mode with no generated files, when called, then the error surfaced lets the UI name the generation command.

## Status

- [x] Four routes live under the backoffice group, superadmin-guarded
- [x] Sentinel errors defined and mapped (`ErrAPIDocsNotFound`, `ErrAPIDocsUnavailable`)
- [x] R2 + local filesystem sources behind `API_DOCS_SOURCE`
- [ ] Table-driven suite recorded (superadmin success · staff 403 · unsupported version · missing artifact · R2 failure) — status not recorded in the spec

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
