# ResultPage & Result State (web-app)

## Summary

Top-level page for `/results`. Lives at `apps/web-app/src/pages/ResultPage.tsx`; owns fetch
orchestration, quiz-tab state, history selection and the re-take flow, backed by the
`resultSlice` Redux state (`apps/web-app/src/store/resultSlice.ts` per the spec — since
retired in the TanStack Query migration; behaviour unchanged, see
[status.md](./status.md#current-state)).

## Implementation

`ResultPage` manages, per [feature-spec.md § 5–6](./feature-spec.md#5-component-breakdown):

- Fetching all assessments on mount — **skipped** if `assessment` is already in Redux
  (fresh quiz submit sets it before navigating).
- Fetching `availableQuizzes` (`GET /quiz/quizzes`) for tab labels when empty.
- Fetching `dimCache[quizId]` per active tab (`GET /quiz/questions?quizId=<id>`) so
  dimension names render in the active locale.
- Tab state (`activeQuizId`), assessments grouped by quiz variant, history selection.
- Firing `trackEvent('result_view', { overall_score, diagnosis })` on the API-load path.

### Result state contract

```
# state shape (per spec § 9)
assessment:  Assessment | null   — currently displayed assessment
assessments: Assessment[]        — all user assessments (all quiz variants)
loading:     boolean             — skeleton toggle
```

| Action | Effect |
|--------|--------|
| `setAssessment(a \| null)` | Set the assessment shown in the detail view |
| `setAssessments(arr)` | Replace the full list (initial fetch) |
| `setLoading(bool)` | Show/hide skeleton |

`assessment` is set by `QuizPage` on submit (fresh result, no refetch) and by `ResultPage`
on initial load (most recent from API). History rows call `setAssessment` directly — never
the API.

### Tab initialisation

Tabs render for **all** available quizzes, not just completed ones; incomplete tabs sit at
`opacity-50`. Initial active tab = first quiz ID with at least one result, else the first
available quiz.

### History list

Shown only when `quizAssessments.length > 1` for the active tab. Each row: submitted date
(via `formatDateTime` — Buddhist Era in TH), overall score, diagnosis badge.

### Re-take flow

The empty-state "Start [quiz name]" button dispatches `resetQuiz()` (clears answers, step,
questionsLoaded) → `setQuizId(quizId)` → `navigate('/quiz')`.

## Usage

```
# pseudocode — mount behaviour
on mount:
  if assessment in state        → render detail (no fetch)
  else                          → GET /results → setAssessments(data); setAssessment(data[0]); track result_view
  if availableQuizzes empty     → GET /quiz/quizzes → setAvailableQuizzes
  for active tab                → GET /quiz/questions?quizId=… → dimCache[quizId]
```

## Acceptance Criteria

- Given a fresh quiz submit, when `/results` renders, then the result shows without a loading spinner or API call.
- Given a hard refresh, when `/results` mounts, then all results are fetched and the most recent renders.
- Given multiple assessments for the active quiz, when a history row is clicked, then the detail view swaps with no network request.
- Given a quiz variant with no result, when its tab is opened, then the empty-state card renders and "Start" navigates to `/quiz` with the correct `quizId`.

## Status

- [x] `ResultPage.tsx` implemented (tabs · history · re-take · dim cache)
- [x] Result state contract implemented (spec: `resultSlice.ts`; since migrated to TanStack Query)
- [x] Tests — reducer unit tests (Vitest); Playwright render + hard-refresh + empty-tab E2E

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
