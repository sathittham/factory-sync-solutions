# Migration Runbook: `factory-health-check` → `factory-sync-solutions`

Migrate the project off the GCP/Firebase project **`factory-health-check`** onto a
new project **`factory-sync-solutions`**.

> **Reality check.** GCP/Firebase project IDs are **immutable** — this is not a
> rename. It is: *provision new projects → migrate data + users → repoint config
> → cut over DNS → decommission old*. Treat it as a release with a freeze window
> and a tested rollback, not a refactor.
>
> **Repo already renamed.** The GitHub repo, `origin` remote, and local directory are
> already `factory-sync-solutions` (tags up to `v0.6.7`). This runbook is now only about the
> **GCP/Firebase project** migration; Phase 11 is reduced to cleaning up leftover paths.

---

## Legend — who does what

- 👤 **You** — requires GCP/Firebase console, billing, or account access I don't have.
- 🤖 **Automatable** — I can run/script this (config, code, gh CLI) once the new project exists.

## Identifiers changing

| Old | New |
|-----|-----|
| GCP/Firebase project ID `factory-health-check` | `factory-sync-solutions` |
| `factory-health-check.firebaseapp.com` (auth domain) | `factory-sync-solutions.firebaseapp.com` |
| `factory-health-check.firebasestorage.app` (bucket) | `factory-sync-solutions.firebasestorage.app` |
| Firebase web config: apiKey, appId, messagingSenderId | **new values** from the new web app |
| `firebase-sa.json` (service-account key) | **new key** from the new project |

## Identifiers NOT changing (do not touch)

