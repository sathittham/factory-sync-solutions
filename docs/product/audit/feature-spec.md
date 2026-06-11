---
version: 1.2.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done — project events planned; query endpoint specced
---

# Audit Logging — Feature Spec

> Backend-only service that writes structured event records to the Firestore
> `audit_events` collection. Events span profile, quiz, and project/RBAC
> services. Write failures are logged but never propagated — the primary
> operation always succeeds or fails independently of audit logging.

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
- Scope each event to a `projectID` so project owners can query their own
  project's history without seeing other projects.
- Degrade gracefully — if Firestore is unavailable, log the error and continue.
- Allow omission at development time (`nil` logger → no-op, debug log only).
- Expose a `GET /api/v1/project/audit` endpoint so Owners and System Admins
  can browse project-scoped events.

### Non-Goals

- System-wide admin audit query (see §9.3 — future work via admin endpoint).
- Admin UI for audit log browsing beyond the API endpoint.
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
| Project event constants | `apps/fs-backend/services/audit/audit.go` | ⏳ Planned |
| Wired in `project.Service` | `apps/fs-backend/services/project/service.go` | ⏳ Planned |
| `GET /project/audit` query endpoint | `apps/fs-backend/services/project/handler.go` | ⏳ Planned |
| Admin-wide audit query | — | ❌ Not implemented (see §9.3) |
| Admin UI for audit log | — | ❌ Not implemented |

---

## 4. Event Types

### 4.1 Existing (profile + quiz)

| Constant | Value | Trigger |
|----------|-------|---------|
| `EventUserRegistered` | `"user.registered"` | `profile.Service.CreateProfile` — after Firestore write |
| `EventUserProfileUpdated` | `"user.profile_updated"` | `profile.Service.UpdateProfile` — after Firestore write |
| `EventUserRoleChanged` | `"user.role_changed"` | `profile.Service.SetRole` — after Firestore write |
| `EventAssessmentSubmitted` | `"assessment.submitted"` | `quiz.Service.SubmitQuiz` — after assessment stored |
| `EventAdminExport` | `"admin.export"` | Defined but **not yet called** — see §8 |

### 4.2 Planned — project & RBAC

| Constant | Value | Trigger |
|----------|-------|---------|
| `EventProjectCreated` | `"project.created"` | `project.Service.CreateProject` — called from `profile.Service.CreateProfile` when first user registers a `companyRegId` |
| `EventProjectSettingsUpdated` | `"project.settings_updated"` | `project.Service.UpdateProject` |
| `EventMemberInvited` | `"project.member_invited"` | `project.Service.CreateInvitation` |
| `EventMemberJoined` | `"project.member_joined"` | `project.Service.AcceptInvitation` |
| `EventMemberRoleChanged` | `"project.member_role_changed"` | `project.Service.ChangeMemberRole` |
| `EventMemberRemoved` | `"project.member_removed"` | `project.Service.RemoveMember` |
| `EventOwnershipTransferred` | `"project.ownership_transferred"` | `project.Service.TransferOwnership` |
| `EventInvitationRevoked` | `"project.invitation_revoked"` | `project.Service.RevokeInvitation` |
| `EventActiveProjectSwitched` | `"project.active_switched"` | `project.Service.SwitchActiveProject` |

---

## 5. `Event` Document Structure

```go
type Event struct {
    ID           string         // UUIDv4 — also the Firestore document ID
    ActorUID     string         // Firebase UID of the user who triggered the action
    EventType    EventType      // typed string constant (see §4)
    ResourceType string         // "profile" | "assessment" | "project" | "project_member" | "invitation"
    ResourceID   string         // document ID of the affected resource
    ProjectID    string         // project context — empty for non-project events; enables project-scoped queries
    Metadata     map[string]any // event-specific payload (see §6)
    CreatedAt    string         // time.Now().UTC().Format(time.RFC3339)
}
```

Firestore collection: `audit_events`. Document ID equals `event.ID` (UUID).

