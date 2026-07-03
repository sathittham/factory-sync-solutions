# Backend Auth Middleware

## Summary

Chi middleware in `apps/backend/middleware/auth.go` that authenticates every protected
request (`FirebaseAuth`) and authorizes role-gated route groups (`RequireAdmin`,
`RequireBackofficeRole`). Provider-agnostic — it verifies the ID token, not how the user
signed in. Shared by `web-app` and `web-backoffice`.

## Implementation

### `FirebaseAuth` — authentication

Applied to every protected route group in `main.go`.

```
# pseudocode
read Authorization header → require "Bearer " prefix
VerifyIDToken(token) via Firebase Admin SDK
ok  → inject into request context: UID, email, displayName
err → 401 UNAUTHORIZED (pkg.RespondError)
```

Handlers read the verified values only via the extractors:
`middleware.GetUID(r)` · `middleware.GetEmail(r)` · `middleware.GetDisplayName(r)`.
The UID is never read from the request body or path params.

### `RequireAdmin` — authorization (web-app admin)

Layered after `FirebaseAuth` on the `/api/v1/admin/…` route group only.

```
# pseudocode
uid = GetUID(r)
user = authClient.GetUser(ctx, uid)          # fetch Firebase user record
user.CustomClaims["role"] == "admin" ? next : 403 FORBIDDEN
```

### `RequireBackofficeRole` — authorization (backoffice)

Layered after `FirebaseAuth` on the `/api/v1/backoffice/…` route group; checks
`backofficeRole ∈ {"superadmin","staff"}`. Superadmin-only routes nest a second
`RequireBackofficeRole` allowing `"superadmin"` only.

### Claims are set out-of-band

Custom claims are the authoritative role source, set by an operator via the Firebase Admin
SDK (`setCustomUserClaims(uid, { role | backofficeRole })`) — never by users or the API.

## Configuration

| Env var | Description |
|---------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to the Firebase Admin SDK service-account JSON (`firebase-sa.json`, git-ignored) |

## Usage

Wiring in `apps/backend/main.go`:

```
# pseudocode — route-group layering
/api/v1/<service>    → FirebaseAuth
/api/v1/admin        → FirebaseAuth → RequireAdmin
/api/v1/backoffice   → FirebaseAuth → RequireBackofficeRole("superadmin","staff")
  destructive routes → nested RequireBackofficeRole("superadmin")
```

```
# pseudocode — handler side
uid := middleware.GetUID(r)                  # never from body/path
missing/invalid token → pkg.RespondError(w, 401, "UNAUTHORIZED", msg)
claim absent/wrong    → pkg.RespondError(w, 403, "FORBIDDEN", msg)
```

## Acceptance Criteria

- Given no (or a malformed) `Authorization` header, when any protected route is called, then `401 UNAUTHORIZED`.
- Given a valid token without the `role: "admin"` claim, when an `/admin` route is called, then `403 FORBIDDEN`.
- Given a valid token without a `backofficeRole` claim, when a `/backoffice` route is called, then `403 FORBIDDEN`.
- Given a valid token, when a handler runs, then UID/email/displayName come from the request context only.

## Status

- [x] `FirebaseAuth` middleware — `apps/backend/middleware/auth.go`
- [x] `RequireAdmin` middleware — same file
- [x] `RequireBackofficeRole` middleware — same file
- [x] Context extractors (`GetUID`, `GetEmail`, `GetDisplayName`)
- [ ] Deny-path assertions (401/403) recorded per service in [status.md](./status.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
