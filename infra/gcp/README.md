# GCP Infrastructure (Terraform)

Staging and production are **separate GCP projects**, so each is a fully isolated
stack — its own Cloud Run service, `(default)` Firestore DB, Pub/Sub pipeline,
runtime service account, and **its own Terraform state**. All of that is defined
once in a shared module and instantiated per environment.

```
gcp/
├── modules/api-env/        # reusable: Cloud Run + Firestore + Pub/Sub + SA/IAM
└── envs/
    ├── staging/            # staging project, state prefix gcp/staging
    └── production/         # prod project,    state prefix gcp/production
```

> **These resources already exist.** Each env is written to be *imported* onto its
> running project, not applied from scratch. Always `plan` to empty before `apply`.

## What is / isn't managed here

| Managed (per env) | Not managed |
|---|---|
| Cloud Run service | Container images (built + tagged by CI) |
| Firestore `(default)` database | Firestore rules/indexes (root `firestore.*`, Firebase CLI) |
| Pub/Sub topic + subscription | Secret *values* (versions, seeded out-of-band) |
| API runtime SA + IAM bindings | Cloud Run env vars (deploy workflow `--set-env-vars`/`--set-secrets`) |
| Secret Manager containers + accessor IAM (`var.runtime_secrets`) | Cloudflare (see `../cloudflare/terraform`) |

## Prerequisites (once)

```bash
gcloud auth application-default login
# One state bucket PER project:
gcloud storage buckets create gs://<STAGING_PROJECT>-tfstate --location=EU --uniform-bucket-level-access
gcloud storage buckets create gs://<PROD_PROJECT>-tfstate    --location=EU --uniform-bucket-level-access
```

## Per environment — do staging first, then production

Replace `<ENV>` with `staging` or `production` and `<PROJECT>` with that env's
project id. **Run the whole flow for staging, verify, then repeat for production.**

```bash
cd envs/<ENV>
cp terraform.tfvars.example terraform.tfvars      # fill in project_id, region, api_image
tofu init -backend-config="bucket=<PROJECT>-tfstate"
```

Import the existing resources. Note the addresses are prefixed with `module.api.`.
`<REGION>` is `asia-southeast3`. The runtime SA is the shared `deployer` account,
modelled as a **data source** — data sources are read live, not imported.

```bash
tofu import module.api.google_cloud_run_v2_service.api \
  projects/<PROJECT>/locations/asia-southeast3/services/<SERVICE_NAME>
tofu import module.api.google_firestore_database.default \
  projects/<PROJECT>/databases/'(default)'
tofu import module.api.google_pubsub_topic.domain_events \
  projects/<PROJECT>/topics/factory-sync-domain-events
tofu import module.api.google_pubsub_topic.domain_events_dlq \
  projects/<PROJECT>/topics/factory-sync-domain-events-dlq
tofu import module.api.google_pubsub_subscription.domain_events_consumer \
  projects/<PROJECT>/subscriptions/factory-sync-domain-events-result-consumer
# Runtime IAM bindings on the deployer SA (import each role):
tofu import 'module.api.google_project_iam_member.api_firestore' \
  "<PROJECT> roles/datastore.user serviceAccount:deployer@<PROJECT>.iam.gserviceaccount.com"
tofu import 'module.api.google_project_iam_member.api_pubsub_publisher' \
  "<PROJECT> roles/pubsub.publisher serviceAccount:deployer@<PROJECT>.iam.gserviceaccount.com"
```

`<PROJECT>` is `factory-sync-solutions-staging` (staging) or `factory-sync-solutions`
(production). `<SERVICE_NAME>` is `factory-sync-solutions-api-staging` for staging,
`factory-sync-solutions-api` for production.

Then the reconcile loop:

```bash
tofu plan     # edit the module .tf until the plan is EMPTY ("No changes")
```

An empty plan proves the code matches that project. Only then is `apply` safe.

## Secrets

Runtime secrets (Turnstile, R2 creds, …) live in Secret Manager per project and
are injected as `value_source.secret_key_ref` env vars on the Cloud Run service.
Never put secret values in `.tf` or `.tfvars`.
