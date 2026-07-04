# Status

> Tracks build progress for the Shortlink Service feature against
> [README.md § Build Sequence](./README.md#build-sequence). Design detail is in
> [README.md](./README.md), requirements in [feature-spec.md](./feature-spec.md), and the
> per-component sub-docs. Tick items off as they are implemented and merged into `develop`.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — Backend](#phase-1--backend)
- [Phase 2 — Frontend](#phase-2--frontend)
- [Phase 3 — Analytics Enhancement](#phase-3--analytics-enhancement)
- [Future Work](#future-work)
- [Related Documents](#related-documents)

---

## Current State

**Not started.** The SRS ([feature-spec.md](./feature-spec.md), status *Planning*) is
written and defines the full contract — API, Firestore schema, UI, i18n key map — but no
code exists yet: there is no `services/shortlink/` directory, no Firestore rules for
`shortlinks`/`clicks`, and no frontend pages, components or Redux slice. Every checklist
item below is ❌.

The `fs.link` domain and the optional geolocation provider (`GEOLOCATION_API_KEY` —
MaxMind / IPInfo) are environment prerequisites that are also not yet provisioned.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/`
≥ 80%. No numbers to record yet.

---

## Phase 1 — Backend

The Go `shortlink` service: CRUD, slug generation, QR SVG, public redirect, click logging.

- [ ] `models.go` — request/response structs (`apps/backend/services/shortlink/models.go`)
- [ ] `service.go` — business logic, slug generation (nanoid), sentinel errors
- [ ] `qrcode.go` — QR code SVG generation
- [ ] `handler.go` — Chi routes + swagger annotations (5 authed endpoints + public `/s/:slug`)
- [ ] Firestore security rules for `shortlinks` and `clicks` (`firestore.rules`)
- [ ] Composite indexes for click analytics queries (`firestore.indexes.json`)
- [ ] Wire routes in `apps/backend/main.go`
- [ ] Rate limiting — creation 10/hour per user, redirect 100/min per IP

### Phase 1 Tests

**Goal:** critical `services/` ≥ 80%. Table-driven; assert the deny paths (401/403/404/429),
not just the happy path.

- [ ] `services/shortlink/service_test.go` — create (valid / custom slug / `ErrSlugAlreadyExists` / `ErrInvalidURL` / QR), retrieval (`ErrShortlinkNotFound`, UID scoping), `RecordClick` counters + unique dedupe, `GetAnalytics` grouping/ordering
- [ ] Integration — create → redirect → click logged; delete → redirect 404; rate limit after 10 creations/hour

Coverage recorded:

- [ ] `go test ./services/shortlink/... -cover` → **—**

---

## Phase 2 — Frontend

The `web-app` management UI at `/shortlinks` and `/shortlinks/:id/analytics`.

- [ ] `shortlinksSlice` — `apps/web-app/src/store/shortlinksSlice.ts`
- [ ] `ShortlinkListPage` — `apps/web-app/src/pages/ShortlinkListPage.tsx` (+ routes, nav item)
- [ ] `CreateShortlinkDialog` — `apps/web-app/src/components/CreateShortlinkDialog.tsx`
- [ ] `ShortlinkList` — `apps/web-app/src/components/ShortlinkList.tsx` (copy · QR download · delete `AlertDialog`)
- [ ] `ShortlinkAnalyticsPage` — `apps/web-app/src/pages/ShortlinkAnalyticsPage.tsx` (recharts)
- [ ] i18n keys under `shortlink.*` (TH/EN — key map in [feature-spec.md § 18](./feature-spec.md#18-i18n-key-map))

### Phase 2 Tests

- [ ] Vitest — Zod URL/slug validation; slice reducers
- [ ] Playwright E2E — list render, create/copy/delete flows, analytics charts, redirect verification

---

## Phase 3 — Analytics Enhancement

- [ ] Geolocation lookup (IP → country/city)
- [ ] User-agent parsing (device detection)
- [ ] Real-time analytics aggregation
- [ ] Analytics caching for performance

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all unscheduled.

- [ ] Custom domain support per user
- [ ] Shortlink expiration/TTL
- [ ] Bulk shortlink creation
- [ ] Export analytics (CSV/Excel)
- [ ] A/B testing for shortlinks
- [ ] UTM parameter tracking and reporting

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [shortlink-service.md](./shortlink-service.md) · [click-analytics.md](./click-analytics.md) · [qr-code-generation.md](./qr-code-generation.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
