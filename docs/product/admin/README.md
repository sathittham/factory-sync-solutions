# Admin Dashboard — Feature Spec

**Status:** ✅ Shipped — `/admin` page live with Assessments + Users tabs; known gaps tracked in [Open Items](#open-items--future-work) (cosmetic assessment filters, O(n) detail lookup, no pagination).

---

## Table of Contents

1. [App surfaces](#app-surfaces)
2. [Summary](#summary)
3. [Goals & Non-Goals](#goals--non-goals)
4. [Current State](#current-state)
5. [Design Overview](#design-overview)
6. [Security Invariants](#security-invariants)
7. [Acceptance Criteria](#acceptance-criteria)
8. [Testing](#testing)
9. [Open Items & Future Work](#open-items--future-work)
10. [References](#references)

---

> Role-gated operations page for administrators inside `web-app`. Two tabs: **Assessments**
> (all user submissions with stat cards, filters, inline dimension detail, CSV export) and
> **Users** (registered profile list with a detail dialog and promote/demote role
> management). Backed by five endpoints under `/api/v1/admin/`, all behind `FirebaseAuth`
> + `RequireAdmin` (`role == "admin"` custom claim). Bilingual TH/EN via `useLocale()`.

> **Scope note:** this is the *end-user* admin surface (`/admin` in `web-app`, claim
> `role == "admin"`). FactorySync internal staff use the separate backoffice portal
> (`web-backoffice`, claim `backofficeRole`) — new admin capabilities should go there
> unless they are specific to end-user administration. See
> [backoffice/feature-spec.md](../backoffice/feature-spec.md).

This README is the design index for the Admin Dashboard feature. The formal requirements
live in the ISO 29110 SRS — see [feature-spec.md](./feature-spec.md). Each non-trivial
component is documented in a dedicated sub-document; see [References](#references).

---

## App surfaces

| web-app | web-official | backend |
|:-------:|:------------:|:-------:|
| ✅ | — | ✅ |

`web-app` renders the `/admin` page (guarded by `AdminGuard`); the backend serves the five
`/api/v1/admin/` endpoints. Per-app flows live in [user-journeys.md](./user-journeys.md).

---

## Summary

| Component | Description |
|-----------|-------------|
| **`AdminPage`** (web-app) | Page shell: header with CSV export, shadcn `Tabs` (`quiz` default) hosting the two tabs — see [admin-page.md](./admin-page.md) |
| **`QuizTab`** (web-app) | Assessment table with stat cards, industry/size filters, expandable inline detail rows — see [admin-page.md](./admin-page.md) |
| **`UsersTab`** (web-app) | User table with client-side role filter, `UserDetailDialog`, `RoleChangeDialog` for promote/demote — see [admin-page.md](./admin-page.md) |
| **Admin API** (backend) | Five endpoints under `/api/v1/admin/` with profile enrichment and CSV streaming — see [admin-api.md](./admin-api.md) |
| **`AdminGuard`** (web-app) | Route guard: non-admin users navigating to `/admin` are redirected to `/` |

---

## Goals & Non-Goals

### Goals

- Show all assessments enriched with company profile data (company name, industry, size, contact).
- Provide stat cards: total submissions, average score, diagnosis distribution.
- Industry and company-size filter controls in the assessments tab.
- Expandable assessment row that fetches full dimension scores, strengths, and weaknesses on demand.
- CSV export of all assessments (up to 10,000 rows).
- List all registered users with company info and current role.
- Promote / demote a user to/from admin via a confirmation dialog.
- Bilingual (TH/EN) via `useLocale()`; track key admin actions via analytics.

### Non-Goals

- Pagination (all data returned in one request — see [Open Items](#open-items--future-work) for the known limits).
- Editing assessment data or deleting records.
- Creating users (registration is user-initiated via the app).
- Server-side row-level permissions beyond `RequireAdmin`.

---

## Current State

See [status.md](./status.md) for the per-component implementation checklist. Everything in
scope is shipped; the server-side industry/size filter is the one ⚠️ gap (the filter UI is
cosmetic — see [Open Items](#open-items--future-work) #1).

---

## Design Overview

```mermaid
flowchart LR
  subgraph web-app
    G[AdminGuard] --> P[AdminPage]
    P --> QT[QuizTab]
    P --> UT[UsersTab]
  end
  QT -->|"GET /admin/assessments · GET /admin/assessments/{id}"| H[admin handler]
  P -->|"GET /admin/export (raw fetch → CSV blob)"| H
  UT -->|"GET /admin/users · PUT /admin/users/{uid}/role"| H
  H --> RS[result service] --> D[(Firestore)]
  H --> PS[profile service] --> D
  H -->|SetCustomUserClaims| FB[Firebase Auth]
```

The admin service owns no Firestore collection. It reads assessments through the result
service and profiles through the profile service, joining them into `enrichedAssessment`
responses (batched `GetProfilesByUIDs` — one lookup per request, not per row). The only
write is a role change, dual-written to the Firestore profile and Firebase custom claims.
Contract detail in [admin-api.md](./admin-api.md).

### API contract

All endpoints require `Authorization: Bearer {firebase-id-token}` with the
`role == "admin"` custom claim (`FirebaseAuth` + `RequireAdmin`).

| Method | Path | Auth / Role | Purpose |
|--------|------|-------------|---------|
| `GET` | `/api/v1/admin/assessments` | Bearer · admin | List assessments enriched with profile data (`limit` default 100, max 500) |
| `GET` | `/api/v1/admin/assessments/{assessmentId}` | Bearer · admin | Single assessment with `scores`, `strengths`, `weaknesses` (UUIDv4-validated) |
| `GET` | `/api/v1/admin/export` | Bearer · admin | Stream all assessments as CSV (`text/csv`, up to 10,000 rows) |
| `GET` | `/api/v1/admin/users` | Bearer · admin | List all registered profiles (`limit` default 200, max 500) |
| `PUT` | `/api/v1/admin/users/{uid}/role` | Bearer · admin | Promote/demote — dual-writes Firestore profile + Firebase claims |

List responses use the standard envelope `{"success": true, "data": [...], "count": N}`;
errors use `{"success": false, "error": {"code", "message"}}`. The CSV export is the one
deliberate exception — raw `text/csv` with `Content-Disposition: attachment`.

---

## Security Invariants

| Invariant | Where enforced |
|-----------|----------------|
| All five endpoints require a valid Firebase token and `role == "admin"` claim (401 / 403 otherwise) | `middleware/` `FirebaseAuth` + `RequireAdmin` |
| `SetUserRole` reads the target `uid` from the path param — the caller's UID is never used as the target (self-demotion is allowed) | `services/admin/handler.go` |
| `assessmentId` is validated against a UUIDv4 regex before any Firestore read | `services/admin/handler.go` |
| `role` body value must be one of `"user"`, `"manager"`, `"system_admin"`, `"owner"` — anything else is 400 | `services/admin/handler.go` |
| CSV export streams from Firestore — no temp files written to disk | `services/admin/handler.go` |

---

## Acceptance Criteria

Mirrors [feature-spec.md § 14](./feature-spec.md#14-acceptance-criteria):

**Route guard + Assessments tab** — see [admin-page.md](./admin-page.md)
- [x] Non-admin users navigating to `/admin` are redirected to `/` by `AdminGuard`.
- [x] Admin users see the Assessments tab by default on page load.
- [x] Stat cards show correct Total Submissions, Average Score, and Diagnosis Distribution for the loaded data.
- [x] Clicking an assessment row expands an inline detail panel; clicking again collapses it.
- [x] Expanding a row without pre-loaded scores triggers `GET /admin/assessments/{id}`; expanding again uses the cached data.
- [x] CSV Export button triggers a file download named `assessments-YYYY-MM-DD.csv`.

**Users tab** — see [admin-page.md](./admin-page.md)
- [x] Users tab lists all registered users.
- [x] Role filter (All / Admin / User) narrows the displayed rows client-side.
- [x] Clicking a user row opens `UserDetailDialog` with all profile fields.
- [x] Clicking "Promote Admin" / "Demote User" opens `RoleChangeDialog`.
- [x] Confirming a role change calls `PUT /admin/users/{uid}/role` and updates the role badge in the table.
- [x] A success toast appears after a role change; an error toast appears on failure.

**Cross-cutting**
- [x] All text renders in the active locale (TH/EN).
- [ ] `make lint-web` and `make test-api` pass — the spec defines the intended test coverage (§ 15) but does not record suite status; see [status.md](./status.md).

---

## Testing

From [feature-spec.md § 15](./feature-spec.md#15-testing) — intended coverage:

| Level | Target | Cases |
|-------|--------|-------|
| Unit (Vitest — `AdminPage`) | Stat card calculations · `getScoreColor` thresholds | `totalSubmissions` / `avgScore` / `diagnosisCounts` from fixtures; ≥4 emerald · ≥3 blue · ≥2 amber · <2 red |
| Unit (Go) | `parseLimit` | default, max-clamp, invalid string, negative value |
| Integration (`service_test.go`) | Deny paths | 403 for non-admin token; 400 for invalid role value; 404 for unknown UUIDv4 |
| E2E (Playwright) | Full page flows | guard redirect, table visible, row expand, CSV download, users tab, detail dialog |

Verification commands: `make lint-web` · `make test-api`.

---

## Open Items & Future Work

From [feature-spec.md § 11](./feature-spec.md#11-known-issues--open-tasks):

| # | Area | Description |
|---|------|-------------|
| 1 | Backend filters | `industryType` / `companySize` query params are sent by the frontend but never read by the handler — the assessment filter UI is cosmetic. Fix server-side or filter the loaded array client-side |
| 2 | `GetAssessment` O(n) | Fetches all results then linear-scans for the ID; should be a direct Firestore `Get` by document ID |
| 3 | Duplicated export logic | `handleExport` is copy-pasted in `AdminPage` (header) and `QuizTab` (mobile); extract a shared helper |
| 4 | No pagination | Both list endpoints cap at 500 and return everything in one response; add cursor-based pagination (`StartAfter`) |
| 5 | Dual-write risk | If the Firebase claims update fails after the Firestore write, a demoted user keeps admin access until their token expires (~1 h). Future: retry/reconciliation, or reverse the write order |

### Open decisions

None — feature is shipped; changes go through a new CR.

---

## References

### Sub-documents

| Doc | Covers |
|-----|--------|
| [feature-spec.md](./feature-spec.md) | ISO 29110 SRS — formal requirements, full endpoint + i18n detail |
| [status.md](./status.md) | Current implementation status per component |
| [user-journeys.md](./user-journeys.md) | Per-actor flows (admin · non-admin) |
| [admin-page.md](./admin-page.md) | `AdminPage` + tabs + dialogs (web-app) |
| [admin-api.md](./admin-api.md) | Admin endpoints, profile enrichment, CSV export (backend) |
| [mockups/app.md](./mockups/app.md) | ASCII wireframes — both tabs + dialogs (web-app) |

### ISO 29110 artifacts

- Feature predates per-feature test plans; intended coverage is in [feature-spec.md § 15](./feature-spec.md#15-testing).
- Scope changes → [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md)
- New risks → [docs/iso29110/risk-register.md](../../iso29110/risk-register.md)

### Cross-references

- [Auth](../auth/feature-spec.md) — `RequireAdmin` middleware and custom claims
- [Result](../result/feature-spec.md) — assessment model the admin views are built on
- [Backoffice](../backoffice/feature-spec.md) — the separate staff portal (`backofficeRole`)
- [Architecture overview](../../architecture/overview.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
