---
isoOutput: SI.O1
version: 1.0.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Implemented
---

# Software Requirements Specification — Backoffice Upload Utility

*ISO 29110 Basic Profile · SI.O1*

> A new **Utilities** section in `web-backoffice` with an **Upload File** page:
> staff/superadmin pick an image, PDF, or spreadsheet and get back a permanent
> CDN URL to copy — e.g. for pasting an image link into CMS content or sharing
> a document. This is a standalone utility, **not** the Phase 2 presign/confirm
> flow described in [docs/product/upload/feature-spec.md](../upload/feature-spec.md)
> — see [§1.3 Relationship to the Upload Service roadmap](#13-relationship-to-the-upload-service-roadmap).

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice Upload Utility (`bo-upload-utility`) |
| **Version** | 1.0.0 |
| **Status** | Implemented |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | 2026-07-04 |

---

## 1. Introduction

### 1.1 Purpose

Backoffice staff had no way to get a hosted URL for an ad-hoc image or document
(e.g. an image to paste into a CMS article, or a PDF to link from a project
note) without going through an external tool. This feature adds a small,
self-contained upload utility to `web-backoffice`.

### 1.2 Scope

- **In scope:** new `POST /api/v1/backoffice/upload/file` backend endpoint
  (staff/superadmin only), a new `Utilities` sidebar section, and an
  `/utilities/upload` page in `web-backoffice`.
- **Out of scope:** presigned direct-to-R2 uploads, `uploadSessions` /
  `uploadRecords` Firestore records, resource-scoped attachments, private
  files, and any change to the existing avatar upload path.

### 1.3 Relationship to the Upload Service roadmap

`docs/product/upload/` documents a phased Upload Service: Phase 1 (avatar,
shipped), Phase 2 (public presign/confirm, planned), Phase 3 (private files,
planned). This utility is a **separate, simpler code path** added alongside
that service in the same Go package
(`apps/backend/services/upload/`) — it uploads directly through the backend
(no presign step, no tmp bucket, no Firestore record) and is gated to
backoffice staff only, unlike the public-facing Phase 2 design. It does not
advance or replace Phase 2/3; those remain planned as documented in
[docs/product/upload/status.md](../upload/status.md). Building it this way
(reusing the existing `Service`/`ObjectStore`/MIME-allowlist plumbing but with
its own handler and no Firestore write) avoided a large presign/confirm build
for a low-stakes internal tool.

## 2. Functional Requirements

| ID | Requirement | Status |
|----|-------------|:------:|
| FR-001 | `POST /api/v1/backoffice/upload/file` accepts a `multipart/form-data` file, validates its content type by magic bytes against an allowlist (general image ≤10MB, PDF ≤50MB, spreadsheet ≤25MB — same limits as `docs/product/upload/feature-spec.md` § MIME Type Allowlist), uploads it unmodified to the public R2 bucket under `uploads/{fileID}/{fileID}{ext}`, and returns `{ fileURL, originalFilename, contentType, fileSizeBytes }`. No Firestore record is written. | ✅ |
| FR-002 | The endpoint is mounted under `/api/v1/backoffice/upload` and gated by the existing `RequireBackofficeRole(authClient, "superadmin", "staff")` middleware — same access class as other `/backoffice/*` routes. | ✅ |
| FR-003 | The endpoint is rate-limited per user (20/min) via a new `middleware.RateLimitByUID`, layered on the existing global per-IP limiter. | ✅ |
| FR-004 | `web-backoffice` gets a new **Utilities** sidebar section (visible to all backoffice users, not superadmin-gated) containing an **Upload File** item routed to `/utilities/upload`. | ✅ |
| FR-005 | The `/utilities/upload` page lets a user choose a file, shows upload progress/errors, and on success displays the file's name, type, size, and a "Copy link" button for the CDN URL. Multiple uploads in one session are listed newest-first. | ✅ |
| FR-006 | All new UI text is localized via `useLocale()` (`nav.utilities`, `nav.uploadTool`, `uploadUtility.*` — TH/EN). | ✅ |

## 3. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-001 | Object keys use a server-generated `fileID` (UUID) — the client-supplied filename is sanitized (control characters and path components stripped, capped at 255 bytes) and returned only as display metadata, never used in the R2 key. |
| NFR-002 | Uploaded objects get an immutable, long-lived cache header (`public, max-age=31536000, immutable`) since the key is content-addressed and never overwritten — unlike the avatar path, which reuses one key per user. |
| NFR-003 | The endpoint reuses the existing `upload.Service`/`ObjectStore` abstraction and `ensureStoreConfigured` check — no new Firestore dependency, so it can be unit-tested with a fake `ObjectStore` (no emulator needed). |

## 4. Traceability

| Requirement | Implementation | Test |
|-------------|----------------|------|
| FR-001 | `apps/backend/services/upload/service.go` (`UploadFile`), `models.go` | UT-001…UT-005 in [test-plan.md](./test-plan.md) |
| FR-002 | `apps/backend/main.go` (`/backoffice/upload` route group) | manual (MT-001) |
| FR-003 | `apps/backend/middleware/ratelimit.go` (`RateLimitByUID`) | UT-006, UT-007 |
| FR-004 | `apps/web-backoffice/src/components/Sidebar.tsx` | manual (MT-002) |
| FR-005 | `apps/web-backoffice/src/pages/UploadUtilityPage.tsx` | UT-F01…UT-F03 |
| FR-006 | `apps/web-backoffice/src/lib/i18n.tsx` | manual (MT-002) |

*Version: 1.0.0*
*Last updated: 4 July 2026*
