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

**Shipped end to end, and grown past the original scope.** The `/admin` page is live in
`web-app` behind `AdminGuard`: the Assessments tab shows stat cards, the enriched
assessment table (via the shared `DataTable`), expandable dimension-detail rows, and CSV
export; the Users tab shows all registered profiles plus pending invitations, a
client-side role filter, a detail dialog, promote/demote via a confirmation dialog, and
an **Invite Member** dialog with resend/cancel actions for pending invites.

Backend-side, the original five `/api/v1/admin/*` endpoints (`RequireAdmin` — Firebase
custom claim) are joined by a second `/api/v1/manage/*` route group
(`RequireFirestoreRole("owner", "system_admin", "admin")`) added for the invitation
workflow: `ListUsers` and `SetUserRole` are now reachable from both groups, and
`InviteMember` / `CancelInvitation` / `ResendInvitation` are `/manage`-only. `POST
/api/v1/invitations/accept` sits outside both groups (authenticated only — an invited
user has no profile/role yet).

Three items previously tracked here as open have been fixed since the last pass:

- The assessments tab's `industryType` / `companySize` filters are now applied
  (in-memory, post-enrichment) — no longer cosmetic.
- `GetAssessment` now calls `resultSvc.GetResultByID` directly instead of scanning
  `ListResults` — no longer O(n).
- The role-change dual write is now claims-first, Firestore-second (reversed from the
  original order) — closes most of the staleness window described in Known Issue #5.

The remaining known issues (duplicated CSV export handler, no pagination, and the
`/admin` vs `/manage` route overlap) are functional-but-suboptimal, tracked in
[README.md § Open Items](./README.md#open-items--future-work).

---

## Build Checklist

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] Admin page — `apps/web-app/src/pages/AdminPage.tsx`
- [x] `QuizTab` — inline in `AdminPage.tsx`, server state via TanStack Query
- [x] `UsersTab` — inline in `AdminPage.tsx`, server state via TanStack Query
- [x] `UserDetailDialog` — inline in `AdminPage.tsx`
- [x] `RoleChangeDialog` — inline in `AdminPage.tsx`
- [x] `InviteMemberDialog` — inline in `AdminPage.tsx`
- [x] Pending-invite row state (badge, resend, cancel) — inline in `AdminPage.tsx`
- [x] Backend handler — `apps/backend/services/admin/handler.go`
- [x] Route guard — `apps/web-app/src/components/guards/AdminGuard.tsx` (`canManageUsers()`, not a bare `role === "admin"` check)
- [x] Backend route registration — `apps/backend/main.go` (`/admin` + `/manage` groups)
- [x] Server-side industry/size filter — `admin/handler.go` `ListAssessments` (fixed — in-memory post-enrichment filter)
- [x] Direct-`Get` `GetAssessment` — `admin/handler.go` (fixed — calls `resultSvc.GetResultByID`)
- [x] Claims-first dual write on `SetUserRole` — `admin/handler.go` (fixed — order reversed)

### Tests

- [x] Go unit/integration — `apps/backend/services/admin/handler_test.go`: UID/role/UUID
      validation for `SetUserRole`, `GetAssessment`, `InviteMember`, `CancelInvitation`,
      `ResendInvitation`, `AcceptInvitation` (9 test functions)
- [ ] Go integration — 403 non-admin on `/admin/*` and `/manage/*` (not yet covered —
      existing tests exercise input validation, not the `RequireAdmin` /
      `RequireFirestoreRole` deny paths)
- [ ] Go unit — `parseLimit` (default / clamp / invalid / negative) — not yet covered
- [ ] Vitest — stat card calculations + `getScoreColor` thresholds
- [ ] Playwright E2E — guard redirect, tables, row expand, CSV download, dialogs, invite flow
- [ ] `go test ./services/admin/... -cover` → **n/a — not recorded**

---

## Known Issues / Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work).

- [ ] Extract shared `exportAssessmentsCsv` helper (currently duplicated in `AdminPage` + `QuizTab`)
- [ ] Cursor-based pagination for `ListAssessments` and `ListUsers`
- [ ] Reconcile the `/admin` vs `/manage` route overlap for `ListUsers` / `SetUserRole` —
      same handlers, two different auth checks (`RequireAdmin` claim vs
      `RequireFirestoreRole`) reachable at two different paths
- [ ] `industryType` / `companySize` filtering is in-memory after a full `ListResults`
      read — fine at current volume, but should move server-side (Firestore query) before
      the assessments collection grows large

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [admin-page.md](./admin-page.md) · [admin-api.md](./admin-api.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.1.0*
*Last updated: 5 July 2026*
