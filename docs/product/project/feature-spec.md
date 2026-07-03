---
version: 1.2.0
lastUpdated: 2026-07-03
author: Sathittham Sangthong
status: Planned
---

# Project & RBAC — Feature Spec

> Every user must own their own Project (created at registration with their own
> `companyRegId`). They can then be **invited into additional projects** by
> specifying a target `projectID` and a `role`. A user without an account must
> register first before they can accept any invitation.

---

## 1. Summary

This feature introduces the **Project** — a shared workspace scoped to one
company (identified by `companyRegId`). Users can belong to multiple projects
simultaneously, each with a distinct role. All API calls operate on the
user's **active project** unless overridden with an `X-Project-ID` header.

| What changes | Before | After |
|--------------|--------|-------|
| Company data | Stored on each user's profile | Stored on the project; users are members |
| First user | Registers independently | Registers → creates their own project → becomes Owner |
| Joining other projects | Not supported | Owner/System Admin invites by specifying `projectID` + `role`; invitee must already have an account |
| New user receiving an invite | N/A | Must **register their own project first**, then accept the invitation |
| Role | Single system-level `role` field | Per-project RBAC (Owner / System Admin / Manager / General User) |
| Multi-project | Not supported | User can be a member of many projects; one is marked active |
| Project context for API | N/A | Active project derived from `activeProjectID` on user profile |
| Admin access | Firebase custom claim `role == "admin"` | System admin unchanged; project RBAC is separate |

---

## 2. Goals & Non-Goals

### Goals

- One project per `companyRegId` — uniqueness enforced at registration.
- Every user owns exactly one "home project", created at registration. There is no user without a project.
- First registrant of a `companyRegId` automatically becomes Project **Owner**.
- An Owner / System Admin can invite an existing user by specifying `projectID` + `role`. The invited user is added to that project on acceptance.
- A user who has not yet registered must create their own project first; only then can they accept an invitation.
- A user can be a member of multiple projects (each with its own role) by accepting invitations.
- One project is designated **active** per user — drives the scoped context for API calls.
- Project switcher in the nav — user can change active project at any time.
- Four project roles with clearly defined permission boundaries.
- Project members page: list members, change roles, revoke access.
- Project settings page: update company profile fields (name, industry, size).
- Assessments are scoped to the active project — Managers and above can see all member assessments in that project; General Users see only their own.
- Bilingual (TH/EN) via `useLocale()`.

### Non-Goals

- SSO / directory sync (SAML, LDAP).
- Per-quiz permission overrides.
- Public / guest access to results.
- Billing or seat limits per project.
- Project deletion (deactivation only, future work).

---

## 3. Roles & Permission Matrix

Each role applies **within a single project**. A user can have different roles
in different projects.

| Capability | Owner | System Admin | Manager | General User |
|------------|:-----:|:------------:|:-------:|:------------:|
| Create project (first registration) | ✅ | — | — | — |
| Deactivate project | ✅ | — | — | — |
| Transfer ownership | ✅ | — | — | — |
| Update project settings (name, industry, size) | ✅ | ✅ | — | — |
| Invite members | ✅ | ✅ | — | — |
| Remove members | ✅ | ✅ | — | — |
| Change member role (up to own level) | ✅ | ✅ | — | — |
| View all project assessments | ✅ | ✅ | ✅ | — |
| Export project assessments (CSV) | ✅ | ✅ | ✅ | — |
| View project member list | ✅ | ✅ | ✅ | — |
| Take quiz | ✅ | ✅ | ✅ | ✅ |
| View own assessments | ✅ | ✅ | ✅ | ✅ |
| View project settings (read-only) | ✅ | ✅ | — | — |

**Role change constraint:** a member can only assign roles up to (but not
exceeding) their own. Owner can assign any role. System Admin can assign
System Admin, Manager, or General User — but not Owner.

---

## 4. Data Model

### 4.1 Firestore Collection: `projects/{projectID}`

`projectID` = `companyRegId` (13-digit Thai tax ID — already unique per company).

```jsonc
{
  "projectID":    "0123456789012",
  "name":         "Acme Manufacturing Co.",
  "companyRegId": "0123456789012",
  "industryType": "manufacturing",
  "companySize":  "medium",
  "ownerUID":     "firebase-uid-of-owner",
  "memberCount":  4,
  "isActive":     true,
  "createdAt":    "2026-06-10T08:00:00Z",
  "updatedAt":    "2026-06-10T09:00:00Z"
}
```

