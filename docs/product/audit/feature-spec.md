---
version: 1.3.0
lastUpdated: 2026-06-14
author: Sathittham Sangthong
status: Partially built - personal activity exists; project/backoffice audit views planned
---

# Audit Logging - Feature Spec

> Structured audit events are written to Firestore collection
> `audit_events`. The goal is to let each user review their own activity, let
> company owners/system admins review activity inside their project, and let
> FactorySync superadmins audit user/staff CRUD in backoffice.

---

## 1. Summary

The audit logger (`apps/backend/services/audit/audit.go`) provides a `Log`
method that creates timestamped documents in `audit_events/{uuid}`. It is
already wired into profile and quiz services and partially wired into admin
export.

The product direction is:

- Every authenticated user has a personal activity log in `web-app`.
- Project Owners and System Admins can review company/project activity.
- FactorySync Super Admins can review every user's activity and all backoffice
  staff/user/project CRUD events in `web-backoffice`.
- Audit write failures must never break the primary business operation.

---

## 2. Goals & Non-Goals

### Goals

- Record who did what, to which resource, and when, for every meaningful
  mutation.
- Store enough context to answer both actor-centric questions ("what did this
  user do?") and target-centric questions ("what happened to this user/staff
  member/project?").
- Scope project/company events to `projectID` so customer admins only see their
  own company's activity.
- Expose personal activity through `GET /api/v1/profile/activity`.
- Expose project/company activity through `GET /api/v1/project/audit`.
- Expose superadmin audit search through `/api/v1/backoffice/audit` and
  `/api/v1/backoffice/users/{uid}/activity`.
- Render activity in `web-app` Profile and in `web-backoffice` user/staff
  audit views.
- Degrade gracefully when Firestore audit writes fail.

### Non-Goals

- Compliance-grade immutability. Firestore service accounts can still edit
  documents unless additional controls are added.
- Audit logging every read operation. Export/download operations are audited,
  but ordinary `GET` page reads are not.
- Full SIEM integration or long-term archival in this phase.

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| `Logger` / `Log` | `apps/backend/services/audit/audit.go` | Built |
| Base `Event` model | `apps/backend/services/audit/audit.go` | Built, needs `projectID`/target fields |
| `profile.Service` audit writes | `apps/backend/services/profile/service.go` | Built |
| `quiz.Service` audit writes | `apps/backend/services/quiz/service.go` | Built |
| `GET /profile/activity` | `apps/backend/services/profile/handler.go` | Built |
| `ProfilePage` activity tab | `apps/web-app/src/pages/ProfilePage.tsx` | Built, route/use-date cleanup needed |
| `admin.export` audit write | `apps/backend/services/admin/handler.go` | Built |
| `admin.SetUserRole` actor correctness | `apps/backend/services/admin/handler.go` | Needs fix; currently logs target UID as actor |
| Backoffice audit writer injection | `apps/backend/services/backoffice/handler.go` | Not implemented |
| Project/company event constants | `apps/backend/services/audit/audit.go` | Not implemented |
| Staff/user CRUD event constants | `apps/backend/services/audit/audit.go` | Not implemented |
| `GET /project/audit` | planned route | Not implemented |
| `GET /backoffice/audit` | planned route | Not implemented |
| Backoffice audit UI | `apps/web-backoffice` | Not implemented |

---

## 4. Event Document Structure

Target schema:

```go
type Event struct {
    ID           string         `json:"id" firestore:"id"`
    ActorUID     string         `json:"actorUID" firestore:"actorUID"`
    ActorEmail   string         `json:"actorEmail,omitempty" firestore:"actorEmail,omitempty"`
    ActorName    string         `json:"actorName,omitempty" firestore:"actorName,omitempty"`
    EventType    EventType      `json:"eventType" firestore:"eventType"`
    ResourceType string         `json:"resourceType" firestore:"resourceType"`
    ResourceID   string         `json:"resourceID" firestore:"resourceID"`
    TargetUID    string         `json:"targetUID,omitempty" firestore:"targetUID,omitempty"`
    ProjectID    string         `json:"projectID,omitempty" firestore:"projectID,omitempty"`
    Metadata     map[string]any `json:"metadata,omitempty" firestore:"metadata,omitempty"`
    CreatedAt    string         `json:"createdAt" firestore:"createdAt"`
}
```

Field intent:

| Field | Purpose |
|-------|---------|
| `actorUID` | Authenticated UID from `middleware.GetUID(r)`, never request body |
| `actorEmail` / `actorName` | Optional snapshot for backoffice readability |
| `eventType` | Stable machine-readable event string |
| `resourceType` | Resource category: `profile`, `project`, `project_member`, `staff`, `assessment`, `export`, `invitation` |
| `resourceID` | Primary affected resource ID |
| `targetUID` | User/staff UID affected by an action, when different from actor |
| `projectID` | Company/project scope for project/member/user events |
| `metadata` | Event-specific values such as old/new roles |
| `createdAt` | UTC RFC3339 timestamp |

---

## 5. Event Types

### 5.1 Personal User Activity

| Event type | Trigger | Resource | Notes |
|------------|---------|----------|-------|
| `user.login` | `POST /profile/activity/login` | `user:{actorUID}` | Includes parsed/displayable user agent metadata |
| `user.registered` | `POST /profile` | `profile:{actorUID}` | Include `projectID`/company registration ID |
| `user.profile_updated` | `PUT /profile` | `profile:{actorUID}` | Include changed field names |
| `user.role_changed` | Admin/backoffice role change | `profile:{targetUID}` | Actor must be admin/superadmin UID, target is affected UID |
| `assessment.submitted` | Quiz submission | `assessment:{assessmentID}` | Include `projectID`, quiz ID, score, diagnosis |
| `admin.export` | Result CSV export | `export:assessments.csv` | Include row count and caller |

### 5.2 Company / Project Activity

| Event type | Trigger |
|------------|---------|
| `project.created` | Project created by registration or backoffice |
| `project.settings_updated` | Company/project settings changed |
| `project.deactivated` | Backoffice superadmin deactivates project |
| `project.reactivated` | Backoffice superadmin reactivates project |
| `project.member_invited` | Owner/system admin/backoffice invites user |
| `project.member_joined` | User accepts invitation |
| `project.member_role_changed` | Project role changes |
| `project.member_removed` | Member removed from company/project |
| `project.ownership_transferred` | Owner changes |
| `project.invitation_revoked` | Invitation revoked |
| `project.active_switched` | User switches active project |

### 5.3 Backoffice Staff/User CRUD Activity

| Event type | Trigger | Role |
|------------|---------|------|
| `backoffice.user_deleted` | `DELETE /backoffice/users/{uid}` | superadmin |
| `backoffice.user_role_changed` | `PUT /backoffice/users/{uid}/role` | superadmin |
| `backoffice.staff_role_granted` | Add new `backofficeRole` claim | superadmin |
| `backoffice.staff_role_changed` | Change existing `backofficeRole` claim | superadmin |
| `backoffice.staff_role_revoked` | Remove `backofficeRole` claim | superadmin |
| `backoffice.project_created` | `POST /backoffice/projects` | staff+ |
| `backoffice.project_updated` | `PUT /backoffice/projects/{projectID}` | staff+ |
| `backoffice.project_deactivated` | deactivate endpoint | superadmin |
| `backoffice.project_reactivated` | reactivate endpoint | superadmin |
| `backoffice.project_member_role_changed` | Backoffice changes company member role | staff+ |
| `backoffice.project_member_removed` | Backoffice removes company member | staff+ |

Backoffice events may duplicate the project-level event category intentionally.
The project event answers "what happened in this company"; the backoffice event
answers "what did FactorySync staff do".

---

## 6. Query APIs

### 6.1 Personal Activity - `GET /api/v1/profile/activity`

Returns recent events where `actorUID == callerUID` or `targetUID == callerUID`.
This is the data source for the user's Profile activity tab.

**Auth:** authenticated user

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max `100` |
| `before` | none | RFC3339 cursor, return older events |
| `eventType` | none | Optional exact event type |

### 6.2 Project Activity - `GET /api/v1/project/audit`

Returns events where `projectID == activeProjectID`, ordered by newest first.
Requires the caller to be `owner` or `system_admin` in the active project.

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max `200` |
| `before` | none | RFC3339 cursor |
| `eventType` | none | Optional exact event type |
| `actorUID` | none | Filter by actor |
| `targetUID` | none | Filter by affected user/member |

### 6.3 Backoffice Audit Search - `GET /api/v1/backoffice/audit`

Returns platform-wide audit events for FactorySync superadmins.

**Auth:** `backofficeRole == "superadmin"`

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `100` | Max `500` |
| `before` | none | RFC3339 cursor |
| `eventType` | none | Optional exact event type |
| `actorUID` | none | Filter by actor |
| `targetUID` | none | Filter by affected user/staff |
| `projectID` | none | Filter by company/project |
| `resourceType` | none | Filter by resource category |

### 6.4 User Activity Lookup - `GET /api/v1/backoffice/users/{uid}/activity`

Returns events where `actorUID == uid` or `targetUID == uid`.

**Auth:** `backofficeRole == "superadmin"`

This endpoint powers a "View Activity" action on the Backoffice Users page and
lets superadmins inspect a specific user's or staff member's timeline without
building a complex filter manually.

---

## 7. UI Requirements

### `web-app`

- Add or keep an Activity tab on the user's profile page/dialog.
- Show personal events with localized labels via `useLocale()`.
- Format event timestamps with `formatDateTime()` from `@/lib/dayjs`.
- Do not expose other users' events in the user app.
- Company/project audit can be a separate tab visible only to `owner` and
  `system_admin`.

### `web-backoffice`

- Add an Audit page visible only to superadmins.
- Add "View Activity" from each user detail dialog.
- Add staff activity visibility from Staff page rows.
- Show actor, target, event type, company/project, timestamp, and metadata.
- Provide filters for actor, target, project, event type, and date cursor.
- Staff role users must not see audit pages or superadmin audit APIs.

---

## 8. Firestore Indexes

Required composite indexes:

| Collection | Fields | Purpose |
|------------|--------|---------|
| `audit_events` | `actorUID ASC, createdAt DESC` | Personal activity by actor |
| `audit_events` | `targetUID ASC, createdAt DESC` | Backoffice user/staff lookup |
| `audit_events` | `projectID ASC, createdAt DESC` | Project audit |
| `audit_events` | `eventType ASC, createdAt DESC` | Superadmin event filter |
| `audit_events` | `resourceType ASC, createdAt DESC` | Superadmin resource filter |

If Firestore rejects combined filters without a composite index, add the exact
index from the error link and document it here.

---

## 9. Security Rules

- UID is always read from `middleware.GetUID(r)`.
- Superadmin audit endpoints must check Firebase custom claim
  `backofficeRole == "superadmin"`.
- Project audit endpoint must verify `owner` or `system_admin` for the active
  project.
- Do not store secrets, ID tokens, full request bodies, or PII-heavy payloads in
  metadata.
- Metadata should store field names and old/new role/status values, not raw
  sensitive values unless needed for audit.

---

## 10. Acceptance Criteria

### Existing Personal Events

- [ ] Login creates `user.login` for the caller.
- [ ] Registration creates `user.registered` with `projectID`.
- [ ] Profile update creates `user.profile_updated` with changed field names.
- [ ] Quiz submission creates `assessment.submitted` with `projectID`, quiz ID,
      score, and diagnosis.
- [ ] `GET /profile/activity` returns only the caller's own actor/target events.
- [ ] Profile Activity UI formats dates with `formatDateTime()`.

### Project / Company Events

- [ ] Project create/update/deactivate/reactivate write project-scoped events.
- [ ] Member invite/join/role-change/remove write project-scoped events.
- [ ] `GET /project/audit` requires `owner` or `system_admin`.
- [ ] `GET /project/audit` never returns events for another project.

### Backoffice Events

- [ ] Backoffice user delete and role changes write events with correct actor
      and target UID.
- [ ] Staff role grant/change/revoke writes events with old/new role metadata.
- [ ] Backoffice project/member CRUD writes events with `projectID`.
- [ ] `GET /backoffice/audit` requires superadmin.
- [ ] `GET /backoffice/users/{uid}/activity` returns actor and target events
      for that UID.
- [ ] Backoffice Audit page is hidden from `staff` users.

---

## 11. Testing

- Unit test `audit.Logger` nil-client no-op behavior.
- Unit test audit query builders for actor, target, project, and backoffice
  filters.
- Backend integration tests for each mutation handler that should write an
  event.
- Frontend tests for Profile Activity empty, loading, and populated states.
- Frontend tests for Backoffice Audit role gating and filter behavior.

---

## 12. References

- Audit logger: [audit/audit.go](../../../apps/backend/services/audit/audit.go)
- Profile service call sites: [profile/service.go](../../../apps/backend/services/profile/service.go)
- Profile handler activity routes: [profile/handler.go](../../../apps/backend/services/profile/handler.go)
- Quiz service call sites: [quiz/service.go](../../../apps/backend/services/quiz/service.go)
- Backoffice spec: [backoffice/feature-spec.md](../backoffice/feature-spec.md)
- Profile spec: [profile/feature-spec.md](../profile/feature-spec.md)
