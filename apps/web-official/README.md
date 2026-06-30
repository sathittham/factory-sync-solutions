<div align="center">

<img src="../../packages/shared/brand/fs-light.png#gh-light-mode-only" alt="FactorySync Solutions logo" width="110" />
<img src="../../packages/shared/brand/fs-dark.png#gh-dark-mode-only" alt="FactorySync Solutions logo" width="110" />

# FactorySync Solutions — Official Site

**The public marketing site.** `@repo/web-official`

Static Astro site hosting the landing page, service detail pages, legal pages (privacy, terms,
cookie policy), and the sign-up handoff into the assessment app. React islands add interactivity
where needed.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Astro](https://img.shields.io/badge/Astro-6-FF5D01?logo=astro&logoColor=white)
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
| Framework | Astro 6 (static output) |
| React | React 19 (islands architecture) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + shadcn/ui primitives |
| Animation | Motion |
| Icons | Lucide + Radix icons |
| i18n | Custom React context (Thai / English) |
| Linting | Biome |
| Testing | Vitest + Testing Library |
| Deploy | Cloudflare Pages (Wrangler) |

Tailwind 4 is configured CSS-first in [src/styles/globals.css](src/styles/globals.css) (`@import "tailwindcss"` + `@theme`) — there is no `tailwind.config.ts`.

## Project Structure

```
apps/web-official/
├── public/                     # favicons + site.webmanifest (synced from packages/shared)
└── src/
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives
    │   ├── landing/
    │   │   └── LandingContent.tsx  # Hero + CTA landing island
    │   ├── services/
    │   │   └── ServiceContent.tsx  # Service detail island + SERVICE_ORDER/slugs
    │   ├── legal/
    │   │   └── LegalContent.tsx    # Legal page content island
    │   ├── site/
    │   │   └── chrome.tsx          # Shared NavBar/footer + theme switcher
    │   └── motion.tsx              # Motion animation wrapper
    ├── layouts/
    │   └── Layout.astro            # Base HTML layout
    ├── lib/
    │   ├── i18n.tsx                # Locale provider (TH/EN)
    │   └── utils.ts                # cn() merge helper
    ├── pages/
    │   ├── index.astro             # Landing / homepage
    │   ├── marketing.astro         # Marketing page
    │   ├── services/[slug].astro   # Dynamic service detail pages
    │   ├── cookies.astro           # Cookie policy
    │   ├── cookie-settings.astro   # Cookie preference management
    │   ├── privacy.astro           # Privacy policy
    │   └── terms.astro             # Terms of service
    ├── styles/
    │   └── globals.css             # Tailwind 4 import + @theme tokens
    ├── test/
    │   └── setup.ts                # Vitest setup (jest-dom)
    └── env.d.ts                    # Astro environment types
```

The `@shared` alias resolves to `packages/shared` (brand logos, shared scripts) — see [astro.config.mjs](astro.config.mjs).

## Getting Started

### Prerequisites

- Node.js 20+
- npm (comes with Node)

### Install

```bash
npm install
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
| `PUBLIC_GTM_ID` | Optional Google Tag Manager container ID |
| `PUBLIC_API_BASE_URL` | Backend API base URL used by registration handoff tests |
| `PUBLIC_CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key for embedded registration |
| `PUBLIC_FIREBASE_API_KEY` | Firebase public API key for embedded registration |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

Per-environment files `.env.staging` and `.env.production` ship with the repo and are picked up by `astro build --mode <env>`.

### Development

```bash
npm run dev
```

Opens at [http://localhost:4321](http://localhost:4321). `dev` first runs `sync:favicon` to copy favicons from `packages/shared` into `public/`.

### Build

```bash
npm run build
```

Output goes to `dist/`. This is a fully static site — no server required.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Sync favicons, then start the Astro dev server |
| `npm run build` | Sync favicons, then run static site generation |
| `npm run build:staging` | Static build with the `staging` env mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run test:e2e:install` | Install Playwright browsers |
| `npm run deploy:staging` | Build (staging) and deploy to Cloudflare Pages (`...-official-staging`) |
| `npm run deploy:prod` | Build and deploy to Cloudflare Pages (`...-official`) |

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `index.astro` | Landing / homepage with app CTA |
| `/marketing` | `marketing.astro` | Extended marketing content |
| `/services/:slug` | `services/[slug].astro` | Service detail pages (see slugs below) |
| `/cookies` | `cookies.astro` | Cookie policy |
| `/cookie-settings` | `cookie-settings.astro` | Cookie preference management |
| `/privacy` | `privacy.astro` | Privacy policy |
| `/terms` | `terms.astro` | Terms of service |

### Service slugs

Generated at build time via `getStaticPaths()` from `SERVICE_ORDER` in [ServiceContent.tsx](src/components/services/ServiceContent.tsx):

- `/services/factory-health-check`
- `/services/production-assessment`
- `/services/efficiency-consulting`
- `/services/digital-factory`

## Architecture Notes

**Astro islands** — pages are static HTML by default. React components that need interactivity (`LandingContent`, `ServiceContent`, `LegalContent`, site `chrome`) are loaded with `client:load`. This keeps the site fast while allowing dynamic UI where needed.

**i18n** — Thai and English are supported via the same `LocaleProvider` React context pattern used in `web-app`. Locale is stored in `localStorage`.

**Theming** — light/dark/system theme is handled in [chrome.tsx](src/components/site/chrome.tsx) and persisted client-side; Tailwind dark mode uses the `.dark` class variant.

## Deployment

Deployed to **Cloudflare Pages** via Wrangler. Staging and production are separate Pages projects:

| Env | Command | Pages project | Branch |
|---|---|---|---|
| Staging | `npm run deploy:staging` | `factory-sync-solutions-official-staging` | `staging` |
| Production | `npm run deploy:prod` | `factory-sync-solutions-official` | `main` |

Always verify on staging before deploying to production. Releases are typically driven by git tags through GitHub Actions (`v*-staging` -> staging, `v*.*.*` -> production) — see [release-flow.md](../../docs/operations/release-flow.md).