### 4.2 Firestore Subcollection: `projects/{projectID}/members/{uid}`

Source of truth for roles and join history. One document per user-project pair.

```jsonc
{
  "uid":           "firebase-uid",
  "email":         "jane@acme.com",
  "displayName":   "Jane Doe",
  "projectRole":   "manager",       // "owner" | "system_admin" | "manager" | "general_user"
  "joinMethod":    "invited",       // "self_registered" | "invited"
  "invitedBy":     "firebase-uid-of-inviter",  // null when joinMethod == "self_registered"
  "invitationToken": "uuid-v4",    // null when joinMethod == "self_registered"
  "joinedAt":      "2026-06-10T08:00:00Z",
  "isActive":      true
}
```

`joinMethod` values:
- `"self_registered"` — this user created the project via `POST /register`; `invitedBy` and `invitationToken` are `null`
- `"invited"` — this user accepted an invitation; `invitedBy` holds the inviter's UID and `invitationToken` holds the consumed token

### 4.3 Firestore Collection: `project_invitations/{token}`

```jsonc
{
  "token":           "uuid-v4",
  "projectID":       "0123456789012",
  "projectName":     "Acme Manufacturing Co.",
  "invitedBy":       "firebase-uid",        // UID of the sender
  "invitedByName":   "Jane Doe",            // display name snapshot
  "role":            "general_user",
  "email":           "bob@acme.com",        // target email (pre-fill only)
  "status":          "pending",             // "pending" | "accepted" | "expired" | "revoked"
  "expiresAt":       "2026-06-17T08:00:00Z",
  "acceptedAt":      null,                  // set when status → "accepted"
  "acceptedByUID":   null,                  // UID of who accepted (may differ from invited email)
  "revokedAt":       null,                  // set when status → "revoked"
  "revokedBy":       null,                  // UID of who revoked
  "emailSentAt":     null,                  // set on successful Resend delivery
  "emailError":      null                   // set on delivery failure
}
```

`isUsed` is replaced by the `status` field — more expressive and queryable.
Invitations expire after **7 days**. A token can only be used once.

**Status transitions:**

```
pending ──→ accepted   (POST /project/join succeeds)
        ──→ expired    (server-side, lazily on next read if now > expiresAt)
        ──→ revoked    (DELETE /project/invitations/{token})
```

`resend` creates a new token in `pending` state and transitions the old token
to `revoked`.

### 4.4 Updated `users/{uid}` document

Two new fields replace the old single `projectID` / `projectRole` pair.

| Field | Type | Note |
|-------|------|------|
| `activeProjectID` | string | The project currently in scope for this session. Set on first join; updated by the project switcher. |
| `projectRoles` | `map<string, string>` | Denormalized mirror of all memberships: `{ "0123456789012": "owner", "0987654321012": "manager" }`. Updated in the same Firestore transaction as the `members` subdoc write. |

The existing `role` field (`"user"` / `"admin"`) is unchanged.

**Why a map instead of reading the subcollection every time:**
Every authenticated API request already reads the user doc (to extract `uid`,
`role`, etc.). Storing the roles map there avoids a second Firestore read on
every project-scoped call. The `members` subcollection remains the authoritative
source; the map is always written in the same transaction.

---

## 5. Registration & Join Flow

### 5.1 All users must register their own project first

Every user must complete a standard registration (`POST /api/v1/register`) with
their own `companyRegId` before they can do anything else — including accepting
an invitation. There is no path that creates a user profile from an invitation.

```
POST /api/v1/register  (unchanged request body)
  → backend checks: does projects/{regId} exist?
      No  → create projects/{regId} (owner = this UID)
           → create projects/{regId}/members/{uid} (role: "owner")
           → set users/{uid}.projectRoles = { regId: "owner" }
           → set users/{uid}.activeProjectID = regId
           → 201 ProfileResponse
      Yes → 409 PROJECT_ALREADY_EXISTS
```

### 5.2 Inviting an existing user

An Owner / System Admin creates an invitation by specifying the
**target project** (`projectID`) and the **role** to grant. The invitation is
sent to an email address so the right person receives the link.

```
POST /api/v1/project/invitations
  Body: { "email": "bob@corp.com", "projectID": "0123456789012", "role": "manager" }

Backend:
  → Validates caller has sufficient role in projectID
  → Creates project_invitations/{token} with projectID + role
  → Fires invitation email (fire-and-forget)
  → 201 { token, email, projectID, role, expiresAt }
```

