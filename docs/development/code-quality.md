---
version: 1.2.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
---

# Code Quality & Linting Guide

## Linting Tools

### Frontend: Biome

Single tool for linting and formatting (replaces ESLint + Prettier). See [setup.md](setup.md#linting--formatting).

```bash
npx biome check .          # Check lint + format
npx biome check --fix .    # Auto-fix issues
```

### Backend: golangci-lint

The Go backend uses `golangci-lint` as the primary linting tool. Configuration is in `apps/backend/.golangci.yml`.

**Installation:**
```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

**Usage:**
```bash
cd apps/backend

# Run on entire project
golangci-lint run ./...

# Run on specific package
golangci-lint run ./services/scoring/...

# Run with auto-fix (where supported)
golangci-lint run --fix ./...
```

### Enabled Linters

| Linter | Purpose |
|--------|---------|
| `errcheck` | Check error handling |
| `gosimple` | Simplify code |
| `govet` | Examine Go source code |
| `ineffassign` | Detect ineffectual assignments |
| `staticcheck` | Static analysis |
| `unused` | Find unused code |
| `bodyclose` | Check HTTP response body closed |
| `errorlint` | Find improper error handling |
| `gofmt` | Check formatting |
| `goimports` | Check import ordering |
| `gocognit` | Cognitive complexity checker |
| `gocyclo` | Cyclomatic complexity checker |
| `gosec` | Security checker |
| `prealloc` | Slice preallocation hints |
| `revive` | Fast, configurable linter |

## Import Ordering

Imports must be grouped in this order with blank lines between groups:

```go
import (
    // 1. Standard library
    "context"
    "encoding/json"
    "net/http"

    // 2. Third-party packages
    "cloud.google.com/go/firestore"
    "firebase.google.com/go/v4/auth"
    "github.com/go-chi/chi/v5"

    // 3. Project internal packages
    "github.com/sathittham/factory-sync-solutions/apps/backend/services/profile"
    "github.com/sathittham/factory-sync-solutions/apps/backend/services/scoring"
)
```

**Run goimports to auto-fix:**
```bash
goimports -w ./...
```

## Error Checking

Use `errors.Is` for sentinel error comparisons (the primary pattern in this project):

```go
// Correct — works with wrapped errors
if errors.Is(err, ErrProfileNotFound) {
    pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
    return
}

// Avoid — fails on wrapped errors
if err == ErrProfileNotFound { ... }
```

Use `errors.As` when checking error types (e.g., gRPC status errors from Firestore):

```go
// Check gRPC status code from Firestore errors
if status.Code(err) == codes.NotFound {
    return nil, nil
}
```

See [error-handling.md](error-handling.md) for the full sentinel error pattern.

## Slice Preallocation

Pre-allocate slices when the size is known:

```go
// Correct - pre-allocate with known capacity
scores := make([]DimensionScore, 0, len(dimensions))
for _, d := range dimensions {
    scores = append(scores, computeScore(d))
}

// Avoid - causes multiple allocations
var scores []DimensionScore
for _, d := range dimensions {
    scores = append(scores, computeScore(d))
}
```

## Lint Exclusions

```yaml
# .golangci.yml
issues:
  exclude-rules:
    # Test files - relaxed rules
    - path: _test\.go
      linters:
        - dupl
        - errcheck
        - goconst
        - gosec

    # Main entry point
    - path: main\.go
      linters:
        - gochecknoinits
```

## Running Quality Checks

### Before Committing

```bash
cd apps/backend

# Format code
gofmt -w .
goimports -w .

# Run linter
golangci-lint run ./...

# Run tests
go test -v -race ./...

# Run vet
go vet ./...
```

### Via Makefile

```bash
# Root-level — runs both frontend and backend checks
make lint
make test
```

## Complexity Thresholds

| Metric | Threshold | Tool |
|--------|-----------|------|
| Cyclomatic Complexity | 15 | gocyclo |
| Cognitive Complexity | 15 | gocognit |

Functions exceeding these thresholds must be refactored by extracting helper functions to reduce branching.

## Security Linting

`gosec` checks for security issues:

```bash
cd apps/backend
gosec ./...

# Common issues
# G104: Audit errors not checked
# G304: File inclusion via variable
# G401: Use of weak crypto
```

## Summary Checklist

Before submitting code:

- [ ] `npx biome check .` — Frontend lint + format clean
- [ ] `golangci-lint run ./...` — No new Go lint errors
- [ ] `go test ./...` — Tests pass
- [ ] `go vet ./...` — No issues
- [ ] No hardcoded secrets or credentials
- [ ] Error messages are user-friendly
- [ ] Exported functions have godoc comments

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Replaced Turborepo reference with Makefile |
| 1.2.0 | 2026-06-13 | Fix stale backend paths; fix module import paths; fix broken setup link |

*Version: 1.2.0*
*Last updated: 13 June 2026*
