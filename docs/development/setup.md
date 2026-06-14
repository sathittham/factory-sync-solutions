---
version: 1.1.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
---

# Development Guide

## Engineering Principles

All code in this project must strictly follow these principles. They apply equally to frontend and backend.

### 1. Enterprise-Grade Production Quality

- Write code as if it will run in production from day one — no shortcuts, no "fix later" TODOs
- All public functions must have clear godoc (Go) or JSDoc (TypeScript) comments
- Use strict TypeScript (`strict: true`) and Go linting (`golangci-lint`) with zero warnings
- Every code path must have explicit error handling — no silent failures
- All API responses must follow the standard envelope format ([api-conventions.md](../api/conventions.md))

### 2. Long-Term Maintainability

- **Layered architecture**: handler → service → repository — no layer skipping
- **Single responsibility**: each function, component, and service does one thing well
- **Naming clarity**: camelCase everywhere, descriptive names, no abbreviations (except `uid`, `id`, `ctx`)
- **No magic values**: use named constants for thresholds, limits, status strings
- **Minimal dependencies**: evaluate every third-party package for maintenance risk; prefer stdlib when reasonable
- **Test coverage ≥ 80%** for service/business logic layers
- **Document decisions**: new architectural choices must have an ADR in [decisions.md](../architecture/decisions.md)

### 3. Best Performance

- Initialize clients (Firestore, Firebase Auth) **once at startup** — never per request
- Load quiz questions from static JSON config — zero Firestore reads for question definitions
- Pre-allocate slices when size is known (`make([]T, 0, len(items))`)
- Use lazy-loaded routes and code splitting in the frontend (React Router lazy)
- Minimize Firestore reads/writes per request — batch where possible
- Profile before optimizing — avoid premature optimization on non-critical paths

### 4. Cost Optimization

- Stay within GCP and Cloudflare free tiers as the primary constraint
- Monitor Firestore read/write counts against free tier limits (50K reads, 20K writes/day)
- Set Cloud Logging retention per environment (staging: 14 days, production: 90 days)
- Quiz questions as static config = zero Firestore cost for the most common read
- Cloud Run: use appropriate memory and timeout settings
- Avoid redundant Firestore calls — don't fetch the same document twice in one request

### 5. Security First

- **Authentication**: Firebase ID token verified on every protected endpoint via `auth.VerifyIDToken`
- **Authorization**: admin role checked server-side — never trust frontend-only checks
- **Data scoping**: all Firestore queries scoped to the authenticated user's UID
- **Input validation**: struct validation tags on all request DTOs, path params validated before use
- **Secrets**: GitHub Secrets injected as env vars at deploy time, `.env` locally (gitignored)
- **No secrets in frontend**: only `VITE_` prefixed public config
- **Bot protection**: Cloudflare Turnstile on registration, rate limiting on all endpoints
- **CORS**: explicit allowed origins — no wildcard in production
- See [security-guide.md](../operations/security.md) for full details

---

## Monorepo (Makefile)

Apps are managed independently with a root `Makefile` for convenience commands:

```bash
make dev-api               # Start Go backend
make dev-web               # Start Vite frontend
make lint-api              # Lint backend (go vet)
make lint-web              # Lint frontend (biome)
make test-api              # Run Go tests
make test-web              # Run Vitest
```

Each app has its own build and test commands (`apps/fs-backend/` uses Go toolchain, `apps/fs-app-web/` uses npm/Vite).

## Linting & Formatting

Use **Biome** for linting and formatting (replaces ESLint + Prettier):

```bash
npx biome check .          # Check lint + format
npx biome check --fix .    # Auto-fix issues
```

Rationale: Single tool for lint + format, fast (Rust-based), zero-config defaults, TypeScript-first.

## State Management

Use **Redux Toolkit** for global state:
- User authentication state
- Quiz progress and answers
- Registration form state
- Result display data

Rationale: Predictable state updates, excellent DevTools, built-in RTK Query for API caching, widely adopted with strong ecosystem.

## Routing

### Frontend

Use **React Router v7** for client-side routing with the following route structure:
- Lazy-loaded route components for code splitting
- Route guards for auth/registration checks
- Catch-all `*` route for 404 page

### Backend

Use **Chi** (`github.com/go-chi/chi/v5`) as the Go HTTP router:
- Lightweight, idiomatic, stdlib-compatible
- Middleware support (CORS, auth, logging, rate limiting)
- Route groups for `/api/v1/` versioning

## Accessibility (a11y)

All components must meet WCAG 2.1 AA standards:

- **Semantic HTML**: Use correct elements (`<button>`, `<nav>`, `<main>`, `<form>`, `<label>`)
- **Keyboard navigation**: All interactive elements must be reachable and operable via keyboard
- **ARIA labels**: Add `aria-label` or `aria-labelledby` to icons, charts, and non-text elements
- **Color contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text
- **Focus indicators**: Visible focus rings on all interactive elements (shadcn/ui provides defaults)
- **Screen reader**: Spider chart must include a text-based data table alternative
- **Form errors**: Associate error messages with inputs via `aria-describedby`

shadcn/ui components are accessible by default — do not override accessibility attributes.

## Loading & Skeleton States

Every async operation must show a loading indicator:

| Scenario | Pattern |
|----------|---------|
| Page load (route transition) | Full-page skeleton or spinner |
| Auth state resolving | Splash screen until Firebase auth state is known |
| Form submission | Disable submit button + spinner inside button |
| API data fetching | Skeleton components matching final layout |
| Quiz navigation | Skeleton for next question card |
| Result computation | Progress indicator or loading animation |

