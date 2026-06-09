---
description: Go backend conventions — Chi router, Firestore, Firebase Auth, response format, error handling
paths:
  - "apps/fs-backend/**/*.go"
---

# Go Backend Rules

## Module

`github.com/sathittham/factory-sync-solutions/apps/fs-backend`

## Stack

- **Router**: `github.com/go-chi/chi/v5`
- **Database**: Cloud Firestore (`cloud.google.com/go/firestore`)
- **Auth**: Firebase Auth (`firebase.google.com/go/v4/auth`)
- **Validation**: `github.com/go-playground/validator/v10`
- **Email**: Resend (`github.com/resend/resend-go/v2`)

## Response Format

Always use `pkg` helpers — never write raw `json.NewEncoder`:

```go
// Success single item
pkg.RespondJSON(w, http.StatusOK, item)

// Success list
pkg.RespondList(w, items, count)

// Error
pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
```

Response shapes:
```json
// RespondJSON → { "success": true, "data": <item> }
// RespondList → { "success": true, "data": <items>, "count": <n> }
// RespondError → { "success": false, "error": { "code": "...", "message": "..." } }
```

Error codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

## Auth Context

Extract from request context (set by `middleware.FirebaseAuth`):

```go
uid := middleware.GetUID(r.Context())           // Firebase UID
email := middleware.GetEmail(r.Context())       // user email
display := middleware.GetDisplayName(r.Context()) // display name

if uid == "" {
    pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
    return
}
```

**Never** accept UID from request body or query params — always from context.

## Route Registration (Chi)

```go
func RegisterRoutes(r chi.Router, svc *Service) {
    r.Route("/api/v1", func(r chi.Router) {
        r.Use(middleware.FirebaseAuth(authClient))
        r.Get("/quiz", svc.ListQuizzes)
        r.Post("/quiz/{quizID}/submit", svc.SubmitQuiz)
    })
}
```

## Service Structure

Each service in `apps/fs-backend/services/<name>/` has:
- `handler.go` — HTTP handlers only (parse, call service, respond)
- `service.go` — business logic
- `models.go` — request/response/domain types
- `service_test.go` — table-driven tests

No separate repository layer needed for Firestore — keep Firestore calls in service.go for this project's scale.

## Firestore Patterns

```go
// Get document
doc, err := firestoreClient.Collection("assessments").Doc(id).Get(ctx)
if status.Code(err) == codes.NotFound {
    return nil, ErrNotFound
}
if err != nil {
    return nil, fmt.Errorf("get assessment %s: %w", id, err)
}
var result Assessment
if err := doc.DataTo(&result); err != nil {
    return nil, fmt.Errorf("decode assessment %s: %w", id, err)
}

// Create document
_, err = firestoreClient.Collection("assessments").Doc(id).Set(ctx, assessment)

// Query
docs, err := firestoreClient.Collection("assessments").
    Where("userID", "==", userID).
    OrderBy("createdAt", firestore.Desc).
    Documents(ctx).GetAll()
```

## Error Handling

```go
// Sentinel errors in service
var (
    ErrNotFound = errors.New("not found")
    ErrConflict = errors.New("already exists")
    ErrForbidden = errors.New("forbidden")
)

// Wrap errors with context
return nil, fmt.Errorf("get quiz result for user %s: %w", userID, err)

// Check sentinel in handler
if errors.Is(err, service.ErrNotFound) {
    pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "resource not found")
    return
}
```

## Naming Conventions

- camelCase for JSON struct tags: `json:"quizID"`, `json:"createdAt"`
- Boolean fields: `IsActive`, `HasCompleted` — `json:"isActive"`, `json:"hasCompleted"`
- IDs: `userID`, `quizID`, `assessmentID` (not `userId`, `quiz_id`)
- Timestamps: `time.Time` fields with `json:"createdAt"` tag

## Build & Test Commands

```bash
make build-api          # go build ./...
make test-api           # go test -race -cover ./...
make lint-api           # go vet ./...
cd apps/fs-backend && go test -v -race -cover ./services/quiz/...
```

## Rules

- NEVER write raw JSON — always use `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError`
- NEVER read UID/email from request body — always from context set by `middleware.FirebaseAuth`
- NEVER hardcode credentials — use environment variables loaded by `godotenv`
- ALWAYS wrap errors with `fmt.Errorf("context: %w", err)`
- ALWAYS define sentinel errors for domain error types
- Use `errors.Is` for error checks, never type assertion `err.(*T)`

*Version: 1.0.0*
*Last updated: 04 June 2026*
