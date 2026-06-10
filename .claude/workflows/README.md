# Workflows

Workflows are multi-agent automation scripts that fan out work across many agents in parallel. They handle complex tasks that are too large for a single agent — full-stack feature builds, multi-app release audits, deploy + smoke test.

## How to Trigger

Workflows are **user-invocable only** — never triggered automatically. Use the slash command prefix or the `Workflow` tool:

```
/feature-dev FHC-123 quiz history list page
/pre-release-audit
```

> These commands consume significant tokens (many agents fan out). Only run when intentional. Pass a budget cap like `+200k` to bound spending.

---

## Project Shape

This is a full-stack monorepo, so the workflows cover both halves of the stack:

| App | Path | Stack | Deploys to |
|-----|------|-------|-----------|
| `fs-backend` | `apps/fs-backend` | Go + Chi + Firestore + Firebase Auth | Cloud Run / Docker (separate) |
| `fs-app-web` | `apps/fs-app-web` | React + shadcn/ui + Redux + Vite | Cloudflare Pages |
| `fs-official-web` | `apps/fs-official-web` | Astro | Cloudflare Pages |

Workflows route Go work to the `backend-dev` agent and React/Astro work to `frontend-dev` (see `.claude/agents/`).

---

## Available Workflows

### `feature-dev`
**File**: `feature-dev.js`

Autonomous full-stack feature implementation. Explores existing patterns, builds the Go service (`models → service → handler → tests`), then the React frontend (`types → api → store → components → i18n → routes`), runs `go test` / `tsc` / `biome` / `vitest`, and finishes with a 5-point checklist review.

```javascript
Workflow({ name: 'feature-dev', args: {
  ticket: 'FHC-123',
  description: 'Quiz history list page with per-assessment detail',
  service: 'result',        // backend service dir under apps/fs-backend/services/
  scope: 'full',            // 'backend' | 'frontend' | 'full'  (default: full)
}})
```

Use when: Implementing a feature end-to-end. Set `scope` to `backend` or `frontend` to build just one half.

---

### `feature-review`
**File**: `feature-review.js`

Deep review of an existing feature across the 5-point checklist (security → best-practice → performance → correctness → maintainability). One reviewer per dimension in parallel, every finding **adversarially verified** before it's reported, then a `REVIEW.md` is written with a production-readiness verdict.

```javascript
Workflow({ name: 'feature-review', args: {
  feature: 'quiz',
  service: 'quiz',                      // backend dir (optional, defaults to feature)
  reviewDoc: 'docs/reviews/quiz-REVIEW.md',  // optional output path
}})
```

Use when: Auditing a completed feature before release, or checking for spec drift after a change.

---

### `pre-release-audit`
**File**: `pre-release-audit.js`

Runs the right checks per changed app before any release tag. Automatically expands to all apps if shared code (`packages/`, `firestore.rules`, `firestore.indexes.json`) changed.

```javascript
Workflow({ name: 'pre-release-audit', args: { base: 'main' } })
```

Checks per app:
| App kind | Lint | Types/Build | Tests | Security scan |
|----------|------|-------------|-------|---------------|
| Go (`fs-backend`) | `go vet ./...` | `go build ./...` | `go test -race -cover ./...` | UID-from-body, raw JSON vs `pkg.Respond*`, hardcoded secrets |
| React (`fs-app-web`) | `biome check .` | `tsc -b --noEmit` | `vitest run` | tokens in localStorage, hardcoded API URLs, private keys |
| Astro (`fs-official-web`) | `biome check .` | `astro check` | `vitest run` | same as React |

Use when: About to cut a release tag (`v*-staging` or `v*.*.*`).

---

### `deploy-smoke-test`
**File**: `deploy-smoke-test.js`

Builds and deploys changed frontend apps to Cloudflare Pages, then verifies each URL returns 200 with valid HTML. (`fs-backend` is skipped — it deploys separately.)

```javascript
Workflow({ name: 'deploy-smoke-test', args: { base: 'main', env: 'staging' } })
```

| App | Env | URL | CF Project |
|-----|-----|-----|-----------|
| fs-app-web | staging | https://factory-sync-solutions-staging.pages.dev | factory-sync-solutions-staging |
| fs-app-web | prod | https://factory-sync-solutions.pages.dev | factory-sync-solutions |
| fs-official-web | staging | https://factory-sync-solutions-official-staging.pages.dev | factory-sync-solutions-official-staging |
| fs-official-web | prod | https://factory-sync-solutions-official.pages.dev | factory-sync-solutions-official |

Use when: After pushing changes, to confirm the deploy is live and healthy.

---

### `pull-request`
**File**: `pull-request.js`

Full PR lifecycle for a feature/bugfix branch: preflight (refuses protected branches and uncommitted changes, pushes if needed) → derive a conventional title + body from the commits and open the PR with `gh` → **squash** merge into `develop` and delete the source branch → checkout `develop`, pull, prune. Matches the `feature/* → develop` squash-merge rule in `.claude/rules/git.md`.

```javascript
Workflow({ name: 'pull-request', args: {
  ticket: 'FHC-123',     // optional — auto-extracted from branch/commits otherwise
  title:  'custom title', // optional — overrides the derived title
  base:   'develop',      // optional — target branch (default: develop)
  remote: 'origin',       // optional (default: origin)
}})
```

Use when: A feature/bugfix branch is ready to integrate into `develop`.

---

### `branch-cleanup`
**File**: `branch-cleanup.js`

Prunes stale tracking refs and deletes branches already merged into `develop` plus local branches whose remote is gone. **Never** deletes `main`, `staging`, `develop`, or the current branch. Shows planned deletions before executing (remote deletes are irreversible).

```javascript
Workflow({ name: 'branch-cleanup', args: {
  base:   'develop',  // optional — merge-base to test against (default: develop)
  remote: 'origin',   // optional (default: origin)
}})
```

Use when: Periodic housekeeping after merges pile up stale branches.

---

## Recommended Flow

```
feature-dev (per feature) → feature-review → pull-request → pre-release-audit → deploy-smoke-test
                                                  ↓
                                          branch-cleanup (housekeeping)
```

---

## Workflow File Format

```javascript
export const meta = {
  name: 'workflow-name',
  description: 'One-line description shown in the permission dialog',
  phases: [
    { title: 'Phase 1', detail: 'what happens here' },
    { title: 'Phase 2', detail: 'what happens here' },
  ],
}

phase('Phase 1')
const results = await pipeline(
  items,
  item => agent(`prompt for ${item}`, { label: `task:${item}`, phase: 'Phase 1', agentType: 'backend-dev', schema: SCHEMA })
)
```

### Key primitives
- `agent(prompt, opts)` — spawn a single agent (use `schema` to get validated structured output back)
- `pipeline(items, ...stages)` — process items through stages with no barrier (default)
- `parallel(thunks)` — run tasks concurrently with a barrier (when all results are needed together)
- `phase(title)` — group subsequent agents under a phase in the progress display
- `log(message)` — emit a progress line to the user
- `budget` — token budget (`budget.total`, `budget.remaining()`); pass `+200k` to cap a run

### agentType options
Project agents in `.claude/agents/` — use the agent `name` field:
`backend-dev` (Go), `frontend-dev` (React/Astro).
Built-in helpers: `Explore`, `feature-dev:code-explorer`, `feature-dev:code-architect`, `feature-dev:code-reviewer`, `general-purpose`.

---

*Version: 1.1.0*
*Last updated: 10 June 2026*
