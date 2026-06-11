---
version: 1.1.0
lastUpdated: 2026-06-10
---

# User API Reference

All endpoints require a Firebase ID token in the `Authorization: Bearer {token}` header unless marked **Public**.

Base path: `/api/v1`

---

## Health Check

### `GET /healthz` — Public

```json
{ "status": "ok" }
```

---

## Profile

### `GET /profile`

Returns the authenticated user's profile.

**Response 200**
```json
{
  "success": true,
  "data": {
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
    "activeProjectID": "0105567001234",
    "projectRoles": {
      "0105567001234": "owner",
      "0987654321012": "manager"
    },
    "consentVersion": "1.0",
    "emailNotifications": true,
    "createdAt": "2026-03-08T10:00:00Z"
  }
}
```

`activeProjectID` is the project currently in scope for this user's session.
`projectRoles` is a map of every project the user belongs to: `{ projectID: role }`.
A user can appear in multiple projects with different roles.

**Errors:** `401 UNAUTHORIZED`, `404 NOT_FOUND`

---

### `POST /profile`

Register a new user profile after Google Sign-In. Requires Cloudflare Turnstile CAPTCHA.

**Request body**
```json
{
  "companyName": "ABC Factory Co., Ltd.",
  "companyRegId": "0105567001234",
  "industryType": "manufacturing",
  "companySize": "medium",
  "contactName": "Somchai S.",
  "contactEmail": "somchai@abc.com",
  "contactPhone": "0812345678",
  "consentVersion": "1.0",
  "turnstileToken": "<cloudflare-token>"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `companyName` | string | required, 2–200 chars |
| `companyRegId` | string | required, exactly 13 digits |
| `industryType` | string | required |
| `companySize` | string | required, one of `small` `medium` `large` |
| `contactName` | string | required, 2–100 chars |
| `contactEmail` | string | required, valid email |
| `contactPhone` | string | required |
| `consentVersion` | string | optional — stored for compliance audit |
| `turnstileToken` | string | required |

**Response 201** — same shape as `GET /profile`

**Errors:**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Body parse failure or field validation error |
| 400 | `CAPTCHA_FAILED` | Turnstile verification failed |
| 401 | `UNAUTHORIZED` | Missing/invalid Firebase token |
| 409 | `ALREADY_REGISTERED` | This user already has a profile |
| 409 | `PROJECT_ALREADY_EXISTS` | `companyRegId` is already in use — user must request an invite from the project Owner instead of registering |

**Side effects:** Project created (if first user for this `companyRegId`). Caller's `projectRole` set to `owner`. Slack registration webhook fired. Audit event `user.registered` written.

---

### `PUT /profile`

Update mutable profile fields. Only supplied fields are changed.

**Request body**
```json
{
  "companyName": "ABC Factory 2",
  "industryType": "automotive",
  "companySize": "large",
  "contactName": "Wanchai S.",
  "contactEmail": "wanchai@abc.com",
  "contactPhone": "0891234567",
  "emailNotifications": false
}
```

All fields optional. `emailNotifications` is a boolean — omit to leave unchanged; set `false` to opt out of result emails.

**Response 200** — same shape as GET /profile

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`

**Side effects:** Audit event `user.profile_updated` written.

---

### `GET /profile/check/{regId}`

Check whether a 13-digit company registration ID is already registered.

**Response 200 — taken**
```json
{ "success": true, "data": { "registered": true, "companyName": "ABC Factory", "companyRegId": "0105567001234", "industryType": "manufacturing", "companySize": "medium" } }
```

**Response 200 — available**
```json
{ "success": true, "data": { "registered": false } }
```

**Errors:** `400 VALIDATION_ERROR` (not 13 digits), `401 UNAUTHORIZED`

---

## Quiz

### `GET /quiz/quizzes`

List all available quizzes (lightweight).

