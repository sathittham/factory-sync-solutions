---
isoOutput: PM.O1 (Change Control)
version: 1.2.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
---

# Change Request Log — FactorySync Solutions

*ISO 29110 Basic Profile · PM.O1 component*

Log every change to approved scope, architecture, or accepted requirements here.
Routine bugfixes and small refactors within agreed scope do NOT require a CR.

**Status values:** Draft → Under Review → Approved → Implemented → Rejected / Withdrawn

---

## Change Request Template

Copy this block and add to the Active section:

```markdown
### CR-NNN | [Short title] | [Status]

| Field | Value |
|---|---|
| **Date Raised** | YYYY-MM-DD |
| **Raised By** | [name] |
| **Type** | Scope change / Architecture change / Requirements change / Process change |
| **Priority** | Low / Medium / High |

**Description:**
[What needs to change and why]

**Impact Analysis:**
- Schedule: [e.g. +3 days]
- Effort: [e.g. ~4 hours]
- Risk: [any new risks?]
- Affected components: [e.g. backend/services/quiz, web-app/pages/QuizPage]

**Decision:**
- [ ] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** YYYY-MM-DD
**Decision By:** [name]

**Implementation Notes:**
[PR / commit / branch where implemented, if approved]
```

---

## Active Change Requests

### CR-007 | Backoffice Analytics Menu (relocate GA4 UI) | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-07-04 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change (UI relocation — frontend only) |
| **Priority** | Low |

**Description:**
Move the CR-006 GA4 web-analytics UI from a section at the bottom of the
backoffice `/dashboard` to a dedicated `/analytics` page with its own "Analytics"
sidebar menu item. `WebAnalyticsSection`, its panels, and the backend
`/api/v1/backoffice/analytics/*` API are reused untouched.

**Impact Analysis:**
- Schedule: 0 (same iteration)
- Effort: ~1 hour
- Risk: none — additive route + section removal; access scope unchanged
  (frontend `BackofficeGuard`, backend `RequireBackofficeRole("superadmin","staff")`).
- Affected components: `apps/web-backoffice` (router, Sidebar, DashboardPage,
  new AnalyticsPage, i18n).

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-07-04
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/bo-analytics-menu/feature-spec.md](../product/bo-analytics-menu/feature-spec.md)
- Branch: `feature/bo-analytics-menu` — implemented 2026-07-04; 49 web-backoffice
  tests green (2 new `AnalyticsPage` tests); type-check + Biome clean.
- 2026-07-04 — Scope addition FR-005/FR-006 (SRS v0.2.0): per-surface site tabs
  (All / Official website / Web app) + `site` query param on the six data
  endpoints with GA4 `hostName` `inListFilter` (env-overridable hosts) and
  per-site cache keys. Both surfaces verified to stream into the shared GA4
  property. Backend 87.6% coverage, frontend 50 tests, all green.

### CR-006 | Backoffice GA4 Analytics Dashboard | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-07-03 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change (new backoffice dashboard section + backend service) |
| **Priority** | Medium |

**Description:**
Add a Web Analytics section to the backoffice `/dashboard` surfacing GA4 reporting
data (traffic overview, top pages, acquisition channels, audience) for the public
site and app, backed by a new `apps/backend/services/analytics` GA4 Data API proxy
with in-memory TTL cache and stale-while-error fallback. CR numbered 006 because
CR-004/005 are raised on the parallel `feature/chatbot-core` branch.

**Impact Analysis:**
- Schedule: 0 (same iteration)
- Effort: ~1 day
- Risk: GA4 Data API quota exhaustion — mitigated by 15m TTL cache (R-014 candidate);
  new runtime secrets (`GA4_PROPERTY_ID`, `GA4_SA_CREDENTIALS_JSON`) must be provisioned
  per environment — service degrades gracefully (503 `ANALYTICS_UNAVAILABLE`) if unset.
