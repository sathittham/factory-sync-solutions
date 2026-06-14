---
version: 1.2.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
---

# Go Backend Testing Guide

This guide covers Go backend testing patterns specific to this project. For frontend testing (Vitest, Playwright), CI/CD pipeline, and `data-testid` conventions, see [testing.md](testing.md).

## Testing Pyramid

```
        ┌─────────────┐
        │   E2E (5%)  │  Playwright (see testing.md)
       ┌┴─────────────┴┐
       │Integration(15%)│ Firestore Emulator
      ┌┴───────────────┴┐
      │   Unit (80%)    │  Services, Handlers, Scoring
      └─────────────────┘
```

## Test File Structure

```
apps/fs-backend/services/
├── profile/
│   ├── handler.go
│   ├── handler_test.go         # Handler tests (mock service)
│   ├── service.go              # Business logic + sentinel errors
│   ├── service_test.go         # Unit tests (mock repository)
│   └── mock_test.go            # Manual mocks (function fields)
├── quiz/
│   ├── handler.go
│   ├── handler_test.go
│   ├── service.go
│   ├── service_test.go
│   └── mock_test.go
├── scoring/
│   ├── scoring.go              # Pure scoring logic
│   └── scoring_test.go         # Unit tests (no mocks needed)
└── notification/
    ├── service.go
    └── service_test.go
```

## Coverage Requirements

| Package | Minimum |
|---------|---------|
| `services/*/service.go` | 80% |
| `services/*/handler.go` | 70% |
| `services/scoring/` | 90% |
| `pkg/` | 80% |

## Table-Driven Tests

```go
func TestGetProfile(t *testing.T) {
    tests := []struct {
        name    string
        uid     string
        mock    *MockRepository
        wantErr error
    }{
        {
            name: "success",
            uid:  "firebase-uid-123",
            mock: &MockRepository{
                GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
                    return &Profile{UID: uid, CompanyName: "ABC Factory"}, nil
                },
            },
            wantErr: nil,
        },
        {
            name: "not found",
            uid:  "nonexistent",
            mock: &MockRepository{
                GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
                    return nil, nil
                },
            },
            wantErr: ErrProfileNotFound,
        },
        {
            name: "repo error",
            uid:  "firebase-uid-123",
            mock: &MockRepository{
                GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
                    return nil, fmt.Errorf("firestore get: connection refused")
                },
            },
            wantErr: nil, // non-sentinel — just check err != nil
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            svc := NewService(tt.mock)

            profile, err := svc.GetProfile(context.Background(), tt.uid)

            if tt.wantErr != nil {
                if !errors.Is(err, tt.wantErr) {
                    t.Fatalf("error = %v, want %v", err, tt.wantErr)
                }
                return
            }
            if tt.name == "repo error" {
                if err == nil {
                    t.Fatal("expected error, got nil")
                }
                return
            }
            if err != nil {
                t.Fatalf("unexpected error: %v", err)
            }
            if profile.CompanyName != "ABC Factory" {
                t.Errorf("companyName = %s, want ABC Factory", profile.CompanyName)
            }
        })
    }
}
```

## Mock Pattern (Manual — No Code Generation)

The project uses **manual mocks with function fields**. No external mock libraries (no mockery, no testify/mock).

Each mock struct has a `...Func` field per interface method. If the func is nil, the method returns zero values. This keeps tests explicit and avoids hidden behavior.

### Repository Mock

```go
// services/profile/mock_test.go
package profile

import "context"

type MockRepository struct {
    GetByUIDFunc func(ctx context.Context, uid string) (*Profile, error)
    CreateFunc   func(ctx context.Context, profile *Profile) error
    UpdateFunc   func(ctx context.Context, uid string, updates map[string]any) error
}

var _ RepositoryInterface = (*MockRepository)(nil)

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

func (m *MockRepository) Update(ctx context.Context, uid string, updates map[string]any) error {
    if m.UpdateFunc != nil {
        return m.UpdateFunc(ctx, uid, updates)
    }
    return nil
}
```

### Service Mock (for Handler Tests)

```go
// services/profile/mock_test.go (same file)

type MockService struct {
    GetProfileFunc    func(ctx context.Context, uid string) (*Profile, error)
    CreateProfileFunc func(ctx context.Context, uid string, req *CreateProfileRequest) (*Profile, error)
}

func (m *MockService) GetProfile(ctx context.Context, uid string) (*Profile, error) {
    if m.GetProfileFunc != nil {
        return m.GetProfileFunc(ctx, uid)
    }
    return nil, nil
}

func (m *MockService) CreateProfile(ctx context.Context, uid string, req *CreateProfileRequest) (*Profile, error) {
    if m.CreateProfileFunc != nil {
        return m.CreateProfileFunc(ctx, uid, req)
    }
    return nil, nil
}
```

