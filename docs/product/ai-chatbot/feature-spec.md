---
isoOutput: SI.O1
version: 0.2.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Draft
---

# Software Requirements Specification — AI Customer Support Chatbot

*ISO 29110 Basic Profile · SI.O1*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | AI Customer Support Chatbot (`chat`) |
| **Version** | 0.2.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **Approved By** | Pending (CR-004) |
| **Approval Date** | — |

---

## 1. Introduction

### 1.1 Purpose

FactorySync Solutions has no in-product customer support channel today — customers can only
use the contact form on the official site, and the support team is notified one-way via Slack
webhooks. This feature adds an **AI-first customer support chatbot** that answers customer
questions (services, health-check quizzes, pricing inquiries, how-to) in Thai and English,
across every customer touchpoint, and **escalates to the human support team** when the AI
cannot help or the customer asks for a person.

Customer-facing channels: **LINE Official Account**, a **chat bubble on `web-app`**
(authenticated users) and on **`web-official`** (anonymous visitors).
Team-facing surfaces: **Slack** (escalation notifications, and later two-way agent replies)
and a **Conversations page in `web-backoffice`** (transcript review, human takeover, close).

### 1.2 Scope

**In scope:**
- New backend `chat` service: conversations, messages, AI reply engine (Vertex AI Gemini), channel adapters
- Escalation workflow: bot → escalated (Slack notified) → human takeover → closed
- Web chat widget (shared React component) mounted in `web-app` and `web-official`
- LINE Official Account integration (Messaging API webhook + replies)
- Slack support-team integration (escalation notification; later two-way thread relay)
- Backoffice Conversations page (list, transcript, agent reply, close)

**Out of scope (this SRS):**
- Voice/phone support, file/image attachments in chat
- CSAT surveys, SLA dashboards, support analytics
- Facebook Messenger / WhatsApp / other channels
- RAG over the CMS Knowledge Hub (MVP uses a curated knowledge file; RAG is a follow-up CR —
  SDD §2.3 roadmap Phase 7)
- Agentic tools beyond escalation (result lookup, consultation booking) and the ADK-Go
  migration that comes with them (SDD §2.3 roadmap Phase 6)
- Proactive outbound campaigns (broadcast messages via LINE)

### 1.3 Definitions & Abbreviations

| Term | Definition |
|---|---|
| Conversation | A thread of messages between one customer and the bot/agents on one channel |
| Channel | Origin of a conversation: `web-app`, `web-official`, or `line` |
| Escalation | Transition from AI handling to the human support team |
| Takeover | A human agent assumes the conversation; the bot stops replying |
| LINE OA | LINE Official Account (business account on the LINE platform) |
| Messaging API | LINE's webhook + reply/push HTTP API |
| Events API | Slack's webhook API for receiving workspace events (agent thread replies) |

### 1.4 References

| Document | Link |
|---|---|
| Architecture Overview | [docs/architecture/overview.md](../../architecture/overview.md) |
| SDD — AI Chatbot | [docs/architecture/ai-chatbot-design.md](../../architecture/ai-chatbot-design.md) |
| Change Request | CR-004 in [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) |
| Notification service (existing Slack/email patterns) | [docs/product/notification/feature-spec.md](../notification/feature-spec.md) |
| LINE Messaging API | https://developers.line.biz/en/docs/messaging-api/ |
| Slack Events API | https://api.slack.com/apis/events-api |
| Vertex AI Gemini | https://cloud.google.com/vertex-ai/generative-ai/docs |

---

## 2. Overall Description

### 2.1 Product Context

The chatbot spans four apps and one new backend service:

- `apps/backend/services/chat/` — **new** service: conversation/message domain, AI engine,
  LINE + Slack adapters. Registered in `main.go` like existing services.
- `apps/web-app` — chat bubble in the global `Layout.tsx` shell (authenticated users).
- `apps/web-official` — chat bubble as a React island in `Layout.astro` (anonymous visitors).
- `apps/web-backoffice` — new Conversations page for the support team.
- Existing infra reused: Firebase Auth middleware, `pkg` response helpers, Turnstile
  verification (`pkg/turnstile.go`), domain-event publisher (Pub/Sub), api-gateway Worker
  (already forwards `X-Turnstile-Token`), Slack notification patterns from
  `services/notification/slack.go`.

For `web-official`, chat routes are authenticated via Firebase anonymous tokens in the same
`Authorization: Bearer <token>` pattern as all other chat routes; the widget must sign in
anonymously before opening the first conversation.

### 2.2 User Classes & Characteristics

