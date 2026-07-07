---
isoOutput: SI.O4 / SI.O5
version: 0.1.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Active
---

# Test Plan — AI Customer Support Chatbot

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*
*Sections are added per development phase (SDD §2.3) before that phase's implementation.*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | AI Customer Support Chatbot (`chat`) |
| **Version** | 0.1.0 (covers Phase 1) |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **SRS Reference** | [docs/product/ai-chatbot/feature-spec.md](feature-spec.md) |
| **SDD Reference** | [docs/architecture/ai-chatbot-design.md](../../architecture/ai-chatbot-design.md) |

---

## 1. Test Scope

### 1.1 In Scope (Phase 1)
- Conversation/message domain logic incl. status machine — `apps/backend/services/chat/service_test.go`
- Engine behavior contracts (escalation triggers, nil-engine fallback) — `engine_test.go` (Gemini client mocked behind an interface)
- Handler request/response + auth + ownership — `handler_test.go`
- ChatWidget component + hooks — `packages/shared/src/ui/chat-widget/*.test.tsx`

### 1.2 Out of Scope (Phase 1)
- Live Gemini API calls (engine tested against a mocked model interface)
- LINE / Slack Events webhooks (Phases 4–5 — sections added then)
- Backoffice UI (Phase 2), web-official island (Phase 3)
- E2E Playwright flow — added when the widget lands on staging

### 1.3 Test Environment
| Environment | Details |
|---|---|
| Backend | `go test -race -cover ./services/chat/...` |
| Frontend | Vitest + jsdom (`pnpm --filter @repo/shared test`) |
| Firestore | Mock repository interface (per existing service pattern) |
| Auth | `middleware/testing.go` — `InjectUID(uid)` helper |
| LLM | `modelClient` interface stub (canned replies / forced tool call / forced error) |

---

## 2. Unit Test Cases (SI.O4)

### 2.1 Backend — `service_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | Start conversation — new | No open conversation for UID | `uid`, `channel: web-app`, valid text | Conversation `status: bot`, customer msg + bot reply stored | — |
| UT-002 | Start conversation — reuse open | Open conversation exists for UID | Same UID, new text | No new conversation; message appended to existing | — |
| UT-003 | Send message — bot replies | Conversation `status: bot` | Valid text | Customer msg stored; bot reply returned (`role: bot`) | — |
| UT-004 | Send message — escalated, no AI | Conversation `status: escalated` | Valid text | Msg stored; no bot reply generated (FR-007) | — |
| UT-005 | Send message — not owner | Conversation owned by other UID | `uid: "intruder"` | `ErrConversationNotFound` (no existence leak) | — |
| UT-006 | Send message — closed conversation | Conversation `status: closed` | Valid text | New conversation created transparently (FR-004) | — |
| UT-007 | Send message — too long | — | 4,001-char text | `ErrMessageTooLong` | — |
| UT-008 | List messages — pagination | 60 messages stored | `limit: 50`, then cursor | 50 asc + cursor; next page returns remaining 10 | — |
| UT-009 | Escalate — sets status + idempotent | `status: bot` | `Escalate()` twice | `status: escalated`, `escalatedAt` set; single Slack alert (FR-006) | — |
| UT-010 | Status transitions — legal/illegal | Each status | Each target status | Legal transitions succeed; illegal return `ErrInvalidTransition` | — |
| UT-011 | Rate limit — msg burst | 10 msgs in window | 11th message | Rate-limit error (429 at handler) | — |

### 2.2 Backend — `engine_test.go`

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-020 | Reply generation — happy path | Stub model returns text | Customer msg + history | Bot reply persisted verbatim from model text | — |
| UT-021 | Escalation tool call | Stub model calls `escalate_to_human` | Customer msg | `svc.Escalate` invoked; bilingual handoff msg returned (FR-006) | — |
| UT-022 | Explicit human request keyword | — | "ขอคุยกับคน" / "talk to a human" | Escalates without model call | — |
| UT-023 | Nil engine — graceful fallback | Engine unconfigured | Customer msg | Canned bilingual apology + auto-escalate; no error to caller (FR-005) | — |
| UT-024 | Model error — graceful fallback | Stub model returns error | Customer msg | Same fallback path as UT-023; error logged not propagated | — |
| UT-025 | History windowing | 30 messages in conversation | New msg | Model receives system prompt + last 20 turns only | — |
| UT-026 | LINE webhook dedupe | Same LINE webhook event ID replayed | Duplicate webhook payload | Customer message stored once; dedupe record updated; second payload ignored | — |

