---
isoOutput: SI.O2
version: 0.2.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Draft
---

# Software Design Description — AI Customer Support Chatbot

*ISO 29110 Basic Profile · SI.O2*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | AI Customer Support Chatbot (`chat`) |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **SRS Reference** | [docs/product/ai-chatbot/feature-spec.md](../product/ai-chatbot/feature-spec.md) |

---

## 1. Introduction

### 1.1 Purpose
Design for the omni-channel AI support chatbot: one backend `chat` service with pluggable
channel adapters (web, LINE, Slack-bridge), a Claude-powered reply engine, a shared web
widget, and a backoffice console. Detail level: file layout, interfaces, data model, API
contracts, and the phase plan.

### 1.2 Scope
`apps/backend/services/chat/`, router wiring in `apps/backend/main.go`, one shared widget in
`packages/shared`, mount points in `apps/web-app` + `apps/web-official`, a Conversations
feature in `apps/web-backoffice`, Firestore collections/rules/indexes, and third-party
integrations (Claude API, LINE Messaging API, Slack Web/Events API).

### 1.3 Design Constraints
- Backend: Go + Chi + Firestore; response helpers from `pkg/`; UID from `middleware.GetUID(r)`
- Frontend: React 19 + shadcn/ui; TanStack Query for server state (per CR-003); i18n via `useLocale()`
- IDs: UUIDv4 server-side; camelCase Firestore fields; `Is*/Has*` booleans
- Webhooks must be publicly reachable through the api-gateway Worker (`/v1/webhooks/*` → `/api/v1/webhooks/*`)
- Cloud Run is stateless and scales to zero → no in-memory conversation state; no WebSockets (MVP uses short-polling)

---

## 2. System Architecture

### 2.1 Component Diagram

```
 CUSTOMER SIDE                                        TEAM SIDE
 ┌───────────────┐  ┌──────────────────┐              ┌──────────────────┐
 │ web-app       │  │ web-official     │              │ web-backoffice   │
 │ ChatWidget    │  │ ChatWidget island│              │ ConversationsPage│
 │ (Firebase     │  │ (anon auth +     │              │ (staff auth)     │
 │  user token)  │  │  Turnstile)      │              └────────┬─────────┘
 └──────┬────────┘  └──────┬───────────┘                       │ Bearer (backofficeRole)
        │ Bearer            │ Bearer (anon)                    │
        ▼                   ▼                                  ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ api-gateway (Cloudflare Worker)  /v1/* → Cloud Run /api/v1/*         │
 └──────────────────────────────┬───────────────────────────────────────┘
                                ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │ backend (Go+Chi, Cloud Run)                                          │
 │  services/chat/                                                      │
 │   handler.go ── customer + backoffice routes                         │
 │   webhook.go ── POST /webhooks/line · /webhooks/slack (sig-verified) │
 │   service.go ── conversation/message domain, status machine          │
 │   engine.go ─── Claude API client (grounded prompt, escalate tool)   │
 │   line.go ───── LINE Messaging API adapter (reply/push)              │
 │   slack.go ──── Slack bridge (chat.postMessage thread, events relay) │
 └───────┬───────────────┬────────────────┬─────────────────────────────┘
         ▼               ▼                ▼
   [Firestore]     [Claude API]   [LINE Platform]   [Slack Workspace]
   conversations                   ▲ webhook          ▲ events (Phase 5)
   + messages                      └ LINE OA user     └ #customer-support
```

### 2.2 Deployment Context
- Backend: existing Cloud Run service (no new binary; webhooks are just new routes)
- LINE webhook URL registered in LINE Developers console → `https://api.factorysyncsolutions.com/v1/webhooks/line`
- Slack app (Phase 5): bot token scopes `chat:write`, `channels:history`; Events API request URL → `.../v1/webhooks/slack`
- Widget ships inside each app's bundle from `packages/shared` (no separate deploy)
- LLM: **Gemini Flash on the Gemini Enterprise Agent Platform** (the 2026 rebrand of
  Vertex AI — "Vertex" naming persists in SDK/env conventions) in the same GCP project —
  auth via the Cloud Run service account (ADC), **no API key**. We consume only the
  foundation-model token meter: no Agent Engine runtime, Session/Memory Bank, or Vertex AI
  Search (our Cloud Run service + Firestore already own those roles). Prerequisites: enable
  the platform API, grant `roles/aiplatform.user` to the Cloud Run SA, set a GCP budget
  alert (project is owned by a personal account — verify billing alerts land somewhere watched)
