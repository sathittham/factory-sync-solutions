---
version: 1.2.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
---

# User Flow

## Main User Journey

```mermaid
flowchart TD
    A[User visits /] --> B[Landing Page]
    B --> C{Signed in?}
    C -- No --> D[Click Sign in with Google]
    D --> E[Firebase Google Sign-In]
    E --> F{Auth success?}
    F -- No --> G[Show error on landing page]
    F -- Yes --> H{Has profile?}
    C -- Yes --> H

    H -- No --> I[Redirect to /register]
    I --> J[Complete registration form]
    J --> K[Turnstile verification]
    K --> L[Backend creates profile]
    L --> M[Slack notification to #registrations]
    M --> N[Redirect to /quiz]

    H -- Yes --> O{Has completed quiz?}
    O -- No --> N
    O -- Yes --> P[Redirect to /results]

    N --> Q[Answer 35 questions across 7 dimensions]
    Q --> R[Submit quiz]
    R --> S[Backend computes scores]
    S --> T[Store assessment in Firestore]
    T --> U[Send result email via Resend]
    T --> V[Slack notification to #quiz-results]
    U --> W[Redirect to /results]
    V --> W

    W --> X[View Result Page]
    X --> Y[Spider chart + strengths + weaknesses]
```

## In-App Admin Flow (`fs-app-web` — `role == "admin"`)

> This is the `/admin` route inside `fs-app-web` for users with the `role: "admin"` Firebase custom claim.
> For the dedicated FactorySync staff portal see **Backoffice Staff Flow** below.

```mermaid
flowchart TD
    A[Admin visits /] --> B{Signed in?}
    B -- No --> C[Google Sign-In]
    C --> B
    B -- Yes --> D{Has role: admin claim?}
    D -- No --> E[Redirect to / with error]
    D -- Yes --> F[Access /admin dashboard]
    F --> G[View assessment table]
    G --> H[Filter by industry / company size]
    G --> I[Export CSV]
    G --> J[View individual assessment detail]
```

## Backoffice Staff Flow (`fs-backoffice-web` — `backofficeRole` claim)

> Separate app at `backoffice.factorysync.com` for FactorySync internal staff.
> Uses a distinct Firebase custom claim (`backofficeRole: "staff"` or `"superadmin"`) —
> not the same as the user-facing `role: "admin"` claim.

```mermaid
flowchart TD
    A[Staff visits backoffice.factorysync.com] --> B{Signed in?}
    B -- No --> C[Redirect to /sign-in]
    C --> D[Google Sign-In]
    D --> B
    B -- Yes --> E{Has backofficeRole claim?}
    E -- No --> F[Redirect to /unauthorized]
    E -- staff --> G[Land on /dashboard]
    E -- superadmin --> G

    G --> H[View stats: projects / users / avg score / staff]
    G --> I[View recent quiz results table]

    G --> J[Navigate via sidebar]
    J --> K[/projects — list, create, search]
    K --> L[/projects/:id — Members tab]
    L --> M[Invite owner]
    L --> N[Change member role]
    L --> O[Remove member]
    K --> P[/projects/:id — Settings tab]
    P --> Q[Edit name / industry / size]

    J --> R[/users — list all users]
    R --> S[View user detail dialog]
    R --> T[Delete user — superadmin only]

    J --> U[/results — all quiz results]
    U --> V[Expand row for dimension detail]
    U --> W[Export CSV]

    J --> X[/staff — superadmin only]
    X --> Y[Add staff by Firebase UID]
    X --> Z[Change staff role]
    X --> AA[Revoke staff access]
```

## API Request Flow (Quiz Submission)

```mermaid
sequenceDiagram
    participant SPA as React SPA
    participant FB as Firebase Auth
    participant API as Go API
    participant FS as Firestore
    participant RE as Resend
    participant SL as Slack

    SPA->>FB: getIdToken()
    FB-->>SPA: Firebase ID token

    SPA->>API: POST /api/v1/quiz/submit<br/>Authorization: Bearer {token}
    API->>FB: VerifyIDToken(token)
    FB-->>API: token.UID

    API->>API: Compute scores (scoring service)
    API->>FS: Store assessment document
    FS-->>API: OK

    API->>RE: Send result email
    API->>SL: POST webhook (#quiz-results)

    API-->>SPA: 201 Created { assessment result }
    SPA->>SPA: Redirect to /results
```

## Route Guard Logic

```mermaid
flowchart TD
    A[User navigates to route] --> B{Route requires auth?}
    B -- No --> C[Allow access]
    B -- Yes --> D{isAuthenticated?}
    D -- No --> E[Redirect to /]
    D -- Yes --> F{Route requires registration?}
    F -- No --> G[Allow access]
    F -- Yes --> H{isRegistered?}
    H -- No --> I[Redirect to /register]
    H -- Yes --> J{Route requires admin?}
    J -- No --> K[Allow access]
    J -- Yes --> L{isAdmin?}
    L -- No --> M[Redirect to / with 403]
    L -- Yes --> N[Allow access]
```

### Route Protection Map — `fs-app-web`

| Route | Auth | Registered | Admin (`role`) |
|-------|------|-----------|---------------|
| `/` | - | - | - |
| `/register` | Required | - | - |
| `/quiz` | Required | Required | - |
| `/results` | Required | Required | - |
| `/profile` | Required | Required | - |
| `/dashboard` | Required | Required | - |
| `/admin` | Required | Required | Required |

### Route Protection Map — `fs-backoffice-web`

| Route | Auth | `backofficeRole` claim | Superadmin only |
|-------|------|----------------------|-----------------|
| `/sign-in` | - | - | - |
| `/unauthorized` | - | - | - |
| `/dashboard` | Required | `staff` or `superadmin` | - |
| `/projects` | Required | `staff` or `superadmin` | - |
| `/projects/:id` | Required | `staff` or `superadmin` | - |
| `/users` | Required | `staff` or `superadmin` | - |
| `/results` | Required | `staff` or `superadmin` | - |
| `/staff` | Required | `staff` or `superadmin` | Required |

## State Transitions

### Quiz State

```mermaid
stateDiagram-v2
    [*] --> NotStarted : User lands on /quiz
    NotStarted --> InProgress : User answers first question
    InProgress --> InProgress : Navigate between dimensions
    InProgress --> Completed : Submit all answers
    Completed --> [*] : Redirect to /results
```

### Authentication State

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> Authenticating : Click Sign in with Google
    Authenticating --> Authenticated : Firebase success
    Authenticating --> Unauthenticated : Firebase error
    Authenticated --> Unauthenticated : Sign out
```

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Fix route names (/result -> /results), remove /auth route, add /profile route, fix redirect targets |
| 1.2.0 | 2026-06-11 | Add backoffice staff flow diagram; split route-protection table per app; distinguish `role: "admin"` from `backofficeRole` claim |
