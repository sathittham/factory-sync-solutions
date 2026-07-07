---
isoOutput: PM.O1 (Risk Register)
version: 1.4.0
lastUpdated: 2026-07-07
author: Sathittham Sangthong
---

# Risk Register — FactorySync Solutions

*ISO 29110 Basic Profile · PM.O1 component*

Review at every progress meeting. Add new risks immediately when identified. Close risks when resolved.

**Probability:** L = Low (< 20%) · M = Medium (20–50%) · H = High (> 50%)
**Impact:** L = Low (minor delay) · M = Medium (feature scope change) · H = High (release blocked)
**Exposure = Probability × Impact:** LL/LM = Watch · LH/ML/MM = Monitor · MH/HL/HM/HH = Mitigate now

---

## Active Risks

| ID | Risk Description | Prob | Impact | Exposure | Mitigation Plan | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-001 | Firebase Auth / Firestore free-tier quota exceeded under load | L | H | Monitor | Monitor Firebase console; add budget alert; design for graceful degradation | Sathittham | Open |
| R-002 | Cloud Run cold-start latency degrades UX on first request | M | M | Monitor | Keep binary small; consider minimum instances = 1 on staging | Sathittham | Open |
| R-003 | Firestore security rules misconfiguration allows unauthorised reads | L | H | Monitor | Rules unit-tested via Firebase emulator; reviewed on every rules change | Sathittham | Open |
| R-004 | Quiz JSON config introduces breaking change to scoring engine | L | H | Monitor | Version field in each JSON; scoring service has 96% test coverage | Sathittham | Open |
| R-005 | Single developer — bus-factor = 1, knowledge silo | H | H | Mitigate | All decisions documented in ADRs; CLAUDE.md rules encode conventions; backoffice README covers setup | Sathittham | Open |
| R-006 | Cloudflare Pages deploy fails silently (wrong env vars) | M | M | Monitor | Smoke-test workflow (`deploy-smoke-test.js`) verifies URLs post-deploy | Sathittham | Open |
| R-007 | ISO 29110 artifact maintenance becomes overhead | M | M | Monitor | Templates pre-filled; artifacts map to existing docs where possible; `dev-process.md` enforces habit | Sathittham | Open |
| R-008 | Backoffice claim (`backofficeRole`) misconfigured in Firebase | L | H | Monitor | Claims set by backend superadmin staff endpoints only; BackofficeGuard + SuperAdminGuard on all routes | Sathittham | Open |
| R-009 | `web-app` server-state migration (TanStack Query, CR-003) regresses data freshness or an auth-gated data flow | L | M | Monitor | Vitest 80/80 + tsc gate before each promotion; staging smoke test before prod; `staleTime` 30s / `retry` 1 conservative defaults; Phase 2 (profile reads) deferred until auth flows can be e2e-verified with live Firebase | Sathittham | Open |
| R-010 | GA4 Data API dependency for backoffice analytics — quota exhaustion, upstream outage, or SA key/permission drift breaks the dashboard | L | M | Monitor | 15m TTL cache + stale-while-error keeps last data on outage (cold cache degrades to 503, rest of backoffice unaffected); per-env SA keys in Secret Manager; dashboard read-only aggregate data | Sathittham | Open |
| R-011 | Same root cause as R-C003, different credentials: `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_ACCESS_KEY_SECRET` (referenced by both `deploy-staging.yml` and `deploy-production.yml` for the main upload service) were never configured as GitHub Actions secrets/variables — since `gcloud run deploy --set-env-vars` replaces the whole env var set on every deploy, this has likely disabled all upload endpoints (avatar upload + the new backoffice utility, `503 UPLOAD_DISABLED`) on deployed staging/production since Phase 1 shipped | H | H | Mitigate now | Found 2026-07-04 while verifying `bo-upload-utility` MT-002. Valid R2 API token issued; `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_ACCESS_KEY_SECRET` added to GitHub Actions and local `.env.development`; re-verified `Service.UploadFile` against the real staging bucket (upload + CDN serve confirmed, test object cleaned up). Still needs a staging/production redeploy to take effect on the live services — track alongside R-C003 as a candidate for a standing pre-deploy check that all `${{ secrets.* }}`/`${{ vars.* }}` referenced in deploy workflows actually exist in the repo | Sathittham | Open |
| R-012 | Chatbot (CR-004) gives wrong/hallucinated answers to customers (pricing, commitments) | M | M | Monitor | Grounded system prompt from versioned knowledge file; instructed to decline out-of-scope + offer escalation; `escalate_to_human` tool; transcripts reviewable in backoffice | Sathittham | Open |
| R-013 | Vertex AI (Gemini) cost blowout from chat abuse on the public site | M | M | Monitor | Turnstile on conversation creation; per-conversation rate limit (10 msg/min); `max_tokens` 1024; Gemini Flash tier only; GCP budget alert on the project (personal-account ownership — verify alerts are watched) | Sathittham | Open |
| R-014 | Chat transcripts accumulate customer PII (names, contacts, business details) | L | H | Monitor | Firestore rules backend-only for `conversations`; access via role-gated API; Slack alerts carry preview only, not full transcript; retention policy to define before Phase 3 (anonymous visitors) | Sathittham | Open |
| R-015 | Third-party channel dependency (LINE / Slack API outage or breaking change) | L | M | Watch | Adapters isolated behind interface; delivery fire-and-forget with one retry + logging; web channel unaffected by LINE/Slack outages | Sathittham | Open |