- New env vars on Cloud Run: `CHATBOT_MODEL` (Gemini Flash tier, e.g. `gemini-3.5-flash`),
  `VERTEX_LOCATION` (EU region matching Cloud Run), `LINE_CHANNEL_SECRET`,
  `LINE_CHANNEL_ACCESS_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_SUPPORT_CHANNEL_ID`

### 2.3 Development Phase Plan

Each phase is its own `feature/*` branch + PR into `develop`, released independently through
staging. The test plan (`docs/product/ai-chatbot/test-plan.md`) gains a section per phase
**before** that phase's implementation (TDD via `@qa-dev`).

| # | Phase (branch) | Delivers | SRS | Estimate |
|---|---|---|---|---|
| 1 | **Core service + AI engine + web-app bubble** (`feature/chatbot-core`) | `services/chat/` (models, service, status machine, handlers, tests) · `engine.go` on Vertex Gemini Flash with `escalate_to_human` function call + canned bilingual fallback · `config/chatbot-knowledge.md` (TH/EN) · one-way Slack escalation card · `ChatWidget` in `packages/shared` mounted in web-app `Layout.tsx` · Firestore rules + indexes | FR-001–007, FR-010, FR-014 | 2–3 days |
| 2 | **Backoffice console** (`feature/chatbot-backoffice`) | Conversations list + detail pages, takeover / agent reply / hand-back / close, `/backoffice/chat/*` endpoints, nav + i18n | FR-012, FR-013 | 1–2 days |
| 3 | **Public-site widget** (`feature/chatbot-official`) | Astro island in `Layout.astro` (`client:visible`), Firebase anonymous sign-in on open, Turnstile-gated conversation creation, per-conversation rate limit | FR-015 | 1–2 days |
| 4 | **LINE OA channel** (`feature/chatbot-line`) | `/webhooks/line` (signature verify, idempotency, async ACK), reply-token/push delivery, LINE-user conversation mapping | FR-008, FR-009 | 1–2 days |
| 5 | **Slack two-way relay** (`feature/chatbot-slack-relay`) | `/webhooks/slack` Events API (signing secret + `url_verification`), thread bridge, agent-reply relay, loop prevention | FR-011 | 1–2 days |

**Per-phase prerequisites and exit criteria:**

| # | External prerequisites (before coding) | Exit criteria (before promoting) |
|---|---|---|
| 1 | Vertex AI API enabled; `roles/aiplatform.user` on Cloud Run SA; GCP budget alert; knowledge file content drafted | ≥ 80% coverage on `services/chat`; e2e chat + escalation verified on staging web-app; Slack alert received |
| 2 | Phase 1 live on staging | Staff can take over, reply, and close e2e; `RequireBackofficeRole` gates verified |
| 3 | Firebase **Anonymous Auth provider enabled**; Turnstile site key for web-official | Smoke test against the **built** Astro output; Turnstile + rate limits verified against abuse |
| 4 | LINE OA created, Messaging API channel + secret/token; webhook URL registered in LINE console | Signature unit tests; live conversation on the staging LINE OA; redelivery idempotency verified |
| 5 | Slack app installed (bot token: `chat:write`, `channels:history`; signing secret) | Agent reply from a Slack thread reaches web and LINE customers; bot-message loop test passes |

**Roadmap (separate CRs, not in CR-004 scope):**
- **Phase 6 — Agentic tools + ADK-Go migration**: when the bot gains real tools (health-check
  result lookup, consultation booking), migrate `engine.go` from direct `genai` calls to
  `google.golang.org/adk` (multi-tool orchestration, eval tooling) with a Firestore-backed
  session bridge. Swap is contained behind the engine interface.
- **Phase 7 — RAG over the CMS Knowledge Hub**: Vertex embedding model + Firestore native
  vector search (KNN) — no Vertex AI Vector Search endpoint (standing node cost not justified
  by corpus size).

