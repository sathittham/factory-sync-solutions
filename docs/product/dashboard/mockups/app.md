# web-app · Dashboard Page — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The dashboard is a single full-width page (gradient header + content column) — layout
per [feature-spec.md § 4](../feature-spec.md#4-ui-layout). Route `/dashboard` is not yet
wired; these wireframes show the built component.

---

## 1. `/dashboard` — Dashboard

### 1a. State: default (completed + uncompleted quizzes)

```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░ gradient header ░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ยินดีต้อนรับกลับ / Welcome back,                            │
│  <Company Name>                 ← authSlice profile          │
├─────────────────────────────────────────────────────────────┤
│  คะแนนล่าสุด / LATEST SCORE                                  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   ◠ 3.5 ◡   │  │   ◠ 4.1 ◡   │  │   ◠ … ◡     │          │
│  │  Shindan    │  │  Factory    │  │  …          │          │
│  │ [Established]│ │ [Advanced]  │  │             │          │
│  │ 10 มิ.ย. 69 │  │ 09 มิ.ย. 69 │  │             │          │
│  │ 3 ครั้ง      │  │             │  │             │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  (click any card → /results)                                │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐     │
│  │ 📊 ดูผลลัพธ์            │  │ 🔄 ทำแบบประเมินใหม่     │     │
│  │    View Results        │  │    Retake Assessment   │     │
│  │ <desc>                 │  │ <desc>                 │     │
│  │ View results →         │  │ Start over →           │     │
│  └────────────────────────┘  └────────────────────────┘     │
│   → /results                  → /quiz (quizId='shindan')    │
├─────────────────────────────────────────────────────────────┤
│  แบบประเมินอื่น / OTHER ASSESSMENTS                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📋 Cybersecurity Assessment              Start →    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ 📋 Lean Assessment                       Start →    │    │
│  └─────────────────────────────────────────────────────┘    │
│   (Start → resetQuiz + setQuizId → /quiz)                   │
│   Section hidden when all quizzes are completed.            │
└─────────────────────────────────────────────────────────────┘

◠ n ◡ = MiniScoreRing (SVG arc ∝ score/5, numeric score centred)
```

### 1b. State: empty (no assessments yet)

```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░ gradient header ░░░░░░░░░░░░░░░░░░░░░░░░  │
│  ยินดีต้อนรับกลับ / Welcome back,  <Company Name>            │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐  ┌────────────────────────┐     │
│  │ 📊 View Results        │  │ 🔄 Retake Assessment   │     │
│  └────────────────────────┘  └────────────────────────┘     │
│   (action cards always visible)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                       [ 📋 icon ]                           │
│                  ยังไม่มีผลประเมิน                            │
│                  No assessments yet                         │
│     เริ่มทำแบบประเมินเพื่อตรวจสุขภาพโรงงานของคุณ                │
│     Start an assessment to check your factory health        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Known issue: this copy is inline locale-ternary today — must move to
t('dashboard.noResults') / t('dashboard.noResultsDesc') before shipping.
```

### 1c. State: loading (resultLoading, no cached assessments)

```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░ gradient header ░░░░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │          │
│  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │          │
│  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │  │ ▒▒▒▒▒▒▒▒▒▒▒ │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│   3 × Skeleton (h-44 rounded-xl)                            │
└─────────────────────────────────────────────────────────────┘
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
