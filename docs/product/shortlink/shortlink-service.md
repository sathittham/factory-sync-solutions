# Shortlink Service (backend)

## Summary

Planned Go service — `apps/backend/services/shortlink/` (`handler.go` + `service.go` +
`models.go` + `qrcode.go` + `service_test.go`) — providing shortlink CRUD for
authenticated users plus the public `/s/:slug` redirect. **Not started**; this doc captures
the contract from [feature-spec.md § 6, 9 & 13](./feature-spec.md#6-backend-api).

## Implementation

Service interface (per [feature-spec.md § 9](./feature-spec.md#9-service-layer-design)):

- `CreateShortlink(ctx, uid, req) (*Shortlink, error)` — validates the URL (HTTP/HTTPS
  only) and optional custom slug (alphanumeric + hyphen, ≤ 20 chars, unique); generates a
  nanoid slug (7 chars, URL-safe) when none given; generates the QR SVG; writes the
  `shortlinks` document.
- `GetShortlink(ctx, uid, id)` / `ListShortlinks(ctx, uid, limit, offset, sortBy, sortOrder)` —
  strictly UID-scoped; list supports `limit` (default 50, max 100), `offset`, sort by
  `createdAt` \| `totalClicks`.
- `DeleteShortlink(ctx, uid, id) error` — owner-only; deleted slugs 404 on redirect.
- `GetShortlinkBySlug(ctx, slug)` + `RecordClick(ctx, slug, metadata)` — power the public
  redirect; click recording is detailed in [click-analytics.md](./click-analytics.md).
- `GetAnalytics(ctx, uid, id, startDate, endDate)` — aggregation, see
  [click-analytics.md](./click-analytics.md).

### Sentinel errors

`ErrShortlinkNotFound` · `ErrSlugAlreadyExists` · `ErrInvalidURL` · `ErrInvalidSlug` ·
`ErrShortlinkAccessDenied` — domain-specific per project convention; all wrapped with
`fmt.Errorf("context: %w", err)` and checked via `errors.Is`.

### Public redirect behaviour

`GET /s/:slug` (no auth): look up by slug → log the click event (user agent, IP, referrer,
geo-location) → `301` redirect to `originalURL`, preserving existing query parameters.
Missing or deleted slug → `404`.

### Rate limiting

Creation: 10/hour per user → `429 RATE_LIMIT_EXCEEDED`. Redirect: 100/min per IP.

## Configuration

| Env var | Description |
|---------|-------------|
| `SHORTLINK_DOMAIN` | Base domain for short URLs (default `fs.link`) |
| `SHORTLINK_RATE_LIMIT` | Creation rate limit per user (default `10/hour`) |
| `CLICK_RETENTION_DAYS` | Click analytics retention (default `90`) |
| `GEOLOCATION_API_KEY` | Optional geolocation provider key (MaxMind / IPInfo) |

## Usage

Routes wired in `apps/backend/main.go`; management endpoints behind `FirebaseAuth`.

```
# pseudocode — handler maps sentinel errors to the response envelope
uid := middleware.GetUID(r)                        # never from body/path
sl, err := svc.CreateShortlink(ctx, uid, req)
errors.Is(err, ErrInvalidURL / ErrInvalidSlug / ErrSlugAlreadyExists)
                                     → pkg.RespondError(w, 400, "VALIDATION_ERROR", msg)
rate limit exceeded                  → pkg.RespondError(w, 429, "RATE_LIMIT_EXCEEDED", msg)
ok                                   → pkg.RespondJSON(w, 201, sl)

errors.Is(err, ErrShortlinkNotFound)     → pkg.RespondError(w, 404, "NOT_FOUND", msg)
errors.Is(err, ErrShortlinkAccessDenied) → pkg.RespondError(w, 403, "FORBIDDEN", msg)
```

```
# pseudocode — public redirect
sl, err := svc.GetShortlinkBySlug(ctx, slug)
err → 404
go svc.RecordClick(ctx, slug, metadataFrom(r))
http.Redirect(w, r, sl.OriginalURL, 301)
```

## Acceptance Criteria

- Given a valid URL, when `POST /shortlinks` is called, then a 201 returns slug, shortURL and qrCodeSVG.
- Given a duplicate or invalid custom slug, when creating, then `400 VALIDATION_ERROR` (`ErrSlugAlreadyExists` / `ErrInvalidSlug`).
- Given another user's shortlink ID, when fetched or deleted, then `403 FORBIDDEN`.
- Given a live slug, when `GET /s/:slug` is hit, then a click is logged and the response is a `301` to the original URL.
- Given a deleted slug, when `GET /s/:slug` is hit, then `404`.
- Given the 11th creation within an hour, when submitted, then `429 RATE_LIMIT_EXCEEDED`.

## Status

All ❌ — see [status.md](./status.md).

- [ ] `models.go` — request/response structs
- [ ] `service.go` — CRUD + slug generation + sentinel errors
- [ ] `handler.go` — routes + swagger annotations
- [ ] `main.go` wiring + Firestore rules/indexes
- [ ] `service_test.go` — table-driven, deny paths included (coverage goal ≥ 80%)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
