---
version: 1.1.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
---

# Project & RBAC API Reference

All endpoints require a Firebase ID token in the `Authorization: Bearer {token}` header
unless marked **Public**. Project-scoped endpoints additionally enforce a minimum
**project role** — roles are checked server-side from the caller's Firestore profile.

Base path: `/api/v1/project`

---

## Role Hierarchy

```
owner  >  system_admin  >  manager  >  general_user
```

Middleware rejects with `403 FORBIDDEN` if the caller's role is below the required minimum.

---

## Project Details

### `GET /project`

Returns the project identified by the caller's `activeProjectID`. Includes the
caller's role in that project.

**Response 200**
```json
{
  "success": true,
  "data": {
    "projectID":    "0105567001234",
    "name":         "ABC Factory Co., Ltd.",
    "companyRegId": "0105567001234",
    "industryType": "manufacturing",
    "companySize":  "medium",
    "ownerUID":     "firebase-uid",
    "memberCount":  4,
    "myRole":       "owner",
    "isActive":     true,
    "createdAt":    "2026-06-10T08:00:00Z",
    "updatedAt":    "2026-06-10T09:00:00Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `404 PROJECT_NOT_FOUND`

---

### `GET /project/memberships`

List all projects the authenticated user belongs to, across all roles. No minimum
role required — any member can call this.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "projectID":    "0105567001234",
      "name":         "ABC Factory Co., Ltd.",
      "industryType": "manufacturing",
      "companySize":  "medium",
      "role":         "owner",
      "isActive":     true
    },
    {
      "projectID":    "0987654321012",
      "name":         "Beta Corp",
      "industryType": "food",
      "companySize":  "small",
      "role":         "manager",
      "isActive":     false
    }
  ],
  "total": 2
}
```

`isActive: true` means this entry is the caller's current `activeProjectID`.

**Errors:** `401 UNAUTHORIZED`

---

### `PUT /project/active`

Switch the caller's active project. Subsequent API calls without an `X-Project-ID`
header will operate in the context of the new active project.

**Request body**
```json
{ "projectID": "0987654321012" }
```

Backend validates that the caller is an active member of `projectID` before
updating `users/{uid}.activeProjectID`.

**Response 200** — `ProfileResponse` with updated `activeProjectID` and `projectRoles`

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN` (not a member of target project), `404 PROJECT_NOT_FOUND`

---

### `PUT /project`

Update project settings. Requires `owner` or `system_admin` role.

**Request body**
```json
{
  "name":         "ABC Factory Co., Ltd.",
  "industryType": "electronics",
  "companySize":  "large"
}
```

All fields optional. Omitted fields are not modified.

**Response 200** — same shape as `GET /project`

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 PROJECT_NOT_FOUND`

**Side effects:** Audit event `project.settings_updated` written.

---

## Members

### `GET /project/members`

List all active members of the project. Requires `manager` role or higher.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uid":             "firebase-uid",
      "email":           "somchai@abc.com",
      "displayName":     "Somchai S.",
      "projectRole":     "owner",
      "joinMethod":      "self_registered",
      "invitedBy":       null,
      "invitedByName":   null,
      "joinedAt":        "2026-06-10T08:00:00Z",
      "isActive":        true
    },
    {
      "uid":             "firebase-uid-2",
      "email":           "bob@abc.com",
      "displayName":     "Bob S.",
      "projectRole":     "manager",
      "joinMethod":      "invited",
      "invitedBy":       "firebase-uid",
      "invitedByName":   "Somchai S.",
      "joinedAt":        "2026-06-11T09:00:00Z",
      "isActive":        true
    }
  ],
  "total": 2
}
```

`projectRole` values: `owner` · `system_admin` · `manager` · `general_user`

`joinMethod` values: `self_registered` (created the project) · `invited` (accepted an invitation)

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`

---

### `PUT /project/members/{uid}/role`

Change a member's project role. Requires `owner` or `system_admin` role.

**Constraints:**
- A caller may only assign roles up to (but not exceeding) their own role.
- The project Owner cannot be demoted via this endpoint — use `POST /project/transfer` to transfer ownership first.

**Request body**
```json
{ "role": "manager" }
```

`role` must be one of: `system_admin` · `manager` · `general_user`

**Response 200**
```json
{
  "success": true,
  "data": {
    "uid":         "firebase-uid",
    "email":       "wanchai@abc.com",
    "displayName": "Wanchai S.",
    "projectRole": "manager",
    "joinedAt":    "2026-06-10T08:00:00Z",
    "isActive":    true
  }
}
```

**Errors:** `400 INVALID_ROLE`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`

**Side effects:** Audit event `project.member_role_changed` written.

---

### `DELETE /project/members/{uid}`

Remove a member from the project (sets `isActive: false`; does not delete the doc).
Requires `owner` or `system_admin` role. Owner cannot remove themselves.

**Response 204** — No Content

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`, `409 CANNOT_REMOVE_OWNER`

