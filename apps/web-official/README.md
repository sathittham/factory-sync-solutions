<div align="center">

<img src="../../packages/shared/brand/fs-light.png#gh-light-mode-only" alt="FactorySync Solutions logo" width="110" />
<img src="../../packages/shared/brand/fs-dark.png#gh-dark-mode-only" alt="FactorySync Solutions logo" width="110" />

# FactorySync Solutions — Official Site

**The public marketing site.** `@repo/web-official`

Static Astro site hosting the landing page, the nested Services taxonomy, About/Contact pages,
a CMS-backed Knowledge Hub, legal pages (privacy, terms, cookie policy), and the sign-up handoff
into the assessment app. React islands add interactivity where needed.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Astro](https://img.shields.io/badge/Astro-7-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)

[← Monorepo root](../../README.md) · [Tech Stack](#tech-stack) · [Structure](#project-structure) · [Scripts](#scripts) · [Routes](#routes) · [Deployment](#deployment)

</div>

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Astro 7 (static output) |
| React | React 19 (islands architecture, `@astrojs/react`) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + shadcn/ui primitives |
| Animation | Motion |
| Icons | Lucide + Radix icons |
| Forms | React Hook Form + Zod (registration handoff) |
| Auth / bot check | Firebase (public config) + Cloudflare Turnstile |
| CMS | Knowledge Hub content fetched at build time from `@repo/web-cms` |
| i18n | Custom React context (Thai / English) |
| Sitemap | `@astrojs/sitemap` |
| Linting | Biome |
| Testing | Vitest + Testing Library, Playwright (E2E) |
| Deploy | Cloudflare Pages (Wrangler) |

Tailwind 4 is configured CSS-first in [src/styles/globals.css](src/styles/globals.css) (`@import "tailwindcss"` + `@theme`) — there is no `tailwind.config.ts`.

## Project Structure

```
apps/web-official/
├── public/                        # favicons + site.webmanifest (synced from packages/shared)
└── src/
    ├── components/
    │   ├── ui/                        # shadcn/ui primitives (button, card, input, select)
    │   ├── site/
    │   │   ├── SiteShell.tsx          # Shared page shell (nav + footer chrome)
    │   │   ├── PageHero.tsx           # Reusable page hero header
    │   │   └── chrome.tsx             # NavBar/footer + theme switcher internals
    │   ├── landing/
    │   │   ├── LandingContent.tsx     # Homepage island
    │   │   └── sections/              # Hero, TrustBar, Services, Dimensions, Process,
    │   │       └── ...                #   Results, Expert, BottomCta sections
    │   ├── services/
    │   │   └── ServiceContent.tsx     # Service group/detail island
    │   ├── knowledge/
    │   │   └── KnowledgeContent.tsx   # Knowledge Hub list/article island
    │   ├── about/
    │   │   └── AboutContent.tsx       # About pages island
    │   ├── contact/
    │   │   └── ContactContent.tsx     # Contact page island
    │   ├── legal/
    │   │   └── LegalContent.tsx       # Legal page content island
    │   ├── AppHandoff.tsx             # Registration → assessment app handoff
    │   ├── SiteNavBar.tsx             # Top navigation bar
    │   ├── TopCtaBar.tsx              # Sticky top CTA banner
    │   ├── CookieConsent.tsx          # Cookie consent banner
    │   ├── Turnstile.tsx              # Cloudflare Turnstile widget
    │   └── motion.tsx                 # Motion animation wrapper
    ├── layouts/
    │   └── Layout.astro               # Base HTML layout
    ├── lib/
    │   ├── i18n.tsx                   # Locale provider (TH/EN)
    │   ├── services.ts                # Service taxonomy (single source of truth)
    │   ├── serviceContent.ts          # Per-service copy/content
    │   ├── knowledge.ts               # Knowledge Hub data helpers
    │   ├── cms.ts                     # web-cms (SonicJS) fetch client
    │   ├── lexical.ts                 # Lexical rich-text → HTML renderer
    │   ├── categoryColors.ts          # Knowledge category color map
    │   ├── appLinks.ts                # Assessment-app URL builders
    │   ├── consent.ts                 # Cookie consent state
    │   ├── theme.ts                   # light/dark/system theme helpers
    │   ├── firebase.ts                # Firebase client init
    │   ├── date.ts                    # date formatting
    │   └── utils.ts                   # cn() merge helper
    ├── pages/                         # see Routes below
    ├── styles/
    │   └── globals.css                # Tailwind 4 import + @theme tokens
    ├── test/
    │   └── setup.ts                   # Vitest setup (jest-dom)
    └── env.d.ts                       # Astro environment types
```

Path aliases resolve in [astro.config.mjs](astro.config.mjs): `@` → `src`, `@shared` → `packages/shared` (brand logos, shared scripts).

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (workspace package manager — run `pnpm install` from the monorepo root)

### Install

From the monorepo root (installs all workspace apps at once):

```bash
pnpm install
```

### Environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PUBLIC_APP_URL` | URL of the assessment app (e.g. `https://app.factorysyncsolutions.com`) |
| `PUBLIC_APP_VERSION` | Version string displayed on the site (e.g. `v1.0.0`) |
| `PUBLIC_GTM_ID` | Optional Google Tag Manager container ID (production only) |
| `PUBLIC_API_BASE_URL` | Backend API base URL for the registration handoff |
| `PUBLIC_CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key for embedded registration |
| `PUBLIC_CMS_URL` | web-cms public read API base URL; fetched at **build** time for the Knowledge Hub (leave empty to build with an empty Knowledge Hub) |
| `PUBLIC_FIREBASE_API_KEY` | Firebase public API key for embedded registration |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

Per-environment files `.env.staging` and `.env.production` ship with the repo and are picked up by `astro build --mode <env>`.

### Development

```bash
pnpm dev            # from this directory
# or, from the monorepo root:
pnpm dev:official
```

Opens at [http://localhost:4321](http://localhost:4321). `dev` first runs `sync:favicon` to copy favicons from `packages/shared` into `public/`.

### Build

```bash
pnpm build
```

Output goes to `dist/`. This is a fully static site — no server required. The Knowledge Hub is fetched from `PUBLIC_CMS_URL` at build time.

## Scripts

Run with `pnpm <script>` from this directory (or `pnpm --filter @repo/web-official <script>` from anywhere).

| Command | Description |
|---|---|
| `dev` | Sync favicons, then start the Astro dev server |
| `build` | Sync favicons, then run static site generation |
| `build:staging` | Static build with the `staging` env mode |
| `preview` | Preview the production build locally |
| `lint` | Lint with Biome |
| `lint:fix` | Auto-fix lint issues |
| `test` | Run unit tests (Vitest) |
| `test:watch` | Run tests in watch mode |
| `test:coverage` | Run tests with coverage |
| `test:e2e` | Run E2E tests (Playwright) |
| `test:e2e:ui` | Run E2E tests with Playwright UI |
| `test:e2e:install` | Install Playwright browsers |
| `deploy:staging` | Build (staging) and deploy to Cloudflare Pages (`...-official-staging`) |
| `deploy:prod` | Build and deploy to Cloudflare Pages (`...-official`) |

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `index.astro` | Landing / homepage with app CTA |
| `/marketing` | `marketing.astro` | Extended marketing content |
| `/about` | `about/index.astro` | About overview |
| `/about/company` | `about/company.astro` | Company profile |
| `/about/team` | `about/team.astro` | Team |
| `/about/case-studies` | `about/case-studies.astro` | Case studies |
| `/contact` | `contact.astro` | Contact page |
| `/services/:group` | `services/[group].astro` | Service group landing / hub (see below) |
| `/services/:group/:slug` | `services/[group]/[slug].astro` | Nested service detail page |
| `/knowledge` | `knowledge/index.astro` | Knowledge Hub index |
| `/knowledge/:slug` | `knowledge/[slug].astro` | Knowledge article |
| `/knowledge/category/:category` | `knowledge/category/[category].astro` | Articles by category |
| `/knowledge/tag/:tag` | `knowledge/tag/[tag].astro` | Articles by tag |
| `/cookies` | `cookies.astro` | Cookie policy |
| `/cookie-settings` | `cookie-settings.astro` | Cookie preference management |
| `/privacy` | `privacy.astro` | Privacy policy |
| `/terms` | `terms.astro` | Terms of service |

### Service taxonomy

Service routes are generated at build time via `getStaticPaths()` from `SERVICE_GROUPS` in [src/lib/services.ts](src/lib/services.ts) — the single source of truth for the mega menu and the nested hub/detail pages. Groups are either a single `page` or a `hub` that lists child detail pages:

- **`/services/factory-health-check`** — flagship free health check (page)
- **`/services/government-supported`** — hub → `digital-factory-layout-360`, `smart-preventive-maintenance`, `shindan-lean-kaizen`, `online-marketing-smart-ops`, `in-house-training`
- **`/services/engineering-consulting`** — page
- **`/services/engineering-design`** — hub → `factory-license`, `machine-automation-design`, `engineering-consulting`, `construction-permits`, `special-systems`, `environmental-systems`, `machine-registration`, `certifications`

Legacy flat service slugs redirect to the nested taxonomy (configured in [astro.config.mjs](astro.config.mjs)):

| Legacy path | Redirects to |
|---|---|
| `/services/production-assessment` | `/services/government-supported/shindan-lean-kaizen` |
| `/services/efficiency-consulting` | `/services/engineering-consulting` |
| `/services/digital-factory` | `/services/government-supported/digital-factory-layout-360` |

## Architecture Notes

**Astro islands** — pages are static HTML by default. React components that need interactivity (`LandingContent`, `ServiceContent`, `KnowledgeContent`, `AboutContent`, `ContactContent`, `LegalContent`, and the shared `SiteShell`/`PageHero` chrome) are loaded with `client:load`. This keeps the site fast while allowing dynamic UI where needed.

**Shared shell** — content pages compose the same `SiteShell` (nav + footer) and `PageHero` header so every page shares chrome and layout.

**Knowledge Hub** — articles are authored in `@repo/web-cms` (SonicJS on Cloudflare D1) and fetched from `PUBLIC_CMS_URL` at **build time** via [src/lib/cms.ts](src/lib/cms.ts); Lexical rich text is rendered to HTML by [src/lib/lexical.ts](src/lib/lexical.ts). With `PUBLIC_CMS_URL` unset the build still succeeds and the hub renders an empty state.

**Registration handoff** — the embedded sign-up form (React Hook Form + Zod, guarded by Cloudflare Turnstile and Firebase) posts to `PUBLIC_API_BASE_URL` and hands off into the assessment app via [src/components/AppHandoff.tsx](src/components/AppHandoff.tsx).

**i18n** — Thai and English are supported via the same `LocaleProvider` React context pattern used in `web-app`. Locale is stored in `localStorage`.

**Theming** — light/dark/system theme is handled in [src/lib/theme.ts](src/lib/theme.ts) / [chrome.tsx](src/components/site/chrome.tsx) and persisted client-side; Tailwind dark mode uses the `.dark` class variant.

## Deployment

Deployed to **Cloudflare Pages** via Wrangler. Staging and production are separate Pages projects, each fronted by a custom domain:

| Env | Command | Pages project | Custom domain | Branch |
|---|---|---|---|---|
| Staging | `pnpm deploy:staging` | `factory-sync-solutions-official-staging` | `staging.factorysyncsolutions.com` | `staging` |
| Production | `pnpm deploy:prod` | `factory-sync-solutions-official` | `www.factorysyncsolutions.com` | `main` |

The canonical production URL is `https://www.factorysyncsolutions.com` (set as Astro's `site` in [astro.config.mjs](astro.config.mjs), used for sitemap and absolute URLs).

Always verify on staging before deploying to production. Releases are typically driven by git tags through GitHub Actions (`v*-staging` → staging, `v*.*.*` → production) — see [release-flow.md](../../docs/operations/release-flow.md).

---

<div align="center">
<sub>Doc version 1.0.0 · Last updated 2026-07-01 15:10 (+07)</sub>
</div>
