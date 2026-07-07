---
version: 1.0.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Done
---

# DBD Integration — Feature Spec

> Backend proxy to Thailand's Department of Business Development (DBD) Open Data
> API. Resolves a 13-digit company registration ID to a structured company profile
> and returns a simplified JSON shape. Results are cached in-process for 1 hour.
> Used exclusively during the registration flow's company lookup step.

---

## 1. Summary

When a user registers, they can enter their 13-digit Thai company registration ID
and trigger a DBD lookup that auto-fills the company name. The frontend calls the
backend proxy (`GET /api/v1/dbd/{regId}`) rather than hitting the DBD API
directly — this avoids exposing DBD credentials on the client, normalises the
deeply nested DBD response into a flat `CompanyProfile` shape, and provides an
in-memory cache to limit redundant DBD requests.

The integration is read-only. It never writes to the DBD system.

---

## 2. Goals & Non-Goals

### Goals

- Proxy `GET https://openapi.dbd.go.th/api/v1/juristic_person/{regId}` and
  simplify the response.
- Validate the `regId` path parameter as exactly 13 digits before making any
  upstream call.
- Cache results in memory for 1 hour with a read-write mutex (thread-safe).
- Map DBD error states (`status.code != "1000"` or empty `data`) to 404.
- Map upstream connectivity failures to 502 (`ErrDBDUnavailable`).
- Authenticate the caller via Firebase ID token (the endpoint is not public).

### Non-Goals

- Writing or updating DBD records.
- Persistent caching (Firestore/Redis) — in-process only, lost on restart.
- Batch lookups.
- Caching negative results (404s are not cached; repeated missing IDs always hit DBD).

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| DBD handler | `apps/backend/services/dbd/handler.go` | ✅ Built |
| DBD service | `apps/backend/services/dbd/service.go` | ✅ Built |
| DBD models | `apps/backend/services/dbd/models.go` | ✅ Built |
| Handler + service tests | `handler_test.go` / `service_test.go` | ✅ Built |
| In-memory cache | `Service.cache` (`map[string]cacheEntry`) | ✅ Built |
| Frontend call site | `apps/web-app/src/pages/RegisterPage.tsx` | ✅ Built |

---

## 4. API

### GET `/api/v1/dbd/{regId}`

Fetch juristic person data for a Thai company registration ID.

**Auth:** Firebase ID token (Bearer). The endpoint is behind `FirebaseAuth`
middleware — anonymous callers receive 401.

**Path parameter:** `regId` — must match `^\d{13}$` exactly. Returns 400 on
mismatch.

**Response — 200**

```jsonc
{
  "success": true,
  "data": {
    "juristicId":      "0105550000001",
    "nameTh":          "บริษัท แอคมี จำกัด",
    "nameEn":          "ACME COMPANY LIMITED",
    "type":            "บริษัทจำกัด",
    "registerDate":    "25500101",
    "status":          "ยังดำเนินกิจการอยู่",
    "objectiveCode":   "C2710",
    "objectiveTextTh": "การผลิตมอเตอร์ไฟฟ้า",
    "objectiveTextEn": "Manufacture of electric motors",
    "registerCapital": "5000000",
    "branchName":      "สำนักงานใหญ่",
    "address":         "123 ถนนสุขุมวิท",
    "subDistrict":     "คลองเตย",
    "district":        "คลองเตย",
    "province":        "กรุงเทพมหานคร"
  }
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | `regId` is not exactly 13 digits |
| 401 | `UNAUTHORIZED` | Missing/invalid Firebase token |
| 404 | `NOT_FOUND` | DBD returned `status.code != "1000"` or empty `data` array |
| 502 | `UPSTREAM_ERROR` | DBD API unreachable or returned non-200 |
| 500 | `INTERNAL_ERROR` | Unexpected error |

---

## 5. DBD Upstream API

**Base URL:** `https://openapi.dbd.go.th/api/v1/juristic_person`

**Request format:** `GET {base}/{regId}` with headers:
```
User-Agent: FactoryHealthCheck/1.0
Accept:     application/json
```

No API key is required for the DBD Open Data endpoint (it is a public Thai
government open data service).

**Upstream response structure (simplified):**

```jsonc
{
  "status": { "code": "1000", "description": "success" },
  "data": [
    {
      "cd:OrganizationJuristicPerson": {
        "cd:OrganizationJuristicID":         "...",
        "cd:OrganizationJuristicNameTH":     "...",
        "cd:OrganizationJuristicNameEN":     "...",
        "cd:OrganizationJuristicType":       "...",
        "cd:OrganizationJuristicRegisterDate": "...",
        "cd:OrganizationJuristicStatus":     "...",
        "cd:OrganizationJuristicObjective":  { ... },
        "cd:OrganizationJuristicRegisterCapital": "...",
        "cd:OrganizationJuristicBranchName": "...",
        "cd:OrganizationJuristicAddress":    { ... }
      }
    }
  ]
}
```

