# Admin API (backend)

## Summary

Ten endpoints across two auth-gated groups plus one shared, implemented in
`apps/backend/services/admin/handler.go` and registered in `main.go`. The service owns no
collection itself — it composes the result, profile, audit, and notification services.

| Group | Path prefix | Guard | Purpose |
|-------|------------|-------|---------|
| Admin | `/api/v1/admin/*` | `FirebaseAuth` + `RequireAdmin` (Firebase custom claim `role == "admin"`) | Assessments + legacy user/role read-write |
| Manage | `/api/v1/manage/*` | `FirebaseAuth` + `RequireFirestoreRole(fsClient, "owner", "system_admin", "admin")` | User/role read-write + member invitations |
| Shared | `/api/v1/invitations/accept` | `FirebaseAuth` only (no role check) | Invited user has no profile/role yet |

`ListUsers` and `SetUserRole` are registered under **both** `/admin` and `/manage` — same
handler methods, two different guards. This is a known overlap (see
[status.md](./status.md)), not an intentional two-tier design; the frontend now calls the
`/manage/*` paths exclusively.

## Implementation

### Admin group (`/api/v1/admin/*`, `RequireAdmin`)

- `GET /admin/assessments` — lists assessments enriched with profile data. `limit`
  default 100, max 500 (clamped by `parseLimit`). `industryType` / `companySize` are read
  from the query string and applied as an **in-memory filter after enrichment** (profile
  fields aren't native to the `assessments` collection, so they can't be pushed into the
  Firestore query without denormalizing). Not the most efficient path at scale, but no
  longer a no-op.
- `GET /admin/assessments/{assessmentId}` — single assessment plus `scores`,
  `strengths`, `weaknesses`. The path param is validated against a UUIDv4 regex before
  any Firestore read (400 on mismatch). Calls `resultSvc.GetResultByID` — a direct
  Firestore `Get` by document ID (404 via `result.ErrResultNotFound`), not a scan.
- `GET /admin/export` — streams up to 10,000 rows as `text/csv` with
  `Content-Disposition: attachment; filename=assessments.csv`. The one endpoint that does
  not use `pkg.RespondJSON`. Columns, in order: ID, UID, Company Name, Industry Type,
  Company Size, Contact Name, Contact Email, Overall Score (`%.2f`), Diagnosis,
  Submitted At (ISO 8601). Logs an `admin.export` audit event (`audit.EventAdminExport`)
  with the exported row count. A Firestore failure before writing begins returns a JSON
  error body; a mid-stream failure truncates the output.
- `GET /admin/users` — see Manage group below (same handler).
- `PUT /admin/users/{uid}/role` — see Manage group below (same handler).

### Manage group (`/api/v1/manage/*`, `RequireFirestoreRole`)

- `GET /manage/users` — lists all registered profiles, plus any pending (unaccepted)
  invitations appended from the `invitations` collection (`isPending: true`, no
  Firestore profile yet). `limit` default 200, max 500 — the limit applies to the
  registered-profile page; pending invitations are fetched separately (up to 500,
  filtered to non-expired) and always appended. Each registered user is enriched with
  their Firebase Auth `photoURL` via a batched `authClient.GetUsers` lookup (chunked at
  100 UIDs per call).
- `PUT /manage/users/{uid}/role` — role change. `uid` validated (non-empty, ≤128 chars);
  body `role` must be one of `"user"`, `"manager"`, `"system_admin"`, `"owner"` (400
  otherwise). **Dual write, claims-first**: (1) `authClient.SetCustomUserClaims` →
  Firebase (authoritative for `RequireAdmin`), (2) `profileSvc.SetRole` → Firestore. Logs
  a `user.role_changed` audit event (`audit.EventUserRoleChanged`) with the old/new role
  and actor details.
- `POST /manage/invitations` — invites a new member by email + role. Looks up or creates
  a Firebase Auth user (`resolveOrCreateAuthUser`); 409 if the email already has a
  completed Firestore profile (re-inviting a pending/orphaned auth user is allowed).
  Sets initial custom claims, generates a branded password-setup link
  (`PasswordResetLinkWithSettings` + `pkg.BuildPasswordResetActionURL`, requires `APP_URL`
  env var — 500 if unset), snapshots the inviter's company fields into the invitation
  document, and sends the invite email asynchronously via `notifSvc.SendInvitation`.
- `DELETE /manage/invitations/{uid}` — cancels a pending invitation. Verifies the
  invitation document exists (404 if not), deletes the Firebase Auth user first (so the
  Firestore doc survives as a tombstone if that fails), then deletes the Firestore
  invitation doc.
- `POST /manage/invitations/{uid}/resend` — re-sends the invite email with a fresh
  24-hour expiry; regenerates the password-reset link and updates `invitedAt` /
  `expiresAt` on the existing invitation document.

### Shared (`/api/v1/invitations/accept`, authenticated only)

- `POST /invitations/accept` — the invited user (already Firebase-authenticated, no
  Firestore profile yet) accepts their invitation: fetches the invitation doc by their
  own UID (404 if none, 410 if expired), optionally accepts `contactName` /
  `contactPhone` overrides, creates the Firestore profile via
  `profileSvc.CreateInvitedProfile` (409 via `profile.ErrAlreadyRegistered` if a race
  double-creates it), best-effort deletes the invitation doc, and fires a
  `notifSvc.NotifyRegistration` notification asynchronously.