**Side effects:** Audit event `project.member_removed` written.

---

## Invitations

### `POST /project/invitations`

Create and send a time-limited invitation. The caller must hold `owner` or
`system_admin` role in the **specified `projectID`** (not necessarily their
active project).

**Request body**
```json
{
  "email":     "bob@abc.com",
  "projectID": "0105567001234",
  "role":      "general_user"
}
```

| Field | Rules |
|-------|-------|
| `email` | Required, valid email |
| `projectID` | Required; caller must be `owner` or `system_admin` in this project |
| `role` | Required; must be ≤ caller's own role in `projectID` |

**Response 201**
```json
{
  "success": true,
  "data": {
    "token":     "550e8400-e29b-41d4-a716-446655440000",
    "email":     "bob@abc.com",
    "projectID": "0105567001234",
    "role":      "general_user",
    "expiresAt": "2026-06-17T08:00:00Z"
  }
}
```

Invitations expire after **7 days**. Each token is single-use.

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 ALREADY_MEMBER`

**Side effects:**
- Invitation email sent fire-and-forget via the notification service.
  Subject: `{callerDisplayName} invited you to join {projectName}`.
  Body includes: project name, role, CTA button linking to `/join?token=<uuid>`, expiry date.
- On delivery success: `project_invitations/{token}.emailSentAt` is populated.
- On delivery failure: `project_invitations/{token}.emailError` is set; the token remains valid (inviter can share the join URL manually).
- If `RESEND_API_KEY` is not configured: email is skipped; `emailError = "email client not configured"`; token still created.
- Audit event `project.member_invited` written.

---

### `GET /project/invitations`

List invitations for the active project. Requires `owner` or `system_admin` role.

**Query params**

| Param | Default | Values |
|-------|---------|--------|
| `status` | `pending` | `pending` · `accepted` · `expired` · `revoked` · `all` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "token":          "uuid",
      "email":          "bob@abc.com",
      "projectID":      "0105567001234",
      "role":           "general_user",
      "status":         "pending",
      "invitedBy":      "firebase-uid-of-inviter",
      "invitedByName":  "Jane Doe",
      "expiresAt":      "2026-06-17T08:00:00Z",
      "acceptedAt":     null,
      "acceptedByUID":  null,
      "revokedAt":      null,
      "revokedBy":      null,
      "emailSentAt":    "2026-06-10T08:00:01Z",
      "emailError":     null
    }
  ],
  "total": 1
}
```

