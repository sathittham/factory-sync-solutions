# web-app · Audit Logging — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The built audit surface in web-app is the Activity tab on the Profile page. A
project-audit tab (owner / system_admin only) and the web-backoffice audit pages are
roadmap — not yet designed, so no wireframes here (see [status.md](../status.md)).

---

## 1. `/profile` — Activity tab

### 1a. State: populated

```
┌──────────────────────┬──────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Profile                            EN ▾    ☼    ◍ User  │
│                       ├──────────────────────────────────────────────────────────────┤
│    Dashboard          │   My Profile                                                 │
│    Quizzes            │                                                              │
│    Results            │   [Details] [Activity]            ← shadcn Tabs              │
│  ▰ Profile            │                                                              │
│                       │   ┌──────────────────────────────────────────────────┐      │
│                       │   │ ⎆ Signed in                    10 มิ.ย. 2569 09:12│      │
│                       │   │   Chrome · macOS                                 │      │
│                       │   ├──────────────────────────────────────────────────┤      │
│                       │   │ ✎ Profile updated              09 มิ.ย. 2569 16:40│      │
│                       │   │   Changed: contactPhone, companySize             │      │
│                       │   ├──────────────────────────────────────────────────┤      │
│                       │   │ ▤ Assessment submitted         08 มิ.ย. 2569 11:05│      │
│                       │   │   shindan · score 3.47 · Established             │      │
│                       │   ├──────────────────────────────────────────────────┤      │
│                       │   │ ★ Account registered           01 มิ.ย. 2569 08:00│      │
│  ───────────────────  │   └──────────────────────────────────────────────────┘      │
│  ◍ Jane Doe…      ⇅   │                 [Load older ↓]   ← `before` cursor           │
└──────────────────────┴──────────────────────────────────────────────────────────────┘

Data: GET /profile/activity (caller's own actor/target events only).
Labels localized via useLocale(); timestamps via formatDateTime() — Thai
locale shows Buddhist Era. (Date-formatting cleanup is a known open item.)
```

### 1b. State: empty

```
   ┌──────────────────────────────────────────────────┐
   │                                                  │
   │              ◌  No activity yet                  │
   │     Your account events will appear here.        │
   │                                                  │
   └──────────────────────────────────────────────────┘
```

### 1c. State: loading

```
   ┌──────────────────────────────────────────────────┐
   │ ░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░          │
   │ ░░░░░░░░░░░░░                                    │
   │ ░░░░░░░░░░░░░░░░░░░░░          ░░░░░░░░          │
   └──────────────────────────────────────────────────┘
     Skeleton rows while GET /profile/activity resolves.
```

---

## 2. `/profile` — Project audit tab (roadmap)

Planned, not designed: a separate tab visible only to `owner` / `system_admin`, listing
project-scoped events from `GET /project/audit` with eventType/actor/target filters.
Wireframe to be added when the phase starts — see
[README.md § Open Items](../README.md#open-items--future-work).

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