### 2.3 Frontend — `chat-widget/*.test.tsx`

| ID | Test Name | Component | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | Bubble renders closed | `ChatWidget` | — | Mount | FAB visible, panel hidden, aria-label present | — |
| UT-F02 | Panel opens + loads history | `ChatWidget` | Mock API returns conversation | Click FAB | Messages rendered chronologically | — |
| UT-F03 | Send message optimistic + reply | `ChatWidget` | Open panel | Type + submit | Customer bubble immediate; bot reply appended on response | — |
| UT-F04 | Typing indicator during send | `ChatWidget` | Send in flight | — | Indicator visible until reply resolves | — |
| UT-F05 | Error state on send failure | `ChatWidget` | Mock API 500 | Submit | Bilingual error notice; input re-enabled; retry possible | — |
| UT-F06 | Empty/overlong input blocked | `ChatWidget` | — | Submit "" / 4,001 chars | Send disabled / validation message; no API call | — |
| UT-F07 | Locale strings | `ChatWidget` | `locale: th` then `en` | Mount | Chrome strings switch via i18n map, no hardcoded text | — |
| UT-F08 | Polling only while open | `useChatSession` | Panel closed | Advance timers | No refetch when closed; refetch ≥3s interval when open | — |

---

## 3. Integration Test Cases (SI.O5)

### 3.1 Backend Handler Tests — `handler_test.go`

| ID | Endpoint | Auth | Request Body | Expected Status | Expected Response | Status |
|---|---|---|---|---|---|---|
| IT-001 | `POST /chat/conversations` | Valid UID | `{text, locale}` | 201 | `success: true`, conversation + customer/bot messages | — |
| IT-002 | `POST /chat/conversations` | No token | valid | 401 | `UNAUTHORIZED` | — |
| IT-003 | `POST /chat/conversations` | Valid UID | `{text: ""}` | 400 | `VALIDATION_ERROR` | — |
| IT-004 | `GET /chat/conversations/current` | Valid UID | — | 200 / 404 | Open conversation or `NOT_FOUND` | — |
| IT-005 | `POST /chat/conversations/{id}/messages` | Owner UID | `{text}` | 201 | Message + reply (or `reply: null` when escalated) | — |
| IT-006 | `POST /chat/conversations/{id}/messages` | Non-owner UID | `{text}` | 404 | `NOT_FOUND` | — |
| IT-007 | `GET /chat/conversations/{id}/messages` | Owner UID | `?limit=50` | 200 | `RespondList` shape with `nextCursor` meta | — |
| IT-008 | `POST .../messages` rate-limited | Owner UID | 11th msg in window | 429 | `RATE_LIMITED` | — |
| IT-009 | `POST /webhooks/line` duplicate event | Valid signature | Same event payload sent twice (same `webhookEventId`) | 200 both times; one stored message total | — |

### 3.2 End-to-End (Playwright) — deferred to staging deploy

| ID | Scenario | User | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Chat happy path | Registered user | Open bubble → ask about health check → receive reply | Bot reply visible; history persists on reopen | — |
| E2E-002 | Escalation | Registered user | Ask for a human | Handoff message; Slack alert received (manual check) | — |

---

## 4. Coverage Targets

| Component | Coverage Target | Tool |
|---|---|---|
| `services/chat/service.go` | ≥ 80% | `go test -cover` |
| `services/chat/engine.go` | ≥ 80% (logic paths; SDK adapter excluded) | `go test -cover` |
| `services/chat/handler.go` | ≥ 60% | `go test -cover` |
| `chat-widget` component + hook | Key paths (UT-F01..F08) | Vitest |

Run: `cd apps/backend && go test -v -race -cover ./services/chat/...`

---

## 5. Test Results

| Run Date | Environment | Backend Coverage | Frontend Tests | Result | Notes |
|---|---|---|---|---|---|
| 2026-07-03 | Not yet executed (planned during implementation) | — | — | — | Phase 1 manual smoke and pipeline hooks to be added before Phase 1 implementation complete |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Phase 1 test cases (core service, engine, widget) |

*Version: 0.1.0*
*Last updated: 3 July 2026*
