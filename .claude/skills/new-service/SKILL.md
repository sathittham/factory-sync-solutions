---
name: new-service
allowed-tools: Read, Edit, Write, Bash(mkdir:*), Bash(ls:*), Bash(find:*), Bash(make:*), Bash(go build:*), Bash(go test:*), Bash(go vet:*), Bash(go mod:*), Glob, Grep
description: Scaffold a new Go service under apps/backend/services/<name>/ with handler, service, models, sentinel errors, mock repository, and table-driven tests — wired to the existing Chi router.
---

# New Service Skill

You are a senior Go engineer scaffolding a new service for Factory Health Check. Every file must follow the project conventions in `.claude/rules/go.md` exactly — the scaffold you create today is the pattern future services will copy.

## Context

- Existing services: !`ls apps/backend/services/`
- Go module: !`head -1 apps/backend/go.mod`

## How to Use This Skill

```
/new-service <name>     # Scaffold a new service named <name> (lowercase, no hyphens)
```

Examples:
```
/new-service report
/new-service backoffice
/new-service assessment
```

The service name must be a valid Go package name (lowercase letters only, no hyphens). If the name contains hyphens, convert to a single word (e.g. `quiz-history` → `quizhistory`).

---

## Files to Create

```
apps/backend/services/<name>/
├── handler.go        # Chi routes + HTTP handlers — parse, call service, respond
├── service.go        # Business logic + Firestore calls + sentinel errors
├── models.go         # Request/response/domain structs
└── service_test.go   # Table-driven service tests with MockRepository
```

---

## Conventions

### models.go

```go
package <name>

import "time"

// Domain entity
type <Entity> struct {
	ID        string    `json:"<entity>ID"   firestore:"<entity>ID"`
	UserID    string    `json:"userID"        firestore:"userID"`
	// Add fields here — camelCase JSON tags, same field name for Firestore
	IsActive  bool      `json:"isActive"      firestore:"isActive"`
	CreatedAt time.Time `json:"createdAt"     firestore:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"     firestore:"updatedAt"`
}

// Create<Entity>Request — body for POST endpoint
type Create<Entity>Request struct {
	// Fields the user provides
}

// Update<Entity>Request — body for PATCH/PUT endpoint
type Update<Entity>Request struct {
	// Patchable fields only
}
```

Rules:
- IDs in camelCase: `userID`, `quizID`, `assessmentID` (never `userId`, `quiz_id`)
- Booleans with `Is*`/`Has*` prefix: `IsActive`, `HasCompleted`
- Timestamps as `time.Time` with `json:"createdAt"` tag
- Firestore tag matches JSON tag exactly

### service.go

```go
package <name>

