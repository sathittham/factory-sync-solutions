---
version: 1.1.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
---

# Database Schema & Data Models

## Storage Strategy

- Firebase Auth stores user identity and Google sign-in session.
- Firestore stores application data keyed by authenticated `uid`.

## ID Generation

All document IDs (except `users/{uid}` which uses the Firebase Auth UID) must be generated as **UUIDv4** strings.

```go
import "github.com/google/uuid"

id := uuid.New().String() // e.g. "550e8400-e29b-41d4-a716-446655440000"
```

| Collection | ID Source |
|------------|----------|
| `users/{uid}` | Firebase Auth UID (from `token.UID`) |
| `assessments/{assessmentId}` | UUIDv4 |
| `email_jobs/{jobId}` | UUIDv4 |
| `projects/{projectID}` | `companyRegId` (13-digit Thai tax ID — naturally unique per company) |
| `projects/{projectID}/members/{uid}` | Firebase Auth UID (subcollection, same key as `users/{uid}`) |
| `project_invitations/{token}` | UUIDv4 |

## Firestore Collections

```
├── users/{uid}
│   ├── uid: string                  (mirrors document ID)
│   ├── email: string
│   ├── displayName: string
│   ├── companyName: string
│   ├── companyRegId: string         (13-digit registration ID)
│   ├── industryType: string
│   ├── companySize: string          ("small" | "medium" | "large")
│   ├── contactName: string
│   ├── contactEmail: string
│   ├── contactPhone: string
│   ├── role: string                 ("user" | "admin") — system-level; separate from projectRole
│   ├── activeProjectID: string       → the project currently in scope for this user's session
│   ├── projectRoles: map            { "0123456789012": "owner", "0987654321012": "manager", … }
│   │                                  denormalized mirror of all members subdoc entries; updated
│   │                                  in the same transaction as any role/membership change
│   ├── consentVersion: string
│   ├── consentAt: string            (UTC ISO 8601)
│   ├── emailNotifications: bool
│   ├── createdAt: string            (UTC ISO 8601)
│   └── updatedAt: string            (UTC ISO 8601)
│
├── assessments/{assessmentId}
│   ├── uid: string
│   ├── projectID: string            → foreign key to projects/{projectID}
│   ├── quizID: string
│   ├── answers: QuizAnswer[]
│   ├── scores: DimensionScore[]
│   ├── overallScore: number         (1.0 – 5.0)
│   ├── strengths: string[]
│   ├── weaknesses: string[]
│   ├── diagnosis: string            ("Beginning" | "Developing" | "Established" | "Advanced")
│   └── submittedAt: string          (UTC ISO 8601)
│
├── email_jobs/{jobId}
│   ├── uid: string
│   ├── assessmentId: string
│   ├── status: string               ("pending" | "sent" | "failed")
│   ├── createdAt: string            (UTC ISO 8601)
│   ├── sentAt: string               (UTC ISO 8601)
│   └── error: string | null
│
├── projects/{projectID}             (projectID == companyRegId)
│   ├── projectID: string
│   ├── name: string
│   ├── companyRegId: string
│   ├── industryType: string
│   ├── companySize: string          ("small" | "medium" | "large")
│   ├── ownerUID: string             → uid of the Owner member
│   ├── memberCount: number          (denormalized — incremented/decremented on member add/remove)
│   ├── isActive: bool
│   ├── createdAt: string            (UTC ISO 8601)
│   └── updatedAt: string            (UTC ISO 8601)
│
│   └── members/{uid}               (subcollection — source of truth for roles)
│       ├── uid: string
│       ├── email: string
│       ├── displayName: string
│       ├── projectRole: string      ("owner" | "system_admin" | "manager" | "general_user")
│       ├── joinMethod: string       ("self_registered" | "invited")
│       ├── invitedBy: string | null (uid of the inviter; null when joinMethod == "self_registered")
│       ├── invitationToken: string | null (consumed token; null when self_registered)
│       ├── joinedAt: string         (UTC ISO 8601)
│       └── isActive: bool
│
└── project_invitations/{token}      (token == UUIDv4)
    ├── token: string
    ├── projectID: string
    ├── projectName: string          (snapshot — avoids a join on public preview endpoint)
    ├── invitedBy: string            (uid of sender)
    ├── invitedByName: string        (displayName snapshot)
    ├── role: string
    ├── email: string                (target email — pre-fill only, not enforced on accept)
    ├── status: string               ("pending" | "accepted" | "expired" | "revoked")
    ├── expiresAt: string            (UTC ISO 8601; 7 days from creation)
    ├── acceptedAt: string | null    (UTC ISO 8601 — set when status → "accepted")
    ├── acceptedByUID: string | null (UID of acceptor — may differ from invited email)
    ├── revokedAt: string | null     (UTC ISO 8601 — set when status → "revoked")
    ├── revokedBy: string | null     (UID of who revoked)
    ├── emailSentAt: string | null   (UTC ISO 8601 — populated on successful Resend delivery)
    └── emailError: string | null    (error message when delivery fails)
```

