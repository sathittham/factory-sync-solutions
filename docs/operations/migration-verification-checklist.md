# Migration Verification Checklist: `factory-health-check` → `factory-sync-solutions`

Companion to [migrate-to-factory-sync-solutions.md](./migrate-to-factory-sync-solutions.md).
Work top-to-bottom; **do not tick a box you have not actually observed**. Each phase has a
verification gate that must pass before continuing. ⚠️ marks data-loss / downtime risk.

Legend: `[ ]` not done · `[~]` in progress · `[x]` verified · 👤 needs console/billing access · 🤖 scriptable

---

## Phase status (overview)

Tick a phase only when **every** box in its section is `[x]` and its gate passed.

| ✓ | Phase | Status | Verified by | Date |
|---|-------|--------|-------------|------|
| [ ] | Blockers cleared | not started | | |
| [ ] | 0 — Pre-flight | not started | | |
| [ ] | 1 — Provision GCP | not started | | |
| [ ] | 2 — Provision Firebase | not started | | |
| [ ] | 3 — Service account | not started | | |
| [ ] | 4 — Migrate Firestore data ⚠️ | not started | | |
| [ ] | 5 — Migrate Auth users ⚠️ | not started | | |
| [ ] | 6 — Secrets & CI config | not started | | |
| [ ] | 7 — Code & config swap | not started | | |
| [ ] | 8 — Staging cutover ⚠️ | not started | | |
| [ ] | 9 — DNS / custom domains ⚠️ | not started | | |
| [ ] | 10 — Production cutover ⚠️ | not started | | |
| [ ] | 11 — Repo rename cleanup (rename already done) | paths pending | | |
| [ ] | 12 — Decommission | not started | | |

---

## ⚠️ Blockers to resolve BEFORE starting

These came out of reviewing the runbook against the repo — fix them or the migration breaks silently.
Boxes marked **(pre-verified from repo, 2026-06-10)** were confirmed against the current tree; the
rest are still open actions.

