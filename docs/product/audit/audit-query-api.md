# Audit Query APIs

## Summary

The four read endpoints over `audit_events` — one built (personal activity, served by the
profile service), three planned (project audit and the two superadmin backoffice
lookups). Each surface is scoped by role so a caller can only ever read events they are
entitled to.

## Implementation

### Built — `GET /api/v1/profile/activity`

Returns recent events where `actorUID == callerUID` **or** `targetUID == callerUID`; the
data source for the web-app Profile activity tab. Handler:
`apps/backend/services/profile/handler.go`.

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max `100` |
| `before` | none | RFC3339 cursor — return older events |
| `eventType` | none | Optional exact event type |

### Planned — `GET /api/v1/project/audit`

Events where `projectID == activeProjectID`, newest first. Caller must be `owner` or
`system_admin` in the active project. Params: `limit` (default 50, max 200), `before`,
`eventType`, `actorUID`, `targetUID`. Must never return another project's events.

### Planned — `GET /api/v1/backoffice/audit`

Platform-wide search for `backofficeRole == "superadmin"`. Params: `limit` (default 100,
max 500), `before`, `eventType`, `actorUID`, `targetUID`, `projectID`, `resourceType`.

### Planned — `GET /api/v1/backoffice/users/{uid}/activity`

Events where `actorUID == uid` or `targetUID == uid` — powers a "View Activity" action on
the Backoffice Users page so a superadmin can inspect one user's or staff member's
timeline without hand-building filters. Superadmin only.

### Firestore indexes

Combined filters + `createdAt DESC` ordering require composite indexes in
`firestore.indexes.json`:

| Fields | Serves |
|--------|--------|
| `actorUID ASC, createdAt DESC` | Personal activity by actor |
| `targetUID ASC, createdAt DESC` | Backoffice user/staff lookup |
| `projectID ASC, createdAt DESC` | Project audit |
| `eventType ASC, createdAt DESC` | Superadmin event filter |
| `resourceType ASC, createdAt DESC` | Superadmin resource filter |

If Firestore rejects a combined filter, add the exact index from the error link and
document it in the spec.

## Usage

```
# pseudocode — role gates per endpoint
/profile/activity          → uid := middleware.GetUID(r); query actorUID == uid OR targetUID == uid
/project/audit             → require role(owner | system_admin) in activeProject; query projectID == activeProjectID
/backoffice/audit          → require claim backofficeRole == "superadmin"
/backoffice/users/{uid}/…  → require superadmin; query actorUID == uid OR targetUID == uid
```

```
# pseudocode — envelope
ok            → pkg.RespondList(w, events, count)       # {"success":true,"data":[...],"count":N}
wrong role    → pkg.RespondError(w, 403, "FORBIDDEN", msg)
no/bad token  → pkg.RespondError(w, 401, "UNAUTHORIZED", msg)
```

Consumers: web-app Profile activity tab (built), web-app project-audit tab and
web-backoffice audit pages (planned — see [user-journeys.md](./user-journeys.md)).

## Acceptance Criteria

- Given an authenticated user, when `GET /profile/activity` is called, then only events where the caller is actor or target are returned.
- Given a caller who is not `owner` / `system_admin`, when `GET /project/audit` is called, then `403 FORBIDDEN`.
- Given a valid project-audit call, when results return, then no event from another `projectID` is included.
- Given a `staff` backoffice user, when either backoffice audit endpoint is called, then `403 FORBIDDEN`.
- Given a superadmin, when `GET /backoffice/users/{uid}/activity` is called, then both actor and target events for that UID are returned.

## Status

- [x] `GET /profile/activity` — `apps/backend/services/profile/handler.go`
- [ ] `GET /project/audit` — planned route
- [ ] `GET /backoffice/audit` — planned route
- [ ] `GET /backoffice/users/{uid}/activity` — planned route
- [ ] Composite indexes in `firestore.indexes.json` (add as queries land)
- [ ] Query-builder unit tests for actor / target / project / backoffice filters

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
