# Admin API (backend)

## Summary

The five admin endpoints under `/api/v1/admin/`, implemented in
`apps/backend/services/admin/handler.go` and registered in `main.go` behind
`FirebaseAuth` + `RequireAdmin`. The service owns no collection — it composes the result
and profile services, enriching assessments with company data before returning them.

## Implementation

- `GET /admin/assessments` — lists assessments enriched with profile data. `limit`
  default 100, max 500 (clamped by `parseLimit`). `industryType` / `companySize` params
  are accepted from the frontend but **not applied** (known issue — the handler builds an
  empty filters map).
- `GET /admin/assessments/{assessmentId}` — single assessment plus `scores`,
  `strengths`, `weaknesses`. The path param is validated against a UUIDv4 regex before
  any Firestore read (400 on mismatch, 404 if no match). Known limitation: fetches all
  results via `ListResults` and linear-scans for the ID — O(n); should be a direct
  Firestore `Get` by document ID.
- `GET /admin/export` — streams up to 10,000 rows as `text/csv` with
  `Content-Disposition: attachment; filename=assessments.csv`. The one endpoint that does
  not use `pkg.RespondJSON`. Columns, in order: ID, UID, Company Name, Industry Type,
  Company Size, Contact Name, Contact Email, Overall Score (`%.2f`), Diagnosis,
  Submitted At (ISO 8601). A Firestore failure before writing begins returns a JSON error
  body; a mid-stream failure truncates the output.
- `GET /admin/users` — lists all registered profiles. `limit` default 200, max 500.
- `PUT /admin/users/{uid}/role` — role change. `uid` validated (non-empty, ≤128 chars);
  body `role` must be one of `"user"`, `"manager"`, `"system_admin"`, `"owner"` (400
  otherwise). Dual write, in order: (1) `profileSvc.SetRole` → Firestore, (2)
  `authClient.SetCustomUserClaims` → Firebase.

### Profile enrichment (`enrichedAssessment`)

The response type embeds the base assessment and adds `companyName`, `industryType`,
`companySize`, `contactName`, `contactEmail`. The profile lookup is batched —
`profileSvc.GetProfilesByUIDs(ctx, uids)` is called once per request with all unique UIDs,
never N times per row. If the lookup fails, the handler logs the error and returns
assessments with empty profile fields rather than aborting the request (fail-open on
enrichment only).

### Dual-write divergence

If step 2 (Firebase claims) fails after step 1 (Firestore) succeeds, the profile document
and the token claims diverge until the next successful `SetUserRole`. `RequireAdmin` reads
claims from the token, so a demoted user keeps admin access until their token expires
(~1 hour worst case). Future fix: retry/reconciliation job, or claims-first write order.

## Usage

```
# pseudocode — envelope mapping in the handler
list ok        → pkg.RespondList(w, enriched, count)         # {"success":true,"data":[...],"count":N}
invalid param  → pkg.RespondError(w, 400, "BAD_REQUEST", msg)
no admin claim → pkg.RespondError(w, 403, "FORBIDDEN", msg)   # RequireAdmin, before the handler runs
no/bad token   → pkg.RespondError(w, 401, "UNAUTHORIZED", msg)
not found      → pkg.RespondError(w, 404, "NOT_FOUND", msg)
firestore err  → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)   # errors wrapped: fmt.Errorf("...: %w", err)
```

```
# pseudocode — role change dual write
profileSvc.SetRole(ctx, uid, role)                 # Firestore
authClient.SetCustomUserClaims(ctx, uid, {role})   # Firebase (authoritative for RequireAdmin)
→ pkg.RespondJSON(w, 200, {uid, role})
```

Consumed by `apps/web-app/src/pages/AdminPage.tsx` — see [admin-page.md](./admin-page.md).

## Acceptance Criteria

- Given a request without a valid token, when any admin endpoint is called, then `401 UNAUTHORIZED`.
- Given a valid token without the admin claim, when any admin endpoint is called, then `403 FORBIDDEN`.
- Given a malformed `assessmentId`, when `GET /admin/assessments/{id}` is called, then `400 BAD_REQUEST` with no Firestore read.
- Given a valid UUIDv4 with no matching document, then `404 NOT_FOUND`.
- Given `role: "superuser"` (or any value outside the four allowed), when `PUT /admin/users/{uid}/role` is called, then `400 BAD_REQUEST`.
- Given a profile-enrichment failure, when listing assessments, then the request still succeeds with empty profile fields.

## Status

- [x] Handler with all five endpoints — `apps/backend/services/admin/handler.go`
- [x] Routes registered behind `FirebaseAuth` + `RequireAdmin` — `apps/backend/main.go`
- [x] Batched profile enrichment via `GetProfilesByUIDs`
- [ ] Apply `industryType` / `companySize` filters in `ListAssessments`
- [ ] Direct-`Get` `GetByID` on the result service (replace O(n) scan)
- [ ] Cursor-based pagination (`StartAfter`) for both list endpoints
- [ ] Integration tests: 403 non-admin · 400 invalid role · 404 unknown ID — `services/admin/service_test.go`

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
