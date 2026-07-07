---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Draft
---

# Test Plan — Project & RBAC

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Project & RBAC (`services/project/`, `RequireProjectRole`, web-app project surfaces) |
| **Version** | 1.0.0 |
| **Status** | Draft — write tests TDD-first, before Build Sequence step 1 |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **README Reference** | [README.md](./README.md) |

---

## 1. Test Scope

### 1.1 In Scope

- `services/project/` — service logic (invitations, memberships, roles, transfer), sentinel errors, handler status mapping
- `middleware/project_role.go` — `RequireProjectRole` deny paths and `X-Project-ID` override
- Registration changes in `services/profile/` — `409 PROJECT_ALREADY_EXISTS` guard + `activeProjectID` (the project/member/`projectRoles` creation is already implemented but currently **untested** — cover it here retroactively)
- `services/result/` — `?scope=project` filter and role gating
- Frontend: `authSlice` project fields, `selectActiveProjectRole`, `ProjectRoleGuard`, `JoinPage` states, project switcher
- Unit tests: `apps/backend/services/project/service_test.go`
- Integration tests: `apps/backend/services/project/handler_test.go`
- Frontend unit tests: `apps/web-app/src/**/*.test.{ts,tsx}`

### 1.2 Out of Scope

- Firebase Auth SDK internals; Firestore client internals
- Invitation email rendering/delivery (notification service has its own coverage; here only assert the fire-and-forget call + `emailSentAt`/`emailError` recording)
- Backoffice project administration endpoints (existing `services/backoffice/` surface)
- One-off backfill `cmd/backfill-projects/main.go` (already run; verified operationally)
- E2E Playwright tests — covered separately in `e2e/`

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/project/...` |
| Frontend | `pnpm --filter @repo/web-app test` (Vitest + jsdom) |
| Firestore | Firebase emulator (`firebase emulators:start`) for transaction tests |
| Auth | `middleware/testing.go` — `InjectUID(uid)` helper |

---

## 2. Unit Test Cases (SI.O4)

### 2.1 Backend — `services/project/service_test.go`

Table-driven; every sentinel-error deny path asserted with `errors.Is`.

**Invitation validation order** (`ValidateInvitationToken` — used-before-expired is intentional, see [invitation-lifecycle.md](./invitation-lifecycle.md))

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | Token not found | No invitation doc | unknown token | `ErrInvitationNotFound` | — |
| UT-002 | Token already used | `status == "accepted"` | token | `ErrInvitationAlreadyUsed` | — |
| UT-003 | Token expired | `status == "pending"`, `expiresAt` past | token | `ErrInvitationExpired` | — |
| UT-004 | Used **and** expired | `status == "accepted"`, `expiresAt` past | token | `ErrInvitationAlreadyUsed` (used wins) | — |
| UT-005 | Valid pending token | `status == "pending"`, not expired | token | invitation returned, no error | — |

**Invitation creation / revocation**

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-010 | Create — Manager+ caller | Caller `manager` in target project | email + projectID + role | `pending` token, 7-day `expiresAt`, email fired | — |
| UT-011 | Create — General User caller | Caller `general_user` | valid body | `ErrInsufficientRole` | — |
| UT-012 | Create — non-member caller | No `projectRoles` entry | valid body | `ErrNotAMember` | — |
| UT-013 | Create — role above caller's level | Caller `system_admin`, role `owner` | body | `ErrInsufficientRole` | — |
| UT-014 | Revoke pending token | `status == "pending"` | token | `status → "revoked"`, `revokedAt`/`revokedBy` set | — |
| UT-015 | Resend | Old `pending` token | resend | old token `revoked`, new `pending` token issued | — |

**Accept invitation** (transactional)

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-020 | Accept — happy path | Profile exists, valid token | uid + token | one txn: token `accepted`, member doc created with token's role, `projectRoles[projectID]` set; `activeProjectID` unchanged | — |
| UT-021 | Accept — no profile | `users/{uid}` missing | uid + token | `ErrProfileRequired` | — |
| UT-022 | Accept — already a member | Member doc exists | uid + token | `ErrAlreadyMember` | — |
| UT-023 | Accept — concurrent double accept | Two accepts, same token (emulator) | — | exactly one succeeds; other `ErrInvitationAlreadyUsed`; no duplicate member; `memberCount` +1 once | — |

**Roles, removal, transfer**

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-030 | Role change — within cap | Caller `owner` | member → `manager` | member subdoc + `projectRoles` updated atomically | — |
| UT-031 | Role change — above own level | Caller `system_admin` assigns `owner` | — | `ErrInsufficientRole` | — |
| UT-032 | Demote/remove Owner | Target is Owner | — | `ErrCannotRemoveOwner` | — |
| UT-033 | Remove member | Caller `owner`, target `manager` | uid | `isActive=false`, `projectRoles[projectID]` deleted; target's `activeProjectID` re-pointed if it was this project | — |
| UT-034 | Switch active — member | Caller in project | projectID | `activeProjectID` updated | — |
| UT-035 | Switch active — non-member | No membership | projectID | `ErrNotAMember` | — |
| UT-036 | Transfer ownership | Caller `owner` | newOwnerUID | new owner `owner`; caller becomes `system_admin`; `ownerUID` updated | — |

**Registration guard** (`services/profile/service_test.go` additions)

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-040 | Register — new `companyRegId` | No project doc | valid request | project + Owner member + `projectRoles` map + `activeProjectID` created in one txn (covers today's untested `Create` behavior) | — |
| UT-041 | Register — taken `companyRegId` | Project exists | valid request | `ErrProjectAlreadyExists` (behavior change from silent join) | — |

### 2.2 Frontend — `*.test.{ts,tsx}` (Vitest)

| ID | Test Name | Component | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | selector — active role | `selectActiveProjectRole` | `activeProjectID` + `projectRoles` set | select | role for active project | — |
| UT-F02 | selector — no active project | `selectActiveProjectRole` | `activeProjectID: null` | select | `null` | — |
| UT-F03 | slice — setActiveProject | `authSlice` | memberships loaded | dispatch | `activeProjectID` updated | — |
| UT-F04 | slice — memberships loaded | `authSlice` | — | fulfilled action | `projectMemberships` populated | — |
| UT-F05 | guard — sufficient role | `ProjectRoleGuard` | role `manager`, required `manager`+ | mount | children rendered | — |
| UT-F06 | guard — insufficient role | `ProjectRoleGuard` | role `general_user` | mount | redirect to `/` | — |
| UT-F07 | JoinPage — State A | `JoinPage` | not signed in, valid token | mount | preview card + sign-in button | — |
| UT-F08 | JoinPage — State B | `JoinPage` | signed in + profile | mount | "Accept invitation as {name}" | — |
| UT-F09 | JoinPage — State C | `JoinPage` | signed in, no profile | mount | register-first card, link `/register?next=/join?token=<t>` | — |
| UT-F10 | JoinPage — expired / used | `JoinPage` | API 410 / 409 | mount | error card with i18n message | — |
| UT-F11 | switcher — lists memberships | nav switcher | 3 memberships | open | all listed with role labels, active checked | — |
| UT-F12 | i18n — TH/EN | project screens | locale toggled | render | all `project.*` keys resolve in both locales, no hardcoded strings | — |

---

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests — `services/project/handler_test.go`

`httptest.NewRecorder()` + `middleware.InjectUID()`; assert envelope shape (`success`/`data`/`count` or `error.code`).

| ID | Endpoint | Auth | Request | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `GET /api/v1/project` | Valid member | — | 200 | project incl. `myRole` | — |
| IT-002 | `GET /api/v1/project` | No token | — | 401 | `UNAUTHORIZED` | — |
| IT-003 | `GET /api/v1/project/memberships` | Valid UID | — | 200 | list + `count` | — |
| IT-004 | `PUT /api/v1/project/active` | Non-member | projectID | 403 | `FORBIDDEN` | — |
| IT-005 | `PUT /api/v1/project` | `manager` | settings body | 403 | `FORBIDDEN` (needs owner/system_admin) | — |
| IT-006 | `GET /api/v1/project/members` | `general_user` | — | 403 | `FORBIDDEN` (needs manager+) | — |
| IT-007 | `PUT /api/v1/project/members/{uid}/role` | `owner` | `{ "role": "bogus" }` | 400 | `INVALID_ROLE` | — |
| IT-008 | `DELETE /api/v1/project/members/{uid}` | `owner` removing self | — | 403/409 | `CANNOT_REMOVE_OWNER` | — |
| IT-009 | `POST /api/v1/project/invitations` | `general_user` | valid body | 403 | `FORBIDDEN` | — |
| IT-010 | `GET /api/v1/project/join/{token}` | none (public) | unknown token | 404 | `INVITATION_NOT_FOUND` | — |
| IT-011 | `GET /api/v1/project/join/{token}` | none (public) | expired token | 410 | `INVITATION_EXPIRED` | — |
| IT-012 | `GET /api/v1/project/join/{token}` | none (public) | used token | 409 | `INVITATION_ALREADY_USED` | — |
| IT-013 | `GET /api/v1/project/join/{token}` | none (public) | valid token | 200 | only projectName/invitedBy/role/expiresAt — **no member or assessment data** | — |
| IT-014 | `POST /api/v1/project/join` | UID without profile | token | 403 | `PROFILE_REQUIRED` | — |
| IT-015 | `POST /api/v1/project/join` | valid, second call same token | token | 409 | `INVITATION_ALREADY_USED` | — |
| IT-016 | `POST /api/v1/project/transfer` | `system_admin` | newOwnerUID | 403 | `FORBIDDEN` (owner only) | — |
| IT-017 | `GET /api/v1/results?scope=project` | `general_user` | — | 403 | `FORBIDDEN` (manager+) | — |
| IT-018 | `GET /api/v1/results?scope=project` | `manager` | — | 200 | all active-project assessments only (filtered by `projectID`) | — |
| IT-019 | any project route | member of other project + `X-Project-ID` header | — | per-role | role check targets header's project, not `activeProjectID` | — |
| IT-020 | `POST /api/v1/profile` | new UID | taken `companyRegId` | 409 | `PROJECT_ALREADY_EXISTS` | — |

### 3.2 End-to-End (Playwright)

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Register → own project | New user | sign in → register → land on `/quiz` | switcher shows own project as Owner | — |
| E2E-002 | Invite → accept (existing user) | Owner + invitee | invite via Members tab → open `/join?token` as invitee → accept | toast + second membership in switcher; active project unchanged | — |
| E2E-003 | Register-first join | New invitee | open `/join?token` → sign in → State C → register → return → accept | membership added after registration | — |
| E2E-004 | Switch active project | Multi-member | switcher → pick other project | scoped data reloads; nav shows new project | — |
| E2E-005 | RBAC UI gating | `general_user` | navigate to `/project/settings` | redirected to `/`; no management UI in nav | — |
| E2E-006 | Expired invite | Any | open `/join?token=<expired>` | expired card, no accept button | — |

E2E tests live in `e2e/` (Playwright).

---

## 4. Coverage Targets

| Component | Coverage Target | Tool |
|---|---|---|
| `services/project/service.go` | ≥ 80% | `go test -cover` |
| `services/project/handler.go` | ≥ 60% | `go test -cover` |
| `middleware/project_role.go` | ≥ 80% | `go test -cover` |
| `authSlice` project actions + `selectActiveProjectRole` | 100% of actions | Vitest |
| `JoinPage` / `ProjectRoleGuard` / switcher | Key paths (all states) | Vitest |

Run: `cd apps/backend && go test -v -race -cover ./services/project/... ./middleware/...`

---

## 5. Test Results

| Run Date | Environment | Backend Coverage | Frontend Tests | Result | Notes |
|---|---|---|---|---|---|
| — | — | — | — | — | Awaiting implementation (TDD — suites land with Build Sequence steps 1–5) |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-04 | Sathittham Sangthong | Initial test plan from SRS v1.3.0 — unit, integration, E2E cases incl. invitation validation order, transactional accept, role caps, and registration 409 guard |

---

*Version: 1.0.0*
*Last updated: 4 July 2026*
