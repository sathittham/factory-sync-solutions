# DBD Lookup Service (backend)

## Summary

Read-only proxy to Thailand's DBD Open Data juristic-person API. Lives in
`apps/backend/services/dbd/` (handler + service + models); resolves a validated 13-digit
registration ID to a flat `CompanyProfile`, with a 1-hour in-process cache in front of the
upstream call.

## Implementation

- Handler for `GET /api/v1/dbd/{regId}` — rejects any `regId` not matching `^\d{13}$`
  with `400 VALIDATION_ERROR` before the service is called; maps sentinel errors to the
  response envelope via `pkg.RespondError`.
- `(Service).Lookup(ctx, regID) (*CompanyProfile, error)` — cache check → upstream fetch →
  `mapToCompanyProfile` → cache write. Sentinel errors: `ErrCompanyNotFound` (DBD
  `status.code != "1000"` or empty `data`) and `ErrDBDUnavailable` (non-200 / network /
  DNS failure). JSON decode failures are wrapped errors → 500.
- The `HTTPClient` is injected, so tests mock the upstream without network access.

### Upstream contract

`GET https://openapi.dbd.go.th/api/v1/juristic_person/{regId}` with headers
`User-Agent: FactoryHealthCheck/1.0` and `Accept: application/json`. No API key — it is a
public Thai-government open-data service. Success condition: `status.code == "1000"`
**and** `len(data) > 0`. The response nests everything under
`cd:OrganizationJuristicPerson` with `cd:`/`td:` XML-namespace prefixes in JSON keys;
`mapToCompanyProfile` strips the prefixes and flattens the address hierarchy.

### Address mapping fallbacks

| Target field | Source path | Fallback |
|---|---|---|
| `subDistrict` | `CitySubDivision.CitySubDivisionTextTH` | `CitySubDivision.CityTextTH` |
| `district` | `City.CityTextTH` | `City.TextTH` |
| `province` | `CountrySubDivision.CountrySubDivisionTextTH` | — |

Fields missing upstream (`nil` pointer) produce empty strings in the output.

### Cache

`map[string]cacheEntry{profile, expiresAt}` guarded by `sync.RWMutex`. Read path takes
`RLock` and checks freshness; write path takes `Lock` after a successful fetch and stores
`expiresAt = now + 1h`. Per process instance (lost on restart), unbounded size, no
negative caching — a stale entry is simply overwritten on the next miss.

### Timeout & error policy

| Parameter | Value |
|-----------|-------|
| HTTP client timeout | 10 seconds |
| Upstream 4xx / 5xx | `ErrDBDUnavailable` → 502 |
| Network / DNS failure | `ErrDBDUnavailable` → 502 |
| JSON decode failure | wrapped error → 500 |

## Usage

Call site: the registration form's lookup button
(`apps/web-app/src/pages/RegisterPage.tsx`) — after a duplicate check, never on-change:

```
# pseudocode — frontend lookup flow
user enters 13-digit regId → handleCheckRegId()
  → GET /profile/check/{regId}    # duplicate check first
  → GET /dbd/{regId}              # only if not a duplicate
      → setDbdProfile(data)
      → companyName = data.nameTh  # user can still override before submit
```

```
# pseudocode — handler maps sentinel errors to the envelope
errors.Is(err, ErrCompanyNotFound)  → pkg.RespondError(w, 404, "NOT_FOUND", msg)
errors.Is(err, ErrDBDUnavailable)   → pkg.RespondError(w, 502, "UPSTREAM_ERROR", msg)
default                             → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
```

## Acceptance Criteria

- Given a valid, existing 13-digit ID, when looked up, then a `CompanyProfile` with Thai name, type, address, and province is returned.
- Given a non-numeric, 12-digit, or 14-digit ID, when looked up, then 400 is returned with no upstream call.
- Given an ID unknown to DBD, when looked up, then 404 — and the miss is **not** cached.
- Given a repeat lookup of the same valid ID within 1 hour, when called, then no second upstream HTTP request is made.
- Given the DBD API is unreachable, when looked up, then 502.
- Given no/invalid Firebase token, when called, then 401.

## Status

- [x] `handler.go` / `service.go` / `models.go` implemented — `apps/backend/services/dbd/`
- [x] In-memory cache with `sync.RWMutex`, 1h TTL
- [x] `service_test.go` (injected `HTTPClient`) + `handler_test.go` — `make test-api` passes
- [x] Wired to `RegisterPage.tsx` lookup

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
