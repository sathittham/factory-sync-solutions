---
version: 1.0.1
lastUpdated: 2026-06-14
author: Sathittham Sangthong
---

# Release Flow

FactorySync releases promote a feature branch through integration, staging, and production:

`feature/*` -> `develop` -> `staging` + `vX.Y.Z-staging` -> `main` + `vX.Y.Z`

Release tags trigger GitHub Actions deployments:

| Tag | Deploys |
|-----|---------|
| `vX.Y.Z-staging` | Staging |
| `vX.Y.Z` | Production |

## Automated Promotion

Use the repo-local Codex skill script:

```bash
.agents/skills/release-flow/scripts/release-flow.sh --target staging --feature feature/ux-improvements --version v0.8.1
.agents/skills/release-flow/scripts/release-flow.sh --target production --version v0.8.1
.agents/skills/release-flow/scripts/release-flow.sh --target both --feature feature/ux-improvements --version v0.8.1
```

Preview without changing branches, tags, or remotes:

```bash
.agents/skills/release-flow/scripts/release-flow.sh --target staging --feature feature/ux-improvements --version v0.8.1 --dry-run
```

The script checks for a clean worktree, fetches branches and tags, rejects duplicate tags, promotes branches, deletes the merged feature branch after `develop` is pushed, creates tags, pushes to `origin`, and prints a final status summary.

## Manual Promotion

### Staging

```bash
git status --branch --short
git fetch origin --prune --tags

git switch develop
git merge --ff-only origin/<feature-branch>
git merge --no-edit origin/main   # only if main has production-only commits
git push origin develop
git branch -d <feature-branch>
git push origin --delete <feature-branch>

git switch staging
git merge --ff-only develop
git tag vX.Y.Z-staging
git push origin staging vX.Y.Z-staging
```

### Production

```bash
git status --branch --short
git fetch origin --prune --tags

git switch staging
git merge --ff-only origin/staging
git switch main
git merge --ff-only origin/main
git merge --ff-only staging
git tag vX.Y.Z
git push origin main vX.Y.Z
```

For a full release, run staging first, verify staging, then run production. The `both` target runs the staging path and then the production path in one guarded command.

## Checks

Before tagging:

```bash
git tag --list --sort=-v:refname
git tag --list 'vX.Y.Z*'
```

After production push:

```bash
git branch -vv --list develop staging main
git tag --points-at HEAD
git status --branch --short
```

Expected final state:

- `develop`, `staging`, and `main` point to the same commit.
- `vX.Y.Z-staging` and `vX.Y.Z` point to that commit.
- The working tree is clean.

## Guardrails

- Do not force-push release branches.
- Do not delete or overwrite tags without a rollback plan.
- Delete feature branches only after they have been merged into `develop` and `develop` has been pushed.
- Do not use `git reset --hard` or `git clean` as part of normal release work.
- Reconcile production-only `main` commits into `develop` before promoting to `staging`.
