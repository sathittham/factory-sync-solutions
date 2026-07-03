# Status

> Tracks build progress for the API Docs Publishing feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

**Implemented across all five phases.** Swagger generation is active — `swaggo/swag` is in
`go.mod`, `make docs-api` runs `scripts/generate-api-docs.sh`, and v1 artifacts are
generated under `apps/backend/docs/v1/`. Backend deploy workflows publish JSON, YAML, and
metadata to the dedicated private R2 buckets (`apidoc-factorysyncsolutions-com-staging` /
`apidoc-factorysyncsolutions-com`), writing `versions/{gitSHA}/` first and then `current/`.

Serving is live on both ends: the backend exposes the four superadmin-only endpoints under
`/api/v1/backoffice/api-docs/*` (R2 source in deployed environments, local filesystem when
R2 env vars are absent; non-production environments additionally serve Swagger UI at
`/api/v1/swagger/*`), and `web-backoffice` renders the Help / API Docs page at
`/help/api-docs` behind `SuperAdminGuard`. Staff-role users see no Help item and receive
403 from the endpoints.

The four open questions (generation frequency in CI, what production `current/` tracks,
Markdown runbooks in Help, retention of old API versions) remain undecided — see
[README.md § Open Items](./README.md#open-items--future-work). No per-package coverage
number is recorded in the spec.

---

## Build Checklist

Mirrors [feature-spec.md § 3 + § 9](./feature-spec.md#3-current-state) (all phases live):

**Phase 1 — Generation**
- [x] `swaggo/swag` workflow — `make docs-api` → `scripts/generate-api-docs.sh`
- [x] Versioned output — `apps/backend/docs/v1/swagger.json` + `swagger.yaml`
- [x] Generated artifacts kept out of source control

**Phase 2 — R2 publishing**
- [x] CI upload of JSON, YAML, metadata to the environment bucket
- [x] `openapi/v1/versions/{gitSHA}/…` written before `openapi/v1/current/…`
- [x] Upload failure fails the CI job

**Phase 3 — Backend read API**
- [x] Four endpoints under `/api/v1/backoffice/api-docs/*` behind superadmin role
- [x] Sentinel errors (`ErrAPIDocsNotFound`, `ErrAPIDocsUnavailable`) mapped via `pkg.RespondError`
- [x] Local filesystem fallback when R2 env vars are absent
- [x] Non-production Swagger UI at `/api/v1/swagger/*`

**Phase 4 — Backoffice UI**
- [x] `/help/api-docs` route + superadmin-only sidebar item
- [x] Swagger UI viewer, shadcn `Select` version picker, metadata display, JSON/YAML downloads
- [x] TH/EN i18n, loading/empty/error states

**Phase 5 — Docs & rollout**
- [x] [docs/api/swagger.md](../../api/swagger.md) documents the active workflow
- [x] [docs/operations/env-variables.md](../../operations/env-variables.md) + [deployment.md](../../operations/deployment.md) updated

### Tests

Test plan TC-001–TC-012 is defined in [feature-spec.md § 10](./feature-spec.md#10-test-plan);
the spec does not record per-suite completion or coverage numbers — tick as verified.

- [ ] Backend table-driven suite (superadmin success · staff 403 · unsupported version · missing artifact · R2 failure)
- [ ] Frontend Vitest (render, staff hidden, localized error state)
- [ ] `go test ./... -cover` for the api-docs module → **n/a — not recorded**

---

## Open Decisions

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work).

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Docs generation in every test workflow vs. deploy-only | **Open** |
| 2 | Production `current/` tracks latest `main` tag vs. latest successful production deploy | **Open** |
| 3 | Markdown runbooks in the backoffice Help section | **Open** — v1 is API docs only |
| 4 | Retention policy for superseded API versions once `v2` exists | **Open** |

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [docs-pipeline.md](./docs-pipeline.md) · [api-docs-service.md](./api-docs-service.md) · [help-page.md](./help-page.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