| User Class | Description | Access Level |
|---|---|---|
| Anonymous Visitor | web-official visitor using the chat bubble | Firebase Anonymous Auth token + Turnstile |
| End User | Registered factory operator chatting in web-app | Authenticated |
| LINE User | Customer messaging the LINE Official Account | LINE webhook (signature-verified) |
| Support Agent | Backoffice staff answering escalations | `backofficeRole: staff/superadmin` |
| Super Admin | Configures chatbot settings, reviews transcripts | `backofficeRole: superadmin` |

### 2.3 Assumptions & Dependencies

- A LINE Official Account exists (or will be created) with Messaging API enabled; channel
  secret and channel access token are available as env vars.
- A Slack app with a bot token can be installed in the support workspace (two-way relay);
  until then, escalation notifications reuse the incoming-webhook pattern.
- Vertex AI API enabled on the existing GCP project; Gemini Flash (env-overridable
  `CHATBOT_MODEL`) accessed via the Cloud Run service account (ADC) — no API key secret.
- Firebase **Anonymous Auth provider is enabled** for the web-official widget (reuses the
  existing `FirebaseAuth` middleware unchanged after anonymous token issuance in the widget).
- Knowledge content (services, quiz variants, contact info, FAQs) is curated into a
  versioned knowledge file; accuracy of answers is bounded by this file.
- Depends on existing: `pkg/events` publisher, `pkg/turnstile.go`, api-gateway CORS allowlist.

### 2.4 Constraints

- Must follow project conventions: `pkg.RespondJSON`/`RespondList`/`RespondError`, shadcn/ui,
  `useLocale()`, `formatDateTime()`; UID always from `middleware.GetUID(r)`.
- All UI text bilingual TH/EN via i18n — including bot canned messages and widget chrome.
- Webhook endpoints (`/webhooks/line`, `/webhooks/slack`) are public routes but MUST verify
  platform signatures before processing (LINE `X-Line-Signature`; Slack signing secret).
- AI failures must degrade gracefully: if the Gemini API is unavailable, the bot sends a
  bilingual canned apology and auto-escalates — a chat message must never 500 the customer.
- Chat transcripts contain PII → Firestore access is backend-only (no client SDK reads).
- All conversation ownership and actor IDs for chat endpoints must come from `middleware.GetUID(r)` only
  (including web-official anonymous sessions after Firebase sign-in).

---

## 3. Functional Requirements

### 3.1 Conversation & Messaging Core

#### FR-001 — Start a web conversation

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner (CR-004) |
| **Test Case** | TC-001 |

**Description:**
The system shall create a conversation when a web customer opens the chat widget and sends
their first message. `web-official` conversations additionally require a valid Turnstile token.

**Acceptance Criteria:**
- Given an authenticated web-app user, when they POST their first message, then a conversation
  is created with `channel: "web-app"`, `userID` from auth context, `status: "bot"`.
- Given an anonymous web-official visitor with a valid Turnstile token and a valid Firebase anonymous
  token, when they start a chat, then a conversation is created with `channel: "web-official"` bound to their anonymous UID.
- Given a missing/invalid Turnstile token on `web-official`, then the API responds 400 and no
  conversation is created.
- Given a missing/invalid Firebase anonymous token on `web-official`, then the API responds 401 and no
  conversation is created.

#### FR-002 — Send message and receive AI reply

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-002 |

**Description:**
The system shall persist each customer message and, while the conversation status is `bot`,
generate and persist an AI reply.

**Acceptance Criteria:**
- Given an open `bot` conversation, when the customer sends a message, then the message is
  stored (`role: "customer"`) and an AI reply is stored (`role: "bot"`) and returned.
- Given a conversation in `escalated`/`human` status, when the customer sends a message, then
  it is stored and relayed to the team surface, and **no** AI reply is generated (FR-007).
- Given an empty or > 4,000-char message, then the API responds 400 `VALIDATION_ERROR`.

#### FR-003 — Conversation history

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-003 |

**Description:**
The system shall return a customer's own conversation with messages in chronological order
(cursor-paginated), so the widget can restore history on reopen and poll for new messages.

**Acceptance Criteria:**
- Given a conversation owned by the caller's UID, when they GET messages, then messages return
  ordered by `createdAt` ascending with a cursor for incremental polling.
- Given a conversation owned by another UID, then the API responds 404 (no existence leak).

#### FR-004 — Conversation lifecycle

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-004 |

**Description:**
The system shall track conversation status through `bot → escalated → human → closed`
(and `closed` from any state). Closed conversations reject new customer messages by starting
a fresh conversation instead.

