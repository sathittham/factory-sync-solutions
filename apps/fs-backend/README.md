# FactorySync Solutions — API

Go REST API powering the FactorySync Solutions assessment platform. Handles authentication, profile management, quiz submission with rubric-based scoring, result storage, admin operations, and notifications.

## Tech Stack

| Layer | Choice |
|---|---|
| Language | Go 1.26.4 |
| Router | chi v5 |
| Auth | Firebase Admin SDK (ID token verification) |
| Database | Cloud Firestore |
| Validation | go-playground/validator |
| Bot protection | Cloudflare Turnstile (server-side verify) |
| Email | Resend |
| Notifications | Slack webhooks |
| Rate limiting | golang.org/x/time (token bucket per IP) |
| Object storage | Cloudflare R2 via S3-compatible API |
| API docs | swaggo + versioned Swagger/OpenAPI artifacts |
| Logging | log/slog (structured JSON) |

## Project Structure

```
apps/fs-backend/
├── main.go                       # Entrypoint: wiring, router setup, server start
├── config/
│   ├── questions.json            # Shindan quiz questions & dimension definitions
│   ├── questions-factory.json    # Factory-specific assessment
│   ├── questions-lean.json       # Lean methodology assessment
│   ├── questions-cybersecurity.json  # Cybersecurity assessment
│   └── questions-iso29110.json   # ISO 29110 Basic Profile assessment
├── docs/
│   └── v1/                       # Generated Swagger/OpenAPI artifacts
├── middleware/
│   ├── auth.go                   # Firebase ID token verification + RequireAdmin
│   ├── cors.go                   # CORS configuration
│   ├── ratelimit.go              # Per-IP rate limiting
│   ├── security.go               # Security headers
│   └── testing.go                # Test helpers
├── pkg/
│   ├── firestore.go              # Firestore client initializer
│   ├── response.go               # JSON response helpers
│   ├── turnstile.go              # Cloudflare Turnstile verification
│   └── validator.go              # Request validation
└── services/
    ├── admin/
    │   └── handler.go            # Admin, project member, and invitation endpoints
    ├── audit/
    │   └── audit.go              # Audit trail logging
    ├── backoffice/
    │   ├── handler.go            # Internal staff/superadmin endpoints
    │   └── api_docs.go           # API docs reader (filesystem/R2)
    ├── dbd/
    │   ├── handler.go            # DBD (Dept of Business Development) lookup
    │   ├── service.go
    │   └── models.go
    ├── notification/
    │   ├── service.go            # Orchestrates email + Slack notifications
    │   ├── email.go              # Resend email client
    │   ├── slack.go              # Slack webhook client
    │   └── models.go
    ├── profile/
    │   ├── handler.go            # CRUD profile endpoints
    │   ├── service.go            # Business logic + Turnstile verification
    │   ├── repository.go         # Firestore persistence
    │   ├── adapter.go            # ProfileData adapter for cross-service use
    │   └── models.go
    ├── quiz/
    │   ├── handler.go            # Submit quiz answers
    │   ├── service.go            # Orchestrates scoring + result storage + notifications
    │   ├── service_test.go
    │   └── models.go
    ├── result/
    │   ├── handler.go            # Get assessment results
    │   ├── service.go            # Result retrieval logic
    │   ├── repository.go         # Firestore persistence
    │   └── models.go
    ├── scoring/
        ├── scoring.go            # Rubric-based dimension scoring engine
        └── models.go             # Question, dimension, score models
    └── upload/
        ├── handler.go            # Avatar upload/delete endpoints
        ├── service.go            # Image validation, resize, WebP, Firestore update
        └── r2.go                 # R2 object store wrapper
```

## Getting Started

### Prerequisites

- Go 1.26.4+
- A GCP project with Firestore and Firebase Auth enabled
- Service account credentials JSON (for local dev)

### Environment

Copy the example and fill in your values:

```bash
cp .env.example .env.development
```

| Variable | Description |
|---|---|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON |
| `PORT` | Server port (default: `8080`) |
| `ENVIRONMENT` | `development` / `production` |
| `APP_URL` | Authenticated app URL used as Firebase password-reset / invite continue URL |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |
| `CF_TURNSTILE_SECRET` | Cloudflare Turnstile server secret |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `SLACK_WEBHOOK_REGISTRATION` | Slack webhook for new registrations |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Slack webhook for quiz completions |
| `R2_ACCOUNT_ID` | Cloudflare account ID for avatar upload storage |
| `R2_ACCESS_KEY_ID` | R2 access key ID |
| `R2_ACCESS_KEY_SECRET` | R2 access key secret |
| `R2_PUBLIC_BUCKET` | Public R2 bucket for CDN-served objects |
| `R2_PUBLIC_BASE_URL` | Public delivery base URL for uploaded avatars |
| `API_DOCS_SOURCE` | `filesystem` locally, `r2` in deployed environments |
| `API_DOCS_R2_ACCOUNT_ID` | Cloudflare account ID for API docs R2 reader |
| `API_DOCS_R2_ACCESS_KEY_ID` | API docs R2 reader access key ID |
| `API_DOCS_R2_ACCESS_KEY_SECRET` | API docs R2 reader access key secret |
| `API_DOCS_R2_BUCKET` | Private R2 bucket for generated API docs |
| `API_DOCS_R2_PREFIX` | R2 prefix for docs artifacts (default `openapi`) |
| `API_DOCS_SUPPORTED_VERSIONS` | Comma-separated exposed API versions (default `v1`) |
| `API_DOCS_DEFAULT_VERSION` | Default API docs version (default `v1`) |
| `API_DOCS_LOCAL_DIR` | Local generated docs directory (default `docs`) |

