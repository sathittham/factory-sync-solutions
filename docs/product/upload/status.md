# Status

> Tracks build progress for the Upload Service against [README.md](./README.md). Design
> detail is in [README.md](./README.md), the formal spec in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs. Tick items off as
> they are implemented and merged into `develop`.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Avatar upload](#phase-1--avatar-upload)
- [Phase 2 — Public file uploads](#phase-2--public-file-uploads)
- [Phase 3 — Private file uploads](#phase-3--private-file-uploads)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

**Phase 1 shipped (as of 14 June 2026).** `POST /api/v1/upload/avatar` and
`DELETE /api/v1/upload/avatar` are implemented in `apps/backend/services/upload/`
(`handler.go`, `service.go`, `models.go`, `r2.go`), and `web-app` calls them from
`ProfilePage.tsx` — the Firebase Storage upload path has been removed. Firestore rules
lock `avatarURL` to backend-only writes.

**Phases 2–3 not started.** Presign, confirm, read-url, and general file delete remain
planned; the `uploadSessions` / `uploadRecords` collections, the private and tmp buckets'
wiring, and the tmp-cleanup lifecycle rule + session cleanup job do not exist yet. Legacy
Firebase Storage avatar URLs are still supported during transition (spec Decision 3) — the
one-time migration is deliberately deferred.

Testing is partial: `services/upload/handler_test.go` exists, but there is no
`service_test.go` and no per-feature `test-plan.md` yet.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as each suite lands.

**Unrelated addition, 4 July 2026:** `services/upload/handler.go` also has a
`BackofficeRoutes`/`UploadFile` pair and a `service_test.go` now exists — but
that test file only covers `UploadFile` (the new
[backoffice upload utility](../bo-upload-utility/README.md), CR-008). It does
**not** close the `service_test.go` gap noted above for `UploadAvatar`/`DeleteAvatar`,
which remains open.

---

## Phase 1 — Avatar upload

Profile photo upload works end to end on R2; Firebase Storage dependency removed.

- [x] `r2.go` — R2 client wrapper + env var loading — `apps/backend/services/upload/r2.go`
- [x] `UploadAvatar` — validate → resize 256×256 → WebP → upload to `avatars/{uid}/` — `apps/backend/services/upload/service.go`
- [x] `POST /upload/avatar` + `DELETE /upload/avatar` handlers — `apps/backend/services/upload/handler.go`
- [x] Frontend: `ProfilePage.tsx` migrated from Firebase Storage to `POST /upload/avatar` — `apps/web-app/src/pages/ProfilePage.tsx`
- [x] Firestore rules: `avatarURL` direct-write locked — `firestore.rules`

### Phase 1 Tests

- [x] `services/upload/handler_test.go` — in place
- [ ] `services/upload/service_test.go` — validation, pipeline, and R2 error paths
- [ ] Per-feature `test-plan.md` (copy `docs/iso29110/test-plan-template.md`)

Coverage recorded:

- [ ] `go test ./services/upload/... -cover` → **n/a — not yet recorded**

---

## Phase 2 — Public file uploads

Presign flow + delete: any authenticated user can upload and delete their own public files;
files are immutable and immediately accessible via CDN.

- [ ] `Presign` + `Confirm` for `visibility: "public"` — `apps/backend/services/upload/service.go`
- [ ] `POST /upload/presign` + `POST /upload/confirm` handlers — `apps/backend/services/upload/handler.go`
- [ ] `DeleteFile` for public records (verify `ownerUID` from `uploadRecords/{recordID}`) — `service.go`
- [ ] `DELETE /upload/file` handler — `handler.go`
- [ ] Frontend: presign + confirm + delete flow for images and files
- [ ] `tmp/` R2 lifecycle rule (1-day expiry) + scheduled `uploadSessions` cleanup job

### Phase 2 Tests

- [ ] Table-driven service tests — presign validation (allowlist, size caps), confirm deny paths (403/409/410/422)

---

## Phase 3 — Private file uploads

Project-scoped files; only authorized users can upload, read, or delete them.

- [ ] Extend `Presign` + `Confirm` for `visibility: "private"` with project/resource authorization — `service.go`
- [ ] `ReadURL` — authorization check → presigned GET URL (1 h TTL) — `service.go`
- [ ] `POST /upload/read-url` handler — `handler.go`
- [ ] Extend `DeleteFile` for private records (uploader or project roles `manager` / `system_admin` / `owner`) — `service.go`
- [ ] Frontend: `read-url` call for rendering private files

### Phase 3 Tests

- [ ] Authorization deny paths (403 non-member, 404 missing object) for read-url and private delete

---

## Open Decisions

None — the spec's six design decisions are resolved
([feature-spec.md § Decisions](./feature-spec.md#decisions)). Deferred work is tracked in
[README.md § Open Items & Future Work](./README.md#open-items--future-work).

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [avatar-upload.md](./avatar-upload.md) · [presign-flow.md](./presign-flow.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)
- [bo-upload-utility/status.md](../bo-upload-utility/status.md) — standalone backoffice utility (CR-008), not part of this phase roadmap

---

*Version: 1.1.0*
*Last updated: 4 July 2026*
