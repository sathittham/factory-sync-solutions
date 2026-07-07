# Infra (OpenTofu) — Next Steps

Follow-ups after the import-first adoption merged in **PR #51** (squash `9eefe28`).
Full context lives in the session memory `project_infra_terraform`.

**Current state:** GCP staging + production and Cloudflare are all import-adopted and
`tofu plan`-empty. The CI plan gate is live (`INFRA_PLAN_ENABLED=true`) and all three
plan legs are green on infra PRs. The prod backoffice is now behind Cloudflare Access.

Everything below is a **deliberate apply**, not adoption. For each item:
edit module → `tofu plan` → **review the diff** → apply. Work on a feature branch off
`develop`; never commit secrets / `*.tfvars` / `*.tfstate`.

**GCP backend auth trick** (the tofu GCS backend picks up the wrong ADC — a work
account — so feed it the personal CLI token):
```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"   # s.sathittham@gmail.com
```

---

## 1. Secret Manager migration — HIGHEST PRIORITY (security)
The Cloud Run API + consumer services set real secrets as **plaintext** env vars via
the deploy workflows' `--set-env-vars`: `RESEND_API_KEY`, `CF_TURNSTILE_SECRET`,
`R2_ACCESS_KEY_ID/SECRET`, `API_DOCS_R2_*`, Slack webhooks. (`GA4_SA_CREDENTIALS_JSON`
is **already** on Secret Manager via `--set-secrets`.)

**Full runbook: [secret-manager-migration.md](secret-manager-migration.md).** Approach
(prepared on `feature/infra-secret-manager`): Terraform manages the secret containers +
per-secret runtime-SA accessor grant (`var.runtime_secrets` in the `api-env` module);
the deploy workflow moves each secret from `--set-env-vars` to `--set-secrets` (the
pattern GA4 already uses). Env stays pipeline-owned — not Terraform-owned — so this
does **not** touch `ignore_changes`. Values are seeded out-of-band; never committed.
Do staging fully, verify, then production.

## 2. Firestore server-side delete protection
`delete_protection_state` is **DISABLED** live in both projects. Enable it in
`firestore.tf` (complements the existing `prevent_destroy` lifecycle). Apply per env.

## 3. Prod API warmth
Raise prod `min_instances` `0 → 1` in `infra/gcp/envs/production/main.tf` to avoid cold
starts. Staging stays `0`.

## 4. Least-privilege CI service account
CI currently authenticates with keys minted from the over-privileged `deployer` SA
(stored in the `staging`/`production` GitHub env secrets `GCP_SA_KEY`). Replace with a
dedicated `tofu-ci` SA per project: `roles/viewer` + the specific reads plan needs +
`roles/storage.objectAdmin` on that env's tfstate bucket only. Then rotate out the
deployer keys.

## 5. R2 custom domains (blocked on provider)
`cdn` / `cdn-staging` are commented out in `infra/cloudflare/terraform/r2.tf` because
provider **5.21.1** (latest stable at adoption time) has no import for
`cloudflare_r2_custom_domain`. When a release adds it: `tofu init -upgrade`, uncomment,
`tofu import 'cloudflare_r2_custom_domain.uploads["prod"]' <account_id>/<bucket>/<domain>`
for each, reconcile to empty. `var.zone_id` is retained (tflint-ignored) for this.

## 6. Cloudflare Access allow-list (as needed)
The prod backoffice allow-list is currently **only** `s.sathittham@gmail.com`. To add
operators: update the cloudflare `terraform.tfvars` + the `BACKOFFICE_ACCESS_EMAILS`
production-env GitHub secret (JSON list), then apply. Anyone not listed is blocked at
the CF edge.

## Unrelated loose end
An uncommitted api-gateway worker fix (`duplex:'half'` body forwarding +
`CF-Connecting-IP` override) sits in the working tree. If still valid, commit it on its
own `bugfix/*` branch — it is not part of the infra work.

---

## Paste-ready prompt for the next session

```
Continue the FactorySync infra work. Context is in memory project_infra_terraform
(OpenTofu IaC adoption, merged to develop via PR #51 / squash 9eefe28). GCP
staging+prod + Cloudflare are all import-adopted and plan-empty; CI plan gate is
live (INFRA_PLAN_ENABLED=true). Remaining items are in docs/operations/infra-next-steps.md
— all DELIBERATE APPLIES: edit module → plan → SHOW me the diff → checkpoint before apply.
GCP backend auth: export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)".
Start with item 1 (Secret Manager migration). Feature branch off develop; never commit
secrets/tfvars/tfstate.
```
