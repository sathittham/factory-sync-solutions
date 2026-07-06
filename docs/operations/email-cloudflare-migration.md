---
version: 1.0.0
lastUpdated: 2026-07-07
author: Sathittham Sangthong
---

# Email Provider Migration — Resend → Cloudflare Email Sending

Swaps the transactional email provider from Resend to **Cloudflare Email Sending**
(REST API). Prepared on branch `feature/email-cloudflare` (stacked on
`feature/infra-secret-manager`).

## What changed (code, already committed)

- `notification.EmailClient` now calls `POST /accounts/{account_id}/email/sending/send`
  with `Authorization: Bearer <token>`, body `{from,to,subject,html}`. Retries on
  429/5xx, fails fast on 4xx. HTML templates + subjects are unchanged.
- Introduced an `EmailSender` interface; `notification.Service.email` is now that
  interface (mockable). Both binaries declare `var emailClient notification.EmailSender`
  so a nil client stays a true nil interface.
- `NewEmailClient(accountID, apiToken, from)` — reads `CF_EMAIL_API_TOKEN` +
  `CLOUDFLARE_ACCOUNT_ID` (was `RESEND_API_KEY`). `resend-go` dropped from go.mod.
- Tests: `email_send_test.go` (request shape, auth header, API-error, retry policy).

## Config / infra (already committed)

- `.env.example`: `CF_EMAIL_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.
- Staging deploy (`deploy-staging.yml`): api + consumer `--set-secrets` now reference
  `cf-email-api-token:latest`; `CLOUDFLARE_ACCOUNT_ID` added to `--set-env-vars`.
- Prod deploy (`deploy-production.yml`): api + consumer `--set-env-vars` use
  `CF_EMAIL_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (prod isn't on Secret Manager yet).
- Terraform: `cf-email-api-token` added to staging `runtime_secrets`
  (`resend-api-key` retained until cutover verified, then removed).

## Prerequisites (Cloudflare — you)

1. Onboard the sending domain: `npx wrangler email sending enable factorysyncsolutions.com`
   and complete SPF/DKIM/DMARC. Verify: `npx wrangler email sending list`.
2. Mint an API token at https://dash.cloudflare.com/profile/api-tokens → Create
   Custom Token with permission **Account → Email Sending → Edit**, Account
   Resources = the account owning the domain. Copy it once — this is the
   `cf-email-api-token` value below. Keep it out of git/CI logs.
3. Add a repo **secret** `CF_EMAIL_API_TOKEN` (prod environment) for the prod deploy.
   `CLOUDFLARE_ACCOUNT_ID` already exists as a secret.

## Cutover — STAGING first

```bash
export GOOGLE_OAUTH_ACCESS_TOKEN="$(gcloud auth print-access-token)"   # personal account
P=factory-sync-solutions-staging

# 1. Create the secret container + IAM (additive; resend-api-key untouched).
cd infra/gcp/envs/staging
tofu plan      # expect: 1 secret + 1 iam_member ADD, 0 destroy — REVIEW
tofu apply

# 2. Seed the CF token value (never printed). Paste the token at the prompt:
gcloud secrets versions add cf-email-api-token --project "$P" --data-file=-
#   <paste token, then Ctrl-D>

# 3. Deploy staging api + consumer from the branch:
gh workflow run deploy-staging.yml --ref feature/email-cloudflare \
  -f deploy_api=true -f deploy_consumer=true \
  -f deploy_gateway=false -f deploy_web=false -f deploy_official=false \
  -f deploy_backoffice=false -f deploy_cms=false

# 4. Verify the token is wired + send a real email (invite or a test result):
gcloud run services describe factory-sync-solutions-api-staging --region asia-southeast3 --project "$P" --format=json \
  | jq -r '.spec.template.spec.containers[0].env[] | select(.name=="CF_EMAIL_API_TOKEN") | .name + " -> " + (.valueFrom.secretKeyRef.key // "PLAINTEXT?!")'
```

Confirm an email actually arrives (trigger an invite from the backoffice, or a quiz
result). Check `email_jobs` in Firestore shows `sent`.

## Cutover — PRODUCTION (after staging verified)

1. Ensure the prod repo secret `CF_EMAIL_API_TOKEN` is set.
2. Merge `feature/infra-secret-manager` then `feature/email-cloudflare` into `develop`
   → promote through staging → tag `vX.Y.Z` (prod deploy reads `CF_EMAIL_API_TOKEN`
   from `--set-env-vars`). Prod's own Secret Manager cutover (infra item 1) will later
   move it to `--set-secrets`.

## Cleanup (after prod verified)

- Remove `resend-api-key` from staging `runtime_secrets`. It has `prevent_destroy`, so
  either drop the lifecycle guard for one apply, or `tofu state rm` + delete the secret
  manually: `gcloud secrets delete resend-api-key --project <P>`.
- Delete the `RESEND_API_KEY` GitHub secret(s) once nothing references them:
  `grep -rn 'RESEND_API_KEY' .github/`.

## Rollback

Cloudflare-only code path; to revert, redeploy the previous revision
(`gcloud run services update-traffic ... --to-revisions <PREV>=100`) and revert the
branch. The Resend secret/values remain until the cleanup step, so reverting the code
+ re-adding `RESEND_API_KEY` restores the old provider.