- Region: **`asia-southeast3`** (Bangkok, Thailand — launched 2026-01-21, three zones, PDPA data
  residency), with **`asia-southeast1`** (Singapore) as the fallback for any service not yet offered
  in Bangkok. All services this migration touches are confirmed available in `asia-southeast3` —
  **Cloud Run, Artifact Registry, and Firestore** (Bangkok is in the Firestore regional-locations
  list) — so **no fallback is needed today**. (Only Cloud Run *Serverless VPC Access connectors* are
  unsupported in `asia-southeast3`; this project doesn't use them.) The `deploy-*.yml` workflows
  already use `asia-southeast3` and `docs/operations/deployment.md` is corrected to match; substitute
  `asia-southeast3` for `<REGION>` in every command below. ✅ The prod API is already deployed and
  serving in `asia-southeast3` (verified — protected routes return the app's JSON 401). Its legacy
  hostname `…-lumldnu3vq-eu.a.run.app` is **not** europe-west — it's the old-style alias of the same
  asia-southeast3 service; `.env.production` now uses the region-explicit canonical URL
  `https://factory-sync-solutions-api-241196731341.asia-southeast3.run.app/api/v1`. **Staging runs in a
  separate GCP project** `factory-sync-solutions-staging` (project number `738710072389`, also
  `asia-southeast3`); its API is deployed and verified at
  `https://factory-sync-solutions-api-staging-738710072389.asia-southeast3.run.app/api/v1`.
- Cloud Run service names: `factory-sync-solutions-api`, `factory-sync-solutions-api-staging` (already brand-named)
- Artifact Registry repo: `cloud-run`
- Cloudflare Pages projects (4): `factory-sync-solutions`, `factory-sync-solutions-staging`,
  `factory-sync-solutions-official`, `factory-sync-solutions-official-staging`
- **Quiz slug** `"factory-health-check"` in `apps/web-official/src/components/**` — this is a
  *service/quiz offering name*, NOT the project. Leaving it alone is intentional.

---

## Phase 0 — Pre-flight 👤

1. Confirm the project ID `factory-sync-solutions` is **available** (Firebase IDs are globally unique):
   ```bash
   gcloud projects describe factory-sync-solutions 2>&1 || echo "available"
   ```
2. Pick a **billing account** and the **org/folder** (`infra-thelivingos`?) for the new project.
3. Announce a **maintenance/freeze window** — no writes to production Firestore during the data copy.
4. **Back up** current Firestore before anything (Phase 4 export doubles as the backup).
5. Inventory production OAuth providers, authorized domains, and Turnstile keys tied to the old project.

## Phase 1 — Provision GCP 👤 (🤖 can script)

```bash
gcloud projects create factory-sync-solutions --name="FactorySync Solutions"
gcloud billing projects link factory-sync-solutions --billing-account=<BILLING_ID>
gcloud config set project factory-sync-solutions

# Enable required APIs
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com firebase.googleapis.com \
  identitytoolkit.googleapis.com cloudbuild.googleapis.com \
  --project=factory-sync-solutions

# Artifact Registry repo (matches the docker.pkg.dev/<proj>/cloud-run/... path in workflows)
gcloud artifacts repositories create cloud-run \
  --repository-format=docker --location=<REGION> \
  --project=factory-sync-solutions
```

## Phase 2 — Provision Firebase 👤

1. Firebase console → **Add project** → select the `factory-sync-solutions` GCP project.
2. **Authentication** → enable the same sign-in providers; add authorized domains
   (the new `*.firebaseapp.com`, Cloudflare Pages domains, custom domain).
3. **Project settings → Your apps → Web app** → register a web app → copy the config:
   `apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId`.
   These feed the new `apps/web-app/.env.*` (Phase 7).
4. **Firestore** → create database in `<REGION>` (match the **old** project's location/mode exactly —
   import requires the same location).

## Phase 3 — Service account 👤

```bash
gcloud iam service-accounts create deployer \
  --display-name="CI Deployer" --project=factory-sync-solutions

# Grant deploy + runtime roles (tighten later to least-privilege)
for ROLE in roles/run.admin roles/artifactregistry.writer \
            roles/datastore.user roles/iam.serviceAccountUser \
            roles/firebaseauth.admin; do
  gcloud projects add-iam-policy-binding factory-sync-solutions \
    --member="serviceAccount:deployer@factory-sync-solutions.iam.gserviceaccount.com" \
    --role="$ROLE"
done

# Backend runtime SA key → becomes the new firebase-sa.json (DO NOT COMMIT — gitignored)
gcloud iam service-accounts keys create firebase-sa.json \
  --iam-account=deployer@factory-sync-solutions.iam.gserviceaccount.com \
  --project=factory-sync-solutions
```

## Phase 4 — Migrate Firestore data 👤  ⚠️ data-critical

```bash
# 1. Create the bucket (same <REGION> as both Firestore databases). NOTE: Phase 1 set gcloud
#    config to the NEW project, so this bucket lives in the NEW project.
gsutil mb -l <REGION> gs://fhc-migration-export

# 1a. Cross-project export: the OLD project's Firestore service agent must be able to WRITE to the
#     bucket, or the export fails with a permission error.
gsutil iam ch \
  serviceAccount:service-<OLD_PROJECT_NUMBER>@gcp-sa-firestore.iam.gserviceaccount.com:objectAdmin \
  gs://fhc-migration-export
gcloud firestore export gs://fhc-migration-export \
  --project=factory-health-check

# 2. Import into NEW project — grant the NEW project's Firestore SA read on the bucket first
gsutil iam ch \
  serviceAccount:service-<NEW_PROJECT_NUMBER>@gcp-sa-firestore.iam.gserviceaccount.com:objectViewer \
  gs://fhc-migration-export
gcloud firestore import gs://fhc-migration-export/<EXPORT_PREFIX> \
  --project=factory-sync-solutions
```

Then 🤖 deploy security rules + indexes to the new project:
```bash
# requires firebase CLI (not installed here): npm i -g firebase-tools
# NOTE: there is no firebase.json / .firebaserc in this repo — create one first, e.g.
#   firebase init firestore   # point it at the existing firestore.rules + firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes --project factory-sync-solutions
```

## Phase 5 — Migrate Firebase Auth users 👤  ⚠️ users re-auth risk

```bash
firebase auth:export users.json  --project factory-health-check
firebase auth:import users.json  --project factory-sync-solutions \
  --hash-algo=<SAME_AS_OLD>   # password hash params must match or passwords break
```
> If hash params can't be matched, users keep accounts but must reset passwords.
> OAuth (Google etc.) users re-link automatically once providers are re-enabled (Phase 2.2).

## Phase 6 — Secrets & CI config 🤖 (you supply values)

> **This is the source of truth for deploys, not the committed `.env.*` files.** The
> `deploy-*.yml` workflows build the frontend from GitHub Actions **variables** (`vars.*`) and
> inject backend runtime config from **secrets** (`secrets.*`). Editing `apps/*/.env.*` does
> **nothing** at deploy time (those are local/dev only — see Phase 7). Repoint every value below
> or production ships with the old project's config.

```bash
# --- Repository VARIABLES (gh variable set) — consumed by the build ---
gh variable set GCP_PROJECT_ID                 --body factory-sync-solutions
gh variable set VITE_FIREBASE_PROJECT_ID       --body factory-sync-solutions
gh variable set VITE_FIREBASE_AUTH_DOMAIN      --body factory-sync-solutions.firebaseapp.com
gh variable set VITE_FIREBASE_STORAGE_BUCKET   --body factory-sync-solutions.firebasestorage.app
gh variable set VITE_FIREBASE_API_KEY          --body <NEW_API_KEY>
gh variable set VITE_FIREBASE_MESSAGING_SENDER_ID --body <NEW_SENDER_ID>
gh variable set VITE_FIREBASE_APP_ID           --body <NEW_APP_ID>
gh variable set VITE_API_BASE_URL              --body <NEW_PROD_CLOUD_RUN_URL>/api/v1   # + staging equivalent
gh variable set VITE_CF_TURNSTILE_SITE_KEY     --body <SITE_KEY>
gh variable set ALLOWED_ORIGINS                --body <NEW_DOMAINS>
gh variable set VITE_GTM_ID                    --body <GTM_ID>          # if used
gh variable set VITE_GA_MEASUREMENT_ID         --body <GA_ID>          # if used

# --- Repository SECRETS (gh secret set) ---
gh secret set GCP_SA_KEY < firebase-sa.json    # new service-account JSON
# Re-confirm these still exist for the repo (re-set only if values change):
#   RESEND_API_KEY, CF_TURNSTILE_SECRET, SLACK_WEBHOOK_REGISTRATION,
#   SLACK_WEBHOOK_QUIZ_RESULT, SLACK_WEBHOOK_DEPLOY
gh secret set CLOUDFLARE_API_TOKEN             # if the Cloudflare account changes
gh secret set CLOUDFLARE_ACCOUNT_ID
```

> `web-official` reads no Firebase vars — its only build inputs are the **hardcoded**
> `PUBLIC_APP_URL` / `PUBLIC_APP_VERSION` in `deploy-*.yml`. If the public domain changes,
> hand-edit those workflow lines (the swap script won't).

## Phase 7 — Code & config swap 🤖

Run the helper (idempotent; only touches project-ID config, never the quiz slug):
```bash
./scripts/migration/swap-project-id.sh factory-health-check factory-sync-solutions
```
It does a literal `factory-health-check`→`factory-sync-solutions` string swap on a fixed list of
10 files: `.github/workflows/deploy-{staging,production}.yml`, `apps/backend/.env.{production,staging,development}`,
`apps/web-app/.env.{production,staging,development}`, and `docs/operations/{deployment,env-variables}.md`.
It does **not** touch the quiz slug, `firebase-sa.json`, or values that don't contain the old project ID.

> **Scope check:** these `.env.*` edits are for **local/dev** only — CI deploys from GitHub
> `vars.*`/`secrets.*` (Phase 6), so updating the env files alone won't change a deploy. Still set
> them so `make dev` points at the new project. After the swap, manually fill the values the script
> can't know into `apps/web-app/.env.*` and the matching `vars.*`:
> `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and
> `VITE_API_BASE_URL` (the new Cloud Run URL — note staging's is currently empty).

## Phase 8 — Staging cutover 🤖 + 👤 verify

> **Precondition:** the staging Cloud Run service `factory-sync-solutions-api-staging` must exist
> and `vars.VITE_API_BASE_URL` (staging) must point at it — staging's API URL is empty today, so
> the staging app can't reach the backend until both are set.

```bash
# Use the NEXT free version — v0.6.x is already taken (latest tag is v0.6.7). A migration is a
# feature-sized change, so bump the minor: v0.7.0. Re-check `git tag --sort=-creatordate` first.
git checkout staging && git merge --ff-only develop && git push origin staging
git tag -a v0.7.0-staging -m "Migrate to factory-sync-solutions (staging)"
git push origin v0.7.0-staging      # → staging deploy on the NEW project
```
Verify on staging: login, take a quiz, view results, check Firestore writes land in the
new project, Slack/Resend/Turnstile work.

## Phase 9 — DNS / custom domains 👤  ⚠️ downtime window

- Add custom domains to the new Firebase Auth authorized domains + Cloudflare Pages.
- Re-point DNS to the new project's endpoints. Lower TTL beforehand.

## Phase 10 — Production cutover 🤖 + 👤 verify

```bash
git checkout main && git merge --ff-only staging && git push origin main
git tag -a v0.7.0 -m "Migrate to factory-sync-solutions (production)"
git push origin v0.7.0              # → production deploy on the NEW project
```

## Phase 11 — Repo rename cleanup 🤖

The GitHub repo, `origin` remote, and local directory are **already** `factory-sync-solutions` —
no rename needed. Verify and fix the leftover absolute paths:
```bash
# Confirm rename already happened (all should say factory-sync-solutions):
git remote get-url origin
basename "$PWD"

# Check for stale paths still pointing at the old name:
grep -rn factory-health-check .claude/settings.local.json apps/backend/.env.development
#   → settings.local.json has 1 hit (a permission-allowlist entry for the swap script — harmless).
#   → apps/backend/.env.development is already repointed (0 hits — GOOGLE_APPLICATION_CREDENTIALS
#     now points at .../factory-sync-solutions/firebase-sa.json).
```
These files are **gitignored / local-only** and are not touched by the swap script (Phase 7).

## Phase 12 — Decommission 👤 (after a grace period)

- Keep the old `factory-health-check` project **read-only** for 1–2 weeks as rollback.
- Confirm no traffic, then shut down / delete to stop billing.

---

## Rollback

Until Phase 9 (DNS), rollback is trivial — the old project is untouched and still live;
revert the config swap (`git checkout -- .`) and re-tag from the old setup. After DNS
cutover, rollback = re-point DNS back to the old project (kept read-only in Phase 12).

## Hard prerequisites I'm missing locally

- `firebase-tools` CLI is **not installed** (needed for Phases 4–5): `npm i -g firebase-tools`.
- **No `firebase.json` / `.firebaserc`** in the repo — `firebase deploy`/`firebase use` need one
  (`firebase init firestore`) before Phase 4 can deploy rules + indexes.
- My `gcloud` accounts can't see the `factory-health-check` project — Phases 1–5 must run
  under an account with Owner/Editor on both projects.

> **Verification:** work through [migration-verification-checklist.md](./migration-verification-checklist.md)
> in lockstep with this runbook — it has per-phase gates and the blocker list that must clear first.

*Version: 1.2.0 · Created: 09 June 2026 · Updated: 10 June 2026*
