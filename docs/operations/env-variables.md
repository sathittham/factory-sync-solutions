---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Environment Variables

Centralized reference for all environment variables used across the project.

## Backend (Go API)

### Firebase & GCP

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Dev only | Path to service account JSON file. Not needed on GCP (uses Application Default Credentials). | `/path/to/service-account.json` |
| `FIRESTORE_EMULATOR_HOST` | Emulator only | Firestore emulator address. Set this to use the local emulator instead of production Firestore. | `localhost:8080` |
| `FIREBASE_AUTH_EMULATOR_HOST` | Emulator only | Firebase Auth emulator address. Set this for integration tests with auth. | `localhost:9099` |
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID. Auto-detected on GCP, required locally. | `factory-health-check-prod` |
| `PORT` | No | HTTP server port. Defaults to `8080`. | `8080` |
| `ENVIRONMENT` | Yes | Current environment. Controls Swagger UI visibility and log levels. | `development`, `staging`, `production` |

### Secrets (API Keys)

| Variable | Required | Description | Where Stored |
|----------|----------|-------------|-------------|
| `RESEND_API_KEY` | Yes | Resend email service API key. | GitHub Secrets |
| `CF_TURNSTILE_SECRET` | Yes | Cloudflare Turnstile server-side secret for bot verification. | GitHub Secrets |

### CORS & Security

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins. | `http://localhost:5173,https://factory-sync-solutions.pages.dev` |

### Slack Webhooks

| Variable | Required | Description | Where Stored |
|----------|----------|-------------|-------------|
| `SLACK_WEBHOOK_REGISTRATION` | Yes | Webhook URL for `#registrations` channel | GitHub Secrets |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Yes | Webhook URL for `#quiz-results` channel | GitHub Secrets |

## Frontend (React SPA)

Only `VITE_` prefixed variables are exposed to the browser. Never put secrets here.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase project API key (public) | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `factory-health-check-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123:web:abc` |
| `VITE_API_BASE_URL` | No | Backend API base URL (empty = use Vite proxy in dev) | `/api/v1` |
| `VITE_CF_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile public site key | `0x4AAA...` |

## CI/CD (GitHub Settings)

All secrets and variables are managed in **GitHub repo Settings > Secrets and variables > Actions**.
Each deploy environment (`staging`, `production`) has its own set of values.

### GitHub Secrets (per environment)

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | GCP service account key JSON (Cloud Run deployment) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (Pages deployment) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `RESEND_API_KEY` | Resend email API key (injected into Cloud Run) |
| `CF_TURNSTILE_SECRET` | Cloudflare Turnstile server secret (injected into Cloud Run) |
| `SLACK_WEBHOOK_REGISTRATION` | Slack webhook for registrations (injected into Cloud Run) |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Slack webhook for quiz results (injected into Cloud Run) |

### GitHub Variables (per environment)

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://factory-sync-solutions.pages.dev` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `factory-health-check-prod` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `VITE_API_BASE_URL` | Backend API URL | `https://api.example.com/api/v1` |

### Workflow Triggers

| Workflow | Trigger | File |
|----------|---------|------|
| CI (test) | Push/PR to `main`, `staging`, `develop` | `.github/workflows/test.yml` |
| Deploy Staging | Tag `v*-staging` (e.g. `v1.0.0-staging`) | `.github/workflows/deploy-staging.yml` |
| Deploy Production | Tag `v*.*.*` excluding `-*` (e.g. `v1.0.0`) | `.github/workflows/deploy-production.yml` |

## Environment-Specific Values

| Variable | Development | Staging | Production |
|----------|------------|---------|------------|
| `ENVIRONMENT` | `development` | `staging` | `production` |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | `https://factory-sync-solutions-staging.pages.dev` | `https://factory-sync-solutions.pages.dev` |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | `https://api-staging.example.com/api/v1` | `https://api.example.com/api/v1` |

## Local Development Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your values (see table above).

3. For Firestore Emulator:
   ```bash
   # Start emulators
   firebase emulators:start --only firestore,auth

   # In another terminal, set emulator env vars
   export FIRESTORE_EMULATOR_HOST=localhost:8080
   export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
   cd apps/api && go run main.go
   ```

## Rules

- **Never commit `.env` files** — only `.env.example` (without real values) is committed.
- **Use GitHub Secrets** for all secrets in staging and production. Secrets are injected into Cloud Run at deploy time via `--set-env-vars`.
- **Only `VITE_` prefixed vars** are exposed to the browser — never put secrets there.
- **Rotate keys regularly** — Resend API key, Turnstile secret, Slack webhooks.
- **Migration path** — if you outgrow GitHub Secrets, switch to GCP Secret Manager via Cloud Run `--set-secrets` flag. No code changes needed — `os.Getenv()` stays the same.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-06 | Updated to GitHub Secrets strategy, fixed Slack webhook names, added workflow triggers table |
| 1.2.0 | 2026-03-07 | Updated Cloud Functions → Cloud Run references throughout |
