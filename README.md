---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Factory Health Check

A Turborepo monorepo containing a React SPA frontend and Go backend services for evaluating factory health through a guided quiz. Users register, answer a series of questions, and receive a diagnosis with a spider chart visualization, key strengths/weaknesses, and an email copy of their results.

## Prerequisites

- Node.js >= 20
- npm >= 10
- Go >= 1.25 (backend services)

## Monorepo Structure

```
factory-health-check/
├── apps/
│   ├── web/                # React + Vite SPA (frontend)
│   └── api/                # Go Cloud Functions (backend services)
├── packages/
│   └── shared/             # Shared configs (quiz question JSON, constants)
├── turbo.json              # Turborepo pipeline config
├── package.json            # Root workspace config
└── docs/                   # Project documentation
```

## Quick Start

```bash
# Install all dependencies (workspaces)
npm install

# Start all apps in dev mode
npx turbo dev

# Start only frontend
npx turbo dev --filter=web

# Start only backend
cd apps/api && go run .
```

## Environment Variables

Create a `.env.local` file in `apps/web/`:

```bash
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=

# API
VITE_API_BASE_URL=

# Cloudflare Turnstile (bot protection)
VITE_CF_TURNSTILE_SITE_KEY=

# Google Analytics
VITE_GA_MEASUREMENT_ID=
```

Backend environment variables (in `apps/api/` or GCP Secret Manager):

```bash
RESEND_API_KEY=
GCP_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT=         # path to service account JSON
CF_TURNSTILE_SECRET_KEY=          # Cloudflare Turnstile server-side secret
ALLOWED_ORIGINS=http://localhost:5173,https://factory-health-check.pages.dev
SLACK_WEBHOOK_REGISTRATIONS=     # Slack webhook for new registrations
SLACK_WEBHOOK_QUIZ_RESULTS=      # Slack webhook for quiz results
SLACK_WEBHOOK_SERVER_STATUS=     # Slack webhook for server status
```

These are server-side secrets — never expose to the frontend.

## Available Scripts

Root-level commands run across all packages via Turborepo:

| Command | Description |
|---------|-------------|
| `npx turbo dev` | Start all apps in dev mode |
| `npx turbo build` | Build all apps |
| `npx turbo lint` | Lint all packages (Biome + golangci-lint) |
| `npx turbo test` | Run all tests (Vitest + go test) |

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
- **Backend**: Go 1.25.x on Google Cloud Functions (2nd gen)
- **Hosting**: Cloudflare Pages
- **Email**: Resend
- **Linting/Formatting**: Biome
- **Monorepo**: Turborepo
- **Routing**: React Router v7
- **Go Framework**: Chi (lightweight HTTP router)
- **API Docs**: Swagger/OpenAPI (auto-generated via swaggo)
- **Notifications**: Slack (Incoming Webhooks)
- **Analytics**: Google Analytics 4

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
| `/` | Public |
| `/auth` | Public |
| `/register` | Authenticated |
| `/quiz` | Authenticated + registered |
| `/result` | Authenticated + registered |
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
