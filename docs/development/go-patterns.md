---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Go Patterns

## Go Version

**Minimum: Go 1.26.4**

Use modern Go features:
- `any` instead of `interface{}`
- `slices` and `maps` packages
- `log/slog` for structured JSON logging

## Naming: camelCase Everywhere

All JSON fields, Firestore fields, query params, and struct tags must use **camelCase**. No exceptions. See [api-conventions.md](api-conventions.md) for the full naming table.

## ID Generation: UUIDv4

All resource IDs (except Firebase Auth UID) must be generated as **UUIDv4** using `github.com/google/uuid`:

```go
import "github.com/google/uuid"

id := uuid.New().String()
```

Generate IDs in the **service layer** — never in the handler or from client input.

## Project Structure

```
apps/api/
├── main.go                    # Entry point, router setup, middleware
├── config/
│   └── questions.json         # Static quiz question definitions
├── services/
│   ├── profile/
│   │   ├── handler.go         # HTTP handlers (Chi)
│   │   ├── handler_test.go
│   │   ├── service.go         # Business logic
│   │   └── service_test.go
│   ├── quiz/
│   │   ├── handler.go
│   │   ├── handler_test.go
│   │   ├── service.go
│   │   └── service_test.go
│   ├── scoring/
│   │   ├── scoring.go         # Score computation logic
│   │   └── scoring_test.go
│   ├── dbd/
│   │   ├── handler.go
│   │   ├── handler_test.go
│   │   ├── models.go
│   │   ├── service.go
│   │   └── service_test.go
│   ├── result/
│   │   ├── handler.go
│   │   ├── repository.go
│   │   └── service.go
│   ├── notification/
│   │   ├── email.go           # Resend email integration
│   │   ├── slack.go           # Slack webhook integration
│   │   └── service.go
│   └── admin/
│       └── handler.go         # Handler with inline orchestration (no separate service layer)
├── middleware/
│   ├── auth.go                # Firebase token verification
│   ├── cors.go                # CORS configuration
│   └── ratelimit.go           # Rate limiting
├── pkg/
│   ├── firestore.go           # Firestore client initialization
│   └── response.go            # Standard response helpers
├── go.mod
└── go.sum
```

### Structure Rules

1. Each service has its own directory under `services/`
2. Shared utilities go in `pkg/`
3. Middleware goes in `middleware/`
4. Services should NOT import other services — shared code goes in `pkg/`
5. Business logic stays in the service layer — handlers only parse requests and write responses

## Chi Router Setup

