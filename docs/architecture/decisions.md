---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Architecture Decision Records

## ADR-001: Vite over Next.js

**Decision**: Use Vite as the build tool instead of Next.js.

**Rationale**:
- Simpler SPA requirements (no SSR needed)
- Faster build times
- Easier deployment to Cloudflare Pages

## ADR-002: Firestore over PostgreSQL

**Decision**: Use Firestore as the primary data store.

**Rationale**:
- Generous free tier limits
- Built-in real-time capabilities
- Scalable without infrastructure management
- Better suited for document-based assessment data

## ADR-003: Cloudflare Pages over Vercel

**Decision**: Host frontend on Cloudflare Pages.

**Rationale**:
- Global CDN included
- Better free tier limits
- Integrated with Cloudflare DNS/WAF

## ADR-004: shadcn/ui over Material-UI

**Decision**: Use shadcn/ui for the component library.

**Rationale**:
- More flexible and customizable
- Better performance (smaller bundle)
- Modern design system
- Copy-paste components (no runtime dependency)

## ADR-005: Redux Toolkit for State Management

**Decision**: Use Redux Toolkit for global state management.

**Rationale**:
- Predictable state updates with immutable patterns (via Immer)
- Excellent DevTools for debugging state changes
- Built-in RTK Query for API data fetching and caching
- Widely adopted with strong ecosystem and community support
- TypeScript-first with good type inference

## ADR-006: Makefile for Monorepo

**Decision**: Use a Makefile to manage the monorepo containing frontend (React) and backend (Go) apps. Previously used Turborepo but migrated to Makefile for simplicity.

**Rationale**:
- Unified `build`, `lint`, `test` commands across apps
- No Node.js dependency for running Go tasks
- Simple, explicit task definitions
- Works natively on all Unix systems
- Single entry point for all development workflows

## ADR-007: Biome over ESLint + Prettier

**Decision**: Use Biome as the single tool for linting and formatting.

**Rationale**:
- Single tool replaces both ESLint and Prettier
- Extremely fast (written in Rust)
- Zero-config sensible defaults
- Consistent formatting without config drift between lint and format rules

## ADR-008: Resend for Transactional Email

**Decision**: Use Resend as the email delivery service.

**Rationale**:
- 3,000 emails/month free tier (sufficient for MVP)
- Simple REST API with modern developer experience
- React Email integration for template authoring (optional)
- Google and Cloudflare do not offer free transactional email services

## ADR-009: React Router v7

**Decision**: Use React Router v7 for client-side routing.

**Rationale**:
- Most widely adopted React routing library
- Supports lazy-loaded routes for code splitting
- Built-in loader/action patterns for data fetching
- Mature ecosystem with extensive documentation

## ADR-010: Chi for Go HTTP Router

**Decision**: Use Chi (`github.com/go-chi/chi/v5`) as the Go backend HTTP router.

**Rationale**:
- Lightweight, idiomatic Go
- 100% compatible with `net/http` standard library
- Built-in middleware support (CORS, logging, auth, rate limiting)
- Route grouping for API versioning (`/api/v1/`)

## ADR-011: Swagger/OpenAPI via swaggo (Planned)

**Decision**: Auto-generate API documentation from Go source code using `swaggo/swag`.

**Status**: Not yet implemented. Swagger annotations exist in handler code as comments, but swaggo is not installed (not in go.mod) and the Swagger UI route is commented out in `main.go`. See [swagger-openapi.md](swagger-openapi.md) for the planned setup.

**Rationale**:
- Docs stay in sync with code via source annotations
- Generates OpenAPI 2.0 spec (Swagger JSON/YAML)
- Serves interactive Swagger UI for API exploration
- Zero manual spec maintenance

## ADR-012: camelCase Naming Convention

**Decision**: Use camelCase for all identifiers across the entire stack (JSON fields, Firestore fields, query params, struct tags).

**Rationale**:
- Consistency across frontend (JavaScript/TypeScript) and backend (Go JSON tags)
- No field name translation needed between API responses and Firestore storage
- Matches JavaScript/TypeScript ecosystem conventions
- Reduces mapping bugs between layers

## ADR-013: UUIDv4 for Resource IDs

**Decision**: Use UUIDv4 (`github.com/google/uuid`) for all resource IDs except Firebase Auth UIDs.

**Rationale**:
- Globally unique without coordination (no auto-increment or sequence)
- Safe for distributed systems (multiple Cloud Run instances)
- No information leakage (unlike sequential IDs)
- Standard format recognized across all languages and tools

## ADR-014: Slack Incoming Webhooks for Notifications

**Decision**: Use Slack Incoming Webhooks for real-time notifications (registrations, quiz results, CI/CD status, server health).

**Rationale**:
- Free with any Slack workspace (no paid plan required)
- Simple HTTP POST — no SDK or bot token management needed
- Separate webhook per channel for fine-grained routing
- CI/CD integration via official `slackapi/slack-github-action`
- Team already uses Slack for communication

## ADR-015: Multi-Language Support (Thai/English)

**Decision**: Implement bilingual support (Thai and English) with a language switcher in the header.

**Rationale**:
- Primary users are Thai factory operators who may prefer Thai UI
- International stakeholders need English option
- `useLocale()` hook manages locale state
- Quiz questions stored with `textTh`/`textEn` fields in static JSON config
- Dimension names stored with `nameTh`/`nameEn` fields
- No external i18n library needed for current scope

## ADR-016: DBD DataWarehouse Integration

**Decision**: Add a `dbd-service` to look up Thai company information from the Department of Business Development (DBD) DataWarehouse by registration ID.

**Rationale**:
- Auto-prefills company registration form with official data
- Reduces user input errors
- Uses publicly available DBD DataWarehouse API
- Improves UX by requiring only the 13-digit registration ID

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated ADR-006 (Turborepo → Makefile), ADR-011 (Swagger status), ADR-013 (Cloud Run), added ADR-015 (i18n) and ADR-016 (DBD) |
