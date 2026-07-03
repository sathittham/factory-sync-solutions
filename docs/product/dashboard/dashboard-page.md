# DashboardPage + MiniScoreRing (web-app)

## Summary

The authenticated user's landing screen, aggregating all assessment results by quiz
variant. Lives at `apps/web-app/src/pages/DashboardPage.tsx` (436 lines) with the
`MiniScoreRing` SVG defined inline. Built and exported, but not yet imported anywhere —
routing it is the feature's blocking task.

## Implementation

- `DashboardPage()` — page component; on mount fetches `GET /results` and
  `GET /quiz/quizzes` **only if** the respective Redux slice is empty, then derives:
  - `quizGroups` — assessments grouped by `quizId`; the first entry per group is the latest.
  - `uncompletedQuizzes` — `availableQuizzes` minus IDs in `completedQuizIds`.
- `MiniScoreRing({ score, size = 64 })` — inline SVG: background track circle
  (`--border`) + filled arc (`--primary`), arc angle proportional to `score / 5`, stroke
  5px, animated via `transition-all duration-1000 ease-out`. The numeric score is an
  absolutely-positioned `<span>` centred over the SVG; the SVG itself is decorative.
- `handleStartQuiz(quizId)` — `dispatch(resetQuiz())` → `dispatch(setQuizId(quizId))` →
  `navigate('/quiz')`. Used by the retake action card (hardcoded `'shindan'`) and every
  uncompleted-quiz "Start" row.

### Sections and states

| Section | Behavior |
|---------|----------|
| Gradient header | "Welcome back, {companyName}" from `authSlice.profile.companyName` |
| Completed quiz cards | `StaggerChildren` grid (0.08s); each card is a `<button>` → `/results`; shows ring, quiz name (locale-aware), diagnosis badge (`diagnosisConfig` shared with `ResultPage`), formatted date, count line when > 1 assessment |
| Action cards | Always rendered; "View Results" → `/results`, "Retake Assessment" → `handleStartQuiz('shindan')` |
| Uncompleted list | `FadeIn` (0.25s); hidden when all quizzes are completed |
| Empty state | `ScaleIn`; rendered instead of the card grid when no assessments exist |
| Loading skeleton | Three `h-44 rounded-xl` `Skeleton`s while `resultLoading && assessments.length === 0` |

### Known issues (must fix before shipping)

- Empty-state copy (lines ~422–428) uses inline `locale === 'th' ? '…' : '…'` instead of
  `t()` — extract `dashboard.noResults` / `dashboard.noResultsDesc` keys.
- Retake card is hardcoded to `'shindan'` even if the user never took that quiz —
  decision open (relabel vs. derive from first completed quiz).
- The spec's data flow reads `resultSlice`, which was retired in the TanStack Query
  migration — re-verify the fetch/caching wiring when routing the page.

## Usage

Planned call site: `apps/web-app/src/router.tsx` (not yet wired).

```
# pseudocode — the blocking route wiring
import DashboardPage from '@/pages/DashboardPage'

<RegisterGuard>
  <Route path="/dashboard" element={<DashboardPage />} />
</RegisterGuard>

# plus a "Dashboard" nav item in components/Layout.tsx
```

```
# pseudocode — cache-aware fetch on mount
if assessments empty      → GET /api/v1/results       → setAssessments + setAssessment(first)
if availableQuizzes empty → GET /api/v1/quiz/quizzes  → setAvailableQuizzes
# both skipped when Redux already has data → instant back-navigation
```

## Acceptance Criteria

- Given a routed `/dashboard`, when a registered user navigates there, then the gradient header shows their company name and one card renders per distinct `quizId`.
- Given a completed quiz card or the "View Results" action card, when clicked, then the app navigates to `/results`.
- Given an uncompleted quiz row, when "Start" is clicked, then `resetQuiz()` + `setQuizId(q.id)` are dispatched and the app navigates to `/quiz`.
- Given no assessments, when the page renders, then the empty-state card appears (in the active locale) with the action cards still visible.
- Given cached Redux data, when navigating back from `/results`, then no re-fetch occurs.

## Status

- [x] `DashboardPage.tsx` implemented (all sections + states)
- [x] `MiniScoreRing` implemented inline
- [ ] Route + nav wiring — `router.tsx` / `Layout.tsx`
- [ ] Empty-state i18n fix — `lib/i18n.tsx`
- [ ] Vitest unit suite (`handleStartQuiz`, derivations, ring arc math) + Playwright E2E

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
