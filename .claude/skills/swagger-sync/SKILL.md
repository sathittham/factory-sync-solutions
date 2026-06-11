---
name: swagger-sync
allowed-tools: Read, Edit, Glob, Grep, Bash(find:*), Bash(grep:*), Bash(ls:*), Bash(make:*), Bash(go build:*), Bash(swag:*)
description: Sync swagger/OpenAPI annotations in Go Chi handlers — verify every endpoint is annotated, fix gaps, then verify with go build. Run after adding or modifying any API endpoint.
---

# Swagger Sync Skill

You are a meticulous API documentation engineer for Factory Health Check. Every Chi handler must have complete swagger annotations. A missing `@Security BearerAuth` is a documentation failure. Run after every new endpoint or handler change.

## Context

- Current branch: !`git branch --show-current`
- Changed handler files: !`git diff --name-only HEAD 2>/dev/null | grep "handler\.go$" || echo "(none changed)"`
- Services: !`ls apps/fs-backend/services/`

## How to Use This Skill

```
/swagger-sync <service>    # Sync one service (e.g. /swagger-sync quiz)
/swagger-sync all          # Sync all services
```

---

## Required Annotations Per Handler

Every exported Chi handler function MUST have ALL of these:

```go
// ListQuizzes returns all available quizzes for the authenticated user.
//
// @Summary      List quizzes
// @Description  Returns all quizzes available to the authenticated user
// @Tags         quiz
// @Produce      json
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/quizzes [get]
func (h *Handler) ListQuizzes(w http.ResponseWriter, r *http.Request) {
```

For POST/PUT/PATCH that accept a body:

```go
// @Param        body  body  SubmitQuizRequest  true  "Submission payload"
```

For path parameters:

```go
// @Param        quizID  path  string  true  "Quiz ID"
```

---

## Response Type Conventions

```go
// Single item
// @Success 200 {object} pkg.DataResponse

// List with count
// @Success 200 {object} pkg.ListResponse

// Created
// @Success 201 {object} pkg.DataResponse

// Action with no body (204)
// @Success 204

// All errors
// @Failure 400 {object} pkg.ErrorResponse
// @Failure 401 {object} pkg.ErrorResponse
// @Failure 404 {object} pkg.ErrorResponse
// @Failure 409 {object} pkg.ErrorResponse
// @Failure 500 {object} pkg.ErrorResponse
```

Public endpoints (no Firebase auth): omit `@Security BearerAuth`.

---

## Your Task

### Step 1 — Determine scope

- If `<service>` arg given → process only `apps/fs-backend/services/<service>/handler.go`
- If `all` → find all handler files:
  ```bash
  find apps/fs-backend/services -name "handler.go" ! -name "*_test.go"
  ```

### Step 2 — For each handler file, list all exported handler functions

```bash
grep -n "^func (h \*Handler)" apps/fs-backend/services/<service>/handler.go
```

### Step 3 — Check each function for required annotations

Read the file. For each exported handler function, verify it has:
- [ ] One-line comment above the annotation block (the function description)
- [ ] `@Summary` — ≤ 10 words
- [ ] `@Description` — a sentence describing what the endpoint does
- [ ] `@Tags` — must match the service name consistently across all handlers in the file
- [ ] `@Produce json` (on GET endpoints)
- [ ] `@Accept json` (on POST/PUT/PATCH with a body)
- [ ] `@Param` — one per path parameter, one for body on mutating endpoints
- [ ] `@Success` — at least one success code with correct response type
- [ ] `@Failure` — 400 (if validates input), 401 (if auth-protected), 404 (if resource lookup), 500 minimum
- [ ] `@Security BearerAuth` — on ALL endpoints protected by `middleware.FirebaseAuth`
- [ ] `@Router` — correct path and HTTP method matching the Chi route registration

### Step 4 — Fix missing or incorrect annotations

Edit the handler file to add any missing annotations. Use existing annotated handlers in the same service as style reference.

Map Chi route patterns to swagger router paths:
- Chi: `r.Get("/{quizID}/submit", h.Submit)` → `@Router /api/v1/quizzes/{quizID}/submit [post]`
- Path params in Chi use `:param` or `{param}` — swagger always uses `{param}`

To find the full registered path, read the `RegisterRoutes` function in the same file:

```bash
grep -A 20 "RegisterRoutes\|func.*Routes" apps/fs-backend/services/<service>/handler.go
```

### Step 5 — Verify with go build

Swagger annotations are Go comments — malformed annotations cause no compile error, but they break `swag init`. Run a build to confirm no syntax errors crept in:

```bash
make build-api 2>&1 | tail -10
```

### Step 6 — Report

List every handler that was fixed (or already correct):

```
quiz/handler.go
  ListQuizzes       — ✅ already annotated
  GetQuiz           — ✅ already annotated
  SubmitQuiz        — ⚠️ Added: @Param quizID, @Security BearerAuth, @Failure 404
  GetQuizConfig     — ✅ already annotated

result/handler.go
  GetResult         — ✅ already annotated
```

If `swag` CLI is available, offer to regenerate the swagger docs:

```bash
command -v swag >/dev/null 2>&1 && echo "swag available" || echo "swag not installed — annotations verified but docs not regenerated"
```

If available:
```bash
cd apps/fs-backend && swag init -g main.go -o docs/swagger/ 2>&1 | tail -10
```

---

## Annotation Reference

### Auth-protected endpoint (most common)

```go
// GetResult returns the assessment result for the authenticated user.
//
// @Summary      Get result
// @Description  Returns the latest assessment result for the authenticated user
// @Tags         result
// @Produce      json
// @Success      200  {object}  pkg.DataResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/results [get]
```

### Admin endpoint

```go
// ListAllResults returns results for all users (admin only).
//
// @Summary      List all results (admin)
// @Description  Admin endpoint — returns assessment results for all users
// @Tags         admin
// @Produce      json
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      403  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/admin/results [get]
```

### Public endpoint (no auth)

```go
// HealthCheck returns service health status.
//
// @Summary      Health check
// @Description  Returns 200 if the service is healthy
// @Tags         health
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /healthz [get]
```

---

## Rules

- `@Tags` must be consistent within a service — all handlers in `quiz/handler.go` use `quiz`
- `@Router` path must match the full registered Chi path including `/api/v1/` prefix
- `@Security BearerAuth` only on endpoints behind `middleware.FirebaseAuth` — not on public routes
- Run `make build-api` before reporting done
- If `swag` is available, run `swag init` to validate annotations parse correctly

*Version: 1.0.0*
*Last updated: 11 June 2026*
