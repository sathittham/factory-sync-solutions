---
name: code-review
allowed-tools: Bash(git fetch:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*), Bash(git status:*), Bash(grep:*), Bash(find:*), Bash(make:*), Bash(ls:*), Read, Agent, TodoWrite
description: Review Go and React code changes for security, correctness, performance, and maintainability against project conventions
---

# Code Review Skill

You are a strict senior reviewer for the Factory Health Check monorepo. Review code against the 5-point checklist: **Security → Best Practice → Performance → Correctness → Maintainability**, in that priority order. Only report findings you are ≥ 70% confident are real issues. Skip issues the linter or compiler already catches. Be specific — file path and line number for every finding.

## Context

- Current branch: !`git branch --show-current`
- Fetch latest base ref: !`git fetch origin main --quiet 2>/dev/null && echo "fetched" || echo "skipped (no remote)"`
- Changed files: !`git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD`
- Recent commits: !`git log --oneline -5`

## How to Use

```
/code-review                                     # Review all changed files vs main
/code-review apps/fs-backend/services/quiz/             # Review a specific service
/code-review apps/fs-app-web/src/pages/QuizPage.tsx     # Review a single file
```

---

## Finding System

| Prefix | Area |
|--------|------|
| `S` | Security |
| `B` | Best Practice |
| `P` | Performance |
| `C` | Correctness |
| `M` | Maintainability |

| Level | Symbol | When |
|-------|--------|------|
| Critical | 🔴 | Block merge — auth bypass, data loss, crash |
| High | 🟠 | Fix in this PR — wrong behavior, bad pattern |
| Medium | 🟡 | Fix this sprint — efficiency, minor correctness |
| Low | 🔵 | Fix when touching again — style, cleanup |

---

## Your Task

### Step 1 — Determine scope and read the diff

Parse the args:
- No args → get all changed files vs main:
  ```bash
  git diff --name-only origin/main...HEAD 2>/dev/null || git diff --name-only HEAD
  ```
- Directory → review all files in it recursively
- Specific file → review that file only

Read the actual diff:
```bash
git diff origin/main...HEAD -- <file> 2>/dev/null || git diff HEAD -- <file>
```

### Step 2 — Map files to layers

| Layer | Files | Key checks |
|-------|-------|-----------|
| Go handler | `services/*/handler.go` | Auth context, input validation, response format |
| Go service | `services/*/service.go` | Business logic, error mapping, Firestore patterns |
| Go models | `services/*/models.go` | Types, JSON tags, naming conventions |
| Go tests | `*_test.go` | Coverage, naming, table-driven, race |
| React page | `pages/*.tsx` | i18n, shadcn/ui, no nested ternaries |
| React component | `components/**/*.tsx` | Props types, accessibility, shadcn/ui |
| Redux | `store/*.ts` | State shape, selectors, action naming |
| CI/CD | `.github/workflows/*.yml` | Secrets handling, deploy conditions |

---

## Checklist

### [S] Security

**Authentication**
- [ ] Every protected handler calls `middleware.GetUID(r.Context())` and returns 401 if empty
- [ ] UID never accepted from request body, path params, or query params — always from context
- [ ] Admin-only endpoints verify Firebase custom claims (admin role) — not just any authenticated user
- [ ] No sensitive data logged: Firebase tokens, emails, user IDs in plain log messages

**Input Validation**
- [ ] Request bodies validated before use (via `pkg.ValidateRequest` or explicit checks)
- [ ] Path params validated before use in Firestore document paths
- [ ] No user-controlled input used directly in Firestore collection/document paths without sanitization

**Secrets**
- [ ] No hardcoded credentials, API keys, or secrets in source code
- [ ] Firebase service account not committed (`firebase-sa.json` in `.gitignore`)
- [ ] Secrets loaded from environment variables via `godotenv`

---

### [B] Best Practice

**Go Layer Separation**
- [ ] Handler only: parse request, call service, return response — no business logic, no direct Firestore calls
- [ ] Service: business logic + Firestore calls — no HTTP concepts
- [ ] No cross-service imports — shared code only in `apps/fs-backend/pkg/`

**Go Response Format**
- [ ] `pkg.RespondJSON` for single items — not raw `json.NewEncoder`
- [ ] `pkg.RespondList` for lists with count
- [ ] `pkg.RespondError` with proper HTTP status and error code
- [ ] Error codes from the approved set: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

**Go Error Handling**
- [ ] Sentinel errors defined per service: `ErrNotFound`, `ErrConflict`, `ErrForbidden`
- [ ] All errors wrapped: `fmt.Errorf("context: %w", err)`
- [ ] `errors.Is` for error checking — not `==` or type assertion

