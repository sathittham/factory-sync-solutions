---
version: 1.1.0
lastUpdated: 2026-03-07
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

## Admin Flow

```mermaid
flowchart TD
    A[Admin visits /] --> B{Signed in?}
    B -- No --> C[Google Sign-In]
    C --> B
    B -- Yes --> D{Has admin role?}
    D -- No --> E[Redirect to / with error]
    D -- Yes --> F[Access /admin dashboard]
    F --> G[View assessment table]
    G --> H[Filter by industry / company size]
    G --> I[Export CSV]
    G --> J[View individual assessment detail]
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

### Route Protection Map

| Route | Auth | Registered | Admin |
|-------|------|-----------|-------|
| `/` | - | - | - |
| `/register` | Required | - | - |
| `/quiz` | Required | Required | - |
| `/results` | Required | Required | - |
| `/profile` | Required | Required | - |
| `/admin` | Required | Required | Required |

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
