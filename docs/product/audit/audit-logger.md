# audit.Logger — Event Writer

## Summary

The shared audit writer. Lives in `apps/backend/services/audit/audit.go`; provides a
`Log` method that creates timestamped documents in `audit_events/{uuid}`. Wired into the
profile and quiz services and partially into the admin handler (CSV export).

## Implementation

- `audit.Logger` — constructed with the Firestore client; a **nil client makes `Log` a
  no-op** (safe in tests and degraded environments).
- `(Logger).Log(ctx, event)` — assigns a UUID document ID, stamps `createdAt` as a UTC
  RFC3339 timestamp, and writes to `audit_events/{uuid}`.
- **Failure is non-fatal by contract:** callers log the audit error and continue — an
  audit write failure must never break the primary business operation.

### Event schema (target)

The built model has the base fields; `targetUID` and `projectID` (and actor snapshot
fields) are target-schema additions **not yet implemented**.

| Field | Purpose |
|-------|---------|
| `id` | UUID document ID |
| `actorUID` | Authenticated UID from `middleware.GetUID(r)` — never the request body |
| `actorEmail` / `actorName` | Optional snapshot for backoffice readability |
| `eventType` | Stable machine-readable string (e.g. `user.profile_updated`) |
| `resourceType` | `profile` · `project` · `project_member` · `staff` · `assessment` · `export` · `invitation` |
| `resourceID` | Primary affected resource ID |
| `targetUID` | Affected user/staff UID when different from the actor *(pending)* |
| `projectID` | Company/project scope for project/member/user events *(pending)* |
| `metadata` | Event-specific values (e.g. old/new roles, changed field names) — never secrets, tokens, or raw request bodies |
| `createdAt` | UTC RFC3339 |

### Current write call sites

| Call site | Events | Note |
|-----------|--------|------|
| `services/profile/service.go` | `user.login` · `user.registered` · `user.profile_updated` | Built |
| `services/quiz/service.go` | `assessment.submitted` | Built |
| `services/admin/handler.go` | `admin.export` | Built |
| `services/admin/handler.go` | `user.role_changed` | ⚠️ Bug: logs the **target** UID as actor; actor must be the admin caller, target the affected UID |
| `services/backoffice/handler.go` | `backoffice.*` | Not implemented — writer not yet injected |

## Usage

```
# pseudocode — fire-and-forget from a service mutation
err := auditLogger.Log(ctx, Event{
    actorUID:     middleware.GetUID(r),
    eventType:    "user.profile_updated",
    resourceType: "profile",
    resourceID:   "profile:" + uid,
    metadata:     { changedFields: [...] },
})
if err != nil → log warning, continue        # never fail the mutation
```

## Acceptance Criteria

- Given a nil Firestore client, when `Log` is called, then it is a no-op and returns without error.
- Given a successful mutation, when the audit write fails, then the mutation's response is unaffected (failure is logged only).
- Given any event, when written, then `actorUID` came from `middleware.GetUID(r)` and `createdAt` is UTC RFC3339.
- Given a role change, when logged, then the actor is the admin caller and the target is the affected user (currently violated — see call-site table).

## Status

- [x] `Logger` / `Log` — `apps/backend/services/audit/audit.go`
- [x] Profile, quiz, and admin-export call sites wired
- [ ] Add `targetUID` / `projectID` (+ actor snapshot) fields to `Event`
- [ ] Fix `admin.SetUserRole` actor/target correctness — `services/admin/handler.go`
- [ ] Project + backoffice event-type constants
- [ ] Inject writer into `services/backoffice/handler.go`
- [ ] Nil-client no-op unit test — `services/audit/` test suite

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
