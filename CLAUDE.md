# FactorySync Solutions — Factory Health Check

Multi-quiz factory health assessment platform. Go + Chi + Firestore backend, React + shadcn/ui app, Astro public site. Read this file first; dive into `.claude/rules/` for path-specific detail.

---

## Non-Negotiable Rules

1. **Response helpers** — always `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError`. Never write raw JSON.
2. **UID from context only** — `middleware.GetUID(r)` (extracts the verified UID from the request context). Never read the user ID from the request body or path.
3. **Wrap every error** — `fmt.Errorf("context: %w", err)`. Check with `errors.Is`, never type assertion.
4. **Sentinel errors** — domain-specific per service (`ErrProfileNotFound`, `ErrAlreadyRegistered`, `ErrResultNotFound`, `ErrQuizNotFound`, …), not generic `ErrNotFound`.
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
├── middleware/           # auth (FirebaseAuth/GetUID), cors, ratelimit, security
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
| `/deploy staging` | Rebuild and deploy all (or named) frontend apps to Cloudflare Pages staging |
| `/deploy prod` | Rebuild and deploy all (or named) frontend apps to Cloudflare Pages production |
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
| `release-staging.js` | Promote develop → staging and push `vX.Y.Z-staging` tag; auto-detects semver bump |
| `release-production.js` | Promote staging → main and push `vX.Y.Z` tag; derives version from latest staging tag |
| `release.js` | Full release shortcut: runs `release-staging` then `release-production` in sequence |

---

## Commands

`make dev` (API + web parallel) · `dev-api` · `dev-web` · `build` · `test` · `test-api` · `test-web` · `lint` · `lint-fix` · `install` · `clean`. Per-app: `cd apps/<app> && npm run <dev|build|lint|test|test:e2e>`. Full list in the [Makefile](Makefile).

## Git & Releases

Full detail in `.claude/rules/git.md` (always loaded). Essentials:

- **Commit**: `<type>(<scope>): description` — ≤72 chars, imperative, no trailing period. Scopes: `quiz scoring admin profile result dbd audit notification web`.
- **Branch flow**: `feature/*` · `bugfix/*` → `develop` → `staging` → `main`. Never commit directly to or force-push `main`.
- **Deploys**: frontend → Cloudflare Pages via `npm run deploy:staging` / `deploy:prod`. Releases via git tags through GitHub Actions: `v*-staging` → staging, `v*.*.*` → production. Verify staging before tagging production.

## Quiz / Scoring Domain

8-dimension Shindan rubric-based assessment, multi-quiz. Configs: `apps/fs-backend/config/questions*.json` (one per variant). Scoring: `apps/fs-backend/services/scoring/`. Results stored per-user in Firestore. Detail in `.claude/rules/dev-process.md`.

<!-- Version: 1.2.0 · Last updated: 09 June 2026 -->

