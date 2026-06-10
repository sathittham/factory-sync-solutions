# FactorySync Solutions — Official Web

Static marketing website for the FactorySync Solutions platform. Hosts the public landing page, service detail pages, legal pages (privacy policy, terms of service, cookie policy), and links to the assessment app.

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
apps/fs-official-web/
├── public/                     # favicons + site.webmanifest (synced from packages/shared)
└── src/
    ├── components/
    │   ├── ui/
    │   │   └── button.tsx          # shadcn/ui button primitive
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

- Node.js 18+
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

**i18n** — Thai and English are supported via the same `LocaleProvider` React context pattern used in `fs-app-web`. Locale is stored in `localStorage`.

**Theming** — light/dark/system theme is handled in [chrome.tsx](src/components/site/chrome.tsx) and persisted client-side; Tailwind dark mode uses the `.dark` class variant.

## Deployment

Deployed to **Cloudflare Pages** via Wrangler. Staging and production are separate Pages projects:

| Env | Command | Pages project | Branch |
|---|---|---|---|
| Staging | `npm run deploy:staging` | `factory-sync-solutions-official-staging` | `staging` |
| Production | `npm run deploy:prod` | `factory-sync-solutions-official` | `main` |

Always verify on staging before deploying to production. Releases are typically driven by git tags through GitHub Actions (`v*-staging` → staging, `v*.*.*` → production) — see the repo root [git rules](../../.claude/rules/git.md).
