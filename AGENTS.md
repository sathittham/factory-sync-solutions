# AI Agent Instructions — FactorySync Solutions (Factory Health Check)

Instructions for AI coding assistants (Codex, Cursor, GitHub Copilot, Gemini Code Assist, etc.) working in this repository.

**Claude Code users**: read `CLAUDE.md` instead — it includes richer guidance with project-specific skills, sub-agents, and workflows.

---

## Project Overview

Multi-quiz factory health assessment platform. A Go backend serves React single-page apps (authenticated user app and internal backoffice) and an Astro marketing site (public). Assessments use an 8-dimension Shindan rubric, with several quiz variants. Data lives in Firestore; auth is Firebase Auth.

**Stack**: Go 1.26 · Chi router · Firestore · Firebase Auth · React 19 · React Router 7 · Redux Toolkit · Vite · shadcn/ui · Astro 6 · Tailwind v4 · Cloudflare Pages

---

## Non-Negotiable Rules

Violate any of these and the PR will be blocked at review:

1. **Response helpers** — always `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError`. Never write raw JSON.
2. **UID from context only** — `middleware.GetUID(r)`. Never read the user ID from the request body or path.
3. **Wrap every error** — `fmt.Errorf("context: %w", err)`. Check with `errors.Is`, never type assertion.
4. **Sentinel errors** — domain-specific per service (`ErrProfileNotFound`, `ErrAlreadyRegistered`, `ErrResultNotFound`, `ErrQuizNotFound`, etc.).
5. **shadcn/ui only** — never native `<select>`, `<dialog>`, or `window.confirm()`. Use `components/ui/`.
6. **i18n everywhere** — all UI text via `useLocale()`. No hardcoded strings (TH/EN).
7. **Dates via `formatDateTime()`** from `@/lib/dayjs` — never raw `toLocaleDateString()`. Thai locale uses Buddhist Era (พ.ศ.).
8. **camelCase IDs** — `userID`, `quizID`, `assessmentID`. Boolean fields use `Is*`/`Has*` prefix.
9. **No nested ternaries** (SonarQube S3358). Base font is 17px — `text-sm` minimum for labels.
10. **Never commit secrets** — `.env*`, `firebase-sa.json`, credentials are git-ignored.

---

## Codex Project Setup

- Repo-local Codex config lives in `.codex/config.toml` and uses the `factorysync-workspace` permission profile.
- The permission profile keeps normal workspace editing available while denying reads of `.env*`, Firebase service account JSON, and credential/secret-shaped JSON files.
- Project command rules live in `.codex/rules/default.rules`. Destructive commands remain blocked; release promotion git commands are allowlisted for the documented FactorySync release flow.
- Do not add repo-local MCP servers, hooks, or custom agents that require secrets. Keep personal tokens and machine-local credentials in user-level Codex config.

---

## Project Structure

```
factory-health-check/
├── apps/
│   ├── backend/        # Go + Chi + Firestore + Firebase Auth
│   ├── web-app/        # React 19 + Redux Toolkit + Vite + shadcn/ui (authenticated app)
│   ├── web-backoffice/ # React 19 + React Router + shadcn/ui (internal backoffice)
│   └── web-official/   # Astro 6 + React islands + shadcn/ui (public marketing site)
├── packages/              # shared scripts/assets
├── docs/                  # architecture, api, design, development, operations, product
├── firestore.rules        # Firestore security rules
└── Makefile
```

Backend service layout — each `services/<name>/` directory:

```
services/<name>/
├── handler.go       # Chi handlers + swagger annotations
├── service.go       # business logic + sentinel errors
├── models.go        # request/response structs
└── service_test.go  # table-driven tests
```

Services: `admin`, `audit`, `dbd`, `notification`, `profile`, `quiz`, `result`, `scoring`.
Shared packages in `pkg/`: `response.go`, `firestore.go`, `validator.go`, `turnstile.go`.

