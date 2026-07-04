---
isoOutput: SI.O4 / SI.O5
version: 0.1.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Active
---

# Test Plan — Backoffice Analytics Menu

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice Analytics Menu (`bo-analytics-menu`) |
| **Version** | 0.1.0 |
| **Status** | Active |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **README Reference** | [README.md](./README.md) |

## 1. Test Scope

### 1.1 In Scope

- `AnalyticsPage` rendering (header + hosted `WebAnalyticsSection`) and TH/EN titles.
- Regression: the full existing `components/analytics` suite must keep passing
  unchanged (the section component is reused as-is).

### 1.2 Out of Scope

- Backend analytics API behavior — covered by
  [bo-dashboard-ga4/test-plan.md](../bo-dashboard-ga4/test-plan.md).
- `WebAnalyticsSection` internals — same reference.
- Playwright E2E — `web-backoffice` has no Playwright infra yet (tracked in
  bo-dashboard-ga4 follow-ups).

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Frontend | `pnpm --filter @repo/web-backoffice test` (Vitest + Testing Library, jsdom) |

## 2. Unit Tests

| ID | Case | File | Status |
|----|------|------|:------:|
| UT-001 | `AnalyticsPage` renders the page header and hosts `WebAnalyticsSection` (mocked) | `src/pages/AnalyticsPage.test.tsx` | ✅ |
| UT-002 | `AnalyticsPage` renders the Thai title when locale is `th` | `src/pages/AnalyticsPage.test.tsx` | ✅ |

## 3. Manual Verification

| ID | Case | Status |
|----|------|:------:|
| MT-001 | Sidebar shows "Analytics" between Dashboard and Projects; item highlights on `/analytics` | ✅ 4 Jul 2026 |
| MT-002 | `/dashboard` shows KPI cards + recent results only (no analytics section) | ✅ 4 Jul 2026 |

## 4. Regression Gate

- Full `@repo/web-backoffice` suite green: **49 tests / 10 files** (47 pre-existing
  + 2 new) — recorded 4 July 2026.
- `pnpm --filter @repo/web-backoffice type-check` and Biome clean on all changed files.

*Version: 0.1.0*
*Last updated: 4 July 2026*
