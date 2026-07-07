---
isoOutput: SI.O1
version: 1.0.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Approved — implemented & merged on feature/web-cms-sonicjs
---

# Software Requirements Specification — Backoffice → CMS SSO Handover

*ISO 29110 Basic Profile · SI.O1*

> Back-filled SRS: this feature shipped on `feature/web-cms-sonicjs` before the
> formal SRS was written. Documented here to reconcile the artifact set with the
> as-built implementation. Design index: [README.md](./README.md).

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Backoffice → CMS SSO Handover (`sso-handover`) |
| **Version** | 1.0.0 |
| **Status** | Approved (as-built) |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-06-30 |
| **Approved By** | N/A — VSE self-approval |
| **Approval Date** | 2026-06-30 |

---

## 1. Introduction

### 1.1 Purpose
web-cms (the SonicJS blog/CMS on Cloudflare Workers) runs its own authentication,
separate from the Firebase-backed web-backoffice. This feature lets a user already
signed into web-backoffice open the CMS `/admin` in a new tab **without a second
login**, by handing off the user's Firebase ID token to the CMS, which verifies it,
provisions/maps the user, and starts a CMS admin session.

### 1.2 Scope
**In scope:** one-directional handover (backoffice → CMS); Firebase ID token
verification inside the Worker; backoffice→CMS role mapping; user provisioning into
the CMS `auth_user` + `rbac_user_roles` tables; CMS session minting; the legacy
`auth_token` bridge that lets the handed-off session satisfy the `/admin` guard.

**Out of scope:** CMS → backoffice handover; a shared SSO cookie/session domain;
live propagation of role revocation to issued CMS sessions; self-service CMS signup;
SAML/OIDC.

### 1.3 Definitions & Abbreviations

| Term | Definition |
|---|---|
| **Handover** | Passing the Firebase ID token from backoffice to CMS to establish a CMS session |
| **`backofficeRole`** | Firebase custom claim (`superadmin` / `staff`) set server-side by the Go backend |
| **CMS role** | SonicJS role (`admin` / `editor`) the handover maps the backoffice role to |
| **`auth_token`** | Legacy SonicJS JWT (signed with `JWT_SECRET`) that the handover mints as the session cookie |
| **RBAC** | SonicJS `rbac_user_roles` — the table the `/admin` route actually gates on |
| **JWKS** | Google's published RS256 public keys used to verify Firebase ID tokens |
| **beforeAuth / afterAuth** | SonicJS middleware hooks that run before / after core auth |

### 1.4 References

| Document | Link |
|---|---|
| Design index | [README.md](./README.md) |
| Backoffice feature spec | [../backoffice/feature-spec.md](../backoffice/feature-spec.md) |
| Auth feature spec | [../auth/feature-spec.md](../auth/feature-spec.md) |
| Backend auth middleware | [middleware/auth.go](../../../apps/backend/middleware/auth.go) |
| Firebase verify-id-tokens | https://firebase.google.com/docs/auth/admin/verify-id-tokens |

---

## 2. Overall Description

### 2.1 Product Context
Spans three packages:
- **web-backoffice** (initiator) — Sidebar Blog button → `openCmsBlog` posts the token.
- **packages/shared** — `getCmsSsoUrl` / `getCmsAdminUrl` resolve the CMS base URL per env.
- **web-cms** (verifier + session) — `beforeAuth` handover middleware, `firebase-verify`,
  `handover`, and the `afterAuth` `auth-token-bridge`.

The Go backend is an indirect dependency: it mints the `backofficeRole` custom claim that
web-cms trusts.

### 2.2 User Classes & Characteristics

| User Class | Description | Access Level |
|---|---|---|
| Super Admin | Backoffice user with `backofficeRole: "superadmin"` | → CMS `admin` |
| Backoffice Staff | Backoffice user with `backofficeRole: "staff"` | → CMS `editor` |
| Other authenticated user | Signed into Firebase but no `backofficeRole` | **Denied (403)** |

### 2.3 Assumptions & Dependencies
- The user is already signed into web-backoffice (a valid Firebase session exists).
- The Go backend has set the `backofficeRole` custom claim on the user.
- `FIREBASE_PROJECT_ID` and `JWT_SECRET` are configured on the CMS Worker.
- The `auth_user` schema patch ([0001_auth_user_authfields.sql](../../../apps/web-cms/patches/0001_auth_user_authfields.sql)) has been applied to the target D1 database.
- SonicJS core (`@sonicjs-cms/core@3.0.0-beta.20`) gates `/admin` on `rbac_user_roles` and
  exposes `beforeAuth`/`afterAuth` middleware hooks and `AuthManager`/`RbacService`.