## Repository Interface Pattern

Define the repository interface in the **service file** (not the repository package) for easy mocking:

```go
// services/profile/service.go
package profile

type RepositoryInterface interface {
    GetByUID(ctx context.Context, uid string) (*Profile, error)
    Create(ctx context.Context, profile *Profile) error
    Update(ctx context.Context, uid string, updates map[string]any) error
}

type Service struct {
    repo RepositoryInterface // Interface, not concrete type
}

func NewService(repo RepositoryInterface) *Service {
    return &Service{repo: repo}
}
```

The concrete `Repository` struct in the same package implements this interface using Firestore.

## Service Tests

```go
// services/profile/service_test.go
package profile

import (
    "context"
    "errors"
    "testing"
)

func TestCreateProfile_Success(t *testing.T) {
    mock := &MockRepository{
        GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
            return nil, nil // Not found — can create
        },
        CreateFunc: func(ctx context.Context, profile *Profile) error {
            return nil
        },
    }

    svc := NewService(mock)

    profile, err := svc.CreateProfile(context.Background(), "firebase-uid-123", &CreateProfileRequest{
        CompanyName:  "ABC Factory",
        CompanyRegID: "1234567890123",
        Industry:     "manufacturing",
        CompanySize:  "medium",
        ContactName:  "Somchai",
        ContactEmail: "somchai@abc.com",
        ContactPhone: "0812345678",
    })

    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if profile.CompanyName != "ABC Factory" {
        t.Errorf("companyName = %s, want ABC Factory", profile.CompanyName)
    }
    if profile.UID != "firebase-uid-123" {
        t.Errorf("uid = %s, want firebase-uid-123", profile.UID)
    }
}

func TestCreateProfile_AlreadyRegistered(t *testing.T) {
    mock := &MockRepository{
        GetByUIDFunc: func(ctx context.Context, uid string) (*Profile, error) {
            return &Profile{UID: uid}, nil // Already exists
        },
    }

    svc := NewService(mock)

    _, err := svc.CreateProfile(context.Background(), "firebase-uid-123", &CreateProfileRequest{
        CompanyName: "ABC Factory",
    })

    if !errors.Is(err, ErrAlreadyRegistered) {
        t.Fatalf("error = %v, want ErrAlreadyRegistered", err)
    }
}
```

## Handler Tests

Handler tests use `net/http/httptest` with Chi's router:

```go
// services/profile/handler_test.go
package profile

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/go-chi/chi/v5"
)

func TestGetProfile_Success(t *testing.T) {
    mock := &MockService{
        GetProfileFunc: func(ctx context.Context, uid string) (*Profile, error) {
            return &Profile{UID: uid, CompanyName: "ABC Factory"}, nil
        },
    }

    r := chi.NewRouter()
    // Inject UID into context (simulating auth middleware)
    r.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx := context.WithValue(r.Context(), uidContextKey, "firebase-uid-123")
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    })

    h := NewHandler(mock)
    r.Route("/profile", h.Routes)

    req := httptest.NewRequest("GET", "/profile", nil)
    rec := httptest.NewRecorder()

    r.ServeHTTP(rec, req)

    if rec.Code != http.StatusOK {
        t.Errorf("status = %d, want 200", rec.Code)
    }

    var body map[string]any
    json.NewDecoder(rec.Body).Decode(&body)
    if body["success"] != true {
        t.Error("expected success=true")
    }
}

func TestGetProfile_NotFound(t *testing.T) {
    mock := &MockService{
        GetProfileFunc: func(ctx context.Context, uid string) (*Profile, error) {
            return nil, ErrProfileNotFound
        },
    }

    r := chi.NewRouter()
    r.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx := context.WithValue(r.Context(), uidContextKey, "firebase-uid-123")
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    })

    h := NewHandler(mock)
    r.Route("/profile", h.Routes)

    req := httptest.NewRequest("GET", "/profile", nil)
    rec := httptest.NewRecorder()

    r.ServeHTTP(rec, req)

    if rec.Code != http.StatusNotFound {
        t.Errorf("status = %d, want 404", rec.Code)
    }
}
```

## Scoring Tests (Pure Logic)

Scoring functions are pure logic with no external dependencies — test them directly:

