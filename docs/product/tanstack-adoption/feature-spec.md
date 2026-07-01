---
isoOutput: SI.O1
version: 0.1.0
lastUpdated: 2026-07-01
author: Sathittham Sangthong
---

# Software Requirements Specification — TanStack Table + Query Adoption

*ISO 29110 Basic Profile · SI.O1 · relates to [CR-003](../../iso29110/change-request-log.md)*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | web-app frontend — table + server-state layer |
| **Version** | 0.1.0 |
| **Status** | Approved |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-01 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | 2026-07-01 |

---

## 1. Introduction

### 1.1 Purpose
Reduce hand-rolled UI plumbing in `apps/web-app` by adopting two headless TanStack libraries:
`@tanstack/react-table` for tabular data and `@tanstack/react-query` for server state. The app already
uses `@tanstack/react-form`; this extends the same family to two areas currently implemented by hand.

### 1.2 Scope
**In scope:**
- Reusable shadcn `DataTable` + `table` primitive built on `@tanstack/react-table`.
- Migrate the AdminPage assessment table to `DataTable` with client-side sorting, pagination, and search.
- Set up `QueryClientProvider` and migrate **one** read-heavy page to `@tanstack/react-query` as a pilot.

**Out of scope (this iteration):**
- Migrating all fetch call sites to Query (follow-up per-page rollout after the pilot).
- Migrating the AdminPage feature-matrix table and user-management tables (assessment table only).
- Removing Redux; Redux is retained for client state.

### 1.3 Definitions

| Term | Definition |
|---|---|
| Server state | Data owned by the backend (assessments, results) fetched over HTTP. Owned by TanStack Query. |
| Client state | UI/session state (auth session, in-progress quiz answers). Owned by Redux Toolkit. |

---

## 2. Functional Requirements

| ID | Requirement |
|---|---|
| FR-001 | The AdminPage assessment table SHALL support click-to-sort on Company, Score, and Date columns. |
| FR-002 | The AdminPage assessment table SHALL paginate client-side (default 10 rows/page) with prev/next controls. |
| FR-003 | The AdminPage assessment table SHALL provide a search box filtering by company name (client-side). |
| FR-004 | Existing behaviour SHALL be preserved: expandable detail rows, responsive hidden columns, server-side industry/size filters, all `data-testid` hooks, and i18n via `useLocale()`. |
| FR-005 | A `QueryClientProvider` SHALL wrap the app; server data on the pilot page SHALL be fetched via `useQuery`, replacing the manual `fetch`+`useState`+`useEffect` pattern. |
| FR-006 | The pilot page SHALL retain identical loading (`Skeleton`) and error UX. |

## 3. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-001 | No native `<select>`/`<dialog>`; shadcn/ui only (per react.md). |
| NFR-002 | All new user-visible strings via `t()` (TH/EN). |
| NFR-003 | `pnpm build`, Biome, `tsc`, and Vitest SHALL pass; existing Playwright e2e SHALL remain green. |
| NFR-004 | The Query/Redux boundary (§1.3) SHALL be documented in `.claude/rules/react.md`. |

## 4. Acceptance Criteria
- AdminPage table sorts, paginates, and searches; expandable rows and filters still work; tests green.
- Pilot page fetches via `useQuery` with unchanged loading/error UX.
- `.claude/rules/react.md` updated to reflect TanStack Query as the server-state convention.
