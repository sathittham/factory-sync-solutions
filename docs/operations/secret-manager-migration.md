---
version: 1.0.0
lastUpdated: 2026-07-07
author: Sathittham Sangthong
---

# Secret Manager Migration (infra follow-up item 1)

Move the API + consumer Cloud Run **secret** env vars off plaintext
`--set-env-vars` and into **Secret Manager**, referenced via `--set-secrets`.
This is the highest-priority security follow-up from
[infra-next-steps.md](infra-next-steps.md).

## Strategy — why this shape

The deploy workflows (`.github/workflows/deploy-{staging,production}.yml`) **own**
the Cloud Run env: every deploy runs `gcloud run deploy --set-env-vars=...`, with
secret values interpolated from GitHub Actions secrets. Today those secret values
land on the service as **plaintext env vars**.

GA4 is already migrated the right way:

```
--set-secrets="GA4_SA_CREDENTIALS_JSON=ga4-sa-credentials:latest"
```

So we follow that exact pattern rather than making Terraform own the env block
(which would fight the pipeline on every deploy):

| Owner | Responsibility |
|-------|----------------|
| **Terraform** (`infra/gcp`) | The secret **containers** + the runtime SA's per-secret `secretAccessor` grant — declaratively, via `var.runtime_secrets`. |
| **Deploy workflow** | The env-var → secret-id mapping, via `--set-secrets`. |
| **Operator (out-of-band)** | The secret **values** (`gcloud secrets versions add`). Never in git, TF, or CI logs. |

## Secrets to migrate

Same set in both projects (separate Secret Manager per env; same IDs, env-specific
values). Secret IDs are kebab-case to match the existing `ga4-sa-credentials`.

| Env var | Secret ID | Used by |
|---------|-----------|---------|
| `RESEND_API_KEY` | `resend-api-key` | api, consumer |
| `CF_TURNSTILE_SECRET` | `cf-turnstile-secret` | api |
| `SLACK_WEBHOOK_REGISTRATION` | `slack-webhook-registration` | api, consumer |
| `SLACK_WEBHOOK_QUIZ_RESULT` | `slack-webhook-quiz-result` | api, consumer |
| `R2_ACCESS_KEY_ID` | `r2-access-key-id` | api |
| `R2_ACCESS_KEY_SECRET` | `r2-access-key-secret` | api |
| `API_DOCS_R2_ACCOUNT_ID` | `api-docs-r2-account-id` | api |
| `API_DOCS_R2_ACCESS_KEY_ID` | `api-docs-r2-access-key-id` | api |
| `API_DOCS_R2_ACCESS_KEY_SECRET` | `api-docs-r2-access-key-secret` | api |
| `GA4_SA_CREDENTIALS_JSON` | `ga4-sa-credentials` | api | ✅ **already migrated** — leave as-is |

`R2_ACCOUNT_ID` stays plaintext — it comes from a repo **var**, not a secret.

## The golden rule

**Create + seed the secrets and prove the SA can read them BEFORE flipping the
workflow.** A `--set-secrets` deploy that references a missing/empty/unreadable
secret fails the revision. Always do **staging fully, verify, then production**.

---

## Prerequisites (per project)

```bash
gcloud config set project <PROJECT>
gcloud services enable secretmanager.googleapis.com     # likely already on (GA4 uses it)

# tofu GCS backend picks the wrong ADC (work account); feed it the personal token:
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"   # s.sathittham@gmail.com
```

`<PROJECT>` = `factory-sync-solutions-staging` (staging) or `factory-sync-solutions` (prod).

---

## Phase 1 — Terraform creates the secret containers + IAM

Edit the env's `module "api"` block (committed — these are IDs, not values):

```hcl
# infra/gcp/envs/staging/main.tf   (then production/main.tf)
module "api" {
  # ...existing args...

  runtime_secrets = [
    "resend-api-key",
    "cf-turnstile-secret",
    "slack-webhook-registration",
    "slack-webhook-quiz-result",
    "r2-access-key-id",
    "r2-access-key-secret",
    "api-docs-r2-account-id",
    "api-docs-r2-access-key-id",
    "api-docs-r2-access-key-secret",
  ]
}
```

```bash
cd infra/gcp/envs/staging
tofu plan      # expect: 9 secrets + 9 iam_member ADD, nothing destroyed/changed — REVIEW
tofu apply
tofu output runtime_secret_ids   # the IDs now needing a version
```

The secrets are created **empty** (no versions yet) — safe, nothing references
them. Firestore-style `prevent_destroy` guards each container.

## Phase 2 — Seed values out-of-band (never printed)

The live values are currently plaintext on the running API service. Pipe them
straight into Secret Manager without ever echoing them:

```bash
SVC=factory-sync-solutions-api-staging      # or -api for prod
REGION=asia-southeast3
PROJECT=factory-sync-solutions-staging      # or factory-sync-solutions

# secret-id → env-var-name
declare -A MAP=(
  [resend-api-key]=RESEND_API_KEY
  [cf-turnstile-secret]=CF_TURNSTILE_SECRET
  [slack-webhook-registration]=SLACK_WEBHOOK_REGISTRATION
  [slack-webhook-quiz-result]=SLACK_WEBHOOK_QUIZ_RESULT
  [r2-access-key-id]=R2_ACCESS_KEY_ID
  [r2-access-key-secret]=R2_ACCESS_KEY_SECRET
  [api-docs-r2-account-id]=API_DOCS_R2_ACCOUNT_ID
  [api-docs-r2-access-key-id]=API_DOCS_R2_ACCESS_KEY_ID
  [api-docs-r2-access-key-secret]=API_DOCS_R2_ACCESS_KEY_SECRET
)

DESC="$(gcloud run services describe "$SVC" --region "$REGION" --project "$PROJECT" --format=json)"
for sid in "${!MAP[@]}"; do
  echo "$DESC" \
    | jq -r --arg n "${MAP[$sid]}" '.spec.template.spec.containers[0].env[] | select(.name==$n) | .value' \
    | gcloud secrets versions add "$sid" --project "$PROJECT" --data-file=-
done
unset DESC
```

