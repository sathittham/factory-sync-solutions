# web-app · Shortlink Service — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind ·
recharts. App shell: left sidebar (logo top, user chip bottom) + main column (top bar ·
content).

> **Planned UI** — nothing is built yet ([status.md](../status.md)); these wireframes
> capture the intent from [feature-spec.md § 5](../feature-spec.md#5-ui-layout).

---

## 1. `/shortlinks` — Shortlink list

### 1a. State: default (links exist)

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Shortlinks                        EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│    Dashboard          │   Shortlinks                                                │
│    Quizzes            │   Create and manage your short links with analytics         │
│    Results            │                                                             │
│  ▰ Shortlinks         │   [ + Create Shortlink ]     Sort: [Created ▾]  [Search…]   │
│                       │                                                             │
│                       │   ┌──────────────────────────────────────────────────┐     │
│                       │   │  fs.link/abc123                        [Delete]  │     │
│                       │   │  Original: https://example.com/very-long-url-…   │     │
│                       │   │  Created: 15 มิ.ย. 2569 08:00 · Clicks: 42       │     │
│                       │   │  [View Analytics] [Copy Link] [Download QR]      │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │   ┌──────────────────────────────────────────────────┐     │
│                       │   │  fs.link/xyz789                        [Delete]  │     │
│                       │   │  Original: https://another-site.com/path/to/page │     │
│                       │   │  Created: 14 มิ.ย. 2569 15:30 · Clicks: 128      │     │
│  ───────────────────  │   │  [View Analytics] [Copy Link] [Download QR]      │     │
│  ◍ Somchai J.     ⇅   │   └──────────────────────────────────────────────────┘     │
└──────────────────────┴─────────────────────────────────────────────────────────────┘

Copy Link → clipboard + "Copied!" toast. Download QR → qrcode-{slug}.svg.
Dates via formatDateTime() (Buddhist Era in TH).
```

### 1b. State: empty (no shortlinks yet)

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │                    ⛓  (illustration)                     │
   │        No shortlinks yet. Create your first one!         │
   │                                                          │
   │                [ + Create Shortlink ]                    │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

### 1c. State: loading

```
   ┌──────────────────────────────────────────────────────────┐
   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   skeleton card          │
   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   skeleton card          │
   └──────────────────────────────────────────────────────────┘
```

---

## 2. Create Shortlink dialog

shadcn `Dialog` opened from the "+ Create Shortlink" button.

### 2a. State: default / validated

```
┌───────────────────────────────────────────────────────┐
│  Create Shortlink                                  ✕  │
│  Enter a URL to create a short, shareable link        │
│                                                       │
│  Original URL *                                       │
│  [ https://example.com/very-long-url-that-needs… ]    │
│  ✓ Valid URL                                          │
│                                                       │
│  Custom Slug (optional)                    12 / 20    │
│  [ my-custom-slug            ]                        │
│  Max 20 chars, alphanumeric + hyphen —                │
│  leave blank for auto-generated                       │
│                                                       │
│                  [ Cancel ]   [ Create Shortlink ]    │
└───────────────────────────────────────────────────────┘
```

### 2b. State: error (slug taken / rate limited)

```
┌───────────────────────────────────────────────────────┐
│  Custom Slug (optional)                    14 / 20    │
│  [ my-custom-slug            ]                        │
│  ⚠ This slug is already taken                         │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ ⚠ Rate limit exceeded, please try again later   │  │
│  └─────────────────────────────────────────────────┘  │
│                  [ Cancel ]   [ Create Shortlink ]    │
└───────────────────────────────────────────────────────┘
```

---

## 3. Delete confirmation

shadcn `AlertDialog` (never `window.confirm()`).

```
┌───────────────────────────────────────────────┐
│  Delete shortlink?                            │
│                                               │
│  Are you sure you want to delete this         │
│  shortlink? fs.link/abc123 will stop working. │
│                                               │
│                 [ Cancel ]   [ Delete ]       │
└───────────────────────────────────────────────┘
```

---

## 4. `/shortlinks/:id/analytics` — Analytics view

### 4a. State: default

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Analytics: fs.link/abc123         EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│  ▰ Shortlinks         │   [← Back to Shortlinks]      Range: [Last 30 Days ▾]       │
│                       │                                                             │
│                       │   Total Clicks: 1,234  ·  Unique Visitors: 856              │
│                       │                                                             │
│                       │   ┌─ Clicks Over Time (line chart) ──────────────────┐     │
│                       │   │ 1500 ┤     ╭─────╮                               │     │
│                       │   │ 1000 ┤   ╭─╯     ╰─────╮                         │     │
│                       │   │  500 ┤ ╭─╯             ╰──                       │     │
│                       │   │    0 └──────────────────────────                │     │
│                       │   │       Jun 1   Jun 5   Jun 10   Jun 15            │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │                                                             │
│                       │   ┌─ Geography (bar) ───────┐ ┌─ Devices (pie) ──────┐     │
│                       │   │ TH ▓▓▓▓▓▓▓▓▓ 856 (69%)  │ │ Mobile   723 (59%)   │     │
│                       │   │ US ▓▓▓ 247 (20%)        │ │ Desktop  432 (35%)   │     │
│                       │   │ JP ▓ 131 (11%)          │ │ Tablet    79 (6%)    │     │
│                       │   └─────────────────────────┘ └──────────────────────┘     │
│                       │                                                             │
│                       │   Top Referrers                Recent Clicks                │
│                       │   ┌──────────────┬───────┐    ┌──────────┬────┬────────┐   │
│                       │   │ google.com   │  456  │    │ Time     │ TH │ Mobile │   │
│                       │   │ direct       │  312  │    │ 08:00    │ US │ Desktop│   │
│  ───────────────────  │   │ facebook.com │  234  │    │ 07:45    │ …  │ …      │   │
│  ◍ Somchai J.     ⇅   │   └──────────────┴───────┘    └──────────┴────┴────────┘   │
└──────────────────────┴─────────────────────────────────────────────────────────────┘

Range picker: Last 7 / 30 / 90 Days · Custom Range. No IPs or raw user
agents are ever shown (privacy — feature-spec.md § 13).
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
