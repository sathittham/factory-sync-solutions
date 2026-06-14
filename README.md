---
version: 1.5.0
lastUpdated: 2026-06-09
author: Sathittham Sangthong
---

# FactorySync Solutions

A Makefile-managed monorepo containing a React SPA app, an Astro public marketing site, and a Go backend API for evaluating factory operational maturity through a guided assessment. Users register, answer a series of questions, and receive a diagnosis with a spider chart visualization, key strengths/weaknesses, and an email copy of their results.

## Prerequisites

- Node.js >= 20
- npm >= 10
- Go >= 1.26.4 (backend API)
- Make (included on macOS/Linux)

## Monorepo Structure

```
factory-health-check/
├── apps/
│   ├── fs-app-web/         # React + Vite SPA (authenticated app)
│   ├── fs-official-web/    # Astro 6 + React islands (public marketing site)
│   └── fs-backend/         # Go Cloud Run service (backend API)
├── packages/               # Shared scripts/assets
├── Makefile                # Monorepo task runner
├── package.json            # Root workspace config
└── docs/                   # Project documentation
```

## Quick Start

```bash
# Install app (fs-app-web) dependencies
# Note: fs-official-web deps are installed separately — `cd apps/fs-official-web && npm install`
make install

# Start all apps in dev mode (API + Web in parallel)
make dev

# Start only frontend
make dev-web

# Start only backend
make dev-api
```

## Environment Variables

Copy `.env.example` files and fill in values:

```bash
cp apps/fs-app-web/.env.example apps/fs-app-web/.env
cp apps/fs-official-web/.env.example apps/fs-official-web/.env
cp apps/fs-backend/.env.example apps/fs-backend/.env.development
```

### Frontend (`apps/fs-app-web/.env`)

```bash
# Firebase (public config — get from Firebase Console > Project Settings)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# API base URL (empty = use Vite proxy in dev)
VITE_API_BASE_URL=

# Cloudflare Turnstile (public site key)
VITE_CF_TURNSTILE_SITE_KEY=

# Google Tag Manager (container ID, e.g. GTM-XXXXXXX)
VITE_GTM_ID=

# Google Analytics 4 (measurement ID, e.g. G-XXXXXXXXXX)
VITE_GA_MEASUREMENT_ID=
```

### Public Site (`apps/fs-official-web/.env`)

```bash
# URL of the authenticated app (sign-in / CTA links point here)
PUBLIC_APP_URL=https://app.factorysyncsolutions.com

# Build version shown in the site footer
PUBLIC_APP_VERSION=v0.0.0
```

### Backend (`apps/fs-backend/.env.development`)

```bash
GCP_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=   # path to service account JSON
PORT=8080
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173
RESEND_API_KEY=
CF_TURNSTILE_SECRET=              # Cloudflare Turnstile server-side secret
SLACK_WEBHOOK_REGISTRATION=       # Slack webhook for new registrations
SLACK_WEBHOOK_QUIZ_RESULT=        # Slack webhook for quiz results
```

Backend secrets are stored in `.env` locally and injected via GitHub Secrets in CI/CD. Never expose to the frontend.

## Available Scripts

Root-level commands run across all packages via Makefile:

| Command | Description |
|---------|-------------|
| `make dev` | Start all apps in dev mode |
| `make build` | Build all apps |
| `make lint` | Lint all packages (Biome + go vet) |
| `make test` | Run all tests (Vitest + go test) |

### App (`apps/fs-app-web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format check (Biome) |
| `npm run lint:fix` | Auto-fix lint and format issues |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:headed` | Run E2E tests with browser UI |

### Official Site (`apps/fs-official-web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format check (Biome) |
| `npm run lint:fix` | Auto-fix lint and format issues |
| `npm run test` | Run unit tests (Vitest) |
| `npm run deploy:staging` | Build + deploy to Cloudflare Pages (staging) |
| `npm run deploy:prod` | Build + deploy to Cloudflare Pages (production) |

### Backend (`apps/fs-backend`)

| Command | Description |
|---------|-------------|
| `go run main.go` | Start local dev server |
| `go test ./...` | Run all Go tests |
| `go test -cover ./...` | Run tests with coverage |

## Tech Stack

- **App frontend**: React + Vite + TypeScript
- **Public site**: Astro 6 + React islands
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Redux Toolkit
- **Forms**: react-hook-form + zod
- **Charts**: recharts (radar/spider chart)
- **Animations**: motion (v12+) — page transitions, staggered reveals, scroll-triggered entrances
- **Auth**: Firebase Authentication (Google Sign-In)
- **Database**: Firestore
- **Backend**: Go 1.26.4 on Google Cloud Run
- **Hosting**: Cloudflare Pages
- **Email**: Resend
- **Analytics**: Google Analytics 4 + Google Tag Manager
- **Linting/Formatting**: Biome + SonarQube
- **Monorepo**: Makefile
- **Routing**: React Router v7
- **Go Framework**: Chi (lightweight HTTP router)
- **API Docs**: Swagger/OpenAPI via swaggo, regenerated during backend builds and deploys
- **Notifications**: Slack (Incoming Webhooks)
- **i18n**: Thai/English via `useLocale()` hook
- **Theming**: Light/dark/system via `useTheme()` hook with FOUC prevention

