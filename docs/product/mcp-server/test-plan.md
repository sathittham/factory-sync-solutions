---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Active
---

# Test Plan — FactorySync MCP Server

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | MCP Server (`mcp-server`) |
| **Version** | 1.0.0 (covers Phase 1) |
| **Status** | Active |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **SDD Reference** | [mcp-server-design.md](../../architecture/mcp-server-design.md) |
| **README Reference** | [README.md](./README.md) |

## 1. Test Scope

### 1.1 In Scope (Phase 1)

- API key lifecycle in `apps/backend/services/apikey` — generation, hashing, scope
  derivation, verification, revocation, limits, sentinel errors.
- Key management API contracts for `POST/GET/DELETE /api/v1/apikeys*`.
- MCP transport and handshake behavior of the `apps/mcp-server` Worker
  (`initialize`, `tools/list`, `tools/call`, JSON-RPC error semantics).
- Tool input/output schemas, authentication gating, and authorization boundaries for all
  six Phase-1 tools.
- Rate limiting and audit logging of tool invocations.
- Key management UI in `web-app` and `web-backoffice` (plaintext-once, revoke, limits, i18n).

### 1.2 Out of Scope (Phase 1)

- OAuth 2.1 / dynamic client registration (Phase 2 — sections added then).
- Backoffice-scoped MCP tools (later CR).
- Live Gemini/GA4/etc. — unrelated services; live Go backend calls from Worker unit tests
  (backend mocked behind a fetch/client interface).
- Firebase Auth internals; MCP client (Claude Code / Codex) internals.

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/apikey/...` — mock repository per existing service pattern |
| Auth | `middleware/testing.go` — `InjectUID(uid)` helper; custom-claim fixtures for `backofficeRole` |
| Worker | Vitest + `@cloudflare/vitest-pool-workers` in `apps/mcp-server`; backend stubbed via fetch mock |
| MCP probe | Raw JSON-RPC POSTs + `claude mcp add --transport http` against staging |
| Frontend | Vitest + jsdom in `apps/web-app` / `apps/web-backoffice` |
| E2E | Playwright against staging (`mcp-staging.factorysyncsolutions.com`) |

## 2. Unit Test Cases (SI.O4)

### 2.1 Backend — `apps/backend/services/apikey/service_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | Key generation format + entropy | — | create request | key is `fsk_` + 43 URL-safe chars; stored record holds SHA-256 hash + 8-char prefix, never plaintext | — |
| UT-002 | Scope derivation — end user | caller has no `backofficeRole` claim | create request claiming `scope: backoffice` | stored `scope: "user"` — client-supplied scope ignored | — |
| UT-003 | Scope derivation — staff | caller has `backofficeRole` claim | create request | stored `scope: "backoffice"` | — |
| UT-004 | Label validation | — | empty label / 51-char label | validation error; 1–50 trimmed chars accepted | — |
| UT-005 | Max active keys | 5 active keys exist | create request | `ErrKeyLimitReached` | — |
| UT-006 | Verify — valid key | active key stored | plaintext key | resolves owner UID + scope; `lastUsedAt` updated | — |
| UT-007 | Verify — unknown key | — | random `fsk_…` | `ErrKeyNotFound` | — |
| UT-008 | Verify — revoked key | key revoked | plaintext key | `ErrKeyRevoked` | — |
| UT-009 | Revoke — own key | active key exists | owner UID + keyID | `isActive=false`, `revokedAt` set | — |
| UT-010 | Revoke — foreign key | key owned by another UID | caller UID + keyID | `ErrKeyNotFound` (no existence leak) | — |
| UT-011 | Backoffice scope re-verification | staff key exists, `backofficeRole` claim removed | verify call | key treated as revoked | — |

### 2.2 Worker — `apps/mcp-server/src/**/*.test.ts`

| ID | Test Name | Module | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-M01 | Tool registry advertises Phase-1 set | tool registry | — | `tools/list` | exactly six tools, each with JSON schema | — |
| UT-M02 | Auth header parsing | auth layer | — | missing / malformed / valid `Authorization` | anonymous, anonymous, key-verification path respectively | — |
| UT-M03 | Public tool without key | gating | no key | call `list_quizzes` | succeeds | — |
| UT-M04 | Protected tool without key | gating | no key | call `list_results` | `UNAUTHENTICATED` error content block with key-creation hint; session stays usable | — |
| UT-M05 | Input schema validation | tools | — | `get_quiz` with missing/malformed `quizID` | schema error before any backend call | — |
| UT-M06 | Backend error mapping | error mapper | backend stub returns 404 / 500 | call `get_result` | not-found tool error / structured upstream-error block — no stack traces or raw backend bodies | — |
| UT-M07 | Profile field exclusion | `get_profile` | backend stub returns `citizenId` + DBD payload | call tool | response excludes both even when populated in source | — |
| UT-M08 | Rate limit accounting | rate limiter | limit = N per key | N+1 calls | last call rejected with structured rate-limit error | — |
| UT-M09 | Audit record shape | audit emitter | any tool call | inspect emitted entry | tool name, key prefix (never plaintext), outcome, latencyMs | — |

### 2.3 Frontend — key management UI (`apps/web-app`, `apps/web-backoffice`)

