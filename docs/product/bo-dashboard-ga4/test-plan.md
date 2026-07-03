---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-03
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
| UT-001 | Validate range — valid values | none | `7d`, `14d`, `28d`, `90d` | normalized range accepted | — |
| UT-002 | Validate range — invalid values | none | `2w`, `999d`, empty | `validation error` (`VALIDATION_ERROR`) | — |
| UT-003 | Cache key derivation | normal request | `range=28d`, `range=7d` | deterministic keys per range | — |
| UT-004 | GA4 error fallback path | cache empty + downstream failure | any valid range request | `Err` mapped to `503 ANALYTICS_UNAVAILABLE` | — |
| UT-005 | GA4 stale cache path | cache hit available + stale data | downstream times out | cached payload returned with `stale: true` | — |
| UT-006 | Overview aggregation | known fixture payload | API response conversion | numeric totals computed correctly; divide-by-zero guarded | — |
| UT-007 | Audience top-N slicing | fixture with >10 countries/devices | transform response | top 10 and deterministic ordering returned | — |

### 2.2 Frontend — `apps/web-backoffice/src/**\/*.test.tsx`

| ID | Test Name | Component / Hook | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | Overview cards render success state | `WebAnalyticsSection` | API mock success | mount section | shows localized numeric totals | — |
| UT-F02 | Overview cards render partial failure | `WebAnalyticsSection` | GA4 unavailable mock (cache miss) | mount section | shows error state and message | — |
| UT-F03 | Range selector behavior | range selector + tabs | current range `28d` | select `7d` | request param includes `range=7d` and loading states shown | — |
| UT-F04 | Time-series empty data UI | `TrafficChart` | empty payload | mount component | no-data message shown with safe chart render | — |
| UT-F05 | Top pages truncation | `TopPagesTable` | long URL path | render row | truncated display plus tooltip detail | — |
| UT-F06 | Locale switching | all analytics screens | locale from `th` to `en` | trigger re-render | all visible labels switch via i18n, no hardcoded text | — |
| UT-F07 | Stale warning UI | backoffice analytics page | stale response present | render warning | retry alert shown and sections stay visible | — |

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests — `apps/backend/services/analytics/handler_test.go`

| ID | Endpoint | Auth | Request | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `GET /api/v1/backoffice/analytics/overview` | valid backoffice UID | `range=28d` | 200 | `success=true`, overview payload, nullable `stale` flag | — |
| IT-002 | `GET /api/v1/backoffice/analytics/overview` | no token | `range=28d` | 401 | `UNAUTHENTICATED` | — |
| IT-003 | `GET /api/v1/backoffice/analytics/overview` | user token (non-backoffice) | `range=28d` | 403 | `FORBIDDEN` | — |
| IT-004 | `GET /api/v1/backoffice/analytics/traffic` | valid token | `range=28d` | 200 | ordered per-day series | — |
| IT-005 | `GET /api/v1/backoffice/analytics/top-pages` | valid token | `range=28d` | 200 | sorted by view count desc, up to top 10 | — |
| IT-006 | `GET /api/v1/backoffice/analytics/audience` | valid token | `range=28d` | 200 | country/device summary, top 10 countries | — |
| IT-007 | `GET /api/v1/backoffice/analytics/channels` | valid token | invalid range | 400 | `VALIDATION_ERROR` | — |
| IT-008 | `GET /api/v1/backoffice/analytics/*` | valid token | backend failure + cache hit | 200 | stale payload + warning metadata | — |

### 3.2 End-to-End (Playwright)

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Analytics happy path | Backoffice user | Sign in → open dashboard → default range view | all panels render, cards/charts populated, locale switch works | — |
| E2E-002 | Unauthorized/Forbidden checks | Anonymous / non-backoffice user | open dashboard route / call protected APIs | blocked with auth or 403 flow | — |
| E2E-003 | Range switch + loading behavior | Backoffice user | select `7d`, `14d`, `90d` rapidly | each panel shows loading then updates consistently | — |
| E2E-004 | Error path with cache fallback | Backoffice user | mock GA4 503 with warm cache | stale warning appears, data still visible | — |
| E2E-005 | Unavailable path with cold cache | Backoffice user | mock GA4 503 with empty cache | error state rendered, no hard crash | — |

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
| YYYY-MM-DD | Local / CI | — | — | — | Initial plan stage |

## 7. Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-03 | Sathittham Sangthong | Initial template-aligned test plan for `bo-dashboard-ga4` including unit, integration, E2E, and >70% coverage gates |