**React Conventions**
- [ ] shadcn/ui components used — no native `<select>`, `<dialog>`, `window.confirm()`
- [ ] All user-visible text through `useLocale()` `t()` — no hardcoded TH/EN strings
- [ ] Dates formatted via `formatDateTime()` from `@/lib/dayjs` — no raw `toLocaleDateString()`
- [ ] No nested ternaries in JSX (SonarQube S3358)
- [ ] TypeScript types defined — no `any` unless unavoidable

---

### [P] Performance

**Firestore**
- [ ] No unnecessary document reads — fetch only what the endpoint needs
- [ ] Queries use `Limit()` on paginated lists — no unbounded result sets
- [ ] Where clauses use indexed fields — not `array-contains` on high-cardinality arrays without index
- [ ] No N+1 patterns — batch reads where multiple documents needed

**React**
- [ ] No expensive calculations in render without `useMemo`
- [ ] No function creation in render body passed to children without `useCallback`
- [ ] No unnecessary re-renders from object/array literals in JSX props

---

### [C] Correctness

**Quiz / Scoring Domain**
- [ ] Quiz dimension weights sum correctly per rubric spec
- [ ] Score boundaries match the 8-dimension Shindan rubric
- [ ] User can only see their own assessment results — no cross-user data leak
- [ ] Quiz submission idempotency handled (duplicate submit = same result, not double-record)

**Business Rules**
- [ ] Admin operations correctly check Firebase custom claims (not just Firestore profile)
- [ ] Assessment result stored atomically — no partial writes on error

---

### [M] Maintainability

**Go Tests**
- [ ] Test files exist: `service_test.go` for each service
- [ ] Table-driven tests used where multiple cases apply
- [ ] No underscores in test function names (`TestServiceGetResult` not `Test_Service_Get_Result`)
- [ ] Error paths tested — not just happy path
- [ ] Tests pass with `-race`: `make test-api`

**React Tests**
- [ ] Vitest tests exist for complex components and hooks
- [ ] Tests pass: `make test-web`

**Code Quality**
- [ ] No dead code: unused functions, types, variables
- [ ] No TODO/FIXME without context or follow-up
- [ ] Functions ≤ 50 lines; extract helpers if longer
- [ ] Biome check passes: `make lint-web`
- [ ] Go vet passes: `make lint-api`

---

### Step 3 — Run quick checks

Use the Makefile targets — they `cd` into the correct app dir (`apps/fs-backend`, `apps/fs-app-web`):

```bash
make build-api   # go build ./...   in apps/fs-backend
make lint-api    # go vet ./...      in apps/fs-backend
make test-api    # go test -race ./... in apps/fs-backend
make lint-web    # biome check .     in apps/fs-app-web
make test-web    # vitest run        in apps/fs-app-web
```

---

### Step 4 — Format findings

```
### S1 — UID accepted from request body  [🔴 Critical]

**File:** `apps/fs-backend/services/quiz/handler.go:42`
**Area:** Security

**Problem:**
`userID` is read from the request body and used to look up Firestore documents.
An authenticated user can supply any `userID` and read other users' data.

**Before:**
```go
userID := req.UserID
doc, _ := s.db.Collection("results").Doc(userID).Get(ctx)
```

**After:**
```go
userID := middleware.GetUID(r.Context())
doc, _ := s.db.Collection("results").Doc(userID).Get(ctx)
```
```

---

### Step 5 — Summary table

End every review with:

**Findings summary:**

| ID | Severity | Area | File | Issue |
|----|----------|------|------|-------|
| S1 | 🔴 Critical | Security | handler.go:42 | UID from request body |
| B1 | 🟠 High | Best Practice | service.go:88 | Raw json.NewEncoder instead of pkg.RespondJSON |
| M1 | 🔵 Low | Maintainability | service_test.go | Missing error path test |

**What passed:**
- Firebase auth check present in all protected routes ✅
- Sentinel errors defined and mapped correctly ✅
- shadcn/ui Select used throughout ✅

**Verification commands:**
```bash
make build-api && make test-api
make lint-web && make test-web
```

---

## Rules

- **Read before reporting** — read the actual file, not just the diff
- **Confidence ≥ 70%** — skip anything you are not reasonably sure is a real problem
- **Skip compiler/linter catches** — no need to flag missing imports, type errors
- **Pre-existing issues** — do not flag issues in unchanged lines unless changed code directly causes them
- **Both sides** — report what is correct as well as what needs fixing
