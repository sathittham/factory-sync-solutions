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

⚠️ **Phases 1–3 shipped + Phase 5 SEO largely done. Phase 4 (Knowledge Hub) code-complete**
(2026-07-01) — `/knowledge` + 8 category pages + article pages build green via a graceful CMS
fetch layer; remaining items are operational: set `PUBLIC_CMS_URL` for staging/prod and author
category-tagged articles in web-cms. Phase 5's only open item is replacing Unsplash imagery with
owned assets.

Phase 1 shipped: `SiteNavBar` now renders the routed primary nav (Home · About ▾ · Services ▾ mega · Knowledge ·
Contact) backed by a shared `SERVICE_GROUPS` taxonomy (`src/lib/services.ts`), a 4-column Services mega menu,
a mobile accordion drawer, and a persistent top CTA bar (`TopCtaBar`, pinned above the sticky header) that
calls to action via the **LINE@** official account, mounted globally in `Layout.astro`. Nav/CTA i18n keys
added (TH/EN). Build + Biome green.

Phase 2 shipped (2026-06-30): unified header (`SiteNav`) across Home, Services and Legal pages. New routed
pages `/contact`, `/about`, `/about/company`, `/about/team`, `/about/case-studies` built and verified. New
`SiteShell` shared chrome component. All 69 tests green, 15 routes generated.

Phase 3 shipped (2026-06-30): nested service taxonomy live — `/services/<group>` (4 roots: 2 single pages +
2 hub listings) and `/services/<group>/<slug>` (13 detail pages), all from `SERVICE_GROUPS` via nested
`getStaticPaths`. One mode-driven `ServiceContent` template renders hub listing / real detail /
placeholder detail. Per the **scaffold + placeholder** decision, the 13 nested details show a clearly-marked
"coming soon" notice (no fabricated service claims); the flagship `factory-health-check` and
`engineering-consulting` carry migrated real copy with a flagship CTA deep-linking into the web-app. Legacy
slugs 301-redirect to their new targets. All 80 tests green, 28 pages built (17 service routes + 3 redirects).

⚠️ **Known gaps:** Knowledge Hub renders an empty state until `PUBLIC_CMS_URL` is set and articles are
authored in web-cms (the build degrades gracefully to zero articles without it). The 13 nested detail
pages carry placeholder body copy pending marketing-owned content.

---

## Phase 1 — Navigation shell ✅

New header (mega menu + mobile drawer) and a persistent top CTA bar, keeping existing pages working.

- [x] Shared service taxonomy — `src/lib/services.ts` (`SERVICE_GROUPS`, `groupHref`, `childHref`)
- [x] 4-column Services mega menu + About dropdown — `src/components/SiteNavBar.tsx`
- [x] Mobile accordion drawer (Services → 4 groups → hub children)
- [x] Persistent top CTA bar → LINE@ official account — `src/components/TopCtaBar.tsx` (mounted in `Layout.astro`, above sticky header)
- [x] Nav/CTA i18n keys (About/Services/Knowledge/Contact + service labels, TH/EN) — `src/lib/i18n.tsx`
- [x] Unify Home `landing/NavBar.tsx` with the new header (completed in Phase 2)

### Phase 1 Tests
- [x] Mega menu / About dropdown open + nested hrefs + Escape-close — `SiteNavBar.test.tsx`
- [x] Top CTA bar → LINE@ in new tab + responsive labels — `TopCtaBar.test.tsx`
- [x] Added `@shared` alias to `vitest.config.ts` so island tests resolve brand assets

> Verified: `pnpm --filter @repo/web-official build` ✓ · `biome check` ✓ · `vitest run` 64/64 ✓ (2026-06-30).

---

## Phase 2 — Home + Contact + About ✅

Routed pages; unified header across all pages.

- [x] Keep `LandingContent` as Home `/` — `src/pages/index.astro`
- [x] `/contact` routed page — `src/components/contact/ContactContent.tsx` (phone/email/LINE/hours + app CTA)
- [x] `/about` overview + `/about/{company,team,case-studies}` — `src/components/about/AboutContent.tsx` (page prop dispatch)
- [x] Unified header: `SiteNav` exported from `SiteNavBar.tsx`; `SiteShell` shared chrome — `src/components/site/SiteShell.tsx`
- [x] Home `LandingContent` retrofitted to `SiteNav` (Phase 1 gap closed)
- [x] `ServiceContent` retrofitted to `SiteNav` (inline NavBar removed)
- [x] `LegalContent` retrofitted to `SiteNav` + `SiteFooter` from chrome (inline NavBar + Footer removed)
- [x] i18n keys added: `contact.*` (14 keys TH+EN) + `about.*` (33 keys TH+EN) — `src/lib/i18n.tsx`

### Phase 2 Tests
- [x] `ContactContent` renders LINE link + email link + app CTA — `ContactContent.test.tsx`
- [x] `AboutContent` overview renders 3 sub-page links; company/team/case-studies sections render — `AboutContent.test.tsx`

> Verified 2026-06-30: `pnpm --filter @repo/web-official build` → 15 pages built (/contact, /about, /about/company, /about/team, /about/case-studies confirmed). `biome check --write` ✓ no errors. `vitest run` → 10 test files, **69/69 tests** passed.

---

## Phase 3 — Services ✅

Q4 (dedicated flagship marketing page + deep-link CTA) and Q5 (uniform template) resolved 2026-06-30.

