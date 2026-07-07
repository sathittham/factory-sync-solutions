---
isoOutput: SI.O1
version: 0.2.1
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Draft
---

# Software Requirements Specification — FactorySync MCP Server

*ISO 29110 Basic Profile · SI.O1*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | MCP Server (`mcp-server`) |
| **Version** | 0.2.1 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-03 |
| **Approved By** | Pending (CR-005) |
| **Approval Date** | — |

---

## 1. Introduction

### 1.1 Purpose

Expose FactorySync Solutions data and capabilities to **external AI agents** — Claude Code,
Claude Desktop / claude.ai connectors, OpenAI Codex CLI, Cursor, and any other
[Model Context Protocol](https://modelcontextprotocol.io) client — through a **remote MCP
server**. A factory operator (or a consultant working on their behalf) can connect their AI
assistant to FactorySync and ask it to read their factory health-check results, compare
dimension scores across assessments, browse the quiz catalog, and search the Knowledge Hub —
without screen-scraping or bespoke API integration per agent.

MCP is the interoperability layer: one server implementation serves every MCP-capable agent.

### 1.2 Scope

**In scope (Phase 1 — read-only):**
- A remote MCP server speaking **Streamable HTTP** transport at a public endpoint
  (`https://mcp.factorysyncsolutions.com/mcp`; staging: `mcp-staging.…`)
- **API-key authentication** mapped to a Firebase user — all data tools are scoped to the
  key owner's UID
- Read-only **tools**: quiz catalog, own assessment results (list + full 8-dimension detail),
  own profile, Knowledge Hub search
- **API key management** (create / revoke) in both `web-app` (end users) and
  `web-backoffice` (staff) — key scope derived server-side from the creator's role
- Rate limiting and audit logging of tool invocations
- Client onboarding documentation (Claude Code, Codex CLI, Claude Desktop / claude.ai)

**Out of scope (this SRS — follow-up CRs):**
- Write tools (submitting quiz answers, editing profile) — read-only first, by design
- OAuth 2.1 / dynamic client registration (Phase 2; API keys are the MVP auth)
- Backoffice/admin **tools** (cross-user analytics, conversation transcripts) — staff can
  already *create* keys in Phase 1 (FR-007), but backoffice-scoped tools ship in a follow-up
  CR; the `scope` field on keys future-proofs this
- MCP resources/prompts beyond tools, sampling, elicitation
- stdio-only local server distribution (remote-first; stdio clients bridge via `mcp-remote`)

### 1.3 Definitions & Abbreviations

| Term | Definition |
|---|---|
| MCP | Model Context Protocol — open standard connecting AI agents to tools/data |
| MCP client | The AI agent side (Claude Code, Codex CLI, Claude Desktop, Cursor, …) |
| Streamable HTTP | MCP remote transport: JSON-RPC over HTTP POST + optional SSE stream |
| Tool | A callable capability the server advertises via `tools/list` |
| API key | Long-lived bearer secret (`fsk_…`) bound to one Firebase UID |
| `mcp-remote` | npm bridge that lets stdio-only clients talk to remote MCP servers |

### 1.4 References

| Document | Link |
|---|---|
| Architecture Overview | [docs/architecture/overview.md](../../architecture/overview.md) |
| SDD — MCP Server | [docs/architecture/mcp-server-design.md](../../architecture/mcp-server-design.md) |
| Change Request | CR-005 in [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) |
| Client quickstart | [README.md](README.md) |
| MCP specification | https://modelcontextprotocol.io/specification |
| Result service (data source) | [docs/product/result/feature-spec.md](../result/feature-spec.md) |
| Quiz service (data source) | [docs/product/quiz/feature-spec.md](../quiz/feature-spec.md) |

---

## 2. Overall Description

### 2.1 Product Context

The MCP server is a **thin protocol adapter in front of the Go backend API** — it owns no business
data. For Phase 1, CR-005 adds API-key management in `apps/backend/services/apikey` while
reusing existing result/quiz/profile read services. The design is fixed to **Option A** in the SDD:

- **Option A (selected):** new `apps/mcp-server` — a Cloudflare Worker (Agents SDK /
  `McpAgent`) that translates MCP tool calls into authenticated calls to the Go backend REST
  API. Fits the existing Cloudflare deploy pipeline (`cms.…`, Pages apps) and gives SSE/
  Streamable HTTP for free.
- **Option B (deferred):** native `/mcp` endpoint inside `apps/backend` (e.g. `mark3labs/mcp-go`),
  reusing services in-process. Fewer moving parts but couples protocol churn to the core API.

Touched components (Option A): `apps/mcp-server` (new), `apps/backend/services/apikey`
(new — key issuance/verification), `apps/web-app` Settings page + `apps/web-backoffice`
Settings page (key management UI in both), GitHub Actions deploy workflow.

### 2.2 User Classes & Characteristics

| User Class | Description | Access Level |
|---|---|---|
| End User (via AI agent) | Registered factory operator whose MCP client holds their API key | Authenticated (API key, `scope: user`) |
| Backoffice Staff (via AI agent) | Internal staff whose MCP client holds a staff-created key | Authenticated (API key, `scope: backoffice`) |
| Anonymous agent | MCP client with no/invalid key | Catalog + knowledge tools only |

*Staff can create/manage keys in Phase 1; backoffice-scoped **tools** arrive in a follow-up CR
(until then a `backoffice` key can use the same public + own-data tools as a user key).*

### 2.3 Assumptions & Dependencies

- The existing Go backend REST API already exposes the needed reads (results, quiz configs,
  profile); the MCP server adds **no new business logic**, only protocol translation.
- Knowledge Hub search reuses the CMS (D1) content already consumed by `web-official`.
- A Cloudflare zone `factorysyncsolutions.com` exists with room for the `mcp(-staging)`
  subdomains (same pattern as `cms(-staging)`).
- Target clients: Claude Code and claude.ai connectors speak Streamable HTTP natively;
  Codex CLI and other stdio-first clients connect through `mcp-remote`.
- Depends on: Firebase Auth (UID identity), backend rate-limit middleware patterns,
  audit service for logging.

### 2.4 Constraints

- All backend code follows project conventions: `pkg.RespondJSON`/`RespondError`, sentinel
  errors, `fmt.Errorf("context: %w", err)` wrapping, UID from verified auth context only.
- The MCP server must never accept a caller-supplied user ID — the acting UID always derives
  from the verified API key.
- API keys are secrets: stored hashed (SHA-256) server-side, shown in full exactly once at
  creation, never logged. `.env*` / credential hygiene per repo rules.
- Tool descriptions and results are English-first (MCP clients are English-centric), but
  quiz/knowledge content returns both TH and EN fields where the source data is bilingual.
- Web UI for key management uses shadcn/ui + `useLocale()` + `formatDateTime()` as usual.

---

## 3. Functional Requirements

### 3.1 Protocol & Transport

#### FR-001 — MCP endpoint and handshake

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner (CR-005) |
| **Test Case** | TC-001 |

**Description:**
The system shall expose a Streamable HTTP MCP endpoint at `/mcp` that completes the MCP
lifecycle (`initialize` → capability advertisement → `tools/list` → `tools/call`) per the
current MCP specification, interoperable with Claude Code, claude.ai connectors, and
`mcp-remote`-bridged clients.

**Acceptance Criteria:**
- Given `claude mcp add --transport http factorysync <url>`, when Claude Code connects, then
  `initialize` succeeds and `tools/list` returns the Phase 1 tool set with JSON schemas.
- Given a `tools/call` for an unknown tool, then the server returns a JSON-RPC method-level
  error (not a transport 500).
- Given a malformed JSON-RPC body, then the server responds with a JSON-RPC parse error.

#### FR-002 — API-key authentication and UID scoping

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-002 |

**Description:**
The system shall authenticate MCP requests via `Authorization: Bearer fsk_<key>`, resolve the
key to its owning Firebase UID, and scope every data tool to that UID. Requests without a
valid key may only use public catalog/knowledge tools; calls to user-data tools return an
`UNAUTHENTICATED` JSON-RPC error and a human-readable hint to create/configure a key. The
MCP session itself remains usable for public tools.

**Acceptance Criteria:**
- Given a valid key, when `list_results` is called, then only results belonging to the key
  owner's UID are returned.
- Given a revoked or unknown key, when any user-data tool is called, then the tool returns an
  `UNAUTHENTICATED` error content block and the MCP session remains usable for public tools.
- The plaintext key never appears in logs or audit records (key ID / prefix only).

### 3.2 Tools — Quiz Catalog & Knowledge (public)

#### FR-003 — `list_quizzes` / `get_quiz`

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-003 |

**Description:**
The system shall provide `list_quizzes` (all active quiz variants with id, bilingual title,
description, dimension summary, question count) and `get_quiz(quizID)` (the 8 dimensions and
question structure for one variant — **without** scoring weights/rubric internals).

**Acceptance Criteria:**
- Given `get_quiz("iso29110")`, then the response includes its dimensions and question texts
  (TH + EN) and excludes rubric scoring internals.
- Given an unknown `quizID`, then the tool returns a not-found error mirroring
  `ErrQuizNotFound` semantics.

#### FR-004 — `search_knowledge`

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | Product owner |
| **Test Case** | TC-004 |

**Description:**
The system shall provide `search_knowledge(query, locale?)` returning published Knowledge Hub
articles (title, summary, canonical URL on `web-official`) so agents can cite FactorySync
content instead of hallucinating it.

### 3.3 Tools — User Data (authenticated)

#### FR-005 — `list_results` / `get_result`

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-005 |

**Description:**
The system shall provide `list_results` (the caller's assessments: quiz variant, completion
date, overall score, result ID) and `get_result(resultID)` (full detail: per-dimension scores,
rubric level, strengths/weaknesses, recommendations) — restricted to results owned by the
caller's UID.

**Acceptance Criteria:**
- Given a `resultID` owned by another user, then the tool returns not-found (no existence
  leak), mirroring `ErrResultNotFound`.
- Given a user with no assessments, then `list_results` returns an empty list with a hint
  pointing to the web-app quiz.

#### FR-006 — `get_profile`

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | Product owner |
| **Test Case** | TC-006 |

**Description:**
The system shall provide `get_profile` returning the caller's own factory profile (company
name, industry, size band, province) so agents can contextualize recommendations. Sensitive
identifiers (citizen ID, DBD registration payloads) are excluded.