**Acceptance Criteria:**
- Given a `closed` conversation, when the customer sends a new message from the widget, then a
  new conversation is created transparently (widget UX: history preserved per conversation).
- Status transitions are recorded with timestamps (`escalatedAt`, `closedAt`) for later metrics.

### 3.2 AI Engine

#### FR-005 — Grounded bilingual answers

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-005 |

**Description:**
The AI shall answer in the customer's language (TH/EN, auto-detected from the message) using
a system prompt grounded on the curated FactorySync knowledge file (services, health-check
quiz variants, how-to, contact details). It shall not invent pricing, commitments, or
capabilities absent from the knowledge file.

**Acceptance Criteria:**
- Given a Thai question about the factory health check, the reply is in Thai and consistent
  with the knowledge file.
- Given a question outside the knowledge scope, the bot says it doesn't know and offers
  escalation, rather than fabricating an answer.
- Given Vertex AI unconfigured (e.g. local dev without ADC), the bot replies with a bilingual
  canned message and auto-escalates; the API call still succeeds.

#### FR-006 — Escalation detection

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-006 |

**Description:**
The system shall escalate a conversation to the human team when (a) the customer explicitly
asks for a human, (b) the model signals it cannot help (via an `escalate_to_human` tool call),
or (c) the AI engine errors. Escalation sets `status: "escalated"` and triggers FR-010.

**Acceptance Criteria:**
- Given "ขอคุยกับคนได้ไหม" or "talk to a human", the conversation escalates and the customer
  receives a bilingual handoff message with expected response time.
- Given an already-escalated conversation, repeated triggers do not duplicate Slack alerts.

#### FR-007 — Bot pause on takeover

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Support team |
| **Test Case** | TC-007 |

**Description:**
The system shall stop generating AI replies once status leaves `bot` and resume only if an
agent explicitly returns the conversation to the bot.

### 3.3 LINE Official Account Channel

#### FR-008 — LINE webhook intake

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-008 |

**Description:**
The system shall expose a public LINE Messaging API webhook that verifies `X-Line-Signature`
(HMAC-SHA256 with the channel secret), maps the LINE `userId` to a conversation
(`channel: "line"`), stores inbound text messages, and processes them through the same
core pipeline (FR-002/005/006).

**Acceptance Criteria:**
- Given a request with an invalid signature, the endpoint responds 401 and processes nothing.
- Given a text message event from a new LINE user, a conversation is created keyed by
  `lineUserID`; subsequent messages append to the same open conversation.
- Non-text events (stickers, images) receive a bilingual "text only for now" reply.
- The webhook responds 200 within LINE's timeout regardless of downstream AI latency
  (reply generated asynchronously; delivered via Messaging API).

#### FR-009 — LINE reply delivery

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-009 |

**Description:**
The system shall deliver bot and agent replies to LINE users via the Messaging API — using
the reply token when within its validity window, otherwise push messages. Delivery failures
are logged and retried once; they never crash the pipeline.

### 3.4 Support Team — Slack

#### FR-010 — Escalation notification to Slack

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Support team |
| **Test Case** | TC-010 |

**Description:**
The system shall post an escalation card to the support Slack channel (customer name/channel,
last customer message, deep link to the backoffice transcript) when a conversation escalates.
Fire-and-forget per the existing notification-service convention.

#### FR-011 — Two-way Slack thread relay

| Field | Value |
|---|---|
| **Priority** | Should Have (Phase 5) |
| **Source** | Support team |
| **Test Case** | TC-011 |

**Description:**
The system shall create a Slack thread per escalated conversation (bot token,
`chat.postMessage`), relay subsequent customer messages into that thread, and relay agent
replies posted in the thread back to the customer's channel — verified via the Slack Events
API with signing-secret validation.

**Acceptance Criteria:**
- Given an agent reply in the conversation's Slack thread, the customer receives it on their
  original channel (web or LINE) attributed as an agent (`role: "agent"`).
- Given a Slack event with an invalid signature or stale timestamp (> 5 min), respond 401.
- Bot-authored Slack messages are ignored (no relay loops).

### 3.5 Backoffice — Conversations

#### FR-012 — Conversations list

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Support team |
| **Test Case** | TC-012 |

**Description:**
The backoffice shall list conversations filterable by status and channel, sorted by last
activity, showing customer identity (profile name for registered users, "Visitor"/LINE
display name otherwise), unread/escalated indicators, and message counts.

