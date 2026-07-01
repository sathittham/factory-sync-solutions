---
isoOutput: PM.O1 (Change Control)
version: 1.0.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
---

# Change Request Log — FactorySync Solutions

*ISO 29110 Basic Profile · PM.O1 component*

Log every change to approved scope, architecture, or accepted requirements here.
Routine bugfixes and small refactors within agreed scope do NOT require a CR.

**Status values:** Draft → Under Review → Approved → Implemented → Rejected / Withdrawn

---

## Change Request Template

Copy this block and add to the Active section:

```markdown
### CR-NNN | [Short title] | [Status]

| Field | Value |
|---|---|
| **Date Raised** | YYYY-MM-DD |
| **Raised By** | [name] |
| **Type** | Scope change / Architecture change / Requirements change / Process change |
| **Priority** | Low / Medium / High |

**Description:**
[What needs to change and why]

**Impact Analysis:**
- Schedule: [e.g. +3 days]
- Effort: [e.g. ~4 hours]
- Risk: [any new risks?]
- Affected components: [e.g. backend/services/quiz, web-app/pages/QuizPage]

**Decision:**
- [ ] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** YYYY-MM-DD
**Decision By:** [name]

**Implementation Notes:**
[PR / commit / branch where implemented, if approved]
```

---

## Active Change Requests

### CR-003 | Adopt TanStack Table + Query in web-app | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-07-01 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Architecture change (frontend server-state + table layer) |
| **Priority** | Medium |

**Description:**
Adopt two TanStack libraries in `apps/web-app` to replace hand-rolled patterns:
1. **`@tanstack/react-table`** — drive the AdminPage assessment table (headless), adding client-side
   sorting, pagination, and search while preserving the existing bespoke row markup, expandable detail
   rows, responsive columns, and `data-testid` hooks. Introduces a reusable shadcn `DataTable` +
   `table` primitive under `components/ui/`.
2. **`@tanstack/react-query`** — introduce server-state management to replace the hand-rolled
   `fetch` + `useState(loading/error)` + `useEffect` pattern (8 files). Piloted on one read-heavy page
   first; Redux is retained for genuine client state (auth session, in-progress quiz answers).

**Impact Analysis:**
- Schedule: 1 iteration (Table migration + Query pilot).
- Effort: ~1 day.
- Risk: (1) AdminPage is a 1,523-line critical page — mitigated by keeping markup/testids intact and
  verifying with build + Vitest + Playwright; (2) TanStack Query overlaps Redux for server state —
  mitigated by a clear boundary (Query owns server data, Redux owns client state) and a single-page pilot
  before wider rollout; (3) supersedes the "use RTK Query for API calls" guidance in
  `.claude/rules/react.md` — rule file updated as part of this CR.
- Affected components: `apps/web-app/src/pages/AdminPage.tsx`, `apps/web-app/src/components/ui/`,
  `apps/web-app/src/main.tsx` (QueryClientProvider), one pilot page, `.claude/rules/react.md`.

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-07-01
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/tanstack-adoption/feature-spec.md](../product/tanstack-adoption/feature-spec.md)

---

### CR-002 | Official site restructure (multi-page IA) | Approved

| Field | Value |
|---|---|
| **Date Raised** | 2026-06-30 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change / Architecture change (public site routing) |
| **Priority** | High |

**Description:**
Restructure `apps/web-official` from a single-page landing (8 anchor sections + 4 flat service pages) into
a multi-page marketing site: Home, a 3-page About section, a 4-group Services mega menu (2 hubs + 13 detail
pages, nested slugs), a CMS-backed Knowledge Hub (8 categories), a Contact page, and a persistent
free-health-check floating CTA. This is a **breaking change** to public routing and supersedes the
current-site spec (now the baseline in feature-spec.md §2.5).

**Impact Analysis:**
- Schedule: phased (5 phases, sitemap.md §9); estimate per phase TBD.
- Effort: largest in Phase 3 (services taxonomy + 13 pages) and Phase 4 (Knowledge Hub).
- Risk: (1) breaks 3 legacy service slugs → 301 redirects required (FR-006);
  (2) Phase 4 depends on `feature/web-cms-sonicjs` exposing build-time article data.
  Q4 (flagship marketing page + deep-link CTA) and Q5 (uniform template) resolved 2026-06-30 — Phase 3 unblocked.
- Affected components: `apps/web-official/src/{pages,components,content,lib}`, `astro.config.mjs`;
  build-time read from `apps/web-cms`.

**Decision:**
- [x] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** 2026-06-30
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- SRS: [docs/product/official-site/feature-spec.md](../product/official-site/feature-spec.md)
- SDD: [docs/architecture/official-site-restructure-design.md](../architecture/official-site-restructure-design.md)
- IA: [docs/product/official-site/sitemap.md](../product/official-site/sitemap.md) · Status: [status.md](../product/official-site/status.md)

---

## Closed Change Requests

### CR-001 | Add ISO 29110 quiz variant | Implemented

| Field | Value |
|---|---|
| **Date Raised** | 2026-06-11 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change (new quiz variant + compliance artifacts) |
| **Priority** | High |

**Description:**
Add ISO 29110 Basic Profile as a fifth quiz variant. Also create the compliance artifact set (PM.O1–O3, SI.O1–O8 templates) to bring the project itself into ISO 29110 compliance.

**Impact Analysis:**
- Schedule: 0 (same iteration)
- Effort: ~4 hours
- Risk: None — additive change, no existing code modified beyond main.go registration
- Affected components: `apps/backend/config/`, `apps/backend/main.go`, `docs/`

**Decision:** Approved — proceed
**Decision Date:** 2026-06-11
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- `apps/backend/config/questions-iso29110.json` created (38 questions, 8 dimensions)
- `apps/backend/main.go` updated to register iso29110 config
- `docs/iso29110/` directory created with all compliance artifacts
