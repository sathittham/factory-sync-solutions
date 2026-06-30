---
description: Stage, commit with project convention, and push to remote — groups files logically, enforces commit message format
disable-model-invocation: true
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git branch:*), Bash(git log:*), Bash(git fetch:*), Bash(grep:*), Bash(ls:*), Read, TodoWrite
---

# Commit Skill

You are a disciplined git operator for the Factory Health Check monorepo. Stage changed files logically, write a commit message in project format, and push to the remote. Never use `git add -A`. Never force push.

## Context

- Current branch: !`git branch --show-current`
- Status: !`git status --short`
- Unstaged diff summary: !`git diff --stat`
- Staged diff summary: !`git diff --cached --stat`
- Last 3 commits: !`git log --oneline -3`

## How to Use This Skill

```
/commit                              # Commit all changed files with auto-generated message
/commit "fix scoring calculation"    # Use provided description
```

## Commit Message Format

```
<type>(<scope>): <description>

Co-Authored-By: <current Claude Code co-author trailer>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

**Rules:**
- Description ≤ 72 characters
- Imperative mood: "add" not "added", "fix" not "fixed"
- No period at end
- Scope = area of change (quiz, scoring, admin, profile, result, dbd, notification, web, api, ci)

**Examples:**
```
feat(quiz): add multi-quiz support with dimension weights
fix(scoring): correct rubric calculation for dimension 3
docs(api): update quiz submission endpoint docs
test(result): add service layer coverage for edge cases
chore(deps): bump firebase-admin to v4.19.0
ci(deploy): add staging deployment workflow
```

---

## Your Task

### Step 0 — Branch guard (MANDATORY)

**Before doing anything else**, check the current branch:

```bash
git branch --show-current
```

If the current branch is `main`, `staging`, or `develop` — **STOP**. Do not stage or commit anything. Tell the user:

> "You are on `<branch>`, which is a protected branch. Create a feature branch first:
> `git checkout -b feature/<short-description>`"

Only proceed once confirmed to be on a `feature/*`, `bugfix/*`, `hotfix/*`, `docs/*`, `refactor/*`, or `chore/*` branch.

---

### Step 1 — Determine scope and type

Inspect `git status --short` and `git diff --stat`:

**Type:**
| Changed files | Likely type |
|--------------|------------|
| New feature logic in handler/service | `feat` |
| Bug fix in existing logic | `fix` |
| Only `.md` files, docs | `docs` |
| Only test files | `test` |
| Renamed, reorganized without logic change | `refactor` |
| `go.mod`, `package.json`, CI config | `build` or `ci` |
| Performance improvement | `perf` |

**Scope:**
- `apps/backend/services/quiz/` → `quiz`
- `apps/backend/services/scoring/` → `scoring`
- `apps/backend/services/admin/` → `admin`
- `apps/backend/services/result/` → `result`
- `apps/backend/services/profile/` → `profile`
- `apps/backend/services/dbd/` → `dbd`
- `apps/backend/services/audit/` → `audit`
- `apps/backend/services/notification/` → `notification`
- `apps/web-app/src/pages/QuizPage.tsx` → `web` or `quiz`
- `apps/web-official/` → `web`
- `.github/workflows/` → `ci`
- `.claude/` → `chore`
- Multiple areas → use the primary area

### Step 2 — Group files into logical commits

If changes span multiple concerns, create **separate commits** in this order:

| Group | Files | Commit type |
|-------|-------|------------|
| 1. Feature code | `*.go`, `*.tsx`, `*.ts` | `feat`/`fix`/`refactor` |
| 2. Tests | `*_test.go`, `*.test.ts`, `*.spec.ts` | `test` |
| 3. Config/build | `go.mod`, `go.sum`, `package.json`, `Makefile` | `build` |
| 4. Documentation | `*.md`, swagger annotations | `docs` |
| 5. CI/tooling | `.github/`, `.claude/`, `biome.json` | `ci`/`chore` |

### Step 3 — Stage specific files

**NEVER use `git add -A` or `git add .`** — always add specific files or directories:

```bash
# Good
git add apps/backend/services/quiz/handler.go
git add apps/backend/services/quiz/service.go

# Also acceptable — scoped directory
git add apps/backend/services/quiz/

# Never
git add -A
git add .
```

Before staging, check for files that should NOT be committed:
- `.env`, `.env.local`, `.env.staging`, `.env.production` — secrets
- `firebase-sa.json` — Firebase service account credentials
- `coverage.out`, `*.out`, `*.tmp` — generated artifacts
- `apps/web-app/dist/`, `apps/web-app/node_modules/.vite/` — build artifacts

If any such files appear in `git status`, warn the user and exclude them.

### Step 4 — Commit with project format

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

Co-Authored-By: <model-trailer-from-harness>
EOF
)"
```

If a pre-commit hook fails — **fix the issue, then create a NEW commit**. Never use `--no-verify`.

### Step 5 — Push to remote

```bash
git push origin <current-branch>
```

If no upstream yet:
```bash
git push -u origin <current-branch>
```

**NEVER** push directly to `main`, `staging`, or `develop`. If currently on any of these protected branches, stop and warn the user — see Step 0.

### Step 6 — Confirm

```bash
git log --oneline -1
```

---

## Safety Rules

- **NEVER** `git add -A` or `git add .`
- **NEVER** `git push --force` or `git push -f`
- **NEVER** `--no-verify` (skip hooks)
- **NEVER** commit `.env*`, `firebase-sa.json`, `coverage.out`, or secrets
- **NEVER** push directly to `main`, `staging`, or `develop`
- **ALWAYS** create a new commit after hook failure — never amend
- If anything is unclear, ask before acting
