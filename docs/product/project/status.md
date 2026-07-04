# Status

> Tracks build progress for the Project & RBAC feature against
> [README.md § Build Sequence](./README.md#build-sequence). Design detail is in
> [README.md](./README.md), requirements in [feature-spec.md](./feature-spec.md), and the
> per-component sub-docs. Tick items off as they are implemented and merged into `develop`.
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

**⚠️ Foundations implemented — end-user surface not started.** The SRS (v1.3.0) is
complete, and part of the data layer is already live:

- Registration (`POST /api/v1/profile`) transactionally creates
  `projects/{companyRegId}`, the Owner `members/{uid}` subdoc, and the
  `users/{uid}.projectRoles` map — `services/profile/repository.go` (`Create`).
- The backoffice administers projects and members — CRUD, deactivate/reactivate,
  member list, invite-owner, role change, removal
  (`/api/v1/backoffice/projects…`, `services/backoffice/handler.go`).
- The one-off backfill exists: `cmd/backfill-projects/main.go` (projects, members,
  `projectRoles`, `projectID` on assessments).

Still missing: `apps/backend/services/project/` (the end-user API),
`RequireProjectRole` middleware, `activeProjectID` on the user doc, token-based
`project_invitations`, `?scope=project` result scoping, `isProjectMember` Firestore
rules, and every web-app surface (`JoinPage`, switcher, settings/members pages,
authSlice project fields).

Note two behavior gaps vs. the SRS: today a registration with an existing
`companyRegId` silently joins that project (the `409 PROJECT_ALREADY_EXISTS` guard is
planned), and none of the implemented foundations have test coverage yet — the
[test-plan.md](./test-plan.md) suites must land with the `services/project/` work.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as each suite lands.

---

## Build Checklist

Mirrors [feature-spec.md § 19](./feature-spec.md#19-build-order).

### Backend

- [ ] 1. Project, Member, Invitation structs — `services/project/models.go` — ⚠️ project/member structs exist in `services/profile` + `services/backoffice`; consolidate
- [ ] 2. Repository CRUD (projects + members + invitations) — `services/project/repository.go` — ⚠️ registration transaction + backoffice CRUD exist; invitations repo is new
- [ ] 3. Business logic + sentinel errors — `services/project/service.go`
- [ ] 4. REST endpoints — `services/project/handler.go`
- [ ] 5. `RequireProjectRole` middleware — `middleware/project_role.go`
- [x] 6. Create project on first register — ✅ `services/profile/repository.go` (`Create`); remaining: `409` duplicate guard + `activeProjectID`
- [ ] 7. `?scope=project` + `projectID` filter — `services/result/handler.go`
- [ ] 8. `isProjectMember` via `projectRoles` map — `firestore.rules`
- [x] 9. Migration script — ✅ `cmd/backfill-projects/main.go`
- [ ] 17. Invitation email template — notification service

### Frontend (web-app)

- [ ] 10. `authSlice`: `activeProjectID`, `projectRoles`, `projectMemberships`
- [ ] 11. `selectActiveProjectRole` selector
- [ ] 12. `ProjectRoleGuard`
- [ ] 13. `JoinPage` (new + existing users)
- [ ] 14. Project switcher in nav
- [ ] 15. `ProjectSettingsPage` (General tab)
- [ ] 16. `ProjectMembersPage` + `InviteModal`

### Tests

**Goal:** critical `services/` ≥ 80%; table-driven suites asserting every sentinel-error
deny path (401/403/404/409/410), written TDD-first.

- [x] `test-plan.md` authored from `docs/iso29110/test-plan-template.md`
- [ ] `services/project/service_test.go` — token validation order, transactional accept, role caps, owner protection
- [ ] `services/project/handler_test.go` — per-endpoint deny paths incl. `PROFILE_REQUIRED`
- [ ] Vitest / Playwright — switcher, `JoinPage` three states, guard redirects

Coverage recorded:

- [ ] `go test ./services/project/... -cover` → **n/a — service does not exist yet**

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Project deactivation (Owner-only, hidden from switcher) — backoffice-side deactivate/reactivate already exists
- [ ] Bulk invite via CSV upload
- [ ] Per-role email notification preferences
- [ ] Cross-project admin view for system admins

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [invitation-lifecycle.md](./invitation-lifecycle.md) · [project-role-middleware.md](./project-role-middleware.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.1.0*
*Last updated: 4 July 2026*