Frontend layout (`apps/web-app/src/`, `apps/web-backoffice/src/`): `pages/`, `components/` (`ui/` = shadcn), `store/` (Redux slices), `lib/` (`i18n.tsx`, `dayjs.ts`), `hooks/`.

---

## Key Conventions

### Response Shape

Built only through `pkg` helpers — `RespondJSON` (single), `RespondList` (collection), `RespondError` (errors). Never hand-roll JSON.

### Naming

- Go IDs: camelCase — `userID`, `quizID`, `assessmentID`.
- Go booleans: `IsActive`, `HasCompleted` (`is*`/`has*` prefix).
- React components: `PascalCase` (`QuizCard`). Hooks: `useX`. Event handlers: `handle<Action>`. Redux slices: `<feature>Slice`.

### Auth

UID always from `middleware.GetUID(r)`. Admin role lives in both the Firestore profile and Firebase custom claims — **claims are authoritative**.

### Quiz / Scoring

8-dimension Shindan rubric-based assessment, multi-quiz. Configs in `apps/backend/config/questions*.json` (`questions.json`, `questions-factory.json`, `questions-cybersecurity.json`, `questions-lean.json`). Scoring in `services/scoring/`. Results stored per-user in Firestore.

---

## Development Commands

```bash
make dev            # API + app web in parallel
make dev-api        # backend only (go run main.go)
make dev-web        # app web only (vite)
make build          # build backend + app web
make test           # backend + app web tests
make test-api       # backend tests
make test-web       # frontend tests
make lint           # go vet  +  biome check
make lint-fix       # biome check --fix
```

Root `make` targets currently cover `apps/backend` and `apps/web-app`. For `apps/web-backoffice` and `apps/web-official`, run per-app scripts inside `apps/<app>/`: `npm run dev`, `build`, `lint`, `test`, and `test:e2e` where available.

---

## Testing Standards

- Backend tests run with `-race` and table-driven cases; cover error paths.
- Assert errors with `errors.Is` — never `==`.
- Frontend: Vitest unit/component tests; Playwright for E2E (`apps/web-app`).
- Lint must pass: `go vet` (backend), Biome (frontend).

---

## Git & Commit Format

Branch: `<type>/<short-description>` — `feature/`, `bugfix/`, `hotfix/`, `docs/`, `refactor/`, `chore/`.

Commit: `<type>(<scope>): description` — ≤72 chars, imperative, no trailing period.
Types: `feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore`.
Scopes: `quiz`, `scoring`, `admin`, `profile`, `result`, `dbd`, `audit`, `notification`, `web`.

Branch flow: `feature/*` → `develop` → `staging` (ff) → `main` (ff).
Never commit directly to `main`; never force-push `main`.

---

## Security Checklist (verify on every PR)

- UID/role read only from `middleware.GetUID(r)` / Firebase claims — never request body.
- Auth middleware applied to every protected route.
- Input validated via `pkg/validator.go` at the handler layer.
- Turnstile verified on public-facing endpoints (`pkg/turnstile.go`).
- Firestore queries scoped to the authenticated user; no user-controlled document IDs without an ownership check.
- No secrets in code or logs; `firebase-sa.json` and `.env*` stay git-ignored.

---

## Deployment

Frontend apps → **Cloudflare Pages** via Wrangler. Release deploys → **git tags** via GitHub Actions.

```bash
npm run deploy:staging          # app-web + official-web → staging
npm run deploy:prod             # app-web + official-web → production
cd apps/web-backoffice && npm run deploy:staging  # backoffice → staging
cd apps/web-backoffice && npm run deploy:prod     # backoffice → production
git tag v1.2.3-staging && git push origin v1.2.3-staging   # → staging deploy
git tag v1.2.3 && git push origin v1.2.3                   # → production deploy
```

Always verify on staging before tagging production.

---

*Version: 1.0.1*
*Last updated: 13 June 2026*
