---
version: 1.4.3
lastUpdated: 2026-06-14
author: Sathittham Sangthong
status: Partially implemented - Phase 1 complete
---

# Upload Service — Feature Spec

General-purpose file and image upload service backed by **Cloudflare R2** (S3-compatible object storage). Phase 1 avatar upload is implemented; later phases define a unified upload pipeline for general public/private files.

**Current implementation status (14 June 2026):** `POST /api/v1/upload/avatar` and `DELETE /api/v1/upload/avatar` are implemented in `apps/fs-backend/services/upload/`, and `fs-app-web` calls those endpoints from `ProfilePage.tsx`. Presign, confirm, read-url, and general file delete flows remain planned.

---

## Goals

- Single upload endpoint that handles all file types (images, PDFs, spreadsheets, etc.)
- **Full CRUD for images** — create (upload), read (CDN or signed URL), update (upload replacement + swap reference), delete (by `recordID`)
- Image processing pipeline: resize, format conversion (WebP, JPEG, PNG), thumbnail generation
- Presigned URLs for direct client → R2 uploads (bypasses backend for large files)
- CDN delivery via Cloudflare (R2 custom domain + cache)
- Per-user/per-resource scoped storage paths
- File size and MIME type validation enforced server-side for avatar uploads; presigned uploads are validated before URL issuance and verified with R2 metadata on confirm
- **Public visibility** — files accessible to anyone via CDN URL (no auth)
- **Private visibility** — files scoped to a project; time-limited read URLs issued by the backend after project/resource authorization

---

## Non-Goals (v1)

- Video transcoding
- Multi-part uploads (files > 100 MB)
- Real-time upload progress via WebSocket (polling is fine)

---

## Storage: Cloudflare R2

Cloudflare R2 is S3-compatible, has zero egress fees, and integrates with Cloudflare's CDN natively.

### Bucket layout

```
r2://factory-sync-public-uploads/                                # public bucket: custom domain enabled
├── avatars/{userUID}/profile.webp                               # semi-public: CDN-served, URL is opaque but not secret
└── public/{resourceType}/{resourceID}/{fileID}/{storageFilename} # public: CDN direct access, no auth

r2://factory-sync-private-uploads/                               # private bucket: no custom domain, no r2.dev public access
└── private/{projectID}/{resourceType}/{resourceID}/{fileID}/{storageFilename}

r2://factory-sync-upload-tmp/                                    # tmp bucket: no custom domain, no r2.dev public access
└── tmp/{sessionID}/{storageFilename}                            # short-lived pre-confirm uploads
```

- Public and private objects **must not share the same public R2 bucket**. Enabling a public custom domain exposes bucket objects directly, so private bytes live in a separate non-public bucket.
- `avatars/` objects are served directly via the CDN custom domain. The URL is opaque (contains `uid`) but not access-controlled — anyone with the URL can load the image. This matches how Slack, GitHub, and similar apps handle profile photos.
- `public/` objects are served directly via the CDN custom domain — permanent URLs, no auth.
- `private/` objects are **never** served via the CDN domain. Clients obtain a time-limited presigned GET URL from `POST /upload/read-url`; the backend enforces project/resource authorization before issuing it.
- `tmp/` cleanup: configure an R2 object lifecycle rule for `tmp/` objects with a 1-day expiration. Also run a scheduled cleanup job for Firestore `uploadSessions` records so abandoned sessions do not accumulate.

### Environment variables

```env
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_ACCESS_KEY_SECRET=<r2-secret>
R2_PUBLIC_BUCKET=uploads-factorysyncsolutions-com-staging   # staging
# R2_PUBLIC_BUCKET=uploads-factorysyncsolutions-com          # production
R2_PRIVATE_BUCKET=factory-sync-private-uploads
R2_TMP_BUCKET=factory-sync-upload-tmp
R2_PUBLIC_BASE_URL=https://uploads-staging.factorysyncsolutions.com   # staging custom domain
# R2_PUBLIC_BASE_URL=https://uploads.factorysyncsolutions.com         # production custom domain
```

The S3 API endpoint is derived by the backend from `R2_ACCOUNT_ID` as `https://{accountID}.r2.cloudflarestorage.com`. Do not use the S3 API bucket URL as `R2_PUBLIC_BASE_URL`; that value must be a public delivery origin such as the R2 custom domain or public `r2.dev` URL.

---

## API Design

### CRUD operation map