### Run

```bash
go run main.go
```

Server starts at `http://localhost:8080`.

### Using Firebase Emulators

Uncomment in your `.env.development`:

```env
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Test

```bash
go test ./...
```

### Generate API Docs

From the repo root:

```bash
make docs-api
```

## API Routes

All API routes are under `/api/v1`. Authenticated routes require a `Authorization: Bearer <firebase-id-token>` header.

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |
| `GET` | `/api/v1/swagger/*` | Swagger UI in non-production environments |

### Authenticated

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/profile` | Get user profile |
| `POST` | `/api/v1/profile` | Create profile (with Turnstile) |
| `PUT` | `/api/v1/profile` | Update user profile |
| `GET` | `/api/v1/profile/check/{regId}` | Check if registration ID is already taken |
| `GET` | `/api/v1/profile/activity` | Get the caller's activity timeline |
| `POST` | `/api/v1/profile/activity/login` | Log a sign-in activity event |
| `GET` | `/api/v1/quiz/quizzes` | List available quizzes |
| `GET` | `/api/v1/quiz/questions` | Get quiz questions |
| `POST` | `/api/v1/quiz/submit` | Submit quiz answers |
| `GET` | `/api/v1/results` | Get all assessment results for user |
| `GET` | `/api/v1/results/{assessmentId}` | Get single assessment result |
| `GET` | `/api/v1/dbd/{regId}` | DBD company lookup |
| `POST` | `/api/v1/upload/avatar` | Upload/replace caller avatar in R2 |
| `DELETE` | `/api/v1/upload/avatar` | Delete caller avatar from R2 |
| `POST` | `/api/v1/invitations/accept` | Accept a project invitation |

### Admin (requires `admin` role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/assessments` | List all assessments |
| `GET` | `/api/v1/admin/assessments/{id}` | Get single assessment |
| `GET` | `/api/v1/admin/export` | Export assessments as CSV |
| `GET` | `/api/v1/admin/users` | List all users |
| `PUT` | `/api/v1/admin/users/{uid}/role` | Set user role |

### Manage (requires Firestore project role `owner`, `system_admin`, or `admin`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/manage/users` | List project users |
| `PUT` | `/api/v1/manage/users/{uid}/role` | Set project member role |
| `POST` | `/api/v1/manage/invitations` | Invite a project member |
| `DELETE` | `/api/v1/manage/invitations/{uid}` | Cancel an invitation |
| `POST` | `/api/v1/manage/invitations/{uid}/resend` | Resend an invitation |

### Backoffice (requires `backofficeRole: "staff"` or `"superadmin"`)

Superadmin-only actions are enforced inside the backoffice handler.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/backoffice/stats` | Platform summary stats |
| `GET` / `POST` | `/api/v1/backoffice/projects` | List or create projects |
| `GET` / `PUT` | `/api/v1/backoffice/projects/{projectID}` | Get or update project |
| `POST` | `/api/v1/backoffice/projects/{projectID}/deactivate` | Deactivate project (superadmin) |
| `POST` | `/api/v1/backoffice/projects/{projectID}/reactivate` | Reactivate project (superadmin) |
| `GET` | `/api/v1/backoffice/projects/{projectID}/members` | List project members |
| `POST` | `/api/v1/backoffice/projects/{projectID}/invite-owner` | Invite project owner |
| `PUT` / `DELETE` | `/api/v1/backoffice/projects/{projectID}/members/{uid}` | Change or remove project member |
| `GET` | `/api/v1/backoffice/users` | List users |
| `GET` | `/api/v1/backoffice/users/{uid}` | Get user detail |
| `GET` | `/api/v1/backoffice/users/{uid}/activity` | Get user activity (superadmin) |
| `PUT` | `/api/v1/backoffice/users/{uid}/role` | Set customer-facing role (superadmin) |
| `DELETE` | `/api/v1/backoffice/users/{uid}` | Delete user (superadmin) |
| `GET` | `/api/v1/backoffice/results` | List assessment results |
| `GET` | `/api/v1/backoffice/results/{assessmentID}` | Get assessment result |
| `GET` | `/api/v1/backoffice/export` | Export assessment results as CSV |
| `GET` | `/api/v1/backoffice/staff` | List backoffice staff (superadmin) |
| `POST` | `/api/v1/backoffice/staff/invitations` | Invite staff (superadmin) |
| `PUT` / `DELETE` | `/api/v1/backoffice/staff/{uid}` | Set or revoke `backofficeRole` (superadmin) |
| `GET` | `/api/v1/backoffice/audit` | Search audit events (superadmin) |
| `GET` | `/api/v1/backoffice/api-docs/versions` | List API doc versions (superadmin) |
| `GET` | `/api/v1/backoffice/api-docs/{apiVersion}/metadata` | Get API doc metadata (superadmin) |
| `GET` | `/api/v1/backoffice/api-docs/{apiVersion}/openapi.json` | Get OpenAPI JSON (superadmin) |
| `GET` | `/api/v1/backoffice/api-docs/{apiVersion}/openapi.yaml` | Get OpenAPI YAML (superadmin) |

## Architecture

The API follows a **handler → service → repository** layered pattern:

- **Handlers** parse HTTP requests, validate input, and write responses
- **Services** contain business logic and orchestrate cross-cutting concerns
- **Repositories** handle Firestore persistence

Dependencies are wired manually in `main.go` (no DI framework).
