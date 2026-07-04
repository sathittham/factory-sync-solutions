# web-app · Project & RBAC — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.

> **Planned** — none of these screens exist yet; wireframes reflect the approved design
> in [feature-spec.md § 7](../feature-spec.md#7-ui-screens).

---

## 1. Nav — project switcher (replaces the plain company-name badge)

### 1a. State: open dropdown

```
┌─────────────────────────────────────────────────────────┐
│  [🏭 Acme Manufacturing Co.  ▾]   ← current project     │
│  ─────────────────────────────────────────────────────  │
│  ✓  Acme Manufacturing Co.   Owner                      │
│     Beta Corp                Manager                    │
│     Gamma Works              General User               │
│  ─────────────────────────────────────────────────────  │
│  Project Settings                                       │
│  Members                                                │
└─────────────────────────────────────────────────────────┘
```

Active project checked. "Project Settings" / "Members" links visible only when the
caller's role in the active project is Manager or above.

---

## 2. `/join?token=<uuid>` — JoinPage (public route)

### 2a. State A: not signed in

```
┌───────────────────────────────────────────────────────────────┐
│  ◉ FactorySync                                        [EN/TH] │
├───────────────────────────────────────────────────────────────┤
│    You've been invited to join                                │
│    ┌─────────────────────────────────────────────────────┐    │
│    │  🏭  Acme Manufacturing Co.                          │    │
│    │  Role: Manager    ·   Invited by: Jane Doe          │    │
│    │  Expires: Jun 17, 2026                              │    │
│    └─────────────────────────────────────────────────────┘    │
│    [Sign in with Google]   ← redirects back with token        │
└───────────────────────────────────────────────────────────────┘
```

### 2b. State B: signed in, has profile (ready to accept)

```
│    ┌─────────────────────────────────────────────────────┐    │
│    │  🏭  Acme Manufacturing Co.  ·  Role: Manager        │    │
│    └─────────────────────────────────────────────────────┘    │
│    [Accept invitation as Somchai S.]                          │
│    ← POST /project/join on click                              │
```

### 2c. State C: signed in, no profile (must register first)

```
│    ┌──────────────────────────────────────────────────────┐   │
│    │  ⚠️  You need to register your company first          │   │
│    │  Create your own project before joining others.      │   │
│    │  Your invitation will still be valid after you       │   │
│    │  complete registration.                              │   │
│    └──────────────────────────────────────────────────────┘   │
│    [Create my project →]  ← /register?next=/join?token=<t>    │
```

### 2d. State: expired / already used token

```
│    ┌──────────────────────────────────────────────────────┐   │
│    │  ⚠  This invitation has expired.                      │   │
│    │  Ask Jane Doe to send a new invite.                   │   │
│    └──────────────────────────────────────────────────────┘   │

│    ┌──────────────────────────────────────────────────────┐   │
│    │  ⚠  This invitation has already been used.            │   │
│    └──────────────────────────────────────────────────────┘   │
```

---

## 3. `/project/settings` — ProjectSettingsPage (Owner / System Admin)

### 3a. State: General tab

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Project Settings                  EN ▾    ☼    ◍ Jane  │
│                       ├─────────────────────────────────────────────────────────────┤
│    Dashboard          │   [General] [Members]                                       │
│    Quizzes            │   ─────────                                                 │
│    Results            │   ─── PROJECT DETAILS ─────────────────────────────         │
│  ▰ Project Settings   │   [ Acme Manufacturing Co.                    ]             │
│                       │   [ Manufacturing ▾ ]        [ Medium ▾ ]                   │
│                       │                                                             │
│                       │   ─── DANGER ZONE ─────────────────────────────────         │
│                       │   Transfer Ownership   [Transfer →]   (Owner only)          │
│  ───────────────────  │                                                             │
│  ◍ Jane Doe       ⇅   │                              [ Save Changes ]               │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

### 3b. State: Members tab (`/project/settings/members`, Manager+ to view)

```
   [General] [Members]
             ─────────
   Members (4)                                    [Invite Member +]
   ┌────────┬──────────────────┬───────────────┬──────────────────┐
   │ Avatar │ Name             │ Role          │ Actions          │
   ├────────┼──────────────────┼───────────────┼──────────────────┤
   │  (◍)   │ Jane Doe (you)   │ Owner         │ ──               │
   │  (◍)   │ Bob Smith        │ System Admin  │ [Change ▾]  [✕]  │
   │  (◍)   │ Alice Wong       │ Manager       │ [Change ▾]  [✕]  │
   │  (◍)   │ Tom Lee          │ General User  │ [Change ▾]  [✕]  │
   └────────┴──────────────────┴───────────────┴──────────────────┘

   Pending Invitations (1)
   ┌──────────────────────────┬───────────────┬───────────────────┐
   │ charlie@acme.com         │ General User  │ [Resend] [Revoke] │
   └──────────────────────────┴───────────────┴───────────────────┘
```

Role dropdown constrained to ≤ the caller's own role; Owner cannot remove themselves
(transfer first).

---

## 4. Invite Member dialog

shadcn `Dialog` (never `window.confirm`).

```
┌────────────────────────────────────┐
│  Invite Member                  ✕  │
│  ──────────────────────────────    │
│  Email address                     │
│  [ charlie@acme.com          ]     │
│                                    │
│  Role                              │
│  [ General User ▾ ]  (≤ own role)  │
│                                    │
│         [Send Invitation]          │
└────────────────────────────────────┘
```

Send → `POST /project/invitations { email, projectID, role }` → pending row appears in
the Members tab.

---

*Version: 1.0.1*
*Last updated: 4 July 2026*