### 5.3 Accepting an invitation — existing account required

`POST /api/v1/project/join` requires the caller to already have a profile
(`users/{uid}` must exist). If they do not, the endpoint returns
`403 PROFILE_REQUIRED`.

```
POST /api/v1/project/join  { "token": "uuid" }

Backend:
  1. Auth check: valid Firebase token
  2. Profile check: users/{uid} exists → 403 PROFILE_REQUIRED if not
  3. Token check: exists → not used → not expired
  4. Duplicate check: not already a member of projectID
  In a single Firestore transaction:
  5. Mark token isUsed = true, usedAt = now
  6. Create projects/{projectID}/members/{uid} (role from token)
  7. Update users/{uid}.projectRoles[projectID] = role
  → 200 ProfileResponse (updated, activeProjectID unchanged)
```

The user's `activeProjectID` is **not** automatically switched to the new project.
They must switch explicitly via `PUT /api/v1/project/active`.

### 5.4 New user receiving an invitation

```
Invitee receives email with /join?token=<uuid>
  → JoinPage: token preview (project name, role, inviter)
  → Not signed in → Sign in with Google
  → Signed in, no profile (not yet registered):
       Page shows: "You need to register your company before accepting.
                    Create your project first, then return to this link."
       [Go to Register →]  button
  → Completes registration → creates their own project
  → Returns to /join?token=<uuid>
  → Signed in + has profile: "Accept invitation as <name>" button
  → POST /api/v1/project/join
  → Membership added; toast "You've joined {projectName}"
```

### 5.5 Error on self-registration for an existing `companyRegId`

A user who tries to register with a `companyRegId` that already has a project
gets `409 PROJECT_ALREADY_EXISTS`:
> "This company is already registered. Ask your project Owner or Admin to invite you."

---

## 6. User Flow

### 6.1 New User — Registers and Creates Their Own Project

```
Sign in with Google
  → No profile → RegisterPage
  → Fill form + DBD lookup
  → Submit → POST /api/v1/register
  → Own project created; user is Owner
  → activeProjectID set; projectRoles = { regId: "owner" }
  → Redirected to /quiz
```

### 6.2 Invited User — Already Has an Account

```
Receives invite email → clicks /join?token=<uuid>
  → JoinPage (public, outside RegisterGuard)
  → Signs in (or already signed in)
  → Has a profile → "Accept invitation as <displayName>"
  → POST /api/v1/project/join { token }
  → Membership added; projectRoles updated
  → activeProjectID unchanged (user stays in current project)
  → Toast: "You've joined {projectName}. Switch to it from the project switcher."
  → [Switch now] button → PUT /api/v1/project/active { projectID }
```

### 6.3 Invited User — No Account Yet

```
Receives invite email → clicks /join?token=<uuid>
  → JoinPage
  → Signs in with Google
  → No profile found → page shows:
      "You need to create your own company project first
       before you can join {projectName}."
      [Create my project →]  (links to /register, preserves token in state or URL)
  → Completes registration → own project created
  → Automatically returned to /join?token=<uuid>
  → Now has profile → "Accept invitation as <displayName>"
  → POST /api/v1/project/join { token }
  → Membership added; toast shown
```

### 6.4 Project Switcher

```
User clicks project name in nav → dropdown shows all their projects
  → Clicks a different project
  → PUT /api/v1/project/active { projectID }
  → Backend: validate membership, update users/{uid}.activeProjectID
  → Frontend: dispatch setActiveProject; reload scoped data
  → Nav shows new project name
```

### 6.5 Member Management

```
Owner or System Admin visits /project/settings → Members tab
  → List of all active members with role badges
  → Change role via dropdown (constrained to ≤ own role)
  → Remove member (except self if Owner)
  → Resend / revoke pending invitations
```

---

## 7. UI Screens

### 7.1 Project Switcher — Nav (updated)

Desktop nav dropdown / mobile drawer — replaces the plain company name badge.

```
┌─────────────────────────────────────────────────────────┐
│  [🏭 Acme Manufacturing Co.  ▾]   ← current project     │
│  ─────────────────────────────────────────────────────  │
│  ✓  Acme Manufacturing Co.   Owner                       │
│     Beta Corp                Manager                     │
│     Gamma Works              General User                │
│  ─────────────────────────────────────────────────────  │
│  Project Settings                                        │
│  Members                                                 │
└─────────────────────────────────────────────────────────┘
```

