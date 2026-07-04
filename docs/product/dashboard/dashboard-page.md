# DashboardPage (web-app)

## Summary

The authenticated user's landing screen. Lives at
`apps/web-app/src/pages/DashboardPage.tsx` (597 lines) with three inline helpers:
`StatCard`, `GhostStatCard`, and `DimensionRow`. Live at `/dashboard` via the file-based
route `routes/_authed/_registered/dashboard.tsx`; first item in the `Layout.tsx` nav.

## Implementation

- `DashboardPage()` — named export. Reads server state through TanStack Query
  (`useAssessmentsQuery` → `GET /results`, `useQuizzesQuery` → `GET /quiz/quizzes`) and
  derives with `useMemo`:
  - `quizGroups` — assessments grouped by `quizId` (missing ID falls back to
    `'shindan'`); index 0 per group is the latest.
  - `completedQuizIds` / `uncompletedQuizzes` — available quizzes split by completion.
  - `activeId` — the tab-selected quiz (`activeQuizId` local state), defaulting to the
    first completed quiz; `latest`, `dimensionScores`, and `totalAttempts` derive from it.
- `StatCard({ label, children })` — bordered KPI tile; `GhostStatCard({ label })` — the
  dashed `--` variant used in the empty state's preview row.
- `DimensionRow({ dim, locale })` — score bar per dimension: width `score / 5 × 100 %`
  (capped), 700 ms ease-out transition, color by threshold (≥4 emerald · ≥3 blue ·
  ≥2 amber · <2 red via `getDimBarColor` / `getDimScoreText`), locale-aware name with
  cross-fallback, score as `toFixed(1)`.
- `handleStartQuiz(quizId)` — `dispatch(resetQuiz())` → `dispatch(setQuizId(quizId))` →
  `navigate({ to: '/quiz' })`. Used by the retake action (`activeId ?? 'shindan'` —
  fallback is defensive only), every uncompleted-quiz row, and the empty-state quiz grid.

### Sections and states

Body states are mutually exclusive: `isLoading` (`resultLoading && assessments.length === 0`),
`isEmpty` (`!resultLoading && assessments.length === 0`), else the filled dashboard.

| Section | Behavior |
|---------|----------|
| Gradient header | Always rendered; `quiz.welcomeBack` + `profile.companyName` (fallback `quiz.yourCompany`) from `authSlice` |
| Quiz selector tabs | Only when `completedQuizIds.length > 1`; pill per quiz, active = `bg-primary text-white`; sets `activeQuizId` |
| KPI stat cards | `StaggerChildren` (0.06 s): overall score (`toFixed(2)` + `/ 5.00`, diagnosis-tinted), level `Badge` (`diagnosisConfig`), attempt count, `formatDateTime(latest.submittedAt, locale)` |
| Dimension panel | `FadeIn` 0.15 s, 2/3 width on `lg`; one `DimensionRow` per `latest.scores` entry |
| Quick actions | `FadeIn` 0.2 s: "View Results" → `/results`; "Retake" → `handleStartQuiz(activeId)` |
| Uncompleted list | `FadeIn` 0.3 s; hidden when all quizzes completed; rows call `handleStartQuiz(q.id)` |
| Empty state | `ScaleIn`: 4 × `GhostStatCard`, onboarding banner (`quiz.noResults.title` / `.desc`), available-quiz card grid (`StaggerChildren` 0.07 s) |
| Loading skeleton | 4 × `h-24` KPI skeletons + `h-64` panel/actions skeletons; empty-state grid shows 3 × `h-32` while `quizzesLoading` |

### Known issues

- Dashboard Playwright spec not written yet (unit suite is green) — see
  [test-plan.md](./test-plan.md); needs seeded empty-state and multi-quiz test accounts.

Resolved 4 July 2026: attempt-count unit now uses `t('dashboard.times')`;
`quiz.assessedOn` trailing space and the `.trim()` workaround removed; decorative SVGs
carry `aria-hidden="true"`.

## Usage

```tsx
// apps/web-app/src/routes/_authed/_registered/dashboard.tsx (actual wiring)
import { DashboardPage } from '@/pages/DashboardPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/dashboard')({
  component: DashboardPage,
});
```

Nav entry: `Layout.tsx` `getNavItems()` —
`{ path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' }`. Post-login
redirects land here from `SignInPage` (authenticated `<Navigate>`) and `RegisterPage`
(after registration).

## Acceptance Criteria

- Given a signed-in, registered user, when they land on `/dashboard`, then the header
  shows their company name and the KPI cards reflect the latest assessment of the active quiz.
- Given more than one completed quiz, when a selector tab is clicked, then KPI cards and
  dimension bars swap to that quiz's latest assessment.
- Given the "Retake" action, when clicked, then `resetQuiz()` + `setQuizId(activeId)` are
  dispatched and the app navigates to `/quiz`; "View Results" navigates to `/results`.
- Given an uncompleted quiz row (or empty-state quiz card), when "Start" is clicked, then
  the same dispatch sequence runs with that quiz's ID.
- Given no assessments, when the page renders, then the ghost KPI row, onboarding banner,
  and available-quiz grid appear (all copy via `t()`).
- Given cached TanStack Query data, when navigating back from `/results`, then the page
  renders without a loading state.

## Status

- [x] `DashboardPage.tsx` implemented (all sections + states)
- [x] Route + nav wiring — `routes/_authed/_registered/dashboard.tsx` / `Layout.tsx`
- [x] Post-login + post-registration redirects to `/dashboard`
- [x] Empty-state i18n via `quiz.noResults.title` / `quiz.noResults.desc`
- [x] i18n cleanup (`dashboard.times` key; `quiz.assessedOn` trailing space removed)
- [x] Vitest unit suite — `DashboardPage.test.tsx`, 16 tests passing
- [ ] Dashboard Playwright spec — [test-plan.md](./test-plan.md)

---

*Version: 2.1.0*
*Last updated: 4 July 2026*
