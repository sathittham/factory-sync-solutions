---
version: 1.1.0
lastUpdated: 2026-06-14
author: Sathittham Sangthong
---

# Backoffice API Reference

All endpoints are under base path `/api/v1/backoffice/` and require:

- `Authorization: Bearer {firebase-id-token}` header
- `backofficeRole ∈ {"superadmin", "staff"}` Firebase custom claim

Requests that lack a valid token return **401 UNAUTHORIZED**. Valid tokens with
no `backofficeRole` claim return **403 FORBIDDEN**.

Superadmin-only routes apply a second `RequireBackofficeRole(authClient, "superadmin")`
check and return **403** for `staff` callers.

See [ADR-022](../architecture/decisions.md#adr-022) for claim design rationale and
[product/backoffice/feature-spec.md](../product/backoffice/feature-spec.md) for the
full RBAC matrix.

---

## 1. Dashboard Stats

### `GET /backoffice/stats`

Returns aggregate platform counts for the dashboard summary cards.

**Role**: staff+

**Response 200**
```json
{
  "success": true,
  "data": {
    "projectCount": 24,
    "userCount": 187,
    "avgScore": 3.41,
    "staffCount": 8
  }
}
```

---

## 2. Projects

### `GET /backoffice/projects`

List all projects with optional search/filter.

**Role**: staff+

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by company name (prefix match) |
| `industry` | string | Filter by `industryType` value |
| `status` | `active` \| `inactive` | Filter by project status |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "projectID":    "0105567001234",
      "name":         "Acme Co., Ltd.",
      "companyRegId": "0105567001234",
      "industryType": "manufacturing",
      "companySize":  "medium",
      "memberCount":  5,
      "isActive":     true,
      "createdAt":    "2026-06-01T08:00:00Z"
    }
  ],
  "total": 24
}
```

---

### `POST /backoffice/projects`

Create a new project (company workspace).

**Role**: staff+

**Request body**
```json
{
  "name":         "Beta Ltd.",
  "companyRegId": "9876543210987",
  "industryType": "food",
  "companySize":  "small"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "projectID": "9876543210987"
  }
}
```

---

### `GET /backoffice/projects/{projectID}`

Get full detail for a single project.

**Role**: staff+

**Response 200**
```json
{
  "success": true,
  "data": {
    "projectID":    "0105567001234",
    "name":         "Acme Co., Ltd.",
    "companyRegId": "0105567001234",
    "industryType": "manufacturing",
    "companySize":  "medium",
    "ownerUID":     "firebase-uid-abc",
    "memberCount":  5,
    "isActive":     true,
    "createdAt":    "2026-06-01T08:00:00Z",
    "updatedAt":    "2026-06-10T09:00:00Z"
  }
}
```

**Error 404** — project not found

---

### `PUT /backoffice/projects/{projectID}`

Update project metadata (name, industry, size).

**Role**: staff+

**Request body** (all fields optional — send only those to change)
```json
{
  "name":         "Acme Factory Co., Ltd.",
  "industryType": "automotive",
  "companySize":  "large"
}
```

**Response 200**
```json
{ "success": true }
```

---

### `POST /backoffice/projects/{projectID}/deactivate`

Mark a project as inactive. Deactivated projects are hidden from the end-user
app but remain in Firestore.

**Role**: superadmin only

**Response 200**
```json
{ "success": true }
```

**Error 403** — caller is `staff`, not `superadmin`

---

### `POST /backoffice/projects/{projectID}/reactivate`

Restore a previously deactivated project to active status.

**Role**: superadmin only

**Response 200**
```json
{ "success": true }
```

---

### `GET /backoffice/projects/{projectID}/members`

List all members of a project with their roles.

**Role**: staff+

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uid":       "firebase-uid-abc",
      "name":      "Jane Doe",
      "email":     "jane@acme.co",
      "role":      "owner",
      "joinedAt":  "2026-06-10T08:00:00Z"
    }
  ]
}
```

---

### `PUT /backoffice/projects/{projectID}/members/{uid}/role`

Change the project role of a member.

**Role**: staff+

**Request body**
```json
{
  "role": "manager"
}
```

Valid roles: `owner`, `system_admin`, `manager`, `general_user`

**Response 200**
```json
{ "success": true }
```

---

### `DELETE /backoffice/projects/{projectID}/members/{uid}`

Remove a member from a project. Does not delete the user account.

**Role**: staff+

**Response 200**
```json
{ "success": true }
```

---

### `POST /backoffice/projects/{projectID}/invite-owner`

