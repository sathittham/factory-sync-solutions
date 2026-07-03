# web-app · Assessment Result — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind ·
recharts · framer-motion. App shell: left sidebar (logo top, user chip bottom) + main
column (top bar · content).

---

## 1. `/results` — Result view

### 1a. State: default (assessment selected, single attempt)

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Results                           EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│    Dashboard          │   [Shindan] [Factory] [Cybersecurity] [Lean]  ← quiz tabs   │
│    Quizzes            │                                                             │
│  ▰ Results            │   ┌──────────────────────────────────────────────────┐     │
│                       │   │   ◜◝            Overall Score                    │     │
│                       │   │  ◟3.47◞         [ Established ]                  │     │
│                       │   │  / 5.00         10 มิ.ย. 2569                    │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │   ┌──────────────────────────────────────────────────┐     │
│                       │   │  DIMENSION SCORES                                │     │
│                       │   │        ▲                                         │     │
│                       │   │     ◇─────◇      (radar / spider chart)          │     │
│                       │   │    ◇   ·   ◇                                     │     │
│                       │   │     ◇─────◇                                      │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │   ┌──────────────────────────────────────────────────┐     │
│                       │   │  DIMENSION DETAIL          (2-col grid on md+)   │     │
│                       │   │  ├ Basic Management ▓▓▓▓▓▓▓░░  3.83  ▾           │     │
│                       │   │  ├ Work Improvement ▓▓▓▓▓▓░░░  3.25              │     │
│                       │   │  └ …                                             │     │
│                       │   └──────────────────────────────────────────────────┘     │
│                       │   ┌───────────────────┐  ┌───────────────────────┐        │
│                       │   │ ✓ STRENGTHS       │  │ ! WEAKNESSES          │        │
│  ───────────────────  │   │ + Quality Ctrl    │  │ ! Cost Control        │        │
│  ◍ Somchai J.     ⇅   │   └───────────────────┘  └───────────────────────┘        │
└──────────────────────┴─────────────────────────────────────────────────────────────┘

Strengths panel omitted when no score ≥ 3.50; weaknesses omitted when none < 2.50.
Dates via formatDateTime() — Buddhist Era in TH.
```

### 1b. State: dimension row expanded

```
   ┌──────────────────────────────────────────────────────────┐
   │  ├ Basic Management ─────── ▓▓▓▓▓▓▓░░  3.83  ▴           │
   │  │   ┌────┬────┬────┬────┬────┐                          │
   │  │   │ ■1 │ ■2 │ ■3 │ □4 │ □5 │   level grid — filled    │
   │  │   └────┴────┴────┴────┴────┘   to floor(score)        │
   │  │   Beginning ──────────→ Advanced                      │
   │  │   Score: 3.83 / 5.00                                  │
   └──────────────────────────────────────────────────────────┘
```

### 1c. State: history list (more than one attempt on the active quiz)

```
   ┌──────────────────────────────────────────────────────────┐
   │  PREVIOUS ASSESSMENTS                                    │
   │  ┌────────────────┬────────┬──────────────────┐          │
   │  │ 1 พ.ค. 2569    │  3.12  │ [ Established ]  │          │
   │  │ 15 มี.ค. 2569  │  2.87  │ [ Developing ]   │ ← selected│
   │  └────────────────┴────────┴──────────────────┘          │
   └──────────────────────────────────────────────────────────┘

Clicking a row swaps the detail view from Redux — no API call.
Shown only when the active quiz has > 1 assessment.
```

### 1d. State: empty tab (quiz variant not taken yet — tab at 50% opacity)

```
┌──────────────────────┬─────────────────────────────────────────────────────────────┐
│  ◉ FactorySync        │  ☰   Results                           EN ▾    ☼    ◍ User  │
│                       ├─────────────────────────────────────────────────────────────┤
│  ▰ Results            │   [Shindan] [Factory] [░Cybersecurity░] [Lean]              │
│                       │                        ↑ active, 50% opacity                │
│                       │                                                             │
│                       │        ┌────────────────────────────────────┐               │
│                       │        │   No assessment yet for this quiz  │               │
│                       │        │                                    │               │
│                       │        │      [ Start Cybersecurity ]       │               │
│  ───────────────────  │        └────────────────────────────────────┘               │
│  ◍ Somchai J.     ⇅   │   Start → resetQuiz() + setQuizId(qid) → /quiz              │
└──────────────────────┴─────────────────────────────────────────────────────────────┘
```

### 1e. State: loading (hard refresh — fetching from API)

```
   ┌──────────────────────────────────────────────────────────┐
   │  ░░░░░░░░░░░░░░░░░░░░   skeleton — hero card             │
   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   skeleton — radar chart   │
   │  ░░░░░░░░░░   ░░░░░░░░░░       skeleton — dimensions     │
   └──────────────────────────────────────────────────────────┘

Shown only on the fetch path (loading=true); the fresh-submit path renders
instantly from Redux with no skeleton.
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