```go
// services/scoring/scoring_test.go
package scoring

import "testing"

func TestCalculateOverallScore(t *testing.T) {
    tests := []struct {
        name   string
        scores []DimensionScore
        want   float64
    }{
        {
            name: "all equal",
            scores: []DimensionScore{
                {Dimension: "Quality", Score: 4.0},
                {Dimension: "Safety", Score: 4.0},
                {Dimension: "Digital", Score: 4.0},
            },
            want: 4.0,
        },
        {
            name: "mixed scores",
            scores: []DimensionScore{
                {Dimension: "Quality", Score: 5.0},
                {Dimension: "Safety", Score: 3.0},
                {Dimension: "Digital", Score: 2.0},
            },
            want: 3.33,
        },
        {
            name:   "empty",
            scores: []DimensionScore{},
            want:   0,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := CalculateOverallScore(tt.scores)
            if diff := got - tt.want; diff > 0.01 || diff < -0.01 {
                t.Errorf("CalculateOverallScore() = %.2f, want %.2f", got, tt.want)
            }
        })
    }
}

func TestDetermineDiagnosis(t *testing.T) {
    tests := []struct {
        score float64
        want  string
    }{
        {1.5, "Beginning"},   // 1.0 – 1.9
        {2.5, "Developing"},  // 2.0 – 2.9
        {3.5, "Established"}, // 3.0 – 3.9
        {4.5, "Advanced"},    // 4.0 – 5.0
    }

    for _, tt := range tests {
        t.Run(tt.want, func(t *testing.T) {
            got := DetermineDiagnosis(tt.score)
            if got != tt.want {
                t.Errorf("DetermineDiagnosis(%.1f) = %s, want %s", tt.score, got, tt.want)
            }
        })
    }
}
```

## Integration Tests with Firestore Emulator

Use the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) for integration tests:

```go
// services/profile/integration_test.go
package profile

import (
    "context"
    "os"
    "testing"

    "cloud.google.com/go/firestore"
    "google.golang.org/api/option"
)

func TestProfileRepo_Integration(t *testing.T) {
    if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
        t.Skip("Skipping integration test. Set FIRESTORE_EMULATOR_HOST to run.")
    }

    ctx := context.Background()
    client, err := firestore.NewClient(ctx, "test-project", option.WithoutAuthentication())
    if err != nil {
        t.Fatalf("firestore client: %v", err)
    }
    defer client.Close()

    repo := NewRepository(client)

    // Test Create
    profile := &Profile{
        UID:         "test-uid-123",
        CompanyName: "Test Factory",
        Industry:    "manufacturing",
        CompanySize: "medium",
        CreatedAt:   "2026-02-01T08:30:00Z",
        UpdatedAt:   "2026-02-01T08:30:00Z",
    }

    if err := repo.Create(ctx, profile); err != nil {
        t.Fatalf("Create: %v", err)
    }

    // Test GetByUID
    got, err := repo.GetByUID(ctx, "test-uid-123")
    if err != nil {
        t.Fatalf("GetByUID: %v", err)
    }
    if got.CompanyName != "Test Factory" {
        t.Errorf("companyName = %s, want Test Factory", got.CompanyName)
    }

    // Test GetByUID — not found
    got, err = repo.GetByUID(ctx, "nonexistent")
    if err != nil {
        t.Fatalf("GetByUID: %v", err)
    }
    if got != nil {
        t.Error("expected nil for nonexistent UID")
    }
}
```

### Running the Firestore Emulator

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start Firestore emulator
firebase emulators:start --only firestore

# Run integration tests (separate terminal)
cd apps/fs-backend
FIRESTORE_EMULATOR_HOST=localhost:8080 go test -v -run Integration ./...
```

## Running Tests

```bash
# All backend tests
cd apps/fs-backend && go test ./...

# Specific package
cd apps/fs-backend && go test ./services/scoring/...

# Verbose output
cd apps/fs-backend && go test -v ./...

# With coverage
cd apps/fs-backend && go test -cover ./...

# HTML coverage report
cd apps/fs-backend && go test -coverprofile=cover.out ./... && go tool cover -html=cover.out

# Race condition detection
cd apps/fs-backend && go test -race ./...

# Skip integration tests (unit only)
cd apps/fs-backend && go test -short ./...

# Using Makefile (from project root)
make test-api
```

## Checklist for Testable Services

- [ ] Repository interface defined in the **service file** (not repository package)
- [ ] Service uses interface type for repository field
- [ ] Mock in `mock_test.go` with `var _ RepositoryInterface = (*MockRepository)(nil)`
- [ ] Each interface method has corresponding `...Func` field in mock
- [ ] Default mock methods return nil/zero values when func is nil
- [ ] Sentinel errors tested with `errors.Is()`
- [ ] Handler tests inject UID via context (simulating Firebase auth middleware)
- [ ] Pure scoring/computation logic tested independently with table-driven tests

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Replaced Turborepo reference with Makefile |
| 1.2.0 | 2026-06-13 | Fix stale backend paths throughout |

*Version: 1.2.0*
*Last updated: 13 June 2026*