`status` values: `pending` (awaiting acceptance) · `accepted` (joined) ·
`expired` (past TTL, never used) · `revoked` (manually cancelled by admin).

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`

---

### `POST /project/invitations/{token}/resend`

Resend an invitation email. Requires `owner` or `system_admin` role.

The original token is revoked and a **new** invitation document (with a new token
and a fresh 7-day expiry) is created. A new invitation email is sent to the same
address with the same role. The response returns the new invitation details.

**Response 201**
```json
{
  "success": true,
  "data": {
    "token":     "new-uuid",
    "email":     "bob@abc.com",
    "role":      "general_user",
    "expiresAt": "2026-06-24T08:00:00Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_ALREADY_USED`

---

### `DELETE /project/invitations/{token}`

Revoke a pending invitation. Sets `status → "revoked"`, `revokedAt = now`,
`revokedBy = callerUID`. Requires `owner` or `system_admin` role.

Only `pending` invitations can be revoked. Attempting to revoke an `accepted`
or already-`revoked` invitation returns `409 INVITATION_ALREADY_USED` or
`409 INVITATION_ALREADY_REVOKED` respectively.

**Response 204** — No Content

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 INVITATION_NOT_FOUND`, `409 INVITATION_ALREADY_USED`, `409 INVITATION_ALREADY_REVOKED`

---

## Invitation Token Security

All invitation tokens are **UUIDv4** strings (122 bits of cryptographic randomness —
~5.3 × 10³⁶ possible values). They cannot be guessed by brute force.

Two independent safeguards are enforced on every use:

| Safeguard | Mechanism | Error when violated |
|-----------|-----------|---------------------|
| **Expiry** | `expiresAt` is set to 7 days after creation. The backend compares against server UTC time on every validation call. | `410 INVITATION_EXPIRED` |
| **Single-use** | `isUsed` is atomically set to `true` inside a Firestore transaction when the invitation is accepted. A second accept attempt on the same token is always rejected. | `409 INVITATION_ALREADY_USED` |

**Validation order** for both the preview (`GET`) and accept (`POST`) endpoints:

```
1. Token exists?           → 404 INVITATION_NOT_FOUND if not
2. isUsed == false?        → 409 INVITATION_ALREADY_USED if already consumed
3. now < expiresAt?        → 410 INVITATION_EXPIRED if past TTL
4. (POST only) uid not already a member? → 409 ALREADY_MEMBER if duplicate
```

Checks 2 and 3 are ordered deliberately — an already-used token returns
`INVITATION_ALREADY_USED` even if it has also expired, so the inviter knows
the link was acted on (not just abandoned).

**Atomicity guarantee:** the `POST /project/join` handler wraps the following
three writes in a single Firestore transaction — either all succeed or none do:

1. `project_invitations/{token}` — set `isUsed: true`, `usedAt: now`
2. `projects/{projectID}/members/{uid}` — create member document
3. `users/{uid}.projectRoles[projectID]` — add role to denormalized map

Profile creation is **not** part of this transaction — it must have already
been completed via `POST /profile` before `POST /project/join` is called.

A partial write (e.g. member created but token not marked used) is impossible.

**What the public preview endpoint reveals:**
`GET /project/join/{token}` is unauthenticated but returns only the project
name, role, inviter display name, and expiry. It never returns member lists,
assessment data, or any other project content.

---

## Joining a Project

### `GET /project/join/{token}` — Public

Preview an invitation before sign-in. Used by `JoinPage` to show the project
name, inviter, and assigned role before the user authenticates.

**Response 200**
```json
{
  "success": true,
  "data": {
    "projectName": "ABC Factory Co., Ltd.",
    "invitedBy":   "Somchai S.",
    "role":        "general_user",
    "expiresAt":   "2026-06-17T08:00:00Z"
  }
}
```

Validation order: token exists → not used → not expired (see security section above).

**Errors:**

| HTTP | Code | Condition |
|------|------|-----------|
| 404 | `INVITATION_NOT_FOUND` | Token does not exist |
| 409 | `INVITATION_ALREADY_USED` | Token was already consumed |
| 410 | `INVITATION_EXPIRED` | Token is past its `expiresAt` |

---

### `POST /project/join`

Accept an invitation. Auth required. The caller **must already have a profile**
(`users/{uid}` must exist). A user without an account must complete
`POST /profile` (registration) first, then return to accept.

**Request body**
```json
{ "token": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response 200** — `ProfileResponse` (profile fields unchanged; `projectRoles`
map gains the new project entry)

All writes (mark token used, create member doc, update `projectRoles` map)
execute in a single atomic Firestore transaction — see security section for details.

**Errors:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or malformed token field |
| 401 | `UNAUTHORIZED` | Missing or invalid Firebase token |
| 403 | `PROFILE_REQUIRED` | Caller has no profile — must register their own project first |
| 404 | `INVITATION_NOT_FOUND` | Token does not exist |
| 409 | `INVITATION_ALREADY_USED` | Token was already consumed |
| 409 | `ALREADY_MEMBER` | Caller is already an active member of this project |
| 410 | `INVITATION_EXPIRED` | Token is past its `expiresAt` |

**Side effects:** Audit event `project.member_joined` written.

---

## Ownership Transfer

### `POST /project/transfer`

Transfer project ownership to another active member. Owner only.

**Request body**
```json
{ "newOwnerUID": "firebase-uid-of-new-owner" }
```

After transfer:
- `newOwnerUID` → `projectRole: "owner"`
- Caller → `projectRole: "system_admin"`
- `projects/{projectID}.ownerUID` updated

**Response 200** — updated project object (same shape as `GET /project`)

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`

**Side effects:** Audit event `project.ownership_transferred` written.

---

## Audit Log

### `GET /project/audit`

Query the project-scoped audit log. Requires `owner` or `system_admin` role.
Returns events where `projectID == activeProjectID`, ordered by `createdAt` descending.

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max results per page (max 200) |
| `before` | — | ISO 8601 cursor — return events older than this timestamp |
| `eventType` | — | Filter by exact event type string (e.g. `project.member_joined`) |
| `actorUID` | — | Filter by the UID of the actor |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id":           "uuid",
      "actorUID":     "firebase-uid",
      "actorName":    "Jane Doe",
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
  "nextCursor": null
}
```

`actorName` is resolved from `users/{actorUID}.displayName` at query time.

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`

---

## Standard Error Codes (project-specific)

| Code | HTTP | Meaning |
|------|------|---------|
| `PROJECT_NOT_FOUND` | 404 | No project for the given ID |
| `PROJECT_ALREADY_EXISTS` | 409 | `companyRegId` already has a project — request an invite |
| `MEMBER_NOT_FOUND` | 404 | UID not found in project members |
| `ALREADY_MEMBER` | 409 | User is already a member of this project |
| `INVITATION_NOT_FOUND` | 404 | Invitation token does not exist |
| `INVITATION_EXPIRED` | 410 | Invitation token has passed its expiry |
| `INVITATION_ALREADY_USED` | 409 | Invitation token was already consumed |
| `PROFILE_REQUIRED` | 403 | Caller has no profile — must register before accepting an invitation |
| `INSUFFICIENT_ROLE` | 403 | Caller's project role is too low for this action |
| `CANNOT_REMOVE_OWNER` | 409 | Attempt to remove or demote the project Owner |
| `INVALID_ROLE` | 400 | Unknown role string |

For the full shared error shape, see [conventions.md](conventions.md).