- [x] **Region confirmed: `asia-southeast3`** (Bangkok — launched 2026-01-21, three zones, PDPA data
  residency); fallback `asia-southeast1` (Singapore) for any service not in Bangkok. Cloud Run,
  Artifact Registry, and Firestore are all available in `asia-southeast3`, so **no fallback is needed**.
  *(confirmed by owner, 2026-06-10)* The `deploy-*.yml` workflows already target it — no change needed —
  and `docs/operations/deployment.md` is corrected from `asia-southeast1` → `asia-southeast3`.
  ✅ Prod API verified live in `asia-southeast3` (protected routes return the app's JSON 401). The
  `…-eu.a.run.app` hostname is the legacy alias of that same service, **not** europe-west;
  `.env.production` now uses the canonical `…-241196731341.asia-southeast3.run.app/api/v1`.
- [x] **Map every CI variable/secret the deploy actually reads.** *(pre-verified from repo,
  2026-06-10)* The frontend build uses GitHub Actions `vars.*`, NOT the committed
  `apps/fs-app-web/.env.*`. Full list captured in Phase 6 below. *(Mapping done — repointing the
  values is still a Phase 6 action.)*
- [x] **Remove the stale `cloudfunctions.net` note** in Phase 7. *(pre-verified from repo,
  2026-06-10 — runbook patched; `grep cloudfunctions docs/operations/migrate-*.md` = 0 hits.)*
- [ ] **Staging Cloud Run service does not exist.** `gcloud run services list` shows only the prod
  `factory-sync-solutions-api` (asia-southeast3) — no staging service. `apps/fs-app-web/.env.staging`
  is now pre-filled with the *predicted* deterministic URL
  (`…api-staging-241196731341.asia-southeast3.run.app/api/v1`), but it resolves only after the staging
  service is deployed (Phase 8). Also set `vars.VITE_API_BASE_URL` (staging) in GitHub for the CI build.
- [ ] **No `firebase.json` / `.firebaserc` in the repo.** Phase 4's
  `firebase deploy --only firestore:rules,firestore:indexes` (and any `firebase use`) will fail
  without a Firebase config. Run `firebase init firestore` (pointing at the existing
  `firestore.rules` + `firestore.indexes.json`) or pass `--project` + `--config` explicitly first.
- [ ] **`PUBLIC_APP_URL` is hardcoded** in `deploy-*.yml` (`factorysyncsolutions.com` /
  `staging.factorysyncsolutions.com`), not a `var`. The swap script won't touch it — hand-edit the
  workflows if the public domain changes.

---

## Phase 0 — Pre-flight 👤
- [ ] `gcloud projects describe factory-sync-solutions` returns "available" (or the new project, if already made)
- [ ] Billing account + org/folder chosen
- [ ] Maintenance / write-freeze window announced and scheduled
- [ ] Production OAuth providers, authorized domains, and Turnstile keys inventoried
- [ ] **Gate:** freeze is active before any Firestore export
- [ ] **✅ Phase 0 complete** — verified by ______ on ______

## Phase 1 — Provision GCP 👤🤖
- [ ] `factory-sync-solutions` project created and `gcloud config` points at it
- [ ] Billing linked: `gcloud billing projects describe factory-sync-solutions` shows `billingEnabled: true`
- [ ] APIs enabled: run, artifactregistry, firestore, firebase, identitytoolkit, cloudbuild
  (`gcloud services list --enabled`)
- [ ] Artifact Registry repo `cloud-run` exists in the **correct region**
  (`gcloud artifacts repositories list`)
- [ ] **Gate:** `gcloud artifacts repositories describe cloud-run --location=<REGION>` succeeds
- [ ] **✅ Phase 1 complete** — verified by ______ on ______

## Phase 2 — Provision Firebase 👤
- [ ] Firebase added to the GCP project
- [ ] Auth: same sign-in providers enabled
- [ ] Auth: authorized domains added (`*.firebaseapp.com`, Cloudflare Pages domains, custom domain)
- [ ] Web app registered; config copied (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)
- [ ] Firestore database created in the **same region/mode** as the old project
- [ ] **Gate:** new web config values captured for Phase 6
- [ ] **✅ Phase 2 complete** — verified by ______ on ______

## Phase 3 — Service account 👤🤖
- [ ] `deployer@factory-sync-solutions.iam.gserviceaccount.com` created
- [ ] Roles bound: run.admin, artifactregistry.writer, datastore.user, iam.serviceAccountUser, firebaseauth.admin
  (`gcloud projects get-iam-policy factory-sync-solutions`)
- [ ] Key downloaded as `firebase-sa.json` and **NOT committed** (`git status` shows it ignored)
- [ ] **Gate:** `gcloud auth activate-service-account --key-file=firebase-sa.json` works
- [ ] **✅ Phase 3 complete** — verified by ______ on ______

## Phase 4 — Migrate Firestore data 👤 ⚠️
- [ ] **Firebase config exists** — `firebase init firestore` run (or `firebase.json`/`.firebaserc`
      created) pointing at `firestore.rules` + `firestore.indexes.json`; neither file is in the repo today
- [ ] Export bucket created in the correct region
- [ ] Export from OLD project completed; note the `<EXPORT_PREFIX>`
- [ ] New project's Firestore SA granted `objectViewer` on the bucket
- [ ] Import into NEW project completed without errors
- [ ] Security rules + indexes deployed (`firebase deploy --only firestore:rules,firestore:indexes --project factory-sync-solutions`)
- [ ] **Gate:** spot-check document counts per top-level collection match OLD vs NEW
- [ ] **Gate:** composite indexes show `READY` in console (no `BUILDING` left)
- [ ] **✅ Phase 4 complete** — verified by ______ on ______

## Phase 5 — Migrate Auth users 👤 ⚠️
- [ ] `auth:export` from OLD produced `users.json`
- [ ] Password hash params identified (`--hash-algo` etc.)
- [ ] `auth:import` into NEW succeeded; user count matches export
- [ ] **Gate:** test login with a password user (or confirm reset-password fallback documented)
- [ ] **Gate:** test login with an OAuth (Google) user after providers re-enabled
- [ ] **✅ Phase 5 complete** — verified by ______ on ______

## Phase 6 — Secrets & CI config 🤖 (you supply values)
Repoint **GitHub Actions** values — these are what CI actually deploys with.

Repository **variables** (`gh variable set`):
- [ ] `GCP_PROJECT_ID` = `factory-sync-solutions`
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` = `factory-sync-solutions.firebaseapp.com`
- [ ] `VITE_FIREBASE_PROJECT_ID` = `factory-sync-solutions`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` = `factory-sync-solutions.firebasestorage.app`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_API_BASE_URL` (new Cloud Run URL, prod) — and the staging equivalent
- [ ] `VITE_CF_TURNSTILE_SITE_KEY`
- [ ] `ALLOWED_ORIGINS` (new domains)
- [ ] `VITE_GTM_ID`, `VITE_GA_MEASUREMENT_ID` (if used)

> `fs-official-web` uses **no Firebase vars** — its only build inputs are the hardcoded
> `PUBLIC_APP_URL` and `PUBLIC_APP_VERSION` in the workflow. No `vars` to repoint for it.

Repository **secrets** (`gh secret set`):
- [ ] `GCP_SA_KEY` = contents of new `firebase-sa.json`
- [ ] `RESEND_API_KEY`, `CF_TURNSTILE_SECRET`, `SLACK_WEBHOOK_REGISTRATION`, `SLACK_WEBHOOK_QUIZ_RESULT`, `SLACK_WEBHOOK_DEPLOY` (re-confirm present)
- [ ] `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (re-confirm if CF account changed)
- [ ] **Gate:** `gh variable list` and `gh secret list` show all of the above
- [ ] **✅ Phase 6 complete** — verified by ______ on ______

## Phase 7 — Code & config swap 🤖
- [ ] `./scripts/migration/swap-project-id.sh factory-health-check factory-sync-solutions` run
- [ ] `git diff` shows only project-ID changes in the 10 target files (quiz slug untouched)
- [ ] Firebase web config (apiKey/appId/messagingSenderId) pasted into `apps/fs-app-web/.env.*`
      *(local/dev only — CI uses `vars.*` from Phase 6)*
- [ ] `VITE_API_BASE_URL` set to the new Cloud Run URL in dev env + the staging note resolved
- [ ] **Gate:** `git grep factory-health-check` shows **no project-config** hits left. Expect these
      *intentional* leftovers to remain (the swap script touches only 10 files): the quiz slug in
      `apps/fs-official-web/src/components/**`, narrator strings in `.claude/workflows/*.js`, directory-tree
      examples in `AGENTS.md`/`CLAUDE.md`/`README.md`, doc examples in `docs/operations/env-variables.md`,
      and the usage comment in `swap-project-id.sh`. Anything else is a miss — fix by hand.

## Phase 8 — Staging cutover 🤖👤 ⚠️ (precondition: staging API service + var exist)
- [ ] `staging` fast-forwarded from `develop`, `v*-staging` tag pushed
- [ ] Staging deploy workflow green (api + web + official as applicable)
- [ ] Login works on staging
- [ ] Take a quiz → submit → results render
- [ ] Firestore writes land in the **new** project (verify in console)
- [ ] Slack notification fired; Resend email sent; Turnstile challenge passes
- [ ] **Gate:** all of the above pass before touching DNS/production
- [ ] **✅ Phase 8 complete** — verified by ______ on ______

## Phase 9 — DNS / custom domains 👤 ⚠️
- [ ] TTL lowered ahead of cutover
- [ ] Custom domains added to new Firebase authorized domains + Cloudflare Pages
- [ ] Custom domains bound on all **four** Pages projects: `factory-sync-solutions`,
      `factory-sync-solutions-staging`, `factory-sync-solutions-official`,
      `factory-sync-solutions-official-staging`
- [ ] Public domains live: `factorysyncsolutions.com` (prod) and
      `staging.factorysyncsolutions.com` (staging) — matches hardcoded `PUBLIC_APP_URL`
- [ ] DNS repointed to new endpoints
- [ ] **Gate:** `dig`/`nslookup` resolves to new targets; HTTPS cert valid
- [ ] **✅ Phase 9 complete** — verified by ______ on ______

## Phase 10 — Production cutover 🤖👤 ⚠️
- [ ] `main` fast-forwarded from `staging`, `vX.Y.Z` tag pushed
- [ ] Production deploy workflow green
- [ ] Smoke test on production: login, quiz, results, Firestore writes to new project
- [ ] Notifications + Turnstile verified in production
- [ ] **Gate:** error rate / latency normal in monitoring for 30+ min
- [ ] **✅ Phase 10 complete** — verified by ______ on ______

## Phase 11 — Repo rename cleanup 🤖
- [x] Repo + remote already renamed *(pre-verified 2026-06-10: `git remote get-url origin` =
      `…/factory-sync-solutions.git`)*
- [x] Local dir already renamed *(pre-verified 2026-06-10: cwd basename = `factory-sync-solutions`)*
- [ ] Stale path fixed in `.claude/settings.local.json` (1 `factory-health-check` hit remains)
- [ ] Stale `GOOGLE_APPLICATION_CREDENTIALS` path fixed in `apps/fs-backend/.env.development`
- [ ] **Gate:** `make dev` runs; `grep -rn factory-health-check .claude/settings.local.json apps/fs-backend/.env.development` = 0 hits
- [ ] **✅ Phase 11 complete** — verified by ______ on ______

## Phase 12 — Decommission 👤 (after grace period)
- [ ] Old project kept read-only 1–2 weeks
- [ ] No traffic confirmed on old project (logs/metrics flat)
- [ ] Old project billing stopped / project deleted
- [ ] **Gate:** final backup of old project retained before deletion
- [ ] **✅ Phase 12 complete** — verified by ______ on ______

---

## Rollback verification
- [ ] Before Phase 9: `git checkout -- .` reverts the swap; old project still serving
- [ ] After Phase 9: DNS can be repointed back to the old (read-only) project
- [ ] Old project confirmed intact and reachable at each gate up to decommission

*Companion to migrate-to-factory-sync-solutions.md v1.0.0 · Created: 10 June 2026*
