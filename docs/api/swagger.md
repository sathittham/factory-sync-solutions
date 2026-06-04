---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Swagger/OpenAPI Documentation

## Overview

> **Status: NOT YET IMPLEMENTED**
>
> Swagger annotations exist in handler source code, but swaggo is not installed (`go.mod` does not include it), the Swagger UI route is commented out in `main.go`, and CI does not run `swag init`. This document describes the planned setup for when Swagger is enabled.

Use **swaggo/swag** to auto-generate OpenAPI documentation from Go code annotations. Swagger UI is served at `/api/v1/swagger/` in non-production environments.

## Setup

### Installation

```bash
# Install swag CLI
go install github.com/swaggo/swag/cmd/swag@latest

# Verify installation
swag --version
```

### Generate Documentation

```bash
cd apps/api

# Generate from main.go
swag init

# Format swagger comments
swag fmt
```

### Output Files

```
apps/api/docs/
├── docs.go       # Go file to embed in your app
├── swagger.json  # OpenAPI spec (JSON)
└── swagger.yaml  # OpenAPI spec (YAML)
```

> Note: `apps/api/docs/` would be gitignored — not yet generated.

## Main API Annotation

Add to `apps/api/main.go`:

```go
// @title           Factory Health Check API
// @version         1.0.0
// @description     API for factory health check quiz, scoring, and result management

// @contact.name   API Support

// @host      localhost:8080
// @BasePath  /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Firebase ID token: Bearer {token}

// @tag.name Profile
// @tag.description User and company profile management

// @tag.name Quiz
// @tag.description Quiz submission and question retrieval

// @tag.name Results
// @tag.description Assessment results and scoring

// @tag.name Admin
// @tag.description Admin dashboard and management (admin role required)

package main
```

## Handler Annotations

### GET Single Item

