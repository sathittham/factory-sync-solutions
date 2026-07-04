# Click Analytics

## Summary

Planned analytics layer of the shortlink service: every public redirect logs a click
document, and `GET /api/v1/shortlinks/:id/analytics` aggregates them for the owner. Lives
in `apps/backend/services/shortlink/` alongside the core service. **Not started**; contract
from [feature-spec.md § 6–7 & 13](./feature-spec.md#6-backend-api).

## Implementation

### Click recording

`RecordClick(ctx, slug, metadata)` — called from the `/s/:slug` redirect path:

- Writes a `clicks/{clickID}` document: `shortlinkID`, `slug`, `uid` (owner, for query
  scoping), `userAgent`, `ip`, `country` / `countryName` / `city`, `device`
  (`mobile` \| `desktop` \| `tablet`), `referrer` (URL or `direct`), `clickedAt`.
- Increments the shortlink's `totalClicks`; increments `uniqueClicks` only for a new
  IP + user-agent combination.
- Geo fields come from an optional geolocation lookup (`GEOLOCATION_API_KEY` — MaxMind /
  IPInfo); device from user-agent parsing. Both are Phase 3 enhancements — until then the
  fields may be absent.

### Aggregation

`GetAnalytics(ctx, uid, id, startDate, endDate)` — default range last 30 days — returns:

| Section | Content |
|---------|---------|
| Totals | `totalClicks`, `uniqueClicks` |
| `clicksOverTime` | `[{date, clicks}]` per day |
| `geographicDistribution` | `[{country, countryName, clicks}]` |
| `deviceBreakdown` | `[{device, clicks}]` |
| `topReferrers` | `[{referrer, clicks}]` ordered by clicks descending |
| `recentClicks` | Latest clicks with `clickedAt`, geo, device, referrer — **never the IP or raw user agent** |

### Indexes & retention

Composite indexes: `shortlinkID + clickedAt`, `slug + clickedAt`, `uid + clickedAt`, plus
`clickedAt` for cleanup. Click data is retained 90 days (`CLICK_RETENTION_DAYS`,
configurable).

### Privacy

IP addresses are logged for analytics only and never exposed in API responses; user agents
are stored but not exposed in aggregates.

## Usage

```
# pseudocode — analytics endpoint
uid := middleware.GetUID(r)
a, err := svc.GetAnalytics(ctx, uid, id, start, end)
errors.Is(err, ErrShortlinkNotFound)     → pkg.RespondError(w, 404, "NOT_FOUND", msg)
errors.Is(err, ErrShortlinkAccessDenied) → pkg.RespondError(w, 403, "FORBIDDEN", msg)
ok → pkg.RespondJSON(w, 200, a)          # {"success": true, "data": {…}}
```

Frontend consumer: `ShortlinkAnalyticsPage` (`/shortlinks/:id/analytics`) — date-range
picker (7/30/90 days, custom), recharts line/bar/pie charts, referrer + recent-clicks
tables.

## Acceptance Criteria

- Given a redirect via `/s/:slug`, when it completes, then a click document exists and `totalClicks` is incremented (analytics visible within ~5 s; eventual consistency acceptable).
- Given repeat clicks from the same IP + user agent, when recorded, then `uniqueClicks` increments only once.
- Given a date range, when analytics are requested, then clicks are aggregated per day, grouped by country and device, and referrers are ordered by clicks descending.
- Given any analytics response, when inspected, then no IP address or raw user agent appears.

## Status

All ❌ — see [status.md](./status.md).

- [ ] `RecordClick` + click document writes (`services/shortlink/service.go`)
- [ ] `GetAnalytics` aggregation + endpoint
- [ ] Composite indexes (`firestore.indexes.json`) + 90-day retention
- [ ] Phase 3 — geolocation lookup, UA parsing, real-time aggregation, caching
- [ ] Tests — `RecordClick` counter/dedupe and `GetAnalytics` grouping cases in `service_test.go`

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
