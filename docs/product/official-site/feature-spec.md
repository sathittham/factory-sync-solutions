---
version: 0.1.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Draft
---

# Software Requirements Specification — Official Site Restructure

*ISO 29110 Basic Profile · SI.O1*

> Formal requirements for restructuring `apps/web-official` from a single-page landing into a
> multi-page marketing site. Design index: [README.md](./README.md). Information architecture &
> route map (source of truth): [sitemap.md](./sitemap.md). Live progress: [status.md](./status.md).
>
> **Note:** the prior version of this file documented the *current* one-page site (status: Done).
> That description is now folded into §2.1 / §2.5 as the baseline; the live site detail remains in
> git history and is superseded by the requirements below.

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Official Site Restructure (`apps/web-official`) |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-06-30 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | — |

---

## 1. Introduction

### 1.1 Purpose

Expand the public marketing site from a single-page landing (8 anchor sections + 4 flat service pages)
into a navigable multi-page site that matches the approved reference mockups: a dedicated Home, a 3-page
About section, a 4-group Services mega menu (2 hubs with 13 detail pages total), a CMS-backed Knowledge
Hub, a Contact page, and a persistent free-factory-health-check CTA. The goal is to better explain the
expanded service catalogue and drive free-health-check registrations into `web-app`.

### 1.2 Scope

**In scope:** public routing restructure, navigation shell (mega menu + mobile drawer), floating CTA,
About/Contact routed pages, nested service hubs + detail pages, Knowledge Hub (listing/category/article),
static content collection for service copy, web-cms-sourced articles, and SEO polish.

**Out of scope:** the Admin / Client Portal (maps to `web-backoffice` / `web-cms`; sitemap.md §7),
authentication, new backend endpoints, and redesign of the existing legal/cookie pages.

### 1.3 Definitions & Abbreviations

| Term | Definition |
|---|---|
| Hub page | A services group landing that lists its child detail pages (groups 2 & 4) |
| Detail page | A single service page nested under a hub |
| Mega menu | 4-column desktop dropdown for the Services nav |
| Knowledge Hub | Blog/article section (`/knowledge`), 8 categories |
| Floating CTA | Persistent on-page button linking to the free health check |
| SSG | Static Site Generation (Astro build → Cloudflare Pages) |

### 1.4 References

| Document | Link |
|---|---|
| Design index | [README.md](./README.md) |
| Information architecture & route map | [sitemap.md](./sitemap.md) |
| Status tracker | [status.md](./status.md) |
| User journeys | [user-journeys.md](./user-journeys.md) |
| Legal pages SRS | [../legal/feature-spec.md](../legal/feature-spec.md) |

---

## 2. Overall Description

### 2.1 Product Context

`web-official` is a standalone public Astro 6 + React-islands site on Cloudflare Pages, separate from the
authenticated `web-app`. It calls no backend at runtime. CTAs link to `PUBLIC_APP_URL`. The Knowledge Hub
is the one new external dependency — articles are sourced from `web-cms` (SonicJS) at build time.

### 2.2 User Classes & Characteristics

| User Class | Description | Access Level |
|---|---|---|
| Public visitor | Prospective client / factory owner browsing the marketing site | Anonymous |
| Returning lead | Visitor arriving via `?registered=1` handoff from web-app | Anonymous |

*No authenticated user classes — the site is fully public.*

### 2.3 Assumptions & Dependencies

- Reference mockups (`docs/ref/messageImage_1782292944152.jpg`, `…2974212.jpg`) are the approved target IA.
- Knowledge Hub depends on `feature/web-cms-sonicjs` exposing article data consumable at build time.
- Service copy is authored by marketing as static content (Markdown/MDX content collection).
- Existing locale (`fss-locale`) and theme (`fss-theme`) behaviour is retained unchanged.

### 2.4 Constraints

- shadcn/ui only — no native `<select>`/`<dialog>`/`window.confirm()`.
- All UI text via `useLocale()` (TH/EN); default `th`.
- Fully static SSG; no runtime backend calls from `web-official`.
- Nested slugs decided (sitemap.md §3) — `getStaticPaths` must emit nested paths.

### 2.5 Baseline (current site)

