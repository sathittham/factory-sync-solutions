---
version: 1.0.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done
---

# Audit Logging — Feature Spec

> Backend-only service that writes structured event records to the Firestore
> `audit_events` collection. Five event types across two services (profile,
> quiz). Write failures are logged but never propagated — the primary operation
> always succeeds or fails independently of audit logging.

---

## 1. Summary

The audit logger (`apps/fs-backend/services/audit/audit.go`) provides a single
`Log` method that creates a timestamped document in `audit_events/{uuid}`.
It is injected as a dependency into `profile.Service` and `quiz.Service` via
`SetAuditLogger` and called at key mutation points.

No HTTP handler, no query API, and no admin UI exist for reading audit events —
they are queryable directly from the Firestore console or via a future reporting
endpoint.

---

## 2. Goals & Non-Goals

### Goals

- Record who did what, to which resource, and when, for every significant
  mutation in the system.
- Degrade gracefully — if Firestore is unavailable, log the error and continue.
- Allow omission at development time (`nil` logger → no-op, debug log only).

### Non-Goals

- Reading or querying audit events via an API (no endpoint exists).
- Admin UI for audit log browsing (future work).
- Compliance-grade immutability (Firestore documents can currently be edited by
  service accounts — use Firestore security rules if this is required).
- Audit logging for read operations (`GET` endpoints).
- Log rotation or archival (managed via Firestore TTL policies if needed).

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| `Logger` / `Log` | `apps/fs-backend/services/audit/audit.go` | ✅ Built |
| `Event` model | `apps/fs-backend/services/audit/audit.go` | ✅ Built |
| Wired in `profile.Service` | `apps/fs-backend/services/profile/service.go` | ✅ Built |
| Wired in `quiz.Service` | `apps/fs-backend/services/quiz/service.go` | ✅ Built |
| `auditLogger` init in `main.go` | line 69–70 | ✅ Built |
| `SetAuditLogger` called in `main.go` | lines 119, 130 | ✅ Built |
| Read / query API | — | ❌ Not implemented |
| Admin UI for audit log | — | ❌ Not implemented |

---

## 4. Event Types

Five event types are defined as typed string constants:

| Constant | Value | Trigger |
|----------|-------|---------|
| `EventUserRegistered` | `"user.registered"` | `profile.Service.CreateProfile` — after Firestore write |
| `EventUserProfileUpdated` | `"user.profile_updated"` | `profile.Service.UpdateProfile` — after Firestore write |
| `EventUserRoleChanged` | `"user.role_changed"` | `profile.Service.SetRole` — after Firestore write |
| `EventAssessmentSubmitted` | `"assessment.submitted"` | `quiz.Service.SubmitQuiz` — after assessment stored |
| `EventAdminExport` | `"admin.export"` | Defined but **not yet called** — see §8 |

---

## 5. `Event` Document Structure

```go
type Event struct {
    ID           string         // UUIDv4 — also the Firestore document ID
    ActorUID     string         // Firebase UID of the user who triggered the action
    EventType    EventType      // one of the five constants above
    ResourceType string         // "profile" | "assessment"
    ResourceID   string         // document ID of the affected resource
    Metadata     map[string]any // event-specific payload (see §6)
    CreatedAt    string         // time.Now().UTC().Format(time.RFC3339)
}
```

Firestore collection: `audit_events`. Document ID equals `event.ID` (UUID).

---

## 6. Event Metadata by Type

| Event type | `resourceType` | `resourceID` | `metadata` |
|------------|---------------|--------------|------------|
| `user.registered` | `"profile"` | `uid` | `{"companyName": "..."}` |
| `user.profile_updated` | `"profile"` | `uid` | `nil` |
| `user.role_changed` | `"profile"` | `uid` | `{"role": "admin" \| "user"}` |
| `assessment.submitted` | `"assessment"` | `assessmentID` | `{"quizId": "...", "overallScore": 3.47, "diagnosis": "..."}` |
| `admin.export` | — | — | Constant defined; no call site yet |

---

## 7. Logger Behaviour

```go
func (l *Logger) Log(ctx, actorUID, eventType, resourceType, resourceID, metadata) {
    if l.fsClient == nil {
        slog.Debug("audit logger: no firestore client, skipping event", ...)
        return
    }
    event := Event{ ID: uuid.New(), ActorUID: actorUID, ... }
    fsClient.Collection("audit_events").Doc(event.ID).Set(ctx, event)
    // write error → slog.Error only, never returned
}
```

