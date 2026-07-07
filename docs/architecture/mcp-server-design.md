# MCP Server Architecture (Draft)

## Decision

Adopt **Option A** from `docs/product/mcp-server/feature-spec.md`: a dedicated MCP adapter hosted as
`apps/mcp-server` (Cloudflare Worker / Agents SDK) that translates MCP tool calls to existing backend API calls.

## Architecture Summary

- MCP transport runs as Streamable HTTP endpoint at:
  - Production: `https://mcp.factorysyncsolutions.com/mcp`
  - Staging: `https://mcp-staging.factorysyncsolutions.com/mcp`
- Public tools are unauthenticated:
  - `list_quizzes`
  - `get_quiz`
  - `search_knowledge`
- Protected tools require API-key auth and are user-scoped:
  - `list_results`, `get_result`, `get_profile`

## Core Components

- `apps/mcp-server`
  - MCP entrypoint (`/mcp`)
  - Tool registry
  - Request validation and JSON-RPC error mapping
  - API-key verification service client
  - Backend API client for pass-through data reads
- `apps/backend/services/apikey`
  - API-key create/list/revoke endpoints
  - Key hashing/prefixing and scope assignment
- `apps/backend` existing services
  - `result`, `quiz`, `profile`, and `audit` services are reused as data sources

## Data and Security Flow

1. MCP request arrives at `/mcp`.
2. Transport parses JSON-RPC method (`initialize`, `tools/list`, `tools/call`).
3. For protected tool calls, key is resolved to UID.
4. UID-scoped backend API requests are executed.
5. Results are returned via structured MCP tool responses.
6. All invocations are logged to audit with key ID/tool/outcome/latency metadata.

## Open Decisions

- Whether to add optional server-side caching for catalog/profile read paths in phase 1.
- Whether `search_knowledge` uses CMS search API directly or cached index.

## Traceability

- See `docs/product/mcp-server/feature-spec.md` requirements FR-001 through FR-008.
