---
isoOutput: SI.O4 / SI.O5
version: 1.2.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Active
---

# Test Plan — Backoffice GA4 Analytics Dashboard

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice GA4 Analytics Dashboard |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **README Reference** | [README.md](./README.md) |

## 1. Test Scope

### 1.1 In Scope

- Backend API contracts for `GET /api/v1/backoffice/analytics/*`.
- Service-level behavior in `apps/backend/services/analytics` (range parsing, GA4 fetch, cache fallback, metric transforms).
- Frontend backoffice analytics page behavior for cards, charts, tables, range switcher, locale toggle, and retry UI.
- AuthZ and validation for backoffice analytics access.
- Unit tests, component tests, and Playwright E2E tests.
- Coverage gate for all analytics-related code: **> 70%** (required).

### 1.2 Out of Scope

- Firebase Auth internals.
- GA4 external SDK internals (mocked behind client interface).
- Marketing-site or `web-app` surfaces.

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/analytics ./services/backoffice` |
| Frontend | `pnpm test` / `pnpm test --coverage` in `apps/web-backoffice` |
| E2E | Playwright in `apps/web-backoffice` |
| Test data | Local fixtures + route stubs for GA4 success/failure |

## 2. Unit Test Cases (SI.O4)

### 2.1 Backend — `apps/backend/services/analytics/service_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | Validate range — valid values | none | `7d`, `28d`, `90d` (`14d` dropped — SRS §11 allowlists three values) | normalized range accepted | Pass |
| UT-002 | Validate range — invalid values | none | `2w`, `999d`, empty | `validation error` (`VALIDATION_ERROR`) | Pass |
| UT-003 | Cache key derivation | normal request | `range=28d`, `range=7d` | deterministic keys per range | Pass |
| UT-004 | GA4 error fallback path | cache empty + downstream failure | any valid range request | `Err` mapped to `503 ANALYTICS_UNAVAILABLE` | Pass |
| UT-005 | GA4 stale cache path | cache hit available + stale data | downstream times out | cached payload returned with `stale: true` | Pass |
| UT-006 | Overview aggregation | known fixture payload | API response conversion | numeric totals computed correctly; divide-by-zero guarded | Pass |
| UT-007 | Audience top-N slicing | fixture with >10 countries/devices | transform response | top 10 and deterministic ordering returned | Pass |
| UT-008 | Engagement series mapping (TC-008) | known fixture rows | `GetEngagement(28d)` | series maps `active1DayUsers`/`active7DayUsers`/`active28DayUsers` per date; `current` = last row; `stickiness = dau/mau` | Pass |
| UT-009 | Engagement edge cases (TC-008) | zero-MAU fixture / empty rows / cold cache + failure | `GetEngagement` | stickiness 0 without division error; empty non-nil series; `ErrAnalyticsUnavailable`; stale fallback with `stale:true` | Pass |
| UT-010 | Sources breakdown (TC-009) | fixture rows | `GetSources(28d)` | top 10 `sessionSourceMedium` rows with share of returned total; cache / stale / cold-cache failure behavior matches channels | Pass |
| UT-011 | Meta property ID (TC-010) | configured / disabled service | `GetMeta()` | configured → `propertyID` returned; disabled → `ErrAnalyticsUnavailable` | Pass |

### 2.2 Frontend — `apps/web-backoffice/src/**\/*.test.tsx`

| ID | Test Name | Component / Hook | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | Overview cards render success state | `WebAnalyticsSection` | API mock success | mount section | shows localized numeric totals | Pass |
| UT-F02 | Overview cards render partial failure | `WebAnalyticsSection` | GA4 unavailable mock (cache miss) | mount section | shows error state and message; other panels unaffected | Pass |
| UT-F03 | Range selector behavior | range selector + tabs | current range `28d` | select `7d` | request param includes `range=7d` and loading states shown | Pass |
| UT-F04 | Time-series empty data UI | `TrafficOverview` | empty payload | mount component | no-data message shown with safe chart render | Pass |
| UT-F05 | Top pages truncation | `TopPagesTable` | long URL path | render row | truncated display plus tooltip detail | Pass |
| UT-F06 | Locale switching | all analytics screens | locale from `th` to `en` | trigger re-render | all visible labels switch via i18n, no hardcoded text | Pass |
| UT-F07 | Stale warning UI | backoffice analytics page | stale response present | render warning | retry alert shown and sections stay visible | Pass |
| UT-F08 | Engagement panel states (TC-008) | `EngagementPanel` | API mock success / loading / error / empty | mount component | DAU/WAU/MAU tiles + stickiness % render; loading skeleton, inline error, and empty states match TrafficOverview behavior | Pass |
| UT-F09 | Sources table states (TC-009) | `SourcesTable` | API mock success / loading / error / empty | mount component | source/medium rows with sessions + share %; states match TopPagesTable behavior | Pass |
| UT-F10 | GA console link (TC-010) | `WebAnalyticsSection` header | meta mock success / failure | mount section | link renders with `#/p{propertyID}` deep link, `target="_blank"`, `rel="noopener noreferrer"`; absent when meta fails | Pass |

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests — `apps/backend/services/analytics/handler_test.go`

