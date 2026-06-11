---
description: Rebuild and deploy frontend apps directly to Cloudflare Pages — staging or production
allowed-tools: Bash(npm run *), Bash(cd *), Bash(git branch:*), Bash(git status:*), Read, TodoWrite
---

# Deploy Skill

Rebuild and deploy one or more frontend apps directly to Cloudflare Pages.
This is a **forced rebuild + deploy** — it does NOT check for changed files.

## Context

- Current branch: !`git branch --show-current`
- Git status (check for uncommitted changes): !`git status --short`

## Usage

```
/deploy staging               # deploy ALL apps to staging
/deploy prod                  # deploy ALL apps to production
/deploy staging fs-app-web    # deploy only fs-app-web to staging
/deploy prod fs-backoffice-web fs-official-web   # deploy two apps to production
```

## App Registry

| App | Directory | Staging script | Prod script |
|-----|-----------|---------------|-------------|
| `fs-app-web` | `apps/fs-app-web` | `deploy:staging` | `deploy:prod` |
| `fs-backoffice-web` | `apps/fs-backoffice-web` | `deploy:staging` | `deploy:prod` |
| `fs-official-web` | `apps/fs-official-web` | `deploy:staging` | `deploy:prod` |

`fs-backend` is excluded — it deploys via Docker/Cloud Run, not Cloudflare Pages.

---

## Your Task

### Step 0 — Parse intent

From the user's message, determine:
- **env**: `staging` or `prod` (required — if ambiguous, ask)
- **apps**: list from the App Registry above. If none specified → deploy ALL three apps.

If **env** is `prod`, emit a warning:
> "Deploying to PRODUCTION. Project rule: always verify on staging first."

### Step 1 — Pre-flight checks

1. Run `git status --short`. If there are uncommitted changes, warn the user:
   > "You have uncommitted changes. They will NOT be included in this deploy (the deploy scripts build from the working tree). Consider committing first."
   Do NOT abort — warn only, then continue.

2. Never abort a deploy because of branch state — manual deploys are intentional overrides.

### Step 2 — Deploy each app (sequentially)

For each target app, run its deploy script from the repo root:

```bash
cd apps/<dir> && npm run <script>
```

**Run apps one at a time (sequential, not parallel).** Concurrent `wrangler` runs against the same Cloudflare account can race on auth tokens and fail.

Example for staging, all apps:
```bash
cd apps/fs-app-web && npm run deploy:staging
cd apps/fs-backoffice-web && npm run deploy:staging
cd apps/fs-official-web && npm run deploy:staging
```

Each deploy script already runs `tsc -b && vite build` (or `astro build`) before calling `wrangler pages deploy` — no separate build step needed.

Wait for each command to complete fully. Do NOT terminate early — Cloudflare uploads can take 2–5 minutes per app.

### Step 3 — Report results

After all deploys finish, report:

| App | Status | URL |
|-----|--------|-----|
| `fs-app-web` | ✓ deployed / ✗ failed | `<wrangler output URL>` |
| `fs-backoffice-web` | ✓ deployed / ✗ failed | `<wrangler output URL>` |
| `fs-official-web` | ✓ deployed / ✗ failed | `<wrangler output URL>` |

For failures, include the last 10 lines of output so the user can diagnose.

---

## Safety Rules

- **NEVER** skip the build step — deploy scripts include it automatically
- **NEVER** run deploys in parallel — sequential only to avoid Cloudflare auth races
- **NEVER** deploy `fs-backend` with this skill — it has its own pipeline
- For production deploys, always remind the user to have verified on staging first