### Profile enrichment (`enrichedAssessment`)

The response type embeds the base assessment and adds `companyName`, `industryType`,
`companySize`, `contactName`, `contactEmail`. The profile lookup is batched —
`profileSvc.GetProfilesByUIDs(ctx, uids)` is called once per request with all unique UIDs,
never N times per row. If the lookup fails, the handler logs the error and returns
assessments with empty profile fields rather than aborting the request (fail-open on
enrichment only).

### Dual-write order (reversed from the original design)

`SetUserRole` now writes Firebase custom claims **first**, then mirrors the role to the
Firestore profile. If the Firestore write fails after the claims update succeeds, the
`role` field in the profile document lags the token claims until the next successful
`SetUserRole` call — the reverse of the original risk (where a stale token could retain
admin access for up to ~1 hour after a claims write failure). This is the "claims-first"
mitigation the original design called out as future work; the residual risk (a Firestore
profile read showing a stale role while claims are already correct) is lower-impact since
`RequireAdmin`/`RequireFirestoreRole` both read from claims/live Firestore role checks,
not from a cached profile snapshot.

## Usage

```
# pseudocode — envelope mapping in the handler
list ok        → pkg.RespondList(w, enriched, count)         # {"success":true,"data":[...],"count":N}
invalid param  → pkg.RespondError(w, 400, "BAD_REQUEST", msg)
no admin claim → pkg.RespondError(w, 403, "FORBIDDEN", msg)   # RequireAdmin/RequireFirestoreRole, before the handler runs
no/bad token   → pkg.RespondError(w, 401, "UNAUTHORIZED", msg)
not found      → pkg.RespondError(w, 404, "NOT_FOUND", msg)
firestore err  → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)   # errors wrapped: fmt.Errorf("...: %w", err)
```

```
# pseudocode — role change dual write (claims-first)
authClient.SetCustomUserClaims(ctx, uid, {role})   # Firebase (authoritative for RequireAdmin)
profileSvc.SetRole(ctx, uid, role)                 # Firestore mirror
→ pkg.RespondJSON(w, 200, {uid, role})
```

```
# pseudocode — invite → accept flow
POST /manage/invitations {email, role}
  → resolveOrCreateAuthUser(email)                 # existing pending user, or new Firebase Auth user
  → SetCustomUserClaims(uid, {role})
  → PasswordResetLinkWithSettings(email) → branded link
  → Firestore "invitations/{uid}" doc (company fields snapshotted from inviter)
  → async notifSvc.SendInvitation(...)

POST /invitations/accept {contactName?, contactPhone?}   # invited user, authenticated
  → fetch "invitations/{uid}" (404 none · 410 expired)
  → profileSvc.CreateInvitedProfile(...)            # 409 if already registered
  → delete "invitations/{uid}" (best-effort)
  → async notifSvc.NotifyRegistration(...)
```

Consumed by `apps/web-app/src/pages/AdminPage.tsx` — see [admin-page.md](./admin-page.md).

## Acceptance Criteria

- Given a request without a valid token, when any admin/manage endpoint is called, then `401 UNAUTHORIZED`.
- Given a valid token without the required claim/Firestore role, when any admin/manage endpoint is called, then `403 FORBIDDEN`.
- Given a malformed `assessmentId`, when `GET /admin/assessments/{id}` is called, then `400 BAD_REQUEST` with no Firestore read.
- Given a valid UUIDv4 with no matching document, then `404 NOT_FOUND`.
- Given `role: "superuser"` (or any value outside the four allowed), when `PUT /manage/users/{uid}/role` is called, then `400 BAD_REQUEST`.
- Given a profile-enrichment failure, when listing assessments, then the request still succeeds with empty profile fields.
- Given an email that already has a completed Firestore profile, when `POST /manage/invitations` is called, then `409 CONFLICT`.
- Given an expired invitation, when `POST /invitations/accept` is called, then `410 GONE`.
- Given `industryType` / `companySize` query params, when `GET /admin/assessments` is called, then only matching rows are returned (and counted).

## Status

- [x] Handler with all admin + manage + invitation endpoints — `apps/backend/services/admin/handler.go`
- [x] Routes registered — `apps/backend/main.go` (`/admin` behind `RequireAdmin`, `/manage` behind `RequireFirestoreRole`, `/invitations/accept` authenticated-only)
- [x] Batched profile enrichment via `GetProfilesByUIDs`
- [x] `industryType` / `companySize` filters applied (in-memory, post-enrichment)
- [x] Direct-`Get` `GetResultByID` on the result service (replaces the former O(n) scan)
- [x] Claims-first dual write on `SetUserRole`
- [ ] Cursor-based pagination (`StartAfter`) for both list endpoints
- [ ] Move `industryType`/`companySize` filtering server-side (Firestore query) once volume warrants it
- [ ] Reconcile the `/admin` vs `/manage` overlap for `ListUsers`/`SetUserRole`
- [ ] Integration tests for the 403/401 deny paths on `RequireAdmin`/`RequireFirestoreRole` — current `handler_test.go` covers input validation, not auth-middleware behavior

---

*Version: 2.0.0*
*Last updated: 5 July 2026*
