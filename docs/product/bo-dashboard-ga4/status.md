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
- [Related Documents](#related-documents)

## Current State

No implementation has been merged yet. The feature is currently at the design and
test-planning stage.

## Phase 1 — MVP

- [ ] Add `services/analytics` scaffolding and GA4 client configuration.
- [ ] Add `GET /api/v1/backoffice/analytics/*` endpoints + role validation.
- [ ] Add service + handler tests and enforce API contract coverage.
- [ ] Add `/dashboard` analytics section, range selector, and core UI panels.
- [ ] Add front-end unit/component tests for success/loading/error paths.
- [ ] Add Playwright E2E for happy, unauthorized, and stale fallback flows.

### Phase 1 Tests

- [ ] `apps/backend/services/analytics/service_test.go` — table-driven service cases
  covering validation, cache, and stale/failure behavior.
- [ ] `apps/backend/services/analytics/handler_test.go` — auth/validation
  contracts and 401/403 deny-path assertions.
- [ ] `apps/web-backoffice` analytics component tests — loading/success/error + locale.
- [ ] `apps/web-backoffice` Playwright — dashboard happy and degradation paths.

Coverage recorded:

- [ ] Backend analytics package test coverage ≥ 70%.
- [ ] Frontend analytics coverage ≥ 70%.

## Open Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Default analytics scope | **Open**: staff + superadmin in v1 |
| 2 | Cache policy while missing metrics | **Open**: continue stale strategy with retry warning |

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

*Version: 0.1.0*
*Last updated: 2026-07-03*
