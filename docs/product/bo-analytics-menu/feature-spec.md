---
isoOutput: SI.O1
version: 0.1.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Implemented
---

# Software Requirements Specification — Backoffice Analytics Menu

*ISO 29110 Basic Profile · SI.O1*

> Relocate the GA4 web-analytics UI from a section inside the backoffice
> `/dashboard` page to a **dedicated `/analytics` page** with its own sidebar
> menu item. Frontend-only change in `apps/web-backoffice`; the
> `/api/v1/backoffice/analytics/*` backend (CR-006) is untouched.

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice Analytics Menu (`bo-analytics-menu`) |
| **Version** | 0.1.0 |
| **Status** | Implemented |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | 2026-07-04 |

---

## 1. Introduction

### 1.1 Purpose

The GA4 analytics section (CR-006, [bo-dashboard-ga4](../bo-dashboard-ga4/README.md))
shipped at the bottom of `/dashboard`, below the KPI stat cards and recent
results. As the section grew to six panels it dominated the dashboard and became
hard to reach. Giving analytics its own page and sidebar menu item makes it
directly navigable and keeps the dashboard focused on platform KPIs.

### 1.2 Scope

- **In scope:** new `/analytics` route + `AnalyticsPage`, sidebar menu item,
  TH/EN i18n keys, removal of the analytics section from `DashboardPage`.
- **Out of scope:** any backend change; any change to `WebAnalyticsSection` or
  its child panels; access-control changes.

## 2. Functional Requirements

| ID | Requirement | Status |
|----|-------------|:------:|
| FR-001 | `web-backoffice` exposes an `/analytics` route behind `AuthGuard` → `BackofficeGuard` → `Layout`, rendering `AnalyticsPage` (`PageHeader` + `WebAnalyticsSection`). | ✅ |
| FR-002 | The sidebar main menu shows an **Analytics** item (`ChartLine` icon) between Dashboard and Projects, with the standard active-state highlight for `/analytics` and sub-paths. | ✅ |
| FR-003 | `DashboardPage` no longer renders `WebAnalyticsSection`; it keeps the KPI stat cards and recent-results table. | ✅ |
| FR-004 | All new UI text is localized via `useLocale()`: `nav.analytics`, `analytics.pageTitle`, `analytics.pageSubtitle` (TH/EN). | ✅ |

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | Access scope is unchanged: the page sits behind the frontend `BackofficeGuard` and the data behind the backend `RequireBackofficeRole("superadmin","staff")` — no new roles, no widened exposure. |
| NFR-002 | `WebAnalyticsSection` and its 47 existing tests remain untouched — the section is a self-contained card reused as-is. |

## 4. Traceability

| Requirement | Implementation | Test |
|-------------|----------------|------|
| FR-001 | `apps/web-backoffice/src/pages/AnalyticsPage.tsx`, `src/router.tsx` | UT-001 in [test-plan.md](./test-plan.md) |
| FR-002 | `apps/web-backoffice/src/components/Sidebar.tsx` | manual (MT-001) |
| FR-003 | `apps/web-backoffice/src/pages/DashboardPage.tsx` | manual (MT-002) |
| FR-004 | `apps/web-backoffice/src/lib/i18n.tsx` | UT-002 |

*Version: 0.1.0*
*Last updated: 4 July 2026*