Create or reuse a pending Firebase Auth user, assign the customer `owner` role
claim, persist an `invitations/{uid}` document for the selected project, and send
a branded `/auth/action` password setup invitation email.

**Role**: staff+

**Request body**
```json
{
  "email": "newowner@acme.co"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid",
    "email": "newowner@acme.co",
    "projectID": "0123456789012",
    "projectRole": "owner",
    "expiresAt": "2026-06-15T10:00:00Z"
  }
}
```

**Error 404** — project not found
**Error 409** — user already has a completed profile or is already a member of this project

---

## 3. Users

### `GET /backoffice/users`

List all user accounts across all projects.

**Role**: staff+

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by name or email |
| `projectID` | string | Filter by project membership |
| `role` | string | Filter by `role` claim (`user`, `admin`) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uid":       "firebase-uid-abc",
      "name":      "Jane Doe",
      "email":     "jane@acme.co",
      "company":   "Acme Co., Ltd.",
      "projectID": "0105567001234",
      "role":      "admin",
      "createdAt": "2026-06-10T08:00:00Z"
    }
  ],
  "total": 187
}
```

---

### `GET /backoffice/users/{uid}`

Get full profile detail for a single user.

**Role**: staff+

**Response 200**
```json
{
  "success": true,
  "data": {
    "uid":          "firebase-uid-abc",
    "name":         "Jane Doe",
    "email":        "jane@acme.co",
    "company":      "Acme Co., Ltd.",
    "projectID":    "0105567001234",
    "role":         "admin",
    "industryType": "manufacturing",
    "companySize":  "medium",
    "companyRegId": "0105567001234",
    "createdAt":    "2026-06-10T08:00:00Z",
    "updatedAt":    "2026-06-10T09:00:00Z"
  }
}
```

**Error 404** — user not found

---

### `DELETE /backoffice/users/{uid}`

Permanently delete a user account (Firebase Auth + Firestore profile).

**Role**: superadmin only

**Response 200**
```json
{ "success": true }
```

**Error 403** — caller is `staff`, not `superadmin`
**Error 404** — user not found

**Side effects:** Audit event `backoffice.user_deleted` written with actor UID
from auth context and `targetUID` equal to `{uid}`.

---

### `PUT /backoffice/users/{uid}/role`

Promote or demote the `role` Firebase custom claim for a customer-facing user
(controls access to `/admin` in `fs-app-web`).

**Role**: superadmin only

**Request body**
```json
{
  "role": "admin"
}
```

Valid values: `"admin"`, `"user"`

**Response 200**
```json
{ "success": true }
```

**Side effects:** Audit event `backoffice.user_role_changed` written with old
and new role metadata.

---

## 4. Quiz Results

### `GET /backoffice/results`

List all quiz results across all projects, enriched with company profile data.

**Role**: staff+

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Filter by company name |
| `projectID` | string | Filter by project |
| `diagnosis` | string | Filter by diagnosis category |
| `from` | RFC3339 date | Start of date range (submittedAt) |
| `to` | RFC3339 date | End of date range (submittedAt) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "assessmentID": "abc123",
      "projectID":    "0105567001234",
      "company":      "Acme Co., Ltd.",
      "quizID":       "shindan",
      "overallScore": 3.47,
      "diagnosis":    "established",
      "submittedAt":  "2026-06-10T08:00:00Z"
    }
  ],
  "total": 142
}
```

---

### `GET /backoffice/results/{assessmentID}`

Get full detail for a single assessment result, including dimension scores,
strengths, and weaknesses.

**Role**: staff+

**Response 200**
```json
{
  "success": true,
  "data": {
    "assessmentID":   "abc123",
    "projectID":      "0105567001234",
    "company":        "Acme Co., Ltd.",
    "quizID":         "shindan",
    "overallScore":   3.47,
    "diagnosis":      "established",
    "dimensionScores": {
      "quality":        4.1,
      "delivery":       3.2,
      "cost":           3.8,
      "safety":         3.5,
      "morale":         2.9,
      "environment":    3.7,
      "productivity":   3.6,
      "management":     3.4
    },
    "strengths":      ["quality", "environment"],
    "weaknesses":     ["morale"],
    "submittedAt":    "2026-06-10T08:00:00Z"
  }
}
```

**Error 404** — assessment not found

---

### `GET /backoffice/export`

Export all quiz results as a CSV file.

**Role**: staff+

**Query params**: same filter params as `GET /backoffice/results`

**Response 200**

`Content-Type: text/csv`
`Content-Disposition: attachment; filename="results-export.csv"`

