# Status

> Tracks build progress for the **AI Customer Support Chatbot** against
> [`README.md`](./README.md). Design detail is in
> [`feature-spec.md`](./feature-spec.md) and
> [`ai-chatbot-design.md`](../../architecture/ai-chatbot-design.md), and test
> obligations are in [`test-plan.md`](./test-plan.md).

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Core service + AI engine + web-app bubble](#phase-1--core-service--ai-engine--web-app-bubble)
- [Phase 2 — Backoffice console](#phase-2--backoffice-console)
- [Phase 3 — Public-site widget](#phase-3--public-site-widget)
- [Phase 4 — LINE OA channel](#phase-4--line-oa-channel)
- [Phase 5 — Slack two-way relay](#phase-5--slack-two-way-relay)
- [Provisioning Prerequisites](#provisioning-prerequisites)
- [Related Documents](#related-documents)

## Current State

Phase 1 is **implemented on `feature/chatbot-core`** (commit `456d179`) with backend and
widget tests in place, but not yet merged to `develop` or verified on staging — the
Vertex/IAM/env prerequisites below are still unprovisioned. Phases 2–5 are not started.

## Phase 1 — Core service + AI engine + web-app bubble

Branch: `feature/chatbot-core` · FR-001–007, FR-010, FR-014

- [x] `services/chat/` — models, repository, service, status machine, handlers.
- [x] `engine.go` — Vertex Gemini Flash behind a `modelClient` interface, `escalate_to_human`
  tool call, keyword escalation, canned bilingual fallback (nil-engine + model-error paths).
- [x] `config/chatbot-knowledge.md` — curated TH/EN knowledge file.
- [x] One-way Slack escalation card (`slack.go`), deduplicated per conversation.
- [x] `ChatWidget` in `packages/shared/ui/chat-widget/` mounted in web-app `Layout.tsx`
  (history, polling, typing state, focus trap, TH/EN i18n).
- [x] Firestore rules (backend-only) + composite indexes.
- [ ] Merge to `develop` and deploy to staging.
- [ ] Phase 1 exit criteria: e2e chat + escalation verified on staging web-app; Slack alert received.

### Phase 1 Tests

- [x] `service_test.go` + `service_errors_test.go` — UT-001 … UT-011 (domain, ownership, limits).
- [x] `engine_test.go` — UT-020 … UT-026 (stubbed model: replies, tool call, fallbacks, windowing).
- [x] `handler_test.go` + `handler_errors_test.go` — IT-001 … IT-008 contracts.
- [x] `ChatWidget.test.tsx` + `useChatSession.test.tsx` — UT-F01 … UT-F08.
- [ ] Playwright E2E-001/E2E-002 — deferred until the widget is on staging.

Coverage recorded:

- [ ] `services/chat` coverage ≥ 80% verified and logged in the test-plan results table.

## Phase 2 — Backoffice console

Branch: `feature/chatbot-backoffice` · FR-012, FR-013

- [ ] Conversations list + transcript pages, takeover / agent reply / hand-back / close.
- [ ] `/api/v1/backoffice/chat/*` endpoints behind `RequireBackofficeRole`.
- [ ] Wire the existing `UpdateStatus` service method to a handler route (deferred from Phase 1).
- [ ] Publish `chat.conversation.escalated` domain events via `pkg/events` (deferred from Phase 1).
- [ ] Test-plan section + tests before implementation (TDD via `@qa-dev`).

## Phase 3 — Public-site widget

Branch: `feature/chatbot-official` · FR-015

- [ ] Astro island in `Layout.astro` — `client:visible` (not `client:load`; hydration-deadlock constraint).
- [ ] Firebase Anonymous Auth sign-in on first open; Turnstile-gated conversation creation.
- [ ] Per-conversation rate limit verified against abuse; smoke test the **built** output.
- [ ] Test-plan section + tests before implementation.

## Phase 4 — LINE OA channel

Branch: `feature/chatbot-line` · FR-008, FR-009

- [ ] `/webhooks/line` — `X-Line-Signature` verify, `webhookEventId` idempotency, async ACK ≤ 2s.
- [ ] Reply-token / push delivery with one retry; LINE-user → conversation mapping.
- [ ] Test-plan section + tests before implementation; redelivery idempotency verified on staging.

## Phase 5 — Slack two-way relay

Branch: `feature/chatbot-slack-relay` · FR-011

- [ ] `/webhooks/slack` — Events API with signing-secret + timestamp validation, `url_verification`.
- [ ] Thread bridge per escalated conversation; agent replies relayed to web and LINE.
- [ ] Bot-message loop prevention verified.
- [ ] Test-plan section + tests before implementation.

## Provisioning Prerequisites

| # | Prerequisite | Blocks | Status |
|---|--------------|--------|--------|
| 1 | Vertex/platform API enabled + `roles/aiplatform.user` on Cloud Run SA + GCP budget alert | Phase 1 exit | **Open** |
| 2 | Env vars: `CHATBOT_MODEL`, `VERTEX_LOCATION`, `SLACK_WEBHOOK_SUPPORT` | Phase 1 exit | **Open** |
| 3 | Firebase Anonymous Auth provider enabled + web-official Turnstile site key | Phase 3 | **Open** |
| 4 | LINE OA + Messaging API channel secret/token; webhook URL registered | Phase 4 | **Open** |
| 5 | Slack app installed (bot token `chat:write`, `channels:history`; signing secret) | Phase 5 | **Open** |

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [ai-chatbot-design.md](../../architecture/ai-chatbot-design.md) · CR-004 in [change-request-log.md](../../iso29110/change-request-log.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

*Version: 0.1.0*
*Last updated: 3 July 2026*
