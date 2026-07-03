# Presign Flow (Phases 2–3 — planned)

## Summary

Direct client → R2 upload pipeline for general files (images, PDFs, spreadsheets): the
backend issues a short-lived presigned PUT URL into a tmp bucket, the client uploads
directly (bytes never pass through the backend), and a confirm step verifies and promotes
the object to its final public or private location. Will live in
`apps/backend/services/upload/` alongside the shipped avatar path. **Nothing in this
document is implemented yet.**

## Implementation

Planned contract (full request/response shapes and error tables in
[feature-spec.md § API Design](./feature-spec.md#api-design)):

- `(Service).Presign(ctx, uid, req)` — validates `contentType` against the allowlist and
  `contentLength` against the per-type max (image 10 MB · PDF 50 MB · spreadsheet 25 MB);
  requires `projectID` + project authorization when `visibility = "private"`. Generates
  `recordID` / `fileID` / `storageFilename = {fileID}.{ext}` (raw client filenames are
  sanitized and kept as display metadata only — never in object keys), writes
  `uploadSessions/{sessionID}` to Firestore, and returns a presigned PUT URL to
  `tmp/{sessionID}/{storageFilename}` (15-minute expiry). The PUT URL signs `Content-Type`,
  so the client must send the same header or R2 rejects the upload. `fileURL` is returned
  for public files only.
- `(Service).Confirm(ctx, uid, sessionID)` — loads the session; rejects if missing (404),
  not owned by the caller (403), already confirmed (409), or older than 15 minutes (410).
  Verifies the tmp object with `HeadObject` — `ContentLength` and `ContentType` must match
  the session (422 otherwise). Copies tmp → final bucket/key, deletes the tmp object, marks
  the session confirmed, and writes `uploadRecords/{recordID}`.
- `(Service).ReadURL(ctx, uid, recordID)` — private records only; verifies the caller is
  authorized for the record's `projectID` / `resourceType` / `resourceID` (v1 check:
  `users/{uid}.projectRoles[projectID]`, per spec Decision 4), then issues a presigned GET
  URL with a 1-hour TTL. 404 if the object is missing from R2.
- `(Service).DeleteFile(ctx, uid, recordID)` — public: owner only; private: uploader or
  project roles `manager` / `system_admin` / `owner`. Deletes the R2 object and the
  `uploadRecords` doc; reference cleanup in owning documents stays the calling service's
  job. `recordID` travels as a query parameter (Cloudflare edge proxies can strip DELETE
  bodies).

### Notable behavior

- **Immutable keys, update by reference swap.** Object keys embed the server-generated
  `fileID` and never change; "updating" a file means uploading a replacement and having the
  owning service swap the stored `recordID` (spec Decision 6). This prevents cross-user
  overwrites by guessing `resourceID` + filename.
- **No byte inspection in v1.** Because uploads bypass the backend, there is no magic-byte
  validation here — acceptance is based on declared metadata at presign, re-verified against
  R2 `HeadObject` metadata at confirm.
- **Bucket separation.** Public objects get permanent CDN URLs; private objects live in a
  bucket with no custom domain and no `r2.dev` access — all reads go through `read-url`.
- **Abandoned uploads.** `tmp/` objects expire via a 1-day R2 lifecycle rule; a scheduled
  job cleans stale `uploadSessions` records.

## Configuration

In addition to the shared vars in [avatar-upload.md](./avatar-upload.md#configuration):

| Env var | Description |
|---------|-------------|
| `R2_PRIVATE_BUCKET` | Private bucket (`factory-sync-private-uploads`) — never publicly exposed |
| `R2_TMP_BUCKET` | Pre-confirm staging bucket (`factory-sync-upload-tmp`) — never publicly exposed |

## Usage

```
# pseudocode — client attachment flow (three steps)
1. presign = POST /upload/presign { visibility, projectID?, resourceType, resourceID,
                                    filename, contentType, contentLength }
2. PUT file → presign.uploadURL   (header Content-Type must equal the signed value)
3. confirmed = POST /upload/confirm { sessionID: presign.sessionID }
   → store confirmed.recordID (and confirmed.fileURL for public files) in the owning document

# reading a private file later
readURL = POST /upload/read-url { recordID } → open/render (expires in 1 h)

# deleting
DELETE /upload/file?recordID=…  → 204
```

```
# pseudocode — handler maps sentinel errors to the response envelope
invalid input                      → 400 VALIDATION_ERROR
not authorized for project/record  → 403 FORBIDDEN
session/record/object missing      → 404 NOT_FOUND
session already confirmed          → 409 CONFLICT
session expired (> 15 min)         → 410 GONE
tmp object missing / metadata off  → 422 UPLOAD_INCOMPLETE
```

## Acceptance Criteria

- Given an allowlisted type within its size cap, when presign is called, then a session + 15-minute PUT URL is returned; unsupported type or oversize → `400 VALIDATION_ERROR`.
- Given `visibility: "private"` without authorization for `projectID`, when presign is called, then `403 FORBIDDEN`.
- Given a caller who is not the session owner, when confirm is called, then `403`; re-confirm → `409`; after 15 minutes → `410`; tmp object missing or metadata mismatch → `422 UPLOAD_INCOMPLETE`.
- Given a confirmed public file, then its permanent CDN `fileURL` serves without auth; a confirmed private file has no CDN URL and `read-url` returns a 1-hour presigned GET only to authorized callers.
- Given a delete by a non-owner (public) or a member without a permitted role (private), then `403` and nothing is deleted.

## Status

All ❌ not started — mirrors [status.md](./status.md) Phases 2–3.

- [ ] `Presign` + `Confirm` (public) — `apps/backend/services/upload/service.go` + `handler.go`
- [ ] `DeleteFile` (public) + `DELETE /upload/file`
- [ ] Private presign/confirm with project authorization
- [ ] `ReadURL` + `POST /upload/read-url`
- [ ] `uploadSessions` / `uploadRecords` collections + tmp lifecycle rule + session cleanup job
- [ ] Frontend attachment flow (presign → PUT → confirm; read-url rendering)
- [ ] Table-driven tests for all deny paths (400/403/404/409/410/422)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
