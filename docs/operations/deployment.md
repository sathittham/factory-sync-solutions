---
version: 1.4.1
lastUpdated: 2026-06-14
author: Sathittham Sangthong
---

# Deployment Guide

## Overview

| Component | Platform | Method |
|-----------|----------|--------|
| `fs-app-web` (user app) | Cloudflare Pages | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-backoffice-web` (staff backoffice) | Cloudflare Pages + Cloudflare Access | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-official-web` (public site) | Cloudflare Pages | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-api-gateway` (API custom domain) | Cloudflare Workers | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-backend` (Go API) | Google Cloud Run | Docker container via GitHub Actions |
| Public upload CDN | Cloudflare R2 custom domain | Cloudflare zone/R2 bucket configuration |
| Database | Firestore | Managed service (no deployment needed) |
| Auth | Firebase Authentication | Managed service (no deployment needed) |

## Branch & Tag Strategy

| Trigger | Deploys to | Workflow |
|---------|------------|---------|
| Tag `v*-staging` | Staging | `deploy-staging.yml` |
| Tag `v*.*.*` (excluding `-*`) | Production | `deploy-production.yml` |
| Push/PR to `main`, `staging`, `develop` | CI only (tests) | `test.yml` |

## Frontend Deployment (Cloudflare Pages)

### Automatic Deployment (GitHub Actions)

The `deploy-staging.yml` and `deploy-production.yml` workflows handle all frontend deployments:

1. Installs dependencies (`npm ci`)
2. Builds with Vite (`npx vite build`) with injected `VITE_*` env vars
3. Deploys via `cloudflare/wrangler-action@v3`

### `fs-app-web` (User App)

| Environment | CF Pages Project | Domain |
|-------------|-----------------|--------|
| Staging | `factory-sync-solutions-staging` | `app-staging.factorysyncsolutions.com` |
| Production | `factory-sync-solutions` | `app.factorysyncsolutions.com` |

```bash
# Manual deploy
cd apps/fs-app-web
npm ci && npx vite build
npx wrangler pages deploy dist --project-name=factory-sync-solutions
```

### `fs-backoffice-web` (Staff Backoffice)

| Environment | CF Pages Project | Domain |
|-------------|-----------------|--------|
| Staging | `factory-sync-backoffice-staging` | `backoffice-staging.factorysyncsolutions.com` |
| Production | `factory-sync-backoffice` | `backoffice.factorysyncsolutions.com` |

**Cloudflare Access** is applied to the production domain. Only users on the
FactorySync email allowlist (or an explicit allow-list) can reach the
site. This is a network-layer gate configured in the Cloudflare Zero Trust
dashboard — it is separate from Firebase Auth.

```bash
# Manual deploy
cd apps/fs-backoffice-web
npm ci && npx vite build
npx wrangler pages deploy dist --project-name=factory-sync-backoffice
```

> Cloudflare Access policy must be set up once in the Zero Trust dashboard:
> **Access > Applications > factory-sync-backoffice > Policy: allow approved staff emails**

## Backend Deployment (Cloud Run)

### Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud config set project <PROJECT_ID>

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable firestore.googleapis.com
```

### Cloud Run Configuration

| Setting | Value |
|---------|-------|
| Runtime | Docker (Go binary) |
| Region | `asia-southeast3` |
| Allow unauthenticated | Yes (API handles auth internally) |

## API Gateway (Cloudflare Workers)

The public API hostname is served by `apps/fs-api-gateway`, a Cloudflare Worker
that proxies to Cloud Run and handles browser CORS preflight at the edge.
Authentication, authorization, validation, and response formatting remain in the
Go backend.

| Environment | Worker | Domain | Frontend API base URL |
|---|---|---|---|
| Staging | `factory-sync-api-gateway-staging` | `api-staging.factorysyncsolutions.com` | `https://api-staging.factorysyncsolutions.com/v1` |
| Production | `factory-sync-api-gateway` | `api.factorysyncsolutions.com` | `https://api.factorysyncsolutions.com/v1` |

Manual deploy:

```bash
cd apps/fs-api-gateway
npm test
npm run deploy:staging
npm run deploy:prod
```

The Cloudflare API token used by GitHub Actions must be able to deploy Workers
and manage custom domains/routes for the `factorysyncsolutions.com` zone.

### Manual Deployment

