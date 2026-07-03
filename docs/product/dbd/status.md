# Status

> Tracks build progress for the DBD Integration feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Known Limitations](#known-limitations)
- [Related Documents](#related-documents)

---

## Current State

**Shipped end to end.** The `GET /api/v1/dbd/{regId}` proxy is live behind `FirebaseAuth`
middleware: it validates the 13-digit registration ID, fetches the juristic-person record
from DBD Open Data (10-second timeout, no API key required), flattens the namespaced
response into a `CompanyProfile`, and serves repeats from a thread-safe in-memory cache
for 1 hour. Error states map cleanly — 400 for a malformed ID, 404 when DBD has no record,
502 when DBD is unreachable. The registration form's lookup button consumes it and
pre-fills `companyName` with the returned Thai name.

Handler and service test suites are in place (`handler_test.go`, `service_test.go` with an
injected `HTTPClient` mock, including a cache-hit assertion). Known limitations — no
persistent cache, unbounded cache size, no negative caching — are deliberate non-goals,
not gaps.

---

## Build Checklist

Single phase — the feature shipped as one unit. Mirrors
[feature-spec.md § 3](./feature-spec.md#3-current-state):

- [x] DBD handler — `apps/backend/services/dbd/handler.go`
- [x] DBD service — `apps/backend/services/dbd/service.go`
- [x] DBD models — `apps/backend/services/dbd/models.go`
- [x] In-memory cache (`map[string]cacheEntry` + `sync.RWMutex`, 1h TTL) — in `service.go`
- [x] Frontend call site (lookup button, `companyName` pre-fill) — `apps/web-app/src/pages/RegisterPage.tsx`

### Tests

- [x] `services/dbd/service_test.go` — injected `HTTPClient`: field mapping, `ErrCompanyNotFound` paths, `ErrDBDUnavailable` paths, cache hit (mock `Do` called once)
- [x] `services/dbd/handler_test.go` — 400 / 404 / 502 mapping
- [x] `make test-api` passes

Coverage recorded:

- [ ] `go test ./services/dbd/... -cover` → **not yet recorded**

---

## Known Limitations

Deliberate non-goals (see [README.md § Open Items](./README.md#open-items--future-work));
not tracked as work items:

- In-process cache only — lost on restart, no Firestore/Redis backing
- Unbounded cache size — time-based expiry only
- No negative caching — missing IDs always hit DBD

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [dbd-lookup.md](./dbd-lookup.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