import (
	"context"
	"errors"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// Sentinel errors — domain-specific, named for the entity/condition
var (
	Err<Entity>NotFound = errors.New("<entity> not found")
	// Add more as needed: ErrAlreadyExists, ErrInvalidState, ...
)

// Repository defines the Firestore interface (enables mock testing)
type Repository interface {
	GetByID(ctx context.Context, id string) (*<Entity>, error)
	GetByUID(ctx context.Context, uid string) ([]*<Entity>, error)
	Create(ctx context.Context, e *<Entity>) error
	Update(ctx context.Context, id string, updates []firestore.Update) error
}

// firestoreRepository is the real Firestore implementation
type firestoreRepository struct {
	db *firestore.Client
}

func newFirestoreRepository(db *firestore.Client) Repository {
	return &firestoreRepository{db: db}
}

func (r *firestoreRepository) GetByID(ctx context.Context, id string) (*<Entity>, error) {
	doc, err := r.db.Collection("<entities>").Doc(id).Get(ctx)
	if status.Code(err) == codes.NotFound {
		return nil, Err<Entity>NotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get <entity> %s: %w", id, err)
	}
	var e <Entity>
	if err := doc.DataTo(&e); err != nil {
		return nil, fmt.Errorf("decode <entity> %s: %w", id, err)
	}
	return &e, nil
}

func (r *firestoreRepository) GetByUID(ctx context.Context, uid string) ([]*<Entity>, error) {
	docs, err := r.db.Collection("<entities>").
		Where("userID", "==", uid).
		OrderBy("createdAt", firestore.Desc).
		Limit(50).
		Documents(ctx).GetAll()
	if err != nil {
		return nil, fmt.Errorf("list <entities> for user %s: %w", uid, err)
	}
	result := make([]*<Entity>, 0, len(docs))
	for _, d := range docs {
		var e <Entity>
		if err := d.DataTo(&e); err != nil {
			return nil, fmt.Errorf("decode <entity> %s: %w", d.Ref.ID, err)
		}
		result = append(result, &e)
	}
	return result, nil
}

func (r *firestoreRepository) Create(ctx context.Context, e *<Entity>) error {
	_, err := r.db.Collection("<entities>").Doc(e.ID).Set(ctx, e)
	if err != nil {
		return fmt.Errorf("create <entity>: %w", err)
	}
	return nil
}

func (r *firestoreRepository) Update(ctx context.Context, id string, updates []firestore.Update) error {
	_, err := r.db.Collection("<entities>").Doc(id).Update(ctx, updates)
	if err != nil {
		return fmt.Errorf("update <entity> %s: %w", id, err)
	}
	return nil
}

// Service contains business logic
type Service struct {
	repo Repository
}

func NewService(db *firestore.Client) *Service {
	return &Service{repo: newFirestoreRepository(db)}
}

// NewServiceWithRepo is used in tests with a mock repository
func NewServiceWithRepo(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Get(ctx context.Context, uid, id string) (*<Entity>, error) {
	e, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err // sentinel already set by repo
	}
	if e.UserID != uid {
		return nil, Err<Entity>NotFound // ownership check — don't reveal existence
	}
	return e, nil
}

func (s *Service) List(ctx context.Context, uid string) ([]*<Entity>, error) {
	return s.repo.GetByUID(ctx, uid)
}
```

### handler.go

```go
package <name>

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"cloud.google.com/go/firestore"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes wires this service into the top-level Chi router.
// Call from main.go alongside other services.
func RegisterRoutes(r chi.Router, authClient *firebaseAuth.Client, db *firestore.Client) {
	svc := NewService(db)
	h := NewHandler(svc)

	r.Route("/api/v1/<entities>", func(r chi.Router) {
		r.Use(middleware.FirebaseAuth(authClient))
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/{<entity>ID}", h.Get)
	})
}

// Routes is used when this service registers its own sub-router (e.g. for handler tests).
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{<entity>ID}", h.Get)
}

// @Summary      List <entities>
// @Description  Returns all <entities> for the authenticated user
// @Tags         <name>
// @Produce      json
// @Success      200  {object}  pkg.ListResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      500  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/<entities> [get]
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	items, err := h.svc.List(r.Context(), uid)
	if err != nil {
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list <entities>")
		return
	}
	pkg.RespondList(w, items, len(items))
}

// @Summary      Get <entity>
// @Description  Returns a single <entity> by ID
// @Tags         <name>
// @Produce      json
// @Param        <entity>ID  path      string  true  "<Entity> ID"
// @Success      200  {object}  pkg.DataResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Failure      404  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/<entities>/{<entity>ID} [get]
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	id := chi.URLParam(r, "<entity>ID")
	item, err := h.svc.Get(r.Context(), uid, id)
	if errors.Is(err, Err<Entity>NotFound) {
		pkg.RespondError(w, http.StatusNotFound, "NOT_FOUND", "<entity> not found")
		return
	}
	if err != nil {
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get <entity>")
		return
	}
	pkg.RespondJSON(w, http.StatusOK, item)
}

// @Summary      Create <entity>
// @Description  Creates a new <entity> for the authenticated user
// @Tags         <name>
// @Accept       json
// @Produce      json
// @Param        body  body      Create<Entity>Request  true  "Request body"
// @Success      201  {object}  pkg.DataResponse
// @Failure      400  {object}  pkg.ErrorResponse
// @Failure      401  {object}  pkg.ErrorResponse
// @Security     BearerAuth
// @Router       /api/v1/<entities> [post]
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	uid := middleware.GetUID(r)
	if uid == "" {
		pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}
	var req Create<Entity>Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		pkg.RespondError(w, http.StatusBadRequest, "VALIDATION_ERROR", "invalid request body")
		return
	}
	// TODO: validate req fields
	item, err := h.svc.Create(r.Context(), uid, req)
	if err != nil {
		pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create <entity>")
		return
	}
	pkg.RespondJSON(w, http.StatusCreated, item)
}
```

### service_test.go

```go
package <name>

import (
	"context"
	"errors"
	"testing"

	"cloud.google.com/go/firestore"
)

// MockRepository — set only the funcs you need per test case
type MockRepository struct {
	GetByIDFunc  func(ctx context.Context, id string) (*<Entity>, error)
	GetByUIDFunc func(ctx context.Context, uid string) ([]*<Entity>, error)
	CreateFunc   func(ctx context.Context, e *<Entity>) error
	UpdateFunc   func(ctx context.Context, id string, updates []firestore.Update) error
}

