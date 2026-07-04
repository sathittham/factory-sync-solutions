# Status

> Tracks build progress for **Backoffice Upload Utility** against
> [`README.md`](./README.md). Requirements are in
> [`feature-spec.md`](./feature-spec.md), test obligations in
> [`test-plan.md`](./test-plan.md).

---

## Current State

Implemented on branch `fix/upload-security-gaps` (2026-07-04, alongside an
unrelated security fix to the avatar upload path — see commit history for the
split): new `POST /api/v1/backoffice/upload/file` endpoint, `Utilities`
sidebar section, and `/utilities/upload` page in `web-backoffice`. Backend
`services/upload` coverage 38.7%, `middleware` 20.3% (both `-race`);
`web-backoffice` 53 tests / 11 files green; type-check and Biome clean. **Not
yet merged to `develop`** — MT-002 (live click-through against a real
R2-configured environment) is still pending.

## Checklist

- [x] `Service.UploadFile` — MIME/size validation, R2 upload, no Firestore record (FR-001).
- [x] `POST /backoffice/upload/file` gated by `RequireBackofficeRole` (FR-002).
- [x] Per-user rate limit via new `middleware.RateLimitByUID` (FR-003).
- [x] `Utilities` sidebar section + `Upload File` item (FR-004).
- [x] `/utilities/upload` page: upload, error states, copy-link, session history (FR-005).
- [x] TH/EN i18n (FR-006).
- [x] Backend unit/integration tests (UT-001…009, IT-001…002) + frontend tests (UT-F01…03).
- [ ] MT-002 — manual click-through against a live R2-configured environment.
- [ ] Merge to `develop`.

## Open Items

| # | Area | Description |
|---|------|-------------|
| 1 | Manual verification | Click through the page against staging once deployed — automated tests use a faked `ObjectStore`, so no test has hit real R2 yet. |
| 2 | Docs cross-reference | [docs/product/upload/README.md](../upload/README.md) and [status.md](../upload/status.md) updated to reference this utility and disambiguate it from Phase 2 — done 2026-07-04. |

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md)
- [docs/iso29110/change-request-log.md](../../iso29110/change-request-log.md) — CR-008
- [Upload Service](../upload/README.md) — the adjacent phased service

*Version: 1.0.0*
*Last updated: 4 July 2026*