```go
// GetProfile godoc
// @Summary      Get user profile
// @Description  Returns the authenticated user's profile and company info
// @Tags         Profile
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string  true  "Bearer {firebase-id-token}"
// @Success      200  {object}  map[string]any  "success response with profile data"
// @Failure      401  {object}  map[string]any  "unauthorized"
// @Failure      404  {object}  map[string]any  "profile not found"
// @Failure      500  {object}  map[string]any  "internal error"
// @Security     BearerAuth
// @Router       /api/v1/profile [get]
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### GET List (Admin)

```go
// ListAssessments godoc
// @Summary      List all assessments
// @Description  Admin endpoint to list assessments with optional filters
// @Tags         Admin
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string  true   "Bearer {firebase-id-token}"
// @Param        industryType   query   string  false  "Filter by industry"
// @Param        companySize    query   string  false  "Filter by company size"  Enums(small,medium,large)
// @Success      200  {object}  map[string]any  "success response with assessments list"
// @Failure      401  {object}  map[string]any  "unauthorized"
// @Failure      403  {object}  map[string]any  "forbidden - admin only"
// @Failure      500  {object}  map[string]any  "internal error"
// @Security     BearerAuth
// @Router       /api/v1/admin/assessments [get]
func (h *AdminHandler) ListAssessments(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### POST Create

```go
// Register godoc
// @Summary      Register user profile
// @Description  Create user profile with company information after Google Sign-In
// @Tags         Profile
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string               true  "Bearer {firebase-id-token}"
// @Param        request        body    RegisterRequest      true  "Registration details"
// @Success      201  {object}  map[string]any  "created"
// @Failure      400  {object}  map[string]any  "validation error"
// @Failure      401  {object}  map[string]any  "unauthorized"
// @Failure      409  {object}  map[string]any  "already registered"
// @Failure      500  {object}  map[string]any  "internal error"
// @Security     BearerAuth
// @Router       /api/v1/profile [post]
func (h *ProfileHandler) Register(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

### POST Submit Quiz

```go
// SubmitQuiz godoc
// @Summary      Submit quiz answers
// @Description  Submit all quiz answers for scoring and diagnosis
// @Tags         Quiz
// @Accept       json
// @Produce      json
// @Param        Authorization  header  string           true  "Bearer {firebase-id-token}"
// @Param        request        body    SubmitQuizRequest true  "Quiz answers"
// @Success      201  {object}  map[string]any  "assessment result"
// @Failure      400  {object}  map[string]any  "validation error"
// @Failure      401  {object}  map[string]any  "unauthorized"
// @Failure      500  {object}  map[string]any  "internal error"
// @Security     BearerAuth
// @Router       /api/v1/quiz/submit [post]
func (h *QuizHandler) SubmitQuiz(w http.ResponseWriter, r *http.Request) {
    // ...
}
```

## Model Definitions

### Request Models

```go
// RegisterRequest represents the registration form
// @Description Registration request with company details
type RegisterRequest struct {
    CompanyName    string `json:"companyName" example:"ABC Factory Co., Ltd." validate:"required,min=2,max=200"`
    CompanyRegID   string `json:"companyRegId" example:"1234567890123" validate:"required,len=13,numeric"`
    IndustryType   string `json:"industryType" example:"manufacturing" validate:"required"`
    CompanySize    string `json:"companySize" example:"medium" validate:"required,oneof=small medium large"`
    ContactName    string `json:"contactName" example:"Somchai" validate:"required,min=2,max=100"`
    ContactEmail   string `json:"contactEmail" example:"somchai@abc-factory.com" validate:"required,email"`
    ContactPhone   string `json:"contactPhone" example:"0812345678" validate:"required"`
    TurnstileToken string `json:"turnstileToken" validate:"required"`
}

// SubmitQuizRequest represents quiz submission
// @Description Quiz answers for all dimensions
type SubmitQuizRequest struct {
    Answers []QuizAnswer `json:"answers" validate:"required,min=1"`
}

// QuizAnswer represents a single answer
type QuizAnswer struct {
    QuestionID string `json:"questionId" example:"q1" validate:"required"`
    Value      int    `json:"value" example:"4" validate:"required,min=1,max=5"`
}
```

### Response Models

```go
// AssessmentResult represents the scoring result
// @Description Quiz assessment result with scores and diagnosis
type AssessmentResult struct {
    ID           string           `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
    UID          string           `json:"uid" example:"firebase-uid-123"`
    OverallScore float64          `json:"overallScore" example:"3.75"` // 1.0 – 5.0
    Scores       []DimensionScore `json:"scores"`
    Strengths    []string         `json:"strengths" example:"Quality Management,Safety"`
    Weaknesses   []string         `json:"weaknesses" example:"Digital Transformation"`
    Diagnosis    string           `json:"diagnosis" example:"Developing"`
    SubmittedAt  string           `json:"submittedAt" example:"2026-02-01T08:30:00Z"`
}

// DimensionScore represents a score for one dimension (1–5 Likert scale)
type DimensionScore struct {
    Dimension string  `json:"dimension" example:"Quality Management"`
    Score     float64 `json:"score" example:"4.2"`
    MaxScore  float64 `json:"maxScore" example:"5.0"` // always 5.0
}
```

## Serving Swagger UI

Use `swaggo/http-swagger` with Chi:

```go
import httpSwagger "github.com/swaggo/http-swagger"
import _ "factory-sync-solutions/apps/api/docs" // generated swagger docs

// Only serve in non-production
if os.Getenv("ENVIRONMENT") != "production" {
    r.Get("/api/v1/swagger/*", httpSwagger.Handler(
        httpSwagger.URL("/api/v1/swagger/doc.json"),
    ))
}
```

**Access**: `http://localhost:8080/api/v1/swagger/index.html`

## Common Param Patterns

### Path Parameters
```go
// @Param  assessmentId  path  string  true  "Assessment ID (UUIDv4)"
```

### Query Parameters
```go
// @Param  industryType  query  string  false  "Filter by industry type"
// @Param  companySize   query  string  false  "Filter by company size"  Enums(small,medium,large)
```

### Header Parameters
```go
// @Param  Authorization  header  string  true  "Bearer {firebase-id-token}"
```

## CI/CD Integration

When implemented, Swagger docs will be regenerated in CI before each build. See [testing.md](testing.md) for the full workflow.

```yaml
# In the build job
- name: Install swag
  run: go install github.com/swaggo/swag/cmd/swag@latest

- name: Generate Swagger docs
  run: cd apps/api && swag init
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Keep annotations close to code | Add swagger comments directly above handlers |
| Use realistic examples | Use example values that match actual data format |
| Document all error codes | Include all possible error responses (400, 401, 403, 404, 409, 500) |
| Include security | Always add `@Security BearerAuth` for protected endpoints |
| Disable in production | Only serve Swagger UI in staging/development |
| Regenerate in CI | Run `swag init` before each build to keep spec in sync |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2026-03-07 | Add NOT YET IMPLEMENTED status notice; clarify docs not yet generated and CI not yet active |
| 1.0.0 | 2026-03-06 | Initial version |