| Operation | Avatar | General image / file |
|-----------|--------|---------------------|
| **Create** | `POST /upload/avatar` | `POST /upload/presign` → PUT → `POST /upload/confirm` |
| **Read** | `avatarURL` from Firestore — CDN direct (no auth) | CDN URL (public) · `POST /upload/read-url` (private) |
| **Update** | `POST /upload/avatar` (always overwrites) | Upload a new immutable file and update the owning service reference |
| **Delete** | `DELETE /upload/avatar` | `DELETE /upload/file?recordID=...` |

For general files, object keys are immutable and include a server-generated `fileID`. Updating an attachment means uploading a replacement and having the owning service swap its reference from the old `recordID` to the new `recordID`. This avoids cross-user overwrites and keeps R2 writes authorization-safe.

---

### 1. `POST /api/v1/upload/avatar`

Upload or replace the caller's avatar. Returns the CDN URL.

**Request:** `multipart/form-data`

| Field | Type | Constraint |
|-------|------|-----------|
| `file` | binary | JPEG/PNG/WebP/GIF, ≤ 2 MB |

**Processing pipeline:**
1. Validate MIME type + size
2. Resize to 256 × 256 px (center-crop)
3. Convert to WebP (quality 85)
4. Upload to `avatars/{uid}/profile.webp`
5. Store CDN URL in `users/{uid}.avatarURL` in Firestore

**Response `200`:**
```json
{ "success": true, "data": { "avatarURL": "https://uploads.factorysync.com/avatars/{uid}/profile.webp", "contentType": "image/webp", "fileSizeBytes": 18432 } }
```

---

### 2. `DELETE /api/v1/upload/avatar`

Remove the caller's avatar from R2 and clear `avatarURL` in Firestore.

**Response:** `204 No Content`

---

### 3. `POST /api/v1/upload/presign`

Returns a presigned PUT URL for direct client → R2 upload (large files, avoiding backend proxy).

