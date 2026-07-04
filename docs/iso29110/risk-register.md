---
isoOutput: PM.O1 (Risk Register)
version: 1.2.0
lastUpdated: 2026-07-04
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

---

## Closed Risks

| ID | Risk Description | Closed Date | Resolution |
|---|---|---|---|
| R-C001 | Resend API key exposed in frontend bundle | 2026-03-08 | API key moved to backend only; `.env*` git-ignored |
| R-C002 | In-memory rate limiter ineffective across Cloud Run instances | 2026-03-15 | Cloudflare WAF set as primary; per-instance limiter kept as defense-in-depth |

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