**Response 200**
```json
{
  "success": true,
  "data": [
    { "id": "shindan", "nameTh": "แบบประเมินสุขภาพโรงงาน (ชินดัน)", "nameEn": "FactorySync Solutions (Shindan)" },
    { "id": "factory", "nameTh": "...", "nameEn": "..." },
    { "id": "lean", "nameTh": "...", "nameEn": "..." },
    { "id": "cybersecurity", "nameTh": "...", "nameEn": "..." }
  ]
}
```

---

### `GET /quiz/questions?quizId={id}`

Get full quiz config including all dimensions and questions with rubrics.

| Param | Default |
|-------|---------|
| `quizId` | `shindan` |

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "shindan",
    "version": "2.0.0",
    "nameTh": "...",
    "nameEn": "...",
    "dimensions": [
      { "id": "basic-management", "nameTh": "การจัดการงานเบื้องต้น", "nameEn": "Basic Management", "weight": 1.0 }
    ],
    "questions": [
      {
        "id": "q1",
        "dimensionId": "basic-management",
        "textTh": "...",
        "textEn": "...",
        "weight": 1.0,
        "rubric": { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." }
      }
    ]
  }
}
```

**Errors:** `401 UNAUTHORIZED`, `404 NOT_FOUND`

---

### `POST /quiz/submit`

Submit all answers for a quiz. Computes scores, stores assessment, triggers notifications.

**Request body**
```json
{
  "quizId": "shindan",
  "answers": [
    { "questionId": "q1", "value": 3 },
    { "questionId": "q2", "value": 4 }
  ]
}
```

Every question in the quiz must have an answer. `value` must be 1–5.

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "uid": "firebase-uid",
    "quizId": "shindan",
    "overallScore": 3.42,
    "diagnosis": "Established",
    "strengths": ["Basic Management", "Quality Control"],
    "weaknesses": ["Cost Control"],
    "scores": [
      { "dimensionId": "basic-management", "dimensionName": "Basic Management", "score": 3.80 }
    ],
    "submittedAt": "2026-06-04T12:00:00Z"
  }
}
```

**Diagnosis thresholds:** `Beginning` < 2.00 · `Developing` ≥ 2.00 · `Established` ≥ 3.00 · `Advanced` ≥ 4.00

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND` (unknown quizId)

**Side effects:** Result email sent if `emailNotifications=true` on profile. Slack webhook fired. Audit event `assessment.submitted` written.

---

## Results

### `GET /results`

List assessments ordered by submission date descending.

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `scope` | `self` | `self` — caller's own results only. `project` — all results for the entire project (requires `manager` role or higher). |

**Response 200**
```json
{
  "success": true,
  "data": [ { "id": "uuid", "quizId": "shindan", "overallScore": 3.42, "diagnosis": "Established", "submittedAt": "..." } ]
}
```

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN` (when `scope=project` without sufficient role)

---

### `GET /results/{assessmentId}`

Get a single assessment. Users can only access their own assessments.

**Response 200** — full assessment object (same shape as POST /quiz/submit response)

**Errors:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`

---

## DBD Lookup

### `GET /dbd/{regId}` — Public

Look up a Thai company from the Department of Business Development (DBD) API.

**Response 200**
```json
{
  "success": true,
  "data": {
    "juristicId": "0105567001234",
    "nameTh": "บริษัท เอบีซี แฟคทอรี่ จำกัด",
    "nameEn": "ABC FACTORY CO., LTD.",
    "type": "บริษัทจำกัด",
    "registrationDate": "2010-03-15",
    "status": "ยังดำเนินกิจการอยู่",
    "capital": 5000000,
    "province": "กรุงเทพมหานคร"
  }
}
```

**Errors:** `400 VALIDATION_ERROR` (not 13 digits), `404 NOT_FOUND`, `503` (DBD API unavailable)

Responses are cached for 1 hour.

---

## Standard Error Shape

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "resource not found"
  }
}
```

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid Firebase token |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate (e.g. regId already registered) |
| `VALIDATION_ERROR` | 400 | Request body or param failed validation |
| `CAPTCHA_FAILED` | 400 | Turnstile verification failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
