# web-backoffice · Backoffice — ASCII Mockups

Surface: `web-backoffice` (staff portal, React). Design system: shadcn/ui · Tailwind (same
config as `web-app`). App shell: left sidebar (logo top, user chip + sign-out bottom) +
main column. Staff and Audit menu items render for superadmin only. Mobile: the sidebar
collapses into a shadcn `Sheet` behind a hamburger. Wireframes adapted from
[feature-spec.md §4](../feature-spec.md#4-ui-layout).

---

## 1. `/unauthorized` — Access denied

### 1a. State: default (no auth required to reach this page)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                  ┌──────────────────────────┐                    │
│                  │        🔒                 │                    │
│                  │   Access Denied          │                    │
│                  │   ไม่มีสิทธิ์เข้าถึง          │                    │
│                  │                          │                    │
│                  │   Backoffice access      │                    │
│                  │   requires a FactorySync │                    │
│                  │   account role.          │                    │
│                  │                          │                    │
│                  │   [ Back to sign-in ]    │                    │
│                  └──────────────────────────┘                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. `/dashboard` — Dashboard

### 2a. State: default

```
┌──────────────┬───────────────────────────────────────────────────┐
│ ◉ FactorySync │  Dashboard                                        │
│   Backoffice │                                                   │
│ ──────────── │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐    │
│  Dashboard   │  │ 24     │ │ 187    │ │ 3.41    │ │ 8      │    │
│  Projects    │  │Projects│ │ Users  │ │Avg Score│ │ Staff  │    │
│  Users       │  └────────┘ └────────┘ └─────────┘ └────────┘    │
│  Results     │                                                   │
│  Staff*      │  Recent Quiz Results (last 10)                    │
│  Audit*      │  ┌───────────┬───────┬─────────────┬──────────┐   │
│ ──────────── │  │ Company   │ Score │ Diagnosis   │ Date     │   │
│ ◍ Alice T.   │  │ Acme Co.  │ 3.47  │ Established │ 10 มิ.ย. │   │
│ [Sign Out]   │  └───────────┴───────┴─────────────┴──────────┘   │
└──────────────┴───────────────────────────────────────────────────┘
* Staff and Audit menu items: superadmin only
```

---

## 3. `/projects` — Projects list

### 3a. State: default (staff view — no Deactivate in row menu)

```
   Projects                                  [+ New Project]
   [Search…]  [Industry ▾]  [Status ▾]
   ┌──────────────┬───────────────┬──────────┬─────────┬────────┬────┐
   │ Company Name │ Reg ID        │ Industry │ Members │ Status │    │
   ├──────────────┼───────────────┼──────────┼─────────┼────────┼────┤
   │ Acme Co.     │ 0123456789012 │ Mfg.     │ 5       │ Active │ ⋯  │
   │ Beta Ltd.    │ 9876543210987 │ Food     │ 2       │ Active │ ⋯  │
   └──────────────┴───────────────┴──────────┴─────────┴────────┴────┘

   ⋯ row menu: View Detail │ Deactivate (superadmin only)
```

---

## 4. `/projects/:projectID` — Project detail

### 4a. State: Members tab

```
   ← Projects   Acme Co.   [Active]              [Deactivate*]

   ┌─[ Members ]──[ Settings ]───────────────────────────────────┐
   │  [+ Invite Owner]†                                          │
   │  ┌─────────┬──────────────┬─────────┬──────────┬─────────┐  │
   │  │ Name    │ Email        │ Role    │ Joined   │ Actions │  │
   │  ├─────────┼──────────────┼─────────┼──────────┼─────────┤  │
   │  │ Jane D. │ jane@acme.co │ Owner   │ 10 มิ.ย. │ [Change Role] [Remove] │
   │  │ John S. │ john@acme.co │ Manager │ 09 มิ.ย. │ [Change Role] [Remove] │
   │  └─────────┴──────────────┴─────────┴──────────┴─────────┘  │
   └─────────────────────────────────────────────────────────────┘

   *  superadmin only
   †  disabled/hidden until backofficeApi.inviteOwner is wired (roadmap)
```

### 4b. State: Settings tab

```
   ┌─[ Members ]──[ Settings ]───────────────────────────────────┐
   │  Company Name  [______________________]                      │
   │  Industry      [Select ▾]                                    │
   │  Size          [Select ▾]                                    │
   │                                       [Save Changes]         │
   └─────────────────────────────────────────────────────────────┘
```

---

## 5. `/users` — Users list

### 5a. State: default (superadmin — Delete visible)

```
   Users
   [Search…]  [Project ▾]  [Role ▾]
   ┌─────────┬──────────────┬──────────┬───────┬──────────┬─────────────────┐
   │ Name    │ Email        │ Company  │ Role  │ Joined   │ Actions         │
   ├─────────┼──────────────┼──────────┼───────┼──────────┼─────────────────┤
   │ Jane D. │ jane@acme.co │ Acme Co. │ admin │ 10 มิ.ย. │ [View] [Delete*]│
   └─────────┴──────────────┴──────────┴───────┴──────────┴─────────────────┘

   * Delete: superadmin only. Row / [View] opens the detail Dialog;
     superadmins also see "View Activity" (roadmap — audit API planned).
```

---

## 6. `/results` — Quiz results

### 6a. State: default with one row expanded

```
   Quiz Results                                  [Export CSV ↓]
   [Search company…]  [Project ▾]  [Diagnosis ▾]  [Date ▾]
   ┌──────────┬─────────┬───────┬─────────────┬──────────┬───┐
   │ Company  │ Quiz    │ Score │ Diagnosis   │ Date     │ ▾ │
   ├──────────┼─────────┼───────┼─────────────┼──────────┼───┤
   │ Acme Co. │ shindan │ 3.47  │ Established │ 10 มิ.ย. │ ▴ │
   │ ├─ dimension scores · strengths · weaknesses            │
   └──────────┴─────────┴───────┴─────────────┴──────────┴───┘
```

---

## 7. `/staff` — Staff management (superadmin only)

### 7a. State: default

```
   Staff Management                              [+ Add Staff]
   ┌──────────┬───────────────────┬────────────┬─────────┬─────────────────────────┐
   │ Name     │ Email             │ Role       │ Since   │ Actions                 │
   ├──────────┼───────────────────┼────────────┼─────────┼─────────────────────────┤
   │ Alice T. │ alice@factorysync │ superadmin │ 5 มิ.ย. │ [Change Role] [Remove]  │
   │ Bob S.   │ bob@factorysync   │ staff      │ 7 มิ.ย. │ [Change Role] [Remove]  │
   └──────────┴───────────────────┴────────────┴─────────┴─────────────────────────┘
```

### 7b. Dialog: Add Staff (unknown-UID error state)

```
┌───────────────────────────────────────────────┐
│  Add Staff                                     │
│                                                │
│  Firebase UID or email  [__________________]   │
│  Role                   [staff ▾]              │
│  ⚠ No Firebase user found for that UID         │
│                                                │
│              [Cancel]   [Add]                  │
└───────────────────────────────────────────────┘
```

---

## 8. `/audit` — Audit log (superadmin only · roadmap)

Planned — API and UI not yet built ([status.md](../status.md)).

### 8a. State: default (planned)

```
   Audit Log
   [Event Type ▾] [Actor UID] [Target UID] [Project ID]
   ┌───────────────────┬──────────────────────────┬────────┬────────┐
   │ Time              │ Event                    │ Actor  │ Target │
   ├───────────────────┼──────────────────────────┼────────┼────────┤
   │ 14 Jun 2026 15:30 │ backoffice.staff_role... │ alice  │ bob    │
   │ 14 Jun 2026 15:12 │ project.member_removed   │ staff1 │ user2  │
   └───────────────────┴──────────────────────────┴────────┴────────┘

   Newest first; expandable row / detail dialog shows metadata as a
   compact key/value block.
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
