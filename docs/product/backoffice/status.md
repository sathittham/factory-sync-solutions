# Status

> Tracks build progress for the Backoffice feature against [README.md](./README.md).
> Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Future Work](#future-work)
- [Related Documents](#related-documents)

---

## Current State

**In progress** (spec status: scaffold + pages built; audit UI/API planned). The
`web-backoffice` app scaffold is up — Google-only sign-in, `BackofficeGuard` /
`SuperAdminGuard`, the `/unauthorized` deny page, and the sidebar shell — and the core
pages (Dashboard, Projects, Project Detail, Users, Results, Staff) are built against the
`/api/v1/backoffice/` route group in `apps/backend/services/backoffice/`.

Two gaps are explicit in the spec and deliberate: the **audit surface** (`/audit` page,
`GET /backoffice/audit`, `GET /backoffice/users/{uid}/activity`, and the audit-event writes
from backoffice mutations) is planned but not built, and the **invite-owner** flow has a
backend spec but no `backofficeApi.inviteOwner` client method — the UI button must stay
disabled or hidden until it is wired.

The spec's acceptance criteria ([feature-spec.md §10](./feature-spec.md#10-acceptance-criteria))
are all unticked — walk them per role (staff, superadmin) as pages are verified, and record
`make test-api` results for the backoffice route group here.

---

## Build Checklist

Mirrors the spec's scope; ticks reflect the spec's "scaffold + pages built" baseline.

### App scaffold & auth (web-backoffice)

- [x] App scaffold — `apps/web-backoffice/`
- [x] Sign-in page (Google only) — `apps/web-backoffice/src/pages/SignInPage.tsx`
- [x] Guards + `/unauthorized` — see [auth/status.md](../auth/status.md)
- [x] Sidebar shell with superadmin-only Staff/Audit menu items

### Pages (web-backoffice)

- [x] Dashboard — `apps/web-backoffice/src/pages/DashboardPage.tsx`
- [x] Projects — `apps/web-backoffice/src/pages/ProjectsPage.tsx`
- [x] Project Detail (Members + Settings tabs) — `apps/web-backoffice/src/pages/ProjectDetailPage.tsx`
- [x] Users — `apps/web-backoffice/src/pages/UsersPage.tsx`
- [x] Results — `apps/web-backoffice/src/pages/ResultsPage.tsx`
- [x] Staff (superadmin) — `apps/web-backoffice/src/pages/StaffPage.tsx`
- [ ] Audit (superadmin) — planned
- [ ] `backofficeApi.inviteOwner` client method — not implemented (button disabled/hidden until wired)

### Backend (`services/backoffice/`)

- [x] Route group `/api/v1/backoffice/` behind `FirebaseAuth` + `RequireBackofficeRole` — `apps/backend/services/backoffice/handler.go`
- [x] Projects / users / results / staff / stats endpoints per [README.md § API contract](./README.md#api-contract)
- [ ] `GET /backoffice/audit` — planned
- [ ] `GET /backoffice/users/{uid}/activity` — planned
- [ ] Audit-event writes from backoffice mutations (`backoffice.staff_role_*`, `backoffice.user_*`, project/member metadata) — planned

### Tests

- [ ] `make test-api` — `/backoffice/` route group incl. 401/403 deny paths
- [ ] `tsc --noEmit` + `biome check` recorded for `apps/web-backoffice`
- [ ] Acceptance-criteria walkthrough per role (staff, superadmin), TH + EN

---

## Future Work

- [ ] Audit UI/API (page, endpoints, event writes) — the spec's headline remaining scope
- [ ] Wire `backofficeApi.inviteOwner` and enable the "Invite Owner" button

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [backoffice-service.md](./backoffice-service.md)
- [Auth status](../auth/status.md) · [Audit spec](../audit/feature-spec.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
