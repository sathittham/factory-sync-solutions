# Docs Pipeline — Generation + R2 Publishing

## Summary

The build-side half of the feature: `swaggo/swag` turns Go handler annotations into
versioned Swagger/OpenAPI artifacts, and the CI deploy workflows publish them to the
environment's private Cloudflare R2 bucket. Generation entry point:
`apps/backend/main.go`; script: `scripts/generate-api-docs.sh` via `make docs-api`.

## Implementation

### Generation

- `make docs-api` runs `swag init` against `apps/backend/main.go` and writes
  `swagger.json` + `swagger.yaml` into the versioned local folder
  `apps/backend/docs/v1/`.
- Artifacts cover all routed `/api/v1` services (backoffice, upload, profile, quiz,
  result, dbd, admin) and declare the API version they document (`apiVersion: "v1"`).
- v1 emits **Swagger/OpenAPI 2.0** — `swaggo/swag`'s native format; an OpenAPI 3
  conversion would be a separate future migration.
- Invalid annotations fail the command (and therefore CI) — generation is the proof
  that the annotations are well-formed.
- Generated output is git-ignored: source annotations are the source of truth, and
  artifacts never go through source review.

### Publishing (CI)

- Staging and production deploy workflows upload three objects per run — `metadata.json`,
  `swagger.json`, `swagger.yaml` — to the environment's bucket:
  `apidoc-factorysyncsolutions-com-staging` (staging) /
  `apidoc-factorysyncsolutions-com` (production).
- Write order: `openapi/{apiVersion}/versions/{gitSHA}/…` first, then
  `openapi/{apiVersion}/current/…` after the versioned upload succeeds — `current/` is
  never left pointing at a half-published release.
- Upload failure fails the CI job before the release is considered complete.
- Uploads are verified by fetching object metadata after upload.

### Metadata contract

```jsonc
// openapi/v1/current/metadata.json
{
  "environment": "staging",          // staging | production
  "apiVersion": "v1",
  "gitSHA": "abc123def456",          // source commit
  "generatedAt": "2026-06-14T08:00:00Z",
  "openapiVersion": "2.0",
  "jsonKey": "openapi/v1/current/swagger.json",
  "yamlKey": "openapi/v1/current/swagger.yaml"
}
```

## Configuration

CI credentials are dedicated API-docs R2 credentials (not the upload service's `R2_*`
set), stored in GitHub Actions secrets, scoped to read/write on the target docs bucket:

| Env var | Description |
|---------|-------------|
| `API_DOCS_R2_ACCOUNT_ID` | Cloudflare account ID for the docs buckets |
| `API_DOCS_R2_ACCESS_KEY_ID` / `API_DOCS_R2_ACCESS_KEY_SECRET` | Scoped R2 credentials (GitHub Actions secrets) |
| `API_DOCS_R2_BUCKET` | Target bucket — staging or production docs bucket |
| `API_DOCS_R2_PREFIX` | Object key prefix — `openapi` |

## Usage

```
# pseudocode — deploy workflow step
make docs-api                                  # fails job on invalid annotations
for each artifact in {metadata.json, swagger.json, swagger.yaml}:
    put r2://$BUCKET/openapi/v1/versions/$GIT_SHA/$artifact
verify object metadata
for each artifact: put r2://$BUCKET/openapi/v1/current/$artifact
```

Local development skips R2 entirely — the backend serves the generated files from disk
(see [api-docs-service.md](./api-docs-service.md)).

## Acceptance Criteria

- Given the repo root, when the docs generation command runs, then JSON + YAML artifacts appear under `apps/backend/docs/v1/`.
- Given invalid Swagger annotations, when generation runs, then the command (and CI job) fails.
- Given a staging or production deploy, when it completes, then both `versions/{gitSHA}/` and `current/` hold the three artifacts in the environment's bucket.
- Given an upload failure, when the deploy workflow runs, then the CI job fails before the release is considered complete.

## Status

- [x] `swaggo/swag` in `go.mod`; `make docs-api` → `scripts/generate-api-docs.sh`
- [x] Versioned local output `apps/backend/docs/v1/`, git-ignored
- [x] CI upload wired into staging + production deploy workflows
- [x] Dedicated API-docs R2 buckets provisioned, private
- [ ] Decide whether generation also runs in test workflows (open question #1)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
