---
description: Git workflow rules — branch naming, commit format, workflow commands, merge strategy
---

# Git Rules

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
- Scope matches area of change (quiz, scoring, admin, profile, result, dbd, notification, web)

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
main     → Production (protected, requires PR)
```

## Deployment (via tags)

```
v*-staging   → staging environment (GitHub Actions)
v*.*.*       → production environment (GitHub Actions)
```

## Merge Strategy

| Source → Target | Method |
|-----------------|--------|
| `feature/*` → `main` | Squash Merge |
| `bugfix/*` → `main` | Squash Merge |
| `hotfix/*` → `main` | Merge Commit |

## Rules

- Check current branch before making changes
- Never force push to `main`
- Create feature branches for all code changes — never commit directly to `main`
- Delete branches after merge
- Never commit `.env*`, `firebase-sa.json`, or any credentials

*Version: 1.0.0*
*Last updated: 04 June 2026*