- [x] Service taxonomy lookups + path enumerators — `src/lib/services.ts` (`getGroupBySlug`, `getChildBySlug`, `groupParams`, `childParams`, `subKey`)
- [x] Service body copy module (real for the 2 single pages, placeholder elsewhere) — `src/lib/serviceContent.ts`
- [x] `getStaticPaths` emits nested paths — `services/[group].astro` (4) + `services/[group]/[slug].astro` (13)
- [x] Mode-driven template (hub listing / detail / placeholder) — `src/components/services/ServiceContent.tsx`
- [x] `.sub` taglines + `svc.ui.*` strings (TH/EN) — `src/lib/i18n.tsx`; server-safe `translate()` for Astro SEO
- [x] 301 redirects for the 3 legacy slugs — `astro.config.mjs`

> **Design note:** SDD §4.2 prescribed an MDX content collection; Phase 3 uses a **TS data module**
> (`serviceContent.ts`) instead — it matches the existing `SERVICE_DETAILS` pattern, is type-safe, needs no
> MDX tooling, and suits the placeholder strategy. Recorded in the SDD document history.

### Phase 3 Tests
- [x] Taxonomy: 4 roots + 13 details = 17 paths; slug lookups; nested hrefs — `services.test.ts`
- [x] Template: hub lists children, flagship detail CTA → app, placeholder shows notice + breadcrumb — `ServiceContent.test.tsx`
- [x] All 17 nested routes build with correct TH/EN titles; legacy slugs 301 → new targets

> Verified 2026-06-30: `pnpm build` → 28 pages (17 service routes + 3 legacy redirects). `biome check` ✓.
> `tsc --noEmit` ✓. `vitest run` → **80/80** (was 69).

---

## Phase 4 — Knowledge Hub ⚠️

Code-complete 2026-07-01. web-cms now exposes a public read API (`GET /api/content/blog-posts`,
`public: ['read']`), so the original blocker is lifted. A `category` select field (8 enum slugs) was
added to the web-cms `blog_post` collection (no D1 migration — SonicJS stores collection fields in the
`documents.data` JSON column). Articles are pulled at **build** time with a graceful empty fallback, so
the SSG build always succeeds even when the CMS is unset/unreachable. Lexical content is rendered to
sanitized HTML at build (no `@lexical` runtime dep).

- [x] `category` select field (8 slugs) on web-cms `blog_post` collection — `apps/web-cms/src/collections/blog-posts.collection.ts`
- [x] 8-category taxonomy (single source of truth, slugs synced with CMS enum) — `src/lib/knowledge.ts`
- [x] Build-time article fetch with graceful empty fallback + build cache — `src/lib/cms.ts`
- [x] Lexical JSON → sanitized HTML renderer + plain-text excerpt — `src/lib/lexical.ts`
- [x] `/knowledge` listing + `/knowledge/category/[category]` (8) + `/knowledge/[slug]` (CMS-driven) — `src/pages/knowledge/**`
- [x] `KnowledgeContent` island (hub / category / article modes) + `.prose-knowledge` styles
- [x] Buddhist-era date formatter (no dayjs in web-official) — `src/lib/date.ts`
- [x] `knowledge.*` i18n keys incl. 8 category labels (TH/EN); `BlogPosting` JSON-LD on article pages
- [x] `PUBLIC_CMS_URL` documented in `.env.example`
- [ ] **Operational:** set `PUBLIC_CMS_URL` for staging/prod + author category-tagged articles, then verify article rendering against live CMS

### Phase 4 Tests
- [x] Knowledge taxonomy (8 categories, params, lookups) — `knowledge.test.ts`
- [x] CMS fetch: graceful `[]` when unset/unreachable/non-200; normalization, draft filtering, unknown-category sanitization, nested-`data` shape — `cms.test.ts`
- [x] Lexical renderer: headings/lists/format flags/safe links, HTML escaping (XSS), plain-text extract — `lexical.test.ts`
- [x] `KnowledgeContent`: hub lists + 8 category links, category active-state, article HTML render, empty states — `KnowledgeContent.test.tsx`
- [ ] Live smoke: article renders from web-cms once `PUBLIC_CMS_URL` + content exist

> Verified 2026-07-01: `pnpm --filter @repo/web-official build` → **37 pages** (was 28): `/knowledge`
> + 8 category routes, all in `sitemap.xml`; article routes correctly emit 0 with no CMS configured
> (graceful fallback). `biome check` ✓. `tsc --noEmit` ✓ (web-official + web-cms). `vitest run` → **110/110** (was 80).

---

## Phase 5 — SEO polish ⚠️

Structured data + sitemap done; owned imagery still pending.

- [x] Per-page OG/Twitter tags + canonical — already driven by `Layout.astro` props (unique title/description per page)
- [x] **Site-wide** `Organization` + `WebSite` JSON-LD with stable `@id`s — `Layout.astro` (emitted on every page)
- [x] Deduped home `@graph` to page-specific `FAQPage`; `Service` pages reference the org via `provider: { @id }` (no duplicate Organization)
- [x] Verified `sitemap.xml`: all 17 service routes present, 3 legacy redirects correctly excluded
- [ ] Replace remaining Unsplash imagery (landing/about) with owned/licensed assets — **needs marketing-owned assets**; service hero images were already removed in the Phase 3 template rewrite

### Phase 5 Tests
- [x] Verified per page type (home/about/contact/service/legal): unique `<title>`, OG tags, and one `#organization` node; service pages cross-reference it via `@id`
- [x] Sitemap includes all routes; redirects excluded

> Verified 2026-06-30: `pnpm build` → 28 pages. Structured data inspected in `dist/` per page type
> (`Organization`+`WebSite` site-wide; `Service`→`provider:@id`; `FAQPage` on home). `biome check` ✓.
> `vitest run` 80/80.

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

*Version: 0.5.0*
*Last updated: 1 July 2026*
