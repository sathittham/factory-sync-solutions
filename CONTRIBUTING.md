---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Contributing

## Git Workflow

Hosted on **GitHub** with GitHub Actions for CI/CD.

### Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | Production |
| `staging` | Pre-production verification | Staging |
| `develop` | Integration branch for features | — (CI only) |

### Flow

```
feature/* or bugfix/*  →  develop  →  staging  →  main
```

All changes via Pull Requests with code review.

### Branch Naming

```
feature/add-quiz-stepper
bugfix/fix-registration-validation
```

## Commit Messages

Use clear, concise commit messages that describe the "why":

```
Add quiz stepper component for multi-step navigation
Fix registration form validation for 13-digit company ID
```

## Development Setup

```bash
# Clone and install (root handles all workspaces)
git clone <repo-url>
cd factory-health-check
npm install

# Start all apps
npx turbo dev

# Start only frontend
npx turbo dev --filter=web

# Start only backend
cd apps/api && go run .
```

## Before Submitting a PR

1. Run lint: `npx turbo lint`
2. Run tests: `npx turbo test`
3. Run E2E tests: `cd apps/web && npm run test:e2e`
4. Check for TypeScript errors: `cd apps/web && npx tsc --noEmit`
5. Write/update tests for changed code

## Engineering Principles

All code must be **enterprise-grade, production-ready** from the start. See [development.md](docs/development.md#engineering-principles) for full details:

1. **Production quality** — strict linting, explicit error handling, zero warnings
2. **Maintainability** — layered architecture, single responsibility, 80%+ test coverage
3. **Performance** — initialize clients once, pre-allocate, lazy-load routes, minimize Firestore calls
4. **Cost optimization** — stay within free tiers, monitor Firestore quotas, right-size Cloud Functions
5. **Security first** — verify tokens server-side, scope data to UID, validate all input, no frontend secrets

## Code Style

- **camelCase everywhere** — JSON fields, Firestore fields, query params, struct tags (see [api-conventions.md](docs/api-conventions.md))
- **UUIDv4 for all resource IDs** — generated server-side via `github.com/google/uuid`
- **Biome** for linting and formatting (run `npm run lint:fix` to auto-fix)
- TypeScript strict mode
- **Redux Toolkit** for state management
- Use `react-hook-form` + `zod` for forms
- Use shadcn/ui for UI components
- Keep quiz definitions configurable (JSON/TS config)
- Add `data-testid` attributes to all components used in E2E tests (see [testing.md](docs/testing.md#data-testid-convention))
- **Mobile-first responsive design** — base styles for mobile, scale up with `sm:`, `md:`, `lg:` breakpoints
- Never send emails or use secret keys from the frontend

## `.gitignore`

Ensure the following are excluded from version control:

```
node_modules/
dist/
.env*
!.env.example
*.local
cover.out
playwright-report/
apps/api/docs/       # auto-generated Swagger
.turbo/
```

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
