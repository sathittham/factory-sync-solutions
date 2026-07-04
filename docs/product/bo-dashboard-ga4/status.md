# Status

> Tracks build progress for **Backoffice GA4 Analytics Dashboard** against
> [`README.md`](./README.md). Design detail is in
> [`feature-spec.md`](./feature-spec.md), and test obligations are in
> [`test-plan.md`](./test-plan.md).

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — MVP](#phase-1--mvp)
- [Open Decisions](#open-decisions)
- [Follow-up Work](#follow-up-work)
- [Related Documents](#related-documents)

## Current State

Phase 1 is **implemented and verified** on `feature/bo-dashboard-ga4` (backend
service + all four endpoints + dashboard section + unit/component tests).
FR-008 **Engagement (DAU/WAU/MAU)** was added 2026-07-04: a fifth endpoint
(`/analytics/engagement`) and `EngagementPanel` on the dashboard.
Playwright E2E remains open — `web-backoffice` has no Playwright infrastructure
yet (see [Follow-up Work](#follow-up-work)). GA4 runtime config is provisioned
for **local dev** (property `540943523`, SA `ga4-analytics-reader@…` with Viewer,
verified against the live Data API on 2026-07-04); **staging and production**
still need `GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS_JSON` set — until then those
environments degrade gracefully (503 `ANALYTICS_UNAVAILABLE`).

## Phase 1 — MVP

- [x] Add `services/analytics` scaffolding and GA4 client configuration.
- [x] Add `GET /api/v1/backoffice/analytics/*` endpoints + role validation.
- [x] Add service + handler tests and enforce API contract coverage.
- [x] Add `/dashboard` analytics section, range selector, and core UI panels.
- [x] Add front-end unit/component tests for success/loading/error paths.
- [ ] Add Playwright E2E for happy, unauthorized, and stale fallback flows —
  **blocked**: no Playwright setup exists in `apps/web-backoffice` (follow-up).

### Phase 1 Tests

- [x] `apps/backend/services/analytics/service_test.go` — table-driven service cases
  covering validation, cache, and stale/failure behavior.
- [x] `apps/backend/services/analytics/handler_test.go` — auth/validation
  contracts and 401/403 deny-path assertions.
- [x] `apps/web-backoffice` analytics component tests — loading/success/error + locale
  (7 test files, 36 tests, incl. `WebAnalyticsSection` integration suite).
- [ ] `apps/web-backoffice` Playwright — dashboard happy and degradation paths
  (follow-up, needs Playwright infra).

Coverage recorded:

- [x] Backend analytics package test coverage ≥ 70% — **86.3%** (`go test -race -cover`, 2026-07-04, incl. FR-008).
- [x] Frontend analytics coverage ≥ 70% — **96.96% stmts / 93.87% branch** (`vitest --coverage`, 2026-07-04, incl. FR-008; 41 tests / 8 files).

## Scope Addition — FR-008 Engagement (2026-07-04)

- [x] Backend `GET /api/v1/backoffice/analytics/engagement` — rolling
  `active1DayUsers`/`active7DayUsers`/`active28DayUsers` by date, `current` from
  the latest row, `stickiness = dau/mau`; same cache/stale/error semantics.
- [x] Backend service + handler tests (UT-008/UT-009, IT-009 in test-plan).
- [x] `EngagementPanel` (DAU/WAU/MAU tiles + stickiness + series chart) wired
  into `WebAnalyticsSection`; TH/EN i18n keys.
- [x] Frontend component tests (UT-F08) + `WebAnalyticsSection` mock updates.

## Scope Addition — FR-009 Sources + FR-010 GA Deep Link (2026-07-04)

- [x] Backend `GET /api/v1/backoffice/analytics/sources` — top 10
  `sessionSourceMedium` rows with share; same cache/stale/error semantics.
- [x] Backend `GET /api/v1/backoffice/analytics/meta` — configured `propertyID`
  for console deep-linking (no GA4 call; 503 when unconfigured).
- [x] Backend service + handler tests (UT-010/UT-011, IT-010/IT-011).
- [x] `SourcesTable` + "Open in Google Analytics" header link wired into
  `WebAnalyticsSection`; TH/EN i18n keys.
- [x] Frontend component tests (UT-F09/UT-F10) + mock updates.
- [x] Verified 2026-07-04: backend `services/analytics` 87.6%, frontend
  `components/analytics` 97.42% (47 tests / 9 files); `sessionSourceMedium`
  validated against the live GA4 Data API; both routes reachable behind the
  backoffice auth guard.

## Open Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Default analytics scope | **Resolved**: staff + superadmin (`RequireBackofficeRole("superadmin","staff")`) |
| 2 | Cache policy while missing metrics | **Resolved**: 15m TTL + stale-while-error (`stale: true`); cold-cache failure → 503 |

## Follow-up Work

- Playwright E2E (E2E-001…005 in [test-plan.md](./test-plan.md)) once
  `apps/web-backoffice` gains Playwright infrastructure.
- Set `GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS_JSON` in staging and production
  deploy environments (local dev done 2026-07-04; consider a separate SA key per
  environment).
- Locale switch currently refetches all four endpoints (the i18n `t` function is
  an effect dependency in `WebAnalyticsSection`) — harmless but wasteful; memoize
  or move error-message building out of the effect.

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)
- [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) — CR-006

*Version: 0.3.0*
*Last updated: 4 July 2026*
