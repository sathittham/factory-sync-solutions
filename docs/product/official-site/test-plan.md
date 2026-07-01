---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-01
---

# Test Plan — Official Marketing Site (`web-official`)

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Public marketing site — `apps/web-official` (Astro 6 + React islands) |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Author** | Sathittham (Phoo) |
| **Date** | 2026-07-01 |
| **SRS Reference** | [docs/product/official-site/feature-spec.md](../official-site/feature-spec.md) |
| **SDD Reference** | [docs/product/official-site/sitemap.md](../official-site/sitemap.md) |

---

## 1. Test Scope

### 1.1 In Scope
- **Unit tests** (Vitest + jsdom + Testing Library): `apps/web-official/src/**/*.test.{ts,tsx}`
  - Page-level React islands: `LandingContent`, `LegalContent`, `ServiceContent`, `AboutContent`, `ContactContent`, `KnowledgeContent`
  - Navigation chrome: `SiteNavBar` (mega menu, settings menu, mobile drawer)
  - UI primitives: `Card`, `Input`, `Select`
  - Library modules: `i18n`, `cms`, `lexical`, `consent`, `theme`, `services`, `knowledge`, `date`, `appLinks`
- **End-to-end tests** (Playwright): `apps/web-official/e2e/*.spec.ts`
  - Landing page rendering + locale switching
  - Cross-route navigation and HTTP status
  - Site-wide route smoke (every route family serves 200 with chrome)

### 1.2 Out of Scope
- Backend API, Firestore, Firebase Auth — this app has no server layer (registration lives in `web-app`).
- Third-party SDK internals (Firebase, Cloudflare Turnstile widget).
- Cloudflare Pages CDN routing and edge caching.
- CMS content authoring (validated in `web-cms`); only the rendered output is checked here.
- Visual-regression and automated accessibility (axe) checks — not yet adopted (see §6).

### 1.3 Test Environment
| Environment | Details |
|---|---|
| Unit | `pnpm --filter @repo/web-official test` (Vitest + jsdom). Global `matchMedia` stub in `src/test/setup.ts`. |
| Coverage | `pnpm --filter @repo/web-official test:coverage` (v8, `all: true` over `src/**`). |
| E2E (local) | `pnpm --filter @repo/web-official test:e2e` — auto-starts a local Astro dev server. |
| E2E (staging) | `PLAYWRIGHT_BASE_URL=https://staging.factorysyncsolutions.com playwright test` — no local server; runs in CI after the staging deploy. |
| Browsers | Local: chromium, firefox, webkit, mobile-chrome. CI post-deploy gate: chromium + mobile-chrome. |

---

## 2. Unit Test Cases (SI.O4)

Frontend unit tests verify React islands and library modules in isolation (jsdom).

### 2.1 Page & Navigation Components — `*.test.tsx`

| ID | Test Name | Component | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-F01 | Renders every landing section anchor | `LandingContent` | — | Mount | `#hero`, `#dimensions`, `#expert`, `#services`, `#results`, `#process`, `#contact` all present | ✅ |
| UT-F02 | Primary CTA points at the app register URL | `LandingContent` | — | Mount | ≥1 anchor `href` starts with the app URL | ✅ |
| UT-F03 | Renders Thai nav labels by default | `LandingContent` | No stored locale | Mount | "หน้าแรก" visible | ✅ |
| UT-F04 | Renders each legal page title + full sidebar | `LegalContent` | page ∈ {terms, privacy, cookies, marketing, cookie-settings} | Mount | Title shown; sidebar links to all 5 pages; active page `aria-current="page"` | ✅ |
| UT-F05 | Card renders all sub-components + className | `Card` | — | Mount | Header/Title/Description/Content/Footer render; class forwarded | ✅ |
| UT-F06 | Input forwards type + value | `Input` | — | Mount | `type`/`value` reflected | ✅ |
| UT-F07 | Select shows placeholder when closed | `Select` | — | Mount | Placeholder visible | ✅ |
| UT-F08 | Opens Services mega menu → nested routes | `SiteNavBar` | — | Click "บริการของเรา" | Child links resolve to `/services/...` routes | ✅ |
| UT-F09 | Opens About dropdown with section links | `SiteNavBar` | — | Click "เกี่ยวกับเรา" | "/about/company" link present | ✅ |
| UT-F10 | Closes an open menu on Escape | `SiteNavBar` | Menu open | `keydown Escape` | Menu closes | ✅ |
| UT-F11 | Settings menu exposes locale + theme radiogroups | `SiteNavBar` | — | Click "การตั้งค่า" | Both radiogroups + ≥5 `menuitemradio` visible | ✅ |
| UT-F12 | Selecting dark theme closes settings menu | `SiteNavBar` | Settings open | Click "มืด" | Menu closes | ✅ |
| UT-F13 | Selecting a locale closes settings menu | `SiteNavBar` | Settings open | Click "English" | Menu closes | ✅ |
| UT-F14 | Toggles mobile drawer + expands About accordion | `SiteNavBar` | — | Click hamburger → About | Drawer + nested `/about/company` link visible | ✅ |
| UT-F15 | Service hub / flagship / draft detail rendering | `ServiceContent` | Various group/child slugs | Mount | Correct copy, CTA target, breadcrumb, draft banner | ✅ |