| ID | Endpoint | Auth | Request | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `GET /api/v1/backoffice/analytics/overview` | valid backoffice UID | `range=28d` | 200 | `success=true`, overview payload, `stale` flag always present | Pass |
| IT-002 | `GET /api/v1/backoffice/analytics/overview` | no token | `range=28d` | 401 | `UNAUTHORIZED` | Pass |
| IT-003 | `GET /api/v1/backoffice/analytics/overview` | user token (non-backoffice) | `range=28d` | 403 | `FORBIDDEN` | Pass |
| IT-004 | ~~`GET /api/v1/backoffice/analytics/traffic`~~ | — | — | — | N/A — daily series is part of the `overview` payload (SRS §5.1), no separate endpoint | N/A |
| IT-005 | `GET /api/v1/backoffice/analytics/top-pages` | valid token | `range=28d` | 200 | sorted by view count desc, up to top 10 | Pass |
| IT-006 | `GET /api/v1/backoffice/analytics/audience` | valid token | `range=28d` | 200 | country/device summary, top 10 countries | Pass |
| IT-007 | `GET /api/v1/backoffice/analytics/channels` | valid token | invalid range | 400 | `VALIDATION_ERROR` | Pass |
| IT-008 | `GET /api/v1/backoffice/analytics/*` | valid token | backend failure + cache hit | 200 | stale payload + warning metadata | Pass |
| IT-009 | `GET /api/v1/backoffice/analytics/engagement` | valid token | `range=28d` / invalid range / upstream failure, cold cache | 200 / 400 / 503 | engagement payload (`current` + `series`) / `VALIDATION_ERROR` / `ANALYTICS_UNAVAILABLE` | Pass |
| IT-010 | `GET /api/v1/backoffice/analytics/sources` | valid token | `range=28d` / invalid range / upstream failure, cold cache | 200 / 400 / 503 | sources payload / `VALIDATION_ERROR` / `ANALYTICS_UNAVAILABLE` | Pass |
| IT-011 | `GET /api/v1/backoffice/analytics/meta` | valid token | configured / unconfigured service | 200 / 503 | `propertyID` in envelope / `ANALYTICS_UNAVAILABLE` | Pass |

### 3.2 End-to-End (Playwright)

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Analytics happy path | Backoffice user | Sign in → open dashboard → default range view | all panels render, cards/charts populated, locale switch works | Deferred |
| E2E-002 | Unauthorized/Forbidden checks | Anonymous / non-backoffice user | open dashboard route / call protected APIs | blocked with auth or 403 flow | Deferred |
| E2E-003 | Range switch + loading behavior | Backoffice user | select `7d`, `28d`, `90d` rapidly | each panel shows loading then updates consistently | Deferred |
| E2E-004 | Error path with cache fallback | Backoffice user | mock GA4 503 with warm cache | stale warning appears, data still visible | Deferred |
| E2E-005 | Unavailable path with cold cache | Backoffice user | mock GA4 503 with empty cache | error state rendered, no hard crash | Deferred |

> **E2E status:** deferred — `apps/web-backoffice` has no Playwright infrastructure yet
> (tracked as follow-up in [status.md](./status.md)).

## 4. Coverage Targets

| Component | Target | Tool |
|---|---|---|
| `apps/backend/services/analytics/service.go` | **> 70%** | `go test -cover` |
| `apps/backend/services/analytics/handler.go` | **> 70%** | `go test -cover` |
| `apps/backend/services/analytics` (package-level) | **> 70%** | `go test -cover` |
| `apps/web-backoffice` analytics components/hooks | **> 70%** | `pnpm test --coverage` |

Coverage gate is enforced in CI and must pass together with E2E in one pipeline run.

## 5. Test Commands

Run from repository root unless path is specified.

- `cd apps/backend && go test -v -race ./services/analytics ./services/backoffice -coverprofile=coverage.out`
- `cd apps/backend && go tool cover -func=coverage.out`
- `cd apps/backend && go tool cover -func=coverage.out | awk '/total/ {gsub(/%/, ""); if ($NF < 70.0) exit 1;}'`
- `cd apps/web-backoffice && pnpm test`
- `cd apps/web-backoffice && pnpm test --coverage`
- `cd apps/web-backoffice && pnpm test:e2e`

## 6. Test Results

| Run Date | Environment | Backend Coverage | Frontend Coverage | E2E Result | Notes |
|---|---|---|---|---|---|
| 2026-07-04 | Local | 84.3% (`services/analytics`, `go test -race -cover`) | 97.6% stmts / 91.1% branch (`components/analytics`, `vitest --coverage`) | Deferred (no Playwright infra) | Phase 1: 36 frontend tests across 7 files + backend service/handler suites, all green |
| 2026-07-04 | Local | 86.3% (`services/analytics`, `go test -race -cover`) | 96.96% stmts / 93.87% branch (`components/analytics`, `vitest --coverage`) | Deferred (no Playwright infra) | FR-008 engagement added: 41 frontend tests across 8 files + UT-008/UT-009/IT-009 backend cases, all green; GA4 metric names validated against the live Data API |
| 2026-07-04 | Local | 87.6% (`services/analytics`, `go test -race -cover`) | 97.42% stmts / 92.85% branch (`components/analytics`, `vitest --coverage`) | Deferred (no Playwright infra) | FR-009 sources + FR-010 GA deep link added: 47 frontend tests across 9 files + UT-010/UT-011/IT-010/IT-011 backend cases, all green; `sessionSourceMedium` validated against the live Data API |

## 7. Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-03 | Sathittham Sangthong | Initial template-aligned test plan for `bo-dashboard-ga4` including unit, integration, E2E, and >70% coverage gates |
| 1.1.0 | 2026-07-04 | Sathittham Sangthong | Add TC-008 engagement (DAU/WAU/MAU) cases: UT-008/UT-009, UT-F08, IT-009 |
| 1.2.0 | 2026-07-04 | Sathittham Sangthong | Add TC-009 sources + TC-010 GA deep link cases: UT-010/UT-011, UT-F09/UT-F10, IT-010/IT-011 |

---

*Version: 1.2.0*
*Last updated: 4 July 2026*