### 2.4 Constraints
- web-cms is TypeScript on Cloudflare Workers — no firebase-admin / Node SDK; token
  verification uses `jose` against Google's JWKS.
- The token must never appear in a URL/query/referer — POST body only.
- Core's `csrfProtection()` is hardcoded with no exempt-path config; the handover route
  must be handled in `beforeAuth` to legitimately bypass CSRF.

---

## 3. Functional Requirements

### 3.1 Initiation (web-backoffice)

#### FR-001 — Initiate handover from the Blog menu

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Source** | Backoffice staff (CMS access without re-login) |
| **Test Case** | TC-001 |

**Description:** The system shall, when a signed-in backoffice user activates the Blog menu
item, open a new tab and submit the user's Firebase ID token via a top-level form POST to the
CMS `/sso/handover` endpoint.

**Acceptance Criteria:**
- Given a signed-in user, when they click Blog, then a new tab opens and a `POST` carrying the
  ID token in the body (not the URL) is sent to `<cmsBase>/sso/handover`.
- Given no current Firebase user / no obtainable token, when they click Blog, then the opened
  tab is closed and no request is sent.
- Given the click gesture, when the token is awaited, then the target tab was already opened
  synchronously so the submit is not blocked as a popup.

### 3.2 Verification & session (web-cms)

#### FR-002 — Verify the Firebase ID token

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-002 |

**Description:** The system shall verify the RS256 signature against Google's JWKS and assert
`iss`, `aud`, and `exp` for `FIREBASE_PROJECT_ID` before trusting any claim.

**Acceptance Criteria:**
- Given a valid, unexpired token, when posted, then `uid`, `email`, `name`, and `backofficeRole`
  are extracted from the verified payload.
- Given an invalid/expired/wrong-audience token, when posted, then the user is redirected to
  `/auth/login` and no session is minted.
- Given a token missing `uid` or `email`, when verified, then verification throws and the user
  is redirected to `/auth/login`.

#### FR-003 — Map backoffice role to CMS role

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-003 |

**Description:** The system shall map `backofficeRole` → CMS role: `superadmin`→`admin`,
`staff`→`editor`; any other value yields no role.

**Acceptance Criteria:**
- Given `superadmin`, then CMS role is `admin`; given `staff`, then `editor`.
- Given any other/absent value, when handover proceeds, then respond `403` "Your account does
  not have access to the CMS" and mint no session.

#### FR-004 — Provision / synchronize the CMS user

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-004 |

**Description:** The system shall upsert the `auth_user` row by email (create if absent with
`is_active=1`, `email_verified=1`; otherwise sync `role`/`name` and reactivate) and assign the
matching `rbac_user_roles` entry idempotently.

**Acceptance Criteria:**
- Given a first-time user, when handover succeeds, then an `auth_user` row and an
  `rbac_user_roles` entry for the mapped role exist.
- Given a returning user whose role changed, when handover succeeds, then the `auth_user.role`
  is updated and the account is active.
- Given a name with no space, when the row is created, then `last_name` falls back to `-`
  (it is `NOT NULL`).

#### FR-005 — Mint the CMS session and redirect

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-005 |

**Description:** The system shall mint the `auth_token` JWT (signed with `JWT_SECRET`), set it
as the auth cookie, and `302` redirect to `/admin`.

**Acceptance Criteria:**
- Given a successful handover, when it completes, then `Set-Cookie: auth_token` is returned and
  the response redirects to `/admin`.
- Given the redirect is followed, when `/admin` loads, then the user is authenticated (see FR-007).

#### FR-006 — CSRF-exempt handover route

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-006 |

**Description:** The system shall handle `POST /sso/handover` in `beforeAuth`, ahead of core's
`csrfProtection()`, so a repeat handover (with an existing `auth_token` cookie) is not rejected.

**Acceptance Criteria:**
- Given an existing `auth_token` cookie, when the user handovers again, then it succeeds without
  a `403 CSRF token missing`.

#### FR-007 — Bridge the legacy token to the `/admin` guard

| Field | Value |
|---|---|
| **Priority** | Must Have |
| **Test Case** | TC-007 |

