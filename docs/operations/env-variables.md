---
version: 1.5.1
lastUpdated: 2026-06-14
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
| `GCP_PROJECT_ID` | Yes | Google Cloud project ID. Auto-detected on GCP, required locally. | `factory-sync-solutions` |
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

### Upload Storage

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `R2_ACCOUNT_ID` | When upload service enabled | Cloudflare account ID for R2 uploads. | `9cfbba8b3a373fdc0d11abaf64071719` |
| `R2_ACCESS_KEY_ID` | When upload service enabled | R2 access key ID for the public upload bucket. | GitHub Secret / Cloud Run env |
| `R2_ACCESS_KEY_SECRET` | When upload service enabled | R2 access key secret for the public upload bucket. | GitHub Secret / Cloud Run env |
| `R2_PUBLIC_BUCKET` | When upload service enabled | Public R2 bucket used for CDN-served avatars. | `uploads-factorysyncsolutions-com-staging` |
| `R2_PUBLIC_BASE_URL` | When upload service enabled | Public delivery base URL for avatar URLs stored in Firestore. | `https://cdn-staging.factorysyncsolutions.com` |

## Cloudflare Worker — API Gateway

These values are configured in `infra/cloudflare/workers/api-gateway/wrangler.toml` and are
deployed by Wrangler.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `UPSTREAM_ORIGIN` | Yes | Cloud Run origin that receives proxied API requests. Do not include `/api/v1`. | `https://factory-sync-solutions-api-staging-awjl4b5skq-eu.a.run.app` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated browser origins allowed by the gateway CORS layer. | `https://app-staging.factorysyncsolutions.com,https://backoffice-staging.factorysyncsolutions.com` |

### API Documentation Artifacts

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `API_DOCS_SOURCE` | No | Source used by backend API docs readers. Local development defaults to filesystem; deployed environments should use R2 when API docs endpoints are enabled. | `filesystem`, `r2` |
| `API_DOCS_R2_ACCOUNT_ID` | When `API_DOCS_SOURCE=r2` | Cloudflare account ID for the API docs R2 reader credentials. | `9cfbba8b3a373fdc0d11abaf64071719` |
| `API_DOCS_R2_ACCESS_KEY_ID` | When `API_DOCS_SOURCE=r2` | R2 access key ID scoped to read the API docs bucket. | GitHub Secret / Cloud Run env |
| `API_DOCS_R2_ACCESS_KEY_SECRET` | When `API_DOCS_SOURCE=r2` | R2 access key secret scoped to read the API docs bucket. | GitHub Secret / Cloud Run env |
| `API_DOCS_R2_BUCKET` | When `API_DOCS_SOURCE=r2` | Environment-specific private R2 bucket for generated Swagger/OpenAPI artifacts. | `apidoc-factorysyncsolutions-com-staging` |
| `API_DOCS_R2_PREFIX` | No | R2 prefix for API docs artifacts. Defaults to `openapi`. | `openapi` |
| `API_DOCS_SUPPORTED_VERSIONS` | No | Comma-separated API versions exposed by docs tooling. | `v1` |
| `API_DOCS_DEFAULT_VERSION` | No | Default API docs version. | `v1` |
| `API_DOCS_LOCAL_DIR` | Dev only | Local generated docs directory relative to `apps/fs-backend`. | `docs` |

## Frontend — `fs-app-web` (User App)

Only `VITE_` prefixed variables are exposed to the browser. Never put secrets here.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase project API key (public) | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID | `factory-sync-solutions` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket | `factory-sync-solutions.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID | `1:123:web:abc` |
| `VITE_API_BASE_URL` | No | Backend API base URL (empty = use Vite proxy in dev) | `/api/v1` |
| `VITE_OFFICIAL_WEB_URL` | No | Official website URL for legal and marketing handoff links. | `https://factorysyncsolutions.com` |
| `VITE_CF_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile public site key | `0x4AAA...` |
| `VITE_GTM_ID` | No | Google Tag Manager container ID. | `GTM-XXXXXXX` |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID. | `G-XXXXXXXXXX` |

## Frontend — `fs-backoffice-web` (Staff Backoffice)

Uses the **same Firebase project** as `fs-app-web` — no separate Firebase app needed.
There is no Turnstile widget on the backoffice (Cloudflare Access handles bot/access control at the network layer).

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Same Firebase API key as `fs-app-web` | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Same Firebase Auth domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Same Firebase project ID | `factory-sync-solutions` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Same Firebase storage bucket | `factory-sync-solutions.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Same messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID (backoffice web app) | `1:123:web:def` |
| `VITE_API_BASE_URL` | No | Backend API base URL | `http://localhost:8080/api/v1` |
| `VITE_PROXY_TARGET` | Dev only | Backend proxy target used by Vite dev server. | `http://localhost:8080` |

