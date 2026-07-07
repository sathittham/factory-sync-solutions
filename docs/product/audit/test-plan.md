---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-05
---

# Test Plan — Audit Logging

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Audit Logging |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-05 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **SDD Reference** | [README.md](./README.md) |

> This plan was written after Phases 1 and 3 already shipped without one — see
> [status.md](./status.md) for the implementation checklist. Rows below reflect what
> actually exists in the codebase today (checked via direct inspection, not assumed).

---

## 1. Test Scope

### 1.1 In Scope
- `audit.Logger` — `apps/backend/services/audit/audit.go`
- `profile.Service` / `quiz.Service` / `admin` / `backoffice` audit write call sites
- `GET /profile/activity`, `GET /backoffice/audit`, `GET /backoffice/users/{uid}/activity`
- Frontend: `ProfilePage` Activity tab, `AuditPage`, `AuditActivityDialog`, `UsersPage`/`StaffPage` "View Activity"

### 1.2 Out of Scope
- `GET /project/audit` — not yet implemented, see [status.md](./status.md)
- Firebase/Firestore SDK internals
- E2E Playwright — covered separately in `apps/web-backoffice/e2e/` / `apps/web-app/e2e/`

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/audit/... ./services/profile/... ./services/quiz/... ./services/admin/... ./services/backoffice/...` |
| Frontend | `pnpm --filter @repo/web-app test` · `pnpm --filter @repo/web-backoffice test` (Vitest) |
| Firestore | Firebase emulator (`firebase emulators:start`) |
| Auth | `middleware/testing.go` — `InjectUID(uid)` helper |

---

## 2. Unit Test Cases (SI.O4)

### 2.1 Backend — `apps/backend/services/audit/audit_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | Nil-client no-op | `Logger` constructed with nil Firestore client | Any valid event | `Log`/`LogWithDetails` returns nil error, no write attempted | ❌ Missing — no `audit_test.go` exists |
| UT-002 | Log assigns UUID + RFC3339 `createdAt` | Real/fake Firestore client | Event without `id`/`createdAt` | Document written with generated UUID and UTC RFC3339 timestamp | ❌ Missing |
| UT-003 | `LogWithDetails` sets `targetUID`/`projectID`/actor snapshot | Real/fake client | `EventDetails{TargetUID, ProjectID}` | Fields present on stored document | ❌ Missing |

### 2.2 Backend — existing coverage (already passing, no action needed)

| ID | Test Name | File | Status |
|---|---|---|---|
| UT-004 | `TestSubmitQuiz_Success` and related quiz-submission cases | `quiz/service_test.go` | ✅ Passing (does not assert on the audit write itself) |
| UT-005 | Profile create/update service tests | `profile/service_test.go` | ✅ Passing (does not assert on the audit write itself) |
| UT-006 | Admin export handler tests | `admin/handler_test.go` | ✅ Passing (does not assert on the audit write itself) |

*None of UT-004–006 currently assert the audit event's `actorUID`/`targetUID`/`projectID` — see IT-004 below.*

### 2.3 Frontend — existing coverage

| ID | Test Name | Component | File | Status |
|---|---|---|---|---|
| UT-F01 | Renders loading/empty/populated/error states | `AuditPage` | `apps/web-backoffice/src/pages/AuditPage.test.tsx` | ✅ Passing |
| UT-F02 | Actor UID filter applies and refetches | `AuditPage` | `apps/web-backoffice/src/pages/AuditPage.test.tsx` | ✅ Passing |
| UT-F03 | Filter reset restores defaults | `AuditPage` | `apps/web-backoffice/src/pages/AuditPage.test.tsx` | ✅ Passing |
| UT-F04 | Loading/empty/error/populated + refresh | `AuditActivityDialog` | `apps/web-backoffice/src/components/AuditActivityDialog.test.tsx` | ✅ Passing |
| UT-F05 | "View Activity" hidden for non-superadmin | `UsersPage` | `apps/web-backoffice/src/pages/UsersPage.test.tsx:160` | ✅ Passing |
| UT-F06 | Profile Activity tab states | `ProfilePage` | `apps/web-app/src/pages/ProfilePage.test.tsx` | ⚠️ Verify empty/loading/populated states are covered — not confirmed in this pass |

---

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests

| ID | Endpoint | Auth | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|
| IT-001 | `GET /api/v1/profile/activity` | Valid UID | 200 | Only caller's own actor/target events | ⚠️ Not confirmed — check `profile/handler_test.go` |
| IT-002 | `GET /api/v1/backoffice/audit` | `backofficeRole == "superadmin"` | 200 | Platform-wide events, filters applied | ❌ Missing — no `backoffice/handler_test.go` covers `ListAudit` |
| IT-003 | `GET /api/v1/backoffice/audit` | `staff` role | 403 | `FORBIDDEN` | ❌ Missing |
| IT-004 | `GET /api/v1/backoffice/users/{uid}/activity` | `backofficeRole == "superadmin"` | 200 | Actor + target events for that UID | ❌ Missing |
| IT-005 | `admin.SetUserRole` audit write | Valid admin UID | — | Event has `actorUID == admin`, `targetUID == affected user` | ❌ Missing — regression test for the actor-correctness fix has no coverage |
| IT-006 | Backoffice project/member CRUD writes | Valid staff/superadmin UID | — | Event includes `projectID` and correct actor/target | ❌ Missing |

### 3.2 End-to-End (Playwright)

| ID | Scenario | User | Expected | Status |
|---|---|---|---|---|
| E2E-001 | Superadmin opens Audit page, filters by event type | Superadmin | Table updates, no console errors | ⚠️ Check `apps/web-backoffice/e2e/` for existing coverage |
| E2E-002 | Staff role cannot reach `/audit` | Staff | Redirected or no nav entry | ⚠️ Check `apps/web-backoffice/e2e/` for existing coverage |

E2E tests live in `apps/web-backoffice/e2e/` and `apps/web-app/e2e/` — cross-reference before writing new cases; some of this may already exist per those apps' own test plans.

---

## 4. Coverage Targets

| Component | Coverage Target | Tool | Current |
|---|---|---|---|
| `services/audit/audit.go` | ≥ 80% | `go test -cover` | Not recorded — no test file exists |
| `services/backoffice/handler.go` (`ListAudit`, `GetUserActivity`) | ≥ 60% | `go test -cover` | Not recorded |
| Frontend `AuditPage` / `AuditActivityDialog` | Key paths | Vitest | Already covered (see §2.3) |

Run: `cd apps/backend && go test -v -race -cover ./services/audit/...`

---

## 5. Test Results

| Run Date | Environment | Backend Coverage | Frontend Tests | Result | Notes |
|---|---|---|---|---|---|
| 2026-07-05 | — | Not recorded | Passing (existing suite) | Initial | Plan created retroactively after Phase 1/3 shipped; UT-001–003 and IT-002–006 are the priority gaps |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Sathittham Sangthong | Initial plan, written retroactively against already-shipped Phase 1/3 code |

---

*Version: 1.0.0*
*Last updated: 5 July 2026*