`ProjectID` is populated for all project-scoped events and is also backfilled on
`user.registered` (= the newly created `companyRegId`) and `assessment.submitted`
(= the user's `activeProjectID` at submission time). This lets a project Owner
query all events touching their project in a single index scan.

---

## 6. Event Metadata by Type

### 6.1 Existing events

| Event type | `resourceType` | `resourceID` | `projectID` | `metadata` |
|------------|---------------|--------------|-------------|------------|
| `user.registered` | `"profile"` | `uid` | new `companyRegId` | `{"companyName": "..."}` |
| `user.profile_updated` | `"profile"` | `uid` | user's `activeProjectID` | `nil` |
| `user.role_changed` | `"profile"` | `uid` | `""` (system-level) | `{"role": "admin" \| "user"}` |
| `assessment.submitted` | `"assessment"` | `assessmentID` | user's `activeProjectID` | `{"quizId": "...", "overallScore": 3.47, "diagnosis": "..."}` |
| `admin.export` | — | — | `""` | Constant defined; no call site yet |

### 6.2 Project events (planned)

| Event type | `resourceType` | `resourceID` | `projectID` | `metadata` |
|------------|---------------|--------------|-------------|------------|
| `project.created` | `"project"` | `projectID` | `projectID` | `{"projectName": "...", "industryType": "...", "companySize": "..."}` |
| `project.settings_updated` | `"project"` | `projectID` | `projectID` | `{"changes": {"name": "new name", ...}}` — only changed fields |
| `project.member_invited` | `"invitation"` | `invitationToken` | `projectID` | `{"targetEmail": "...", "role": "..."}` |
| `project.member_joined` | `"project_member"` | `joinedUID` | `projectID` | `{"role": "...", "joinMethod": "invited", "invitedBy": "uid"}` |
| `project.member_role_changed` | `"project_member"` | `targetUID` | `projectID` | `{"targetDisplayName": "...", "oldRole": "...", "newRole": "..."}` |
| `project.member_removed` | `"project_member"` | `targetUID` | `projectID` | `{"targetDisplayName": "...", "role": "..."}` |
| `project.ownership_transferred` | `"project"` | `projectID` | `projectID` | `{"newOwnerUID": "...", "newOwnerDisplayName": "..."}` |
| `project.invitation_revoked` | `"invitation"` | `invitationToken` | `projectID` | `{"targetEmail": "...", "role": "..."}` |
| `project.active_switched` | `"profile"` | `actorUID` | `toProjectID` | `{"fromProjectID": "...", "toProjectID": "..."}` |

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

### `project.Service` (planned)

```
CreateProject          → Log(ctx, uid, EventProjectCreated,          "project",        projectID,   {projectName, industryType, companySize})
UpdateProject          → Log(ctx, uid, EventProjectSettingsUpdated,   "project",        projectID,   {changes})
CreateInvitation       → Log(ctx, uid, EventMemberInvited,            "invitation",     token,       {targetEmail, role})
AcceptInvitation       → Log(ctx, uid, EventMemberJoined,             "project_member", joinedUID,   {role, joinMethod, invitedBy})
ChangeMemberRole       → Log(ctx, uid, EventMemberRoleChanged,        "project_member", targetUID,   {targetDisplayName, oldRole, newRole})
RemoveMember           → Log(ctx, uid, EventMemberRemoved,            "project_member", targetUID,   {targetDisplayName, role})
TransferOwnership      → Log(ctx, uid, EventOwnershipTransferred,     "project",        projectID,   {newOwnerUID, newOwnerDisplayName})
RevokeInvitation       → Log(ctx, uid, EventInvitationRevoked,        "invitation",     token,       {targetEmail, role})
SwitchActiveProject    → Log(ctx, uid, EventActiveProjectSwitched,    "profile",        uid,         {fromProjectID, toProjectID})
```

All `project.Service` calls pass `projectID` as the `ProjectID` field on the event.

### `GET /api/v1/project/audit` (planned)

Project-scoped audit query endpoint in `project.Handler`. Returns events where
`projectID == activeProjectID`, ordered by `createdAt` descending. Requires
`owner` or `system_admin` role.

See §9.5 for full spec.

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

### 9.5 Project audit query endpoint — `GET /api/v1/project/audit`

Expose project-scoped audit history to Owners and System Admins.

**Route:** `GET /api/v1/project/audit`
**Auth:** Firebase token + `owner` or `system_admin` project role
**Firestore query:** `audit_events WHERE projectID == activeProjectID ORDER BY createdAt DESC`

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max results (max 200) |
| `before` | — | ISO 8601 cursor — return events older than this timestamp (pagination) |
| `eventType` | — | Filter by a single event type string (e.g. `project.member_joined`) |
| `actorUID` | — | Filter by the UID of the user who triggered the event |

**Response 200**
```jsonc
{
  "success": true,
  "data": [
    {
      "id":           "uuid",
      "actorUID":     "firebase-uid",
      "actorName":    "Jane Doe",        // display name resolved at query time
      "eventType":    "project.member_role_changed",
      "resourceType": "project_member",
      "resourceID":   "firebase-uid-of-target",
      "projectID":    "0123456789012",
      "metadata": {
        "targetDisplayName": "Bob Smith",
        "oldRole":           "general_user",
        "newRole":           "manager"
      },
      "createdAt":    "2026-06-10T09:15:00Z"
    }
  ],
  "total": 1,
  "hasMore": false,
  "nextCursor": null   // ISO 8601 timestamp for the next page
}
```

**Required composite index:**
`audit_events`: `projectID ASC, createdAt DESC`

**Note:** `actorName` is resolved by joining with `users/{actorUID}.displayName`
at query time (N reads). For the default `limit=50` this is acceptable. Consider
caching or storing a `actorName` snapshot on the event document if query latency
becomes a concern.

---

## 10. Acceptance Criteria

### 10.1 Existing events

- [ ] A new user registration creates an `audit_events` document with `eventType: "user.registered"` and `metadata.companyName`.
- [ ] A profile update creates an `audit_events` document with `eventType: "user.profile_updated"` and `metadata: null`.
- [ ] A role change creates an `audit_events` document with `eventType: "user.role_changed"` and `metadata.role`.
- [ ] A quiz submission creates an `audit_events` document with `eventType: "assessment.submitted"` and `metadata.quizId`, `metadata.overallScore`, `metadata.diagnosis`.
- [ ] All documents have a valid UUIDv4 `id`, non-empty `actorUID`, and a valid RFC3339 `createdAt`.
- [ ] When `fsClient == nil` (dev environment), `Log` is a no-op with no panic.
- [ ] A Firestore write error inside `Log` does not cause the enclosing API request to fail.
- [ ] `make test-api` passes.

### 10.2 Project events (planned)

- [ ] Creating a project writes `eventType: "project.created"` with `projectID` populated and `metadata.projectName`, `metadata.industryType`, `metadata.companySize`.
- [ ] Updating project settings writes `eventType: "project.settings_updated"` with only the changed fields in `metadata.changes`.
- [ ] Sending an invitation writes `eventType: "project.member_invited"` with `metadata.targetEmail` and `metadata.role`.
- [ ] Accepting an invitation writes `eventType: "project.member_joined"` with `metadata.role`, `metadata.joinMethod: "invited"`, and `metadata.invitedBy`.
- [ ] Self-registration writes `eventType: "project.member_joined"` with `metadata.joinMethod: "self_registered"` and `metadata.invitedBy: null`.
- [ ] Changing a member's role writes `eventType: "project.member_role_changed"` with `metadata.oldRole` and `metadata.newRole`.
- [ ] Removing a member writes `eventType: "project.member_removed"` with `metadata.targetDisplayName` and `metadata.role`.
- [ ] Transferring ownership writes `eventType: "project.ownership_transferred"` with `metadata.newOwnerUID` and `metadata.newOwnerDisplayName`.
- [ ] Revoking an invitation writes `eventType: "project.invitation_revoked"` with `metadata.targetEmail` and `metadata.role`.
- [ ] Switching the active project writes `eventType: "project.active_switched"` with `metadata.fromProjectID` and `metadata.toProjectID`.
- [ ] All project events have a non-empty `projectID` field equal to the project being acted on.

### 10.3 Audit query endpoint (planned)

- [ ] `GET /api/v1/project/audit` returns 200 with events for the caller's `activeProjectID` only.
- [ ] Events are ordered by `createdAt` descending.
- [ ] `?eventType=project.member_joined` filters results to that event type only.
- [ ] `?actorUID=<uid>` filters results to actions taken by that user only.
- [ ] `?before=<ISO8601>` returns only events older than the given timestamp (pagination cursor).
- [ ] `?limit=200` is accepted; `?limit=201` is rejected with `400 VALIDATION_ERROR`.
- [ ] Response includes `hasMore: true` and a non-null `nextCursor` when more results exist.
- [ ] A caller with `general_user` or `manager` role receives `403 FORBIDDEN`.
- [ ] A caller from a different project cannot see events for a project they do not own.

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