#### FR-013 — Transcript view, agent reply, close

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Support team |
| **Test Case** | TC-013 |

**Description:**
The backoffice shall show the full transcript of a conversation and let staff take over
(status → `human`), reply as an agent (delivered to the customer's channel), hand back to the
bot, and close the conversation.

**Acceptance Criteria:**
- Given a staff reply, it is stored with `role: "agent"` + the staff UID and delivered to the
  customer's channel within seconds.
- All list/detail/reply endpoints require `backofficeRole: staff|superadmin` (server-side).

### 3.6 Web Chat Widget

#### FR-014 — Chat bubble in web-app

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-014 |

**Description:**
A floating chat bubble shall appear on all authenticated web-app pages (mounted in the global
`Layout.tsx`), opening a chat panel with message history, typing state, and TH/EN text via
`useLocale()`. New messages are fetched by short-polling while the panel is open.

#### FR-015 — Chat bubble on web-official

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-015 |

**Description:**
The same widget (shared component from `@repo/shared`) shall load on web-official as a lazily
hydrated Astro React island, sign the visitor in with Firebase Anonymous Auth on first open,
and gate conversation creation with Turnstile.

**Acceptance Criteria:**
- The island hydrates lazily (`client:visible`/`client:idle`, **not** `client:load` — see the
  known hydration-deadlock constraint) and is smoke-tested against the **built** output.
- The widget adds no more than ~30 KB gz to initial page weight (loads on interaction).

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Non-AI API endpoints ≤ 500ms (p95); AI reply end-to-end ≤ 10s (p95), typing indicator shown meanwhile
- [ ] Widget polling interval ≥ 3s, only while the chat panel is open
- [ ] LINE webhook acknowledges within 2s (async reply generation)

### 4.2 Security
- [ ] Web endpoints require Firebase Auth (anonymous allowed only for chat routes); UID from `middleware.GetUID(r)` only
- [ ] LINE webhook verifies `X-Line-Signature`; Slack events verify signing secret + timestamp
- [ ] web-official conversation creation gated by Turnstile (`pkg/turnstile.go`)
- [ ] Backoffice chat endpoints behind `RequireBackofficeRole("superadmin", "staff")`
- [ ] Prompt-injection containment: system prompt instructs scope; bot has no tools that read other users' data; transcripts scoped by UID
- [ ] LLM auth via service-account ADC (no API key); remaining secrets via env vars (`LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_SUPPORT_CHANNEL_ID`)
- [ ] Per-conversation message rate limit (e.g. 10 msg/min) on top of global IP rate limiting

### 4.3 Usability
- [ ] Bilingual TH/EN — widget chrome via `useLocale()`, bot auto-detects message language
- [ ] Responsive from 320px; panel full-screen on mobile
- [ ] Accessible: keyboard operable, focus trap in panel, ARIA live region for new messages

### 4.4 Reliability
- [ ] AI/Slack/LINE delivery failures never fail the customer-facing request (fire-and-forget + logged, canned fallback per FR-005)
- [ ] LINE webhook idempotent: each `webhookEventId` is persisted and replayed events are ignored (dedupe TTL: 48h)
- [ ] Escalation Slack alert deduplicated per conversation

### 4.5 Maintainability
- [ ] Sentinel errors per service (`ErrConversationNotFound`, `ErrConversationClosed`, `ErrMessageTooLong`, …)
- [ ] All errors wrapped `fmt.Errorf("context: %w", err)`
- [ ] Channel adapters isolated behind an interface so new channels (e.g. Messenger) are additive
- [ ] Unit tests for service + handler; ≥ 80% coverage on `services/chat`

---

## 5. Interface Requirements

### 5.1 API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/chat/conversations` | Firebase Bearer token required (anonymous allowed for web-official) + Turnstile (web-official) | Start conversation with first message |
| GET | `/api/v1/chat/conversations/current` | Firebase Bearer token required | Caller's open conversation, if any |
| POST | `/api/v1/chat/conversations/{conversationID}/messages` | Firebase Bearer token required | Send message; returns AI reply when status=bot |
| GET | `/api/v1/chat/conversations/{conversationID}/messages` | Firebase Bearer token required | History + poll cursor |
| POST | `/api/v1/webhooks/line` | Public + `X-Line-Signature` | LINE Messaging API events |
| POST | `/api/v1/webhooks/slack` | Public + Slack signing secret | Slack Events API (Phase 5) |
| GET | `/api/v1/backoffice/chat/conversations` | backofficeRole | List/filter conversations |
| GET | `/api/v1/backoffice/chat/conversations/{conversationID}` | backofficeRole | Transcript |
| POST | `/api/v1/backoffice/chat/conversations/{conversationID}/messages` | backofficeRole | Agent reply |
| PATCH | `/api/v1/backoffice/chat/conversations/{conversationID}` | backofficeRole | Status change (takeover / hand-back / close) |

### 5.2 UI Screens / Routes

| Route | Guard | Description |
|---|---|---|
| (widget) web-app all pages | auth | Floating bubble in `Layout.tsx` |
| (widget) web-official all pages | none (anon auth on open) | Astro island in `Layout.astro` |
| `/conversations` (backoffice) | BackofficeGuard | Conversations list |
| `/conversations/:conversationID` (backoffice) | BackofficeGuard | Transcript + reply |

### 5.3 External Interfaces
- **Vertex AI — Gemini Flash** (`CHATBOT_MODEL`, `VERTEX_LOCATION`; ADC auth) — AI replies
- **LINE Messaging API** — webhook events in; reply/push messages out
- **Slack Web API + Events API** (bot token) — escalation cards, thread relay
- Existing: Turnstile siteverify (`pkg/turnstile.go`), Pub/Sub domain events (`pkg/events`)

---

## 6. Data Requirements

### 6.1 Firestore Collections

| Collection | Document ID | Key Fields | Notes |
|---|---|---|---|
| `conversations` | UUIDv4 | `channel: string`, `userID: string`, `lineUserID: string?`, `status: string`, `locale: string`, `lastMessageAt: Timestamp`, `lastMessagePreview: string`, `messageCount: number`, `slackThreadTS: string?`, `escalatedAt/closedAt: Timestamp?`, `agentUID: string?`, `createdAt` | One open conversation per (userID or lineUserID) |
| `conversations/{id}/messages` | UUIDv4 | `role: "customer"\|"bot"\|"agent"`, `text: string`, `senderID: string`, `channelMessageID: string?`, `createdAt: Timestamp` | Subcollection; chronological |
| `chat_webhook_events` | UUIDv4 | `platform: "line"`, `webhookEventID: string`, `eventFingerprint: string`, `payloadSHA256: string`, `conversationID: string`, `seenAt: Timestamp`, `expiresAt: Timestamp` | Dedupe cache for webhook retries |

**Indexes:** `conversations(status ASC, lastMessageAt DESC)` and `conversations(userID ASC, lastMessageAt DESC)`; `conversations(status ASC, channel ASC, lastMessageAt DESC)` for backoffice filtering; and single-field on `lineUserID`.
**Security rules:** backend-only (`allow read, write: if false`) — all access via the API.

### 6.2 Data Validation Rules
- `text`: required, 1–4,000 chars, trimmed
- `channel`: enum `web-app | web-official | line` (server-assigned, never client-supplied)
- `status`: enum `bot | escalated | human | closed`; transitions validated in the service layer
- Backoffice status PATCH: `status` required, must be a legal transition

---

## 7. Traceability Matrix

| Requirement | Design Reference | Test Case | Status |
|---|---|---|---|
| FR-001 | SDD §3.1, §5.1 | TC-001 | Not Started |
| FR-002 | SDD §3.1.2 | TC-002 | Not Started |
| FR-003 | SDD §3.1.1 | TC-003 | Not Started |
| FR-004 | SDD §3.1.2 | TC-004 | Not Started |
| FR-005 | SDD §3.3 | TC-005 | Not Started |
| FR-006 | SDD §3.3 | TC-006 | Not Started |
| FR-007 | SDD §3.1.2 | TC-007 | Not Started |
| FR-008 | SDD §3.4 | TC-008 | Not Started |
| FR-009 | SDD §3.4 | TC-009 | Not Started |
| FR-010 | SDD §3.5 | TC-010 | Not Started |
| FR-011 | SDD §3.5 | TC-011 | Not Started |
| FR-012 | SDD §3.2 (backoffice) | TC-012 | Not Started |
| FR-013 | SDD §3.2 (backoffice) | TC-013 | Not Started |
| FR-014 | SDD §3.2 (widget) | TC-014 | Not Started |
| FR-015 | SDD §3.2 (widget) | TC-015 | Not Started |

*Test cases to be detailed in `docs/product/ai-chatbot/test-plan.md` (SI.O4/O5) before implementation of each phase.*

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Initial draft (CR-004) |
| 0.2.0 | 2026-07-03 | Sathittham Sangthong | LLM switched to Vertex AI Gemini Flash (ADC); ADK/RAG explicitly deferred to roadmap CRs |
