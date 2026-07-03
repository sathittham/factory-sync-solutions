---
isoOutput: SI.O1
version: 0.1.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Draft
---

# Software Requirements Specification — Backoffice GA4 Analytics Dashboard

*ISO 29110 Basic Profile · SI.O1*

> Add a **Web Analytics** section to the backoffice dashboard (`/dashboard` in
> `apps/web-backoffice`) that surfaces Google Analytics 4 (GA4) reporting data —
> traffic, top pages, acquisition channels, and audience — for the public
> marketing site (`web-official`) and the authenticated app (`web-app`). Data is
> read server-side via the **GA4 Data API v1beta** and exposed through a new
> `/api/v1/backoffice/analytics/*` route group, gated by `backofficeRole`.

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice GA4 Analytics Dashboard (`bo-dashboard-ga4`) |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | — |

---

## 0. Open Decisions (confirm before implementation)

These two choices shape the whole design. The spec assumes the **first** option in
each; revise here if you decide otherwise.

| # | Decision | Assumed | Alternatives |
|---|----------|---------|--------------|
| D1 | **Data source** | **GA4 Data API v1beta**, server-side, via a service account — full styling/i18n control, credentials never leave the backend. | (a) Embed a Looker Studio report as an `iframe` — fastest, but limited TH/EN + styling, needs report-share config. (b) Client-side gtag read — not viable (GA4 has no client read API). |
| D2 | **Metrics scope (v1)** | All four groups below, phased: **Traffic overview** first, then **Top pages**, **Acquisition channels**, **Audience (geo + device)**. | Ship only Traffic overview in v1 and defer the rest to v1.1. |

---

## 1. Introduction

### 1.1 Purpose

FactorySync staff currently have no in-product view of how the public site and app
are performing — they must log into the Google Analytics console separately. This
feature embeds a curated GA4 reporting section directly in the backoffice
dashboard so staff can see traffic health, top content, and acquisition at a
glance alongside the existing platform stats (projects, users, avg score, staff).

### 1.2 Scope

**In scope**

- A new **Web Analytics** section on the backoffice `/dashboard` page.
- A backend `/api/v1/backoffice/analytics/*` route group that proxies the GA4
  Data API using a service account, returning `pkg.RespondJSON`-shaped payloads.
- A date-range selector (last 7 / 28 / 90 days) scoped to the section.
- Server-side response caching to stay within GA4 Data API quotas.
- Bilingual (TH/EN) labels; charts via the project's chart primitives.

**Out of scope**

- Real-time (streaming) analytics — batch reporting only.
- Editing GA4 configuration, events, or audiences from the backoffice.
- Per-project / per-tenant analytics segmentation (single GA4 property for v1).
- Changing the existing client-side gtag / Consent Mode tracking in `web-app` /
  `web-official` — this feature only **reads** aggregated data, it does not alter
  collection. See [analytics.ts](../../../apps/web-app/src/lib/analytics.ts).
- Export of GA4 data to CSV (may be added later, mirroring `/backoffice/export`).

### 1.3 Definitions & Abbreviations

| Term | Definition |
|---|---|
| GA4 | Google Analytics 4 — the current Analytics generation. |
| GA4 Data API | `analyticsdata.googleapis.com` v1beta — server-side reporting API (`runReport`, `runRealtimeReport`). |
| Property ID | Numeric GA4 property identifier (e.g. `123456789`) used to build `properties/{GA4_PROPERTY_ID}` for API calls. |
| Service account | A Google IAM identity (JSON key) granted **Viewer** on the GA4 property, used by the backend to call the Data API. |
| Metric | A quantitative GA4 measurement (`activeUsers`, `sessions`, `screenPageViews`, …). |
| Dimension | A qualitative GA4 attribute (`pagePath`, `sessionDefaultChannelGroup`, `country`, `deviceCategory`, `date`). |
| Channel group | GA4's default grouping of traffic sources (Organic Search, Direct, Referral, Social, …). |

### 1.4 References

