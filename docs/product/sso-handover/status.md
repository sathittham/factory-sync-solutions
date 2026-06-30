# Status

> Tracks build progress for the **Backoffice → CMS SSO Handover** feature against
> [README.md § Summary](./README.md#summary). Design detail is in [README.md](./README.md),
> requirements in [feature-spec.md](./feature-spec.md), and the per-app flows in
> [user-journeys.md](./user-journeys.md). Tick items off as they merge into `develop`.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Handover (shipped)](#phase-1--handover-shipped)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

✅ **Handover is implemented end to end on `feature/web-cms-sonicjs`.** A signed-in
web-backoffice user clicks **Blog**, a new tab posts their Firebase ID token to the CMS
`/sso/handover`, and they land authenticated on the CMS `/admin` — `superadmin`→`admin`,
`staff`→`editor`, everyone else `403`.

Both interception points are wired: the `beforeAuth` handover middleware (CSRF-exempt by design)
and the `afterAuth` `auth-token-bridge` that lets the legacy `auth_token` satisfy SonicJS
beta.20's better-auth `/admin` guard. User provisioning into `auth_user` + `rbac_user_roles` is
idempotent.

⚠️ **Operational caveat:** the CMS `auth_user` schema patch
([0001_auth_user_authfields.sql](../../../apps/web-cms/patches/0001_auth_user_authfields.sql))
must be applied per database (local/staging/prod) or every user INSERT fails. It is applied
out-of-band because `migrations_dir` points at `node_modules`.

📝 **Testing:** only the pure helpers (`mapCmsRole`, `splitName`) have unit coverage today; the
full `handleHandover` path (verify → upsert → RBAC → cookie) has no integration test yet.

---

## Phase 1 — Handover (shipped)

End-to-end backoffice → CMS single sign-on.

- [x] `web-backoffice/src/lib/cmsSso.ts` — `openCmsBlog` top-level form POST of the ID token
- [x] `web-backoffice/src/components/Sidebar.tsx` — Blog menu item triggers handover
- [x] `packages/shared/lib/cmsSite.ts` — `getCmsSsoUrl` / `getCmsAdminUrl` per-env URL resolution
- [x] `web-cms/src/sso/firebase-verify.ts` — RS256 JWKS verification of the Firebase ID token
- [x] `web-cms/src/sso/handover.ts` — `mapCmsRole` → `upsertUser` → RBAC assign → mint `auth_token`
- [x] `web-cms/src/sso/middleware.ts` — `beforeAuth` route mount, CSRF-exempt
- [x] `web-cms/src/sso/auth-token-bridge.ts` — `afterAuth` legacy-token → `c.get('user')` bridge
- [x] `web-cms/src/index.ts` — wire `beforeAuth` / `afterAuth`
- [x] `web-cms/wrangler.toml` + `web-backoffice/.env.example` — `FIREBASE_PROJECT_ID`, `VITE_CMS_URL`
- [x] `web-cms/patches/0001_auth_user_authfields.sql` — D1 schema reconciliation patch

### Phase 1 Tests

- [x] `web-cms/src/sso/handover.test.ts` — `mapCmsRole` mapping + `splitName` fallback
- [ ] Integration test for `handleHandover` (mocked JWKS + D1): verify → upsert → RBAC → cookie
- [ ] Deny-path coverage: invalid token → `/auth/login`; non-backoffice role → `403`; missing config → `500`

---

## Open Decisions

Mirrors [README.md § Open Items](./README.md#open-items--future-work); resolve and tick off as each lands.

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Role revocation does not kill a live CMS session | **Open**: relies on `auth_token` expiry; consider shorter TTL or a revocation check |
| 2 | `auth_user` schema patch is out-of-band | **Open**: remove once `@sonicjs-cms/core` ships the columns in its own migration |
| 3 | No full-path integration test | **Open**: add a mocked-JWKS + D1 test for `handleHandover` |

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [user-journeys.md](./user-journeys.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 30 June 2026*
