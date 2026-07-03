# Project & RBAC — User Journeys

How each app's users will move through projects. See [README.md](./README.md) for the
design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> **Nothing below is built today** — the entire feature is planned (📋), so every flow
> is roadmap and shown dashed.

---

## Table of Contents

- [Factory operator — registering creates their own project](#factory-operator--registering-creates-their-own-project)
- [Invited user — already has an account](#invited-user--already-has-an-account)
- [Invited user — no account yet](#invited-user--no-account-yet)
- [Any member — switching the active project](#any-member--switching-the-active-project)
- [Owner / System Admin — managing members](#owner--system-admin--managing-members)

---

## Factory operator — registering creates their own project

Every user's first step — there is no user without a project.

```mermaid
flowchart TD
    A["Sign in with Google — no profile"] -.-> B["/register — form + DBD lookup"]
    B -.-> C["POST /api/v1/register"]
    C -.->|"companyRegId free"| D["Project created — user is Owner<br/>activeProjectID set · projectRoles = { regId: owner }"]
    D -.-> E["Redirected to /quiz"]
    C -.->|"companyRegId taken"| F["409 PROJECT_ALREADY_EXISTS —<br/>'Ask your project Owner or Admin to invite you'"]
```

**Guard(s):** Firebase session required; project uniqueness enforced server-side on
`companyRegId`. Detail in [feature-spec.md § 5.1](./feature-spec.md#5-registration--join-flow).

---

## Invited user — already has an account

An existing user gains a second membership; their active project does not change
automatically.

```mermaid
flowchart TD
    A["Invite email → /join?token=uuid"] -.-> B["JoinPage — public preview:<br/>project name · role · inviter · expiry"]
    B -.-> C{"Signed in?"}
    C -.->|No| D["Sign in with Google — returns with token"]
    D -.-> E["Has profile → 'Accept invitation as name'"]
    C -.->|Yes| E
    E -.-> F["POST /api/v1/project/join { token }"]
    F -.->|200| G["Membership added · projectRoles updated<br/>activeProjectID unchanged"]
    G -.-> H["Toast: 'You've joined {projectName}' + [Switch now]"]
    F -.->|410| I["Expired — 'Ask {inviter} to send a new invite'"]
    F -.->|409| J["Already used / already a member"]
```

**Guard(s):** Bearer token required to accept; the join transaction is atomic (token,
member doc, `projectRoles` map). Detail in
[invitation-lifecycle.md](./invitation-lifecycle.md).

---

## Invited user — no account yet

Registration first — there is no path that creates a user profile from an invitation.

```mermaid
flowchart TD
    A["/join?token=uuid"] -.-> B["Signs in with Google"]
    B -.-> C["No profile found — State C:<br/>'Register your company first'"]
    C -.-> D["[Create my project →] /register?next=/join?token=t"]
    D -.-> E["Completes registration — own project created, user is Owner"]
    E -.-> F["Returned to /join?token=uuid"]
    F -.-> G["Now has profile → accept → POST /project/join"]
```

**Guard(s):** `POST /project/join` returns `403 PROFILE_REQUIRED` while no
`users/{uid}` document exists. Detail in
[invitation-lifecycle.md](./invitation-lifecycle.md).

---

## Any member — switching the active project

One project is active per user and scopes all API calls.

```mermaid
flowchart LR
    A["Nav: project name ▾"] -.-> B["Dropdown — all memberships with roles,<br/>active project checked"]
    B -.-> C["PUT /api/v1/project/active { projectID }"]
    C -.-> D["Backend validates membership →<br/>users/{uid}.activeProjectID updated"]
    D -.-> E["Redux setActiveProject — scoped data reloads,<br/>nav shows new project"]
```

**Guard(s):** backend rejects non-members with `403` (`ErrNotAMember`). Role for the
new context comes from `projectRoles[activeProjectID]` — see
[project-role-middleware.md](./project-role-middleware.md).

---

## Owner / System Admin — managing members

Member administration is scoped to the active project.

```mermaid
flowchart TD
    A["/project/settings — Members tab"] -.-> B["List active members with role badges"]
    B -.-> C["[Invite Member +] → InviteModal:<br/>email + role (≤ own role) → POST /project/invitations"]
    B -.-> D["Change role ▾ → PUT /project/members/{uid}/role"]
    B -.-> E["Remove ✕ → DELETE /project/members/{uid}<br/>(Owner cannot remove self)"]
    B -.-> F["Pending invitations → [Resend] / [Revoke]"]
```

**Guard(s):** route gated by `ProjectRoleGuard` (Members: `manager`+; Settings:
`system_admin`+); every mutation re-checked server-side by `RequireProjectRole`. Detail
in [project-role-middleware.md](./project-role-middleware.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
