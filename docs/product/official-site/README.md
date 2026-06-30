# Official Site Restructure — Feature Spec

**Status:** 📝 Planning — Phase 0 approved (decisions locked in [sitemap.md](./sitemap.md) §10). Restructures the single-page marketing site into a multi-page IA: Home · About (3) · Services (2 hubs + 13 detail) · Knowledge Hub · Contact, plus a persistent free-health-check CTA.

---

## Table of Contents

1. [App surfaces](#app-surfaces)
2. [Summary](#summary)
3. [Goals & Non-Goals](#goals--non-goals)
4. [Current State](#current-state)
5. [Design Overview](#design-overview)
6. [Build Sequence](#build-sequence)
7. [SEO & Non-Functional](#seo--non-functional)
8. [Acceptance Criteria](#acceptance-criteria)
9. [Testing](#testing)
10. [Open Items & Future Work](#open-items--future-work)
11. [References](#references)

---

`apps/web-official` is the public Astro 6 marketing site for `factorysyncsolutions.com`. Today it is a
single-page landing (8 anchor sections) plus 4 flat service detail pages and the legal pages. This
restructure expands it into a multi-page site — a real Home, a 3-page About section, a 4-group Services
mega menu (2 of them hubs with 13 detail pages total), a CMS-backed Knowledge Hub, a Contact page, and a
top CTA bar (→ LINE@) on every page. It is a **breaking change** to public routing.

This README is the design index. The full information architecture and route map live in
[sitemap.md](./sitemap.md) (the source of truth for the IA); formal requirements are in
[feature-spec.md](./feature-spec.md) (ISO 29110 SRS); live progress is in [status.md](./status.md).

---

## App surfaces

<!-- Legend: ✅ built · 📋 planned · ⬩ indirect (no UI) · — n/a -->

| web-app | web-official | web-cms | backend |
|:-------:|:------------:|:-------:|:-------:|
| ⬩ CTA target (`PUBLIC_APP_URL`) | 📋 the restructure | ⬩ Knowledge Hub article source (SonicJS) | — |

Per-app visitor flows live in [user-journeys.md](./user-journeys.md). Screen wireframes are in
[mockups/official.md](./mockups/official.md).

---

## Summary

| Component | Description | Phase |
|-----------|-------------|-------|
| **Navigation shell** | New header with 4-column Services mega menu + mobile accordion drawer | Phase 1 |
| **Top CTA bar** | Persistent "ตรวจสุขภาพโรงงานฟรี" bar pinned at top of every page → LINE@ official account | Phase 1 |
| **Home** | Keep the rich one-pager as `/`; some sections migrate to About/Services | Phase 2 |
| **Contact** | Extract `#contact` anchor → routed `/contact` page | Phase 2 |
| **About (3 pages)** | `/about`, `/about/company`, `/about/team`, `/about/case-studies` | Phase 2 |
| **Services (2 hubs + 13 detail)** | Nested slugs under group hubs; static content collection | Phase 3 |
| **Knowledge Hub** | `/knowledge` + 8 categories + articles, sourced from web-cms | Phase 4 |
| **SEO polish** | Per-page titles, OG tags, JSON-LD, sitemap verify, owned imagery | Phase 5 |

---

## Goals & Non-Goals

### Goals

- Expand the one-pager into a navigable multi-page IA matching the reference mockups (sitemap.md §2).
- Make the **free factory health check** the flagship CTA, reachable from every page.
- Nest service detail pages under their group hubs for better SEO and breadcrumbs (sitemap.md §3).
- Source Knowledge Hub articles from `web-cms` (SonicJS); keep service copy in a static content collection.
- Keep the existing legal pages and locale/theme behaviour unchanged.

### Non-Goals

- **No Admin / Client Portal.** That branch maps to `web-backoffice` / `web-cms` — out of scope (sitemap.md §7).
- **No authentication** on `web-official`; it stays fully static (Cloudflare Pages SSG).
- **No new backend endpoints.** Article data comes from web-cms; service copy is static.
- **No redesign of the legal/cookie pages.**

---

## Current State

See [status.md](./status.md) for the per-phase implementation checklist.

The live site is the single-page landing ([index.astro](../../../apps/web-official/src/pages/index.astro)
→ `LandingContent`) with 8 anchor sections, plus 4 **flat** service detail pages
(`/services/{factory-health-check,production-assessment,efficiency-consulting,digital-factory}`) and the
legal pages. `@astrojs/sitemap` is already configured; service `<title>` and `Service` JSON-LD are already
wired in [services/[slug].astro](../../../apps/web-official/src/pages/services/). A `SiteNavBar` (4 anchor
links, no mega menu) and a dismissible `TopCtaBar` exist. There is no `/about`, `/contact`, `/knowledge`
routing, no content collection, and no persistent top CTA bar yet.

The restructure breaks 3 of the 4 current service slugs — redirects are required (see Build Sequence).

---

## Design Overview

The architectural heart of the restructure is the IA and route map. Rather than duplicate it here, see
**[sitemap.md](./sitemap.md)** — the source of truth for:

- Full sitemap transcribed from the reference mockups (§2)
- Public route map with all 20+ routes and types (§3)
- Navigation & mega-menu layout (§4)
- Knowledge Hub categories (§5)
- Content-source strategy: web-cms for articles, static collection for service copy (§6)
- Gap analysis current → target (§8)

```mermaid
flowchart TD
  V[Visitor] --> H[Home /]
  V --> Nav[Header: mega menu + mobile drawer]
  Nav --> About[/about + 3 sub-pages/]
  Nav --> Svc{Services mega menu}
  Svc --> FHC[Free Health Check ★]
  Svc --> GovHub[/services/government-supported hub → 5 detail/]
  Svc --> EngCon[/services/engineering-consulting/]
  Svc --> DesHub[/services/engineering-design hub → 8 detail/]
  Nav --> KH[/knowledge → category → article/]
  Nav --> C[/contact/]
  FHC -->|flagship CTA| APP[(web-app · PUBLIC_APP_URL)]
  Nav -. top CTA bar on every page .-> LINE[(LINE@ official account)]
  KH -.->|articles at build| CMS[(web-cms · SonicJS)]
```

### Content sources

| Surface | Source | Rationale |
|---------|--------|-----------|
| Service detail copy (13 pages) | Astro static content collection (`src/content/`) | Stable copy, marketing-owned, version-controlled |
| Knowledge Hub articles | web-cms (SonicJS) — fetched at build (SSG) | Matches portal CMS module + `feature/web-cms-sonicjs` work |

---

## Build Sequence

Mirrors [sitemap.md §9](./sitemap.md#9-proposed-implementation-phases). Each phase: add TH/EN i18n keys
in `src/lib/i18n.tsx`, build green (`pnpm --filter @repo/web-official build`), deploy to staging, smoke test.

### Phase 1 — Navigation shell

| # | Task | File(s) |
|---|------|---------|
| 1 | 4-column Services mega menu + mobile accordion drawer | `src/components/SiteNavBar.tsx` (or new `MegaMenu.tsx`) |
| 2 | Persistent top CTA bar (→ LINE@), pinned above the sticky header | `src/components/TopCtaBar.tsx` |
| 3 | Nav i18n keys for About/Services/Knowledge/Contact (TH/EN) | `src/lib/i18n.tsx` |

### Phase 2 — Home + Contact + About

| # | Task | File(s) |
|---|------|---------|
| 4 | Keep `LandingContent` as Home `/` | `src/pages/index.astro` |
| 5 | Extract Contact into a routed page | `src/pages/contact.astro` + component |
| 6 | About overview + 3 sub-pages | `src/pages/about/{index,company,team,case-studies}.astro` |

### Phase 3 — Services

| # | Task | File(s) |
|---|------|---------|
| 7 | Nested `SERVICE_DETAILS` data structure (groups → hubs → detail) | `src/components/services/ServiceContent.tsx` |
| 8 | `getStaticPaths` emits nested paths; 2 hub pages + 13 detail pages | `src/pages/services/**` |
| 9 | Static content collection for service copy | `src/content/services/` + `content.config.ts` |
| 10 | Redirects for the 3 broken legacy slugs | `astro.config.mjs` (redirects) |

### Phase 4 — Knowledge Hub

| # | Task | File(s) |
|---|------|---------|
| 11 | Listing + 8 category pages + article pages | `src/pages/knowledge/**` |
| 12 | web-cms (SonicJS) fetch at build | `src/lib/cms.ts` |

### Phase 5 — SEO polish

| # | Task | File(s) |
|---|------|---------|
| 13 | Per-page OG tags + org/service JSON-LD | `src/layouts/Layout.astro`, per page |
| 14 | Verify regenerated `sitemap.xml`; replace Unsplash imagery with owned assets | build output, service cards |

---

## SEO & Non-Functional

- Bilingual TH/EN — all strings via `useLocale()`; default `th`. No hardcoded copy.
- Mobile-first, ≥320px; WCAG 2.1 AA contrast; keyboard-navigable mega menu + drawer.
- Static SSG only — no runtime backend calls from `web-official`.
- Per-page `<title>` + meta description + Open Graph; `Organization` + `Service` JSON-LD.
- `@astrojs/sitemap` regenerates for all new routes on build.

---

## Acceptance Criteria

Grouped by phase; each is verifiable. Full per-requirement criteria are in [feature-spec.md](./feature-spec.md).

**Phase 1 — Navigation**
- [ ] Desktop header shows Home · About ▾ · Services ▾ (mega) · Knowledge · Contact + accent CTA button.
- [ ] Services mega menu renders 4 columns matching the 4 groups; hubs link to hub pages.
- [ ] Mobile drawer accordion expands Services → 4 groups → hub children.
- [ ] A persistent top CTA bar appears on every page and opens the LINE@ official account in a new tab.

**Phase 2 — Home / Contact / About**
- [ ] `/` renders the existing landing content; `/contact`, `/about`, `/about/company`, `/about/team`, `/about/case-studies` each return 200.

**Phase 3 — Services**
- [ ] Hub pages `/services/government-supported` and `/services/engineering-design` list their children.
- [ ] All 13 nested detail routes return 200 with correct TH/EN titles.
- [ ] Legacy slugs `/services/{production-assessment,efficiency-consulting,digital-factory}` redirect (301).

**Phase 4 — Knowledge**
- [ ] `/knowledge` lists articles; `/knowledge/category/[category]` resolves for all 8 categories; articles render from web-cms.

**Phase 5 — SEO**
- [ ] Each page emits a unique `<title>`, OG tags, and valid JSON-LD; `sitemap.xml` includes every new route.

**Cross-cutting**
- [ ] `pnpm --filter @repo/web-official build` completes without errors.
- [ ] Locale + theme persistence still work across reloads.

---

## Testing

| Target | Phase | Notes |
|--------|-------|-------|
| Component tests for mega menu + top CTA bar (Vitest) | 1 | open/close, locale labels, CTA → LINE@ in new tab |
| Route render tests / build smoke (`astro build`) | 2–4 | all new routes emit static HTML, return 200 |
| Redirect assertions for legacy service slugs | 3 | 301 → nested target |
| Knowledge Hub: build with web-cms fixture | 4 | graceful build when CMS unreachable |
| SEO: title/OG/JSON-LD snapshot per page type | 5 | unique title; valid schema |

Run via `pnpm --filter @repo/web-official test` and the `deploy-smoke-test` workflow against staging.

---

## Open Items & Future Work

### Blocked on other features

| # | Area | Description |
|---|------|-------------|
| 1 | Knowledge Hub | Article fetch depends on `feature/web-cms-sonicjs` landing a public read API/build export |

### Resolved decisions

Mirrors [sitemap.md §10](./sitemap.md#10-decisions--open-questions). All Phase 0–3 decisions are locked.

| # | Decision | Resolution |
|---|----------|------------|
| 4 | Free Health Check: marketing page vs. CTA deep-link | ✅ Dedicated `/services/factory-health-check` marketing page; CTA deep-links into web-app |
| 5 | Service detail depth | ✅ One uniform, content-collection-driven template for all 13 (flagship uses same template) |

---

## References

### Sub-documents

| Doc | Covers |
|-----|--------|
| [sitemap.md](./sitemap.md) | Information architecture & full route map — IA source of truth |
| [feature-spec.md](./feature-spec.md) | ISO 29110 SRS — formal requirements for the restructure |
| [status.md](./status.md) | Live per-phase implementation status |
| [user-journeys.md](./user-journeys.md) | Public-site visitor flows (Mermaid) |
| [mockups/official.md](./mockups/official.md) | ASCII wireframes per screen/state |

### ISO 29110 artifacts

- Test plan: copy `docs/iso29110/test-plan-template.md` → `test-plan.md`
- Design (non-trivial): copy `docs/iso29110/sdd-template.md` → `docs/architecture/official-site-restructure-design.md`
- Log scope change in [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md)
- New risks → [docs/iso29110/risk-register.md](../../iso29110/risk-register.md)

### Cross-references

- Reference mockups: `docs/ref/messageImage_1782292944152.jpg`, `docs/ref/messageImage_1782292974212.jpg`
- CMS work: `feature/web-cms-sonicjs` branch, `apps/web-cms`; SSO: [sso-handover/README.md](../sso-handover/README.md)
- Legal pages: [legal/feature-spec.md](../legal/feature-spec.md)

---

*Version: 0.1.0*
*Last updated: 30 June 2026*
