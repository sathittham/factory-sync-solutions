# web-app · User Profile — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The profile surface is the `ProfileDialog` (opened from the nav, any page) plus the
standalone `/profile` page with tabs.

---

## 1. `ProfileDialog` — three-section modal

shadcn `Dialog`, max-w-lg, max-h-[90vh] with overflow-y-auto. Opened from the nav
avatar/name (desktop) or user row / "Profile" link (mobile drawer).

### 1a. State: open, pristine (Save disabled)

```
┌─────────────────────────────────────────────────────────────┐
│  Update Profile                                          ✕  │
│  Edit your company and contact information                  │
├─────────────────────────────────────────────────────────────┤
│  ─── ACCOUNT ────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ (◍)  Jane Doe                            [Google]   │    │
│  │      jane@gmail.com                                 │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  Registration ID    0123456789012      (read-only)  │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  ─── CONTACT PERSON ─────────────────────────────────────── │
│  [ Jane Doe                                    ]             │
│  [ jane@acme.com          ]  [ 0812345678     ]             │
├─────────────────────────────────────────────────────────────┤
│  ─── COMPANY PROFILE ────────────────────────────────────── │
│  [ Acme Manufacturing Co.                      ]             │
│  [ Manufacturing ▾ ]         [ Medium ▾ ]                   │
├─────────────────────────────────────────────────────────────┤
│                              [ Save Changes ]  ← disabled   │
└─────────────────────────────────────────────────────────────┘
```

### 1b. State: saved (3 s success banner)

```
├─────────────────────────────────────────────────────────────┤
│  ✓ Saved successfully!            ← auto-hides after 3 s    │
│                              [ Save Changes ]  ← disabled   │
└─────────────────────────────────────────────────────────────┘
```

### 1c. State: API error (dialog stays open)

```
├─────────────────────────────────────────────────────────────┤
│  ⚠ An error occurred, please try again                      │
│                              [ Save Changes ]  ← enabled    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. `/profile` — ProfilePage

max-w-2xl. Account summary card + tab bar; Profile tab shown.

### 2a. State: Profile tab (default)

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Profile                           EN ▾    ☼    ◍ Jane  │
│                       ├─────────────────────────────────────────────────────────────┤
│    Dashboard          │   Update Profile                                            │
│    Quizzes            │   Edit your company and contact information                 │
│    Results            │                                                             │
│  ▰ Profile            │   ┌──────────────────────────────────────────────────┐     │
│                       │   │ (◍) Jane Doe · jane@gmail.com        [Google]    │     │
│                       │   │ Registration ID  0123456789012                   │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │                                                             │
│                       │   [Profile] [Notifications] [Activity] [Security]           │
│                       │   ─────────                                                 │
│                       │   [ Company name / industry / size / contact form ]         │
│  ───────────────────  │                              [ Save Changes ]               │
│  ◍ Jane Doe       ⇅   │                                                             │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

### 2b. State: Activity tab — events loaded

```
   [Profile] [Notifications] [Activity] [Security]
                             ──────────
   ┌──────────────────────────────────────────────────────────┐
   │  Updated profile          14 Jun 2026 15:30              │
   │  changedFields: contactPhone                             │
   ├──────────────────────────────────────────────────────────┤
   │  Submitted assessment     12 Jun 2026 09:05              │
   ├──────────────────────────────────────────────────────────┤
   │  Signed in                12 Jun 2026 08:58              │
   └──────────────────────────────────────────────────────────┘

   Newest first · labels via profile.activity.* i18n keys ·
   timestamps via formatDateTime() (Buddhist Era in TH locale)
```

### 2c. State: Activity tab — empty

```
   [Profile] [Notifications] [Activity] [Security]
                             ──────────
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │              No activity yet.                            │
   │              (ยังไม่มีประวัติการใช้งาน)                       │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

### 2d. State: Activity tab — loading

```
   [Profile] [Notifications] [Activity] [Security]
                             ──────────
   ┌──────────────────────────────────────────────────────────┐
   │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒            ▒▒▒▒▒▒▒▒            │
   │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                    ▒▒▒▒▒▒▒▒            │
   │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                ▒▒▒▒▒▒▒▒            │
   └──────────────────────────────────────────────────────────┘
                    ← skeleton rows while /profile/activity is pending
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
