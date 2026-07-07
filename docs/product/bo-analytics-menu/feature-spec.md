---
isoOutput: SI.O1
version: 0.2.0
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
| **Version** | 0.2.0 |
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
  TH/EN i18n keys, removal of the analytics section from `DashboardPage`;
  per-surface site tabs (FR-005) and the backing `site` query param with GA4
  `hostName` filtering (FR-006). Both surfaces stream into the same GA4
  property (verified against the live Data API on 4 July 2026), so the split
  is a hostname filter, not a second property.
- **Out of scope:** changes to the report/metric definitions themselves;
  access-control changes.

## 2. Functional Requirements

| ID | Requirement | Status |
|----|-------------|:------:|
| FR-001 | `web-backoffice` exposes an `/analytics` route behind `AuthGuard` → `BackofficeGuard` → `Layout`, rendering `AnalyticsPage` (`PageHeader` + `WebAnalyticsSection`). | ✅ |
| FR-002 | The sidebar main menu shows an **Analytics** item (`ChartLine` icon) between Dashboard and Projects, with the standard active-state highlight for `/analytics` and sub-paths. | ✅ |
| FR-003 | `DashboardPage` no longer renders `WebAnalyticsSection`; it keeps the KPI stat cards and recent-results table. | ✅ |
| FR-004 | All new UI text is localized via `useLocale()`: `nav.analytics`, `analytics.pageTitle`, `analytics.pageSubtitle` (TH/EN). | ✅ |
| FR-005 | The analytics section shows site tabs — **All / Official website / Web app** — that refetch every panel scoped to the selected surface (TH/EN labels via `analytics.site.*`). | ✅ |
| FR-006 | The six data endpoints accept `site` ∈ `{all, official, app}` (default `all`). `official`/`app` apply a GA4 `hostName` `inListFilter` (defaults: apex + `www.` vs `app.`; overridable via `GA4_HOSTS_OFFICIAL` / `GA4_HOSTS_APP`); cache entries are keyed per endpoint × range × site; invalid values return `400 VALIDATION_ERROR`. | ✅ |

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | Access scope is unchanged: the page sits behind the frontend `BackofficeGuard` and the data behind the backend `RequireBackofficeRole("superadmin","staff")` — no new roles, no widened exposure. |
| NFR-002 | The report/metric definitions and panel components are unchanged; the site filter composes onto every existing report request, and per-site responses are cached independently so tabs cannot serve each other's data. |

## 4. Traceability

| Requirement | Implementation | Test |
|-------------|----------------|------|
| FR-001 | `apps/web-backoffice/src/pages/AnalyticsPage.tsx`, `src/router.tsx` | UT-001 in [test-plan.md](./test-plan.md) |
| FR-002 | `apps/web-backoffice/src/components/Sidebar.tsx` | manual (MT-001) |
| FR-003 | `apps/web-backoffice/src/pages/DashboardPage.tsx` | manual (MT-002) |
| FR-004 | `apps/web-backoffice/src/lib/i18n.tsx` | UT-002 |
| FR-005 | `components/analytics/WebAnalyticsSection.tsx`, `src/api/backoffice.ts` | UT-F11 |
| FR-006 | `apps/backend/services/analytics/{service,handler,models}.go` | UT-012…UT-014, IT-012 |

*Version: 0.2.0*
*Last updated: 4 July 2026*
