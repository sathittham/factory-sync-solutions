---
isoOutput: SI.O4 / SI.O5
version: 1.0.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Active
---

# Test Plan — Backoffice Upload Utility

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice Upload Utility (`bo-upload-utility`) |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **README Reference** | [README.md](./README.md) |

## 1. Test Scope

### 1.1 In Scope

- `Service.UploadFile`: MIME/size validation per category, key generation,
  R2 upload call, error paths (disabled, unsupported type, oversize, store failure).
- `sanitizeFilename`: path stripping, control-character stripping, length cap, empty/edge inputs.
- `Handler.UploadFile`: missing file and disabled-service HTTP paths.
- `middleware.RateLimitByUID`: burst exhaustion and per-user isolation.
- `UploadUtilityPage`: successful upload renders the result + copy button,
  upload failure shows an error, oversized file is rejected client-side without
  calling the API.

### 1.2 Out of Scope

- Live R2 integration (no emulator in this repo) — `ObjectStore` is faked in
  unit tests; see [docs/product/upload/status.md](../upload/status.md) for the
  same known gap on the avatar path.
- Playwright E2E — `web-backoffice` has no Playwright infra yet (tracked in
  `bo-dashboard-ga4` follow-ups).
- Backend RBAC enforcement of `RequireBackofficeRole` itself — pre-existing,
  covered by `middleware` package tests unrelated to this feature.

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Backend | `cd apps/backend && go test -race -cover ./services/upload/... ./middleware/...` |
| Frontend | `pnpm --filter @repo/web-backoffice test` (Vitest + Testing Library, jsdom) |

## 2. Unit Tests

| ID | Case | File | Status |
|----|------|------|:------:|
| UT-001 | Valid image uploads, returns CDN URL/content type/size, sanitizes filename, calls `PutObject` once with the right bucket/content type | `services/upload/service_test.go` (`TestUploadFile_ValidatesAndUploads`) | ✅ |
| UT-002 | Unsupported content type → `ErrInvalidFileType`, no `PutObject` call | `service_test.go` (`TestUploadFile_RejectsUnsupportedType`) | ✅ |
| UT-003 | Oversize for its category (image > 10MB, even though PDF cap is 50MB) → `ErrFileTooLarge` | `service_test.go` (`TestUploadFile_RejectsOversizeForCategory`) | ✅ |
| UT-004 | Disabled service → `ErrUploadDisabled` | `service_test.go` (`TestUploadFile_Disabled`) | ✅ |
| UT-005 | `ObjectStore.PutObject` failure propagates as an error | `service_test.go` (`TestUploadFile_PutObjectError`) | ✅ |
| UT-006 | `RateLimitByUID` blocks the request after the configured burst is exhausted | `middleware/ratelimit_test.go` (`TestRateLimitByUID_BlocksAfterBurst`) | ✅ |
| UT-007 | `RateLimitByUID` scopes the limiter per UID — one user's limit doesn't block another | `ratelimit_test.go` (`TestRateLimitByUID_ScopedPerUser`) | ✅ |
| UT-008 | `sanitizeFilename` strips directory traversal, control characters, and normalizes empty/dot/slash to `"file"` | `service_test.go` (`TestSanitizeFilename`) | ✅ |
| UT-009 | `sanitizeFilename` caps output at 255 bytes | `service_test.go` (`TestSanitizeFilename_CapsLength`) | ✅ |
| UT-F01 | Choosing a file calls the upload API and renders name/type/size + a "Copy link" button | `src/pages/UploadUtilityPage.test.tsx` | ✅ |
| UT-F02 | API rejection shows the generic error message | `UploadUtilityPage.test.tsx` | ✅ |
| UT-F03 | A file over 50MB is rejected client-side without calling `backofficeApi.uploadFile` | `UploadUtilityPage.test.tsx` | ✅ |

## 2.1 Integration Tests

| ID | Case | File | Status |
|----|------|------|:------:|
| IT-001 | `POST /backoffice/upload/file` with no `file` field → `400 VALIDATION_ERROR` | `services/upload/handler_test.go` (`TestUploadFile_MissingFile`) | ✅ |
| IT-002 | Disabled service → `503 UPLOAD_DISABLED` | `handler_test.go` (`TestUploadFileHandler_Disabled`) | ✅ |

## 3. Manual Verification

| ID | Case | Status |
|----|------|:------:|
| MT-001 | `/api/v1/backoffice/upload/file` returns `403` for a non-backoffice caller and `200` + CDN URL for staff/superadmin | ✅ 4 Jul 2026 (code review of `RequireBackofficeRole` wiring — see NOTE) |
| MT-002 | Sidebar shows a "Utilities" section with "Upload File" for both staff and superadmin; page uploads a real image in dev and the CDN link opens the image | ⬜ pending — needs a live R2-configured environment to click through |

**NOTE (MT-001):** verified by inspection of the route registration
(`r.Route("/backoffice", func(r chi.Router) { r.Use(RequireBackofficeRole(...)); ...; r.Route("/upload", uploadHandler.BackofficeRoutes) })`)
matching the same middleware already protecting `backofficeHandler.Routes` and
`/backoffice/analytics` — not exercised against a live Firebase custom-claims
token. Flag for a manual click-through before the next release (see
[status.md](./status.md) Open Items).

## 4. Regression Gate

- `services/upload` package: 38.7% coverage (`-race`), up from 20.7% before
  this feature — recorded 2026-07-04.
- `middleware` package: 20.3% coverage (`-race`) — new `ratelimit_test.go` was
  the first test file for this package — recorded 2026-07-04.
- Full `@repo/web-backoffice` suite green: 53 tests / 11 files — recorded
  2026-07-04.
- `pnpm --filter @repo/web-backoffice type-check` and Biome clean on all
  changed/added files; `go build ./...`, `go vet ./...` clean.

*Version: 1.0.0*
*Last updated: 4 July 2026*
