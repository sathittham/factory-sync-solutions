---
version: 1.2.0
lastUpdated: 2026-06-14
author: Sathittham Sangthong
---

# Contributing

## Git Workflow

FactorySync Solutions is hosted on **GitHub** with GitHub Actions and tag-based release deploys.

### Branch Strategy

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `develop` | Integration branch for feature work | Development checks |
| `staging` | Verified release candidate | Staging via tag |
| `main` | Production-ready code (protected) | Production via tag |

```
feature/*, bugfix/*, hotfix/*, docs/*, refactor/*, chore/*
  -> develop
  -> staging
  -> main
```

All changes go through Pull Requests. Never commit directly to `main`, and never force-push `main`.

Release deploys are tag driven:

```bash
git tag v1.2.3-staging && git push origin v1.2.3-staging
git tag v1.2.3 && git push origin v1.2.3
```

Always verify staging before tagging production.

### Branch Naming

```text
feature/add-quiz-stepper
bugfix/fix-registration-validation
hotfix/fix-auth-middleware
docs/update-api-guide
refactor/scoring-service
chore/refresh-dependencies
```

## Commit Messages

Format: `<type>(<scope>): <description>`

Rules:

- Use imperative mood.
- Keep the subject at 72 characters or less.
- Do not add a trailing period.
- Use one of these types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Prefer repo scopes such as `quiz`, `scoring`, `admin`, `profile`, `result`, `dbd`, `audit`, `notification`, `web`, `backoffice`, `official`, `docs`.

```text
feat(quiz): add multi-step stepper navigation
fix(profile): correct company ID validation
docs(api): update quiz endpoint annotations
```

## Development Setup

```bash
git clone <repo-url>
cd factory-sync-solutions
make install
```

Root `make` targets currently cover `apps/fs-backend` and `apps/fs-app-web`.

```bash
make dev        # backend + app web in parallel
make dev-api    # backend only
make dev-web    # app web only
make build      # backend + app web
make test       # backend + app web tests
make lint       # backend + app web lint
make docs-api   # regenerate backend API docs
```

Run backoffice and official web commands inside each app:

```bash
cd apps/fs-backoffice-web
npm run dev
npm run build
npm run lint
npm test

cd ../fs-official-web
npm run dev
npm run build
npm run lint
npm test
npm run test:e2e
```

## Before Submitting a PR

Run the checks that match the files you changed:

- Backend or app-web changes: `make lint` and `make test`.
- Backend-only changes: `make lint-api` and `make test-api`.
- App-web-only changes: `make lint-web`, `make test-web`, and `cd apps/fs-app-web && npm run test:e2e` when UI flows changed.
- Backoffice changes: `cd apps/fs-backoffice-web && npm run lint && npm test && npm run build`.
- Official-web changes: `cd apps/fs-official-web && npm run lint && npm test && npm run build`; run `npm run test:e2e` for user-facing flow changes.
- API route or annotation changes: run `make docs-api` and include generated documentation updates.
- Documentation-only changes: run `git diff --check` on the changed docs.

Also confirm:

- Tests cover the changed behavior and error paths.
- No secrets, credentials, `.env*` files, or service account JSON files are committed.
- User-facing docs, README files, and API docs are updated when behavior changes.

## Engineering Rules

These project rules are required for code changes:

1. Use `pkg.RespondJSON`, `pkg.RespondList`, and `pkg.RespondError`; never hand-roll response JSON.
2. Read user IDs from `middleware.GetUID(r)` only; never accept the UID from a request body or path.
3. Wrap errors with context using `fmt.Errorf("context: %w", err)`.
4. Check domain errors with `errors.Is`; use service-level sentinel errors.
5. Use shadcn/ui components for dialogs, selects, confirmations, and other shared controls.
6. Put all UI copy behind `useLocale()`; do not hardcode Thai or English UI strings.
7. Format UI dates with `formatDateTime()` from `@/lib/dayjs`.
8. Use camelCase IDs such as `userID`, `quizID`, and `assessmentID`; boolean fields should use `Is*` or `Has*`.
9. Avoid nested ternaries.
10. Keep secrets out of code, logs, docs, and commits.

## Code Style

- Go handlers validate input at the handler layer and keep business logic in services.
- Backend service directories follow `handler.go`, `service.go`, `models.go`, and `service_test.go`.
- Backend tests should be table-driven where practical and run cleanly with `go test -race`.
- Quiz definitions live in `apps/fs-backend/config/questions*.json`.
- Frontend apps use React 19, React Router 7 where applicable, Redux Toolkit, Vite, Tailwind, and shadcn/ui.
- Use `react-hook-form` and `zod` for forms when they fit the existing app pattern.
- Use Biome for frontend linting and formatting.
- Add stable `data-testid` attributes for components used by E2E tests.
- Use mobile-first responsive styles and keep labels at `text-sm` or larger.
- Never send emails or use secret keys directly from the frontend.

## `.gitignore`

Keep generated local artifacts and secrets out of version control:

```text
node_modules/
dist/
.env*
!.env.example
*.local
cover.out
coverage/
playwright-report/
test-results/
firebase-sa.json
```

Generated API docs under `apps/fs-backend/docs/` may be committed when produced by `make docs-api`.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-06-04 | Refresh branch strategy, conventional commit format, and Makefile commands |
| 1.2.0 | 2026-06-14 | Align branch flow, app paths, checks, and engineering rules with the current repository |