| Document | Link |
|---|---|
| Backoffice feature spec | [backoffice/feature-spec.md](../backoffice/feature-spec.md) |
| Client analytics / Consent Mode | [web-app/src/lib/analytics.ts](../../../apps/web-app/src/lib/analytics.ts) |
| Backoffice dashboard page | [DashboardPage.tsx](../../../apps/web-backoffice/src/pages/DashboardPage.tsx) |
| Backoffice service | [services/backoffice/](../../../apps/backend/services/backoffice/) |
| Go backend rules | [.claude/rules/go.md](../../../.claude/rules/go.md) |
| GA4 Data API (external) | https://developers.google.com/analytics/devguides/reporting/data/v1 |

---

## 2. Overall Description

### 2.1 Product Context

The feature spans one backend service and one frontend page:

```
web-backoffice /dashboard
  └─ <WebAnalyticsSection>            ← new; date-range + stat cards + charts
       │  GET /api/v1/backoffice/analytics/overview?range=28d
       │  GET /api/v1/backoffice/analytics/top-pages?range=28d
       │  GET /api/v1/backoffice/analytics/channels?range=28d
       │  GET /api/v1/backoffice/analytics/audience?range=28d
       ▼
apps/backend  services/backoffice (extended) OR services/analytics (new)
       │  Bearer + RequireBackofficeRole("superadmin","staff")
       │  in-memory TTL cache (per range key)
       ▼
GA4 Data API v1beta  (runReport)   ← service account, Viewer on the property
```

The section reuses the existing dashboard data-fetch pattern (`useEffect` +
`Promise.all` + skeletons) and the backoffice API client (`backofficeApi`).

### 2.2 User Classes & Characteristics

| User Class | Description | Access Level |
|---|---|---|
| Backoffice Staff | Internal user with `backofficeRole: "staff"` | `staff` |
| Super Admin | Internal user with `backofficeRole: "superadmin"` | `superadmin` |

Both roles may view analytics (read-only). No superadmin-only gating in v1 — the
data is aggregate and non-PII. *(Flip `analytics.*` routes to superadmin-only if
you prefer to restrict; noted as an option under §9.)*

### 2.3 Assumptions & Dependencies

- A single GA4 property covers the sites to report on (or one property whose data
  streams include both `web-official` and `web-app`). Multi-property is out of
  scope for v1.
- A Google service-account JSON key with **Viewer** on the GA4 property is
  provisioned and injected as a backend secret (see §6.3).
- The Go GA4 Data API client library (`google.golang.org/api/analyticsdata/v1beta`
  or `cloud.google.com/go/analytics/data/apiv1beta`) is added to `go.mod`.
- GA4 Data API quotas are shared per property; caching (§6.2) is required to avoid
  `RESOURCE_EXHAUSTED` under normal dashboard traffic.

### 2.4 Constraints

- Must follow project conventions: `pkg.RespondJSON` / `pkg.RespondError`,
  shadcn/ui, `useLocale()`, `formatDateTime()`.
- No hardcoded strings — all UI text via i18n (TH/EN).
- The GA4 service-account key is a **secret** — loaded from an env var, never
  committed (`.env*` is git-ignored; keep it that way).
- Errors wrapped with `fmt.Errorf("context: %w", err)`; domain sentinel errors
  per service (e.g. `ErrAnalyticsUnavailable`, `ErrAnalyticsUpstream`).
- UID always from `middleware.GetUID(r)`; never accept a property ID or UID from
  the request body — the property ID is server-side config.

---

## 3. Functional Requirements

### 3.1 Traffic Overview

#### FR-001 — Traffic overview stat cards

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Backoffice staff (product owner) |
| **Test Case** | TC-001 |

**Description:** The system shall display GA4 traffic totals for the selected date
range as stat cards: **active users**, **sessions**, **page views**, and **average
engagement time**.

**Acceptance Criteria:**
- Given a valid GA4 property and a signed-in backoffice user, when the dashboard
  loads with the default range (28 days), then the four cards show numeric totals
  from `GET /api/v1/backoffice/analytics/overview?range=28d`.
- Given the GA4 upstream is unreachable, when the section loads, then the cards
  show an inline error state (not a full-page failure) and the rest of the
  dashboard still renders.
- `avgEngagementTimeSec` in totals is calculated as
  `userEngagementDuration / sessions` and returned in seconds (`0` if `sessions=0`).

#### FR-002 — Traffic time-series chart

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Backoffice staff |
| **Test Case** | TC-002 |