---

## 3. Component Design

### 3.1 Backend — `services/chat/`

Files: `handler.go`, `webhook.go`, `service.go`, `engine.go`, `line.go`, `slack.go`,
`models.go`, `service_test.go`, `handler_test.go`, `engine_test.go`.

#### 3.1.1 handler.go

| Handler Method | Route | Auth Guard | Calls |
|---|---|---|---|
| `StartConversation` | `POST /api/v1/chat/conversations` | FirebaseAuth (+Turnstile if `channel=web-official`) | `svc.StartConversation` |
| `GetCurrentConversation` | `GET /api/v1/chat/conversations/current` | FirebaseAuth | `svc.GetOpenConversationByUID` |
| `SendMessage` | `POST /api/v1/chat/conversations/{conversationID}/messages` | FirebaseAuth | `svc.SendCustomerMessage` |
| `ListMessages` | `GET /api/v1/chat/conversations/{conversationID}/messages` | FirebaseAuth | `svc.ListMessages` |
| `BackofficeListConversations` | `GET /api/v1/backoffice/chat/conversations` | RequireBackofficeRole | `svc.ListConversations` |
| `BackofficeGetConversation` | `GET /api/v1/backoffice/chat/conversations/{conversationID}` | RequireBackofficeRole | `svc.GetConversation` |
| `BackofficeReply` | `POST /api/v1/backoffice/chat/conversations/{conversationID}/messages` | RequireBackofficeRole | `svc.SendAgentMessage` |
| `BackofficeUpdateStatus` | `PATCH /api/v1/backoffice/chat/conversations/{conversationID}` | RequireBackofficeRole | `svc.UpdateStatus` |

Registered in `main.go`: `r.Route("/chat", chatHandler.Routes)` inside the authenticated
group; `r.Route("/webhooks", chatHandler.WebhookRoutes)` inside the **public** group
(signature middleware per platform); backoffice routes inside the existing
`/backoffice` group. Ownership rule: customer routes 404 (`ErrConversationNotFound`) when
`conversation.userID != GetUID(r)` — no existence leak.

`FirebaseAuth` verifies anonymous-provider tokens like any other Firebase user, so
web-official visitors reuse the middleware unchanged; chat is the only route family where
anonymous UIDs are meaningful (other services 404 on unregistered profiles already).

#### 3.1.2 service.go

| Method | Signature | Description |
|---|---|---|
| `StartConversation` | `(ctx, uid, channel, locale, text string) (*Conversation, *Message, *Message, error)` | Creates (or reuses open) conversation, stores first message, runs engine, returns bot reply |
| `SendCustomerMessage` | `(ctx, uid, conversationID, text string) (*Message, *Message, error)` | Stores customer msg; engine reply if `status=bot`; relay to Slack thread if bridged |
| `ListMessages` | `(ctx, uid, conversationID, cursor string, limit int) ([]Message, string, error)` | Ownership-checked history + poll cursor |
| `SendAgentMessage` | `(ctx, agentUID, conversationID, text string) (*Message, error)` | Stores agent msg, delivers to customer channel (web=poll pickup, LINE=push) |
| `UpdateStatus` | `(ctx, agentUID, conversationID string, status Status) error` | Validates transition; sets `agentUID`, timestamps |
| `Escalate` | `(ctx, conversationID, reason string) error` | Idempotent; sets status, fires Slack alert + domain event |
| `HandleLineEvent` / `HandleSlackEvent` | `(ctx, event) error` | Adapter entrypoints (webhook.go → here) |

Status machine (validated here, never in handlers):
`bot → escalated → human → closed`; `human → bot` (hand-back); `* → closed`; customer
message on `closed` starts a new conversation.

Sentinel errors:
```go
var (
    ErrConversationNotFound = errors.New("conversation not found")
    ErrConversationClosed   = errors.New("conversation closed")
    ErrMessageTooLong       = errors.New("message too long")
    ErrInvalidTransition    = errors.New("invalid status transition")
    ErrChannelDeliveryFailed = errors.New("channel delivery failed")
)
```

Escalation alert + domain events (`chat.conversation.escalated`, `chat.message.created`)
publish via the existing `pkg/events` publisher (fire-and-forget, same pattern as quiz/profile).

