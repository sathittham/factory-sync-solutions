# Status

> Tracks build progress for the Audit Logging feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Personal activity (built)](#phase-1--personal-activity-built)
- [Phase 2 — Project / company audit (planned)](#phase-2--project--company-audit-planned)
- [Phase 3 — Backoffice audit (planned)](#phase-3--backoffice-audit-planned)
- [Related Documents](#related-documents)

---

## Current State

**Personal activity is live; everything project- and backoffice-scoped is planned.** The
shared logger (`services/audit/audit.go`) writes timestamped documents to
`audit_events/{uuid}` and is wired into the profile and quiz services and the admin CSV
export. Users see their own events in the `web-app` Profile activity tab, fed by
`GET /profile/activity`.

Honest partials: the base `Event` model still lacks the target-schema `projectID` /
`targetUID` fields, so events cannot yet be project-scoped; the ProfilePage activity tab
needs route/use-date cleanup; and `admin.SetUserRole` has a known correctness bug — it
logs the **target** UID as the actor instead of the admin who made the change.

Not started: project/backoffice event-type constants, audit-writer injection into the
backoffice handler, the `GET /project/audit` and `GET /backoffice/audit` +
`GET /backoffice/users/{uid}/activity` endpoints, and all `web-backoffice` audit UI.
No `go test -cover` figure is recorded for `services/audit/` yet.

---

## Phase 1 — Personal activity (built)

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] `Logger` / `Log` — `apps/backend/services/audit/audit.go`
- [ ] Base `Event` model with target schema — built, but ⚠️ needs `projectID` / `targetUID` (+ actor snapshot) fields
- [x] `profile.Service` audit writes — `apps/backend/services/profile/service.go`
- [x] `quiz.Service` audit writes — `apps/backend/services/quiz/service.go`
- [x] `GET /profile/activity` — `apps/backend/services/profile/handler.go`
- [ ] ProfilePage activity tab — built, but ⚠️ route/use-date cleanup needed — `apps/web-app/src/pages/ProfilePage.tsx`
- [x] `admin.export` audit write — `apps/backend/services/admin/handler.go`
- [ ] `admin.SetUserRole` actor correctness — ⚠️ bug: logs target UID as actor — `apps/backend/services/admin/handler.go`

### Phase 1 Tests

- [ ] `audit.Logger` nil-client no-op unit test
- [ ] Integration tests for profile/quiz/admin-export write call sites
- [ ] Frontend tests for Profile Activity empty / loading / populated states
- [ ] `go test ./services/audit/... -cover` → **n/a — not recorded**

---

## Phase 2 — Project / company audit (planned)

All ❌ not started.

- [ ] Project/company event constants (`project.*`) — `apps/backend/services/audit/audit.go`
- [ ] Project-scoped writes for project + member lifecycle events
- [ ] `GET /project/audit` (guard: `owner` / `system_admin` of the active project)
- [ ] Optional web-app project-audit tab for `owner` / `system_admin`
- [ ] Composite index `projectID ASC, createdAt DESC` in `firestore.indexes.json`

### Phase 2 Tests

- [ ] Query-builder unit tests for project filters
- [ ] Integration: `GET /project/audit` never returns another project's events

---

## Phase 3 — Backoffice audit (planned)

All ❌ not started.

- [ ] Staff/user CRUD event constants (`backoffice.*`) — `apps/backend/services/audit/audit.go`
- [ ] Audit writer injection — `apps/backend/services/backoffice/handler.go`
- [ ] `GET /backoffice/audit` (superadmin) + `GET /backoffice/users/{uid}/activity`
- [ ] Backoffice audit UI: Audit page, user "View Activity", staff activity — hidden from `staff` role
- [ ] Remaining composite indexes (`targetUID`, `eventType`, `resourceType` + `createdAt`)

### Phase 3 Tests

- [ ] Query-builder unit tests for actor/target/backoffice filters
- [ ] Integration tests for each backoffice mutation's event write (actor vs. target correctness)
- [ ] Frontend tests for Backoffice Audit role gating + filter behavior

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [audit-logger.md](./audit-logger.md) · [audit-query-api.md](./audit-query-api.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
