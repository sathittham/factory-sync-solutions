---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Factory Health Check

A Makefile-managed monorepo containing a React SPA frontend and Go backend API for evaluating factory health through a guided quiz. Users register, answer a series of questions, and receive a diagnosis with a spider chart visualization, key strengths/weaknesses, and an email copy of their results.

## Prerequisites

- Node.js >= 20
- npm >= 10
- Go >= 1.25 (backend API)
- Make (included on macOS/Linux)

## Monorepo Structure

```
factory-health-check/
├── apps/
│   ├── web/                # React + Vite SPA (frontend)
│   └── api/                # Go Cloud Run service (backend API)
├── Makefile                # Monorepo task runner
├── package.json            # Root workspace config
└── docs/                   # Project documentation
```

## Quick Start

```bash
# Install frontend dependencies
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
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

### Frontend (`apps/web/.env`)

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
```

### Backend (`apps/api/.env`)

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

### Frontend (`apps/web`)

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

### Backend (`apps/api`)

| Command | Description |
|---------|-------------|
| `go run .` | Start local dev server |
| `go test ./...` | Run all Go tests |
| `go test -cover ./...` | Run tests with coverage |

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Redux Toolkit
- **Forms**: react-hook-form + zod
- **Charts**: recharts (radar/spider chart)
- **Auth**: Firebase Authentication (Google Sign-In)
- **Database**: Firestore
- **Backend**: Go 1.25.x on Google Cloud Run
- **Hosting**: Cloudflare Pages
- **Email**: Resend
- **Linting/Formatting**: Biome
- **Monorepo**: Makefile
- **Routing**: React Router v7
- **Go Framework**: Chi (lightweight HTTP router)
- **API Docs**: Swagger/OpenAPI via swaggo (planned — not yet implemented)
- **Notifications**: Slack (Incoming Webhooks)
- **i18n**: Thai/English via `useLocale()` hook

## Core User Flow

1. Land on marketing page
2. Sign in with Google
3. Complete registration (profile + company info)
4. Take factory health check quiz
5. View diagnosis: summary, spider chart, strengths/weaknesses
6. Receive result email

## Routes

| Route | Access |
|-------|--------|
| `/` | Public (landing + sign in) |
| `/register` | Authenticated |
| `/quiz` | Authenticated + registered |
| `/results` | Authenticated + registered |
| `/profile` | Authenticated + registered |
| `/admin` | Authenticated + admin role |
| `*` | 404 Not Found page |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Infrastructure, microservices, architecture diagram |
| [Database](docs/database.md) | Firestore schema, security rules, quiz structure, scoring |
| [Testing](docs/testing.md) | Testing strategy, Vitest, Playwright, CI/CD |
| [Development](docs/development.md) | Workflow, error handling, performance, deployment, monitoring |
| [Decisions](docs/decisions.md) | Architecture Decision Records (ADRs) |
| [Go Patterns](docs/go-patterns.md) | Chi router, Firestore repo, handler/service/repo layers |
| [API Conventions](docs/api-conventions.md) | Response format, error codes, naming, validation |
| [Error Handling](docs/error-handling.md) | Sentinel errors, handler error mapping, Firestore errors |
| [Security Guide](docs/security-guide.md) | Firebase auth, CORS, rate limiting, Turnstile, secrets |
| [Code Quality](docs/code-quality.md) | Biome, golangci-lint, import ordering, complexity |
| [Code Review Checklist](docs/code-review-checklist.md) | Pre-merge checklist for security, API, performance |
| [Logging & Monitoring](docs/logging-monitoring.md) | Cloud Logging, Cloud Monitoring, Slack alerts |
| [Swagger/OpenAPI](docs/swagger-openapi.md) | swaggo setup, handler annotations, Swagger UI |
| [Go Testing Guide](docs/testing-guide.md) | Go backend test patterns, mocks, table-driven tests |
| [Quiz Design](docs/quiz-design.md) | Dimensions, questions, scoring algorithm, thresholds |
| [UI Wireframes](docs/ui-wireframes.md) | Screen layouts for all pages |
| [User Flow](docs/user-flow.md) | User journey diagram with decision points |
| [Locale & Date/Time](docs/locale-guide.md) | UTC storage, Thai locale, Buddhist Era, formatting |
| [Environment Variables](docs/env-variables.md) | All required env vars and secrets per environment |
| [Deployment Guide](docs/deployment-guide.md) | Cloud Run, Cloudflare Pages, CI/CD pipelines |
| [Implementation Plan](docs/implementation-plan.md) | Phased roadmap with milestones |
| [Contributing](CONTRIBUTING.md) | Git workflow, coding standards |

## License

MIT License. Copyright (c) 2026 Sathittham Sangthong. See [LICENSE](LICENSE) for details.

## Status

Project initialization phase: planning + scaffold setup.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Turborepo → Makefile, Cloud Functions → Cloud Run, fixed env vars, routes, Swagger status, added missing doc links |