- Affected components: `apps/backend/services/analytics` (new), `apps/backend/main.go`,
  `apps/web-backoffice` dashboard + analytics components.

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-07-03
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/bo-dashboard-ga4/feature-spec.md](../product/bo-dashboard-ga4/feature-spec.md)
- Branch: `feature/bo-dashboard-ga4` — Phase 1 (all four endpoints + dashboard section) implemented
  with backend coverage 84.3% and frontend analytics coverage 97.6%; Playwright E2E deferred
  (no Playwright infra in `web-backoffice` yet — tracked in status.md as follow-up).
- 2026-07-04 — Scope addition FR-008 (SRS v0.2.0): fifth endpoint
  `/analytics/engagement` (DAU/WAU/MAU rolling actives + stickiness) +
  `EngagementPanel`; verified same day (backend 86.3%, frontend analytics
  96.96% stmts). Local dev GA4 provisioned (property + SA Viewer);
  staging/prod env still pending.
- 2026-07-04 — Scope addition FR-009 + FR-010 (SRS v0.3.0): `/analytics/sources`
  (top-10 `sessionSourceMedium` with share) + `SourcesTable`, and
  `/analytics/meta` (property ID) powering an "Open in Google Analytics" console
  deep link. Verified same day (backend 87.6%, frontend analytics 97.42% stmts);
  `sessionSourceMedium` validated against the live Data API.

### CR-003 | Adopt TanStack Table + Query in web-app | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-07-01 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Architecture change (frontend server-state + table layer) |
| **Priority** | Medium |

**Description:**
Adopt two TanStack libraries in `apps/web-app` to replace hand-rolled patterns:
1. **`@tanstack/react-table`** — drive the AdminPage assessment table (headless), adding client-side
   sorting, pagination, and search while preserving the existing bespoke row markup, expandable detail
   rows, responsive columns, and `data-testid` hooks. Introduces a reusable shadcn `DataTable` +
   `table` primitive under `components/ui/`.
2. **`@tanstack/react-query`** — introduce server-state management to replace the hand-rolled
   `fetch` + `useState(loading/error)` + `useEffect` pattern (8 files). Piloted on one read-heavy page
   first; Redux is retained for genuine client state (auth session, in-progress quiz answers).

**Impact Analysis:**
- Schedule: 1 iteration (Table migration + Query pilot).
- Effort: ~1 day.
- Risk: (1) AdminPage is a 1,523-line critical page — mitigated by keeping markup/testids intact and
  verifying with build + Vitest + Playwright; (2) TanStack Query overlaps Redux for server state —
  mitigated by a clear boundary (Query owns server data, Redux owns client state) and a single-page pilot
  before wider rollout; (3) supersedes the "use RTK Query for API calls" guidance in
  `.claude/rules/react.md` — rule file updated as part of this CR.
- Affected components: `apps/web-app/src/pages/AdminPage.tsx`, `apps/web-app/src/components/ui/`,
  `apps/web-app/src/main.tsx` (QueryClientProvider), one pilot page, `.claude/rules/react.md`.

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-07-01
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/tanstack-adoption/feature-spec.md](../product/tanstack-adoption/feature-spec.md)
- Pilot (v0.12.0): AdminPage assessment table → `DataTable`; assessment list/detail → `useQuery`.
- Wider rollout (this change): server-state fetching moved to TanStack Query across the app —
  `useQuery` for results, quiz list, quiz questions, admin user list, and profile activity;
  `useMutation` for quiz submit, admin role/invite/cancel/resend, and avatar upload/delete;
  AdminPage users table migrated to `DataTable`. The `result` Redux slice was **retired** and the
  `quiz` slice trimmed to client state only (in-progress answers/step) — per the rule "do not mirror
  server data into Redux". Shared query hooks live in `apps/web-app/src/lib/queries.ts`; server-data
  types in `apps/web-app/src/lib/types.ts`. The static permissions matrix (`PermissionsDialog`) stays
  a plain `<table>` — it is a fixed reference grid, not fetched/sortable data. `PUT /profile` form
  submits stay on TanStack Form (already compliant; profile is auth/client state).

