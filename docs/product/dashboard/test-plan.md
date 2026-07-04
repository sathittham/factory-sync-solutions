---
isoOutput: SI.O4 / SI.O5
version: 1.1.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Active
---

# Test Plan — Dashboard Page (web-app)

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Dashboard Page (`web-app`) |
| **Version** | 1.1.0 |
| **Status** | Active |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-04 |
| **SRS Reference** | [feature-spec.md](./feature-spec.md) |
| **README Reference** | [README.md](./README.md) |

## 1. Test Scope

### 1.1 In Scope

- `DashboardPage` derivations: `quizGroups`, `completedQuizIds`, `uncompletedQuizzes`,
  `activeId` / `latest` selection, `quizNameMap` fallback.
- Inline helpers: `getDimBarColor` / `getDimScoreText` thresholds, `DimensionRow`
  rendering (bar width, name fallback, score formatting), `StatCard` / `GhostStatCard`.
- `handleStartQuiz` dispatch sequence and navigation.
- Body-state selection: loading vs empty vs filled.
- Quiz selector tab behavior.
- Playwright E2E over `/dashboard` (empty, filled, navigation paths).

### 1.2 Out of Scope

- Backend `GET /results` / `GET /quiz/quizzes` behavior — covered by the result and quiz
  service suites ([result](../result/feature-spec.md), [quiz](../quiz/feature-spec.md)).
- TanStack Query internals (caching, invalidation mechanics) — mocked at the hook layer.
- The `web-backoffice` dashboard ([backoffice](../backoffice/feature-spec.md)).

### 1.3 Test Environment

| Environment | Details |
|---|---|
| Unit / component | Vitest + Testing Library in `apps/web-app` (`make test-web`) |
| E2E | Playwright in `apps/web-app` (`pnpm --filter @repo/web-app test:e2e`) |
| Test data | Fixture `Assessment[]` / `QuizListItem[]`; query hooks mocked. E2E signs in with the `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` account (`e2e/helpers/auth.ts`) against `E2E_BASE_URL` — local dev server (`localhost:5173`) by default |

## 2. Unit Test Cases (SI.O4)

### 2.1 `apps/web-app/src/pages/DashboardPage.test.tsx`

All 17 cases implemented and passing (16 test functions — UT-004/005 and UT-001/016
share a test each; UT-007/008 likewise). Run: `npx vitest run src/pages/DashboardPage.test.tsx`.

| ID | Test Name | Precondition | Input | Expected Result | Status |
|---|---|---|---|---|---|
| UT-001 | quizGroups groups by quizId, newest first | hooks mocked | 2 assessments, same quizId | 1 group; index 0 = latest | Pass |
| UT-002 | quizGroups falls back to 'shindan' | hooks mocked | assessment with empty `quizId` | grouped under `shindan`; retake dispatches `setQuizId('shindan')` | Pass |
| UT-003 | uncompletedQuizzes excludes completed | hooks mocked | 3 available, 1 completed | 2 uncompleted rows | Pass |
| UT-004 | activeId defaults to first completed quiz | hooks mocked | 2 completed quizzes | first group's KPIs rendered | Pass |
| UT-005 | Tab click switches active quiz | UT-004 | click second tab | KPI + dimension data swap to quiz 2 | Pass |
| UT-006 | Tabs hidden for single quiz | hooks mocked | 1 completed quiz | no selector tabs rendered | Pass |
| UT-007 | getDimBarColor thresholds | none | 4 / 3 / 2 / 1.9 | emerald / blue / amber / red | Pass |
| UT-008 | getDimScoreText thresholds | none | same boundaries | matching text colors | Pass |
| UT-009 | DimensionRow bar width capped | none | scores 3 and 5.5 | widths 60% and 100% | Pass |
| UT-010 | DimensionRow locale name fallback | none | TH locale, missing `dimensionNameTh` | falls back to `dimensionName` | Pass |
| UT-011 | handleStartQuiz dispatch sequence | preset quiz state | click uncompleted "Start" | `resetQuiz()` → `setQuizId(id)` → navigate `/quiz` | Pass |
| UT-012 | Retake targets active quiz | 2 quizzes, tab 2 active | click Retake | `setQuizId(<quiz2>)` dispatched | Pass |
| UT-013 | Loading state | `isPending`, no data | render | KPI + panel skeletons, no empty state | Pass |
| UT-014 | Empty state | resolved, 0 assessments | render | ghost KPI row + banner + quiz grid; copy via `t()` | Pass |
| UT-015 | Header company fallback | no profile | render | `quiz.yourCompany` text shown | Pass |
| UT-016 | KPI formatting | 2 assessments | render | score `toFixed(2)` + `/ 5.00`; diagnosis badge; attempt count + `dashboard.times`; Buddhist Era date | Pass |
| UT-017 | Uncompleted section hidden when all done | all quizzes completed | render | "Other Assessments" absent | Pass |

## 3. Integration / E2E Test Cases (SI.O5)

### 3.1 `apps/web-app/e2e/login.spec.ts` (existing)

| ID | Test Name | Steps | Expected Result | Status |
|---|---|---|---|---|
| IT-001 | Post-login redirect | sign in with email/password | URL matches `/dashboard` | Pass |

### 3.2 `apps/web-app/e2e/dashboard.spec.ts` (to write)

> **Test-data prerequisite:** IT-002 (empty state) and IT-006 (≥2 completed quizzes)
> need dedicated test accounts seeded in those data states — the single
> `E2E_USER_EMAIL` account cannot cover both alongside the filled-dashboard cases.

| ID | Test Name | Steps | Expected Result | Status |
|---|---|---|---|---|
| IT-002 | Empty state for new user | sign in as user with no assessments | ghost KPI row, onboarding banner, quiz grid visible | Not run |
| IT-003 | Empty-state Start | click a quiz card | lands on `/quiz` for that quiz | Not run |
| IT-004 | Filled dashboard KPIs | sign in as user with assessments | overall score, level badge, attempt count, date visible | Not run |
| IT-005 | Dimension panel | same | one score bar per dimension | Not run |
| IT-006 | Tab switching | user with ≥2 completed quizzes | clicking a tab swaps KPI values | Not run |
| IT-007 | View Results | click "View Results" action | lands on `/results` | Not run |
| IT-008 | Retake | click "Retake" action | lands on `/quiz`; quiz state reset | Not run |
| IT-009 | Cached back-navigation | `/dashboard` → `/results` → back | dashboard renders without skeletons | Not run |
| IT-010 | Locale toggle | switch TH ↔ EN on `/dashboard` | all labels change locale; TH date in Buddhist Era | Not run |

## 4. Traceability

| SRS section | Covered by |
|---|---|
| §4 UI layout (3 states) | UT-013, UT-014, UT-016, IT-002, IT-004 |
| §5 Component breakdown | UT-007–UT-012, IT-005, IT-006 |
| §6–7 Data flow / state | UT-001–UT-006, IT-009 |
| §8 i18n | UT-014, UT-015, IT-010 |
| §13 Acceptance criteria | IT-001–IT-010 |

## 5. Exit Criteria

- ✅ All UT cases implemented and passing in `make test-web` (4 July 2026).
- All IT cases implemented and passing against the configured E2E target (`E2E_BASE_URL`, local dev by default).
- `make lint-web` green.
- Failures triaged as code defects (fix before ship) or spec drift (update
  [feature-spec.md](./feature-spec.md)).

---

*Version: 1.1.0*
*Last updated: 4 July 2026*