Consumer secrets (`resend-api-key`, `slack-webhook-*`) share the same values, so
seeding from the API service covers them — no separate step.

Verify the runtime SA can actually read one (proves the TF IAM grant works):

```bash
gcloud secrets versions access latest --secret=resend-api-key --project "$PROJECT" \
  --impersonate-service-account="deployer@${PROJECT}.iam.gserviceaccount.com" >/dev/null && echo OK
```

## Phase 3 — Flip the deploy workflow to `--set-secrets`

In **`.github/workflows/deploy-staging.yml`** (then `deploy-production.yml`), for
the **api** deploy step: remove the nine secret entries from `--set-env-vars` and
extend `--set-secrets`:

```diff
-            --set-secrets="GA4_SA_CREDENTIALS_JSON=ga4-sa-credentials:latest"
+            --set-secrets="GA4_SA_CREDENTIALS_JSON=ga4-sa-credentials:latest,RESEND_API_KEY=resend-api-key:latest,CF_TURNSTILE_SECRET=cf-turnstile-secret:latest,SLACK_WEBHOOK_REGISTRATION=slack-webhook-registration:latest,SLACK_WEBHOOK_QUIZ_RESULT=slack-webhook-quiz-result:latest,R2_ACCESS_KEY_ID=r2-access-key-id:latest,R2_ACCESS_KEY_SECRET=r2-access-key-secret:latest,API_DOCS_R2_ACCOUNT_ID=api-docs-r2-account-id:latest,API_DOCS_R2_ACCESS_KEY_ID=api-docs-r2-access-key-id:latest,API_DOCS_R2_ACCESS_KEY_SECRET=api-docs-r2-access-key-secret:latest"
```

Delete `@RESEND_API_KEY=...@CF_TURNSTILE_SECRET=...@SLACK_WEBHOOK_REGISTRATION=...@SLACK_WEBHOOK_QUIZ_RESULT=...@R2_ACCESS_KEY_ID=...@R2_ACCESS_KEY_SECRET=...@API_DOCS_R2_ACCOUNT_ID=...@API_DOCS_R2_ACCESS_KEY_ID=...@API_DOCS_R2_ACCESS_KEY_SECRET=...`
from that step's `--set-env-vars` (leave `R2_ACCOUNT_ID`, `GA4_PROPERTY_ID`, and
the other non-secret vars in place).

For the **consumer** deploy step (which has no `--set-secrets` today), add one and
drop the three secret entries from its `--set-env-vars`:

```diff
+            --set-secrets="RESEND_API_KEY=resend-api-key:latest,SLACK_WEBHOOK_REGISTRATION=slack-webhook-registration:latest,SLACK_WEBHOOK_QUIZ_RESULT=slack-webhook-quiz-result:latest"
```

> Do staging's workflow edit and deploy first. Only touch
> `deploy-production.yml` after prod's secrets are created + seeded (Phases 1–2
> for prod).

## Phase 4 — Deploy & verify

Trigger the staging deploy (push to the branch / merge, or run the workflow).
Then confirm the live revision reads from Secret Manager, not plaintext:

```bash
gcloud run services describe "$SVC" --region "$REGION" --project "$PROJECT" --format=json \
  | jq '.spec.template.spec.containers[0].env[] | select(.valueFrom!=null) | .name'
# expect: the migrated names now show valueFrom.secretKeyRef, and no longer appear as plaintext .value
```

Smoke-test the API (health + a Turnstile/Resend/R2-backed path) and drain a domain
event through the consumer. Roll traffic back if anything fails (below).

## Phase 5 — Clean up

- Once prod is verified, the plaintext values are gone from the service env. The
  GitHub Actions **secrets** (`RESEND_API_KEY`, etc.) are now unused by the run
  steps — you may keep them (harmless) or delete after confirming nothing else
  references them (`grep -rn 'secrets\.RESEND_API_KEY' .github/`).
- Optional: adopt the existing `ga4-sa-credentials` into Terraform for full IaC —
  add it to `runtime_secrets`, then `tofu import` the container **and** its IAM
  binding (it already exists, so a plain apply would try to create a duplicate).

## Rollback

The migration is per-revision. If a `--set-secrets` revision misbehaves:

```bash
gcloud run services update-traffic "$SVC" --region "$REGION" --project "$PROJECT" \
  --to-revisions=<LAST_GOOD_REVISION>=100
```

Then revert the workflow diff. The Terraform secrets/IAM are additive and safe to
leave in place (nothing breaks from an unused secret existing).

---

## Checklist (run once per env, staging first)

- [ ] `secretmanager.googleapis.com` enabled
- [ ] `runtime_secrets` set in `envs/<env>/main.tf`; `tofu apply` — 9 secrets + 9 IAM added, nothing destroyed
- [ ] versions seeded out-of-band; SA-impersonation read returns OK
- [ ] api + consumer deploy steps flipped to `--set-secrets`; secret entries removed from `--set-env-vars`
- [ ] deploy green; `describe` shows `valueFrom.secretKeyRef`, no plaintext for migrated vars
- [ ] API + consumer smoke-tested
- [ ] repeated for production
