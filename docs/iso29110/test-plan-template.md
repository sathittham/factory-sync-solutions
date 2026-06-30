---
isoOutput: SI.O4 / SI.O5
template: true
version: 1.0.0
lastUpdated: 2026-06-11
---

# Test Plan — [Feature Name]

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*
*Copy to `docs/product/<feature>/test-plan.md` and fill in alongside development.*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | [name] |
| **Version** | 0.1.0 |
| **Status** | Draft / Active / Completed |
| **Author** | [name] |
| **Date** | YYYY-MM-DD |
| **SRS Reference** | [docs/product/<feature>/feature-spec.md]() |
| **SDD Reference** | [docs/architecture/<feature>-design.md]() |

---

## 1. Test Scope

### 1.1 In Scope
- [List components/functions under test]
- Unit tests: `apps/backend/services/<feature>/service_test.go`
- Integration tests: `apps/backend/services/<feature>/handler_test.go`
- Frontend unit tests: `apps/<app>/src/**/*.test.tsx`

### 1.2 Out of Scope
- [e.g. Third-party Firebase SDK internals]
- [e.g. Cloudflare CDN routing]
- E2E Playwright tests — covered separately in `e2e/`

### 1.3 Test Environment
| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/<feature>/...` |
| Frontend | `npm test` (Vitest + jsdom) |
| Firestore | Firebase emulator (`firebase emulators:start`) |
| Auth | `middleware/testing.go` — `InjectUID(uid)` helper |

---

## 2. Unit Test Cases (SI.O4)

Unit tests verify individual functions/components in isolation, mocking external dependencies.

### 2.1 Backend — `service_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | [Get resource — found] | Document exists in mock store | `uid: "user-1"` | Returns `*Resource` with correct fields | — |
| UT-002 | [Get resource — not found] | Collection empty | `uid: "user-1"` | Returns `Err[Resource]NotFound` | — |
| UT-003 | [Create resource — success] | No existing doc | Valid `Create[Resource]Request` | Returns `*Resource`; doc stored | — |
| UT-004 | [Create resource — conflict] | Doc already exists | Valid request | Returns `Err[Resource]Conflict` | — |
| UT-005 | [Validation — missing required field] | — | `{field: ""}` | Returns validation error | — |

*Add rows for each service method. Table-driven tests preferred in Go.*

### 2.2 Frontend — `*.test.tsx`

| ID | Test Name | Component | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | [renders loading state] | `[Feature]Page` | Store: loading=true | Mount | Shows skeleton/spinner | — |
| UT-F02 | [renders data] | `[Feature]Page` | Store: data loaded | Mount | Displays resource fields | — |
| UT-F03 | [Redux slice: fetch success] | `[feature]Slice` | — | Dispatch `fetch[Resource].fulfilled` | State updated correctly | — |
| UT-F04 | [Redux slice: fetch failure] | `[feature]Slice` | — | Dispatch `fetch[Resource].rejected` | `error` set; `loading` false | — |

---

## 3. Integration Test Cases (SI.O5)

Integration tests verify that components work together — handler → service → Firestore (emulator).

### 3.1 Backend Handler Tests — `handler_test.go`

| ID | Endpoint | Auth | Request Body | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `GET /api/v1/[path]` | Valid UID | — | 200 | `{ success: true, data: {...} }` | — |
| IT-002 | `GET /api/v1/[path]` | No token | — | 401 | `UNAUTHORIZED` | — |
| IT-003 | `GET /api/v1/[path]` | Valid UID | — | 404 | `NOT_FOUND` (no doc) | — |
| IT-004 | `POST /api/v1/[path]` | Valid UID | Valid body | 201 | Resource created | — |
| IT-005 | `POST /api/v1/[path]` | Valid UID | Missing required field | 400 | `VALIDATION_ERROR` | — |
| IT-006 | `POST /api/v1/[path]` | Valid UID | Duplicate | 409 | `CONFLICT` | — |

*Use `httptest.NewRecorder()` and `middleware.InjectUID()` for handler tests.*

### 3.2 End-to-End (Playwright)

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | [Happy path — full flow] | Registered user | 1. Navigate to `/[path]` 2. [action] 3. Submit | [expected outcome visible in UI] | — |
| E2E-002 | [Unauthenticated redirect] | Anonymous | Navigate to `/[path]` | Redirected to sign-in | — |

E2E tests live in `e2e/` (Playwright).

---

## 4. Coverage Targets

| Component | Coverage Target | Tool |
|---|---|---|
| `services/<feature>/service.go` | ≥ 80% | `go test -cover` |
| `services/<feature>/handler.go` | ≥ 60% | `go test -cover` |
| Frontend Redux slice | 100% of actions | Vitest |
| Frontend page component | Key paths | Vitest |

Run: `cd apps/backend && go test -v -race -cover ./services/<feature>/...`

---

## 5. Test Results

| Run Date | Environment | Backend Coverage | Frontend Tests | Result | Notes |
|---|---|---|---|---|---|
| YYYY-MM-DD | Local | — | — | — | Initial |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | YYYY-MM-DD | [name] | Initial |
