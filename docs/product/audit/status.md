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
- [Phase 2 — Project / company audit (mostly built via backoffice)](#phase-2--project--company-audit-mostly-built-via-backoffice)
- [Phase 3 — Backoffice audit (backend built; frontend unverified)](#phase-3--backoffice-audit-backend-built-frontend-unverified)
- [Related Documents](#related-documents)

---

## Current State

**Personal activity and backoffice audit are both live on the backend; only the
project-owner-scoped endpoint and some frontend pieces remain.** The shared logger
(`services/audit/audit.go`) writes timestamped documents to `audit_events/{uuid}` and is
wired into the profile, quiz, admin, and backoffice services. Users see their own events
in the `web-app` Profile activity tab, fed by `GET /profile/activity`; staff/superadmin
activity is served by `GET /backoffice/audit` and `GET /backoffice/users/{uid}/activity`.

The `Event` model already carries `projectID`, `targetUID`, and actor-snapshot
(`actorEmail`/`actorName`) fields, and `admin.SetUserRole` correctly logs
`middleware.GetUID(r)` (the admin) as the actor — the schema gap and actor bug once
tracked here have both been resolved.

Not started: the owner/`system_admin`-scoped `GET /project/audit` endpoint and the
optional web-app project-audit tab. Unverified in this pass and needing a fresh look:
`web-backoffice` audit UI (Audit page, "View Activity", staff activity gating) and the
Phase 1-3 test suites below. No `go test -cover` figure is recorded for `services/audit/`
yet.

---

## Phase 1 — Personal activity (built)

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] `Logger` / `Log` — `apps/backend/services/audit/audit.go`
- [x] Base `Event` model with target schema — `projectID` / `targetUID` / actor-snapshot fields present — `apps/backend/services/audit/audit.go`
- [x] `profile.Service` audit writes — `apps/backend/services/profile/service.go`
- [x] `quiz.Service` audit writes — `apps/backend/services/quiz/service.go`
- [x] `GET /profile/activity` — `apps/backend/services/profile/handler.go`
- [x] ProfilePage activity tab — uses `formatDateTime()`, no route issue found — `apps/web-app/src/pages/ProfilePage.tsx`
- [x] `admin.export` audit write — `apps/backend/services/admin/handler.go`
- [x] `admin.SetUserRole` actor correctness — actor is `middleware.GetUID(r)`, target only in `TargetUID` — `apps/backend/services/admin/handler.go`

### Phase 1 Tests

- [ ] `audit.Logger` nil-client no-op unit test
- [ ] Integration tests for profile/quiz/admin-export write call sites
- [ ] Frontend tests for Profile Activity empty / loading / populated states
- [ ] `go test ./services/audit/... -cover` → **n/a — not recorded**

---

## Phase 2 — Project / company audit (mostly built via backoffice)

Backend plumbing landed as part of the backoffice work below; the owner-scoped endpoint
and web-app tab are the remaining gap.

- [x] Project/company event constants (`EventProjectCreated`, etc.) — `apps/backend/services/audit/audit.go`
- [x] Project-scoped writes for project + member lifecycle events — `apps/backend/services/backoffice/handler.go`
- [ ] `GET /project/audit` (guard: `owner` / `system_admin` of the active project) — not started; only the superadmin-gated `/backoffice/audit` exists today
- [ ] Optional web-app project-audit tab for `owner` / `system_admin`
- [x] Composite index `projectID ASC, createdAt DESC` in `firestore.indexes.json`

### Phase 2 Tests

- [ ] Query-builder unit tests for project filters
- [ ] Integration: `GET /project/audit` never returns another project's events

---

## Phase 3 — Backoffice audit (backend built; frontend unverified)

- [x] Staff/user CRUD event constants (`backoffice.*`) — `apps/backend/services/audit/audit.go`
- [x] Audit writer injection — `apps/backend/services/backoffice/handler.go`
- [x] `GET /backoffice/audit` (superadmin, `ListAudit`) + `GET /backoffice/users/{uid}/activity` (`GetUserActivity`) — `apps/backend/services/backoffice/handler.go`
- [ ] Backoffice audit UI: Audit page, user "View Activity", staff activity — hidden from `staff` role — ⚠️ not verified in this pass, re-check `web-backoffice`
- [x] Remaining composite indexes (`targetUID`, `eventType`, `resourceType` + `createdAt`)

### Phase 3 Tests

- [ ] Query-builder unit tests for actor/target/backoffice filters
- [ ] Integration tests for each backoffice mutation's event write (actor vs. target correctness)
- [ ] Frontend tests for Backoffice Audit role gating + filter behavior

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [audit-logger.md](./audit-logger.md) · [audit-query-api.md](./audit-query-api.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.1.0*
*Last updated: 5 July 2026*