```bash
make build-api

# Build and push Docker image
IMAGE=asia-southeast3-docker.pkg.dev/<PROJECT_ID>/cloud-run/factory-sync-solutions-api:latest
docker build -t $IMAGE apps/fs-backend
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy factory-sync-solutions-api \
  --image=$IMAGE \
  --region=asia-southeast3 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=staging,ALLOWED_ORIGINS=https://factory-sync-solutions-staging.pages.dev"
```

### API Docs Publishing

Every backend build regenerates Swagger/OpenAPI artifacts from Go annotations before compilation:

```bash
make docs-api
make build-api
```

Backend deploy workflows publish the generated artifacts to the environment-specific private R2 bucket after Cloud Run deploy succeeds. Objects are written first to a commit-specific path, then to the stable `current` path:

```text
openapi/v1/versions/<git-sha>/metadata.json
openapi/v1/versions/<git-sha>/swagger.json
openapi/v1/versions/<git-sha>/swagger.yaml
openapi/v1/current/metadata.json
openapi/v1/current/swagger.json
openapi/v1/current/swagger.yaml
```

Generated API docs are published to:

| Environment | R2 bucket |
|---|---|
| Staging | `apidoc-factorysyncsolutions-com-staging` |
| Production | `apidoc-factorysyncsolutions-com` |

Required per-environment GitHub Actions secrets for the Cloud Run API docs reader:

| Secret | Description |
|---|---|
| `API_DOCS_R2_ACCOUNT_ID` | Cloudflare account ID for API docs R2 reads. |
| `API_DOCS_R2_ACCESS_KEY_ID` | R2 access key ID scoped to read the target docs bucket. |
| `API_DOCS_R2_ACCESS_KEY_SECRET` | R2 access key secret scoped to read the target docs bucket. |

Required per-environment GitHub Actions variables:

| Variable | Description |
|---|---|
| `API_DOCS_R2_PREFIX` | Optional object prefix; defaults to `openapi`. |

The Cloudflare API token used by deploy workflows must have permission to write R2 objects in the target bucket.

### Public Upload CDN

Public uploads should be served through Cloudflare R2 custom domains, not direct
S3 API endpoints and not public `r2.dev` URLs in production.

| Environment | R2 bucket | Public base URL |
|---|---|---|
| Staging | `uploads-factorysyncsolutions-com-staging` | `https://cdn-staging.factorysyncsolutions.com` |
| Production | `uploads-factorysyncsolutions-com` | `https://cdn.factorysyncsolutions.com` |

Set the backend `R2_PUBLIC_BASE_URL` to the environment-specific public base URL
above. In Cloudflare, attach each custom domain to the matching R2 bucket and
keep cache/WAF controls on the Cloudflare hostname. API documentation buckets
remain private and are read by the backend using scoped R2 credentials.

### Secrets Management

Secrets are injected as environment variables from **GitHub Secrets** at deploy time via `--set-env-vars` in the Cloud Run deploy step. No GCP Secret Manager setup is required for the current workflow.

```bash
# Secrets passed in deploy workflow:
# RESEND_API_KEY, CF_TURNSTILE_SECRET, SLACK_WEBHOOK_REGISTRATION, SLACK_WEBHOOK_QUIZ_RESULT
# These come from GitHub repo Settings > Secrets and variables > Actions
```

> **Migration path**: If you outgrow GitHub Secrets, switch to GCP Secret Manager via `--set-secrets` flag. No code changes needed.

## CI/CD Pipeline (GitHub Actions)

### Pipeline Stages

```
Tag v*-staging (staging deploy):
  1. Run tests (reusable test.yml)
  2. Generate Swagger/OpenAPI docs
  3. Build & push Docker image to Artifact Registry
  4. Deploy fs-backend to Cloud Run (staging)
  5. Publish Swagger/OpenAPI docs to staging R2
  6. Deploy fs-api-gateway Worker (api-staging.factorysyncsolutions.com)
  7. Build fs-app-web with Vite → deploy to CF Pages (factory-sync-solutions-staging)
  8. Build fs-backoffice-web with Vite → deploy to CF Pages (factory-sync-backoffice-staging)
  9. Build fs-official-web with Astro → deploy to CF Pages (factory-sync-official-staging)

Tag v*.*.* (production deploy):
  1. Run tests (reusable test.yml)
  2. Generate Swagger/OpenAPI docs
  3. Build & push Docker image to Artifact Registry
  4. Deploy fs-backend to Cloud Run (production)
  5. Publish Swagger/OpenAPI docs to production R2
  6. Deploy fs-api-gateway Worker (api.factorysyncsolutions.com)
  7. Build fs-app-web with Vite → deploy to CF Pages (factory-sync-solutions)
  8. Build fs-backoffice-web with Vite → deploy to CF Pages (factory-sync-backoffice)
  9. Build fs-official-web with Astro → deploy to CF Pages (factory-sync-official)
```