The current site is the single-page landing (`LandingContent`, 8 anchor sections) + 4 flat service detail
pages (`factory-health-check`, `production-assessment`, `efficiency-consulting`, `digital-factory`) + legal
pages. `@astrojs/sitemap` is configured; service `<title>` + `Service` JSON-LD are wired. The restructure
breaks 3 of the 4 legacy service slugs (redirects required).

---

## 3. Functional Requirements

### 3.1 Navigation (Phase 1)

#### FR-001 — Services mega menu

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Reference mockups (sitemap.md §4) |
| **Test Case** | TC-001 |

**Description:** The desktop header shall present a Services dropdown rendered as a 4-column mega menu,
one column per service group, with hubs (groups 2 & 4) linking to their hub pages and listing children.

**Acceptance Criteria:**
- Given a desktop viewport, when the visitor opens Services, then 4 columns render matching the 4 groups.
- Given the menu is open, when the visitor clicks a hub child, then they navigate to the nested detail route.
- Given keyboard navigation, when the visitor tabs through the menu, then all items are reachable and focus-visible.

#### FR-002 — Mobile navigation drawer

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | sitemap.md §4 |
| **Test Case** | TC-002 |

**Description:** On mobile, the header shall present an accordion drawer where Services expands to the 4
groups and hubs expand to their children.

**Acceptance Criteria:**
- Given a mobile viewport, when the visitor opens the drawer and taps Services, then the 4 groups expand.
- Given a hub group, when tapped, then its child detail links are revealed.

#### FR-003 — Persistent top CTA bar

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | sitemap.md §4 |
| **Test Case** | TC-003 |

**Description:** A persistent free-health-check CTA shall appear on every page as a full-width bar pinned
at the very top (above the sticky header). Its call-to-action opens the LINE official account
(`https://lin.ee/rWwdF9q`) in a new tab so a visitor can book/enquire about the free assessment.

**Acceptance Criteria:**
- Given any page, when it loads, then the top CTA bar is present with localised TH/EN label.
- Given the CTA, when clicked, then it opens the LINE official account in a new tab (`target="_blank"`, `rel="noopener"`).

### 3.2 Pages (Phase 2)

#### FR-004 — Home, Contact, About routes

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | sitemap.md §3 |
| **Test Case** | TC-004 |

**Description:** The system shall serve `/` (Home — the retained landing content), `/contact`, `/about`,
`/about/company`, `/about/team`, and `/about/case-studies` as routed pages.

**Acceptance Criteria:**
- Given each route above, when requested, then it returns 200 with localised TH/EN content.
- Given `/` , when loaded, then the existing landing sections render unchanged.

### 3.3 Services (Phase 3)

#### FR-005 — Nested service hubs & detail pages

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | sitemap.md §3 |
| **Test Case** | TC-005 |

**Description:** The system shall generate 2 hub pages (`/services/government-supported`,
`/services/engineering-design`) and 13 detail pages nested under their hubs (plus the flagship
`/services/factory-health-check` and `/services/engineering-consulting`) from a single data structure.
All 13 pages use **one uniform, content-collection-driven template** (Q5 resolved); the flagship uses the
same template with marketing-oriented copy, and its CTA deep-links into `web-app` (Q4 resolved).

**Acceptance Criteria:**
- Given each nested detail route, when requested, then it returns 200 with correct TH/EN title.
- Given a hub page, when loaded, then it lists all its child detail pages.
- Given the flagship page, when its CTA is clicked, then it deep-links to the free-check flow (`PUBLIC_APP_URL`).

#### FR-006 — Legacy slug redirects

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Baseline (§2.5) |
| **Test Case** | TC-006 |

**Description:** The 3 broken legacy service slugs shall redirect (301) to their nearest new equivalent.

**Acceptance Criteria:**
- Given `/services/production-assessment` (and the other two legacy slugs), when requested, then a 301
  redirect to the corresponding new route is returned.

### 3.4 Knowledge Hub (Phase 4)

#### FR-007 — Knowledge listing, categories, articles

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | sitemap.md §5–6 |
| **Test Case** | TC-007 |

**Description:** The system shall serve `/knowledge` (article listing), `/knowledge/category/[category]`
for the 8 categories, and `/knowledge/[slug]` article pages sourced from web-cms at build.

**Acceptance Criteria:**
- Given each of the 8 category slugs, when requested, then the category page returns 200.
- Given an article slug, when requested, then the article renders content fetched from web-cms.
- Given web-cms is unreachable at build, when the site builds, then it fails gracefully (documented behaviour).