## Frontend — `fs-official-web` (Public Site)

Only `PUBLIC_` prefixed variables are exposed to the browser. Never put secrets here.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PUBLIC_APP_URL` | No | Authenticated app URL used by CTAs. | `https://app.factorysyncsolutions.com` |
| `PUBLIC_APP_VERSION` | No | Version displayed in the footer. | `v1.2.3` |
| `PUBLIC_GTM_ID` | No | Google Tag Manager container ID. | `GTM-XXXXXXX` |
| `PUBLIC_API_BASE_URL` | No | Backend API base URL for embedded registration flows. | `https://api.factorysyncsolutions.com/v1` |
| `PUBLIC_CF_TURNSTILE_SITE_KEY` | No | Cloudflare Turnstile public site key for embedded registration. | `0x4AAA...` |
| `PUBLIC_FIREBASE_API_KEY` | Registration flow only | Firebase public API key. | `AIza...` |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | Registration flow only | Firebase Auth domain. | `project-id.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Registration flow only | Firebase project ID. | `factory-sync-solutions` |
| `PUBLIC_FIREBASE_STORAGE_BUCKET` | Registration flow only | Firebase storage bucket. | `factory-sync-solutions.firebasestorage.app` |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Registration flow only | Firebase messaging sender ID. | `123456789` |
| `PUBLIC_FIREBASE_APP_ID` | Registration flow only | Firebase app ID. | `1:123:web:abc` |

## CI/CD (GitHub Settings)

All secrets and variables are managed in **GitHub repo Settings > Secrets and variables > Actions**.
Each deploy environment (`staging`, `production`) has its own set of values.

### GitHub Secrets (per environment)

| Secret | Description |
|--------|-------------|
| `GCP_SA_KEY` | GCP service account key JSON (Cloud Run deployment) |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token for Pages deploys and R2 API docs publishing |
| `CLOUDFLARE_WORKERS_API_TOKEN` | Cloudflare API token for API gateway Worker deploys; must be able to edit Workers and custom domains/routes for `factorysyncsolutions.com` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `RESEND_API_KEY` | Resend email API key (injected into Cloud Run) |
| `CF_TURNSTILE_SECRET` | Cloudflare Turnstile server secret (injected into Cloud Run) |
| `SLACK_WEBHOOK_REGISTRATION` | Slack webhook for registrations (injected into Cloud Run) |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Slack webhook for quiz results (injected into Cloud Run) |
| `SLACK_WEBHOOK_DEPLOY` | Slack webhook for CI/CD deploy notifications (injected into deploy workflow) |
| `R2_ACCESS_KEY_ID` | R2 access key ID for upload storage, when uploads are enabled |
| `R2_ACCESS_KEY_SECRET` | R2 access key secret for upload storage, when uploads are enabled |
| `API_DOCS_R2_ACCOUNT_ID` | Cloudflare account ID for API docs R2 reads |
| `API_DOCS_R2_ACCESS_KEY_ID` | R2 access key ID scoped to read API docs artifacts |
| `API_DOCS_R2_ACCESS_KEY_SECRET` | R2 access key secret scoped to read API docs artifacts |

### GitHub Variables (per environment)

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated; include Pages and custom domains for app, backoffice, and official site) | `https://factory-sync-solutions.pages.dev,https://app.factorysyncsolutions.com,https://backoffice.factorysyncsolutions.com,https://factorysyncsolutions.com` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain | `project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `factory-sync-solutions` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `factory-sync-solutions.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID (fs-app-web) | `1:123:web:abc` |
| `VITE_BACKOFFICE_APP_ID` | Firebase app ID (fs-backoffice-web) | `1:123:web:def` |
| `VITE_API_BASE_URL` | Backend API URL | `https://api.factorysyncsolutions.com/v1` |
| `BACKOFFICE_APP_URL` | Backoffice URL used for staff invitation password setup links; falls back to `APP_URL` if unset | `https://backoffice.example.com` |
| `R2_ACCOUNT_ID` | Cloudflare account ID for upload storage | `9cfbba8b3a373fdc0d11abaf64071719` |
| `R2_PUBLIC_BUCKET` | Public R2 bucket for avatar uploads | `uploads-factorysyncsolutions-com-staging` |
| `R2_PUBLIC_BASE_URL` | Public base URL for uploaded avatars | `https://cdn-staging.factorysyncsolutions.com` |
| `API_DOCS_R2_BUCKET` | Private R2 bucket receiving generated API docs for this environment | `apidoc-factorysyncsolutions-com-staging` |
| `API_DOCS_R2_PREFIX` | R2 object prefix for generated API docs. Defaults to `openapi` in workflows. | `openapi` |

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
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:5174` | `https://factory-sync-solutions-staging.pages.dev,https://factory-sync-backoffice-staging.pages.dev,https://app-staging.factorysyncsolutions.com,https://backoffice-staging.factorysyncsolutions.com,https://staging.factorysyncsolutions.com` | `https://factory-sync-solutions.pages.dev,https://factory-sync-backoffice.pages.dev,https://app.factorysyncsolutions.com,https://backoffice.factorysyncsolutions.com,https://factorysyncsolutions.com` |
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | `https://api-staging.factorysyncsolutions.com/v1` | `https://api.factorysyncsolutions.com/v1` |
| `PUBLIC_API_BASE_URL` | `http://localhost:8080/api/v1` | `https://api-staging.factorysyncsolutions.com/v1` | `https://api.factorysyncsolutions.com/v1` |
| `R2_PUBLIC_BASE_URL` | Local R2 dev URL or empty | `https://cdn-staging.factorysyncsolutions.com` | `https://cdn.factorysyncsolutions.com` |

