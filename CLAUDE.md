# FactorySync Solutions — Factory Health Check

Multi-quiz factory health assessment platform. Go + Chi + Firestore backend, React + shadcn/ui app, Astro public site. Read this file first; dive into `.claude/rules/` for path-specific detail.

---

## Non-Negotiable Rules

1. **Response helpers** — always `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError`. Never write raw JSON.
2. **UID from context only** — `middleware.GetUID(r.Context())`. Never read the user ID from the request body or path.
3. **Wrap every error** — `fmt.Errorf("context: %w", err)`. Check with `errors.Is`, never type assertion.
4. **Sentinel errors** — `ErrNotFound`, `ErrConflict`, `ErrForbidden` defined in the service package.
5. **shadcn/ui only** — never native `<select>`, `<dialog>`, or `window.confirm()`. Use the components in `components/ui/`.
6. **i18n everywhere** — all UI text via `useLocale()`. No hardcoded strings (TH/EN).
7. **Dates via `formatDateTime()`** from `@/lib/dayjs` — never raw `toLocaleDateString()`. Thai locale uses Buddhist Era (พ.ศ.).
8. **camelCase IDs** — `userID`, `quizID`, `assessmentID`. Boolean fields use `Is*`/`Has*` prefix.
9. **Never commit secrets** — `.env*`, `firebase-sa.json`, credentials are git-ignored. Keep it that way.

---

## Project Structure

```
factory-health-check/
├── apps/
│   ├── fs-backend/        # Go + Chi + Firestore + Firebase Auth
│   ├── fs-app-web/        # React 19 + Redux Toolkit + Vite + shadcn/ui (authenticated app)
│   └── fs-official-web/   # Astro 6 + React islands + shadcn/ui (public marketing site)
├── packages/              # shared scripts/assets
├── docs/                  # architecture, api, design, development, operations, product
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # composite indexes
└── Makefile               # dev / build / test / lint entrypoints
```

### Backend layout (`apps/fs-backend/`)

```
fs-backend/
├── main.go               # Chi router + entrypoint
├── config/               # questions*.json (quiz configs), other config
├── middleware/           # FirebaseAuth middleware (GetUID)
├── pkg/                  # response.go, firestore.go, validator.go, turnstile.go
└── services/<name>/      # handler.go + service.go + models.go + service_test.go
    ├── admin/  audit/  dbd/  notification/
    └── profile/  quiz/  result/  scoring/
```

### Frontend layout (`apps/fs-app-web/src/`)

```
src/
├── pages/        # page-level components (AdminPage.tsx, etc.)
├── components/   # shared components — ui/ = shadcn
├── store/        # Redux Toolkit slices (<feature>Slice)
├── lib/          # i18n.tsx, dayjs.ts, utilities
└── hooks/        # custom hooks (useLocale, useQuizState, ...)
```

---

## Rules Files

Detailed rules live in `.claude/rules/` (path-gated where noted):

| File | Loads when | Covers |
|------|-----------|--------|
| `go.md` | editing `apps/fs-backend/**/*.go` | Chi routes, Firestore, Firebase Auth, response format, error handling |
| `react.md` | editing `apps/fs-app-web/**/*.{ts,tsx}` | shadcn/ui, Redux, i18n, dayjs, Tailwind, accessibility |
| `git.md` | always | branch naming, commit format, merge strategy, protected branches |
| `dev-process.md` | always | code-review checklist, naming conventions, architecture, quiz domain |

---

## Skills (slash commands)

Invoke with `/skill-name` in Claude Code.

| Skill | What it does |
|-------|-------------|
| `/code-review` | Review the current diff — 5-point checklist (security, best-practice, performance, correctness, maintainability) |
| `/commit` | Stage and commit with the proper `<type>(<scope>): description` format |
| `/shadcn` | Manage shadcn/ui components — add, search, fix, compose |

---

## Agents (specialist sub-agents in `.claude/agents/`)

| Agent | When to use |
|-------|------------|
| `backend-dev` | Go + Chi + Firestore + Firebase Auth — new endpoints, service logic, Firestore queries, backend bugs |
| `frontend-dev` | React + shadcn/ui + Redux Toolkit + i18n — UI components, pages, forms, frontend bugs |

---

## Workflows (`.claude/workflows/`)