**Request body:**
```json
{
  "visibility": "private",
  "projectID": "0123456789012",
  "resourceType": "attachment",
  "resourceID": "assessment-123",
  "filename": "report.pdf",
  "contentType": "application/pdf",
  "contentLength": 512000
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `visibility` | yes | `"public"` or `"private"` |
| `projectID` | when `visibility = "private"` | Caller must be authorized for this project/resource |
| `resourceType` | yes | `"attachment"` (only type supported in v1) |
| `resourceID` | yes | e.g. `"assessment-123"` |
| `filename` | yes | Original client filename; stored as display metadata only |
| `contentType` | yes | must be in the allowlist |
| `contentLength` | yes | Must be within the max size for `contentType` |

**Validation:**
- `contentType` must be in the allowlist (see below)
- `contentLength` must be within the max size for the requested `contentType` before URL issuance. Browser clients cannot manually set `Content-Length`, so the backend must verify the uploaded object's actual `ContentLength` with `HeadObject` during confirm.
- The presigned PUT URL signs `Content-Type`; the browser must send the same `Content-Type` header when uploading or R2 returns `SignatureDoesNotMatch`.
- `resourceType` must be `"attachment"` (only resource type supported in v1)
- `projectID` required and caller must be authorized when `visibility = "private"`
- `filename` is preserved as `originalFilename` for display/download metadata, after removing control characters and limiting to 255 bytes.
- R2 object keys never use the raw client filename. The backend derives `storageFilename = {fileID}.{extension}` from the allowed MIME type, then stores the original name separately. This prevents path traversal, Unicode normalization, duplicate filename, cache, and URL-encoding bugs.

**Response `200` — public file:**
```json
{
  "success": true,
  "data": {
    "sessionID": "a1b2c3d4-...",
    "recordID": "f7d33e62-...",
    "fileID": "f7d33e62-...",
    "originalFilename": "report.pdf",
    "storageFilename": "f7d33e62-....pdf",
    "contentType": "application/pdf",
    "fileSizeBytes": 512000,
    "uploadURL": "https://...(presigned PUT URL to tmp/{sessionID}/f7d33e62-....pdf, expires 15 min)",
    "fileKey": "public/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "fileURL": "https://uploads.factorysync.com/public/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "expiresAt": "2026-06-13T15:00:00Z"
  }
}
```

**Response `200` — private file:**
```json
{
  "success": true,
  "data": {
    "sessionID": "a1b2c3d4-...",
    "recordID": "f7d33e62-...",
    "fileID": "f7d33e62-...",
    "originalFilename": "report.pdf",
    "storageFilename": "f7d33e62-....pdf",
    "contentType": "application/pdf",
    "fileSizeBytes": 512000,
    "uploadURL": "https://...(presigned PUT URL to tmp/{sessionID}/f7d33e62-....pdf, expires 15 min)",
    "fileKey": "private/0123456789012/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "expiresAt": "2026-06-13T15:00:00Z"
  }
}
```

`fileURL` is **omitted** for private files — use `recordID` with `POST /upload/read-url` to obtain a time-limited read URL after upload is confirmed. Store `recordID` in owning service documents (e.g. an assessment's `attachments` array via a trusted write path). `fileKey` is returned for backend diagnostics and should not be trusted as an authorization primitive.

On presign, the backend generates `recordID`/`fileID`/`storageFilename`, writes a session record to `uploadSessions/{sessionID}` in Firestore (see Firestore Data Model), and returns a presigned PUT URL targeting `tmp/{sessionID}/{storageFilename}` in the tmp bucket. Client uploads directly to R2, then calls `POST /api/v1/upload/confirm` with the `sessionID` to move from `tmp/` to the final bucket/path.

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing required field, unsupported MIME type, `contentLength` exceeds the per-type max size, invalid filename |
| 401 | `UNAUTHORIZED` | Missing or invalid Firebase token |
| 403 | `FORBIDDEN` | Caller not authorized for `projectID` / `resourceID` |

---

### 4. `POST /api/v1/upload/confirm`

Confirm a presigned upload is complete. Backend looks up the `uploadSessions/{sessionID}` Firestore record, verifies `ownerUID == callerUID`, validates the tmp object's R2 metadata, copies the R2 object from `tmp/{sessionID}/{storageFilename}` to `finalKey`, deletes the tmp object, marks the session `isConfirmed: true`, and writes an `uploadRecords/{recordID}` document.

**Request body:**
```json
{ "sessionID": "a1b2c3d4-..." }
```

**Validation:**
- Session must exist in `uploadSessions` and not yet confirmed
- `callerUID` must match `session.ownerUID` — prevents session hijacking
- Session must not be expired (`createdAt` ≤ 15 min ago)
- `HeadObject(tmpKey)` must exist in the tmp bucket
- Uploaded object `ContentLength` must equal the session `fileSizeBytes`
- Uploaded object `ContentType` must equal the session `contentType`

**Response `200` — public file:**
```json
{
  "success": true,
  "data": {
    "recordID": "f7d33e62-...",
    "fileKey": "public/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "fileURL": "https://uploads.factorysync.com/public/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "originalFilename": "report.pdf",
    "storageFilename": "f7d33e62-....pdf",
    "contentType": "application/pdf",
    "fileSizeBytes": 512000
  }
}
```

**Response `200` — private file:**
```json
{
  "success": true,
  "data": {
    "recordID": "f7d33e62-...",
    "fileKey": "private/0123456789012/attachment/assessment-123/f7d33e62-.../f7d33e62-....pdf",
    "originalFilename": "report.pdf",
    "storageFilename": "f7d33e62-....pdf",
    "contentType": "application/pdf",
    "fileSizeBytes": 512000
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 404 | `NOT_FOUND` | Session does not exist |
| 403 | `FORBIDDEN` | Caller is not the session owner |
| 409 | `CONFLICT` | Session already confirmed |
| 410 | `GONE` | Session expired (> 15 min) |
| 422 | `UPLOAD_INCOMPLETE` | Tmp object is missing or metadata does not match the session |

---

### 5. `POST /api/v1/upload/read-url`

Issue a time-limited presigned GET URL for a **private** file. Caller must be authorized for the project/resource attached to the upload record.

**Request body:**
```json
{ "recordID": "f7d33e62-..." }
```

**Validation:**
- `recordID` must identify an `uploadRecords/{recordID}` document
- Record `visibility` must be `"private"`
- Verify caller is authorized for `record.projectID`, `record.resourceType`, and `record.resourceID`
- File must exist in R2 (returns `404` if not)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "readURL": "https://...(presigned GET URL, expires 1 hour)",
    "originalFilename": "report.pdf",
    "contentType": "application/pdf",
    "fileSizeBytes": 512000,
    "expiresAt": "2026-06-13T16:00:00Z"
  }
}
```

**Errors:**

| Status | Code | Condition |
|--------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid `recordID` |
| 403 | `FORBIDDEN` | Caller not authorized for the record's project/resource |
| 404 | `NOT_FOUND` | Object does not exist in R2 |

---

### 6. `DELETE /api/v1/upload/file`

Delete any file uploaded via the presign flow (images, PDFs, spreadsheets). Use `DELETE /upload/avatar` for profile photos.

**Query parameter:** `?recordID=f7d33e62-...`

Using a query parameter rather than a request body avoids compatibility issues with Cloudflare edge proxies that strip DELETE bodies.

**Authorization:**
- `public` record — `uploadRecords/{recordID}.ownerUID` must match the caller
- `private` record — caller must be authorized for `record.projectID`, `record.resourceType`, and `record.resourceID`; v1 delete permission should be limited to the uploader or project roles `manager`, `system_admin`, and `owner`

**Response:** `204 No Content`

The backend deletes the R2 object and removes the `uploadRecords/{recordID}` Firestore document. Any references stored in other service documents (e.g. an assessment's `attachments` array) must be cleaned up by the calling service — the upload service owns only `uploadRecords`.

---

## Image Processing

**Scope:** image processing and magic-byte MIME validation apply **only to `POST /upload/avatar`** (direct multipart upload through the backend). Files uploaded via the presign flow (`POST /upload/presign` → client PUT → confirm) bypass the backend entirely — the backend never touches the bytes, so no server-side processing or magic-byte validation is possible in v1. Images uploaded via presign are stored raw as-is.

Pipeline for `POST /upload/avatar`:

| Step | Tool | Notes |
|------|------|-------|
| Decode | `golang.org/x/image` or Cloudflare Images API | Support JPEG, PNG, WebP, GIF (first frame only) |
| Resize | Lanczos | 256 × 256 center-crop |
| Encode | `chai2010/webp` or Cloudflare Images | WebP quality 85 |
| Upload | R2 via `aws-sdk-go-v2/service/s3` | S3-compatible API |

**Alternative (recommended for v1):** delegate image processing to [Cloudflare Images](https://developers.cloudflare.com/images/) — upload original, serve variants via URL transforms (`/cdn-cgi/image/width=256,height=256,fit=cover,format=webp/<original-url>`). Zero Go image library dependency.

---

## MIME Type Allowlist

Limits are enforced twice for presigned uploads: before URL issuance from the declared request metadata, and again during confirm using R2 `HeadObject` metadata. Avatar uploads are additionally validated from magic bytes because they pass through the backend.

| Category | MIME types | Max size |
|----------|------------|----------|
| Avatar image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 2 MB |
| General image | `image/jpeg`, `image/png`, `image/webp`, `image/gif` | 10 MB |
| PDF | `application/pdf` | 50 MB |
| Spreadsheet | `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | 25 MB |

