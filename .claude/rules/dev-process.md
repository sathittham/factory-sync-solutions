---
description: Development process rules — code review checklist, naming conventions, documentation
---

# Development Process Rules

## Code Review (MANDATORY for all code changes)

Apply the 5-point checklist in priority order:

1. **Security** — no exposed secrets, auth bypass, missing auth checks, user-controlled IDs
2. **Best Practice** — follows project conventions (response helpers, shadcn/ui, i18n, layers)
3. **Performance** — no N+1 Firestore queries, no unnecessary re-renders, proper memoization
4. **Correctness** — business logic matches quiz/scoring spec, edge cases handled
5. **Maintainability** — no nested ternaries, no dead code, proper error wrapping, tests present

## Naming Conventions

### Backend (Go)
- IDs in camelCase: `userID`, `quizID`, `assessmentID`
- Boolean fields: `IsActive`, `HasCompleted` — `is*`/`has*` prefix
- Error sentinels: `ErrNotFound`, `ErrConflict`, `ErrForbidden` in service package

### Frontend (TypeScript/React)
- Components: `PascalCase` (`QuizCard`, `ResultPage`)
- Hooks: `camelCase` starting with `use` (`useQuizState`, `useLocale`)
- Event handlers: `handle<Action>` (`handleSubmit`, `handleCancel`)
- Redux slices: `<feature>Slice` in `apps/fs-app-web/src/store/`

## Architecture

```
apps/
  api/
    services/<name>/   # handler.go + service.go + models.go + service_test.go
    pkg/               # response.go, firestore.go, validator.go, turnstile.go
    middleware/        # FirebaseAuth middleware
    config/            # questions.json (quiz config), other config files
  web/
    src/
      pages/           # page-level components
      components/      # shared components (ui/ = shadcn)
      store/           # Redux slices
      lib/             # i18n.tsx, dayjs.ts, utilities
      hooks/           # custom React hooks
```

## Quiz / Scoring Domain

- **8-dimension Shindan rubric-based assessment** — 43 questions
- Quiz config: `apps/fs-backend/config/questions.json`
- Scoring: `apps/fs-backend/services/scoring/`
- Results stored per-user in Firestore

## Deployment

- Push tag `v*-staging` → triggers staging deploy (GitHub Actions)
- Push tag `v*.*.*` (semver) → triggers production deploy (GitHub Actions)
- Always test on staging before tagging production

## Documentation Updates

When modifying API endpoints:
- Update swagger annotations in handler.go
- Update the relevant `.claude/rules/` file when adding new conventions

*Version: 1.0.0*
*Last updated: 04 June 2026*
