---
version: 1.1.0
lastUpdated: 2026-07-07
author: Sathittham Sangthong
---

# Email Provider Migration — Resend → Cloudflare Email Sending

Swaps the transactional email provider from Resend to **Cloudflare Email Sending**
(REST API). Prepared on branch `feature/email-cloudflare` (stacked on
`feature/infra-secret-manager`).

**Token decision:** reuses the existing `CLOUDFLARE_API_TOKEN` (already a repo
secret, used by the docs-publish/wrangler steps) rather than minting a dedicated
one. It **must** carry the `Email Sending: Edit` permission — if it was scoped only
for R2/Workers, add that permission or the send endpoint returns 403.

## What changed (code, committed)

- `notification.EmailClient` sends via `POST /accounts/{account_id}/email/sending/send`
  (Bearer token, `from/to/subject/html`), retry on 429/5xx, fail-fast on 4xx.
  Templates + subjects unchanged.
- `EmailSender` interface added; `Service.email` is that interface (mockable). Both
  binaries declare a nil-safe `EmailSender` and only build the client when **both**
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set.
- `resend-go` dropped from go.mod. Tests in `email_send_test.go`.

## Config / infra (committed)

- `.env.example`: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- Staging (`deploy-staging.yml`): api + consumer `--set-secrets` reference
  `cloudflare-api-token:latest`; `CLOUDFLARE_ACCOUNT_ID` added to `--set-env-vars`.
- Prod (`deploy-production.yml`): api + consumer `--set-env-vars` use
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (prod isn't on Secret Manager yet).
- Terraform: `cloudflare-api-token` added to staging `runtime_secrets`
  (`resend-api-key` retained until cutover verified, then removed).

## Prerequisites (Cloudflare)

1. Onboard the sending domain: `npx wrangler email sending enable factorysyncsolutions.com`,
   complete SPF/DKIM/DMARC. Verify: `npx wrangler email sending list`.
2. Confirm `CLOUDFLARE_API_TOKEN` has **`Email Sending: Edit`** (Account-scoped) at
   https://dash.cloudflare.com/profile/api-tokens. No new repo secret needed — it
   already exists and is inherited by the staging + production environments.

## Cutover — STAGING first

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"   # personal account
P=factory-sync-solutions-staging

# 1. Create the secret container + IAM (additive; resend-api-key untouched).
cd infra/gcp/envs/staging
tofu plan      # expect: 1 secret + 1 iam_member ADD, 0 destroy — REVIEW
tofu apply

# 2. Seed the token value into Secret Manager (never printed). Paste the same value
#    as the CLOUDFLARE_API_TOKEN repo secret, then Ctrl-D:
gcloud secrets versions add cloudflare-api-token --project "$P" --data-file=-

# 3. Deploy staging api + consumer from the branch:
gh workflow run deploy-staging.yml --ref feature/email-cloudflare \
  -f deploy_api=true -f deploy_consumer=true \
  -f deploy_gateway=false -f deploy_web=false -f deploy_official=false \
  -f deploy_backoffice=false -f deploy_cms=false

# 4. Verify the token is wired via Secret Manager:
gcloud run services describe factory-sync-solutions-api-staging --region asia-southeast3 --project "$P" --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | select(.name=="CLOUDFLARE_API_TOKEN") | .name + " -> " + (.valueFrom.secretKeyRef.key // "PLAINTEXT?!")'
```

Then trigger a real email (invite from backoffice, or a quiz result) and confirm it
arrives + `email_jobs` in Firestore shows `sent`.

## Cutover — PRODUCTION (after staging verified)

Prod already has the `CLOUDFLARE_API_TOKEN` secret — no new secret to add. Merge
`feature/infra-secret-manager` → `develop`, then `feature/email-cloudflare` →
`develop`, promote through staging, and tag `vX.Y.Z`. The prod deploy reads
`CLOUDFLARE_API_TOKEN` from `--set-env-vars`; prod's own Secret Manager cutover
(infra item 1) will later move it to `--set-secrets`.

## Cleanup (after prod verified)

- Remove `resend-api-key` from staging `runtime_secrets` (it has `prevent_destroy`:
  drop the guard for one apply, or `tofu state rm` + `gcloud secrets delete resend-api-key`).
- Delete the `RESEND_API_KEY` GitHub secret(s) once unreferenced (`grep -rn 'RESEND_API_KEY' .github/`).

## Rollback

Cloudflare-only code path; revert by redeploying the previous revision
(`gcloud run services update-traffic ... --to-revisions <PREV>=100`) and reverting
the branch. Resend secret/values remain until cleanup, so reverting the code +
re-adding `RESEND_API_KEY` restores the old provider.