**Key properties:**
- Passing `nil` to `NewLogger` is valid — produces a no-op logger with a debug
  log. Safe for local development and unit tests.
- All write errors are swallowed after being logged with `slog.Error`. The
  calling service never sees them.
- `Log` is called **synchronously** (not in a goroutine) — it runs in the same
  request context as the primary operation. Firestore latency adds to the
  response time for audited operations.

---

## 8. Call Sites

### `profile.Service`

```
CreateProfile  → Log(ctx, uid, EventUserRegistered,     "profile",    uid, {companyName})
SetRole        → Log(ctx, uid, EventUserRoleChanged,    "profile",    uid, {role})
UpdateProfile  → Log(ctx, uid, EventUserProfileUpdated, "profile",    uid, nil)
```

### `quiz.Service`

```
SubmitQuiz     → Log(ctx, uid, EventAssessmentSubmitted, "assessment", assessmentID,
                     {quizId, overallScore, diagnosis})
```

### Not yet called

`EventAdminExport` is defined but `admin.Handler.ExportCSV` does not call
`auditLogger.Log`. See §9.1.

---

## 9. Open Tasks

### 9.1 Wire `EventAdminExport`

`EventAdminExport` is declared in `audit.go` but has no call site.
`admin.Handler` does not currently have an `auditLogger` dependency.

**Fix:** Inject `*audit.Logger` into `admin.Handler` (similar to how it is
injected into `profile.Service` and `quiz.Service`) and call:
```go
auditLogger.Log(ctx, uid, audit.EventAdminExport, "export", "assessments.csv",
    map[string]any{"count": len(enriched)})
```
in `ExportCSV` after the CSV is streamed.

### 9.2 Consider async logging

`Log` is synchronous. For low-frequency events (registration, role change) this
is fine. For `assessment.submitted` (could be frequent), a goroutine would
decouple audit latency from API response time — at the cost of losing the request
context (use `context.Background()`).

### 9.3 Add a query API for admin

There is no way for operators to search audit events except via the Firestore
console. A future `GET /api/v1/admin/audit` endpoint could expose recent events
filtered by `actorUID`, `eventType`, or date range, using `RequireAdmin`.

### 9.4 Firestore TTL policy

Audit documents are never deleted. If storage cost or PDPA data-retention limits
become a concern, add a Firestore TTL field (`expiresAt`) and configure a TTL
policy in the Firestore console.

---

## 10. Acceptance Criteria

- [ ] A new user registration creates an `audit_events` document with `eventType: "user.registered"` and `metadata.companyName`.
- [ ] A profile update creates an `audit_events` document with `eventType: "user.profile_updated"` and `metadata: null`.
- [ ] A role change creates an `audit_events` document with `eventType: "user.role_changed"` and `metadata.role`.
- [ ] A quiz submission creates an `audit_events` document with `eventType: "assessment.submitted"` and `metadata.quizId`, `metadata.overallScore`, `metadata.diagnosis`.
- [ ] All documents have a valid UUIDv4 `id`, non-empty `actorUID`, and a valid RFC3339 `createdAt`.
- [ ] When `fsClient == nil` (dev environment), `Log` is a no-op with no panic.
- [ ] A Firestore write error inside `Log` does not cause the enclosing API request to fail.
- [ ] `make test-api` passes.

---

## 11. Testing

- **Unit (`audit_test.go` — to be written):**
  - `Log` with `nil` fsClient → no panic, returns immediately.
  - `Log` with a mock Firestore client → document is written with correct fields.
  - Firestore mock returns an error → error is logged, no panic, no return error.
- **Integration:**
  - `CreateProfile` writes an `audit_events` doc with `eventType: "user.registered"`.
  - `SubmitQuiz` writes an `audit_events` doc with `eventType: "assessment.submitted"` containing the correct `overallScore`.

---

## 12. References

- Audit logger: [audit/audit.go](../../../apps/fs-backend/services/audit/audit.go)
- Profile service call sites: [profile/service.go](../../../apps/fs-backend/services/profile/service.go)
- Quiz service call site: [quiz/service.go](../../../apps/fs-backend/services/quiz/service.go)
- Wiring in main: [main.go](../../../apps/fs-backend/main.go)
- Admin handler (missing call site): [admin/handler.go](../../../apps/fs-backend/services/admin/handler.go)
