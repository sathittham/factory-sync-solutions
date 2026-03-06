---
version: 1.0.0
lastUpdated: 2026-03-06
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
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
  },
});
```

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

## CI/CD Integration

**`.github/workflows/test.yml`**:
```yaml
name: Tests

on:
  push:
    branches: [main, staging, develop]
  pull_request:
    branches: [main, staging, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx turbo lint

  frontend-unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: cd apps/web && npm run test:coverage
      - uses: codecov/codecov-action@v5

  backend-unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.25'
      - run: cd apps/api && go test -cover ./...

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [frontend-unit-tests, backend-unit-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: cd apps/web && npx playwright install --with-deps
      - run: cd apps/web && npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  notify-slack:
    runs-on: ubuntu-latest
    needs: [e2e-tests]
    if: always()
    steps:
      - uses: slackapi/slack-github-action@v2
        with:
          webhook: ${{ secrets.SLACK_WEBHOOK_CI_CD }}
          webhook-type: incoming-webhook
          payload: |
            {
              "text": "${{ github.workflow }} on ${{ github.ref_name }}: ${{ needs.e2e-tests.result == 'success' && 'Passed' || 'Failed' }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*${{ github.workflow }}* on `${{ github.ref_name }}`\nStatus: ${{ needs.e2e-tests.result == 'success' && ':white_check_mark: Passed' || ':x: Failed' }}\nCommit: <${{ github.server_url }}/${{ github.repository }}/commit/${{ github.sha }}|${{ github.sha }}>"
                  }
                }
              ]
            }
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