---

## Closed Risks

| ID | Risk Description | Closed Date | Resolution |
|---|---|---|---|
| R-C001 | Resend API key exposed in frontend bundle | 2026-03-08 | API key moved to backend only; `.env*` git-ignored |
| R-C002 | In-memory rate limiter ineffective across Cloud Run instances | 2026-03-15 | Cloudflare WAF set as primary; per-instance limiter kept as defense-in-depth |
| R-C003 | Backoffice API docs feature returned 503 in production/staging — `R2_ACCESS_KEY_ID`/`API_DOCS_R2_*` credentials were never provisioned as GitHub environment secrets; once fixed, endpoints returned 404 because `scripts/publish-api-docs-r2.sh` called `wrangler r2 object put/get` without `--remote`, so CI's publish *and* its own verification step silently targeted wrangler's local simulator instead of the real bucket while reporting success | 2026-07-04 | Generated scoped R2 API tokens, wired as environment-level secrets (staging/production) since tokens are bucket-scoped; added `--remote` to the wrangler calls (PR #38); manually republished current swagger docs to both buckets to restore service immediately ahead of the next scheduled deploy |

---

## How to Add a Risk

Copy this row template into the Active Risks table:

```
| R-NNN | [describe risk] | L/M/H | L/M/H | Watch/Monitor/Mitigate | [plan] | [owner] | Open |
```

Assign the next sequential ID (check closed risks too). Update the `lastUpdated` frontmatter.

---

## Review History

| Date | Reviewer | Notes |
|---|---|---|
| 2026-07-02 | Sathittham Sangthong | v0.13.0 release review. All 8 prior risks re-confirmed Open with mitigations current; no scores changed. Added R-009 (server-state migration regression, L×M → Monitor). No High/Critical open risks require escalation beyond R-005 (bus-factor, already Mitigate). |
| 2026-07-04 | Sathittham Sangthong | v0.14.0 release review. All 9 prior risks re-confirmed Open, mitigations current; no scores changed. Added R-010 (GA4 Data API dependency, L×M → Monitor) — mitigated by TTL cache + stale-while-error + graceful 503. GA4 credentials handled per-env via Secret Manager (never in git or workflow strings). |
| 2026-07-04 | Sathittham Sangthong | Added R-011 (H×H → Mitigate now) while verifying the `bo-upload-utility` feature: `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_ACCESS_KEY_SECRET` were missing from GitHub Actions, disabling all upload endpoints on deployed staging/production since Phase 1. Credentials fixed same day; redeploy still pending to take effect live. Same root-cause class as R-C003 — worth a follow-up: a CI check that every `${{ secrets.* }}`/`${{ vars.* }}` referenced in deploy workflows actually exists in the repo, so this class of gap surfaces at PR time instead of silently at runtime. |
| 2026-07-07 | Sathittham Sangthong | Added R-012–R-015 (AI chatbot, CR-004) on merge of `feature/chatbot-core` Phase 1: hallucinated answers (M×M → Monitor), Vertex/Gemini cost blowout (M×M → Monitor), transcript PII (L×H → Monitor), third-party channel dependency (L×M → Watch). Renumbered from the branch's original R-010–R-013 to avoid collision with R-010 (GA4) / R-011 (R2 credentials) already merged to develop. |