## Local Development Setup

1. Copy the example file for each app:
   ```bash
   cp apps/fs-backend/.env.example        apps/fs-backend/.env.development
   cp apps/fs-app-web/.env.example        apps/fs-app-web/.env
   cp apps/fs-backoffice-web/.env.example apps/fs-backoffice-web/.env.local
   cp apps/fs-official-web/.env.example   apps/fs-official-web/.env
   ```

2. Fill in your values (see tables above).

3. For Firestore Emulator:
   ```bash
   # Start emulators
   firebase emulators:start --only firestore,auth

   # In another terminal, set emulator env vars
   export FIRESTORE_EMULATOR_HOST=localhost:8080
   export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
   cd apps/fs-backend && go run main.go
   ```

4. To test backoffice locally, set `backofficeRole` on a test Firebase user via the Firebase Admin SDK or the emulator UI, then sign in at `http://localhost:5174`.

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
| 1.1.0 | 2026-06-11 | Added fs-backoffice-web env vars; updated ALLOWED_ORIGINS to include backoffice origins; updated local dev setup; updated app path references |
| 1.2.0 | 2026-06-13 | Fix stale project ID examples; update storage bucket format to firebasestorage.app; add SLACK_WEBHOOK_DEPLOY secret |
| 1.3.0 | 2026-06-14 | Add API docs R2 publishing variables |
| 1.4.0 | 2026-06-14 | Add Cloudflare API gateway variables and CDN custom domain examples |
| 1.4.1 | 2026-06-14 | Change deployed API base URLs from `/api/v1` to `/v1` |
| 1.5.0 | 2026-06-14 | Move API gateway Worker references to the infrastructure layout |
| 1.5.1 | 2026-06-14 | Split Worker deploy token from Pages and R2 deploy token |
