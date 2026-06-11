---
version: 1.2.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
---

# Deployment Guide

## Overview

| Component | Platform | Method |
|-----------|----------|--------|
| `fs-app-web` (user app) | Cloudflare Pages | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-backoffice-web` (staff backoffice) | Cloudflare Pages + Cloudflare Access | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-official-web` (public site) | Cloudflare Pages | GitHub Actions (`cloudflare/wrangler-action`) |
| `fs-backend` (Go API) | Google Cloud Run | Docker container via GitHub Actions |
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
| Staging | `factory-sync-solutions-staging` | `factory-sync-solutions-staging.pages.dev` |
| Production | `factory-sync-solutions` | `app.factorysync.com` |

```bash
# Manual deploy
cd apps/fs-app-web
npm ci && npx vite build
npx wrangler pages deploy dist --project-name=factory-sync-solutions
```

### `fs-backoffice-web` (Staff Backoffice)

| Environment | CF Pages Project | Domain |
|-------------|-----------------|--------|
| Staging | `factory-sync-backoffice-staging` | `factory-sync-backoffice-staging.pages.dev` |
| Production | `factory-sync-backoffice` | `backoffice.factorysync.com` |

**Cloudflare Access** is applied to the production domain. Only users on the
`@factorysync.com` email allowlist (or an explicit allow-list) can reach the
site. This is a network-layer gate configured in the Cloudflare Zero Trust
dashboard — it is separate from Firebase Auth.

```bash
# Manual deploy
cd apps/fs-backoffice-web
npm ci && npx vite build
npx wrangler pages deploy dist --project-name=factory-sync-backoffice
```

> Cloudflare Access policy must be set up once in the Zero Trust dashboard:
> **Access > Applications > factory-sync-backoffice > Policy: Allow @factorysync.com**

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

### Manual Deployment

```bash
cd apps/api

# Build and push Docker image
IMAGE=asia-southeast3-docker.pkg.dev/<PROJECT_ID>/cloud-run/factory-sync-solutions-api:latest
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy factory-sync-solutions-api \
  --image=$IMAGE \
  --region=asia-southeast3 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=staging,ALLOWED_ORIGINS=https://factory-sync-solutions-staging.pages.dev"
```

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
  2. Build & push Docker image to Artifact Registry
  3. Deploy fs-backend to Cloud Run (staging)
  4. Build fs-app-web with Vite → deploy to CF Pages (factory-sync-solutions-staging)
  5. Build fs-backoffice-web with Vite → deploy to CF Pages (factory-sync-backoffice-staging)
  6. Build fs-official-web with Astro → deploy to CF Pages (factory-sync-official-staging)

Tag v*.*.* (production deploy):
  1. Run tests (reusable test.yml)
  2. Build & push Docker image to Artifact Registry
  3. Deploy fs-backend to Cloud Run (production)
  4. Build fs-app-web with Vite → deploy to CF Pages (factory-sync-solutions)
  5. Build fs-backoffice-web with Vite → deploy to CF Pages (factory-sync-backoffice)
  6. Build fs-official-web with Astro → deploy to CF Pages (factory-sync-official)
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
        docker build -t $IMAGE apps/api
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
3. **Backoffice smoke test**: Navigate to `backoffice.factorysync.com` → verify Cloudflare Access gate → sign in with a `backofficeRole` account → confirm dashboard loads
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

See [logging-monitoring.md](logging-monitoring.md) for detailed monitoring setup.

---

## See Also

- [env-variables.md](env-variables.md) -- All required environment variables
- [architecture.md](architecture.md) -- System architecture and platform choices
- [development.md](development.md) -- Branch strategy and CI/CD pipeline overview
- [logging-monitoring.md](logging-monitoring.md) -- Monitoring, alerting, and log retention

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated: Cloud Functions -> Cloud Run, removed turbo references, fixed secrets management, updated deploy commands |
| 1.2.0 | 2026-06-11 | Added fs-backoffice-web deployment (CF Pages + Cloudflare Access); updated pipeline stages; updated app names to fs-* |
