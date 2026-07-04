# User Profile — User Journeys

How each app's users move through the profile feature. See [README.md](./README.md) for
the design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — both journeys are shipped. The one roadmap step
> (`emailNotifications` toggle) is shown dashed.

---

## Table of Contents

- [Factory operator — editing the profile from the nav](#factory-operator--editing-the-profile-from-the-nav)
- [Factory operator — reviewing activity on /profile](#factory-operator--reviewing-activity-on-profile)

---

## Factory operator — editing the profile from the nav

A signed-in operator updates company/contact details without leaving their current page,
via the `ProfileDialog` mounted in `Layout`.

```mermaid
flowchart TD
    A["Nav: avatar/name (desktop) · user row / Profile link (mobile)"] --> B["ProfileDialog opens — form pre-filled from Redux"]
    B --> C{"Edits a field?"}
    C -->|No| D["Save Changes stays disabled (not dirty)"]
    C -->|Yes| E["Clicks Save Changes"]
    E --> F{"Zod valid?"}
    F -->|No| G["Inline field errors"]
    G --> B
    F -->|Yes| H["PUT /api/v1/profile"]
    H -->|200| I["setProfile dispatched — nav updates · 3 s success banner"]
    H -->|error| J["Inline error message · profile_save_error tracked"]
    B -->|"✕ / backdrop / Escape"| K["Dialog closes — unsaved changes discarded, no API call"]
    I -.->|roadmap| L["emailNotifications toggle in the form"]
```

**Guard(s):** authenticated app — Firebase session required; the backend takes the UID
from `middleware.GetUID(r)` and only ever updates the caller's own document. Detail in
[profile-dialog.md](./profile-dialog.md).

---

## Factory operator — reviewing activity on /profile

The same operator visits the standalone `/profile` page to edit the profile in a tab
layout and review their own activity log.

```mermaid
flowchart LR
    A["/profile — ProfilePage"] --> B["Tabs: Profile · Notifications · Activity · Security"]
    B -->|"Profile tab"| C["Same company/contact form — PUT /api/v1/profile"]
    B -->|"Activity tab"| D["GET /api/v1/profile/activity"]
    D --> E["Own actor/target events, newest first, localized labels"]
```

**Guard(s):** authenticated route; the activity endpoint scopes to
`middleware.GetUID(r)` — a UID is never accepted in the body or path, so a user can only
ever see their own events. Detail in [profile-page.md](./profile-page.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