| Workflow | Purpose |
|----------|---------|
| `feature-dev.js` | End-to-end feature: backend service → React frontend → review → verify |
| `feature-review.js` | Review a feature across the 5-point checklist, write `REVIEW.md` |
| `pull-request.js` | Full PR lifecycle: preflight → open PR (`gh`) → squash-merge into `develop` → cleanup |
| `branch-cleanup.js` | Prune stale refs; delete merged + gone branches (protects `main`/`staging`/`develop`) |
| `pre-release-audit.js` | Audit changed apps before a release tag (Go vet + race tests; Biome + tsc + Vitest + security scan) |
| `deploy-smoke-test.js` | Deploy changed frontend apps to Cloudflare Pages and verify each URL returns 200 |

---

## Development Commands

```bash
make dev            # API + web in parallel
make dev-api        # backend only (go run main.go)
make dev-web        # app web only (vite)
make build          # build backend + web
make test           # go test -race -cover ./...  +  vitest run
make test-api       # backend tests only
make test-web       # frontend tests only
make lint           # go vet  +  biome check
make lint-fix       # biome check --fix
make install        # npm install (fs-app-web)
make clean          # remove dist + vite cache
```

Per-app scripts (run inside `apps/<app>/`): `npm run dev`, `build`, `lint`, `test`, `test:e2e` (Playwright, app only).

---

## Git Workflow

See `.claude/rules/git.md` for full detail.

| Branch type | Format |
|-------------|--------|
| Feature | `feature/short-description` |
| Bug fix | `bugfix/short-description` |
| Hotfix | `hotfix/short-description` |
| Chore | `chore/short-description` |

Commit format: `<type>(<scope>): description` (≤72 chars, imperative, no trailing period).
Scopes: `quiz`, `scoring`, `admin`, `profile`, `result`, `dbd`, `audit`, `notification`, `web`.

| Source → Target | Method |
|-----------------|--------|
| `feature/*` / `bugfix/*` → `develop` | Squash Merge (or fast-forward) |
| `develop` → `staging` | Fast-forward |
| `staging` → `main` | Fast-forward / Merge (protected) |
| `hotfix/*` → `main` | Merge Commit |

Never commit directly to `main`. Never force-push `main`.

---

## Quiz / Scoring Domain

- **8-dimension Shindan rubric-based assessment** — multi-quiz.
- Quiz configs: `apps/fs-backend/config/questions*.json` — one per variant (`questions.json`, `questions-factory.json`, `questions-cybersecurity.json`, `questions-lean.json`).
- Scoring logic: `apps/fs-backend/services/scoring/`.
- Results stored per-user in Firestore.

---

## Deployment

Frontend deploys to **Cloudflare Pages** via Wrangler. Backend + release deploys are driven by **git tags** through GitHub Actions.

```bash
# Frontend (Cloudflare Pages)
npm run deploy:staging        # app-web + official-web → staging projects
npm run deploy:prod           # app-web + official-web → production projects

# Tag-driven release (GitHub Actions)
git tag v1.2.3-staging && git push origin v1.2.3-staging   # → staging deploy
git tag v1.2.3 && git push origin v1.2.3                   # → production deploy
```

Always verify on staging before tagging production.

---

## Compact Instructions

Preserve when compacting:
- Response helpers `pkg.RespondJSON/RespondList/RespondError` — never raw JSON
- UID only from `middleware.GetUID(r.Context())` — never request body
- Wrap errors `fmt.Errorf("ctx: %w", err)`; check with `errors.Is`; sentinels `ErrNotFound/ErrConflict/ErrForbidden`
- shadcn/ui only · `useLocale()` for all text · `formatDateTime()` for dates (Buddhist Era for TH)
- camelCase IDs (`userID`, `quizID`) · `Is*`/`Has*` booleans
- Commit: `<type>(<scope>): description` · branches `feature/*` → `develop` → `staging` → `main`
- Tags: `v*-staging` → staging, `v*.*.*` → production · frontend via Cloudflare Pages (Wrangler)
- Never commit `.env*`, `firebase-sa.json`, credentials
- Quiz: 8-dimension Shindan rubric, multi-quiz configs in `apps/fs-backend/config/questions*.json`

---

*Version: 1.0.0*
*Last updated: 09 June 2026*
