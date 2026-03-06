---
version: 1.0.0
lastUpdated: 2026-03-06
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

## Firestore Collections

```
├── users/{uid}
│   ├── email: string
│   ├── displayName: string
│   ├── companyName: string
│   ├── companyRegId: string         (13-digit registration ID)
│   ├── industryType: string
│   ├── companySize: string          ("small" | "medium" | "large")
│   ├── contactName: string
│   ├── contactEmail: string
│   ├── contactPhone: string
│   ├── role: string                 ("user" | "admin")
│   ├── createdAt: string            (UTC ISO 8601)
│   └── updatedAt: string            (UTC ISO 8601)
│
├── assessments/{assessmentId}
│   ├── uid: string
│   ├── answers: QuizAnswer[]
│   ├── scores: DimensionScore[]
│   ├── overallScore: number         (1.0 – 5.0)
│   ├── strengths: string[]
│   ├── weaknesses: string[]
│   ├── diagnosis: string            ("Beginning" | "Developing" | "Established" | "Advanced")
│   └── submittedAt: string          (UTC ISO 8601)
│
└── email_jobs/{jobId}
    ├── uid: string
    ├── assessmentId: string
    ├── status: string               ("pending" | "sent" | "failed")
    ├── createdAt: string            (UTC ISO 8601)
    ├── sentAt: string               (UTC ISO 8601)
    └── error: string | null
```

## Security Rules

Principles:
- Users can read/write only their own records.
- Admin access must be role-protected both in Firestore Rules and Cloud Functions.
- Use `auth.uid` as primary identity key across services.

Example Firestore rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, update: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;
      // Admin can read any user
      allow read: if request.auth.token.role == 'admin';
    }

    match /assessments/{assessmentId} {
      allow read: if request.auth != null
        && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
      // Admin can read any assessment
      allow read: if request.auth.token.role == 'admin';
    }

    match /email_jobs/{jobId} {
      // Only Cloud Functions (Admin SDK) can read/write
      allow read, write: if false;
    }
  }
}
```

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

4. **Strengths/Weaknesses**:
   - Strengths: dimensions scoring >= 3.5
   - Weaknesses: dimensions scoring < 2.5

5. **Diagnosis Categories**:

   | Score Range | Category |
   |-------------|----------|
   | 4.0 – 5.0 | Advanced |
   | 3.0 – 3.9 | Established |
   | 2.0 – 2.9 | Developing |
   | 1.0 – 1.9 | Beginning |

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

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