| ID | Test Name | Component | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | Create flow shows plaintext once | API Keys settings | create mock success | submit create form | full key rendered with copy control; absent after dismiss/reload | — |
| UT-F02 | Key list rendering | key list | list mock with keys | mount | prefix, label, scope badge, dates via `formatDateTime()` | — |
| UT-F03 | Revoke uses shadcn dialog | revoke action | key listed | click revoke | `AlertDialog` confirm (no `window.confirm`); list refreshes on success | — |
| UT-F04 | Key limit error state | create form | limit-error mock | submit | localized limit message, form stays usable | — |
| UT-F05 | Locale switching | all key screens | locale `th` → `en` | re-render | all labels via `useLocale()`, no hardcoded strings | — |

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests — `apps/backend/services/apikey/handler_test.go`

| ID | Endpoint | Auth | Request | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `POST /api/v1/apikeys` | valid UID | valid label | 201 | `success=true`, plaintext key present exactly once | — |
| IT-002 | `POST /api/v1/apikeys` | no token | valid label | 401 | `UNAUTHENTICATED` | — |
| IT-003 | `POST /api/v1/apikeys` | valid UID | empty label | 400 | `VALIDATION_ERROR` | — |
| IT-004 | `POST /api/v1/apikeys` | valid UID, 5 active keys | valid label | 400/409 | key-limit error code | — |
| IT-005 | `GET /api/v1/apikeys` | valid UID | — | 200 | only caller's keys; prefix/label/scope/lastUsedAt — never hash or plaintext | — |
| IT-006 | `DELETE /api/v1/apikeys/{keyID}` | valid UID (owner) | — | 200 | key revoked | — |
| IT-007 | `DELETE /api/v1/apikeys/{keyID}` | valid UID (non-owner) | foreign keyID | 404 | `NOT_FOUND` (no existence leak) | — |

### 3.2 MCP Protocol Tests (Worker ↔ backend, SRS TC-001 … TC-008)

| ID | TC | Scenario | Setup | Expected | Status |
|---|---|---|---|---|---|
| IT-M01 | TC-001 | Handshake + tool discovery | `claude mcp add --transport http` / JSON-RPC probe | `initialize` returns protocol info; `tools/list` includes all six Phase-1 tools | — |
| IT-M02 | TC-001 | Unknown method / malformed body | `tools/call` unknown tool; invalid JSON body | JSON-RPC `-32601`; parse error `-32700` | — |
| IT-M03 | TC-002 | Key auth + UID scoping | valid, revoked, and unknown keys | protected tools succeed only for valid key; errors are `UNAUTHENTICATED`; public tools unaffected by failed auth | — |
| IT-M04 | TC-003 | Quiz tools | `list_quizzes`, `get_quiz` incl. unknown ID | bilingual fields + dimensions; no rubric internals; not-found mirrors `ErrQuizNotFound` with no raw backend errors | — |
| IT-M05 | TC-004 | Knowledge search | queries incl. empty and over-length strings | published-only results with canonical URL + locale filter; schema errors on invalid input | — |
| IT-M06 | TC-005 | Result tools ownership | own, foreign, and unknown `resultID` | own detail returned; foreign ID's error shape identical to unknown ID; empty list handled with quiz hint | — |
| IT-M07 | TC-006 | Profile tool | populated profile incl. sensitive fields | non-sensitive fields only; `citizenId`/DBD excluded; null/empty profile handled | — |
| IT-M08 | TC-007 | Key management round-trip | create in web-app + web-backoffice, use via MCP, revoke | plaintext-once; scope matches creator role; revoked key fails within ≤ 60s; max-5 enforced; no cross-user visibility | — |
| IT-M09 | TC-008 | Rate limiting + audit | per-key and per-IP bursts | limits enforced; audit entries carry tool name, key prefix, outcome, latencyMs — no plaintext keys | — |

### 3.3 End-to-End (Playwright)

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Key lifecycle happy path | Registered user | Sign in → Settings → API Keys → create → copy → revoke | plaintext shown once, key listed with prefix, revoke confirmed via dialog, list updates | — |
| E2E-002 | Staff key in backoffice | Backoffice staff | Same flow in web-backoffice | key created with `backoffice` scope badge; only own keys visible | — |
| E2E-003 | Unauthenticated access | Anonymous | open `/settings/api-keys` | redirected to sign-in | — |
| E2E-004 | Connected-client smoke | Backoffice/staging | scripted MCP probe with a freshly created key | `tools/list` + one public and one protected `tools/call` succeed against staging | — |

## 4. Coverage Targets

| Component | Target | Tool |
|---|---|---|
| `apps/backend/services/apikey/service.go` | **≥ 80%** | `go test -cover` |
| `apps/backend/services/apikey/handler.go` | **≥ 60%** | `go test -cover` |
| `apps/mcp-server` tools + auth + error mapping | **≥ 70%** | Vitest (`vitest-pool-workers`) |
| Key management UI components | key paths | Vitest |

## 5. Test Commands

Run from repository root unless path is specified.

- `cd apps/backend && go test -v -race ./services/apikey/... -coverprofile=coverage.out`
- `cd apps/backend && go tool cover -func=coverage.out`
- `pnpm --filter @repo/mcp-server test`
- `pnpm --filter @repo/web-app test` · `pnpm --filter @repo/web-backoffice test`
- `pnpm --filter @repo/web-app test:e2e` (API keys suite)

## 6. Test Results

| Run Date | Environment | Backend Coverage | Worker Coverage | Frontend Tests | E2E Result | Notes |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | Local / CI | — | — | — | — | Initial plan stage |

## 7. Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Initial scenario sketch (TC-001 … TC-008) |
| 1.0.0 | 2026-07-03 | Sathittham Sangthong | Template-aligned rewrite: unit/integration/E2E tables with IDs, TC traceability preserved, coverage gates and commands added |

*Version: 1.0.0*
*Last updated: 3 July 2026*