**Addendum (2026-07-02) — profile server-state reclassification:**
Review of the rollout found the profile is genuinely server state that was being
mirrored into Redux and written via three duplicated raw `api.put('/profile')`
calls — revising the earlier "profile is auth/client state" position above.
Migration is staged to protect the auth-critical read path:
- **Phase 1 — done** (commit `e772805`): writes centralized in
  `useUpdateProfileMutation` (`lib/queries.ts`). Redux remains the profile source
  of truth for the 4 route guards and the `useAuth` bootstrap; the hook syncs the
  fresh copy back via `setProfile` on success — no dual-mirror. Verified: tsc +
  Biome clean, Vitest 80/80.
- **Phase 2 — planned** (separate branch/PR, needs live Firebase to verify auth
  flows): introduce `useProfileQuery` (`queryKey: ['profile']`, `select` runs
  `normalizeProfile`, 404 ⇒ not-registered); extract `isAdmin`/`isRegistered`/
  `canManageUsers`/`canManageCompanySettings` into pure selectors; migrate the ~18
  consumers + guards; move `useAuth` bootstrap and company-switching to
  `queryClient.setQueryData(['profile'], …)`; trim `authSlice` to session only.

---

### CR-002 | Official site restructure (multi-page IA) | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-06-30 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change / Architecture change (public site routing) |
| **Priority** | High |

**Description:**
Restructure `apps/web-official` from a single-page landing (8 anchor sections + 4 flat service pages) into
a multi-page marketing site: Home, a 3-page About section, a 4-group Services mega menu (2 hubs + 13 detail
pages, nested slugs), a CMS-backed Knowledge Hub (8 categories), a Contact page, and a persistent
free-health-check floating CTA. This is a **breaking change** to public routing and supersedes the
current-site spec (now the baseline in feature-spec.md §2.5).

**Impact Analysis:**
- Schedule: phased (5 phases, sitemap.md §9); estimate per phase TBD.
- Effort: largest in Phase 3 (services taxonomy + 13 pages) and Phase 4 (Knowledge Hub).
- Risk: (1) breaks 3 legacy service slugs → 301 redirects required (FR-006);
  (2) Phase 4 depends on `feature/web-cms-sonicjs` exposing build-time article data.
  Q4 (flagship marketing page + deep-link CTA) and Q5 (uniform template) resolved 2026-06-30 — Phase 3 unblocked.
- Affected components: `apps/web-official/src/{pages,components,content,lib}`, `astro.config.mjs`;
  build-time read from `apps/web-cms`.

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-06-30
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/official-site/feature-spec.md](../product/official-site/feature-spec.md)
- SDD: [docs/architecture/official-site-restructure-design.md](../architecture/official-site-restructure-design.md)
- IA: [docs/product/official-site/sitemap.md](../product/official-site/sitemap.md) · Status: [status.md](../product/official-site/status.md)

---

## Closed Change Requests

### CR-001 | Add ISO 29110 quiz variant | Implemented

| Field | Value |
|---|---|
| **Date Raised** | 2026-06-11 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change (new quiz variant + compliance artifacts) |
| **Priority** | High |

**Description:**
Add ISO 29110 Basic Profile as a fifth quiz variant. Also create the compliance artifact set (PM.O1–O3, SI.O1–O8 templates) to bring the project itself into ISO 29110 compliance.

**Impact Analysis:**
- Schedule: 0 (same iteration)
- Effort: ~4 hours
- Risk: None — additive change, no existing code modified beyond main.go registration
- Affected components: `apps/backend/config/`, `apps/backend/main.go`, `docs/`

**Decision:** Approved — proceed
**Decision Date:** 2026-06-11
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- `apps/backend/config/questions-iso29110.json` created (38 questions, 8 dimensions)
- `apps/backend/main.go` updated to register iso29110 config
- `docs/iso29110/` directory created with all compliance artifacts
