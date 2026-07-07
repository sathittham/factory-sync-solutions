# Backoffice Service (backend)

## Summary

The Go service behind the staff portal: route group `/api/v1/backoffice/` in
`apps/backend/services/backoffice/`. It orchestrates existing services rather than owning
data — quiz results via `result.Service`, profiles via `profile.Service`, audit events via
the audit logger/query service (planned), and Firebase custom claims via the Admin SDK
`authClient`.

## Implementation

Service layout (per project convention):

```
services/backoffice/
├── handler.go    — HTTP handlers; route group /api/v1/backoffice/
├── service.go    — business logic (calls existing result, profile services)
└── models.go     — request/response types
```

- Every response goes through `pkg.RespondJSON` / `pkg.RespondList` / `pkg.RespondError` —
  list endpoints return `{"success": true, "data": [...], "count": N}`.
- Actor identity comes from `middleware.GetUID(r)` only.
- Claim management (staff roles, user admin promotion) calls the Firebase Admin SDK
  server-side; a claim value never comes from a client request body.
- Mutation handlers write audit events with the actor UID from context and the target UID
  from the affected record (planned alongside the audit endpoints).
- Endpoint inventory (projects, users, results, staff, audit, stats) is in
  [README.md § API contract](./README.md#api-contract) and, in full, in
  [feature-spec.md §5](./feature-spec.md#5-backend-api--new-route-group-apiv1backoffice).

### Role enforcement

Two layers of `RequireBackofficeRole`: the group-level check admits `superadmin` and
`staff`; destructive routes (project deactivate, user delete, staff management, audit)
nest a second check admitting `superadmin` only.

## Usage

Wiring in `apps/backend/main.go`:

```
# pseudocode — route group registration
route /api/v1/backoffice:
  use middleware.FirebaseAuth(authClient)
  use middleware.RequireBackofficeRole(authClient, "superadmin", "staff")
  backoffice.Handler.Routes(r)

# superadmin-only subroutes additionally:
  use middleware.RequireBackofficeRole(authClient, "superadmin")
```

```
# pseudocode — error mapping in handlers
no/invalid token   → pkg.RespondError(w, 401, "UNAUTHORIZED", msg)
claim absent/wrong → pkg.RespondError(w, 403, "FORBIDDEN", msg)
lookup failed      → pkg.RespondError(w, 404, "NOT_FOUND", msg)
otherwise          → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
```

## Acceptance Criteria

- Given no token, when any `/backoffice/` route is called, then `401`.
- Given a token without a `backofficeRole` claim, when any `/backoffice/` route is called, then `403`.
- Given a `staff` token, when a superadmin-only route (deactivate, user delete, staff, audit) is called, then `403`.
- Given a valid staff+ token, when `GET /backoffice/export` is called, then a `text/csv` body of all results is returned.
- Given a superadmin token, when `PUT /backoffice/staff/{uid}` is called, then the `backofficeRole` claim is set via the Admin SDK and the change is (planned) audit-logged.

## Status

- [x] `handler.go` + `models.go` — `apps/backend/services/backoffice/`
- [x] Projects / users / results / staff / stats endpoints wired in `main.go`
- [ ] Audit endpoints (`GET /backoffice/audit`, `GET /backoffice/users/{uid}/activity`) — planned
- [ ] Audit-event writes from mutation handlers — planned
- [ ] `make test-api` deny-path coverage recorded in [status.md](./status.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