#### 3.1.3 models.go

```go
type Conversation struct {
    ID                 string     `firestore:"id"                 json:"id"`
    Channel            string     `firestore:"channel"            json:"channel"` // web-app | web-official | line
    UserID             string     `firestore:"userID"             json:"userID"`
    LineUserID         string     `firestore:"lineUserID,omitempty" json:"lineUserID,omitempty"`
    Status             string     `firestore:"status"             json:"status"`  // bot | escalated | human | closed
    Locale             string     `firestore:"locale"             json:"locale"`
    LastMessageAt      time.Time  `firestore:"lastMessageAt"      json:"lastMessageAt"`
    LastMessagePreview string     `firestore:"lastMessagePreview" json:"lastMessagePreview"`
    MessageCount       int        `firestore:"messageCount"       json:"messageCount"`
    AgentUID           string     `firestore:"agentUID,omitempty" json:"agentUID,omitempty"`
    SlackThreadTS      string     `firestore:"slackThreadTS,omitempty" json:"-"`
    EscalatedAt        *time.Time `firestore:"escalatedAt,omitempty" json:"escalatedAt,omitempty"`
    ClosedAt           *time.Time `firestore:"closedAt,omitempty"  json:"closedAt,omitempty"`
    CreatedAt          time.Time  `firestore:"createdAt"          json:"createdAt"`
}

type Message struct {
    ID               string    `firestore:"id"        json:"id"`
    Role             string    `firestore:"role"      json:"role"` // customer | bot | agent
    Text             string    `firestore:"text"      json:"text"`
    SenderID         string    `firestore:"senderID"  json:"-"`     // UID / "bot" / agent UID
    ChannelMessageID string    `firestore:"channelMessageID,omitempty" json:"-"` // LINE event id / Slack ts (idempotency)
    CreatedAt        time.Time `firestore:"createdAt" json:"createdAt"`
}

type SendMessageRequest struct {
    Text string `json:"text" validate:"required,max=4000"`
}

type StartConversationRequest struct {
    Text   string `json:"text"   validate:"required,max=4000"`
    Locale string `json:"locale" validate:"omitempty,oneof=th en"`
}
```

### 3.2 AI Engine — `engine.go`

- Google Gen AI Go SDK `google.golang.org/genai` with the **Vertex backend** (ADC auth from
  the Cloud Run service account — no API key); model from `CHATBOT_MODEL` (Gemini Flash tier —
  cheap, fast, strong Thai, sufficient for grounded support), region from `VERTEX_LOCATION`.
- Direct SDK calls in MVP (single agent, single tool). Migration to ADK-Go
  (`google.golang.org/adk`) is planned for the multi-tool roadmap phase (§2.3) and is
  contained behind this file's interface.
- **System prompt** assembled from `apps/backend/config/chatbot-knowledge.md` (curated,
  versioned in git; TH+EN content covering services, quiz variants, onboarding, contact
  info) plus behavioral rules: answer in the customer's language, stay in scope, never
  invent pricing/commitments, offer escalation when unsure.
- **Context window**: last 20 messages of the conversation mapped to user/assistant turns.
- **Escalation**: one tool `escalate_to_human(reason)` exposed to the model; a tool call —
  or any engine error — triggers `svc.Escalate` and a bilingual handoff message. Explicit
  customer keywords are also checked before the model call.
- **Cost guardrails**: `max_tokens` 1024; per-conversation rate limit 10 msg/min enforced in
  the service (Firestore `messageCount`+window check); no streaming in MVP (polling UI).
- Nil-client degradation mirrors `EmailClient`: if Vertex is unconfigured (`CHATBOT_MODEL`
  unset or client init fails at startup), engine is nil → canned bilingual apology +
  auto-escalate (FR-005).

### 3.3 Channel Adapters

**`line.go`** — verifies `X-Line-Signature` (HMAC-SHA256, channel secret) on the raw body;
parses Messaging API events; text events → `svc.HandleLineEvent` keyed by `lineUserID`
(single-field index lookup); replies via reply token when fresh, else push API; webhook
handler ACKs 200 immediately and processes events in a goroutine with its own context
(Cloud Run: request-scoped ctx would be cancelled — use `context.WithoutCancel`).
Idempotency via `webhookEventId` stored as `channelMessageID`.

