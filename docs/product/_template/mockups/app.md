<!--
  UI MOCKUP TEMPLATE — ASCII wireframes for a feature's screens, one file per app surface.

  How to use:
  - One file per app surface: rename to app.md (web-app) / official.md (web-official).
    Drop the surfaces that don't apply.
  - Number each screen (## 1, ## 2, …) by route. Show every meaningful STATE as a sub-section
    (### 1a, ### 1b, …) — empty, loading, success, error, locked, role variants.
  - ASCII only — no image links. Box-drawing chars: ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ ─ │.
  - These are wireframes for intent and layout, not pixel specs.
  - shadcn/ui only — no native <select>/<dialog>/window.confirm. All text via useLocale() (TH/EN).
    Dates via formatDateTime() (Thai locale = Buddhist Era / พ.ศ.).
  - Reference this folder from the feature README.md § References. Keep the footer current.
  Remove this comment block before committing.
-->

# web-app · <Feature> — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
App shell: left sidebar (logo top, user chip bottom) + main column (top bar · content).

---

## 1. `<route>` — <Screen Name>

### 1a. State: <default / empty / loading>

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   <Screen>                          EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│  ▰ <Feature>          │                                                             │
│    Dashboard          │   <Screen heading>                                          │
│    Quizzes            │   <Supporting copy>                                         │
│    Results            │                                                             │
│                       │   ┌──────────────────────────────────────────────────┐     │
│                       │   │  <primary content / card>                        │     │
│                       │   │                                                  │     │
│                       │   │  [Primary action]                                │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │                                                             │
│  ───────────────────  │                                                             │
│  ◍ <User Name…>   ⇅   │                                                             │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

### 1b. State: <error / locked — banner above content>

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   <Screen>                          EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│  ▰ <Feature>          │   ┌───────────────────────────────────────────────────┐     │
│                       │   │ ⚠  <banner / alert message>          [Action →]   │     │
│                       │   └───────────────────────────────────────────────────┘     │
│                       │                                                             │
│                       │   <content for this state>                                  │
│  ───────────────────  │                                                             │
│  ◍ <User Name…>   ⇅   │                                                             │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 2. `<route>` — <Screen with a table>

<!-- For tabular data, use box-drawing column separators inside the content area: -->

```
   ┌──────────────────┬───────────────────┬──────────┬────────┐
   │ Column           │ Column            │ Score    │ Status │
   ├──────────────────┼───────────────────┼──────────┼────────┤
   │ <value>          │ <value>           │ <value>  │ [TAG]  │
   └──────────────────┴───────────────────┴──────────┴────────┘
```

---

## 3. <Dialog Name>

<!-- Dialogs use shadcn Dialog/AlertDialog (never window.confirm). Narrower standalone box. -->

```
┌───────────────────────────────────────────────┐
│  <Dialog title>                                │
│                                                │
│  <body copy>                                    │
│                                                │
│              [Cancel]   [Confirm]               │
└───────────────────────────────────────────────┘
```

---

*Version: 0.1.0*
*Last updated: <DD Month YYYY>*
