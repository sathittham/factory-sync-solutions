# web-app · Quiz (Assessment) — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The quiz is a focused full-width flow at `/quiz` — progress header, dimension tabs,
question cards, and prev/next/submit navigation.

---

## 1. `/quiz` — Assessment

### 1a. State: loading (skeleton until `questionsLoaded`)

```
┌─────────────────────────────────────────────────────────────┐
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                        ▒▒▒▒▒   [✕ Exit]  │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│                                                             │
│  ▒▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒▒▒                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                     │  │
│  │  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1b. State: in progress (rubric question, `shindan`)

```
┌─────────────────────────────────────────────────────────────┐
│  Factory Health Check (Shindan)        [12/43]     [✕ Exit] │
│  ▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ← progress bar             │
│                                                             │
│  [Basic Mgmt ✓] [Work Impr ✓] [Coordination●] [Maint] …     │  ← DimensionTabs
│                                                             │
│  การประสานงาน / Coordination                       2/4       │  ← DimensionHeader
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ (1) การประชุมประจำวัน                                    │  │  ← answered:
│  │     Daily meetings                                    │  │    filled badge +
│  │                                                       │  │    highlighted border
│  │  [1] สับสน — Confused / no system                      │  │
│  │  [2] กำลังวางแผน — Planning stage          ◉ selected  │  │
│  │  [3] ลงมือทำแต่ยังไม่สมบูรณ์ — Implementing…              │  │
│  │  [4] มีการตรวจเช็คและยกระดับ — Check and raise…          │  │
│  │  [5] มีการแก้ไขและป้องกัน — Corrective and preventive     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ (2) Next question …                                   │  │
│  │  [1] … [2] … [3] … [4] … [5] …                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Previous]                                    [Next →]   │  ← QuizNavigation
└─────────────────────────────────────────────────────────────┘
```

### 1c. State: no-rubric question (compact numeric buttons)

```
  ┌───────────────────────────────────────────────────────┐
  │ (3) Question text (TH)                                │
  │     Question text (EN)                                │
  │                                                       │
  │        [ 1 ]  [ 2 ]  [ 3 ]  [ 4 ]  [ 5 ]              │
  └───────────────────────────────────────────────────────┘
```

### 1d. State: `factory` variant (grades A–F, best first)

```
  ┌───────────────────────────────────────────────────────┐
  │ (1) Vision & Leadership question …                    │
  │                                                       │
  │  [A] Best-practice descriptor        (value 5)        │
  │  [B] …                               (value 4)        │
  │  [C] …                               (value 3)        │
  │  [D] …                               (value 2)        │
  │  [F] Worst descriptor                (value 1)        │
  └───────────────────────────────────────────────────────┘
```

### 1e. State: last dimension, all answered (Submit enabled)

```
│  Factory Health Check (Shindan)        [43/43]     [✕ Exit] │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← 100%                    │
│                                                             │
│  [Basic Mgmt ✓] … [Cost Control ✓●]   ← all tabs checked    │
│                                                             │
│  [← Previous]                                   [Submit ✓]  │
```

Any unanswered question anywhere keeps Submit disabled.

### 1f. State: submit error

```
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ⚠  Submission failed. Please try again.               │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Previous]                                   [Submit ✓]  │
```

Answers are preserved; the spinner stops.

---

## 2. Exit confirmation dialog

shadcn `Dialog` (never `window.confirm`). Confirming resets all answers.

```
┌───────────────────────────────────────────────┐
│  Leave the assessment?                         │
│                                                │
│  Your answers will be lost — progress is not   │
│  saved between sessions.                       │
│                                                │
│                  [Cancel]   [Leave]            │
└───────────────────────────────────────────────┘
```

`Leave` → `resetQuiz()` → navigate `/`.

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
