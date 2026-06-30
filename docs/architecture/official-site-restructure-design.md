---
isoOutput: SI.O2
version: 0.1.0
lastUpdated: 2026-06-30
author: Sathittham Sangthong
status: Draft
---

# Software Design Description — Official Site Restructure

*ISO 29110 Basic Profile · SI.O2*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Official Site Restructure (`apps/web-official`) |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-06-30 |
| **SRS Reference** | [docs/product/official-site/feature-spec.md](../product/official-site/feature-spec.md) |

---

## 1. Introduction

### 1.1 Purpose

Component- and data-level design for restructuring `apps/web-official` from a single-page landing into a
multi-page marketing site. Covers the navigation shell, routed pages, the nested services data model, the
service content collection, the Knowledge Hub web-cms integration, and SEO output.

### 1.2 Scope

`apps/web-official` only. **No backend, no Firestore, no Firebase Auth** — the site is fully static (Astro
SSG → Cloudflare Pages). The two data sources are an Astro content collection (service copy) and web-cms
(SonicJS) article data fetched at build time. Out of scope: the Admin/Client Portal (sitemap.md §7), legal
page redesign.

### 1.3 Design Constraints

- Astro 6 SSG + React 19 islands (`client:load`); shadcn/ui only; no native `<select>`/`<dialog>`.
- All UI text via `useLocale()` (TH/EN); dates via `formatDateTime()` (Buddhist Era for TH).
- Slugs are English kebab-case, **nested under group hubs** (sitemap.md §3); Thai labels from i18n.
- No runtime backend calls; web-cms is consumed at build only.
- Reuse shared chrome (`components/site/chrome.tsx`) and existing `lib/i18n.tsx`, `lib/theme.ts`, `lib/appLinks.ts`.

---

## 2. System Architecture

### 2.1 Component Diagram

```
[Public Visitor Browser]
        │  HTTPS (static assets)
        ▼
[web-official]  (Astro SSG → Cloudflare Pages)
   pages/                         components/
     index.astro            ──►     landing/LandingContent (island)
     about/**.astro         ──►     about/* (islands)
     contact.astro          ──►     contact/* (island)
     services/**.astro      ──►     services/ServiceContent (island)
     knowledge/**.astro     ──►     knowledge/* (islands)
   layouts/Layout.astro  ── shared <head>: title, OG, JSON-LD, sitemap
   components/SiteNavBar (mega menu) · FloatingCta · site/chrome
        │ build-time only                         │ CTA href
        ▼                                          ▼
   [web-cms · SonicJS]  (articles)         [web-app · PUBLIC_APP_URL]
```

### 2.2 Deployment Context

- Frontend: Cloudflare Pages (static, global CDN). Build: `pnpm --filter @repo/web-official build`.
- Releases via git tags (`v*-staging`, `v*.*.*`) → GitHub Actions, per [release-flow](../operations/release-flow.md).
- web-cms article fetch happens **during the build job**, not at request time.

---

## 3. Component Design

The repo has no Go/Redux surface for this feature; §3.1 covers Astro pages, §3.2 React islands & data.

### 3.1 Astro pages (`src/pages/`)

| Page | Route | Generates | Notes |
|---|---|---|---|
| `index.astro` | `/` | static | Retains `LandingContent` (Home) |
| `about/index.astro` + `{company,team,case-studies}.astro` | `/about/**` | static | New routed pages |
| `contact.astro` | `/contact` | static | Extracted from `#contact` |
| `services/[group]/[slug].astro` + hub pages | `/services/**` | `getStaticPaths` (nested) | 2 hubs + 13 detail |
| `knowledge/index.astro` | `/knowledge` | static + build fetch | Article listing |
| `knowledge/category/[category].astro` | `/knowledge/category/[category]` | `getStaticPaths` (8 cats) | |
| `knowledge/[slug].astro` | `/knowledge/[slug]` | `getStaticPaths` from web-cms | |

Each `.astro` page stays a thin shell that passes `appUrl` / `version` env props to its React island
(existing pattern). `getStaticPaths` for services emits **nested** paths from `SERVICE_GROUPS` (§4.1).

### 3.2 React islands & shared components

#### 3.2.1 `SiteNavBar.tsx` — mega menu + mobile drawer (FR-001, FR-002)

- Desktop: Services trigger opens a 4-column mega-menu panel (one column per group). Hub columns render
  a hub link + child links from `SERVICE_GROUPS`. Built with shadcn primitives (no native dropdown).
- Mobile: accordion drawer; Services expands to 4 groups; hub groups expand to children.
- Keyboard: trigger toggles on Enter/Space; `Esc` closes; items are focusable and focus-visible.
- Nav item source is a single `NAV` data structure so labels stay i18n-keyed.

#### 3.2.2 `FloatingCta.tsx` — persistent CTA (FR-003)

- Rendered globally via `Layout.astro` (so it appears on every page, including legal pages).
- Desktop: inline-sticky bottom-right; mobile: fixed pill above the safe-area inset.
- `href = appUrl` (`PUBLIC_APP_URL`); label via `useLocale()`. Replaces the dismissible `TopCtaBar`.
- Non-dismissible by spec (persistent); respects `prefers-reduced-motion` for entrance.

#### 3.2.3 `ServiceContent.tsx` — hub & detail rendering (FR-005)