Use shadcn/ui `Skeleton` component for consistent loading states.

## Error Handling Strategy

| Category | Approach |
|----------|----------|
| Error Boundaries | Wrap major route components |
| Toast Notifications | User-friendly messages for recoverable errors |
| API Errors | Retry logic with exponential backoff for transient failures |
| Auth Errors | Redirect to login page with error message |
| Logging | Console errors in dev; structured logging in production |

## Responsive Design

The app must be fully responsive across mobile, tablet, and desktop. Use a **mobile-first** approach with Tailwind CSS breakpoints.

### Breakpoints

| Breakpoint | Min width | Target devices |
|------------|-----------|----------------|
| (default) | 0px | Mobile phones |
| `sm` | 640px | Large phones |
| `md` | 768px | iPad / tablets |
| `lg` | 1024px | Laptops / small desktops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Guidelines

- **Mobile-first**: Write base styles for mobile, then add `sm:`, `md:`, `lg:` for larger screens.
- **Touch targets**: Minimum 44x44px for all interactive elements on mobile.
- **Navigation**: Collapsible/hamburger menu on mobile, full nav bar on desktop.
- **Forms**: Full-width inputs on mobile, multi-column layouts on tablet+.
- **Quiz stepper**: Vertical steps on mobile, horizontal on tablet+.
- **Spider chart**: Scale down on mobile; ensure labels remain readable.
- **Tables (admin)**: Horizontal scroll on mobile, full table on desktop.
- **Typography**: Use Tailwind's responsive font sizes (`text-sm md:text-base lg:text-lg`).

### Testing Responsive Layouts

Playwright E2E tests cover mobile via the `Mobile Chrome` project (Pixel 5). Additionally:
- Use browser DevTools device toolbar during development.
- Test on real devices before release (especially iPad Safari).

## Performance Optimization

- **Code Splitting**: Lazy load routes and heavy components
- **Image Optimization**: Compress images, use WebP format
- **Bundle Analysis**: Use vite-plugin-visualizer regularly
- **Caching Strategy**: Leverage Cloudflare CDN for static assets
- **Lazy Loading**: Defer non-critical JavaScript

## API Documentation (Swagger)

> **Status**: Active. Swagger/OpenAPI docs are regenerated from backend annotations during backend builds, CI, and deploys. See [swagger.md](../api/swagger.md) for the current workflow.

## API Versioning

- Base path: `/api/v1/`
- Version in URL for breaking changes
- Use semantic versioning for API contract

## Suggested Component Areas

- `HeroSection`
- `GoogleSignInButton`
- `RegistrationForm`
- `QuizStepper`
- `QuestionCard`
- `ResultSummary`
- `SpiderChart`
- `StrengthWeaknessPanel`

## Deployment

### Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | Production |
| `staging` | Pre-production verification | Staging |
| `develop` | Integration branch for features | — (CI only) |

Flow: `feature/*` → `develop` → `staging` → `main`

### CI/CD Pipeline (GitHub Actions)

```yaml
1. On push/PR to main, staging, develop (test.yml):
   - Detect changed paths (api vs web)
   - Backend: go vet, go test -race -cover, go build
   - Frontend: tsc --noEmit, vitest run, vite build

2. On tag v*-staging (deploy-staging.yml):
   - Run tests (reusable test.yml)
   - Build & deploy backend Docker image to Cloud Run
   - Build & deploy frontend to Cloudflare Pages

3. On tag v*.*.* (deploy-production.yml):
   - Run tests (reusable test.yml)
   - Build & deploy backend Docker image to Cloud Run
   - Build & deploy frontend to Cloudflare Pages
```

### Environments

| Environment | Frontend URL | Backend |
|-------------|-------------|---------|
| Staging | `staging.factorysync.com` | Cloud Run (staging) |
| Production | `app.factorysync.com` | Cloud Run (production) |

## Monitoring & Logging

### Frontend

- **GA4**: User behavior and conversion tracking
- **Sentry** (optional): Error tracking and performance monitoring
- Custom console logging for development

### Slack Notifications

Real-time alerts sent to Slack channels via Incoming Webhooks:
- `#registrations` — New user registration
- `#quiz-results` — Quiz result submitted (company, score, diagnosis)
- `#ci-cd` — GitHub Actions pipeline status (pass/fail)
- `#server-status` — Cloud Run health checks and error alerts

See [architecture.md](../architecture/overview.md#slack-notifications) for full details.

### Backend (Go)

- **Cloud Monitoring**: Stackdriver for Cloud Run
- **Cloud Logging**: Structured logs from Go services
- **Firestore Usage**: Monitor read/write operations

## Troubleshooting

### Google Sign-In Fails
- Check Firebase Auth configuration
- Verify authorized domains in Firebase Console
- Check browser console for specific errors

### Email Not Sent
- Check Resend API key validity
- Verify email job status in Firestore
- Review Cloud Run logs for errors

### Quiz Submission Errors
- Validate all required fields are completed
- Check network connectivity
- Review Firestore security rules

### Build Fails
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for TypeScript errors
- Verify environment variables are set

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated: Turborepo -> Makefile, Cloud Functions -> Cloud Run, Swagger marked as not implemented, fixed CI/CD pipeline |
| 1.1.0 | 2026-06-13 | Fix broken links; fix apps/api → apps/fs-backend paths; update environment URLs to custom domains |

*Version: 1.1.0*
*Last updated: 13 June 2026*
