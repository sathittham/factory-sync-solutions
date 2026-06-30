---
isoOutput: SI.O2
template: true
version: 1.0.0
lastUpdated: 2026-06-11
---

# Software Design Description — [Feature / Component Name]

*ISO 29110 Basic Profile · SI.O2*
*Copy to `docs/architecture/<feature>-design.md` for non-trivial features. Fill in before implementation.*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | [name] |
| **Version** | 0.1.0 |
| **Status** | Draft / Under Review / Approved |
| **Author** | [name] |
| **Date** | YYYY-MM-DD |
| **SRS Reference** | [docs/product/<feature>/feature-spec.md]() |

---

## 1. Introduction

### 1.1 Purpose
[What this design document covers and at what level of detail.]

### 1.2 Scope
[Which components, services, and data stores are designed here.]

### 1.3 Design Constraints
- Backend: Go + Chi + Firestore; no ORM; response helpers from `pkg/`
- Frontend: React 19 + shadcn/ui + Redux Toolkit; no native `<select>` or `<dialog>`
- Auth: Firebase Auth; UID from `middleware.GetUID(r)` only
- IDs: UUIDv4 for all Firestore document IDs; camelCase field names

---

## 2. System Architecture

### 2.1 Component Diagram

```
[User Browser]
     │
     ▼
[web-app / web-backoffice]  (Cloudflare Pages)
     │  HTTPS + Bearer token
     ▼
[backend: Go + Chi]  (Cloud Run)
     ├── middleware/auth.go   ← Firebase token verification
     ├── services/<feature>/  ← handler.go + service.go
     └── pkg/                 ← response helpers, Firestore client
          │
          ▼
     [Cloud Firestore]
```

*Replace/extend this diagram for the specific feature.*

### 2.2 Deployment Context
- Backend: Cloud Run (stateless, auto-scales to 0)
- Frontend: Cloudflare Pages (static, global CDN)
- Database: Cloud Firestore (document store, serverless)

---

## 3. Component Design

### 3.1 Backend — `services/<feature>/`

#### 3.1.1 handler.go

| Handler Method | Route | Auth Guard | Calls |
|---|---|---|---|
| `Get[Resource]` | `GET /api/v1/[path]` | FirebaseAuth | `svc.Get[Resource]` |
| `Create[Resource]` | `POST /api/v1/[path]` | FirebaseAuth | `svc.Create[Resource]` |

Follows the project pattern: parse → validate → call service → respond.
No business logic in handlers.

#### 3.1.2 service.go

| Method | Signature | Description |
|---|---|---|
| `Get[Resource]` | `(ctx, uid string) (*[Resource], error)` | [describe] |
| `Create[Resource]` | `(ctx, uid string, req *Create[Resource]Request) (*[Resource], error)` | [describe] |

Sentinel errors:
```go
var (
    Err[Resource]NotFound = errors.New("[resource] not found")
    Err[Resource]Conflict = errors.New("[resource] already exists")
)
```

#### 3.1.3 models.go

```go
type [Resource] struct {
    ID        string    `firestore:"id"         json:"id"`
    UserID    string    `firestore:"userID"     json:"userID"`
    CreatedAt time.Time `firestore:"createdAt"  json:"createdAt"`
    // ...
}

type Create[Resource]Request struct {
    Field string `json:"field" validate:"required,max=200"`
}
```

### 3.2 Frontend — `apps/<app>/src/`

#### 3.2.1 Redux Slice — `store/[feature]Slice.ts`

| State Field | Type | Initial | Description |
|---|---|---|---|
| `[field]` | `[type] \| null` | `null` | [description] |
| `loading` | `boolean` | `false` | |
| `error` | `string \| null` | `null` | |

Key actions/thunks:
- `fetch[Resource]` — calls `GET /api/v1/[path]`
- `create[Resource]` — calls `POST /api/v1/[path]`

#### 3.2.2 Pages / Components

| File | Route / Usage | Key Props |
|---|---|---|
| `pages/[Feature]Page.tsx` | `/[path]` | — |
| `components/[Feature]Card.tsx` | Used in `[Feature]Page` | `[prop]: type` |

#### 3.2.3 API Calls — `lib/api.ts`

```typescript
export const get[Resource] = (id: string) =>
  apiClient.get<[Resource]>(`/[path]/${id}`)

export const create[Resource] = (data: Create[Resource]Request) =>
  apiClient.post<[Resource]>('/[path]', data)
```

---

## 4. Data Design

### 4.1 Firestore Collection: `[collection-name]`

```
[collection-name]/{documentID}
  ├── id: string (UUIDv4)
  ├── userID: string (Firebase UID)
  ├── [field]: [type]
  └── createdAt: Timestamp
```

**Document ID strategy:** UUIDv4 generated server-side.

**Indexes required:**
```json
{
  "collectionGroup": "[collection-name]",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userID", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```
Add to `firestore.indexes.json`.

### 4.2 Security Rules

```javascript
match /[collection-name]/{docId} {
  allow read: if request.auth != null
    && request.auth.uid == resource.data.userID;
  allow write: if false; // backend only
}
```
Add to `firestore.rules`.

---

## 5. Interface Design

### 5.1 API Contract

**`GET /api/v1/[path]`**
```
Headers: Authorization: Bearer <firebase-id-token>
Response 200: { "success": true, "data": { ...Resource } }
Response 404: { "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

**`POST /api/v1/[path]`**
```
Headers: Authorization: Bearer <firebase-id-token>
Body: { "[field]": "value" }
Response 201: { "success": true, "data": { ...Resource } }
Response 400: { "success": false, "error": { "code": "VALIDATION_ERROR", ... } }
```

### 5.2 UI Wireframe / Description
[Describe or link to wireframe. Reference `docs/product/wireframes.md`.]

---

## 6. Security Design

| Threat | Mitigation |
|---|---|
| Unauthenticated access | `middleware.FirebaseAuth` on all routes |
| Unauthorised cross-user read | Service layer scopes all queries by `uid` from context |
| Injection via user input | `go-playground/validator` + Zod schema validation |
| Secrets in code | All secrets via env vars; git-ignored |

---

## 7. Traceability to Requirements

| Design Element | SRS Requirement | Notes |
|---|---|---|
| `handler.go: Get[Resource]` | FR-001 | |
| `[Feature]Page.tsx` | FR-002 | |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 0.1.0 | YYYY-MM-DD | [name] | Initial design |
