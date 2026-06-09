# Migration Runbook: `factory-health-check` → `factory-sync-solutions`

Migrate the project off the GCP/Firebase project **`factory-health-check`** onto a
new project **`factory-sync-solutions`**, then rename the repo to match.

> **Reality check.** GCP/Firebase project IDs are **immutable** — this is not a
> rename. It is: *provision new projects → migrate data + users → repoint config
> → cut over DNS → decommission old*. Treat it as a release with a freeze window
> and a tested rollback, not a refactor.

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

- Region: `asia-southeast3`
- Cloud Run service names: `factory-sync-solutions-api`, `factory-sync-solutions-api-staging` (already brand-named)
- Artifact Registry repo: `cloud-run`
- Cloudflare Pages projects: `factory-sync-solutions`, `factory-sync-solutions-staging`
- **Quiz slug** `"factory-health-check"` in `apps/fs-official-web/src/components/**` — this is a
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
  --repository-format=docker --location=asia-southeast3 \
  --project=factory-sync-solutions
```

## Phase 2 — Provision Firebase 👤

1. Firebase console → **Add project** → select the `factory-sync-solutions` GCP project.
2. **Authentication** → enable the same sign-in providers; add authorized domains
   (the new `*.firebaseapp.com`, Cloudflare Pages domains, custom domain).
3. **Project settings → Your apps → Web app** → register a web app → copy the config:
   `apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId`.
   These feed the new `apps/fs-app-web/.env.*` (Phase 7).
4. **Firestore** → create database in `asia-southeast3` (match the old location/mode).

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
# 1. Export from OLD project to a GCS bucket
gsutil mb -l asia-southeast3 gs://fhc-migration-export
gcloud firestore export gs://fhc-migration-export \
  --project=factory-health-check

# 2. Import into NEW project (grant the new project's Firestore SA read on the bucket first)
gsutil iam ch \
  serviceAccount:service-<NEW_PROJECT_NUMBER>@gcp-sa-firestore.iam.gserviceaccount.com:objectViewer \
  gs://fhc-migration-export
gcloud firestore import gs://fhc-migration-export/<EXPORT_PREFIX> \
  --project=factory-sync-solutions
```

Then 🤖 deploy security rules + indexes to the new project:
```bash
# requires firebase CLI (not installed here): npm i -g firebase-tools
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

```bash
# GitHub Actions variable (workflows read GCP_PROJECT_ID)
gh variable set GCP_PROJECT_ID --body factory-sync-solutions

# GitHub Actions secret — paste the new service-account JSON
gh secret set GCP_SA_KEY < firebase-sa.json

# Re-confirm Cloudflare secrets if the account also changes (see the deploy auth issue)
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
```

## Phase 7 — Code & config swap 🤖

Run the helper (idempotent; only touches project-ID config, never the quiz slug):
```bash
./scripts/migration/swap-project-id.sh factory-health-check factory-sync-solutions
```
It rewrites: `.github/workflows/deploy-*.yml`, `apps/fs-backend/.env.*`,
`apps/fs-app-web/.env.*` (authDomain/projectId/storageBucket/API base URL), and the
`docs/operations/*` examples. Then **manually paste** the new Firebase web config
values (apiKey/appId/messagingSenderId) the script can't know into `apps/fs-app-web/.env.*`.

> Also fix the pre-existing mismatch: `VITE_API_BASE_URL` points at `cloudfunctions.net`,
> but the backend deploys to **Cloud Run**. Set it to the new Cloud Run URL.

## Phase 8 — Staging cutover 🤖 + 👤 verify

```bash
git checkout staging && git merge --ff-only develop && git push origin staging
git tag -a v0.6.0-staging -m "Migrate to factory-sync-solutions (staging)"
git push origin v0.6.0-staging      # → staging deploy on the NEW project
```
Verify on staging: login, take a quiz, view results, check Firestore writes land in the
new project, Slack/Resend/Turnstile work.

## Phase 9 — DNS / custom domains 👤  ⚠️ downtime window

- Add custom domains to the new Firebase Auth authorized domains + Cloudflare Pages.
- Re-point DNS to the new project's endpoints. Lower TTL beforehand.

## Phase 10 — Production cutover 🤖 + 👤 verify

```bash
git checkout main && git merge --ff-only staging && git push origin main
git tag -a v0.6.0 -m "Migrate to factory-sync-solutions (production)"
git push origin v0.6.0              # → production deploy on the NEW project
```

## Phase 11 — Repo & directory rename 🤖

```bash
gh repo rename factory-sync-solutions          # updates GitHub repo
git remote set-url origin https://github.com/sathittham/factory-sync-solutions.git
# local dir (do last; changes your cwd):
cd .. && mv factory-health-check factory-sync-solutions
```
Update absolute paths in `.claude/settings.local.json` and `apps/fs-backend/.env.development`
(`GOOGLE_APPLICATION_CREDENTIALS`).

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
- My `gcloud` accounts can't see the `factory-health-check` project — Phases 1–5 must run
  under an account with Owner/Editor on both projects.

*Version: 1.0.0 · Created: 09 June 2026*
