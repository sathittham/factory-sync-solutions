---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Error Handling Patterns

## Named Sentinel Errors (Primary Pattern)

Each service defines named sentinel error vars. Handlers convert these to HTTP responses via `errors.Is()`. Unexpected errors bubble up as plain `error` and are returned as 500.

### Service-Layer Sentinel Errors

Define sentinel vars at the top of the service file:

```go
package service

import "errors"

var (
    ErrUserNotFound      = errors.New("user not found")
    ErrProfileNotFound   = errors.New("profile not found")
    ErrAlreadyRegistered = errors.New("user already registered")
    ErrForbidden         = errors.New("forbidden")
    ErrInvalidInput      = errors.New("invalid input")
)
```

Sentinel errors are returned directly — no constructor functions:

```go
func (s *ProfileService) GetProfile(ctx context.Context, uid string) (*Profile, error) {
    profile, err := s.repo.GetByUID(ctx, uid)
    if err != nil {
        return nil, fmt.Errorf("get profile: %w", err) // plain error → 500
    }
    if profile == nil {
        return nil, ErrProfileNotFound // sentinel → 404
    }
    return profile, nil
}
```

### Error Codes

| Code | HTTP Status | When to Use |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input, missing fields |
| `UNAUTHORIZED` | 401 | Missing/invalid Firebase ID token |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Handler Error Handling

Handlers use `errors.Is()` to match sentinel errors and map them to HTTP status codes. Use a `handleError` helper to avoid repeating the switch in every handler:

```go
func handleError(w http.ResponseWriter, r *http.Request, err error) {
    switch {
    case errors.Is(err, service.ErrProfileNotFound),
         errors.Is(err, service.ErrUserNotFound):
        pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", err.Error())

    case errors.Is(err, service.ErrAlreadyRegistered):
        pkg.RespondError(w, http.StatusConflict, "CONFLICT", err.Error())

    case errors.Is(err, service.ErrForbidden):
        pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", err.Error())

    case errors.Is(err, service.ErrInvalidInput):
        pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())

    default:
        // Unexpected error — log and return generic 500
        slog.Error("unexpected error",
            "error", err.Error(),
            "path", r.URL.Path,
            "method", r.Method,
        )
        pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
    }
}
```

### Usage in Handlers

```go
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
    uid := r.Context().Value(uidContextKey).(string)

    profile, err := h.service.GetProfile(r.Context(), uid)
    if err != nil {
        handleError(w, r, err)
        return
    }
    pkg.RespondJSON(w, http.StatusOK, profile)
}
```

---

## Repository Error Handling

Repository methods wrap Firestore errors with `fmt.Errorf` for context. These are **not** sentinel errors — they bubble up as plain `error` and result in 500.

```go
func (r *ProfileRepo) GetByUID(ctx context.Context, uid string) (*Profile, error) {
    doc, err := r.client.Collection("users").Doc(uid).Get(ctx)
    if err != nil {
        if status.Code(err) == codes.NotFound {
            return nil, nil // Not found — service layer decides what to do
        }
        return nil, fmt.Errorf("get profile %s: %w", uid, err)
    }

    var profile Profile
    if err := doc.DataTo(&profile); err != nil {
        return nil, fmt.Errorf("unmarshal profile: %w", err)
    }
    return &profile, nil
}
```

The **service layer** turns `nil` results into domain sentinel errors:

```go
func (s *ProfileService) GetProfile(ctx context.Context, uid string) (*Profile, error) {
    profile, err := s.repo.GetByUID(ctx, uid)
    if err != nil {
        return nil, fmt.Errorf("get profile: %w", err) // plain error → 500
    }
    if profile == nil {
        return nil, ErrProfileNotFound // sentinel → 404
    }
    return profile, nil
}
```

---

## Firestore-Specific Error Handling

Use `google.golang.org/grpc/status` and `google.golang.org/grpc/codes` for Firestore errors:

```go
import (
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

// Check for not-found
if status.Code(err) == codes.NotFound {
    return nil, nil
}

// Check for already-exists (e.g., Create with existing doc ID)
if status.Code(err) == codes.AlreadyExists {
    return ErrAlreadyRegistered
}
```

---

## Chi Middleware Recovery

Use Chi's built-in recoverer middleware to catch panics:

```go
import "github.com/go-chi/chi/v5/middleware"

r := chi.NewRouter()
r.Use(middleware.Recoverer)
```

No custom recovery middleware is needed.

---

## Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "profile not found"
    }
}
```

---

## Best Practices

| Practice | Description |
|----------|-------------|
| Named sentinel vars | `var ErrXxx = errors.New("...")` in service package |
| Wrap with `fmt.Errorf` | Add context at each layer with `%w` verb |
| Use `errors.Is` | Check sentinel errors — not `==` or type assertion |
| Use `errors.As` | Check error types (e.g., gRPC status errors) |
| Don't expose internals | Generic message for 500 errors; log the real error server-side |
| Log unexpected errors | Log in `handleError` before returning 500 |
| Firestore not-found | Return `nil, nil` from repo; service maps to sentinel |
| Never panic in handlers | Let Chi's Recoverer catch any unexpected panics |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
