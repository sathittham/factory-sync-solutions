---
version: 1.0.0
lastUpdated: 2026-03-06
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
- All API responses must follow the standard envelope format ([api-conventions.md](api-conventions.md))

### 2. Long-Term Maintainability

- **Layered architecture**: handler → service → repository — no layer skipping
- **Single responsibility**: each function, component, and service does one thing well
- **Naming clarity**: camelCase everywhere, descriptive names, no abbreviations (except `uid`, `id`, `ctx`)
- **No magic values**: use named constants for thresholds, limits, status strings
- **Minimal dependencies**: evaluate every third-party package for maintenance risk; prefer stdlib when reasonable
- **Test coverage ≥ 80%** for service/business logic layers
- **Document decisions**: new architectural choices must have an ADR in [decisions.md](decisions.md)

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
- Cloud Functions: use appropriate memory (256–512 MB) and timeout (10–30s)
- Avoid redundant Firestore calls — don't fetch the same document twice in one request

### 5. Security First

- **Authentication**: Firebase ID token verified on every protected endpoint via `auth.VerifyIDToken`
- **Authorization**: admin role checked server-side — never trust frontend-only checks
- **Data scoping**: all Firestore queries scoped to the authenticated user's UID
- **Input validation**: struct validation tags on all request DTOs, path params validated before use
- **Secrets**: GCP Secret Manager in deployed environments, `.env` locally (gitignored)
- **No secrets in frontend**: only `VITE_` prefixed public config
- **Bot protection**: Cloudflare Turnstile on registration, rate limiting on all endpoints
- **CORS**: explicit allowed origins — no wildcard in production
- See [security-guide.md](security-guide.md) for full details

---

## Monorepo (Turborepo)

All apps and packages are managed with Turborepo. The `turbo.json` pipeline defines task dependencies so that `build`, `lint`, and `test` run in the correct order with caching.

```bash
npx turbo dev              # Start all apps
npx turbo build            # Build all apps
npx turbo lint             # Lint all packages
npx turbo test             # Run all tests
npx turbo dev --filter=web # Start only frontend
```

Key benefits:
- Incremental builds with remote caching
- Parallel task execution across packages
- Single `npm install` at the root for all workspaces

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

API docs are auto-generated from Go source code using `swaggo/swag`:

```bash
# Generate swagger spec
cd apps/api && swag init

# Output: docs/swagger.json, docs/swagger.yaml, docs/docs.go
```

- Annotate handlers with `@Summary`, `@Param`, `@Success`, `@Router` comments
- Swagger UI available at `/api/v1/swagger/` (staging only, disabled in production)
- Re-generate in CI before each build to keep spec in sync

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

All pipelines use `npx turbo` to leverage caching and parallel execution.

```yaml
1. On push to develop:
   - npx turbo lint
   - npx turbo test (Vitest + go test)
   - npx turbo build (verification only)

2. On push to staging:
   - npx turbo lint
   - npx turbo test
   - npx turbo build
   - Deploy apps/web to Cloudflare Pages (staging)
   - Deploy apps/api to GCP Cloud Functions (staging)

3. On push to main:
   - npx turbo lint
   - npx turbo test
   - npx turbo build
   - Deploy apps/web to Cloudflare Pages (production)
   - Deploy apps/api to GCP Cloud Functions (production)
```

### Environments

| Environment | Frontend URL | Backend |
|-------------|-------------|---------|
| Staging | `factory-health-check-staging.pages.dev` | GCP staging project |
| Production | `factory-health-check.pages.dev` | GCP production project |

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
- `#server-status` — Cloud Function health checks and error alerts

See [architecture.md](architecture.md#slack-notifications) for full details.

### Backend (Go)

- **Cloud Monitoring**: Stackdriver for Cloud Functions
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
- Review Cloud Functions logs for errors

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