**Description:** The system shall render a daily time-series line/area chart of
active users (and sessions) over the selected range.

**Acceptance Criteria:**
- Given range = 28d, when data loads, then the chart plots one point per day with
  a localized date axis (`formatDateTime`, Buddhist Era in TH).
- Given zero traffic in the range, when data loads, then the chart shows an empty
  state (`common.noData`) rather than an error.

#### FR-003 — Date-range selector

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Backoffice staff |
| **Test Case** | TC-003 |

**Description:** The system shall provide a range selector (shadcn `Select`) with
**Last 7 days**, **Last 28 days**, **Last 90 days**; changing it re-queries all
analytics endpoints with the new `range` param.

**Acceptance Criteria:**
- Given the selector is changed to 7d, when the change is applied, then all four
  analytics panels refetch with `range=7d` and show loading skeletons while
  pending.
- Given an invalid/unknown range value, when sent to the API, then the backend
  rejects it with `400 VALIDATION_ERROR` (only `7d`, `28d`, `90d` accepted).
- Given ranges are computed on a request, when the backend computes GA4 dates, then
  it uses UTC day boundaries and sends inclusive `DateRange` values in
  `YYYY-MM-DD` format for GA4 (`endDate` = today UTC, `startDate` = endDate - N + 1).

### 3.2 Top Pages

#### FR-004 — Top pages table

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | Backoffice staff |
| **Test Case** | TC-004 |

**Description:** The system shall list the top page paths by views for the range,
with columns **page path**, **views**, and **avg engagement time**, limited to the
top 10.

**Acceptance Criteria:**
- Given data exists, when the panel loads, then rows are ordered by views
  descending and limited to 10.
- Given metric raw values returned from GA4, then `avgEngagementTimeSec` is derived
  as `userEngagementDuration / screenPageViews` in backend for UI display (`0` if
  `screenPageViews=0`).
- Given a very long path, when rendered, then it truncates with the full value in
  a tooltip.

### 3.3 Acquisition Channels

#### FR-005 — Channel breakdown

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | Backoffice staff |
| **Test Case** | TC-005 |

**Description:** The system shall show sessions grouped by GA4 default channel
group (Organic Search, Direct, Referral, Social, …) as a bar or donut chart with a
percentage breakdown.

**Acceptance Criteria:**
- Given data exists, when the panel loads, then each channel shows its session
  count and share of total.

### 3.4 Audience (Geography & Devices)

#### FR-006 — Geography & device breakdown

| Field | Value |
|---|---|
| **Priority** | Nice to Have |
| **Source** | Backoffice staff |
| **Test Case** | TC-006 |

**Description:** The system shall show sessions by **country** (top 10) and by
  **device category** (desktop / mobile / tablet).

**Acceptance Criteria:**
- Given data exists, when the panel loads, then top 10 countries and the three
  device categories render with session counts.

### 3.5 Cross-cutting

#### FR-007 — Graceful degradation & auth

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Engineering |
| **Test Case** | TC-007 |

**Description:** Analytics endpoints shall require `backofficeRole`; a failure in
the GA4 upstream shall never break the rest of the dashboard.

**Acceptance Criteria:**
- Given an unauthenticated request, when hitting any `/api/v1/backoffice/analytics/*`
  route, then the API returns `401 UNAUTHORIZED`.
- Given a user without `backofficeRole`, then the API returns `403 FORBIDDEN`.
- Given GA4 returns a quota or upstream error:
  - If a cached payload exists, then the API returns `200` with `stale: true` and
    the last successful payload; the frontend shows inline data and a retry-able
    warning.
  - If no cached payload exists, then the API returns `503` with code
    `ANALYTICS_UNAVAILABLE` and the frontend shows a retry-able inline error for
    the section only.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Analytics endpoints respond ≤ 500ms (p95) **on cache hit**; cold GA4 calls
      may take longer and MUST be cached (§6.2).
- [ ] Dashboard first paint is not blocked by analytics — the section loads
      independently of the existing stats/results fetch.

### 4.2 Security
- [ ] All `/api/v1/backoffice/analytics/*` routes require Firebase Auth + `RequireBackofficeRole`.
- [ ] GA4 service-account key loaded from env/secret manager, never committed.
- [ ] Property ID is server-side config — never accepted from the client.
- [ ] Returned data is aggregate/non-PII; no user identifiers exposed.

