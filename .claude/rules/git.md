---
description: Git workflow rules — branch naming, commit format, workflow commands, merge strategy
---

# Git Rules

## CRITICAL — Protected Branches

**NEVER commit or push directly to `main`, `staging`, or `develop`.**

All code changes go through a feature branch first:

```
feature/<name>  →  develop  →  staging  →  main
```

Before making any change, check the current branch:
```bash
git branch --show-current
```

If you are on `main`, `staging`, or `develop` — **stop**. Create a feature branch:
```bash
git checkout -b feature/<short-description>
```

Only these operations are allowed directly on protected branches:
- Fast-forward merges during release promotion (`git merge --ff-only`)
- Creating/pushing release tags

Violating this rule means manually syncing all three branches and may break CI deploys.

---

## Branch Naming

Format: `<type>/<short-description>`

```
feature/add-quiz-dimension-weights
bugfix/fix-scoring-calculation
hotfix/fix-auth-middleware
docs/update-api-docs
refactor/extract-scoring-service
chore/bump-dependencies
```

## Commit Messages

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

```
feat(quiz): add multi-quiz support
fix(scoring): correct dimension weight calculation
docs(api): update quiz endpoint docs
test(result): add service layer coverage
```

Rules:
- Max 72 characters
- Imperative mood ("add" not "added")
- No period at end
- Scope matches area of change (quiz, scoring, admin, profile, result, dbd, audit, notification, web)

## Workflow

```bash
git checkout main && git pull origin main
git checkout -b feature/short-description
git add <specific-files>
git commit -m "feat(scope): description"
git push -u origin feature/short-description
# Open PR → merge to main
```

## Branch Strategy

```
feature/* → develop   (squash/ff)   day-to-day work integrates here
develop   → staging   (fast-forward) promote a release candidate
staging   → main       (merge)       promote to production (protected)
```

- `develop` — active integration branch; all feature/bugfix branches land here first
- `staging` — release candidate; tagged `v*-staging` to deploy & verify on staging
- `main` — production (protected); tagged `v*.*.*` to deploy to production

## Deployment (via tags)

```
v*-staging   → staging environment (GitHub Actions)
v*.*.*       → production environment (GitHub Actions)
```

## Release Promotion

Promote a release through staging before production. Bump the minor for
features, patch for fixes (latest tag wins — check `git tag --sort=-creatordate`).

```bash
# 1. Promote develop → staging (fast-forward) and deploy to staging
git checkout staging && git merge --ff-only develop
git push origin staging
git tag -a vX.Y.Z-staging -m "Release vX.Y.Z to staging: <summary>"
git push origin vX.Y.Z-staging        # → triggers staging deploy

# 2. VERIFY on staging (smoke test the deployed URLs) before continuing.

# 3. Promote staging → main and deploy to production
git checkout main && git merge --ff-only staging   # or open a PR if main is protected
git push origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z: <summary>"
git push origin vX.Y.Z                 # → triggers production deploy
```

> If `main` has diverged and its commits are superseded (e.g. a structural
> rebrand on `develop`), reconcile so the new tree wins while keeping main's
> history: branch off the release tip, `git merge -s ours main`, then
> fast-forward `main` to it. Verify `git diff --stat develop main` is empty
> before pushing.

## Merge Strategy

| Source → Target | Method |
|-----------------|--------|
| `feature/*` → `develop` | Squash Merge (or fast-forward) |
| `bugfix/*` → `develop` | Squash Merge |
| `develop` → `staging` | Fast-forward |
| `staging` → `main` | Fast-forward / Merge |
| `hotfix/*` → `main` | Merge Commit |

## Branch Cleanup After Merge (MANDATORY)

After any feature/bugfix branch is merged into `develop`, **delete it both locally and on the remote**:

```bash
# 1. Switch to develop and pull the merge commit
git checkout develop
git pull origin develop

# 2. Delete the local branch (squash merges need -D)
git branch -D feature/<name>

# 3. Delete the remote branch
git push origin --delete feature/<name>

# 4. Prune stale remote-tracking refs
git fetch origin --prune
```

The `pull-request.js` workflow does all of this automatically in its Cleanup phase.

**Never leave merged branches around** — they litter `git branch -a` and create confusion about what's in-flight.

## Rules

- Check current branch before making changes
- Never force push to `main`
- Create feature branches for all code changes — never commit directly to `main`, `staging`, or `develop`
- Promote releases through `staging` and verify before tagging `main` for production
- Delete feature/bugfix branches locally AND remotely immediately after merging into `develop`
- Never commit `.env*`, `firebase-sa.json`, or any credentials

*Version: 1.2.0*
*Last updated: 11 June 2026*
