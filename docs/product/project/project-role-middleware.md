# RequireProjectRole Middleware (backend — planned)

## Summary

Per-project RBAC guard for Chi routes, to be implemented at
`apps/backend/middleware/project_role.go`. Resolves the caller's role in the project in
scope from the denormalized `users/{uid}.projectRoles` map and rejects insufficient
roles with `403 FORBIDDEN`. Nothing is built yet.

## Implementation

- `middleware.RequireProjectRole(svc, allowedRoles...)` — Chi middleware factory; wraps
  a handler and admits the request only when the caller's role in the scoped project is
  one of `allowedRoles`.
- **Project in scope:** the caller's `activeProjectID` by default; an `X-Project-ID`
  request header overrides it, so a client can operate on a non-active project without
  switching context.
- **Role source:** `users/{uid}.projectRoles` — a map already loaded with the user doc
  during `FirebaseAuth`, so the check adds **no extra Firestore read**. The
  `projects/{id}/members/{uid}` subcollection remains the authoritative source; every
  membership write updates both in one transaction, keeping the map trustworthy.
- Returns `403 FORBIDDEN` when the role is insufficient **or** the user is not a member
  of the requested project.

### Role ordering

`owner > system_admin > manager > general_user` — role *assignment* is additionally
capped at the caller's own level in the service layer (Owner assigns anything; System
Admin assigns up to System Admin; see the permission matrix in
[feature-spec.md § 3](./feature-spec.md#3-roles--permission-matrix)).

## Usage

Call sites: `services/project/handler.go` route registration; also
`services/result/handler.go` for `?scope=project`.

```
# pseudocode — route registration
r.With(RequireProjectRole(svc, "owner", "system_admin")).Put("/", h.UpdateProject)
r.With(RequireProjectRole(svc, "manager", "system_admin", "owner")).Get("/members", h.ListMembers)
```

```
# pseudocode — middleware body
uid       := middleware.GetUID(r)                    # never from body/path
projectID := header["X-Project-ID"] or user.activeProjectID
role, ok  := user.projectRoles[projectID]
!ok                      → pkg.RespondError(w, 403, "FORBIDDEN", "not a member")
role not in allowedRoles → pkg.RespondError(w, 403, "FORBIDDEN", "insufficient role")
next.ServeHTTP(w, r)
```

The frontend mirror is `ProjectRoleGuard`, which reads
`projectRoles[activeProjectID]` from Redux (`selectActiveProjectRole`) and redirects to
`/` — UX only; the middleware is the enforcement point.

## Acceptance Criteria

- Given a member with an allowed role in the scoped project, when the route is called, then the request proceeds.
- Given a member with an insufficient role, when the route is called, then `403 FORBIDDEN`.
- Given a non-member (no `projectRoles` entry for the project), when the route is called, then `403 FORBIDDEN`.
- Given an `X-Project-ID` header, when present, then the role check targets that project instead of `activeProjectID`.
- Given the role check, when executed, then no additional Firestore read occurs beyond the user doc already loaded by `FirebaseAuth`.

## Status

- [ ] `middleware/project_role.go` — `RequireProjectRole` factory
- [ ] `projectRoles` map maintained transactionally with member writes — `services/project/service.go`
- [ ] Wired into project + result routes
- [ ] Deny-path tests in `services/project/handler_test.go` (403 insufficient / non-member)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
