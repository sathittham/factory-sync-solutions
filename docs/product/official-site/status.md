# Status

> Tracks build progress for the Official Site Restructure against
> [README.md § Build Sequence](./README.md#build-sequence). Design detail is in
> [README.md](./README.md), the IA in [sitemap.md](./sitemap.md), and requirements in
> [feature-spec.md](./feature-spec.md). Tick items off as they merge into `develop`.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Navigation shell](#phase-1--navigation-shell)
- [Phase 2 — Home + Contact + About](#phase-2--home--contact--about)
- [Phase 3 — Services](#phase-3--services)
- [Phase 4 — Knowledge Hub](#phase-4--knowledge-hub)
- [Phase 5 — SEO polish](#phase-5--seo-polish)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

📝 **Planning.** Phase 0 is approved — decisions locked in [sitemap.md §10](./sitemap.md#10-decisions--open-questions)
(nested slugs, articles via web-cms + static service copy, keep the one-pager as Home). **Phase 1 (nav
shell) is implemented**; Phases 2–4 not started.

Phase 1 shipped: `SiteNavBar` now renders the routed primary nav (Home · About ▾ · Services ▾ mega · Knowledge ·
Contact) backed by a shared `SERVICE_GROUPS` taxonomy (`src/lib/services.ts`), a 4-column Services mega menu,
a mobile accordion drawer, and a persistent top CTA bar (`TopCtaBar`, pinned above the sticky header) that
calls to action via the **LINE@** official account, mounted globally in `Layout.astro`. Nav/CTA i18n keys
added (TH/EN). Build + Biome green.

⚠️ **Known interim gaps:** (1) the new nav links to `/about`, `/knowledge`, `/contact`, and nested service
routes that **do not exist yet** — they 404 until Phases 2–4. The top CTA bar (→ LINE@) and the flagship
nav CTA (→ `PUBLIC_APP_URL`) work today. (2) The Home page still uses its own `landing/NavBar.tsx` (anchor nav);
unifying it with the new header is deferred to Phase 2. `@astrojs/sitemap` + service JSON-LD remain wired
(partial Phase 5).

Both open decisions (Q4, Q5) are resolved (2026-06-30) — Phase 3 unblocked.

---

## Phase 1 — Navigation shell ✅

New header (mega menu + mobile drawer) and a persistent top CTA bar, keeping existing pages working.

- [x] Shared service taxonomy — `src/lib/services.ts` (`SERVICE_GROUPS`, `groupHref`, `childHref`)
- [x] 4-column Services mega menu + About dropdown — `src/components/SiteNavBar.tsx`
- [x] Mobile accordion drawer (Services → 4 groups → hub children)
- [x] Persistent top CTA bar → LINE@ official account — `src/components/TopCtaBar.tsx` (mounted in `Layout.astro`, above sticky header)
- [x] Nav/CTA i18n keys (About/Services/Knowledge/Contact + service labels, TH/EN) — `src/lib/i18n.tsx`
- [ ] Unify Home `landing/NavBar.tsx` with the new header (deferred to Phase 2)

### Phase 1 Tests
- [x] Mega menu / About dropdown open + nested hrefs + Escape-close — `SiteNavBar.test.tsx`
- [x] Top CTA bar → LINE@ in new tab + responsive labels — `TopCtaBar.test.tsx`
- [x] Added `@shared` alias to `vitest.config.ts` so island tests resolve brand assets

> Verified: `pnpm --filter @repo/web-official build` ✓ · `biome check` ✓ · `vitest run` 64/64 ✓ (2026-06-30).

---

## Phase 2 — Home + Contact + About

Routed pages; migrate landing sections.

- [ ] Keep `LandingContent` as Home `/` — `src/pages/index.astro`
- [ ] `/contact` routed page (extracted from `#contact`)
- [ ] `/about` overview + `/about/{company,team,case-studies}`

### Phase 2 Tests
- [ ] Each new route builds and returns 200 (astro build smoke)

---

## Phase 3 — Services

✅ Unblocked — Q4 (dedicated flagship marketing page + deep-link CTA) and Q5 (uniform template) resolved 2026-06-30.

- [ ] Nested `SERVICE_DETAILS` data structure (groups → hubs → detail)
- [ ] `getStaticPaths` emits nested paths; 2 hubs + 13 detail pages
- [ ] Static content collection for service copy — `src/content/services/`
- [ ] 301 redirects for the 3 legacy slugs — `astro.config.mjs`

### Phase 3 Tests
- [ ] All 13 nested routes 200 with correct TH/EN titles
- [ ] Legacy slugs 301 → new targets

---

## Phase 4 — Knowledge Hub

⛔ Blocked on `feature/web-cms-sonicjs` exposing build-time article data.

- [ ] `/knowledge` listing + 8 category pages + article pages
- [ ] web-cms (SonicJS) fetch at build — `src/lib/cms.ts`

### Phase 4 Tests
- [ ] 8 category routes 200; article renders from web-cms; graceful build when CMS unreachable

---

## Phase 5 — SEO polish

- [ ] Per-page OG tags + org/service JSON-LD (service JSON-LD ⚠️ already partially wired)
- [ ] Verify regenerated `sitemap.xml` for all new routes
- [ ] Replace Unsplash imagery with owned/licensed assets

### Phase 5 Tests
- [ ] Unique title/OG per page type; valid JSON-LD; sitemap includes all routes

---

## Open Decisions

Mirrors [sitemap.md §10](./sitemap.md#10-decisions--open-questions). All resolved — none open.

| # | Decision | Resolution |
|---|----------|------------|
| 4 | Free Health Check: marketing page vs. CTA deep-link | ✅ Dedicated marketing page; CTA deep-links into web-app (2026-06-30) |
| 5 | Service detail depth | ✅ Uniform content-collection template for all 13 (2026-06-30) |

---

## Related Documents

- [README.md](./README.md) · [sitemap.md](./sitemap.md) · [feature-spec.md](./feature-spec.md) · [user-journeys.md](./user-journeys.md) · [mockups/official.md](./mockups/official.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 0.1.0*
*Last updated: 30 June 2026*