```go
var allowedMIMETypes = map[string]bool{
    "image/jpeg":       true,
    "image/png":        true,
    "image/webp":       true,
    "image/gif":        true,
    "application/pdf":  true,
    "application/vnd.ms-excel":                                      true,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
}
```

---

## Firestore Data Model

Two collections owned exclusively by the upload service:

### `uploadSessions/{sessionID}`

Written on `POST /upload/presign`. Deleted (or marked confirmed) by `POST /upload/confirm`.

```
{
  recordID:      string       // UUIDv4; also uploadRecords document ID
  fileID:        string       // UUIDv4; embedded in immutable R2 finalKey
  ownerUID:      string       // Firebase UID of the caller
  visibility:    string       // "public" | "private"
  projectID:     string       // present when visibility = "private"
  resourceType:  string       // e.g. "attachment"
  resourceID:    string       // e.g. "assessment-123"
  originalFilename: string    // sanitized display/download name
  storageFilename:  string    // generated object filename, e.g. "{fileID}.pdf"
  contentType:   string
  fileSizeBytes: number
  tmpBucket:     string
  tmpKey:        string       // "tmp/{sessionID}/{storageFilename}"
  finalBucket:   string
  finalKey:      string       // final R2 object key (fileKey)
  isConfirmed:   bool
  createdAt:     timestamp
}
```

Used by: confirm (lookup + ownership check), stale session cleanup.

### `uploadRecords/{recordID}`

Written on `POST /upload/confirm`. Deleted on `DELETE /upload/file`.

```
{
  recordID:      string       // UUIDv4; mirrors document ID
  fileID:        string       // UUIDv4; embedded in immutable R2 key
  ownerUID:      string       // Firebase UID of the uploader
  projectID:     string       // present for private files
  visibility:    string       // "public" | "private"
  resourceType:  string
  resourceID:    string
  originalFilename: string    // sanitized display/download name
  storageFilename:  string    // generated object filename, e.g. "{fileID}.pdf"
  contentType:   string
  fileSizeBytes: number
  bucket:        string       // public or private bucket name
  fileKey:       string       // R2 key; contains "/" and must not be used as a Firestore document ID
  fileURL:       string       // present for public files only
  confirmedAt: timestamp
}
```

