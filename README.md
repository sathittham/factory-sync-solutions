---
version: 1.7.0
lastUpdated: 2026-06-14
author: Sathittham Sangthong
---

# FactorySync Solutions

A Makefile-managed monorepo containing a React SPA app, an Astro public marketing site, and a Go backend API for evaluating factory operational maturity through a guided assessment. Users register, answer a series of questions, and receive a diagnosis with a spider chart visualization, key strengths/weaknesses, and an email copy of their results.

## About

FactorySync Solutions is a factory health assessment platform for Thai SME manufacturers. It combines public marketing pages, an authenticated assessment app, an internal backoffice, and a Go API backed by Firebase Auth and Firestore.

| Field | Value |
|-------|-------|
| Homepage | [https://factorysyncsolutions.com](https://factorysyncsolutions.com) |
| User app | `https://app.factorysyncsolutions.com` |
| Backoffice | `https://backoffice.factorysyncsolutions.com` |
| API gateway | `https://api.factorysyncsolutions.com/api/v1` |
| Public CDN | `https://cdn.factorysyncsolutions.com` |
| License | MIT — copyright Sathittham Sangthong |
| Primary maintainer | Sathittham Sangthong |
| AI contributor | OpenAI Codex |

Suggested GitHub topics: `go`, `react`, `typescript`, `astro`, `firebase`, `firestore`, `cloudflare-pages`, `factory-assessment`, `shadcn-ui`.

## Prerequisites

- Node.js >= 20
- npm >= 10
- Go >= 1.26.4 (backend API)
- Make (included on macOS/Linux)

## Monorepo Structure

```
factory-sync-solutions/
├── apps/
│   ├── fs-app-web/         # React + Vite SPA (authenticated app)
│   ├── fs-backoffice-web/  # React + Vite SPA (internal backoffice)
│   ├── fs-official-web/    # Astro 6 + React islands (public marketing site)
│   ├── fs-api-gateway/     # Cloudflare Worker API gateway
│   └── fs-backend/         # Go Cloud Run service (backend API)
├── packages/               # Shared scripts/assets
├── Makefile                # Monorepo task runner
├── package.json            # Root workspace config
└── docs/                   # Project documentation
```

## Quick Start

```bash
# Install app (fs-app-web) dependencies
# Note: fs-backoffice-web and fs-official-web deps are installed separately.
make install

# Start backend API + authenticated app in dev mode
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
cp apps/fs-backoffice-web/.env.example apps/fs-backoffice-web/.env.local
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

# Official website URL for legal and marketing handoff links
VITE_OFFICIAL_WEB_URL=
```

### Backoffice (`apps/fs-backoffice-web/.env.local`)

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=/api/v1
VITE_PROXY_TARGET=http://localhost:8080
VITE_OFFICIAL_WEB_URL=https://www.factorysyncsolutions.com
```

### Public Site (`apps/fs-official-web/.env`)

```bash
# URL of the authenticated app (sign-in / CTA links point here)
PUBLIC_APP_URL=https://app.factorysyncsolutions.com

# Build version shown in the site footer
PUBLIC_APP_VERSION=v0.0.0

# Google Tag Manager (optional)
PUBLIC_GTM_ID=

# Embedded registration handoff
PUBLIC_API_BASE_URL=
PUBLIC_CF_TURNSTILE_SITE_KEY=
PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_STORAGE_BUCKET=
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
PUBLIC_FIREBASE_APP_ID=
```

### Backend (`apps/fs-backend/.env.development`)

```bash
GCP_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=   # path to service account JSON
PORT=8080
ENVIRONMENT=development
APP_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
RESEND_API_KEY=
CF_TURNSTILE_SECRET=              # Cloudflare Turnstile server-side secret
SLACK_WEBHOOK_REGISTRATION=       # Slack webhook for new registrations
SLACK_WEBHOOK_QUIZ_RESULT=        # Slack webhook for quiz results
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_ACCESS_KEY_SECRET=
R2_PUBLIC_BUCKET=
R2_PUBLIC_BASE_URL=
API_DOCS_SOURCE=filesystem
API_DOCS_R2_ACCOUNT_ID=
API_DOCS_R2_ACCESS_KEY_ID=
API_DOCS_R2_ACCESS_KEY_SECRET=
API_DOCS_R2_BUCKET=
API_DOCS_R2_PREFIX=openapi
API_DOCS_SUPPORTED_VERSIONS=v1
API_DOCS_DEFAULT_VERSION=v1
API_DOCS_LOCAL_DIR=docs
```

Backend secrets are stored in environment-specific backend env files locally and injected via GitHub Secrets in CI/CD. Never expose secrets to frontend apps.

## Available Scripts

Root-level `make` commands currently cover `apps/fs-backend` and `apps/fs-app-web`. Run `fs-backoffice-web` and `fs-official-web` scripts from their app directories.

| Command | Description |
|---------|-------------|
| `make dev` | Start backend API + authenticated app |
| `make build` | Build backend API + authenticated app |
| `make lint` | Run `go vet` + app-web Biome check |
| `make test` | Run backend Go tests + app-web Vitest |
| `make docs-api` | Generate versioned Swagger/OpenAPI artifacts |
| `npm run test:api-gateway` | Run Cloudflare Worker gateway tests |
| `npm run deploy:api-gateway:staging` | Deploy the staging API gateway Worker |
| `npm run deploy:api-gateway:prod` | Deploy the production API gateway Worker |

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

### Backoffice (`apps/fs-backoffice-web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run build:staging` | Build with staging mode |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format check (Biome) |
| `npm run lint:fix` | Auto-fix lint and format issues |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run deploy:staging` | Build + deploy to Cloudflare Pages (staging) |
| `npm run deploy:prod` | Build + deploy to Cloudflare Pages (production) |

### Official Site (`apps/fs-official-web`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and format check (Biome) |
| `npm run lint:fix` | Auto-fix lint and format issues |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run test:e2e:ui` | Run E2E tests with Playwright UI |
| `npm run deploy:staging` | Build + deploy to Cloudflare Pages (staging) |
| `npm run deploy:prod` | Build + deploy to Cloudflare Pages (production) |

### Backend (`apps/fs-backend`)

| Command | Description |
|---------|-------------|
| `go run main.go` | Start local dev server |
| `go test ./...` | Run all Go tests |
| `go test -cover ./...` | Run tests with coverage |
| `../../scripts/generate-api-docs.sh` | Generate Swagger/OpenAPI artifacts |

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
| `/auth/action` | Public Firebase auth action handler |
| `/register` | Authenticated |
| `/dashboard` | Authenticated + registered |
| `/quiz` | Authenticated + registered |
| `/results` | Authenticated + registered |
| `/profile` | Authenticated + registered |
| `/company-settings` | Authenticated + registered + project role |
| `/admin` | Authenticated + admin role |
| `*` | 404 Not Found page |

## Documentation

See [docs/README.md](docs/README.md) for the full index.

**API**
| Document | Description |
|----------|-------------|
| [User API](docs/api/user.md) | All user-facing endpoints with request/response shapes |
| [Admin API](docs/api/admin.md) | Admin endpoints + audit event reference |
| [Project API](docs/api/project.md) | Project and member RBAC endpoints |
| [Backoffice API](docs/api/backoffice.md) | Internal backoffice endpoints |
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
| [Product Specs](docs/README.md#product) | Feature specs for auth, register, quiz, results, backoffice, API docs, upload, and more |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the Git workflow and coding standards.

## Contributors

Maintained by Sathittham Sangthong with OpenAI Codex as an AI coding assistant contributor. See [CONTRIBUTORS.md](CONTRIBUTORS.md) for the maintained contributor list.

## License

MIT License. Copyright (c) 2026 Sathittham Sangthong. See [LICENSE](LICENSE) for the full license text.

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
| 1.5.0 | 2026-06-09 | Synced README with actual monorepo layout — corrected legacy app/backend dir names, documented the Astro `fs-official-web` public site (structure, tech stack, scripts), fixed env-setup paths and backend dev command |
| 1.6.0 | 2026-06-14 | Added backoffice app, clarified Makefile scope, updated env vars, routes, scripts, and docs links |
| 1.6.1 | 2026-06-14 | Added maintained contributor list and clarified license ownership |
| 1.6.2 | 2026-06-14 | Added repository About metadata, homepage, topics, and contributor summary |