The active project shows a checkmark. Project Settings and Members links are
visible only when the user's role in the **active project** is Manager or above.

### 7.2 Join Page (`/join?token=<uuid>`) — new

Three states depending on auth + profile status:

**State A — not signed in**
```
┌───────────────────────────────────────────────────────────────┐
│  FactorySync                                            [EN/TH]│
├───────────────────────────────────────────────────────────────┤
│    You've been invited to join                                 │
│    ┌─────────────────────────────────────────────────────┐    │
│    │  🏭  Acme Manufacturing Co.                          │    │
│    │  Role: Manager    ·   Invited by: Jane Doe           │    │
│    │  Expires: Jun 17, 2026                               │    │
│    └─────────────────────────────────────────────────────┘    │
│    [Sign in with Google]  ← redirects back with token         │
└───────────────────────────────────────────────────────────────┘
```

**State B — signed in, has profile (ready to accept)**
```
│    [Accept invitation as Somchai S.]                          │
│    ← POST /project/join on click                              │
```

**State C — signed in, no profile (must register first)**
```
│    ┌──────────────────────────────────────────────────────┐   │
│    │  ⚠️  You need to register your company first          │   │
│    │  Create your own project before joining others.      │   │
│    │  Your invitation will still be valid after you       │   │
│    │  complete registration.                              │   │
│    └──────────────────────────────────────────────────────┘   │
│    [Create my project →]  ← /register?next=/join?token=<t>   │
```

Expired token → error card + "Ask {inviterName} to send a new invite."
Already-used token → "This invitation has already been accepted."

### 7.3 Project Settings Page (`/project/settings`) — new

Scoped to the **active project**. Accessible to Owner and System Admin only.
Two tabs:

**Tab 1 — General**

```
┌─────────────────────────────────────────────────────────────┐
│  ─── PROJECT DETAILS ──────────────────────────────────────  │
│  [Company Name input]                                        │
│  [Industry Type ▾]          [Company Size ▾]                 │
│  ─── DANGER ZONE ──────────────────────────────────────────  │
│  Transfer Ownership  [Transfer →]   (Owner only)             │
└─────────────────────────────────────────────────────────────┘
```

**Tab 2 — Members**

```
┌─────────────────────────────────────────────────────────────┐
│  Members (4)                              [Invite Member +]  │
│  ─────────────────────────────────────────────────────────  │
│  Avatar  Jane Doe (you)     Owner          ──────────────    │
│  Avatar  Bob Smith          System Admin   [Change ▾] [✕]   │
│  Avatar  Alice Wong         Manager        [Change ▾] [✕]   │
│  Avatar  Tom Lee            General User   [Change ▾] [✕]   │
│  ─────────────────────────────────────────────────────────  │
│  Pending Invitations (1)                                     │
│  charlie@acme.com           General User   [Resend] [Revoke] │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Invite Modal (`Dialog`) — new

```
┌────────────────────────────────────┐
│  Invite Member                   ✕ │
│  ──────────────────────────────── │
│  Email address                     │
│  [email input]                     │
│                                    │
│  Role                              │
│  [Role ▾]  (up to own role)        │
│                                    │
│  [Send Invitation]                 │
└────────────────────────────────────┘
```

---

## 8. Backend API

### 8.1 Registration — updated

**`POST /api/v1/register`** (existing endpoint, body unchanged)

If `companyRegId` has no existing project → create project + owner member doc.
If a project already exists → `409 PROJECT_ALREADY_EXISTS`.

---

### 8.2 Project service — `services/project/`

**`GET /api/v1/project`** — get active project details

Returns the project identified by the caller's `activeProjectID`.

```jsonc
// 200
{
  "success": true,
  "data": {
    "projectID":    "0123456789012",
    "name":         "Acme Manufacturing Co.",
    "industryType": "manufacturing",
    "companySize":  "medium",
    "ownerUID":     "firebase-uid",
    "memberCount":  4,
    "myRole":       "owner"          // caller's role in this project
  }
}
```

Errors: `401 UNAUTHORIZED`, `404 PROJECT_NOT_FOUND`

---

**`GET /api/v1/project/memberships`** — list all projects the user belongs to

No role restriction — any authenticated user can call this.

```jsonc
// 200
{
  "success": true,
  "data": [
    {
      "projectID":   "0123456789012",
      "name":        "Acme Manufacturing Co.",
      "industryType":"manufacturing",
      "companySize": "medium",
      "role":        "owner",
      "isActive":    true            // true = this is activeProjectID
    },
    {
      "projectID":   "0987654321012",
      "name":        "Beta Corp",
      "industryType":"food",
      "companySize": "small",
      "role":        "manager",
      "isActive":    false
    }
  ],
  "total": 2
}
```

---

**`PUT /api/v1/project/active`** — switch active project

```jsonc
// Request
{ "projectID": "0987654321012" }