CSV columns: `assessmentID`, `projectID`, `company`, `quizID`, `overallScore`,
`diagnosis`, `quality`, `delivery`, `cost`, `safety`, `morale`, `environment`,
`productivity`, `management`, `submittedAt`

---

## 5. Staff Management

All endpoints in this section require `backofficeRole: "superadmin"`. Staff
callers receive **403**.

### `GET /backoffice/staff`

List all users who hold a `backofficeRole` claim.

**Role**: superadmin only

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uid":             "firebase-uid-xyz",
      "name":            "Alice T.",
      "email":           "alice@factorysync.com",
      "backofficeRole":  "superadmin",
      "grantedAt":       "2026-06-05T08:00:00Z"
    }
  ]
}
```

---

### `POST /backoffice/staff/invitations`

Create or reuse a Firebase Auth account, assign a `backofficeRole` custom claim,
and send a password setup invitation email.

**Role**: superadmin only

**Request body**
```json
{
  "email": "alice@factorysync.com",
  "backofficeRole": "staff"
}
```

Valid role values: `"superadmin"`, `"staff"`

The email link uses `BACKOFFICE_APP_URL` when set, falling back to `APP_URL`.

**Response 200**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid-xyz",
    "email": "alice@factorysync.com",
    "displayName": "",
    "backofficeRole": "staff"
  }
}
```

---

### `PUT /backoffice/staff/{uid}`

Grant or update the `backofficeRole` claim for a Firebase user. Creates the
staff record if it doesn't exist; updates the role if it does.

**Role**: superadmin only

**Request body**
```json
{
  "backofficeRole": "staff"
}
```

Valid values: `"superadmin"`, `"staff"`

**Response 200**
```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid-xyz",
    "email": "alice@factorysync.com",
    "displayName": "Alice T.",
    "backofficeRole": "staff"
  }
}
```

**Error 404** — Firebase user UID not found

**Side effects:** Audit event `backoffice.staff_role_granted` or
`backoffice.staff_role_changed` written with old and new `backofficeRole`
metadata.

---

### `DELETE /backoffice/staff/{uid}`

Revoke the `backofficeRole` claim, removing backoffice access entirely.

**Role**: superadmin only

**Response 200**
```json
{ "success": true }
```

**Error 404** — user has no backoffice claim to revoke

**Side effects:** Audit event `backoffice.staff_role_revoked` written with
actor UID and target UID.

---

## 6. Audit

All endpoints in this section require `backofficeRole: "superadmin"`. Staff
callers receive **403 FORBIDDEN**.

### `GET /backoffice/audit`

Search platform-wide audit events. Results are ordered by `createdAt`
descending.

**Role**: superadmin only

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `100` | Max `500` |
| `before` | — | RFC3339 cursor; return events older than this value |
| `eventType` | — | Exact event type filter |
| `actorUID` | — | UID that performed the action |
| `targetUID` | — | UID affected by the action |
| `projectID` | — | Company/project scope |
| `resourceType` | — | Resource category such as `staff`, `profile`, `project` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "audit-event-id",
      "actorUID": "superadmin-uid",
      "actorEmail": "alice@factorysync.com",
      "eventType": "backoffice.staff_role_changed",
      "resourceType": "staff",
      "resourceID": "staff-uid",
      "targetUID": "staff-uid",
      "projectID": "",
      "metadata": {
        "oldRole": "staff",
        "newRole": "superadmin"
      },
      "createdAt": "2026-06-14T08:30:00Z"
    }
  ],
  "total": 1,
  "hasMore": false,
  "nextCursor": null
}
```

---

### `GET /backoffice/users/{uid}/activity`

Return events where the selected UID is either the actor or the target. This is
the backoffice equivalent of a user's own activity log and powers "View
Activity" in user/staff detail views.

**Role**: superadmin only

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max `200` |
| `before` | — | RFC3339 cursor |
| `eventType` | — | Exact event type filter |

**Response 200** — same event shape as `GET /backoffice/audit`.

---

## Error Reference

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `INVALID_INPUT` | Malformed request body or invalid field value |
| 401 | `UNAUTHORIZED` | Missing or invalid Firebase ID token |
| 403 | `FORBIDDEN` | Token valid but insufficient `backofficeRole` |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g. member already exists) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

All errors follow the standard envelope:
```json
{
  "success": false,
  "error":   "FORBIDDEN",
  "message": "superadmin role required"
}
```

See [api/conventions.md](conventions.md) for full response format.

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.1.0 | 2026-06-14 | Add audit query endpoints and audit side effects |
| 1.0.0 | 2026-06-11 | Initial version — all backoffice endpoints |
