# Status

> Tracks build progress for the **FactorySync MCP Server** against
> [`README.md`](./README.md). Design detail is in
> [`feature-spec.md`](./feature-spec.md) and
> [`mcp-server-design.md`](../../architecture/mcp-server-design.md), and test
> obligations are in [`test-plan.md`](./test-plan.md).

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — MVP (read-only, API keys)](#phase-1--mvp-read-only-api-keys)
- [Later Phases](#later-phases)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

## Current State

No implementation has been started. The feature is at the design and
test-planning stage — CR-005 is pending approval and the placement decision is
fixed to **Option A** (dedicated `apps/mcp-server` Cloudflare Worker).

## Phase 1 — MVP (read-only, API keys)

- [ ] Add `services/apikey` models + service (generate/hash/verify/revoke, scope derivation, max-5 limit, sentinel errors).
- [ ] Add `POST/GET/DELETE /api/v1/apikeys*` handlers + routes with swagger annotations.
- [ ] Scaffold `apps/mcp-server` Worker: Streamable HTTP transport, handshake, tool registry.
- [ ] Implement the six Phase-1 tools with auth gating, error mapping, rate limiting, and audit calls.
- [ ] Add *Settings → API Keys* UI in web-app and web-backoffice with TH/EN i18n.
- [ ] Add deploy workflow for `mcp(-staging).factorysyncsolutions.com`.

### Phase 1 Tests

- [ ] `apps/backend/services/apikey/service_test.go` — key lifecycle, scope
  derivation, limits, sentinel errors (UT-001 … UT-011).
- [ ] `apps/backend/services/apikey/handler_test.go` — auth/validation contracts
  and plaintext-once behavior (IT-001 … IT-007).
- [ ] `apps/mcp-server` Vitest — handshake, schemas, auth gating, error mapping
  (UT-M01 … UT-M09) + protocol cases (IT-M01 … IT-M09).
- [ ] Frontend key-management component tests (UT-F01 … UT-F05).
- [ ] Playwright — key lifecycle, staff scope, unauthenticated redirect,
  connected-client smoke (E2E-001 … E2E-004).

Coverage recorded:

- [ ] `services/apikey/service.go` coverage ≥ 80%.
- [ ] `services/apikey/handler.go` coverage ≥ 60%.
- [ ] `apps/mcp-server` coverage ≥ 70%.

## Later Phases

- [ ] Phase 2 — OAuth 2.1 + dynamic client registration (replaces manual key copy-paste).
- [ ] Follow-up CR — backoffice-scoped tools (cross-user analytics, transcripts).
- [ ] Follow-up CR — write tools (submit answers, edit profile) after read-only v1 proves out.

## Open Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Rate-limit thresholds per key / per IP | **Open**: 60 calls/min per key; stricter per-IP for anonymous traffic |
| 2 | Knowledge search backend (D1 direct vs backend proxy) | **Open**: direct D1 read from the Worker (same Cloudflare account) |

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [mcp-server-design.md](../../architecture/mcp-server-design.md) · CR-005 in [change-request-log.md](../../iso29110/change-request-log.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

*Version: 0.1.0*
*Last updated: 3 July 2026*
