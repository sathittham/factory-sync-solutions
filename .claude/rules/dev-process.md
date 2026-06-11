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
- Error sentinels: domain-specific per service (`ErrProfileNotFound`, `ErrAlreadyRegistered`, `ErrResultNotFound`, `ErrQuizNotFound`, …) — not generic `ErrNotFound`

### Frontend (TypeScript/React)
- Components: `PascalCase` (`QuizCard`, `ResultPage`)
- Hooks: `camelCase` starting with `use` (`useQuizState`, `useLocale`)
- Event handlers: `handle<Action>` (`handleSubmit`, `handleCancel`)
- Redux slices: `<feature>Slice` in `apps/fs-app-web/src/store/`

## Architecture

```
apps/
  fs-backend/
    services/<name>/   # handler.go + service.go + models.go + service_test.go
    pkg/               # response.go, firestore.go, validator.go, turnstile.go
    middleware/        # FirebaseAuth middleware
    config/            # questions.json (quiz config), other config files
  fs-app-web/
    src/
      pages/           # page-level components
      components/      # shared components (ui/ = shadcn)
      store/           # Redux slices
      lib/             # i18n.tsx, dayjs.ts, utilities
      hooks/           # custom React hooks
```

## Quiz / Scoring Domain

- **8-dimension Shindan rubric-based assessment** — multi-quiz
- Quiz configs: `apps/fs-backend/config/questions*.json` — one per variant (`questions.json`, `questions-factory.json`, `questions-cybersecurity.json`, `questions-lean.json`, `questions-iso29110.json`)
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

## ISO 29110 Compliance (MANDATORY)

This project follows **ISO 29110 Basic Profile**. All artifacts live in `docs/iso29110/`.

### Before starting a new feature (SI.2 — Requirements first):
1. Copy `docs/iso29110/srs-template.md` → `docs/product/<feature>/feature-spec.md` and fill requirements **before** writing code
2. For non-trivial changes: copy `docs/iso29110/sdd-template.md` → `docs/architecture/<feature>-design.md`
3. Log the feature as a change request in `docs/iso29110/change-request-log.md` if it modifies approved scope

### During development (SI.4-5 — Tests required):
- Copy `docs/iso29110/test-plan-template.md` → `docs/product/<feature>/test-plan.md`
- Use `@qa-dev` to create the test plan and write tests TDD-first (test before implementation)
- Unit tests required for all new service methods (backend: `service_test.go`, `handler_test.go`)
- Backend coverage target ≥ 80% for critical services

### Before each production release (SI.O7 + PM.O2):
1. Copy `docs/iso29110/vdd-template.md` → `docs/iso29110/releases/vX.Y.Z.md` and fill in
2. Add a progress entry in `docs/iso29110/progress-log.md`
3. Review and update `docs/iso29110/risk-register.md`
4. Verify the compliance checklist in `docs/iso29110/README.md`

### Risk management:
- New risks → add to `docs/iso29110/risk-register.md` immediately
- Review register every 2 weeks or at each progress meeting

*Version: 1.2.0*
*Last updated: 11 June 2026*
