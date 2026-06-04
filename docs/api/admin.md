---
version: 1.0.0
lastUpdated: 2026-06-04
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
{ "role": "admin" }
```

`role` must be `"admin"` or `"user"`.

**Response 200**
```json
{ "success": true, "data": { "uid": "firebase-uid", "role": "admin" } }
```

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

**Side effects:** Audit event `user.role_changed` written.

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
