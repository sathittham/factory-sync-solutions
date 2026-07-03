# Avatar Upload (Phase 1 — shipped)

## Summary

Backend-proxied profile-photo upload on Cloudflare R2. Lives in
`apps/backend/services/upload/` (`handler.go`, `service.go`, `models.go`, `r2.go`); called
by `apps/web-app/src/pages/ProfilePage.tsx`. The only upload path where the backend touches
the bytes — which is why magic-byte validation and image processing apply here and not to
the (planned) presign flow.

## Implementation

- `NewR2Client(accountID, keyID, keySecret) (*s3.Client, error)` (`r2.go`) — S3-compatible
  client (aws-sdk-go-v2) against `https://{accountID}.r2.cloudflarestorage.com`, region
  `auto`. Constructed once at startup from env vars.
- `(Service).UploadAvatar(ctx, uid, file)` — validates MIME (magic bytes: JPEG/PNG/WebP/GIF)
  and size (≤ 2 MB), resizes to 256 × 256 (Lanczos, center-crop), encodes WebP quality 85,
  uploads to `avatars/{uid}/profile.webp` in the public bucket, then writes the CDN URL to
  `users/{uid}.avatarURL` in Firestore. Returns the CDN URL + content type + size.
- `(Service).DeleteAvatar(ctx, uid)` — deletes the R2 object and clears `avatarURL`.

### Notable behavior

- **Update = overwrite.** The object key is fixed per user (`avatars/{uid}/profile.webp`),
  so re-uploading always replaces the previous avatar — no record bookkeeping.
- **Semi-public URL.** The avatar is served directly from the CDN custom domain; the URL is
  opaque (contains the UID) but not access-controlled — anyone with the URL can load it
  (same model as Slack/GitHub profile photos).
- **Go-native pipeline.** Image processing is done in Go (spec Decision 1); Cloudflare
  Images stays a fallback option only if dynamic variants become a real requirement.
- **Backend-only Firestore write.** `avatarURL` is excluded from the client-editable field
  allowlist in `firestore.rules` and removed from the profile service's
  `UpdateProfileRequest` — only this service mutates it, via the Admin SDK.

## Configuration

| Env var | Description |
|---------|-------------|
| `R2_ACCOUNT_ID` | Cloudflare account ID; the S3 endpoint is derived from it |
| `R2_ACCESS_KEY_ID` / `R2_ACCESS_KEY_SECRET` | R2 API credentials (git-ignored, never committed) |
| `R2_PUBLIC_BUCKET` | Public bucket name (staging: `uploads-factorysyncsolutions-com-staging`) |
| `R2_PUBLIC_BASE_URL` | Public delivery origin — the R2 custom domain (e.g. `https://uploads.factorysyncsolutions.com`), **not** the S3 API URL |

## Usage

Call sites: `apps/web-app/src/pages/ProfilePage.tsx` (Firebase Storage path removed).

```
# pseudocode — web-app
change photo → api.postForm('/upload/avatar', formData with file)
              → data.avatarURL rendered + kept in client state
remove photo → api.delete('/upload/avatar') → 204 → fallback avatar
```

```
# pseudocode — handler maps failures to the response envelope
bad type / > 2 MB           → pkg.RespondError(w, 400, "VALIDATION_ERROR", msg)
missing/invalid token       → 401 (FirebaseAuth middleware)
R2 / Firestore failure      → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
success                     → pkg.RespondJSON: { "success": true, "data": { "avatarURL": …, "contentType": "image/webp", "fileSizeBytes": … } }
```

Rate limit: 10 requests/min per user via the existing `ratelimit` middleware.

## Acceptance Criteria

- Given a valid image (JPEG/PNG/WebP/GIF, ≤ 2 MB), when uploaded, then a 256×256 WebP lands at `avatars/{uid}/profile.webp` and the CDN URL is returned and stored in `users/{uid}.avatarURL`.
- Given an unsupported type or oversized file, when uploaded, then the API returns `400 VALIDATION_ERROR` and nothing is written.
- Given no/invalid token, when calling either endpoint, then `401 UNAUTHORIZED`.
- Given `DELETE /upload/avatar`, when called by the owner, then the object is removed, `avatarURL` cleared, and `204` returned.
- Given a client Firestore write attempting to set `avatarURL` directly, then the security rules reject it.

## Status

- [x] `r2.go` — R2 client wrapper + env loading
- [x] `service.go` — `UploadAvatar` / `DeleteAvatar` pipeline
- [x] `handler.go` — `POST` / `DELETE /upload/avatar`
- [x] `ProfilePage.tsx` migrated off Firebase Storage
- [x] `firestore.rules` — `avatarURL` direct-write locked
- [x] `handler_test.go` in place
- [ ] `service_test.go` — pipeline + error-path coverage toward the ≥ 80% services target

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