Used by: `POST /upload/read-url` and `DELETE /upload/file` authorization checks.

---

## Backend Implementation

### Go service structure

```
apps/fs-backend/services/upload/
├── handler.go    # HTTP handlers: UploadAvatar, DeleteAvatar, Presign, Confirm, ReadURL, DeleteFile
├── service.go    # business logic: validate, process image, upload to R2, update Firestore, membership check
├── models.go     # request/response types
└── r2.go         # R2 client wrapper (aws-sdk-go-v2, S3-compatible endpoint)
```

### R2 client (`r2.go`)

```go
import (
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func NewR2Client(accountID, keyID, keySecret string) (*s3.Client, error) {
    r2Endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)
    cfg, err := config.LoadDefaultConfig(context.Background(),
        config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(keyID, keySecret, "")),
        config.WithRegion("auto"),
    )
    if err != nil {
        return nil, err
    }
    return s3.NewFromConfig(cfg, func(o *s3.Options) {
        o.BaseEndpoint = aws.String(r2Endpoint)
    }), nil
}
```

### Dependencies to add

```bash
go get github.com/aws/aws-sdk-go-v2
go get github.com/aws/aws-sdk-go-v2/config
go get github.com/aws/aws-sdk-go-v2/credentials
go get github.com/aws/aws-sdk-go-v2/service/s3
```

---

## Frontend Integration

### Avatar upload

The profile page uploads avatars through the backend:

1. `POST /api/v1/upload/avatar` with `multipart/form-data`
2. Backend handles resize + WebP conversion + R2 upload
3. Response includes CDN URL → stored in Redux and Firestore

**Migration status:** Firebase Storage upload has been removed from `fs-app-web`; avatar changes use `api.postForm('/upload/avatar', formData)` and `api.delete('/upload/avatar')`.

### Large file uploads (presign flow)

```ts
// 1. Get presigned PUT URL + sessionID from backend
const { data } = await api.post('/upload/presign', {
  visibility: 'private',       // or 'public'
  projectID: '0123456789012',  // required for private
  resourceType: 'attachment',
  resourceID: 'assessment-123',
  filename: file.name,
  contentType: file.type,
  contentLength: file.size,
})

// 2. PUT file directly to R2. Browser fetch controls Content-Length automatically.
await fetch(data.uploadURL, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
})

// 3. Confirm with sessionID — backend copies tmp/ → final path, checks ownership
const { data: confirmed } = await api.post('/upload/confirm', { sessionID: data.sessionID })
// confirmed.fileURL  — set for public files (permanent CDN URL)
// confirmed.recordID — always present; store in the owning service document
// confirmed.originalFilename / contentType / fileSizeBytes — display metadata
// confirmed.fileKey  — diagnostics only; do not use as an authorization source
```

### Reading a private file

```ts
// Exchange a stored recordID for a time-limited read URL (1 hour)
const { data } = await api.post('/upload/read-url', { recordID: storedRecordID })
window.open(data.readURL) // or set as <a href> / <img src>
```

### Deleting a file

```ts
await api.delete('/upload/file', { params: { recordID: storedRecordID } })
```

---

## Security

- All endpoints require `Authorization: Bearer <firebase-id-token>` (existing `FirebaseAuth` middleware)
- Public and private objects live in separate buckets; never enable public access on the private or tmp bucket
- General file keys include a server-generated `fileID` and `storageFilename` and are immutable — users cannot overwrite each other's files by guessing `resourceID` + original filename
- Presigned PUT URLs expire in 15 minutes; presigned GET URLs (read-url) expire in 1 hour
- Presigned PUT URLs sign `Content-Type`; `fileSizeBytes` is checked during confirm using R2 `HeadObject`
- Magic-byte MIME validation applies to avatar uploads only. Presigned uploads are accepted based on declared `Content-Type` and R2 metadata in v1.
- Original filenames are sanitized and stored as metadata only; generated `storageFilename` values are embedded in R2 object keys
- `POST /upload/confirm` verifies `callerUID == session.ownerUID` to prevent session hijacking
- Rate limiting: apply the existing `ratelimit` middleware to all upload endpoints — suggested limits: `POST /upload/avatar` 10/min per user, `POST /upload/presign` 30/min per user
- **Avatar files** (`avatars/{uid}/`): served via CDN custom domain — URL is opaque but not access-controlled. Anyone with the URL can load the image (same model as Slack/GitHub avatars). `avatarURL` stored in Firestore is the permanent CDN URL.
- **Public files** (`public/` prefix): served via CDN custom domain — no auth required to read
- **Private files** (`private/{projectID}/` prefix): no CDN exposure; all reads go through `POST /upload/read-url`, which verifies project/resource authorization before issuing a presigned GET URL

