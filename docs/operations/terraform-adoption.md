---
version: 1.0.0
lastUpdated: 2026-07-06
author: Sathittham Sangthong
---

# Terraform / OpenTofu Adoption

## Overview

The `infra/` directory holds **OpenTofu** (`tofu`) infrastructure-as-code for the
parts of the platform that aren't product apps. It is **import-first**: every
resource already exists in the cloud, so the configs are written to be *imported*
onto the running infrastructure, not applied from scratch.

| Component | Tool | Location |
|-----------|------|----------|
| Cloud Run, Firestore, Pub/Sub, IAM (per env) | OpenTofu | `infra/gcp/envs/{staging,production}/` |
| R2 buckets, Access, DNS ownership | OpenTofu | `infra/cloudflare/terraform/` |
| API gateway / CMS Workers | Wrangler | `infra/cloudflare/workers/`, `apps/web-cms/` |
| Firestore rules & indexes | Firebase CLI | repo root (`firestore.*`) |
| Frontend hosting | Cloudflare Pages | dashboard / CI |

**No relational database (Cloud SQL) is used** — the datastore is Firestore, plus
Cloudflare D1 for the CMS.

### Structure

Staging and production are **separate GCP projects**, so GCP is split per-env with
isolated state, each sharing one module. Cloudflare is a **single account + single
zone**, so both envs' R2 buckets and the prod Access app share one state.

```
infra/gcp/
  modules/api-env/          shared: Cloud Run + Firestore + Pub/Sub + SA/IAM
  envs/staging/             staging project, state prefix gcp/staging
  envs/production/          prod project,    state prefix gcp/production
infra/cloudflare/terraform/ R2 (both envs) + prod Access + DNS notes
.github/workflows/infra.yml fmt/validate on PRs + gated per-env plan
```

Tool is OpenTofu; `.terraform.lock.hcl` files are committed for reproducible
provider versions (google `~> 6`, cloudflare `5.21.1`).

## The golden rule

**import → plan → edit config to empty → only then apply.**
If any `tofu plan` ever proposes to **destroy** or **recreate** a resource,
**stop and reconcile** — do not apply. Firestore carries `prevent_destroy`.

---

## Status (as of 2026-07-06)

- ✅ Configs written and `tofu validate`-clean on all three roots.
- ✅ api-gateway Worker hardened (`duplex:'half'` body forwarding, `X-Forwarded-For`
  overwritten with `CF-Connecting-IP`); 6 tests pass.
- ⬜ **Not yet imported/applied to real infrastructure** — the steps below.

---

## Step 0 — Prerequisites (once)

```bash
gcloud auth application-default login
export CLOUDFLARE_API_TOKEN=...   # scopes: Zone:DNS:Edit + R2:Edit + Access:Edit (read is enough for plan)
```

## Step 1 — Confirm project IDs + region

```bash
gcloud projects list
# For each project, confirm the Cloud Run region (assumed europe-west1 from the -eu URLs):
gcloud config set project <PROJECT>
gcloud run services list --format="table(metadata.name, region)"
```

## Step 2 — Create state buckets (one per project)

```bash
gcloud storage buckets create gs://<STAGING_PROJECT>-tfstate --location=EU --uniform-bucket-level-access
gcloud storage buckets create gs://<PROD_PROJECT>-tfstate    --location=EU --uniform-bucket-level-access
```

## Step 3 — Adopt GCP (staging first, verify, then production)

Replace `<ENV>` / `<PROJECT>` / `<SERVICE_NAME>` accordingly. `<SERVICE_NAME>` is
`factory-sync-solutions-api-staging` (staging) or `factory-sync-solutions-api` (prod).

```bash
cd infra/gcp/envs/<ENV>
cp terraform.tfvars.example terraform.tfvars     # project_id, region, api_image
tofu init -backend-config="bucket=<PROJECT>-tfstate"

# Import (addresses are prefixed module.api.* — full list in infra/gcp/README.md):
tofu import module.api.google_cloud_run_v2_service.api \
  projects/<PROJECT>/locations/<REGION>/services/<SERVICE_NAME>
tofu import module.api.google_service_account.api \
  projects/<PROJECT>/serviceAccounts/factory-sync-api@<PROJECT>.iam.gserviceaccount.com
tofu import module.api.google_firestore_database.default \
  projects/<PROJECT>/databases/'(default)'
tofu import module.api.google_pubsub_topic.domain_events        projects/<PROJECT>/topics/domain-events
tofu import module.api.google_pubsub_subscription.domain_events_worker \
  projects/<PROJECT>/subscriptions/domain-events-worker
# + the 3 IAM bindings (datastore.user, pubsub.publisher, secretmanager.secretAccessor)

tofu plan     # edit module .tf until "No changes", THEN apply is safe
```

## Step 4 — Adopt Cloudflare (once, covers both envs)

```bash
cd infra/cloudflare/terraform
cp terraform.tfvars.example terraform.tfvars     # account_id, zone_id, backoffice_access_emails
tofu init -backend-config="bucket=<PROD_PROJECT>-tfstate"

tofu import 'cloudflare_r2_bucket.uploads["prod"]'    <ACCOUNT_ID>/uploads-factorysyncsolutions-com
tofu import 'cloudflare_r2_bucket.uploads["staging"]' <ACCOUNT_ID>/uploads-factorysyncsolutions-com-staging
tofu import 'cloudflare_r2_bucket.apidoc["prod"]'     <ACCOUNT_ID>/apidoc-factorysyncsolutions-com
tofu import 'cloudflare_r2_bucket.apidoc["staging"]'  <ACCOUNT_ID>/apidoc-factorysyncsolutions-com-staging
# R2 custom domains + Access app/policy: check `tofu plan` output for the expected import IDs.

tofu plan     # reconcile to empty
```

> Watch for **double-ownership**: `cdn*` DNS is created by the R2 custom domain,
> `api*` by the Worker, Pages hostnames by Pages. If a plan wants to *create* a DNS
> record that already exists, that hostname is owned elsewhere — don't apply it.

## Step 5 — Commit

```bash
git checkout -b feature/infra-terraform
git add infra/ docs/operations/terraform-adoption.md .gitignore
git commit -m "chore(infra): import-first OpenTofu for GCP (per-env) + Cloudflare"
# terraform.tfvars and state are gitignored — verify with `git status`.
```

## Step 6 — Enable CI plan

The workflow's `validate` job (fmt + validate, no creds) runs on every infra PR
already. The `plan` job is gated behind a repo variable so it doesn't red-fail PRs
before state exists. After Steps 3–4 succeed, add:

| Scope | Name | Notes |
|-------|------|-------|
| Environment `staging` + `production` | `GCP_SA_KEY`, `GCP_PROJECT_ID`, `TFSTATE_BUCKET` | SA needs **read** on that project |
| Env var (per env) | `API_IMAGE` | current image ref |
| Repo secret | `CLOUDFLARE_ZONE_ID` | `CLOUDFLARE_API_TOKEN` / `_ACCOUNT_ID` already exist |
| **Repo variable** | `INFRA_PLAN_ENABLED` = `true` | flip on **after** imports; enables the per-env `tofu plan` PR comment |

## What CI does NOT change

CI still deploys Cloud Run images and Pages sites; Wrangler still owns the Workers.
OpenTofu only owns config/resources, and the Cloud Run resource has
`ignore_changes` on the image so it never fights a deploy.

## Optional follow-ups

- Codify Secret Manager env vars in `modules/api-env` (currently a commented stub).
- Add the domain-event consumer Cloud Run worker to the module (live, not yet modeled).
- Add `tflint` to `.github/workflows/infra.yml`.
