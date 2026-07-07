# Status

> Tracks build progress for **Backoffice Upload Utility** against
> [`README.md`](./README.md). Requirements are in
> [`feature-spec.md`](./feature-spec.md), test obligations in
> [`test-plan.md`](./test-plan.md).

---

## Current State

Merged to `develop` 2026-07-04 (PR #40 — security fix — then PR #42 — this
feature, rebased on top). Backend `services/upload` coverage 38.7%,
`middleware` 20.3% (both `-race`); `web-backoffice` 53 tests / 11 files green;
type-check and Biome clean.

While verifying MT-002 against real R2, found that `R2_ACCOUNT_ID` /
`R2_ACCESS_KEY_ID` / `R2_ACCESS_KEY_SECRET` were never configured in GitHub
Actions secrets/variables, despite being referenced by both deploy workflows —
a pre-existing gap (see [risk register](../../iso29110/risk-register.md))
that has likely disabled the entire upload service, including avatar upload,
on deployed staging/production since Phase 1 shipped. Fixed 2026-07-04: valid
R2 credentials issued and added to GitHub Actions + local `.env.development`;
re-verified `Service.UploadFile` against the real staging bucket
(`uploads-factorysyncsolutions-com-staging`) — upload succeeded, CDN URL
served the file, test object cleaned up via `wrangler r2 object delete`.

**Still open:** the live Cloud Run staging/production services won't pick up
the new secrets until their next deploy (next `v*-staging`/`v*.*.*` tag).
MT-003 (full browser click-through as a signed-in staff user) is also still
pending — needs a live staff login.

## Checklist

- [x] `Service.UploadFile` — MIME/size validation, R2 upload, no Firestore record (FR-001).
- [x] `POST /backoffice/upload/file` gated by `RequireBackofficeRole` (FR-002).
- [x] Per-user rate limit via new `middleware.RateLimitByUID` (FR-003).
- [x] `Utilities` sidebar section + `Upload File` item (FR-004).
- [x] `/utilities/upload` page: upload, error states, copy-link, session history (FR-005).
- [x] TH/EN i18n (FR-006).
- [x] Backend unit/integration tests (UT-001…009, IT-001…002) + frontend tests (UT-F01…03).
- [x] MT-002 — verified `Service.UploadFile` against the real staging R2 bucket.
- [x] Merge to `develop` (PR #40, #42).
- [ ] MT-003 — full browser click-through as a signed-in staff/superadmin user.
- [ ] Redeploy staging/production so the live services pick up the new R2 secrets.

## Open Items

| # | Area | Description |
|---|------|-------------|
| 1 | Manual verification | MT-003 — click through the page as a signed-in staff user once staging is redeployed with the new R2 secrets. |
| 2 | Docs cross-reference | [docs/product/upload/README.md](../upload/README.md) and [status.md](../upload/status.md) updated to reference this utility and disambiguate it from Phase 2 — done 2026-07-04. |
| 3 | Infra | R2 credentials missing from GitHub Actions secrets/variables (pre-existing, found while verifying MT-002) — fixed 2026-07-04; staging/production redeploy still needed to take effect. |

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) — CR-008
- [Upload Service](../upload/README.md) — the adjacent phased service

*Version: 1.1.0*
*Last updated: 4 July 2026*
