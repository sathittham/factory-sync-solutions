# audit.Logger — Event Writer

## Summary

The shared audit writer. Lives in `apps/backend/services/audit/audit.go`; provides a
`Log` method that creates timestamped documents in `audit_events/{uuid}`. Wired into the
profile, quiz, admin, and backoffice services.

## Implementation

- `audit.Logger` — constructed with the Firestore client; a **nil client makes `Log` a
  no-op** (safe in tests and degraded environments).
- `(Logger).Log(ctx, event)` — assigns a UUID document ID, stamps `createdAt` as a UTC
  RFC3339 timestamp, and writes to `audit_events/{uuid}`.
- **Failure is non-fatal by contract:** callers log the audit error and continue — an
  audit write failure must never break the primary business operation.

### Event schema (built)

All fields below, including `targetUID`, `projectID`, and the actor-snapshot fields, are
present on the built model.

| Field | Purpose |
|-------|---------|
| `id` | UUID document ID |
| `actorUID` | Authenticated UID from `middleware.GetUID(r)` — never the request body |
| `actorEmail` / `actorName` | Optional snapshot for backoffice readability |
| `eventType` | Stable machine-readable string (e.g. `user.profile_updated`) |
| `resourceType` | `profile` · `project` · `project_member` · `staff` · `assessment` · `export` · `invitation` |
| `resourceID` | Primary affected resource ID |
| `targetUID` | Affected user/staff UID when different from the actor |
| `projectID` | Company/project scope for project/member/user events |
| `metadata` | Event-specific values (e.g. old/new roles, changed field names) — never secrets, tokens, or raw request bodies |
| `createdAt` | UTC RFC3339 |

### Current write call sites

| Call site | Events | Note |
|-----------|--------|------|
| `services/profile/service.go` | `user.login` · `user.registered` · `user.profile_updated` | Built |
| `services/quiz/service.go` | `assessment.submitted` | Built, but `projectID` is not yet included in the event (`service.go:116`) |
| `services/admin/handler.go` | `admin.export` | Built |
| `services/admin/handler.go` | `user.role_changed` | Built — actor is `middleware.GetUID(r)`, target UID only in `TargetUID` |
| `services/backoffice/handler.go` | `backoffice.*` · `project.*` | Built — writer injected, project/member/staff CRUD events wired |

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
- Given a role change, when logged, then the actor is the admin caller and the target is the affected user.

## Status

- [x] `Logger` / `Log` — `apps/backend/services/audit/audit.go`
- [x] Profile, quiz, and admin-export call sites wired
- [x] `targetUID` / `projectID` (+ actor snapshot) fields on `Event`
- [x] `admin.SetUserRole` actor/target correctness — `services/admin/handler.go`
- [x] Project + backoffice event-type constants — except 5 `project.*` member/ownership events, see [feature-spec.md § 5.2](./feature-spec.md#52-company--project-activity)
- [x] Writer injected into `services/backoffice/handler.go`
- [ ] Nil-client no-op unit test — `services/audit/` test suite (no `audit_test.go` exists yet)

---

*Version: 1.1.0*
*Last updated: 5 July 2026*