// 200 — ProfileResponse with updated activeProjectID
```

Backend validates the caller is an active member of `projectID` before
updating `users/{uid}.activeProjectID`.

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN` (not a member), `404 PROJECT_NOT_FOUND`

---

**`PUT /api/v1/project`** — update active project settings

Requires `owner` or `system_admin` role in the active project.

```jsonc
// Request
{ "name": "Acme Co.", "industryType": "electronics", "companySize": "large" }

// 200 — same shape as GET /api/v1/project
```

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 PROJECT_NOT_FOUND`

---

**`GET /api/v1/project/members`** — list members of active project

Requires `manager` role or higher.

```jsonc
// 200
{
  "success": true,
  "data": [
    {
      "uid":         "firebase-uid",
      "email":       "jane@acme.com",
      "displayName": "Jane Doe",
      "projectRole": "owner",
      "joinedAt":    "2026-06-10T08:00:00Z",
      "isActive":    true
    }
  ],
  "total": 4
}
```

---

**`PUT /api/v1/project/members/{uid}/role`** — change a member's role

Requires `owner` or `system_admin`. Cannot assign higher than own role.
Owner cannot demote themselves — use transfer first.

```jsonc
// Request  { "role": "manager" }
// 200 — updated member object
```

Errors: `400 INVALID_ROLE`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 MEMBER_NOT_FOUND`

Also updates `users/{uid}.projectRoles[activeProjectID]` in the same transaction.

---

**`DELETE /api/v1/project/members/{uid}`** — remove a member

Requires `owner` or `system_admin`. Owner cannot remove themselves.

Sets `members/{uid}.isActive = false` and deletes
`users/{uid}.projectRoles[projectID]` atomically.

If the removed user's `activeProjectID` equals this project, set their
`activeProjectID` to another remaining project (if any) or empty string.

```jsonc
// 204 No Content
```

---

**`POST /api/v1/project/invitations`** — create an invitation

Requires `manager` role or higher **in the specified `projectID`**. The
`projectID` in the body determines which project the invitee will join.

```jsonc
// Request
{
  "email":     "charlie@acme.com",
  "projectID": "0123456789012",
  "role":      "general_user"
}

// 201
{
  "success": true,
  "data": {
    "token":     "uuid-v4",
    "email":     "charlie@acme.com",
    "projectID": "0123456789012",
    "role":      "general_user",
    "expiresAt": "2026-06-17T08:00:00Z"
  }
}
```

---

**`GET /api/v1/project/invitations`** — list pending invitations

Requires `owner` or `system_admin`.

---

**`DELETE /api/v1/project/invitations/{token}`** — revoke an invitation

Requires `owner` or `system_admin`.

---

**`GET /api/v1/project/join/{token}`** — preview invitation (Public)

No auth. Returns project name, inviter name, role, expiry.

```jsonc
// 200
{
  "success": true,
  "data": {
    "projectName": "Acme Manufacturing Co.",
    "invitedBy":   "Jane Doe",
    "role":        "general_user",
    "expiresAt":   "2026-06-17T08:00:00Z"
  }
}
```

Errors: `404 INVITATION_NOT_FOUND`, `410 INVITATION_EXPIRED`, `409 INVITATION_ALREADY_USED`

---

**`POST /api/v1/project/join`** — accept an invitation

Auth required. Caller **must already have a profile** (`users/{uid}` must exist).
If they do not, the endpoint returns `403 PROFILE_REQUIRED` — they must complete
registration first.

```jsonc
// Request  { "token": "uuid-v4" }

// 200 — ProfileResponse (profile unchanged; only projectRoles map is updated)
```

