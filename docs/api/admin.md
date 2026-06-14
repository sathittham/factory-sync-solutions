---
version: 1.1.0
lastUpdated: 2026-06-13
---

# Admin API Reference

All admin endpoints require:
1. A valid Firebase ID token: `Authorization: Bearer {token}`
2. The `admin` role set in Firebase custom claims

Base path: `/api/v1/admin`

Non-admin requests return `403 FORBIDDEN`.

---

## Assessments

### `GET /admin/assessments`

List all assessments across all users. Supports optional filters and pagination.

**Query params**

| Param | Type | Description |
|-------|------|-------------|
| `industry` | string | Filter by `industryType` |
| `size` | string | Filter by `companySize` (`small` / `medium` / `large`) |
| `diagnosis` | string | Filter by diagnosis level |
| `limit` | int | Max results (default 100, max 500) |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "uid": "firebase-uid",
      "quizId": "shindan",
      "overallScore": 3.42,
      "diagnosis": "Established",
      "companyName": "ABC Factory Co., Ltd.",
      "industryType": "manufacturing",
      "companySize": "medium",
      "submittedAt": "2026-06-04T12:00:00Z"
    }
  ],
  "count": 1
}
```

---

### `GET /admin/assessments/{assessmentId}`

Get a single assessment with full dimension scores and answers.

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "uid": "firebase-uid",
    "quizId": "shindan",
    "overallScore": 3.42,
    "diagnosis": "Established",
    "strengths": ["Basic Management"],
    "weaknesses": ["Cost Control"],
    "scores": [
      { "dimensionId": "basic-management", "dimensionName": "Basic Management", "score": 3.80 }
    ],
    "answers": [
      { "questionId": "q1", "value": 4 }
    ],
    "companyName": "ABC Factory Co., Ltd.",
    "industryType": "manufacturing",
    "companySize": "medium",
    "submittedAt": "2026-06-04T12:00:00Z"
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### `GET /admin/export`

Export all assessments as CSV. Maximum 10,000 rows.

**Response 200** — `Content-Type: text/csv`

Columns: `id`, `uid`, `quizId`, `companyName`, `industryType`, `companySize`, `contactName`, `contactEmail`, `overallScore`, `diagnosis`, `submittedAt`

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`

**Side effects:** Audit event `admin.export` written.

---

## Users

### `GET /admin/users`

List all registered user profiles.

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uid": "firebase-uid",
      "email": "user@example.com",
      "displayName": "Somchai S.",
      "companyName": "ABC Factory Co., Ltd.",
      "companyRegId": "0105567001234",
      "industryType": "manufacturing",
      "companySize": "medium",
      "contactName": "Somchai S.",
      "contactEmail": "somchai@abc.com",
      "contactPhone": "0812345678",
      "role": "user",
      "consentVersion": "1.0",
      "emailNotifications": true,
      "createdAt": "2026-03-08T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### `PUT /admin/users/{uid}/role`

Set a user's role. Updates both the Firestore profile and Firebase custom claims.

**Request body**
```json
{ "role": "manager" }
```

`role` must be one of: `"user"`, `"manager"`, `"system_admin"`, `"owner"`.

**Response 200**
```json
{ "success": true, "data": { "uid": "firebase-uid", "role": "manager" } }
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`

**Side effects:** Audit event `user.role_changed` written.

---

## Invitations

### `POST /manage/invitations`

Invite a new member by email. Creates a Firebase Auth account (if not already
present), stores an `invitations/{uid}` Firestore document, and sends a bilingual
(TH + EN) invitation email with a 24-hour password-setup link.

**Request body**
```json
{ "email": "new.member@example.com", "role": "manager" }
```

`role` must be one of: `"user"`, `"manager"`, `"system_admin"`, `"owner"`.

**Response 200**
```json
{ "success": true, "data": { "email": "new.member@example.com", "role": "manager" } }
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `409 CONFLICT` (email already has a completed profile)

**Side effects:**
- Firebase Auth user created (or re-used if pending).
- `invitations/{uid}` written with `invitedAt`, `expiresAt` (`+24h`), and a
  snapshot of the inviter's company fields.
- Invitation email sent via Resend. Silently skipped if `RESEND_API_KEY` is absent.

---

### `DELETE /manage/invitations/{uid}`

Cancel a pending invitation. Deletes the `invitations/{uid}` Firestore document
and the Firebase Auth account for the invited user.

**Path param:** `uid` — Firebase UID of the pending invite (from `GET /admin/users`
`isPending: true` entries).

**Response 200**
```json
{ "success": true, "data": { "uid": "firebase-uid" } }
```

**Errors:** `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `403 FORBIDDEN`

---

### `POST /manage/invitations/{uid}/resend`

Resend a pending invitation. Generates a new password-reset link, resets
`expiresAt` to a fresh 24 hours from now, updates `invitedAt`, and sends a new
invitation email.

**Path param:** `uid` — Firebase UID of the pending invite.

**Response 200**
```json
{ "success": true, "data": { "uid": "firebase-uid", "email": "new.member@example.com" } }
```

**Errors:** `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

### `POST /invitations/accept`

Accept a pending invitation. Authenticated — no admin role required (the invited
user has no profile yet when they first sign in). Creates a Firestore profile
from the invitation snapshot and deletes the invitation document (single-use).

**Auth:** Bearer token required. No admin role check.

**Request body** — optional; used by the branded invitation setup page.
```json
{
  "contactName": "New Member",
  "contactPhone": "0812345678"
}
```

**Response 200** — returns the newly created profile object.

**Errors:**
| Code | Meaning |
|------|---------|
| `400 BAD_REQUEST` | Invalid JSON body |
| `400 VALIDATION_ERROR` | `contactName` or `contactPhone` failed validation |
| `401 UNAUTHORIZED` | No valid Bearer token |
| `404 NOT_FOUND` | No pending invitation for this UID |
| `410 INVITATION_EXPIRED` | `expiresAt` is in the past — user must ask admin to resend |
| `500 INTERNAL_ERROR` | Firestore write failed |

**Side effects:**
- `users/{uid}` Firestore profile created with company fields from the invitation snapshot.
- `invitations/{uid}` document deleted on success.

---

## Audit Events

Audit events are stored in the `audit_events` Firestore collection and are not exposed via API. Query directly from the Firebase Console or use Firestore rules to restrict access.

**Event types**

| Event | Trigger |
|-------|---------|
| `user.registered` | New profile created via `POST /profile` |
| `user.profile_updated` | Profile fields changed via `PUT /profile` |
| `user.role_changed` | Admin changes role via `PUT /admin/users/{uid}/role` |
| `assessment.submitted` | Quiz submitted via `POST /quiz/submit` |
| `admin.export` | Admin CSV export triggered |

**Event document shape**
```json
{
  "id": "uuid",
  "actorUid": "firebase-uid",
  "eventType": "assessment.submitted",
  "resourceType": "assessment",
  "resourceId": "assessment-uuid",
  "metadata": {
    "quizId": "shindan",
    "overallScore": 3.42,
    "diagnosis": "Established"
  },
  "createdAt": "2026-06-04T12:00:00Z"
}
```