## Security Rules

Principles:
- Users can read/write only their own records.
- Admin access must be role-protected both in Firestore Rules and Cloud Functions.
- Use `auth.uid` as primary identity key across services.

The authoritative Firestore security rules are maintained in [security-guide.md](security-guide.md#firestore-security-rules). See that document for the full rules and any updates.

## Registration Fields

| Field | Firestore Key | Validation |
|-------|--------------|-----------|
| Company name | `companyName` | Required, 2–200 chars |
| Company registration ID | `companyRegId` | Required, exactly 13 numeric digits |
| Industry type | `industryType` | Required |
| Company size | `companySize` | Required, one of: `small`, `medium`, `large` |
| Contact name | `contactName` | Required, 2–100 chars |
| Contact email | `contactEmail` | Required, valid email |
| Contact phone | `contactPhone` | Required |
| Turnstile token | *(not stored)* | Required, verified server-side |

`email` and `displayName` are populated from the Firebase Auth profile (Google account).

## Quiz Question Structure

Questions are stored as static JSON config in `apps/api/config/questions.json`. See [quiz-design.md](quiz-design.md) for the full dimension list and question catalog.

```typescript
interface Question {
  id: string;
  dimension: string;       // which dimension this question belongs to
  text: string;
  weight: number;          // scoring weight (default 1.0)
}

interface QuizAnswer {
  questionId: string;
  value: number;           // 1–5 Likert scale
}

interface DimensionScore {
  dimension: string;
  score: number;           // 1.0 – 5.0 (weighted average)
  maxScore: number;        // always 5.0
}
```

Example question:
```json
{
  "id": "q1",
  "dimension": "Quality Management",
  "text": "How would you rate your quality control processes?",
  "weight": 1.0
}
```

## Scoring Algorithm

1. **Answer Scale**: All questions use a 1–5 Likert scale (1 = lowest, 5 = highest).

2. **Dimension Score Calculation**:
   - Weighted average of all answers within a dimension
   - Formula: `sum(answer.value * question.weight) / sum(question.weight)`
   - Result: 1.0 – 5.0

3. **Overall Score**:
   - Average of all dimension scores
   - Result: 1.0 – 5.0

4. **Rounding**: All scores are rounded to 2 decimal places before classification.

5. **Strengths/Weaknesses**:
   - Strengths: dimensions scoring >= 3.50
   - Weaknesses: dimensions scoring < 2.50
   - Neutral: 2.50 – 3.49 (not classified)

6. **Diagnosis Categories** (inclusive lower bound, exclusive upper bound; Advanced includes 5.0):

   | Score Range | Category |
   |-------------|----------|
   | >= 4.00 | Advanced |
   | >= 3.00 and < 4.00 | Established |
   | >= 2.00 and < 3.00 | Developing |
   | >= 1.00 and < 2.00 | Beginning |

## Email Service

Resend API key is a server-side secret — only used from Go Cloud Functions, never exposed to the frontend.

## Initial Admin Setup

**Method 1**: Manually via Firebase Console
1. Create user via Firebase Authentication
2. Set custom claim `role: 'admin'` via Admin SDK
3. Create user document in Firestore with admin role

**Method 2**: Go CLI seed tool
```bash
cd apps/api && go run cmd/seed/main.go --email=admin@company.com
```
Only runs in development, requires `FIREBASE_SERVICE_ACCOUNT` env var.

---

## Composite Indexes (project-related)

| Collection | Fields | Order | Query |
|------------|--------|-------|-------|
| `assessments` | `projectID`, `submittedAt` | ASC, DESC | Scope all project assessments by date |
| `assessments` | `projectID`, `uid`, `submittedAt` | ASC, ASC, DESC | Scope one member's assessments within a project |
| `projects/.../members` | `isActive`, `joinedAt` | ASC, ASC | List active members in join order |
| `project_invitations` | `projectID`, `status`, `expiresAt` | ASC, ASC, ASC | List invitations by status for a project |
| `project_invitations` | `projectID`, `invitedBy`, `status` | ASC, ASC, ASC | Audit: all invitations sent by a specific member |
| `audit_events` | `projectID`, `createdAt` | ASC, DESC | Project-scoped audit log query (`GET /project/audit`) |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-06-10 | Add `projects`, `projects/.../members`, `project_invitations` collections; add `projectID` and `projectRole` to `users`; add `projectID` to `assessments`; add composite indexes table |
| 1.2.0 | 2026-06-10 | Add `audit_events: projectID + createdAt` composite index |