### 4.3 Usability
- [ ] Bilingual (TH/EN) — all labels via `useLocale()`.
- [ ] Responsive — cards stack on mobile; charts scroll within their container.
- [ ] Accessible — WCAG 2.1 AA contrast; chart series have text/table fallbacks.

### 4.4 Reliability
- [ ] GA4 upstream failure returns cached data with `stale: true` when cache exists.
- [ ] If no cache exists, upstream failure returns `503 ANALYTICS_UNAVAILABLE`.
- [ ] Cache serves the last successful payload on transient upstream errors where
      feasible (stale-while-error).

### 4.5 Maintainability
- [ ] No nested ternaries; no dead code.
- [ ] All errors wrapped: `fmt.Errorf("context: %w", err)`.
- [ ] Sentinel errors defined per service (`ErrAnalyticsUnavailable`, `ErrAnalyticsUpstream`).
- [ ] GA4 report definitions (metrics/dimensions per endpoint) centralized in one
      place for easy tuning.

---

## 5. Interface Requirements

### 5.1 API Endpoints — `/api/v1/backoffice/analytics/`

All routes require `Authorization: Bearer {firebase-id-token}` and
`backofficeRole ∈ {"superadmin","staff"}`. `range` query param ∈ `{7d, 28d, 90d}`
(default `28d`).

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/v1/backoffice/analytics/overview` | staff+ | Totals (active users, sessions, page views, avg engagement time) + daily series |
| GET | `/api/v1/backoffice/analytics/top-pages` | staff+ | Top 10 page paths by views |
| GET | `/api/v1/backoffice/analytics/channels` | staff+ | Sessions by default channel group |
| GET | `/api/v1/backoffice/analytics/audience` | staff+ | Sessions by country (top 10) and device category |

Response shape follows `pkg.RespondJSON` → `{ "success": true, "data": … }`.
All analytics responses include `stale` (boolean, always present) in `data`.

**Example — `GET /api/v1/backoffice/analytics/overview?range=28d`:**
```json
{
  "success": true,
  "data": {
    "range": "28d",
    "stale": false,
    "totals": {
      "activeUsers": 1843,
      "sessions": 2571,
      "pageViews": 8420,
      "avgEngagementTimeSec": 74.3
    },
    "series": [
      { "date": "2026-06-06", "activeUsers": 61, "sessions": 88 },
      { "date": "2026-06-07", "activeUsers": 55, "sessions": 79 }
    ]
  }
}
```

**Error — GA4 unreachable (no cache):**
```json
{ "success": false, "error": { "code": "ANALYTICS_UNAVAILABLE", "message": "analytics temporarily unavailable" } }
```

### 5.2 UI Screens / Routes

| Route | Guard | Description |
|---|---|---|
| `/dashboard` | `BackofficeGuard` | Existing page; gains a **Web Analytics** section below the stat cards + recent results |

No new route — the feature is a section (component) on the existing dashboard.

### 5.3 External Interfaces
- **GA4 Data API v1beta** (`analyticsdata.googleapis.com`) — `runReport` calls
  from the backend using a service account with Viewer on the property.

---

## 6. Data Requirements

### 6.1 Firestore Collections

None. This feature reads from the GA4 Data API and holds only an in-process cache;
it does not persist analytics data in Firestore.

### 6.2 Caching

- In-memory TTL cache keyed by `endpoint + range` (e.g. `overview:28d`).
- Suggested TTL: **15 minutes** (GA4 data is not real-time; batch tables update on
  a delay anyway). Configurable via `GA4_CACHE_TTL`.
- On upstream error, serve the last good cached payload if present with
  `stale: true` (stale-while-error) before falling back to `503`.

### 6.3 Configuration / Secrets

| Env var | Purpose |
|---|---|
| `GA4_PROPERTY_ID` | Numeric GA4 property id (e.g. `123456789`); backend constructs `properties/{GA4_PROPERTY_ID}` for API calls |
| `GA4_SA_CREDENTIALS_JSON` (or `GOOGLE_APPLICATION_CREDENTIALS` path) | Service-account key with Viewer on the property |
| `GA4_CACHE_TTL` | Optional cache TTL override (default `15m`) |

### 6.4 GA4 report definitions (per endpoint)

| Endpoint | Metrics | Dimensions | Order / limit |
|---|---|---|---|
| overview (totals) | `activeUsers`, `sessions`, `screenPageViews`, `userEngagementDuration` | — | include computed `avgEngagementTimeSec = userEngagementDuration / sessions` |
| overview (series) | `activeUsers`, `sessions` | `date` | by `date` asc |
| top-pages | `screenPageViews`, `userEngagementDuration` | `pagePath` | by views desc, limit 10; include computed `avgEngagementTimeSec = userEngagementDuration / screenPageViews` |
| channels | `sessions` | `sessionDefaultChannelGroup` | by sessions desc, limit 10 |
| audience | `sessions` | `country`, `deviceCategory` (two reports) | by sessions desc, country top 10 |

---

## 7. Backend Service Structure

**Recommended:** a small new service `apps/backend/services/analytics/` (keeps GA4
client + caching isolated), wired under the backoffice route group. Alternatively,
extend `services/backoffice/` if you prefer to avoid a new service.

```
services/analytics/
├── handler.go   — HTTP handlers for /api/v1/backoffice/analytics/* (parse range, call service, respond)
├── service.go   — GA4 Data API client calls, report definitions, TTL cache
├── models.go    — OverviewResponse, TopPagesResponse, ChannelsResponse, AudienceResponse
└── service_test.go — table-driven tests with a mocked GA4 client
```

Sentinel errors: `ErrAnalyticsUnavailable`, `ErrAnalyticsUpstream`, `ErrInvalidRange`.

Route wiring in `main.go` (nested under existing backoffice group):
```go
r.Route("/api/v1/backoffice", func(r chi.Router) {
    r.Use(middleware.FirebaseAuth(authClient))
    r.Use(middleware.RequireBackofficeRole(authClient, "superadmin", "staff"))
    backoffice.Handler.Routes(r)
    r.Route("/analytics", func(r chi.Router) {
        r.Get("/overview", analyticsHandler.GetOverview)
        r.Get("/top-pages", analyticsHandler.GetTopPages)
        r.Get("/channels", analyticsHandler.GetChannels)
        r.Get("/audience", analyticsHandler.GetAudience)
    })
})
```

The GA4 client is constructed once at startup from `GA4_SA_CREDENTIALS_JSON` and
injected into the service (testable via an interface so `service_test.go` can mock
`runReport`).

---

## 8. Frontend Structure

```
web-backoffice/src/
├── api/
│   ├── backoffice.ts      — add getAnalyticsOverview / TopPages / Channels / Audience(range)
│   └── types.ts           — add AnalyticsOverview, TopPage, Channel, Audience types
├── components/analytics/
│   ├── WebAnalyticsSection.tsx  — owns range state, fetches all four, lays out panels
│   ├── TrafficOverview.tsx      — stat cards + time-series chart
│   ├── TopPagesTable.tsx
│   ├── ChannelsChart.tsx
│   └── AudiencePanel.tsx
└── pages/DashboardPage.tsx      — render <WebAnalyticsSection /> below existing content
```

- Follows the existing dashboard fetch pattern: `useEffect` + `Promise.all`,
  `cancelled` guard, `Skeleton` while loading, inline error text on failure.
- Charts use the project's chart primitives (shadcn `Chart` / Recharts — add the
  `chart` component via `/shadcn` if not yet present in `web-backoffice`).
- Range state lives in `WebAnalyticsSection`; changing it refetches all panels.
- New i18n keys under an `analytics.*` namespace in `web-backoffice/src/lib/i18n.tsx`.

**Illustrative layout (dashboard, below existing sections):**
```
┌──────────────────────────────────────────────────────────────┐
│  Web Analytics                          [Last 28 days ▾]      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐         │
│  │ Users  │ │Sessions│ │ Views  │ │ Avg engagement │         │
│  └────────┘ └────────┘ └────────┘ └────────────────┘         │
│  [ daily active-users / sessions line chart ]                 │
│                                                               │
│  Top Pages                    Channels                        │
│  [path · views · avg time]    [donut: organic/direct/…]       │
│                                                               │
│  Audience                                                     │
│  [top countries]   [device: desktop / mobile / tablet]        │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Security

- All `/api/v1/backoffice/analytics/*` routes sit behind `FirebaseAuth` +
  `RequireBackofficeRole` — unauthenticated → 401, no claim → 403. Cloudflare
  Access adds the network-layer gate on `backoffice.factorysync.com`.
- The GA4 service-account key is a backend secret; the browser never sees it and
  never talks to GA4 directly.
- The GA4 property ID is server-side config — the client cannot query an arbitrary
  property.
- Returned payloads are aggregate, non-PII (counts, paths, channels, country,
  device) — no user identifiers.
- **Option:** to restrict analytics to leadership only, nest a
  `RequireBackofficeRole(authClient, "superadmin")` on the `/analytics` subrouter.
  Default in this spec is staff+.

---

## 10. Acceptance Criteria

### Section & data
- [ ] The dashboard shows a **Web Analytics** section below existing stats/results.
- [ ] Overview cards show active users, sessions, page views, and avg engagement
      time for the selected range.
- [ ] The time-series chart plots daily active users/sessions with localized dates.
- [ ] Top Pages lists the top 10 paths by views with avg engagement time.
- [ ] Channels shows sessions by default channel group with percentages.
- [ ] Audience shows top countries and device-category breakdown.

### Range & state
- [ ] Range selector offers 7 / 28 / 90 days; changing it refetches all panels
      with the new `range` param and shows skeletons while loading.
- [ ] Invalid `range` values are rejected server-side with `400 VALIDATION_ERROR`.

### Auth & resilience
- [ ] Unauthenticated requests to analytics endpoints → 401; no-claim → 403.
- [ ] GA4 upstream failure:
  - With cache hit, section renders cached payload (`stale: true`) and a retry-able warning.
  - With no cache, returns `503 ANALYTICS_UNAVAILABLE` and shows an inline retry-able error while the rest of the dashboard renders normally.
- [ ] Repeated loads within the cache TTL do not issue new GA4 calls.

### General
- [ ] All text renders in the active locale (TH/EN) via `useLocale()`.
- [ ] `tsc --noEmit` and `biome check` pass for `web-backoffice`.
- [ ] `make test-api` passes (new `analytics` service tests, GA4 client mocked).
- [ ] No secrets committed; GA4 key loaded from env only.

---

## 11. Data Requirements Validation

- `range` must be one of `7d`, `28d`, `90d` (backend-enforced allowlist).
- `top-pages` limit fixed to 10 server-side (not client-controlled in v1).
- Country top-10 and device (desktop/mobile/tablet) lists are bounded server-side
  to avoid oversized payloads.

---

## 12. Traceability Matrix

| Requirement | Design Reference | Test Case | Status |
|---|---|---|---|
| FR-001 Overview cards | §5.1 overview, §7 | TC-001 | Verified (unit + component; E2E deferred) |
| FR-002 Time-series | §6.4 overview series, §8 | TC-002 | Verified (unit + component; E2E deferred) |
| FR-003 Date range | §5.1, §3.1 | TC-003 | Verified (unit + component; E2E deferred) |
| FR-004 Top pages | §5.1 top-pages, §6.4 | TC-004 | Verified (unit + component; E2E deferred) |
| FR-005 Channels | §5.1 channels, §6.4 | TC-005 | Verified (unit + component; E2E deferred) |
| FR-006 Audience | §5.1 audience, §6.4 | TC-006 | Verified (unit + component; E2E deferred) |
| FR-007 Auth & degradation | §9, §4.4 | TC-007 | Verified (unit + component; E2E deferred) |

*Update status: Not Started / In Progress / Implemented / Verified.*

---

## 13. Implementation Phasing

| Phase | Scope |
|---|---|
| P1 | Backend `analytics` service + `overview` endpoint + service-account wiring + cache; frontend `TrafficOverview` (cards + chart) + range selector. |
| P2 | `top-pages` + `channels` endpoints and panels. |
| P3 | `audience` endpoint + panel. |
| P4 (optional) | CSV export, per-source segmentation, realtime tile. |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Initial draft |

---

*Version: 0.1.0*
*Last updated: 3 July 2026*
