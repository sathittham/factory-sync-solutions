# Status

> Tracks build progress for **Backoffice Analytics Menu** against
> [`README.md`](./README.md). Requirements are in
> [`feature-spec.md`](./feature-spec.md), test obligations in
> [`test-plan.md`](./test-plan.md).

---

## Current State

Implemented on `feature/bo-analytics-menu` (2026-07-04): `/analytics` page +
sidebar menu item; analytics section removed from `/dashboard`. All 49
`web-backoffice` tests green (47 pre-existing + 2 new); type-check and Biome
clean. Not yet merged to `develop`.

## Checklist

- [x] `AnalyticsPage` + `/analytics` route behind `BackofficeGuard` (FR-001).
- [x] Sidebar "Analytics" item with `ChartLine` icon + active state (FR-002).
- [x] `WebAnalyticsSection` removed from `DashboardPage` (FR-003).
- [x] TH/EN i18n keys `nav.analytics`, `analytics.pageTitle`, `analytics.pageSubtitle` (FR-004).
- [x] `AnalyticsPage.test.tsx` (UT-001/UT-002) + full-suite regression pass.
- [x] Docs: this folder + [bo-dashboard-ga4](../bo-dashboard-ga4/status.md) synced.
- [ ] Merge to `develop`; ships with the pending GA4 staging release.

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) — CR-007

*Version: 0.1.0*
*Last updated: 4 July 2026*