### 3.4 API Key Management

#### FR-007 — Create / list / revoke API keys (web-app and web-backoffice)

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-007 |

**Description:**
The system shall let an authenticated user create (with a label), list (label, prefix, scope,
created/last-used dates), and revoke their own API keys from a Settings section in **both
`web-app` (end users) and `web-backoffice` (staff)**. The key's `scope` is assigned
server-side from the creator's verified role at creation time — `backoffice` when the caller
holds a `backofficeRole` custom claim, otherwise `user` — never supplied by the client. The
full key is displayed exactly once at creation. A user may hold at most 5 active keys.

**Acceptance Criteria:**
- Given key creation, then the response contains the plaintext key once; the stored record
  holds only the hash + prefix + server-derived scope.
- Given a web-backoffice staff member creating a key, then the key is stored with
  `scope: "backoffice"`; a web-app end user's key gets `scope: "user"`, even if the request
  body claims otherwise.
- Given a staff member whose `backofficeRole` claim is later removed, then their
  `backoffice`-scoped keys are treated as revoked by the MCP server (role re-verified on use).
- Given a revoked key, then MCP requests using it fail within ≤ 60s (cache TTL).
- Given 5 active keys, then creation returns a limit error.
- Each app lists and revokes only the caller's own keys (no cross-user key visibility).