*`AboutContent`, `ContactContent`, `KnowledgeContent`, and the `lib/*` modules carry their own colocated tests (see coverage report).*

### 2.2 Shared Test Fixtures
- `src/test/setup.ts` — imports `@testing-library/jest-dom` and installs a default `window.matchMedia` stub (`matches: false`). Tests needing specific media behaviour (`theme.test.ts`) override it locally.

---

## 3. Integration / End-to-End Test Cases (SI.O5)

No backend integration layer exists. End-to-end coverage is via Playwright against a running site (local dev server or the deployed staging URL).

### 3.1 End-to-End (Playwright) — `e2e/*.spec.ts`

| ID | Scenario | Spec | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-001 | Landing sections render | `landing.spec.ts` | Load `/` | `#hero`, `#expert`, `#services`, `#dimensions`, `#results`, `#process`, `#contact`, footer visible | ✅ |
| E2E-002 | Page title + sign-in link | `landing.spec.ts` | Load `/` | Title matches `/FactorySync/i`; header sign-in href is absolute (desktop) | ✅ |
| E2E-003 | Locale defaults to Thai | `landing.spec.ts` | Clear locale → load `/` | Thai hero copy visible | ✅ |
| E2E-004 | Locale switch to English | `landing.spec.ts` | Settings menu → English | English hero heading visible (desktop only) | ✅ |
| E2E-005 | Landing / knowledge return 200 | `navigation.spec.ts` | `goto` each | HTTP 200 | ✅ |
| E2E-006 | Unknown route returns 404 | `navigation.spec.ts` | `goto /not-a-page` | HTTP 404 | ✅ |
| E2E-007 | Header visible + logo returns home | `navigation.spec.ts` | Load, click logo | Navigates to `/` | ✅ |
| E2E-008 | Every route serves 200 + header + footer | `smoke.spec.ts` | `goto` each static + service route | 200 with chrome (12 static + 4 service) | ✅ |
| E2E-009 | Knowledge dynamic routes load | `smoke.spec.ts` | Derive article/category/tag from hub | Each 200 with chrome; skips if unseeded | ✅ |

**Deliberately not automated** (documented gaps, §6): contact-form submission + Turnstile, cookie-consent accept/reject flow, theme-toggle persistence across reloads, and content-depth assertions on services/knowledge detail bodies.

---

## 4. Coverage Targets

| Component | Target | Tool |
|---|---|---|
| `src/**` statements | ≥ 70% | Vitest v8 |
| `src/**` lines | ≥ 70% | Vitest v8 |
| `src/**` functions | ≥ 70% | Vitest v8 |
| `src/**` branches | ≥ 70% | Vitest v8 |
| E2E route smoke | 100% of route families | Playwright |

Run: `pnpm --filter @repo/web-official test:coverage`

---

## 5. Test Results

| Run Date | Environment | Unit (Vitest) | Coverage (stmt/branch/func/line) | E2E (Playwright) | Result |
|---|---|---|---|---|---|
| 2026-07-01 | Local | 133 passed / 20 files | 79.3% / 67.1% / 76.3% / 81.4%¹ | — | Baseline |
| 2026-07-01 | Local | 133 passed | **83.5% / 70.1% / 81.7% / 85.5%**² | 68 passed / 2 skipped (chromium + mobile-chrome) | ✅ Pass |

¹ Before removing dead code. ² After deleting unused `landing/NavBar.tsx` and duplicate `chrome` switchers. All four metrics ≥ 70%.

---

## 6. Known Gaps & Follow-ups

| Gap | Priority | Note |
|---|---|---|
| Contact form + Turnstile submission | Medium | Interactive flow; needs Turnstile test keys / mock |
| Cookie-consent accept/reject flow | Medium | Client island; state persisted in `localStorage` |
| Theme-toggle persistence across reloads | Low | Covered partially by `theme.test.ts` unit tests |
| Content-depth assertions (services/knowledge detail bodies) | Low | Smoke checks load only, not rendered content |
| Accessibility (axe) + visual regression | Low | Not yet adopted repo-wide |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-01 | Sathittham (Phoo) | Initial test plan — documents web-official unit + e2e suites, coverage results, and known gaps |
