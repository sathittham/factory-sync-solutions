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
Playwright E2E remains open — `web-backoffice` has no Playwright infrastructure
yet (see [Follow-up Work](#follow-up-work)). GA4 runtime config
(`GA4_PROPERTY_ID`, `GA4_SA_CREDENTIALS_JSON`) still needs provisioning per
environment; until then the section degrades gracefully (503
`ANALYTICS_UNAVAILABLE`).

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

- [x] Backend analytics package test coverage ≥ 70% — **84.3%** (`go test -race -cover`, 2026-07-04).
- [x] Frontend analytics coverage ≥ 70% — **97.6% stmts / 91.1% branch** (`vitest --coverage`, 2026-07-04).

## Open Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Default analytics scope | **Resolved**: staff + superadmin (`RequireBackofficeRole("superadmin","staff")`) |
| 2 | Cache policy while missing metrics | **Resolved**: 15m TTL + stale-while-error (`stale: true`); cold-cache failure → 503 |

## Follow-up Work

- Playwright E2E (E2E-001…005 in [test-plan.md](./test-plan.md)) once
  `apps/web-backoffice` gains Playwright infrastructure.
- Provision GA4 service account (Viewer on the property) + set
  `GA4_PROPERTY_ID` / `GA4_SA_CREDENTIALS_JSON` in staging and production.
- Locale switch currently refetches all four endpoints (the i18n `t` function is
  an effect dependency in `WebAnalyticsSection`) — harmless but wasteful; memoize
  or move error-message building out of the effect.

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)
- [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) — CR-006

*Version: 0.2.0*
*Last updated: 4 July 2026*