### 3.5 Operations

#### FR-008 — Rate limiting and audit logging

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Product owner |
| **Test Case** | TC-008 |

**Description:**
The system shall rate-limit MCP tool calls per API key (e.g. 60 calls/min) and per IP for
unauthenticated traffic, and shall record each tool invocation (key ID, tool name, outcome,
latency — never full payloads or plaintext keys) via the existing audit service.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Tool-call round trip ≤ 1.5s (p95) for catalog/profile tools; ≤ 3s (p95) for result detail
- [ ] Handshake (`initialize` + `tools/list`) ≤ 800ms (p95)

### 4.2 Security
- [ ] API keys stored hashed; plaintext shown once; prefix-only in logs and UI
- [ ] Acting UID derived only from the verified key — no caller-supplied user IDs
- [ ] Key `scope` server-derived from verified claims; `backoffice` scope re-verified against the live `backofficeRole` claim on use (revoked role ⇒ key unusable)
- [ ] User-data tools return not-found (not forbidden) for other users' resources — no existence leak
- [ ] Tool inputs validated against JSON schema before reaching the backend
- [ ] TLS-only endpoint; CORS not required (server-to-server), no cookies/sessions
- [ ] Prompt-injection posture documented: tool results are data, tool descriptions contain no instructions to the model beyond usage

