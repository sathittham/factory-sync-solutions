# Status

> Tracks build progress for the Admin Dashboard feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Known Issues / Future Work](#known-issues--future-work)
- [Related Documents](#related-documents)

---

## Current State

**Shipped end to end, with known rough edges.** The `/admin` page is live in `web-app`
behind `AdminGuard`: the Assessments tab shows stat cards, the enriched assessment table,
expandable dimension-detail rows, and CSV export; the Users tab shows all registered
profiles with a client-side role filter, a detail dialog, and promote/demote via a
confirmation dialog. All five backend endpoints under `/api/v1/admin/` are registered in
`main.go` behind `FirebaseAuth` + `RequireAdmin`.

One item is honestly ⚠️ partial: the assessments tab sends `industryType` / `companySize`
query params, but the backend never reads them — the filter UI is cosmetic. The other
known issues (O(n) `GetAssessment`, duplicated CSV export handler, no pagination,
dual-write divergence risk on role change) are functional-but-suboptimal, tracked in
[README.md § Open Items](./README.md#open-items--future-work).

The spec defines the intended test coverage (feature-spec.md § 15) but does not record
which suites exist or their coverage numbers — no `go test -cover` figure is recorded here
yet.

---

## Build Checklist

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state). Single phase — the
feature shipped as one unit.

- [x] Admin page — `apps/web-app/src/pages/AdminPage.tsx`
- [x] `QuizTab` — inline in `AdminPage.tsx`
- [x] `UsersTab` — inline in `AdminPage.tsx`
- [x] `UserDetailDialog` — inline in `AdminPage.tsx`
- [x] `RoleChangeDialog` — inline in `AdminPage.tsx`
- [x] Backend handler — `apps/backend/services/admin/handler.go`
- [x] Route guard — `apps/web-app/src/components/guards/AdminGuard.tsx`
- [x] Backend route registration — `apps/backend/main.go`
- [ ] Server-side industry/size filter — `admin/handler.go` `ListAssessments` (⚠️ not implemented; filter UI is cosmetic)

### Tests

Intended coverage per [feature-spec.md § 15](./feature-spec.md#15-testing); suite status
is not recorded in the spec — tick and record coverage as verified.

- [ ] Vitest — stat card calculations + `getScoreColor` thresholds
- [ ] Go unit — `parseLimit` (default / clamp / invalid / negative)
- [ ] Go integration — 403 non-admin, 400 invalid role, 404 unknown assessment ID
- [ ] Playwright E2E — guard redirect, tables, row expand, CSV download, dialogs
- [ ] `go test ./services/admin/... -cover` → **n/a — not recorded**

---

## Known Issues / Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Apply `industryType` / `companySize` filters server-side (or client-side on the loaded array)
- [ ] Replace O(n) `GetAssessment` scan with a direct Firestore `Get` by document ID
- [ ] Extract shared `exportAssessmentsCsv` helper (currently duplicated in `AdminPage` + `QuizTab`)
- [ ] Cursor-based pagination for `ListAssessments` and `ListUsers`
- [ ] Mitigate dual-write divergence on `SetUserRole` (retry / reconcile, or claims-first write order)

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [admin-page.md](./admin-page.md) · [admin-api.md](./admin-api.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
