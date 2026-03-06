---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# API Conventions

## Naming Convention: camelCase Everywhere (Mandatory)

**All identifiers across the entire stack must use camelCase.** This is a strict, non-negotiable rule — no snake_case, no PascalCase for field names.

| Context | Format | Example |
|---------|--------|---------|
| JSON response fields | camelCase | `userId`, `overallScore` |
| JSON request fields | camelCase | `companyName`, `industryType` |
| Query parameters | camelCase | `industryType`, `companySize` |
| Go struct JSON tags | camelCase | `json:"userId"` |
| Firestore field names | camelCase | `userId`, `createdAt` |
| Go variable names | camelCase | `userID`, `companyName` |
| Go constants | PascalCase | `MaxQuestions`, `ScoreThreshold` |
| URL paths | kebab-case | `/api/v1/quiz-results` |

```go
// Correct - camelCase JSON tags
type User struct {
    UID         string `json:"uid" firestore:"uid"`
    Email       string `json:"email" firestore:"email"`
    DisplayName string `json:"displayName" firestore:"displayName"`
    CompanyID   string `json:"companyId" firestore:"companyId"`
    Role        string `json:"role" firestore:"role"`
    CreatedAt   string `json:"createdAt" firestore:"createdAt"`
}
```

---

## ID Generation: UUIDv4

All resource IDs must be **UUIDv4** (except `users/{uid}` which uses Firebase Auth UID).

```go
import "github.com/google/uuid"

assessmentID := uuid.New().String() // "550e8400-e29b-41d4-a716-446655440000"
```

- IDs are generated server-side in the service layer — never from the client
- Use `github.com/google/uuid` package
- Store as `string` in Firestore and JSON responses
- See [database.md](database.md#id-generation) for per-collection ID rules

---

## Response Structure

### Single Object Response

```json
{
    "success": true,
    "data": {
        "uid": "abc-123",
        "email": "user@example.com",
        "displayName": "John Doe"
    }
}
```

### Array/List Response

```json
{
    "success": true,
    "data": [...],
    "count": 10
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always present |
| `data` | object/array | Response payload |
| `count` | number | Number of items (list responses only) |
| `error` | object | Present only on failure: `{ "code": "...", "message": "..." }` |

```go
// pkg/response.go — exported response helpers used by all handlers
package pkg

func RespondJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]any{
        "success": true,
        "data":    data,
    })
}

func RespondList(w http.ResponseWriter, data any, count int) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]any{
        "success": true,
        "data":    data,
        "count":   count,
    })
}

func RespondError(w http.ResponseWriter, status int, code, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]any{
        "success": false,
        "error": map[string]string{
            "code":    code,
            "message": message,
        },
    })
}
```

Handlers import and call: `pkg.RespondJSON(w, http.StatusOK, data)`

---

## Error Response

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data"
    }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing/invalid Firebase ID token |
| `FORBIDDEN` | 403 | Authenticated but not authorized (e.g., not admin) |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### HTTP Status Codes

| Operation | Success | Common Errors |
|-----------|---------|---------------|
| GET (single) | 200 OK | 404 Not Found |
| GET (list) | 200 OK | 400 Bad Request |
| POST (create) | 201 Created | 400, 409 Conflict |
| PUT/PATCH | 200 OK | 400, 404 |
| DELETE | 200 OK | 404 |

---

## Date/Time Handling

| Format | Use Case | Example |
|--------|----------|---------|
| ISO 8601 String | `createdAt`, `updatedAt` | `"2026-01-31T07:53:47Z"` |

```go
// Always use UTC with RFC3339 format
now := time.Now().UTC().Format(time.RFC3339)
```

### Rules

1. **Always use UTC** for storage and response
2. **Always return ISO 8601** (RFC3339) in API responses
3. **Sort list data by date** with latest first (descending) where appropriate

---

## Input Validation

```go
// Use go-playground/validator for struct validation
type RegisterRequest struct {
    CompanyName    string `json:"companyName" validate:"required,min=2,max=200"`
    IndustryType   string `json:"industryType" validate:"required"`
    CompanySize    string `json:"companySize" validate:"required,oneof=small medium large"`
    CompanyRegID   string `json:"companyRegId" validate:"required,len=13,numeric"`
    ContactName    string `json:"contactName" validate:"required,min=2,max=100"`
    ContactEmail   string `json:"contactEmail" validate:"required,email"`
    ContactPhone   string `json:"contactPhone" validate:"required"`
    TurnstileToken string `json:"turnstileToken" validate:"required"`
}

// Validate in handler
if err := validate.Struct(req); err != nil {
    pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
    return
}
```

### Validation Rules

| Rule | Tag | Example |
|------|-----|---------|
| Required | `validate:"required"` | Must be present and non-zero |
| Email | `validate:"email"` | Valid email format |
| String length | `validate:"min=2,max=100"` | Between 2–100 chars |
| Exact length | `validate:"len=13"` | Exactly 13 characters |
| Numeric string | `validate:"numeric"` | Digits only |
| Enum | `validate:"oneof=small medium large"` | Must be one of values |

---

## API Versioning

- Base path: `/api/v1/`
- Version in URL for breaking changes
- All endpoints are grouped under `/api/v1/` via Chi route groups

```go
r := chi.NewRouter()
r.Route("/api/v1", func(r chi.Router) {
    r.Route("/profile", profileHandler.Routes)
    r.Route("/quiz", quizHandler.Routes)
    r.Route("/results", resultHandler.Routes)
    r.Route("/admin", adminHandler.Routes)
})
```

---

## Pagination (Future)

For admin list endpoints that may need pagination:

```go
type PaginationParams struct {
    Limit  int    `json:"limit"`
    Cursor string `json:"cursor"` // Firestore document ID for cursor-based pagination
}
```

Firestore cursor-based pagination uses `StartAfter()` with the last document snapshot.

---

## Swagger Annotations

All handlers must include swaggo annotations for auto-generated API docs:

```go
// GetProfile godoc
// @Summary Get user profile
// @Description Returns the authenticated user's profile
// @Tags profile
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer {firebase-id-token}"
// @Success 200 {object} map[string]any
// @Failure 401 {object} map[string]any
// @Failure 404 {object} map[string]any
// @Router /api/v1/profile [get]
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

See [architecture.md](architecture.md#api-documentation-swaggeropenapi) for setup.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