func (m *MockRepository) GetByID(ctx context.Context, id string) (*<Entity>, error) {
	if m.GetByIDFunc != nil {
		return m.GetByIDFunc(ctx, id)
	}
	return nil, nil
}

func (m *MockRepository) GetByUID(ctx context.Context, uid string) ([]*<Entity>, error) {
	if m.GetByUIDFunc != nil {
		return m.GetByUIDFunc(ctx, uid)
	}
	return nil, nil
}

func (m *MockRepository) Create(ctx context.Context, e *<Entity>) error {
	if m.CreateFunc != nil {
		return m.CreateFunc(ctx, e)
	}
	return nil
}

func (m *MockRepository) Update(ctx context.Context, id string, updates []firestore.Update) error {
	if m.UpdateFunc != nil {
		return m.UpdateFunc(ctx, id, updates)
	}
	return nil
}

func TestService_Get(t *testing.T) {
	tests := []struct {
		name    string
		uid     string
		id      string
		mockFn  func(ctx context.Context, id string) (*<Entity>, error)
		wantErr error
	}{
		{
			name: "success",
			uid:  "uid-1",
			id:   "item-1",
			mockFn: func(_ context.Context, id string) (*<Entity>, error) {
				return &<Entity>{ID: id, UserID: "uid-1"}, nil
			},
		},
		{
			name: "not found returns sentinel",
			uid:  "uid-1",
			id:   "missing",
			mockFn: func(_ context.Context, _ string) (*<Entity>, error) {
				return nil, Err<Entity>NotFound
			},
			wantErr: Err<Entity>NotFound,
		},
		{
			name: "wrong owner returns not found",
			uid:  "uid-other",
			id:   "item-1",
			mockFn: func(_ context.Context, id string) (*<Entity>, error) {
				return &<Entity>{ID: id, UserID: "uid-1"}, nil
			},
			wantErr: Err<Entity>NotFound,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mock := &MockRepository{GetByIDFunc: tt.mockFn}
			svc := NewServiceWithRepo(mock)
			got, err := svc.Get(context.Background(), tt.uid, tt.id)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Errorf("err = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got == nil {
				t.Fatal("got nil, want <entity>")
			}
		})
	}
}
```

---

## Your Task

### Step 1 — Confirm service name

- Ask for the service name if not provided
- Ask for: entity name (e.g. `Report`), Firestore collection name (e.g. `reports`), and the initial endpoints
- Convert hyphens to single word if needed

### Step 2 — Check it doesn't already exist

```bash
ls apps/backend/services/
```

If it exists: report "Service already exists" and stop.

### Step 3 — Scaffold all four files

Create `apps/backend/services/<name>/` and write:
1. `models.go` — replace all `<Entity>`, `<entity>`, `<entities>` placeholders with the actual names
2. `service.go` — replace placeholders; use the actual Firestore collection name
3. `handler.go` — replace placeholders; add `errors` import if using `errors.Is`
4. `service_test.go` — replace placeholders

### Step 4 — Wire into main.go

Read `apps/backend/main.go` to find where other services call `RegisterRoutes`:

```bash
grep -n "RegisterRoutes\|services\." apps/backend/main.go | head -20
```

Add an import and a `RegisterRoutes` call for the new service, matching the exact pattern used by existing services.

### Step 5 — Build verification

```bash
make build-api 2>&1 | tail -20
```

If it fails, fix compilation errors before reporting done. The scaffold must compile clean.

### Step 6 — Run tests

```bash
cd apps/backend && go test -v -race ./services/<name>/... 2>&1
```

### Step 7 — ISO 29110 reminder

```
ISO 29110 REMINDER:
1. Run `/iso29110 srs <name>` to create docs/product/<name>/feature-spec.md (SI.2 — before writing business logic)
2. Run `/iso29110 test-plan <name>` to create docs/product/<name>/test-plan.md (SI.O4-O5)
3. Use @qa-dev to write handler_test.go with full HTTP handler coverage
```

---

## Rules

- NEVER read UID from request body — always `middleware.GetUID(r)`
- NEVER write raw JSON — always `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError`
- ALWAYS wrap Firestore errors: `fmt.Errorf("context: %w", err)`
- ALWAYS define sentinel errors named for the entity (`Err<Entity>NotFound`, not `ErrNotFound`)
- ALWAYS run `make build-api` before reporting done

*Version: 1.0.0*
*Last updated: 11 June 2026*