**`slack.go`** — Phase 1: escalation card via bot token `chat.postMessage` to
`SLACK_SUPPORT_CHANNEL_ID` (falls back to the existing incoming-webhook style if only a
webhook URL is configured); stores `ts` as `slackThreadTS`. Phase 5: Events API endpoint
verifies `X-Slack-Signature` (v0 HMAC + timestamp ≤ 5 min), handles `url_verification`
challenge, relays human `message` events in bridged threads → `svc.SendAgentMessage`;
ignores `bot_id` messages (loop prevention).

### 3.4 Frontend — shared widget (`packages/shared`)

`packages/shared/src/ui/chat-widget/` → exported as `@shared/ui/chat-widget`:

| File | Responsibility |
|---|---|
| `ChatWidget.tsx` | Floating bubble + panel (shadcn Sheet-style on mobile, popover card on desktop) |
| `useChatSession.ts` | TanStack Query hooks: current conversation, message list w/ 3s poll while open, send mutation |
| `types.ts` | `Conversation`, `ChatMessage`, request types |
| `i18n.ts` | Widget strings TH/EN (consumed through each app's locale context) |

Props keep the widget host-agnostic:
```typescript
interface ChatWidgetProps {
  getIdToken: () => Promise<string>        // web-app: current user; web-official: anon sign-in on open
  apiBaseUrl: string
  locale: 'th' | 'en'
  getTurnstileToken?: () => Promise<string> // web-official only
}
```
- **web-app**: mounted once in `apps/web-app/src/components/Layout.tsx` (inside `SidebarInset`,
  after `<Outlet/>`); token from the existing Firebase auth session.
- **web-official**: Astro island in `Layout.astro`, hydrated `client:visible`/`client:idle`
  (never `client:load` — known island hydration deadlock in the static build); Firebase
  anonymous `signInAnonymously()` on first open; Turnstile invisible widget for
  conversation creation. Verify against the **built** output in e2e, not dev.

### 3.5 Frontend — backoffice (`apps/web-backoffice`)

| File | Route / Usage |
|---|---|
| `src/pages/ConversationsPage.tsx` | `/conversations` — filterable list (status/channel chips, `DataTable`-style list, escalated-first sort) |
| `src/pages/ConversationDetailPage.tsx` | `/conversations/:conversationID` — transcript, reply composer, takeover/hand-back/close actions |
| `src/api/chat.ts` | API client functions |
| `router.tsx` | Routes registered in the staff-guarded group |
| `components/Layout.tsx` | `nav.conversations` breadcrumb + sidebar entry (TH/EN) |

Detail page polls (5s) while open — same poll-not-push decision as the widget.

---

## 4. Data Design

### 4.1 Firestore Collections

```
conversations/{conversationID}                  # UUIDv4
  ├── (fields per models.go Conversation)
  └── messages/{messageID}                      # UUIDv4, subcollection
        └── (fields per models.go Message)
```

**Open-conversation lookup:** query `userID == uid AND status != closed` (web) or
`lineUserID == id AND status != closed` (LINE), newest first, limit 1.

**Indexes required** (add to `firestore.indexes.json`):
```json
{ "collectionGroup": "conversations", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "status", "order": "ASCENDING" },
              { "fieldPath": "lastMessageAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "conversations", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "userID", "order": "ASCENDING" },
              { "fieldPath": "lastMessageAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "conversations", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "lineUserID", "order": "ASCENDING" },
              { "fieldPath": "lastMessageAt", "order": "DESCENDING" } ] }
```

### 4.2 Security Rules

```javascript
match /conversations/{conversationID} {
  allow read, write: if false;                   // backend only — transcripts hold PII
  match /messages/{messageID} {
    allow read, write: if false;
  }
}
```

---

## 5. Interface Design

### 5.1 API Contract (representative)

**`POST /api/v1/chat/conversations`**
```
Headers: Authorization: Bearer <firebase-id-token>
         X-Turnstile-Token: <token>              # required when the caller is anonymous
Body:    { "text": "สวัสดี สนใจ health check ค่ะ", "locale": "th" }
201: { "success": true, "data": { "conversation": {...}, "messages": [ {customer}, {bot} ] } }
400: { "success": false, "error": { "code": "VALIDATION_ERROR", ... } }
```

**`POST /api/v1/chat/conversations/{id}/messages`**
```
201: { "success": true, "data": { "message": {customer}, "reply": {bot|null} } }
404: NOT_FOUND (not owner / unknown id)  ·  429: RATE_LIMITED
```

**`GET /api/v1/chat/conversations/{id}/messages?after=<cursor>&limit=50`**
```
200: { "success": true, "data": [ ...messages ], "meta": { "nextCursor": "..." } }
```

**`PATCH /api/v1/backoffice/chat/conversations/{id}`**
```
Body: { "status": "human" }        # takeover · "bot" hand-back · "closed" close
200 | 400 INVALID_TRANSITION
```

Webhook endpoints return platform-required shapes (LINE: 200 empty; Slack:
`challenge` echo for `url_verification`, else 200).

### 5.2 UI Description
- **Widget**: bottom-right FAB (brand color, unread dot) → panel with header (title +
  status line "AI assistant" / "You're chatting with our team"), scrollable messages
  (customer right, bot/agent left with avatar), typing indicator during AI generation,
  input with 4,000-char limit, escalation CTA in the bot's fallback replies. Mobile:
  full-screen sheet.
- **Backoffice list**: status filter chips (Escalated / Bot / Human / Closed), channel
  icons (LINE/web), relative last-activity via `formatDateTime()`.
- **Backoffice detail**: transcript with role-colored bubbles, sticky action bar
  (Take over · Hand back to bot · Close), composer disabled until takeover.

---

## 6. Security Design

| Threat | Mitigation |
|---|---|
| Unauthenticated chat access | `middleware.FirebaseAuth` on all customer routes (anonymous provider allowed for chat only) |
| Widget abuse / bot spam on public site | Turnstile on conversation creation + per-conversation rate limit + global IP rate limit |
| Forged LINE/Slack webhooks | HMAC signature verification on raw body; Slack timestamp freshness ≤ 5 min; 401 on mismatch |
| Cross-user transcript read | Service scopes every query by `uid` from context; 404 on non-ownership; backoffice reads gated by `RequireBackofficeRole` server-side |
| Prompt injection via customer messages | System prompt authority + single narrow tool (`escalate_to_human`); engine has no data-access tools; replies never executed |
| LLM data leakage | Only the current conversation's messages + public knowledge file are sent to Vertex AI (same GCP project, EU region); no profile/assessment data in MVP |
| Secrets exposure | All keys env-var only; `SlackThreadTS`/`SenderID`/`ChannelMessageID` excluded from JSON (`json:"-"`) |
| Relay loops (Slack) | Ignore events with `bot_id`; idempotency on `channelMessageID` |

---

## 7. Traceability to Requirements

| Design Element | SRS Requirement |
|---|---|
| `handler.go: StartConversation` + Turnstile check | FR-001 |
| `service.go: SendCustomerMessage` + status machine | FR-002, FR-004, FR-007 |
| `handler.go: ListMessages` (cursor) | FR-003 |
| `engine.go` (grounded prompt, nil-client fallback) | FR-005 |
| `engine.go: escalate_to_human` tool + `svc.Escalate` | FR-006 |
| `line.go` webhook + signature + idempotency | FR-008 |
| `line.go` reply/push delivery | FR-009 |
| `slack.go` escalation card | FR-010 |
| `slack.go` Events API relay (Phase 5) | FR-011 |
| `ConversationsPage.tsx` | FR-012 |
| `ConversationDetailPage.tsx` + `SendAgentMessage` | FR-013 |
| `ChatWidget` in web-app `Layout.tsx` | FR-014 |
| `ChatWidget` island in web-official `Layout.astro` | FR-015 |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Initial design (CR-004) |
| 0.2.0 | 2026-07-03 | Sathittham Sangthong | Engine moved to Vertex AI Gemini Flash (ADC, no API key); development phase plan expanded with prerequisites/exit criteria + ADK/RAG roadmap |
