---
name: release-flow
description: FactorySync Solutions release promotion workflow. Use when asked to merge or promote a feature branch to staging, promote staging to production, run both staging and production promotion, create release version tags, push release branches or tags, or explain the repo release flow.
---

# FactorySync Release Flow

## Core Workflow

Use this skill for FactorySync repository releases only. The normal branch path is:

`feature/*` -> `develop` -> `staging` + `vX.Y.Z-staging` -> `main` + `vX.Y.Z`

Before release work:

1. Confirm the working tree is clean with `git status --branch --short`.
2. Fetch remote branches and tags with `git fetch origin --prune --tags`.
3. Inspect latest tags with `git tag --list --sort=-v:refname`.
4. Choose the next semantic version from existing repo tags unless the user specified one.
5. If `origin/main` has commits not in `develop`, merge `origin/main` back into `develop` before promoting to `staging`.

## Preferred Script

Use `scripts/release-flow.sh` with one of three targets:

```bash
.agents/skills/release-flow/scripts/release-flow.sh --target staging --feature feature/ux-improvements --version v0.8.1
.agents/skills/release-flow/scripts/release-flow.sh --target production --version v0.8.1
.agents/skills/release-flow/scripts/release-flow.sh --target both --feature feature/ux-improvements --version v0.8.1
```

The script:

- refuses dirty worktrees;
- fetches `origin --prune --tags`;
- verifies the required remote branches exist;
- verifies the target tag does not already exist locally or remotely;
- for `staging`, fast-forwards `develop` from the feature branch, reconciles `origin/main` into `develop` if needed, pushes `develop`, fast-forwards `staging`, and creates/pushes `vX.Y.Z-staging`;
- for `production`, fast-forwards local `staging` from `origin/staging`, fast-forwards `main` from staging, and creates/pushes `vX.Y.Z`;
- for `both`, runs the staging path and then the production path;
- prints a final branch/tag summary.

Use `--dry-run` to print the plan without changing branches, tags, or remotes.

## Manual Workflow

Use this when the script is not appropriate or a conflict needs manual resolution:

### Staging

```bash
git status --branch --short
git fetch origin --prune --tags

git switch develop
git merge --ff-only origin/<feature-branch>
git merge --no-edit origin/main   # only if origin/main has commits not in develop
git push origin develop

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

For a full release, run staging first, verify staging, then run production.

## Guardrails

- Never use `git reset --hard`, `git clean`, force-push, or delete tags unless the user explicitly requests a recovery or rollback plan.
- Do not create a production tag before the staging tag is pushed.
- Do not skip the `origin/main` reconciliation check. This repo has had `main` production fixes that were not on `develop` or `staging`.
- If any merge conflicts occur, stop and report the files. Resolve only after inspecting the conflict.
- Keep deploy commands separate from release tagging. Tags trigger GitHub Actions deployment workflows.

## Verification

After promotion, confirm:

```bash
git branch -vv --list develop staging main
git tag --points-at HEAD
git status --branch --short
```

Expected final state after a production release:

- `develop`, `staging`, and `main` point at the same commit.
- `vX.Y.Z-staging` and `vX.Y.Z` point at that commit.
- The working tree is clean.