The DBD response uses `cd:` and `td:` XML namespace prefixes in JSON keys.
`mapToCompanyProfile` strips these prefixes and flattens the address hierarchy.

**Success condition:** `status.code == "1000"` AND `len(data) > 0`.

---

## 6. In-Memory Cache

```go
type cacheEntry struct {
    profile   *CompanyProfile
    expiresAt time.Time          // time.Now().Add(time.Hour)
}
```

The cache is a `map[string]cacheEntry` protected by `sync.RWMutex`.

**Read path:** `RLock` → check `cache[regID]` and `!time.Now().Before(entry.expiresAt)` → `RUnlock`.

**Write path:** after a successful upstream fetch, `Lock` → `cache[regID] = cacheEntry{...}` → `Unlock`.

| Property | Value |
|----------|-------|
| TTL | 1 hour |
| Scope | Per process instance — lost on restart |
| Negative caching | None — 404 responses are not stored |
| Eviction | Time-based; stale entries are overwritten on next cache miss |
| Max size | Unbounded — grows with unique lookup count |

---

## 7. Frontend Usage (`RegisterPage`)

The frontend calls this endpoint when the user triggers the company lookup in
the registration form. The lookup result pre-fills `companyName`.

```
User enters 13-digit regId → handleCheckRegId()
    → api.get('/profile/check/{regId}')   (duplicate check first)
    → api.get('/dbd/{regId}')             (only if not duplicate)
        → setDbdProfile(data)
        → setValue('companyName', data.nameTh)
```

The lookup is triggered by a button click ("ค้นหา" / "Lookup"), not on-change.
The returned Thai company name (`nameTh`) is written into the `companyName` form
field but the user can still override it before submitting.

---

## 8. Address Mapping

The DBD address structure is deeply nested with inconsistent key names between
sub-district and district objects. `mapToCompanyProfile` handles both variants:

| Target field | Source path | Fallback |
|---|---|---|
| `subDistrict` | `CitySubDivision.CitySubDivisionTextTH` | `CitySubDivision.CityTextTH` |
| `district` | `City.CityTextTH` | `City.TextTH` |
| `province` | `CountrySubDivision.CountrySubDivisionTextTH` | — |

Fields missing from the upstream response (`nil` pointer) produce empty strings
in the output.

---

## 9. Timeout & Error Policy

| Parameter | Value |
|-----------|-------|
| HTTP client timeout | 10 seconds |
| Upstream 4xx / 5xx | Wrapped as `ErrDBDUnavailable` → 502 |
| Network / DNS failure | Wrapped as `ErrDBDUnavailable` → 502 |
| JSON decode failure | Wrapped error → 500 |

---

## 10. Acceptance Criteria

- [ ] `GET /api/v1/dbd/0105550000001` returns a `CompanyProfile` with Thai name, type, address, and province.
- [ ] `GET /api/v1/dbd/ABC123` (non-numeric or wrong length) returns 400.
- [ ] A 12-digit ID or 14-digit ID returns 400.
- [ ] An ID that does not exist in DBD returns 404.
- [ ] A second call for the same valid `regId` within 1 hour does not make a second upstream HTTP request (served from cache).
- [ ] When the DBD API is unavailable (network error), the endpoint returns 502.
- [ ] An unauthenticated call returns 401.
- [ ] `make test-api` passes (including `service_test.go` with injected `HTTPClient`).

---

## 11. Testing

- **Unit (`service_test.go`):** Uses injected `HTTPClient` mock.
  - Valid ID → correct `CompanyProfile` fields.
  - DBD returns `status.code != "1000"` → `ErrCompanyNotFound`.
  - DBD returns empty `data` array → `ErrCompanyNotFound`.
  - HTTP 500 from DBD → `ErrDBDUnavailable`.
  - Network error → `ErrDBDUnavailable`.
  - Second call within TTL → mock `Do` called only once (cache hit).
- **Unit (`handler_test.go`):**
  - Non-13-digit path param → 400.
  - `ErrCompanyNotFound` → 404.
  - `ErrDBDUnavailable` → 502.

---

## 12. References

- DBD handler: [handler.go](../../../apps/backend/services/dbd/handler.go)
- DBD service: [service.go](../../../apps/backend/services/dbd/service.go)
- DBD models: [models.go](../../../apps/backend/services/dbd/models.go)
- Frontend call site: [RegisterPage.tsx](../../../apps/web-app/src/pages/RegisterPage.tsx)
- Register feature: [register/feature-spec.md](../register/feature-spec.md)
- DBD Open Data portal: https://www.dbd.go.th/

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