### 4.3 Usability
- [ ] Tool names/descriptions written for agent consumption (clear, schema'd, self-explanatory errors)
- [ ] Key-management UI bilingual TH/EN via `useLocale()`; dates via `formatDateTime()`
- [ ] Client setup documented for Claude Code, Codex CLI, and Claude Desktop / claude.ai (README)

### 4.4 Reliability
- [ ] Backend API failure surfaces as a structured tool error (agent-readable), never a hung stream
- [ ] Key revocation takes effect within 60s despite caching

### 4.5 Maintainability
- [ ] Tool registry is declarative — adding a tool touches one module + docs
- [ ] Sentinel errors in `services/apikey` (`ErrKeyNotFound`, `ErrKeyRevoked`, `ErrKeyLimitReached`)
- [ ] Unit tests: key service ≥ 80% coverage; MCP handler covered by handshake + per-tool tests

---

## 5. Interface Requirements

### 5.1 API Endpoints

MCP transport (new host):

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `https://mcp.factorysyncsolutions.com/mcp` | Bearer `fsk_…` (optional for public tools) | Streamable HTTP JSON-RPC (initialize, tools/list, tools/call) |
| GET | `https://mcp.factorysyncsolutions.com/mcp` | same | SSE stream for server → client messages (per spec) |

Key management (backend API endpoints introduced by this CR):

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/apikeys` | Firebase Bearer | Create key (returns plaintext once; scope derived from caller's claims) |
| GET | `/api/v1/apikeys` | Firebase Bearer | List own keys (prefix, label, scope, lastUsedAt) |
| DELETE | `/api/v1/apikeys/{keyID}` | Firebase Bearer | Revoke own key |

*The same endpoints serve both apps — a key is always personal to the authenticated caller;
`scope` comes from the verified `backofficeRole` custom claim, never the request body.*

### 5.2 UI Screens / Routes

| Route | Guard | Description |
|---|---|---|
| `/settings/api-keys` (web-app) | auth | Create / list / revoke own API keys, MCP quickstart snippet |
| `/settings/api-keys` (web-backoffice) | BackofficeGuard | Same key management for staff (`scope: backoffice`) |

### 5.3 External Interfaces
- **MCP clients** — Claude Code, claude.ai/Claude Desktop connectors, Codex CLI (via
  `mcp-remote`), Cursor, Windsurf; connection recipes in [README.md](README.md)
- **Go backend REST API** — upstream for all tool data (Option A)
- **CMS (Cloudflare D1)** — Knowledge Hub content for `search_knowledge`

### 5.4 MCP Tool Surface (Phase 1)

| Tool | Auth | Input | Returns |
|---|---|---|---|
| `list_quizzes` | public | — | Active quiz variants (id, bilingual title, dimensions, counts) |
| `get_quiz` | public | `quizID` | Dimensions + questions of one variant (no rubric internals) |
| `search_knowledge` | public | `query`, `locale?` | Matching Knowledge Hub articles + canonical URLs |
| `list_results` | API key | — | Caller's assessments (variant, date, overall score, id) |
| `get_result` | API key | `resultID` | Full 8-dimension scores, levels, recommendations |
| `get_profile` | API key | — | Caller's factory profile (non-sensitive fields) |

---

## 6. Data Requirements

### 6.1 Firestore Collections

| Collection | Document ID | Key Fields | Notes |
|---|---|---|---|
| `apiKeys` | UUIDv4 | `userID: string`, `keyHash: string`, `keyPrefix: string`, `label: string`, `scope: string`, `isActive: bool`, `lastUsedAt: Timestamp?`, `createdAt`, `revokedAt: Timestamp?` | Hash = SHA-256 of full key; prefix = first 8 chars for display; scope server-derived at creation |

**Indexes:** `apiKeys(userID ASC, isActive DESC, createdAt DESC)` to list active keys by recency;
single-field on `keyHash`.
**Security rules:** backend-only (`allow read, write: if false`).

### 6.2 Data Validation Rules
- `label`: required, 1–50 chars, trimmed
- `scope`: enum `user | backoffice` — server-assigned from verified claims, never client-supplied
- Key format: `fsk_` + 43 random URL-safe chars (minimum 256-bit entropy)
- Max 5 active keys per UID (service-layer enforced)
- Tool inputs: `quizID`/`resultID` validated as known-format IDs before backend lookup

---

## 7. Traceability Matrix

| Requirement | Design Reference | Test Case | Status |
|---|---|---|---|
| FR-001 | docs/architecture/mcp-server-design.md | TC-001 | Not Started |
| FR-002 | docs/architecture/mcp-server-design.md | TC-002 | Not Started |
| FR-003 | docs/architecture/mcp-server-design.md | TC-003 | Not Started |
| FR-004 | docs/architecture/mcp-server-design.md | TC-004 | Not Started |
| FR-005 | docs/architecture/mcp-server-design.md | TC-005 | Not Started |
| FR-006 | docs/architecture/mcp-server-design.md | TC-006 | Not Started |
| FR-007 | docs/architecture/mcp-server-design.md | TC-007 | Not Started |
| FR-008 | docs/architecture/mcp-server-design.md | TC-008 | Not Started |

*Test cases in `docs/product/mcp-server/test-plan.md` (SI.O4/O5).*

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-07-03 | Sathittham Sangthong | Initial draft (CR-005) |
| 0.2.0 | 2026-07-03 | Sathittham Sangthong | Key creation extended to web-backoffice; `scope` field (user/backoffice) added to keys |
| 0.2.1 | 2026-07-03 | Sathittham Sangthong | Aligned phase-1 design, resolved auth/index/entropy wording, added traceability and test plan |

*Version: 0.2.1*
*Last updated: 3 July 2026*