---

## Firestore Rule Update

Add a rule so the `avatarURL` field can only be set via the backend (never directly from the client):

```js
// firestore.rules — users collection
allow update: if request.auth.uid == uid
  && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
    // existing client-editable fields only; exclude avatarURL and role
    'companyName',
    'industryType',
    'companySize',
    'contactName',
    'contactEmail',
    'contactPhone',
    'emailNotifications',
    'updatedAt'
  ])
  && request.resource.data.role == resource.data.role;
```

Backend profile API change: remove `avatarURL` from `UpdateProfileRequest` and from `profile.Service.UpdateProfile`; only `upload.Service.UploadAvatar` and `upload.Service.DeleteAvatar` may mutate `users/{uid}.avatarURL` through the Admin SDK.

---

## Phases

### Phase 1 — Avatar upload (implemented)

Deliverable: profile photo upload works end-to-end on R2; Firebase Storage dependency removed.

1. `r2.go` — R2 client wrapper + env var loading
2. `service.go` — `UploadAvatar` (validate -> resize -> WebP -> upload to `avatars/{uid}/`)
3. `handler.go` — `POST /upload/avatar`, `DELETE /upload/avatar`
4. Frontend: migrate `ProfilePage.tsx` from Firebase Storage -> `POST /upload/avatar`
5. Firestore rules: lock `avatarURL` direct-write

### Phase 2 — Public file uploads (presign flow + delete)

Deliverable: any authenticated user can upload and delete their own public files; files are immutable and immediately accessible via CDN.

1. `service.go` — `Presign` + `Confirm` for `visibility: "public"` (path: `public/{resourceType}/{resourceID}/{fileID}/{storageFilename}`)
2. `handler.go` — `POST /upload/presign`, `POST /upload/confirm`
3. `service.go` — `DeleteFile` for public records (verify `ownerUID` from `uploadRecords/{recordID}`)
4. `handler.go` — `DELETE /upload/file`
5. Frontend: add presign + confirm + delete flow for images and files

### Phase 3 — Private file uploads (project-scoped)

Deliverable: files can be scoped to a project/resource; only authorized users can upload, read, or delete them.

1. `service.go` — extend `Presign` + `Confirm` for `visibility: "private"` (path: `private/{projectID}/…`); validate caller is authorized for the project/resource
2. `service.go` — `ReadURL` (authorization check → presigned GET URL, 1 h TTL)
3. `handler.go` — `POST /upload/read-url`
4. `service.go` — extend `DeleteFile` for private records (uploader or project roles `manager`, `system_admin`, `owner`)
5. Frontend: add `read-url` call for rendering private files

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use Go image processing for Phase 1 avatars. Revisit Cloudflare Images only if dynamic variants become a real requirement. | Keeps avatar upload fully backend-owned and avoids adding another paid product dependency before the general upload service exists. |
| 2 | Use `uploads.factorysync.com` for staging/prod public buckets. Disable `r2.dev` in production. Set conservative cache headers for avatars and public attachments. | Custom domains are the production path for R2 public delivery; disabling `r2.dev` avoids bypass paths. |
| 3 | Do not block launch on Firebase Storage avatar migration. Support existing Firebase avatar URLs during transition, migrate on next avatar update, then run a one-time migration after the service is stable. | Reduces launch risk and avoids forcing all existing avatars through a new pipeline immediately. |
| 4 | For v1 private attachments, implement an upload-service helper that checks `users/{uid}.projectRoles[projectID]`; require owning-service authorization before attaching files to assessments. | Matches the existing project membership model and keeps upload authorization from becoming too broad. |
| 5 | Keep v1 presign single-file. Multi-file upload should be client-side iteration over the same endpoint until UX or throughput proves batch presign is needed. | Simpler API, simpler error handling, and less session state. |
| 6 | Keep immutable upload + reference swap for v1. Add an explicit replace endpoint later only if a product workflow needs stable file URLs. | Prevents cross-user overwrite bugs and makes authorization easier to reason about. |

*Version: 1.4.2*
*Last updated: 13 June 2026*
