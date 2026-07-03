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

**📝 Planning — nothing implemented.** The SRS (v1.2.0) is complete and this design
index is in place, but no code exists: there is no `apps/backend/services/project/`
directory, no `RequireProjectRole` middleware, no `JoinPage`, switcher, or settings
pages, and the `users/{uid}` doc does not yet carry `activeProjectID` / `projectRoles`.
Today, company data still lives on each user's profile and there is no multi-project or
per-project RBAC concept anywhere in the system.

Before implementation starts: write the test plan
(`docs/iso29110/test-plan-template.md` → `test-plan.md`, TDD-first) and plan the
one-off migration (`cmd/migrate-projects/main.go`) that groups existing users into
projects and backfills `projectID` onto assessments.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as each suite lands.

---

## Build Checklist

Mirrors [feature-spec.md § 19](./feature-spec.md#19-build-order); all ❌ not started.

### Backend

- [ ] 1. Project, Member, Invitation structs — `services/project/models.go`
- [ ] 2. Repository CRUD (projects + members + invitations) — `services/project/repository.go`
- [ ] 3. Business logic + sentinel errors — `services/project/service.go`
- [ ] 4. REST endpoints — `services/project/handler.go`
- [ ] 5. `RequireProjectRole` middleware — `middleware/project_role.go`
- [ ] 6. Create project on first register — `services/profile/service.go`
- [ ] 7. `?scope=project` + `projectID` filter — `services/result/handler.go`
- [ ] 8. `isProjectMember` via `projectRoles` map — `firestore.rules`
- [ ] 9. Migration script — `cmd/migrate-projects/main.go`
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

- [ ] `test-plan.md` authored from `docs/iso29110/test-plan-template.md`
- [ ] `services/project/service_test.go` — token validation order, transactional accept, role caps, owner protection
- [ ] `services/project/handler_test.go` — per-endpoint deny paths incl. `PROFILE_REQUIRED`
- [ ] Vitest / Playwright — switcher, `JoinPage` three states, guard redirects

Coverage recorded:

- [ ] `go test ./services/project/... -cover` → **n/a — service does not exist yet**

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Project deactivation (Owner-only, hidden from switcher)
- [ ] Bulk invite via CSV upload
- [ ] Per-role email notification preferences
- [ ] Cross-project admin view for system admins

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [invitation-lifecycle.md](./invitation-lifecycle.md) · [project-role-middleware.md](./project-role-middleware.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