### Required GitHub Secrets

See [env-variables.md](env-variables.md#cicd-github-actions-secrets) for the full list.

### Backend Deploy Job

```yaml
deploy-backend:
  runs-on: ubuntu-latest
  needs: test
  steps:
    - uses: actions/checkout@v4
    - uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}
    - uses: google-github-actions/setup-gcloud@v2
    - name: Configure Docker for Artifact Registry
      run: gcloud auth configure-docker asia-southeast3-docker.pkg.dev --quiet
    - name: Build and push Docker image
      run: |
        IMAGE=asia-southeast3-docker.pkg.dev/${{ vars.GCP_PROJECT_ID || 'factory-sync-solutions' }}/cloud-run/factory-sync-solutions-api:${{ github.sha }}
        docker build -t $IMAGE apps/fs-backend
        docker push $IMAGE
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy factory-sync-solutions-api \
          --image=asia-southeast3-docker.pkg.dev/${{ vars.GCP_PROJECT_ID || 'factory-sync-solutions' }}/cloud-run/factory-sync-solutions-api:${{ github.sha }} \
          --region=asia-southeast3 \
          --platform=managed \
          --allow-unauthenticated \
          --set-env-vars="ENVIRONMENT=production,RESEND_API_KEY=${{ secrets.RESEND_API_KEY }},..."
```

## Firestore Setup

### Indexes

Create composite indexes for admin queries:

```bash
# Assessments filtered by industry + sorted by date
gcloud firestore indexes composite create \
  --collection-group=assessments \
  --field-config field-path=uid,order=ASCENDING \
  --field-config field-path=submittedAt,order=DESCENDING
```

### Firestore Emulator (Local Development)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase project
firebase init firestore

# Start emulator
firebase emulators:start --only firestore,auth

# Emulator UI: http://localhost:4000
```

## Post-Deployment Verification

After deploying to any environment:

1. **Health check**: `curl https://<API_URL>/healthz`
2. **App smoke test**: Sign in with Google → register → submit quiz → view result
3. **Backoffice smoke test**: Navigate to `backoffice.factorysyncsolutions.com` → verify Cloudflare Access gate → sign in with a `backofficeRole` account → confirm dashboard loads
4. **Check Slack**: Verify notifications arrive in `#registrations` and `#quiz-results`
5. **Check logs**: `gcloud run services logs read factory-sync-solutions-api --region=asia-southeast3`

## Rollback

### Frontend

Cloudflare Pages supports instant rollback to any previous deployment from the dashboard.

### Backend

```bash
# List Cloud Run revisions
gcloud run revisions list --service=factory-sync-solutions-api --region=asia-southeast3

# Route traffic to a previous revision
gcloud run services update-traffic factory-sync-solutions-api \
  --to-revisions=<REVISION_NAME>=100 \
  --region=asia-southeast3
```

## Monitoring After Deploy

- **Cloud Run dashboard**: Check request count, error rate, latency
- **Cloud Logging**: Filter by `resource.type="cloud_run_revision"`
- **Firestore usage**: Check read/write counts against free tier limits (50K reads, 20K writes/day)
- **Slack `#server-status`**: Watch for error alerts

See [monitoring.md](monitoring.md) for detailed monitoring setup.

---

## See Also

- [env-variables.md](env-variables.md) -- All required environment variables
- [../architecture/overview.md](../architecture/overview.md) -- System architecture and platform choices
- [../development/setup.md](../development/setup.md) -- Branch strategy and CI/CD pipeline overview
- [monitoring.md](monitoring.md) -- Monitoring, alerting, and log retention

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated: Cloud Functions -> Cloud Run, removed turbo references, fixed secrets management, updated deploy commands |
| 1.2.0 | 2026-06-11 | Added fs-backoffice-web deployment (CF Pages + Cloudflare Access); updated pipeline stages; updated app names to fs-* |
| 1.3.0 | 2026-06-13 | Fix manual deploy backend path; fix broken monitoring doc link |
| 1.4.0 | 2026-06-14 | Add Cloudflare API gateway deployment and R2 CDN custom domain guidance |
| 1.4.1 | 2026-06-14 | Change public API gateway base path from `/api/v1` to `/v1` |
