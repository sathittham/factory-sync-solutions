---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Deployment Guide

## Overview

| Component | Platform | Method |
|-----------|----------|--------|
| Frontend (React SPA) | Cloudflare Pages | Git integration (auto-deploy on push) |
| Backend (Go API) | Google Cloud Functions (2nd gen) | `gcloud` CLI via GitHub Actions |
| Database | Firestore | Managed service (no deployment needed) |
| Auth | Firebase Authentication | Managed service (no deployment needed) |

## Branch Strategy

| Branch | Deploys to | Trigger |
|--------|------------|---------|
| `main` | Production | Push / merge |
| `staging` | Staging | Push / merge |
| `develop` | CI only (no deploy) | Push / PR |

Flow: `feature/*` → `develop` → `staging` → `main`

## Frontend Deployment (Cloudflare Pages)

### Setup (One-Time)

1. Connect GitHub repository to Cloudflare Pages in the Cloudflare dashboard.
2. Configure build settings:
   - **Build command**: `npx turbo build --filter=web`
   - **Build output directory**: `apps/web/dist`
   - **Root directory**: `/`
   - **Node.js version**: `20`
3. Set environment variables in Cloudflare Pages dashboard (see [env-variables.md](env-variables.md#frontend-react-spa)).
4. Configure preview deployments for `staging` branch.

### Automatic Deployment

Cloudflare Pages auto-deploys on push to connected branches:
- `main` → Production URL: `factory-health-check.pages.dev`
- `staging` → Preview URL: `factory-health-check-staging.pages.dev`

### Manual Deployment

```bash
cd apps/web
npm run build
npx wrangler pages deploy dist --project-name=factory-health-check
```

## Backend Deployment (Cloud Functions)

### Prerequisites

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud config set project <PROJECT_ID>

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Cloud Function Configuration

| Setting | Value |
|---------|-------|
| Runtime | Go 1.25 |
| Memory | 256 MB (default), 512 MB (if needed) |
| Timeout | 30 seconds |
| Min instances | 0 (scale to zero) |
| Max instances | 10 (staging), 100 (production) |
| Concurrency | 80 (default) |
| Region | `asia-southeast1` (or closest to users) |

### Manual Deployment

```bash
cd apps/api

# Deploy to staging
gcloud functions deploy factory-health-check-api \
  --gen2 \
  --runtime=go125 \
  --region=asia-southeast1 \
  --source=. \
  --entry-point=main \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256Mi \
  --timeout=30s \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="ENVIRONMENT=staging,ALLOWED_ORIGINS=https://factory-health-check-staging.pages.dev" \
  --set-secrets="RESEND_API_KEY=RESEND_API_KEY:latest,CF_TURNSTILE_SECRET=CF_TURNSTILE_SECRET:latest"
```

### GCP Secret Manager Setup

```bash
# Create secrets (one-time)
echo -n "re_xxx" | gcloud secrets create RESEND_API_KEY --data-file=-
echo -n "0x4AAA..." | gcloud secrets create CF_TURNSTILE_SECRET --data-file=-

# Grant Cloud Function service account access
gcloud secrets add-iam-policy-binding RESEND_API_KEY \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CF_TURNSTILE_SECRET \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## CI/CD Pipeline (GitHub Actions)

### Pipeline Stages

```
Push to develop:
  1. Lint (Biome + golangci-lint)
  2. Test (Vitest + go test)
  3. Build (verification only)
  4. Notify Slack (#ci-cd)

Push to staging:
  1. Lint
  2. Test
  3. Build
  4. Deploy frontend → Cloudflare Pages (staging)
  5. Deploy backend → Cloud Functions (staging)
  6. Notify Slack (#ci-cd)

Push to main:
  1. Lint
  2. Test
  3. Build
  4. Deploy frontend → Cloudflare Pages (production)
  5. Deploy backend → Cloud Functions (production)
  6. Notify Slack (#ci-cd)
```

### Required GitHub Secrets

See [env-variables.md](env-variables.md#cicd-github-actions-secrets) for the full list.

### Backend Deploy Job

```yaml
deploy-api:
  runs-on: ubuntu-latest
  needs: [backend-unit-tests]
  if: github.ref == 'refs/heads/staging' || github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4

    - id: auth
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - uses: google-github-actions/setup-gcloud@v2

    - name: Deploy Cloud Function
      run: |
        ENV=${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
        MAX_INSTANCES=${{ github.ref == 'refs/heads/main' && '100' || '10' }}
        ORIGINS=${{ github.ref == 'refs/heads/main' && 'https://factory-health-check.pages.dev' || 'https://factory-health-check-staging.pages.dev' }}

        cd apps/api
        gcloud functions deploy factory-health-check-api \
          --gen2 \
          --runtime=go125 \
          --region=asia-southeast1 \
          --source=. \
          --entry-point=main \
          --trigger-http \
          --allow-unauthenticated \
          --memory=256Mi \
          --timeout=30s \
          --min-instances=0 \
          --max-instances=$MAX_INSTANCES \
          --set-env-vars="ENVIRONMENT=$ENV,ALLOWED_ORIGINS=$ORIGINS" \
          --set-secrets="RESEND_API_KEY=RESEND_API_KEY:latest,CF_TURNSTILE_SECRET=CF_TURNSTILE_SECRET:latest"
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
2. **Swagger UI** (staging only): `https://<API_URL>/api/v1/swagger/index.html`
3. **Smoke test**: Sign in with Google → register → submit quiz → view result
4. **Check Slack**: Verify notifications arrive in `#registrations` and `#quiz-results`
5. **Check logs**: `gcloud functions logs read factory-health-check-api --region=asia-southeast1`

## Rollback

### Frontend

Cloudflare Pages supports instant rollback to any previous deployment from the dashboard.

### Backend

```bash
# List recent deployments
gcloud functions describe factory-health-check-api --region=asia-southeast1

# Rollback by redeploying from a previous commit
git checkout <previous-commit-sha>
# Re-run the deploy command
```

## Monitoring After Deploy

- **Cloud Functions dashboard**: Check invocation count, error rate, latency
- **Cloud Logging**: Filter by `resource.labels.function_name="factory-health-check-api"`
- **Firestore usage**: Check read/write counts against free tier limits (50K reads, 20K writes/day)
- **Slack `#server-status`**: Watch for error alerts

See [logging-monitoring.md](logging-monitoring.md) for detailed monitoring setup.

---

## See Also

- [env-variables.md](env-variables.md) — All required environment variables
- [architecture.md](architecture.md) — System architecture and platform choices
- [development.md](development.md) — Branch strategy and CI/CD pipeline overview
- [logging-monitoring.md](logging-monitoring.md) — Monitoring, alerting, and log retention

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
