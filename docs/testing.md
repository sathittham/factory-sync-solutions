---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Testing Strategy

## Overview

| Layer | Tool | Scope |
|-------|------|-------|
| Frontend unit | Vitest + React Testing Library | Pure functions, components, hooks |
| Frontend integration | React Testing Library | Component interactions, forms, navigation |
| Backend unit | `go test` | Service handlers, scoring logic, validation |
| E2E | Playwright | Critical user flows across browsers |

## Unit Tests (Vitest)

### Setup

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Configuration

**`vitest.config.ts`**:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

> **Note**: Coverage configuration (provider, reporters, thresholds) can be added to the `test` block when needed. See [Vitest coverage docs](https://vitest.dev/guide/coverage).

**`src/test/setup.ts`**:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### What to Test

- Pure functions (calculations, validators, transformers)
- React components (rendering, user interactions, state changes)
- Custom hooks (logic, state updates, side effects)
- Form validation logic
- API service functions

### What NOT to Test

- Third-party libraries (assume they work)
- Implementation details (test behavior, not implementation)

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
npm run test -- file.ts   # Specific file
```

## Backend Unit Tests (Go)

### Setup

Use the standard `testing` package with **manual mocks** (function fields pattern). No external mock libraries — see [testing-guide.md](testing-guide.md) for the full mock pattern.

### Test Structure

Place test files alongside the code they test using Go convention:

```
apps/api/services/
├── profile/
│   ├── handler.go
│   ├── handler_test.go
│   ├── service.go
│   └── service_test.go
├── quiz/
│   ├── handler.go
│   ├── handler_test.go
│   ├── service.go
│   └── service_test.go
├── scoring/
│   ├── scoring.go
│   └── scoring_test.go
└── notification/
    ├── service.go
    └── service_test.go
```

### What to Test

- HTTP handler request/response (status codes, response body)
- Service layer business logic (scoring calculations, validation)
- Input validation and error paths
- Firestore interaction logic (using mocked interfaces)

### Running Tests

```bash
cd apps/api
go test ./...                    # Run all tests
go test ./services/scoring/...   # Specific package
go test -v ./...                 # Verbose output
go test -cover ./...             # With coverage
go test -coverprofile=cover.out ./... && go tool cover -html=cover.out  # HTML report
go test -race ./...              # Race condition detection
```

## `data-testid` Convention

All components used in E2E tests must include `data-testid` attributes. This decouples tests from CSS classes and DOM structure, making tests resilient to UI refactors.

### Naming Convention

Use kebab-case with a component/feature prefix:

```
data-testid="<feature>-<element>"
```

### Required Test IDs

| Component | `data-testid` |
|-----------|--------------|
| Google Sign-In button | `auth-google-signin-btn` |
| Registration form | `registration-form` |
| Registration submit button | `registration-submit-btn` |
| Quiz stepper | `quiz-stepper` |
| Question card | `quiz-question-card` |
| Quiz next button | `quiz-next-btn` |
| Quiz previous button | `quiz-prev-btn` |
| Quiz submit button | `quiz-submit-btn` |
| Result summary | `result-summary` |
| Spider chart | `result-spider-chart` |
| Strengths panel | `result-strengths-panel` |
| Weaknesses panel | `result-weaknesses-panel` |
| Email status (success) | `result-email-success` |
| Email status (error) | `result-email-error` |
| Admin assessment table | `admin-assessment-table` |
| Admin industry filter | `admin-filter-industry` |
| Admin size filter | `admin-filter-size` |
| Admin export CSV button | `admin-export-csv-btn` |

### Rules

1. Every interactive or assertable element in E2E flows **must** have a `data-testid`.
2. Never use `data-testid` for styling — it is test-only.
3. Add new test IDs to this table when creating new components for E2E coverage.

## E2E Tests (Playwright)

### Setup

```bash
npm install -D @playwright/test
npx playwright init
npx playwright install chromium firefox webkit
```

### Configuration

**`playwright.config.ts`**:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'iPad', use: { ...devices['iPad (gen 7)'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Test Structure

```
e2e/
├── auth/
│   ├── google-signin.spec.ts
│   └── registration.spec.ts
├── quiz/
│   ├── quiz-flow.spec.ts
│   └── quiz-submission.spec.ts
├── result/
│   └── result-display.spec.ts
└── admin/
    └── admin-dashboard.spec.ts
```

### Running E2E Tests

```bash
npm run test:e2e            # Run all
npm run test:e2e:headed     # With browser UI
npm run test:e2e:debug      # Debug mode
npm run test:e2e -- file.ts # Specific file
```

## Coverage Goals

- **Frontend unit**: 80%+ coverage for business logic
- **Backend unit**: 80%+ coverage for service/handler logic
- **Frontend integration**: Cover all user-facing components and forms
- **E2E**: Cover critical user flows (registration, quiz, result, email, admin)

> **Note**: These are target goals. Coverage thresholds are not currently enforced in CI.

## CI/CD Integration

**`.github/workflows/test.yml`**:

The CI pipeline uses path-based change detection to run only relevant tests. It also supports `workflow_call` so deploy workflows can reuse it.

```yaml
name: Test

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging, develop]
  workflow_call:

jobs:
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.filter.outputs.api }}
      web: ${{ steps.filter.outputs.web }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - id: filter
        uses: dorny/paths-filter@v3
        with:
          filters: |
            api:
              - 'apps/api/**'
            web:
              - 'apps/web/**'

  backend:
    name: Backend Tests
    needs: changes
    if: needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "1.25"
          cache-dependency-path: apps/api/go.sum
      - run: go mod download
      - run: go vet ./...
      - run: go test -race -cover ./...
      - run: go build ./...

  frontend:
    name: Frontend Tests
    needs: changes
    if: needs.changes.outputs.web == 'true'
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
          cache-dependency-path: apps/web/package-lock.json
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npx vitest run
      - run: npx vite build
```

## Best Practices

1. Write tests before code (TDD when possible)
2. Keep tests independent — no dependencies between tests
3. Use descriptive names — test names should explain what is being tested
4. Arrange-Act-Assert pattern
5. Mock external dependencies (APIs, databases, third-party services)
6. Test edge cases, not just happy paths
7. Keep tests fast — unit tests should run in seconds
8. Fix broken tests immediately
9. Use Page Object Model for E2E tests

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated CI/CD workflow to match actual test.yml (path-based jobs, Node 22, no turbo), fixed vitest.config.ts example, added coverage note |
