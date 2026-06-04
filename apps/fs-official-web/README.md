# FactorySync Solutions — Official Web

Static marketing website for the FactorySync Solutions platform. Hosts the public landing page, legal pages (privacy policy, terms of service, cookie policy), and links to the assessment app.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 (static site generation) |
| React | React 19 (islands architecture) |
| Styling | Tailwind CSS 3 + shadcn/ui primitives |
| Animation | Motion |
| i18n | Custom context (Thai / English) |
| Linting | Biome |
| Testing | Vitest |

## Project Structure

```
apps/fs-official-web/
└── src/
    ├── components/
    │   ├── ui/                  # Shared UI primitives (Button, etc.)
    │   ├── landing/
    │   │   └── LandingContent.tsx  # Hero + CTA section (React island)
    │   ├── legal/
    │   │   └── LegalContent.tsx    # Legal page content component
    │   └── motion.tsx           # Motion animation wrapper
    ├── layouts/
    │   └── Layout.astro         # Base HTML layout
    ├── lib/
    │   ├── i18n.tsx             # Locale provider (TH/EN)
    │   └── utils.ts             # cn() merge helper
    ├── pages/
    │   ├── index.astro          # Landing / homepage
    │   ├── marketing.astro      # Marketing page
    │   ├── cookies.astro        # Cookie policy
    │   ├── cookie-settings.astro  # Cookie preference management
    │   ├── privacy.astro        # Privacy policy
    │   └── terms.astro          # Terms of service
    ├── styles/
    │   └── globals.css          # Global Tailwind + custom styles
    └── env.d.ts                 # Astro environment types
```

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

### Development

```bash
npm run dev
```

Opens at [http://localhost:4321](http://localhost:4321).

### Build

```bash
npm run build
```

Output goes to `dist/`. This is a fully static site — no server required.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Astro dev server |
| `npm run build` | Static site generation |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |

## Routes

| Path | Page | Purpose |
|---|---|---|
| `/` | `index.astro` | Landing / homepage with app CTA |
| `/marketing` | `marketing.astro` | Extended marketing content |
| `/cookies` | `cookies.astro` | Cookie policy |
| `/cookie-settings` | `cookie-settings.astro` | Cookie preference management |
| `/privacy` | `privacy.astro` | Privacy policy |
| `/terms` | `terms.astro` | Terms of service |

## Architecture Notes

**Astro islands** — pages are static HTML by default. React components that need interactivity are loaded with `client:load`. This keeps the site fast while allowing dynamic UI where needed.

**i18n** — Thai and English are supported via the same `LocaleProvider` React context used in `fs-app-web`. Locale is stored in `localStorage`.
