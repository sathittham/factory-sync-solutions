---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Deployment Guide

## Overview

| Component | Platform | Method |
|-----------|----------|--------|
| Frontend (React SPA) | Cloudflare Pages | GitHub Actions (`cloudflare/wrangler-action`) |
| Backend (Go API) | Google Cloud Run | Docker container via GitHub Actions |
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

The `deploy-staging.yml` and `deploy-production.yml` workflows handle frontend deployment automatically:

1. Installs dependencies (`npm ci`)
2. Builds with Vite (`npx vite build`) with injected `VITE_*` env vars
3. Deploys via `cloudflare/wrangler-action@v3`

### Manual Deployment

```bash
cd apps/web
npm ci
npx vite build
npx wrangler pages deploy dist --project-name=factory-health-check
```

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
| Region | `asia-southeast1` |
| Allow unauthenticated | Yes (API handles auth internally) |

### Manual Deployment

```bash
cd apps/api

# Build and push Docker image
IMAGE=asia-southeast1-docker.pkg.dev/<PROJECT_ID>/cloud-run/factory-health-check-api:latest
docker build -t $IMAGE .
docker push $IMAGE

# Deploy to Cloud Run
gcloud run deploy factory-health-check-api \
  --image=$IMAGE \
  --region=asia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="ENVIRONMENT=staging,ALLOWED_ORIGINS=https://factory-health-check-staging.pages.dev"
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
  3. Deploy backend to Cloud Run (staging)
  4. Build frontend with Vite
  5. Deploy frontend to Cloudflare Pages (staging)

Tag v*.*.* (production deploy):
  1. Run tests (reusable test.yml)
  2. Build & push Docker image to Artifact Registry
  3. Deploy backend to Cloud Run (production)
  4. Build frontend with Vite
  5. Deploy frontend to Cloudflare Pages (production)
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
      run: gcloud auth configure-docker asia-southeast1-docker.pkg.dev --quiet
    - name: Build and push Docker image
      run: |
        IMAGE=asia-southeast1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID || 'factory-health-check' }}/cloud-run/factory-health-check-api:${{ github.sha }}
        docker build -t $IMAGE apps/api
        docker push $IMAGE
    - name: Deploy to Cloud Run
      run: |
        gcloud run deploy factory-health-check-api \
          --image=asia-southeast1-docker.pkg.dev/${{ vars.GCP_PROJECT_ID || 'factory-health-check' }}/cloud-run/factory-health-check-api:${{ github.sha }} \
          --region=asia-southeast1 \
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
2. **Smoke test**: Sign in with Google -> register -> submit quiz -> view result
3. **Check Slack**: Verify notifications arrive in `#registrations` and `#quiz-results`
4. **Check logs**: `gcloud run services logs read factory-health-check-api --region=asia-southeast1`

## Rollback

### Frontend

Cloudflare Pages supports instant rollback to any previous deployment from the dashboard.

### Backend

```bash
# List Cloud Run revisions
gcloud run revisions list --service=factory-health-check-api --region=asia-southeast1

# Route traffic to a previous revision
gcloud run services update-traffic factory-health-check-api \
  --to-revisions=<REVISION_NAME>=100 \
  --region=asia-southeast1
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