## Core User Flow

1. Land on marketing page
2. Sign in with Google (avatar + name from Google account)
3. Complete registration (contact person + company info)
4. Take factory assessment quiz (animated step transitions)
5. View diagnosis: summary, spider chart, strengths/weaknesses (animated sections)
6. Receive result email
7. Edit profile via dialog (user account read-only from Google, editable contact + company sections)

## Routes

| Route | Access |
|-------|--------|
| `/` | Public (landing + sign in) |
| `/register` | Authenticated |
| `/quiz` | Authenticated + registered |
| `/results` | Authenticated + registered |
| `/admin` | Authenticated + admin role |
| `*` | 404 Not Found page |

## Documentation

See [docs/README.md](docs/README.md) for the full index.

**API**
| Document | Description |
|----------|-------------|
| [User API](docs/api/user.md) | All user-facing endpoints with request/response shapes |
| [Admin API](docs/api/admin.md) | Admin endpoints + audit event reference |
| [API Conventions](docs/api/conventions.md) | Response format, error codes, naming, validation |
| [Swagger/OpenAPI](docs/api/swagger.md) | swaggo setup, handler annotations, Swagger UI |

**Architecture**
| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture/overview.md) | Infrastructure, microservices, architecture diagram |
| [Database](docs/architecture/database.md) | Firestore schema, security rules, quiz structure, scoring |
| [Quiz Design](docs/architecture/quiz-design.md) | Dimensions, questions, scoring algorithm, thresholds |
| [Decisions](docs/architecture/decisions.md) | Architecture Decision Records (ADRs) |

**Development**
| Document | Description |
|----------|-------------|
| [Dev Setup](docs/development/setup.md) | Workflow, error handling, performance, deployment, monitoring |
| [Go Patterns](docs/development/go-patterns.md) | Chi router, Firestore repo, handler/service/repo layers |
| [Error Handling](docs/development/error-handling.md) | Sentinel errors, handler error mapping, Firestore errors |
| [Code Quality](docs/development/code-quality.md) | Biome, golangci-lint, import ordering, complexity |
| [Code Review](docs/development/code-review-checklist.md) | Pre-merge checklist for security, API, performance |
| [Testing](docs/development/testing.md) | Testing strategy, Vitest, Playwright, CI/CD |
| [Go Testing Guide](docs/development/testing-guide.md) | Go backend test patterns, mocks, table-driven tests |
| [Locale & Date/Time](docs/development/locale-guide.md) | UTC storage, Thai locale, Buddhist Era, formatting |

**Operations**
| Document | Description |
|----------|-------------|
| [Deployment](docs/operations/deployment.md) | Cloud Run, Cloudflare Pages, CI/CD pipelines |
| [Environment Variables](docs/operations/env-variables.md) | All required env vars and secrets per environment |
| [Security](docs/operations/security.md) | Firebase auth, CORS, rate limiting, Turnstile, secrets |
| [Monitoring](docs/operations/monitoring.md) | Cloud Logging, Cloud Monitoring, Slack alerts |

**Product**
| Document | Description |
|----------|-------------|
| [User Flow](docs/product/user-flow.md) | User journey diagram with decision points |
| [UI Wireframes](docs/product/wireframes.md) | Screen layouts for all pages |
| [Roadmap](docs/product/roadmap.md) | Phased roadmap with milestones |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the Git workflow and coding standards.

## License

MIT License. Copyright (c) 2026 Sathittham Sangthong. See [LICENSE](LICENSE) for details.

## Status

Active development — core user flow implemented (auth, registration, quiz, results, profile).

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Turborepo → Makefile, Cloud Functions → Cloud Run, fixed env vars, routes, Swagger status, added missing doc links |
| 1.2.0 | 2026-03-07 | Profile dialog (3 sections: account/contact/company), Google avatar in navbar, motion animations (quiz + results), SonarQube fixes, analytics events, data-testid attributes |
| 1.3.0 | 2026-03-08 | Theme system (light/dark/system) with FOUC prevention, dark mode fixes across all pages, Layout refactoring for SonarQube compliance, admin user management API, app READMEs |
| 1.4.0 | 2026-06-04 | Rebranded to FactorySync Solutions — updated brand name, abbreviation (FS), localStorage prefix (fss-), Go module path, email domain, CI/CD service names |
| 1.5.0 | 2026-06-09 | Synced README with actual monorepo layout — corrected app dir names (`apps/web`→`apps/fs-app-web`, `apps/api`→`apps/fs-backend`), documented the Astro `fs-official-web` public site (structure, tech stack, scripts), fixed env-setup paths and backend dev command |
