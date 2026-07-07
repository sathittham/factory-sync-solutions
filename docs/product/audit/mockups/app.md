# Audit Logging — ASCII Mockups

Surfaces: `web-app` (authenticated React app) and `web-backoffice` (staff portal).
Design system: shadcn/ui · Tailwind. Built audit surfaces are the Activity tab on the
web-app Profile page and the web-backoffice Audit page + "View Activity" dialog. A
project-audit tab (owner / system_admin only, web-app) is roadmap — not yet designed
(see [status.md](../status.md)).

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
locale shows Buddhist Era.
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

## 2. `web-backoffice` — Audit page (superadmin only)

```
┌──────────────────────┬──────────────────────────────────────────────────────────────┐
│  ◉ FactorySync BO      │  ☰   Audit                               EN ▾    ☼   ◍ Staff│
│                       ├──────────────────────────────────────────────────────────────┤
│    Dashboard          │  [Event type ▾] [Resource type ▾] [Actor UID] [Target UID]   │
│    Projects           │  [Project ID]                              [⟳ Refresh]       │
│    Users              │                                                              │
│    Staff              │  ┌────────┬─────────────────┬────────┬────────┬─────┬──────┐│
│  ▰ Audit               │  │ Time   │ Event type      │ Actor  │ Target │ Proj│ Meta ││
│                       │  ├────────┼─────────────────┼────────┼────────┼─────┼──────┤│
│                       │  │ 5m ago │ user.role_changed│ admin1 │ user22 │ pj-3│ role:…││
│                       │  │ 1h ago │ backoffice.staff…│ admin2 │ staff5 │  —  │ role:…││
│                       │  │ 2h ago │ project.created  │ owner7 │  —     │ pj-9│  —   ││
│                       │  └────────┴─────────────────┴────────┴────────┴─────┴──────┘│
│  ───────────────────  │                                                              │
│  ◍ Staff Name…    ⇅   │                                                              │
└──────────────────────┴──────────────────────────────────────────────────────────────┘

Data: GET /backoffice/audit — filters map to eventType/resourceType/actorUID/targetUID/
projectID query params. Table columns: time (formatDateTime), event type (localized via
audit.event.<type> keys), actor, target, project, metadata summary. Source:
apps/web-backoffice/src/pages/AuditPage.tsx.
```

## 3. `web-backoffice` — "View Activity" dialog (Users / Staff pages)

```
┌──────────────────────────────────────────────────┐
│  Activity — user22                           [×] │
├──────────────────────────────────────────────────┤
│  ⎆ user.login              10 มิ.ย. 2569 09:12    │
│  ✎ user.profile_updated    09 มิ.ย. 2569 16:40    │
│  ✎ user.role_changed       08 มิ.ย. 2569 11:05    │
│     actor: admin1 → target: user22                │
└──────────────────────────────────────────────────┘

Data: GET /backoffice/users/{uid}/activity — actor OR target == uid. Opened from a
"View Activity" button on each Users/Staff row (superadmin only). Source:
apps/web-backoffice/src/components/AuditActivityDialog.tsx.
```

## 4. `/profile` — Project audit tab (roadmap)

Planned, not designed: a separate tab visible only to `owner` / `system_admin`, listing
project-scoped events from `GET /project/audit` with eventType/actor/target filters.
Wireframe to be added when the phase starts — see
[README.md § Open Items](../README.md#open-items--future-work).

---

*Version: 1.1.0*
*Last updated: 5 July 2026*