The four writes (mark token used, create member doc, update `projectRoles`,
optionally set `activeProjectID` if this is the user's first non-home project)
execute in a single Firestore transaction.

Errors: `400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `403 PROFILE_REQUIRED`,
`404 INVITATION_NOT_FOUND`, `409 INVITATION_ALREADY_USED`,
`409 ALREADY_MEMBER`, `410 INVITATION_EXPIRED`

---

**`POST /api/v1/project/transfer`** — transfer ownership (Owner only)

```jsonc
// Request  { "newOwnerUID": "firebase-uid" }
// 200 — updated project object
```

After transfer: caller's `projectRoles[projectID]` becomes `"system_admin"`.

---

### 8.3 Middleware: `RequireProjectRole`

Reads the caller's role for the active project from `users/{uid}.projectRoles`
(already in memory after `FirebaseAuth` runs — no extra Firestore call needed).

An `X-Project-ID` request header overrides `activeProjectID` — useful for
operating on a non-active project without switching context.

```go
// Usage in handler Routes()
r.With(middleware.RequireProjectRole(svc, "owner", "system_admin")).
    Put("/", h.UpdateProject)
```

Returns `403 FORBIDDEN` if the role is insufficient or the user is not a member
of the requested project.

---

## 9. Sentinel Errors

| Error | Package | Condition |
|-------|---------|-----------|
| `ErrProjectNotFound` | `project` | No project document for the given ID |
| `ErrProjectAlreadyExists` | `project` | `companyRegId` already has a project |
| `ErrMemberNotFound` | `project` | UID not in `members` subcollection |
| `ErrAlreadyMember` | `project` | User is already an active member of this project |
| `ErrInvitationNotFound` | `project` | Token does not exist |
| `ErrInvitationAlreadyUsed` | `project` | Token `isUsed == true` — checked **before** expiry |
| `ErrInvitationExpired` | `project` | Token past its `expiresAt` — checked after used flag |
| `ErrInsufficientRole` | `project` | Caller's role too low for the action |
| `ErrCannotRemoveOwner` | `project` | Attempt to remove or demote the Owner |
| `ErrNotAMember` | `project` | Caller not in the target project (switch attempt) |
| `ErrProfileRequired` | `project` | Caller has no profile — must register before accepting an invitation |

**Validation order for invitation tokens** (enforced by `service.ValidateInvitationToken`):

```
1. Get invitation doc            → ErrInvitationNotFound  if missing
2. invitation.IsUsed == false    → ErrInvitationAlreadyUsed if true
3. now.Before(invitation.ExpiresAt) → ErrInvitationExpired if past TTL
```

Used-before-expired ordering is intentional: if a token was both used and
expired, returning `ErrInvitationAlreadyUsed` tells the inviter their link
was acted on — not just abandoned after TTL.

---

## 10. Firestore Security Rules Changes

```javascript
match /projects/{projectID} {
  allow read: if isProjectMember(projectID);
  allow write: if false;  // backend-only

  match /members/{uid} {
    allow read: if isProjectMember(projectID);
    allow write: if false;
  }
}

match /project_invitations/{token} {
  allow read, write: if false;  // backend-only
}

// Helper: check projectRoles map on the user doc (avoids a subcollection read)
function isProjectMember(projectID) {
  return request.auth != null &&
    request.auth.uid in get(
      /databases/$(database)/documents/users/$(request.auth.uid)
    ).data.projectRoles &&
    get(
      /databases/$(database)/documents/users/$(request.auth.uid)
    ).data.projectRoles[projectID] != null;
}
```

---

## 11. Result Scoping Changes

`GET /api/v1/results?scope=project` returns all assessments for the **active
project** when the caller has `manager` role or higher.

```
GET /api/v1/results               → caller's own assessments (unchanged)
GET /api/v1/results?scope=project → all assessments scoped to activeProjectID
```

Assessments now store a `projectID` field so the Firestore query can filter
by `projectID == activeProjectID`.

---

## 12. Migration Path (Existing Users)

One-off migration script `cmd/migrate-projects/main.go`:

1. Iterate all `users/{uid}` documents.
2. Group by `companyRegId`. The user with the earliest `createdAt` per group becomes `owner`; all others become `general_user`.
3. For each group, create `projects/{regId}` with the owner's company data.
4. Create `projects/{regId}/members/{uid}` for each user in the group.
5. Write `projectRoles = { regId: role }` and `activeProjectID = regId` back to each user doc.
6. Wrap each group in a Firestore transaction to avoid partial writes.
7. Add `projectID` to every existing `assessments/{id}` document (derived from the submitting user's `companyRegId` at submission time).

Existing system admin users are unaffected.

---

## 13. Route Changes

| New Route | Guard | Component |
|-----------|-------|-----------|
| `/join` | Public | `JoinPage` |
| `/project/settings` | `RegisterGuard` + `ProjectRoleGuard(system_admin+)` | `ProjectSettingsPage` |
| `/project/settings/members` | `RegisterGuard` + `ProjectRoleGuard(manager+)` | `ProjectMembersPage` |

`ProjectRoleGuard` reads `projectRoles[activeProjectID]` from Redux and redirects
to `/` if the user's role in the active project is insufficient.

---

## 14. Redux Changes

```typescript
type ProjectRole = 'owner' | 'system_admin' | 'manager' | 'general_user';

interface ProjectMembership {
  projectID:    string;
  name:         string;
  industryType: string;
  companySize:  string;
  role:         ProjectRole;
}

interface AuthState {
  // ...existing fields...
  activeProjectID:   string | null;
  projectRoles:      Record<string, ProjectRole>;  // { projectID: role }
  projectMemberships: ProjectMembership[];          // populated by GET /project/memberships
}

// Derived selector (no extra API call needed for role checks)
const selectActiveProjectRole = (state: RootState): ProjectRole | null =>
  state.auth.activeProjectID
    ? state.auth.projectRoles[state.auth.activeProjectID] ?? null
    : null;
```

`profileResponse` from `GET /api/v1/profile` returns `activeProjectID` and
`projectRoles` — both are loaded into Redux on sign-in.

`projectMemberships` (full project names etc.) is loaded separately by
`GET /api/v1/project/memberships` — called once after sign-in and after
each project switch.

---

## 15. i18n Keys

| Key | TH (approx.) | EN |
|-----|-------------|----|
| `project.title` | โปรเจกต์ | Project |
| `project.settings` | ตั้งค่าโปรเจกต์ | Project Settings |
| `project.members` | สมาชิก | Members |
| `project.invite` | เชิญสมาชิก | Invite Member |
| `project.switch` | สลับโปรเจกต์ | Switch Project |
| `project.switchSuccess` | เปลี่ยนโปรเจกต์เป็น {{name}} แล้ว | Switched to {{name}} |
| `project.role.owner` | เจ้าของ | Owner |
| `project.role.system_admin` | ผู้ดูแลระบบ | System Admin |
| `project.role.manager` | ผู้จัดการ | Manager |
| `project.role.general_user` | ผู้ใช้ทั่วไป | General User |
| `project.join.title` | คุณได้รับเชิญเข้าร่วม | You've been invited to join |
| `project.join.accept` | ยอมรับคำเชิญในฐานะ {{name}} | Accept invitation as {{name}} |
| `project.join.signIn` | ลงชื่อเข้าใช้เพื่อยอมรับ | Sign in to accept invitation |
| `project.join.joined` | เข้าร่วม {{name}} แล้ว | You've joined {{name}} |
| `project.join.switchNow` | สลับไปเลย | Switch now |
| `project.join.expired` | คำเชิญหมดอายุแล้ว | This invitation has expired |
| `project.join.used` | คำเชิญนี้ถูกใช้แล้ว | This invitation has already been used |
| `project.error.alreadyExists` | บริษัทนี้ลงทะเบียนแล้ว กรุณาขอรับคำเชิญ | This company is already registered. Request an invite from your admin. |

---

## 16. Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `project_created` | `POST /register` creates project | `{ projectID, industryType, companySize }` |
| `project_switched` | `PUT /project/active` | `{ fromProjectID, toProjectID }` |
| `member_invited` | `POST /project/invitations` | `{ role }` |
| `member_joined` | `POST /project/join` | `{ role, isNewUser: bool }` |
| `member_role_changed` | `PUT /project/members/{uid}/role` | `{ oldRole, newRole }` |
| `member_removed` | `DELETE /project/members/{uid}` | — |
| `ownership_transferred` | `POST /project/transfer` | — |

---

## 17. Open Tasks

### 17.1 Project deactivation
Owner can deactivate a project, blocking all member access without deleting
data. Deactivated projects are hidden from the project switcher.

### 17.2 Bulk invite (CSV upload)
Upload a CSV of emails + roles to send batch invitations in one action.

### 17.3 Email notification preferences per role
Managers receive an email summary of new assessments. Configurable per member.

### 17.4 Cross-project admin view (system admin only)
System admin (`role == "admin"`) can inspect any project's assessments without
being a member. Currently scoped to their own memberships only.

---

## 18. Acceptance Criteria

- [ ] Registering with a new `companyRegId` creates a project; user becomes Owner.
- [ ] Registering with an existing `companyRegId` returns `409 PROJECT_ALREADY_EXISTS` with a message directing the user to request an invitation.
- [ ] `POST /project/invitations` requires `projectID` and `role` in the body; caller must hold at least Manager role in the specified project.
- [ ] A user with an existing profile can accept an invitation and gain a second membership without losing the first.
- [ ] `POST /project/join` returns `403 PROFILE_REQUIRED` when the caller has no profile; the response message instructs them to register first.
- [ ] `JoinPage` shows the "register first" state (State C) when the user is signed in but has no profile, with a "Create my project →" button that links to `/register?next=/join?token=<t>`.
- [ ] `PUT /project/active` switches the scoped project; all subsequent API calls use the new context.
- [ ] The project switcher in the nav shows all memberships with roles; the active project is checked.
- [ ] Invite link previews project name and role before sign-in; reveals no member list or assessment data.
- [ ] Already-signed-in user sees "Accept as <name>" instead of the sign-in button on `JoinPage`.
- [ ] An expired token returns `410 INVITATION_EXPIRED` with a "contact your admin" message.
- [ ] An already-used token returns `409 INVITATION_ALREADY_USED` even if it has also expired.
- [ ] Accepting an invitation is atomic — a second concurrent `POST /project/join` with the same token returns `409 INVITATION_ALREADY_USED`; the member is not duplicated.
- [ ] Owner can invite, remove, and change roles for any member.
- [ ] System Admin cannot assign or surpass Owner role.
- [ ] Manager can invite but cannot remove members or change roles.
- [ ] General User sees no project management UI and cannot access `/project/settings`.
- [ ] `GET /api/v1/results?scope=project` returns all assessments for the **active project** for Manager+.
- [ ] Removing a member also removes their `projectRoles[projectID]` entry and updates `activeProjectID` if needed.
- [ ] Role changes update both the `members` subdoc and `users/{uid}.projectRoles` atomically.
- [ ] All copy renders in TH/EN via `useLocale()`.
- [ ] `make lint` and `make test` pass.

---

## 19. Build Order

| # | Task | Depends On |
|---|------|-----------|
| 1 | `services/project/models.go` — Project, Member, Invitation structs | — |
| 2 | `services/project/repository.go` — CRUD for projects + members + invitations | 1 |
| 3 | `services/project/service.go` — business logic + sentinel errors | 2 |
| 4 | `services/project/handler.go` — all REST endpoints | 3 |
| 5 | `middleware/project_role.go` — `RequireProjectRole` (reads `projectRoles` map) | 3 |
| 6 | Update `services/profile/service.go` — create project on first register | 2 |
| 7 | Update `services/result/handler.go` — add `?scope=project` + `projectID` filter | 5 |
| 8 | Update `firestore.rules` — `isProjectMember` via `projectRoles` map | 2 |
| 9 | Migration script `cmd/migrate-projects/main.go` | 2 |
| 10 | Frontend: `authSlice` — add `activeProjectID`, `projectRoles`, `projectMemberships` | — |
| 11 | Frontend: `selectActiveProjectRole` selector | 10 |
| 12 | Frontend: `ProjectRoleGuard` | 11 |
| 13 | Frontend: `JoinPage` (handles new + existing users) | 10 |
| 14 | Frontend: Project switcher in nav | 10 |
| 15 | Frontend: `ProjectSettingsPage` (general tab) | 12 |
| 16 | Frontend: `ProjectMembersPage` + `InviteModal` | 12 |
| 17 | Notification service — invitation email template | 4 |

---

## 20. References

- Register feature: [register/feature-spec.md](../register/feature-spec.md)
- Auth feature (guards + roles): [auth/feature-spec.md](../auth/feature-spec.md)
- Profile feature: [profile/feature-spec.md](../profile/feature-spec.md)
- Admin feature (system-level admin): [admin/feature-spec.md](../admin/feature-spec.md)
- Result feature (assessment scoping): [result/feature-spec.md](../result/feature-spec.md)
- Notification service: [notification/feature-spec.md](../notification/feature-spec.md)

---

*Version: 1.2.0*
*Last updated: 3 July 2026*
