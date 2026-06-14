---
version: 1.2.0
lastUpdated: 2026-06-10
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

## ADR-011: Swagger/OpenAPI via swaggo

**Decision**: Auto-generate API documentation from Go source code using `swaggo/swag`.

**Status**: Implemented. Swagger annotations are generated with `swaggo/swag`; non-production backend environments serve Swagger UI at `/api/v1/swagger/index.html`, and deploy workflows publish generated artifacts to R2.

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

## ADR-017: `companyRegId` as Project ID

**Decision**: Use the company's 13-digit Thai registration ID (`companyRegId`) as the
Firestore document ID for the `projects` collection instead of a generated UUID.

**Rationale**:
- Already unique per legal entity — no separate uniqueness enforcement needed.
- Enables a direct key lookup (`doc("projects/" + regId)`) without a secondary index.
- The existing `GET /profile/check/{regId}` endpoint maps cleanly to a project existence check.
- Eliminates a join between users and projects for most common reads.

**Trade-off**: Exposes the registration ID in document paths. Acceptable — the ID is
a public government identifier, not a secret.

---

## ADR-018: Denormalize `projectRoles` Map on the User Document

**Decision**: Store a `projectRoles` map (`{ projectID: role }`) on `users/{uid}`
instead of reading `projects/{id}/members/{uid}` per request. A separate `activeProjectID`
field records the currently selected project context.

**Rationale**:
- Every authenticated request already triggers a profile read (to extract `uid`,
  `role`, etc.). Storing the full roles map there avoids one subcollection read
  per project-scoped call — critical at scale.
- A map supports multi-project membership cleanly: each key is a `projectID`,
  each value is the role string.
- The `members` subcollection remains the authoritative source of record; the
  map is always written in the same Firestore transaction as the subdoc, so
  consistency is guaranteed at the write path.
- `activeProjectID` lets the middleware resolve the current project without
  requiring a request header, while still allowing `X-Project-ID` override.

**Trade-off**: Two documents must be kept in sync. Mitigated by the transaction
requirement — any code path that changes a role or membership must update both
in a single atomic batch.

---

## ADR-019: Project RBAC Is Separate from System Admin

**Decision**: Keep the system-level `role` field (`"user"` / `"admin"`) on `users/{uid}`
independent of the new project-level `projectRole` field. They do not inherit from each other.

**Rationale**:
- System admin (Firebase custom claim + `role == "admin"`) is an operations role:
  it grants access to the cross-company admin dashboard and raw data export.
  It is set out-of-band and is unrelated to company structure.
- Project RBAC (Owner / System Admin / Manager / General User) governs what a user
  can do *within their own company's project workspace*.
- Conflating the two would require special-casing every permission check and would
  create unexpected side effects (e.g., a system operator gaining Owner powers over
  every project, or a Project Owner inadvertently gaining access to other companies' data).

**Trade-off**: Two role systems to reason about. Mitigated by naming: the company-level
`role` field stays `"admin"` / `"user"` and the new field is always called `projectRole`.

---

## ADR-020: Invitation-Only Join for Existing Projects

**Decision**: Once a project exists for a `companyRegId`, no new user can self-register
under that ID. They must receive an invitation link from an existing Owner, System Admin,
or Manager.

**Rationale**:
- Prevents an attacker from registering with a known `companyRegId` and gaining access
  to that company's project data.
- Gives the Owner full control over who is in their workspace.
- The `GET /project/join/{token}` endpoint is public (no auth) but reveals only the
  project name and role — not any assessments or member data.

**Trade-off**: Adds friction for the second user at a company. Mitigated by a clear
"This company is already registered — contact your admin" error message at registration.

---

## ADR-021: Separate `fs-backoffice-web` Application for FactorySync Staff

**Decision**: FactorySync staff operations (CRUD projects, invite owners, manage
project members, view all quiz results) live in a dedicated app
`apps/fs-backoffice-web`, deployed to `backoffice.factorysync.com` and gated
by Cloudflare Access (email allowlist).

**Rationale**:
- Network-layer isolation — Cloudflare Access can only protect a subdomain,
  not a sub-route within an app.
- No bundle pollution — admin-only code (project deactivation, staff management)
  never ships to factory-user clients.
- Different UX needs — backoffice is dense/tabular (sidebar nav, data tables);
  `fs-app-web` is wizard-flow oriented.
- Independent deployment lifecycle — staff app can be deployed on its own
  without risking the customer app.
- Clear mental model: `fs-app-web` is for factory users,
  `fs-backoffice-web` is for FactorySync staff.

**Existing `/admin` page in `fs-app-web`** remains as-is — it covers
cross-project data viewing and promoting the `role == "admin"` claim, which is
a lighter-weight "power user" operation rather than structural management.

---

## ADR-022: `backofficeRole` Firebase Custom Claim for Backoffice RBAC

**Decision**: Introduce a separate `backofficeRole: "superadmin" | "staff"`
Firebase custom claim for `fs-backoffice-web` access control. This claim is
completely independent of the existing `role: "admin" | "user"` claim used by
`fs-app-web`.

**Roles**:

| Role | Who | Key extra capabilities vs. `staff` |
|------|-----|-----------------------------------|
| `superadmin` | FactorySync CTO / engineering lead | Deactivate projects, delete users, manage `backofficeRole` of others, promote/demote `role == "admin"` claim |
| `staff` | FactorySync support / operations | View + create + edit projects, invite owners, manage project members, view/export all quiz results |

**Backend enforcement**: `middleware.RequireBackofficeRole(authClient, "superadmin", "staff")`
guards all `/api/v1/backoffice/` routes; `middleware.RequireBackofficeRole(authClient, "superadmin")`
guards destructive-only routes (deactivate, delete, staff management).

**Claim management**: set out-of-band via Firebase Admin SDK seeder or Firebase Console.
Never self-assignable. A user can hold both `role: "admin"` and `backofficeRole: "superadmin"`
to access both `fs-app-web /admin` and `fs-backoffice-web`.

**Rationale**:
- Conflating `role` with backoffice access would give FactorySync staff
  unintended project-level permissions (or vice versa) and requires
  special-casing every permission check.
- A separate claim is the minimal, explicit separation — each app reads only
  its own claim; neither bleeds into the other.

**Trade-off**: Two claim namespaces to reason about. Mitigated by the clear
naming convention (`role` for customer-facing, `backofficeRole` for staff).

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated ADR-006 (Turborepo → Makefile), ADR-011 (Swagger status), ADR-013 (Cloud Run), added ADR-015 (i18n) and ADR-016 (DBD) |
| 1.2.0 | 2026-06-10 | Added ADR-017 through ADR-020 for Project & RBAC feature |
| 1.3.0 | 2026-06-11 | Added ADR-021 (separate backoffice app) and ADR-022 (backofficeRole claim) |