**Description:** The system shall, in `afterAuth`, populate `c.get('user')` from a valid
`auth_token` when no better-auth session was established, so the `/admin` guard accepts the
handed-off session.

**Acceptance Criteria:**
- Given a handed-off `auth_token` and no better-auth session, when `/admin` loads, then
  `c.get('user')` is set from the token claims (`isSuperAdmin: false`) and access is granted.
- Given a better-auth session already exists, when the bridge runs, then it does not overwrite it.

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Handover round-trip (verify → upsert → redirect) ≤ 1s p95; JWKS keys are cached by `jose`.

### 4.2 Security
- [x] Role derived only from the **signed** `backofficeRole` claim, never the request body.
- [x] Token transported in a POST body, never a URL/query/referer.
- [x] `auth_token` is a JWT signed with `JWT_SECRET` (Worker secret, never committed).
- [x] Non-backoffice users rejected `403` before any session is minted.
- [x] SSO users are never platform super-admins (`is_super_admin=0`, bridge sets `isSuperAdmin:false`).
- [x] CSRF exemption justified: the unforgeable Firebase ID token is the anti-CSRF token.

### 4.3 Usability
- [ ] CMS opens in a dedicated named tab (`fs-cms-blog`); no second sign-in prompt.
- [ ] Denied users see a clear access-restricted message.

### 4.4 Reliability
- [x] Invalid/expired tokens degrade to the normal `/auth/login` page (no error page).
- [x] User provisioning is idempotent — repeat handovers do not duplicate users or roles.

### 4.5 Maintainability
- [x] No nested ternaries; no dead code.
- [x] The out-of-band schema patch is documented and removable once core ships the columns.

---

## 5. Interface Requirements

### 5.1 Endpoints (web-cms Worker)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/sso/handover` | Firebase ID token (form body) | Verify token, provision user, mint `auth_token`, redirect `/admin` |
| GET | `/admin` | `auth_token` cookie (via bridge) or better-auth session | CMS admin dashboard |

### 5.2 UI Surfaces

| Surface | Guard | Description |
|---|---|---|
| web-backoffice Sidebar **Blog** button | backoffice session | Triggers `openCmsBlog` |
| web-cms `/admin` | RBAC `portal:access` via `rbac_user_roles` | CMS dashboard |

### 5.3 External Interfaces
- **Firebase Auth** — issues the ID token (incl. `backofficeRole` claim).
- **Google JWKS** — `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`.

---

## 6. Data Requirements

### 6.1 D1 Tables (SonicJS core)

| Table | Document/Row | Key Fields | Notes |
|---|---|---|---|
| `auth_user` | id (UUID) | `email` (unique lookup), `role`, `name`, `first_name`, `last_name`, `is_active`, `email_verified` | Upserted by email; `last_name` NOT NULL |
| `rbac_user_roles` | (userId, role) | mapped role (`admin`/`editor`) | True `/admin` gate; assigned idempotently |

> Requires patch [0001_auth_user_authfields.sql](../../../apps/web-cms/patches/0001_auth_user_authfields.sql)
> (`password_reset_token`, `password_reset_expires`, `two_factor_enabled`) — core beta.20's
> migration omits columns its runtime model expects.

### 6.2 Validation Rules
- `token` form field required and non-empty (else redirect `/auth/login`).
- Verified token must carry non-empty `uid` and `email`.
- `backofficeRole` must be `superadmin` or `staff` (else `403`).

---

## 7. Traceability Matrix

| Requirement | Design Reference | Test Case | Status |
|---|---|---|---|
| FR-001 | [README § Sequence](./README.md#sequence), `cmsSso.ts` | TC-001 | Implemented |
| FR-002 | `firebase-verify.ts` | TC-002 | Implemented |
| FR-003 | `handover.ts` `mapCmsRole` | TC-003 | Verified (unit) |
| FR-004 | `handover.ts` `upsertUser`/`splitName` | TC-004 | Implemented (helper verified) |
| FR-005 | `handover.ts` `handleHandover` | TC-005 | Implemented |
| FR-006 | `middleware.ts` | TC-006 | Implemented |
| FR-007 | `auth-token-bridge.ts` | TC-007 | Implemented |

*Status: Not Started / In Progress / Implemented / Verified.*

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-06-30 | Sathittham Sangthong | Initial (back-filled) SRS for as-built handover |

---

*Version: 1.0.0*
*Last updated: 4 July 2026*
