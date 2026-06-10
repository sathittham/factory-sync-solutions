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
| Logging | log/slog (structured JSON) |

## Project Structure

```
apps/fs-backend/
├── main.go                       # Entrypoint: wiring, router setup, server start
├── config/
│   ├── questions.json            # Shindan quiz questions & dimension definitions
│   ├── questions-factory.json    # Factory-specific assessment
│   ├── questions-lean.json       # Lean methodology assessment
│   └── questions-cybersecurity.json  # Cybersecurity assessment
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
    │   └── handler.go            # List assessments, export CSV, user management
    ├── audit/
    │   └── service.go            # Audit trail logging
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
    └── scoring/
        ├── scoring.go            # Rubric-based dimension scoring engine
        └── models.go             # Question, dimension, score models
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
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated) |
| `CF_TURNSTILE_SECRET` | Cloudflare Turnstile server secret |
| `RESEND_API_KEY` | Resend API key for email notifications |
| `SLACK_WEBHOOK_REGISTRATION` | Slack webhook for new registrations |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Slack webhook for quiz completions |

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

## API Routes

All API routes are under `/api/v1`. Authenticated routes require a `Authorization: Bearer <firebase-id-token>` header.

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/healthz` | Health check |

### Authenticated

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/profile` | Get user profile |
| `POST` | `/api/v1/profile` | Create profile (with Turnstile) |
| `PUT` | `/api/v1/profile` | Update user profile |
| `GET` | `/api/v1/profile/check/{regId}` | Check if registration ID is already taken |
| `GET` | `/api/v1/quiz/quizzes` | List available quizzes |
| `GET` | `/api/v1/quiz/questions` | Get quiz questions |
| `POST` | `/api/v1/quiz/submit` | Submit quiz answers |
| `GET` | `/api/v1/results` | Get all assessment results for user |
| `GET` | `/api/v1/results/{assessmentId}` | Get single assessment result |
| `GET` | `/api/v1/dbd/*` | DBD company lookup |

### Admin (requires `admin` role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/assessments` | List all assessments |
| `GET` | `/api/v1/admin/assessments/{id}` | Get single assessment |
| `GET` | `/api/v1/admin/export` | Export assessments as CSV |
| `GET` | `/api/v1/admin/users` | List all users |
| `PUT` | `/api/v1/admin/users/{uid}/role` | Set user role |

## Architecture

The API follows a **handler → service → repository** layered pattern:

- **Handlers** parse HTTP requests, validate input, and write responses
- **Services** contain business logic and orchestrate cross-cutting concerns
- **Repositories** handle Firestore persistence

Dependencies are wired manually in `main.go` (no DI framework).