- Driven by `SERVICE_GROUPS` (§4.1) + the `services` content collection (§4.2).
- Hub mode: lists child cards. Detail mode: hero (title/tagline/feature list) + body + related services +
  floating CTA. **One uniform template for all 13 pages** (Q5 resolved). The flagship
  `/services/factory-health-check` uses the same template with marketing-oriented copy and a CTA that
  deep-links into the web-app free-check flow (Q4 resolved).

#### 3.2.4 `lib/cms.ts` — web-cms article fetch (FR-007)

- `getArticles()` / `getArticle(slug)` / `getArticlesByCategory(category)` — called from `getStaticPaths`
  and page frontmatter at **build time**.
- Fail-soft: if web-cms is unreachable during build, return `[]` and render the empty state (mockups §6b)
  rather than failing the whole build. Log a build warning.

### 3.3 i18n

All new nav, page, and CTA strings added to `src/lib/i18n.tsx` under TH and EN. No hardcoded copy.

---

## 4. Data Design

No Firestore. Two build-time sources.

### 4.1 Service taxonomy — `SERVICE_GROUPS` (in `ServiceContent.tsx` or `lib/services.ts`)

```
SERVICE_GROUPS: ServiceGroup[]
ServiceGroup {
  id: "free-health-check" | "government-supported" | "engineering-consulting" | "engineering-design"
  type: "page" | "hub"
  slug: string                     // e.g. "government-supported"
  titleKey: string                 // i18n key (TH/EN)
  isFlagship?: boolean             // free health check ★
  children?: ServiceRef[]          // hubs only
}
ServiceRef { slug: string; titleKey: string }   // nested under group slug
```

`getStaticPaths` walks `SERVICE_GROUPS` → emits `/services/<group>/<child>` for hub children and
`/services/<group>` for page/hub roots. Total: 2 hub roots + 13 detail + flagship + consulting.

### 4.2 Service content collection — `src/content/services/`

Astro content collection (MDX), validated by a schema in `src/content.config.ts`:

```
services collection schema (Zod):
  group: enum(group ids)
  slug: string
  title: { th: string; en: string }
  tagline: { th: string; en: string }
  features: { th: string[]; en: string[] }
  body: MDX
```

**Source of record:** marketing-owned files in the repo (version-controlled). One file per detail page.

### 4.3 Knowledge Hub articles — web-cms (SonicJS)

- Shape consumed at build: `{ slug, title, category, publishedAt, excerpt, body, coverImage? }`.
- `category` constrained to the 8 slugs in [sitemap.md §5](../product/official-site/sitemap.md#5-knowledge-hub-categories).
- Dates rendered via `formatDateTime()` (TH = Buddhist Era).
- Depends on `feature/web-cms-sonicjs` exposing a build-consumable read path (CR-002 impact).

---

## 5. Interface Design

### 5.1 External interfaces

| Interface | Direction | When | Contract |
|---|---|---|---|
| web-cms (SonicJS) | read | build time | article list + body (§4.3); fail-soft to empty |
| web-app (`PUBLIC_APP_URL`) | link | runtime | CTA href; existing `?registered=1` handoff |

### 5.2 Routes

Full map in [feature-spec.md §5.2](../product/official-site/feature-spec.md) / [sitemap.md §3](../product/official-site/sitemap.md#3-public-route-map-web-official).

### 5.3 SEO output (FR-008)

`Layout.astro` accepts `title`, `description`, `ogImage`, and an optional JSON-LD slot. Pages pass unique
values; `Organization` JSON-LD is site-wide, `Service` JSON-LD per service page (already wired). `@astrojs/sitemap`
regenerates for all routes on build.

### 5.4 Legacy redirects (FR-006)

`astro.config.mjs` `redirects` map (301):

```
/services/production-assessment   → /services/government-supported/shindan-lean-kaizen   (or nearest)
/services/efficiency-consulting   → /services/engineering-consulting
/services/digital-factory         → /services/government-supported/digital-factory-layout-360
```

*Exact targets confirmed during Phase 3 once copy is mapped.*

---

## 6. Security Design

| Threat | Mitigation |
|---|---|
| Secrets in static output | No secrets in `web-official`; only public `PUBLIC_APP_URL` / `PUBLIC_APP_VERSION` |
| Untrusted CMS content injected into pages | web-cms content rendered through sanitised MDX/HTML; no `set:html` of raw untrusted strings without sanitisation |
| Build-time CMS outage breaking deploy | Fail-soft fetch (§3.2.4) returns empty, renders empty state |
| Open redirect via slug | Redirect targets are a static allow-list in `astro.config.mjs`, not user input |

No auth surface — the site is public by design.

---

## 7. Traceability to Requirements

| Design Element | SRS Requirement | Notes |
|---|---|---|
| `SiteNavBar` mega menu | FR-001 | §3.2.1 |
| `SiteNavBar` mobile drawer | FR-002 | §3.2.1 |
| `FloatingCta` | FR-003 | §3.2.2 |
| `about/**`, `contact.astro`, `index.astro` | FR-004 | §3.1 |
| `SERVICE_GROUPS` + nested `getStaticPaths` | FR-005 | §4.1 |
| `astro.config.mjs` redirects | FR-006 | §5.4 |
| `lib/cms.ts` + knowledge pages | FR-007 | §3.2.4, §4.3 |
| `Layout.astro` SEO + sitemap | FR-008 | §5.3 |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-06-30 | Sathittham Sangthong | Initial design for the official-site restructure |
