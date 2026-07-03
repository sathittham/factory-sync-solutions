# Invitation Lifecycle (backend — planned)

## Summary

Token-based project invitations stored in `project_invitations/{token}`; to be
implemented in `apps/backend/services/project/` (service + repository). An Owner /
System Admin (Manager+ for creation) invites an email address into a project with a
role; the invitee accepts via `POST /project/join`. Nothing is built yet.

## Implementation

- `service.CreateInvitation(ctx, callerUID, email, projectID, role)` — validates the
  caller holds sufficient role **in the specified project**, writes a `pending` token
  (UUID v4, 7-day `expiresAt`), fires the invitation email fire-and-forget
  (`emailSentAt` / `emailError` recorded), returns the token.
- `service.ValidateInvitationToken(ctx, token)` — the ordered gate used by preview and
  accept.
- `service.AcceptInvitation(ctx, uid, token)` — requires an existing profile
  (`ErrProfileRequired` otherwise) and a non-member caller (`ErrAlreadyMember`); then in
  **one Firestore transaction**: mark token `accepted`, create
  `projects/{projectID}/members/{uid}` with the token's role, update
  `users/{uid}.projectRoles[projectID]`.
- `service.RevokeInvitation(ctx, callerUID, token)` — sets `status = "revoked"`;
  *resend* creates a new `pending` token and revokes the old one.

### Status transitions

```
pending ──→ accepted   (POST /project/join succeeds)
        ──→ expired    (server-side, lazily on next read if now > expiresAt)
        ──→ revoked    (DELETE /project/invitations/{token}, or superseded by resend)
```

### Validation order (intentional)

```
1. Get invitation doc          → ErrInvitationNotFound   if missing
2. already used?               → ErrInvitationAlreadyUsed if so
3. now past expiresAt?         → ErrInvitationExpired     if so
```

Used-before-expired ordering matters: if a token is both used **and** expired, the
inviter learns their link was acted on — not just abandoned after TTL.

### Notable behavior

- The `email` on the token is a pre-fill/delivery target only — `acceptedByUID` may
  belong to a different account than the invited email.
- `activeProjectID` is **not** switched on accept; the user switches explicitly via
  `PUT /project/active`.
- The public preview (`GET /project/join/{token}`, no auth) returns only project name,
  inviter display name, role, and expiry — never member lists or assessment data.

## Usage

```
# pseudocode — handler maps sentinel errors to the envelope
errors.Is(err, ErrInvitationNotFound)    → pkg.RespondError(w, 404, "INVITATION_NOT_FOUND", msg)
errors.Is(err, ErrInvitationAlreadyUsed) → pkg.RespondError(w, 409, "INVITATION_ALREADY_USED", msg)
errors.Is(err, ErrInvitationExpired)     → pkg.RespondError(w, 410, "INVITATION_EXPIRED", msg)
errors.Is(err, ErrProfileRequired)       → pkg.RespondError(w, 403, "PROFILE_REQUIRED", msg)
errors.Is(err, ErrAlreadyMember)         → pkg.RespondError(w, 409, "ALREADY_MEMBER", msg)
```

```
# pseudocode — accept is transactional
tx {
  invitation.status = "accepted"; acceptedAt = now; acceptedByUID = uid
  create projects/{projectID}/members/{uid} { projectRole: invitation.role,
                                              joinMethod: "invited",
                                              invitedBy, invitationToken }
  users/{uid}.projectRoles[projectID] = invitation.role
}
```

## Acceptance Criteria

- Given a Manager+ caller in the target project, when `POST /project/invitations` is made, then a `pending` token with a 7-day expiry is created and the email fired.
- Given a caller without a profile, when accepting, then `403 PROFILE_REQUIRED`.
- Given a used-and-expired token, when validated, then `409 INVITATION_ALREADY_USED` (used wins over expired).
- Given two concurrent accepts of one token, when both commit, then exactly one succeeds and the other gets `409 INVITATION_ALREADY_USED`; no duplicate member is created.
- Given a resend, when performed, then the old token becomes `revoked` and a fresh `pending` token is issued.

## Status

- [ ] Invitation model + repository — `services/project/models.go` / `repository.go`
- [ ] `ValidateInvitationToken` + transactional `AcceptInvitation` — `services/project/service.go`
- [ ] Invitation email template — notification service
- [ ] `service_test.go` — validation-order and concurrency cases (≥ 80% coverage goal)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