### 3.5 SEO (Phase 5)

#### FR-008 — Per-page metadata & sitemap

| Field | Value |
|---|---|
| **Priority** | Should Have |
| **Source** | README §SEO |
| **Test Case** | TC-008 |

**Description:** Each page shall emit a unique `<title>`, meta description, Open Graph tags, and valid
JSON-LD (`Organization` + `Service` where applicable); `sitemap.xml` shall include every new route.

**Acceptance Criteria:**
- Given any page, when rendered, then its `<title>` and OG tags are unique and its JSON-LD validates.
- Given a production build, when complete, then `sitemap.xml` lists all new routes.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Frontend initial load ≤ 2s on 4G; fully static assets.

### 4.2 Security
- [ ] No authentication, no secrets in source; CTAs use public `PUBLIC_APP_URL` only.

### 4.3 Usability
- [ ] Bilingual (TH/EN) — all strings via `useLocale()`; default `th`.
- [ ] Responsive, mobile-first, ≥320px.
- [ ] Accessible — WCAG 2.1 AA contrast; keyboard-navigable mega menu + drawer.

### 4.4 Reliability
- [ ] A Knowledge Hub article-source failure at build does not break the rest of the site build.

### 4.5 Maintainability
- [ ] Service copy in a single static content collection; service detail pages from one data structure.
- [ ] No nested ternaries; no dead code; no hardcoded UI strings.

---

## 5. Interface Requirements

### 5.1 API Endpoints

None on `web-official` (static). Knowledge Hub consumes web-cms article data at build time only.

### 5.2 UI Screens / Routes

Full route map in [sitemap.md §3](./sitemap.md#3-public-route-map-web-official). Summary:

| Route | Type | Description |
|---|---|---|
| `/` | Page | Home (retained landing) |
| `/about`, `/about/{company,team,case-studies}` | Page | About section |
| `/services/factory-health-check` | Page ★ | Flagship free health check |
| `/services/government-supported` (+5 children) | Hub + Detail | Gov-supported group |
| `/services/engineering-consulting` | Page | Consulting overview |
| `/services/engineering-design` (+8 children) | Hub + Detail | Design & sign-off group |
| `/knowledge`, `/knowledge/category/[category]`, `/knowledge/[slug]` | Hub/List/Detail | Knowledge Hub |
| `/contact` | Page | Contact |
| `/terms` `/privacy` `/cookies` `/marketing` `/cookie-settings` | Page | Legal (unchanged) |

### 5.3 External Interfaces
- `web-cms` (SonicJS) — Knowledge Hub article data, consumed at build.
- `web-app` (`PUBLIC_APP_URL`) — CTA target; `?registered=1` handoff (existing).

---

## 6. Data Requirements

### 6.1 Content Sources

| Source | Shape | Notes |
|---|---|---|
| `src/content/services/` | Astro content collection (MDX) | 13 service detail entries; locale-keyed copy |
| web-cms (SonicJS) | Article list + body | 8 categories; fetched at build |

### 6.2 Data Validation Rules
- Service content entries validated by an Astro content-collection schema (slug, group, title TH/EN, body).
- Category slugs constrained to the 8 in [sitemap.md §5](./sitemap.md#5-knowledge-hub-categories).

---

## 7. Traceability Matrix

| Requirement | Design Reference | Test Case | Status |
|---|---|---|---|
| FR-001 | README §Build Sequence P1; mockups/official.md | TC-001 | Not Started |
| FR-002 | README §Build Sequence P1 | TC-002 | Not Started |
| FR-003 | README §Build Sequence P1 | TC-003 | Not Started |
| FR-004 | README §Build Sequence P2 | TC-004 | Not Started |
| FR-005 | README §Build Sequence P3; sitemap.md §3 | TC-005 | Not Started |
| FR-006 | README §Build Sequence P3 | TC-006 | Not Started |
| FR-007 | README §Build Sequence P4; sitemap.md §6 | TC-007 | Not Started |
| FR-008 | README §SEO; Build Sequence P5 | TC-008 | Not Started |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | 2026-06-30 | Sathittham Sangthong | Initial restructure SRS (supersedes the current-site spec, now baseline §2.5) |

---

*Version: 0.1.0*
*Last updated: 4 July 2026*