```go
package main

import (
    "context"
    "log"
    "log/slog"
    "net/http"
    "os"

    "github.com/go-chi/chi/v5"
    chiMiddleware "github.com/go-chi/chi/v5/middleware"
    firebase "firebase.google.com/go/v4"

    "factory-sync-solutions/apps/api/middleware"
    "factory-sync-solutions/apps/api/pkg"
    "factory-sync-solutions/apps/api/services/profile"
    "factory-sync-solutions/apps/api/services/quiz"
)

func main() {
    ctx := context.Background()

    // Initialize Firebase Admin SDK (uses GOOGLE_APPLICATION_CREDENTIALS or
    // Application Default Credentials on GCP)
    app, err := firebase.NewApp(ctx, nil)
    if err != nil {
        log.Fatalf("firebase init: %v", err)
    }

    // Firebase Auth client — for token verification and admin role checks
    authClient, err := app.Auth(ctx)
    if err != nil {
        log.Fatalf("firebase auth init: %v", err)
    }

    // Firestore client — shared across all repositories
    firestoreClient := pkg.NewFirestoreClient(ctx)
    defer firestoreClient.Close()

    // Wire up repositories, services, and handlers
    profileRepo := profile.NewRepository(firestoreClient)
    profileSvc := profile.NewService(profileRepo)
    profileHandler := profile.NewHandler(profileSvc)

    // ... (repeat for quiz, result, admin, notification services)

    r := chi.NewRouter()

    // Global middleware
    r.Use(chiMiddleware.Recoverer)
    r.Use(chiMiddleware.RequestID)
    r.Use(chiMiddleware.RealIP)
    r.Use(middleware.CORS)

    // Health check (public)
    r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"ok"}`))
    })

    // API v1 routes
    r.Route("/api/v1", func(r chi.Router) {
        // Public routes
        r.Group(func(r chi.Router) {
            r.Get("/swagger/*", swaggerHandler)
        })

        // Authenticated routes
        r.Group(func(r chi.Router) {
            r.Use(middleware.FirebaseAuth(authClient))

            r.Route("/profile", profileHandler.Routes)
            r.Route("/quiz", quizHandler.Routes)
            r.Route("/results", resultHandler.Routes)

            // Admin routes (additional role check)
            r.Route("/admin", func(r chi.Router) {
                r.Use(middleware.RequireAdmin(authClient))
                adminHandler.Routes(r)
            })
        })
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    slog.Info("server starting", "port", port)
    http.ListenAndServe(":"+port, r)
}
```

## Firebase Auth Middleware

```go
package middleware

import (
    "context"
    "net/http"
    "strings"

    firebaseAuth "firebase.google.com/go/v4/auth"
)

type contextKey string
const uidContextKey contextKey = "uid"

func FirebaseAuth(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
                pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header")
                return
            }

            idToken := strings.TrimPrefix(authHeader, "Bearer ")
            token, err := authClient.VerifyIDToken(r.Context(), idToken)
            if err != nil {
                pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
                return
            }

            // Inject verified UID into request context
            ctx := context.WithValue(r.Context(), uidContextKey, token.UID)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// GetUID extracts the verified Firebase UID from the request context.
func GetUID(r *http.Request) string {
    uid, _ := r.Context().Value(uidContextKey).(string)
    return uid
}
```

## Admin Role Check

```go
// RequireAdmin checks the admin role from Firebase custom claims.
// Custom claims are the authoritative source of truth for roles.
// The `role` field in the `users` Firestore collection is a read-only
// mirror for display/query purposes only.
func RequireAdmin(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            uid := GetUID(r)
            if uid == "" {
                pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing auth")
                return
            }

            // Check admin role via Firebase custom claims (authoritative source)
            user, err := authClient.GetUser(r.Context(), uid)
            if err != nil {
                pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
                return
            }

            if role, ok := user.CustomClaims["role"].(string); !ok || role != "admin" {
                pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "admin access required")
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Handler Pattern

Handlers use Chi's `http.HandlerFunc` pattern with `net/http` standard library:

```go
package profile

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
)

type Handler struct {
    service *Service
}

func NewHandler(svc *Service) *Handler {
    return &Handler{service: svc}
}

// Routes registers all profile routes on the given router.
func (h *Handler) Routes(r chi.Router) {
    r.Get("/", h.GetProfile)
    r.Post("/", h.CreateProfile)
    r.Put("/", h.UpdateProfile)
}

func (h *Handler) GetProfile(w http.ResponseWriter, r *http.Request) {
    uid := middleware.GetUID(r)

    profile, err := h.service.GetProfile(r.Context(), uid)
    if err != nil {
        handleError(w, r, err)
        return
    }
    pkg.RespondJSON(w, http.StatusOK, profile)
}

func (h *Handler) CreateProfile(w http.ResponseWriter, r *http.Request) {
    uid := middleware.GetUID(r)

    var req CreateProfileRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
        return
    }

    if err := validate.Struct(req); err != nil {
        pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
        return
    }

    profile, err := h.service.CreateProfile(r.Context(), uid, &req)
    if err != nil {
        handleError(w, r, err)
        return
    }
    pkg.RespondJSON(w, http.StatusCreated, profile)
}
```

## Service Layer

Services contain business logic and define sentinel errors:

```go
package profile

import (
    "context"
    "errors"
    "fmt"
    "time"
)

var (
    ErrProfileNotFound   = errors.New("profile not found")
    ErrAlreadyRegistered = errors.New("user already registered")
)

type Service struct {
    repo *Repository
}

func NewService(repo *Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) GetProfile(ctx context.Context, uid string) (*Profile, error) {
    profile, err := s.repo.GetByUID(ctx, uid)
    if err != nil {
        return nil, fmt.Errorf("get profile: %w", err)
    }
    if profile == nil {
        return nil, ErrProfileNotFound
    }
    return profile, nil
}

func (s *Service) CreateProfile(ctx context.Context, uid string, req *CreateProfileRequest) (*Profile, error) {
    // Check if already registered
    existing, err := s.repo.GetByUID(ctx, uid)
    if err != nil {
        return nil, fmt.Errorf("check existing profile: %w", err)
    }
    if existing != nil {
        return nil, ErrAlreadyRegistered
    }

    now := time.Now().UTC().Format(time.RFC3339)
    profile := &Profile{
        UID:         uid,
        CompanyName: req.CompanyName,
        Industry:    req.Industry,
        CompanySize: req.CompanySize,
        CreatedAt:   now,
        UpdatedAt:   now,
    }

    if err := s.repo.Create(ctx, profile); err != nil {
        return nil, fmt.Errorf("create profile: %w", err)
    }
    return profile, nil
}
```

## Repository Layer (Firestore)

```go
package profile

import (
    "context"
    "fmt"

    "cloud.google.com/go/firestore"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type Repository struct {
    client *firestore.Client
}

func NewRepository(client *firestore.Client) *Repository {
    return &Repository{client: client}
}

func (r *Repository) GetByUID(ctx context.Context, uid string) (*Profile, error) {
    doc, err := r.client.Collection("users").Doc(uid).Get(ctx)
    if err != nil {
        if status.Code(err) == codes.NotFound {
            return nil, nil // Not found — let service decide
        }
        return nil, fmt.Errorf("firestore get: %w", err)
    }

    var profile Profile
    if err := doc.DataTo(&profile); err != nil {
        return nil, fmt.Errorf("unmarshal profile: %w", err)
    }
    return &profile, nil
}

func (r *Repository) Create(ctx context.Context, profile *Profile) error {
    _, err := r.client.Collection("users").Doc(profile.UID).Set(ctx, profile)
    if err != nil {
        return fmt.Errorf("firestore set: %w", err)
    }
    return nil
}

func (r *Repository) Update(ctx context.Context, uid string, updates []firestore.Update) error {
    _, err := r.client.Collection("users").Doc(uid).Update(ctx, updates)
    if err != nil {
        return fmt.Errorf("firestore update: %w", err)
    }
    return nil
}
```

## Firestore Client Initialization

Initialize the Firestore client once at startup. The Firebase Admin SDK resolves credentials automatically:

- **Local dev**: Set `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service account JSON file, or use `gcloud auth application-default login`.
- **Firestore Emulator**: Set `FIRESTORE_EMULATOR_HOST=localhost:8080` (no credentials needed).
- **GCP (Cloud Run)**: Uses Application Default Credentials automatically — no env var needed.

See [env-variables.md](env-variables.md) for the full list of required environment variables.

```go
package pkg

import (
    "context"
    "log"

    "cloud.google.com/go/firestore"
    firebase "firebase.google.com/go/v4"
)

func NewFirestoreClient(ctx context.Context) *firestore.Client {
    app, err := firebase.NewApp(ctx, nil)
    if err != nil {
        log.Fatalf("firebase init: %v", err)
    }

    client, err := app.Firestore(ctx)
    if err != nil {
        log.Fatalf("firestore init: %v", err)
    }

    return client
}
```

## Data Models

Firestore models use `firestore` struct tags:

```go
type Profile struct {
    UID          string `json:"uid" firestore:"uid"`
    Email        string `json:"email" firestore:"email"`
    DisplayName  string `json:"displayName" firestore:"displayName"`
    CompanyName  string `json:"companyName" firestore:"companyName"`
    CompanyRegID string `json:"companyRegId" firestore:"companyRegId"`
    Industry     string `json:"industry" firestore:"industry"`
    CompanySize  string `json:"companySize" firestore:"companySize"`
    ContactName  string `json:"contactName" firestore:"contactName"`
    ContactEmail string `json:"contactEmail" firestore:"contactEmail"`
    ContactPhone string `json:"contactPhone" firestore:"contactPhone"`
    Role         string `json:"role" firestore:"role"`
    CreatedAt    string `json:"createdAt" firestore:"createdAt"`
    UpdatedAt    string `json:"updatedAt" firestore:"updatedAt"`
}
```

## Request/Response DTOs

```go
// Request DTOs (camelCase JSON tags, validate tags)
type CreateProfileRequest struct {
    CompanyName    string `json:"companyName" validate:"required,min=2,max=200"`
    CompanyRegID   string `json:"companyRegId" validate:"required,len=13,numeric"`
    Industry       string `json:"industry" validate:"required"`
    CompanySize    string `json:"companySize" validate:"required,oneof=small medium large"`
    ContactName    string `json:"contactName" validate:"required,min=2,max=100"`
    ContactEmail   string `json:"contactEmail" validate:"required,email"`
    ContactPhone   string `json:"contactPhone" validate:"required"`
    TurnstileToken string `json:"turnstileToken" validate:"required"`
}

// Response DTO (omit internal fields if needed)
type ProfileResponse struct {
    UID         string `json:"uid"`
    CompanyName string `json:"companyName"`
    Industry    string `json:"industry"`
    CompanySize string `json:"companySize"`
    CreatedAt   string `json:"createdAt"`
}
```

## Mock Pattern for Tests

Define mocks manually — no external mock libraries:

```go
// service_test.go
package profile

import "context"

type MockRepository struct {
    GetByUIDFunc func(ctx context.Context, uid string) (*Profile, error)
    CreateFunc   func(ctx context.Context, profile *Profile) error
}

func (m *MockRepository) GetByUID(ctx context.Context, uid string) (*Profile, error) {
    if m.GetByUIDFunc != nil {
        return m.GetByUIDFunc(ctx, uid)
    }
    return nil, nil
}

func (m *MockRepository) Create(ctx context.Context, profile *Profile) error {
    if m.CreateFunc != nil {
        return m.CreateFunc(ctx, profile)
    }
    return nil
}
```

## Cloud Run Entry Point

```go
package main

func main() {
    // Setup router with all routes and middleware
    r := setupRouter()

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    slog.Info("server starting", "port", port)
    if err := http.ListenAndServe(":"+port, r); err != nil {
        log.Fatalf("server error: %v", err)
    }
}
```

## Response Helpers

```go
package pkg

import (
    "encoding/json"
    "net/http"
)

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
    w.WriteHeader(http.StatusOK)
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

---

## See Also

- [api-conventions.md](api-conventions.md) — Naming conventions, response format, error codes
- [error-handling.md](error-handling.md) — Sentinel error pattern and handler error mapping
- [testing-guide.md](testing-guide.md) — Go-specific testing patterns and mock examples
- [security-guide.md](security-guide.md) — Authentication, authorization, and Firestore security rules
- [database.md](database.md) — Firestore collections, data models, and scoring algorithm
- [env-variables.md](env-variables.md) — All required environment variables

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2026-03-07 | Add dbd service, fix result/admin structure, update to Cloud Run entry point |
| 1.0.0 | 2026-03-06 | Initial version |
