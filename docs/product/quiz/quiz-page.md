# QuizPage + quizSlice (web-app)

## Summary

The single-page, dimension-tabbed quiz UI and its Redux state. Lives at
`apps/web-app/src/pages/QuizPage.tsx` backed by
`apps/web-app/src/store/quizSlice.ts`; renders progress bar, dimension tabs, question
cards, and prev/next/submit navigation.

## Implementation

### Redux state (`quizSlice`)

```
QuizState {
  quizId           # active variant — "shindan" by default
  questions[]      # loaded from API
  dimensions[]     # loaded from API
  answers          # map questionId → value (1–5)
  currentStep      # index into dimensions[]
  isSubmitting
  questionsLoaded
  availableQuizzes[]
}
```

Actions: `setQuizId`, `setQuestions` (sets `questionsLoaded = true`),
`setAvailableQuizzes`, `setAnswer`, `setCurrentStep`, `setSubmitting`, `resetQuiz`
(clears everything except `quizId`). Questions load once per session; `resetQuiz()`
clears `questionsLoaded` so re-entering the page fetches fresh data.

### Rendering rules

| Condition | Rendering | Option labels |
|-----------|-----------|---------------|
| Has rubric + `quizId != 'factory'` | Descriptive buttons, rendered 1 → 5 | Numeric `1`–`5` |
| Has rubric + `quizId == 'factory'` | Descriptive buttons, rendered 5 → 1 (best first) | Grades `A`–`F` (5=A … 1=F) |
| No rubric | 5 compact numeric buttons | `1`–`5` |

### Navigation rules

| State | Behaviour |
|-------|-----------|
| First dimension | "Previous" disabled |
| Last dimension | "Next" replaced by "Submit" |
| Submit button | Disabled until all questions across ALL dimensions are answered |
| Any dimension tab | Clickable at any time — free navigation |
| Step change | `window.scrollTo({ top: 0 })` on prev/next |
| Dimension complete | Green badge + checkmark on the tab |

### Exit confirmation

"✕ Exit" opens a shadcn/ui `Dialog` (never `window.confirm`). Confirming dispatches
`resetQuiz()` then navigates to `/` — answers are lost; there is no draft save.

### Error states

| Scenario | UX |
|----------|----|
| Questions fail to load | Red error banner inside the skeleton container |
| Submit fails (network / 5xx) | Red error banner below the question list; spinner stops, answers kept |

### Analytics

| Event | Trigger | Properties |
|-------|---------|------------|
| `quiz_next_step` | Click "Next →" | `{ step, dimension }` |
| `quiz_submit` | Click "Submit" | `{ quiz_id, total_questions, answered }` |
| `quiz_complete` | 201 received | `{ quiz_id, overall_score, diagnosis }` |
| `quiz_submit_error` | API error on submit | — |

## Usage

```
# pseudocode — page lifecycle
on mount:
  if !questionsLoaded → GET /quiz/questions?quizId  → dispatch(setQuestions)
  render skeleton until questionsLoaded

on submit (all answered):
  dispatch(setSubmitting(true))
  POST /quiz/submit { quizId, answers: [{questionId, value}…] }
  201 → dispatch(setAssessment) · dispatch(setHasCompletedQuiz(true))
        dispatch(resetQuiz()) · trackEvent('quiz_complete') · navigate('/results')
  err → error banner · setSubmitting(false)
```

All quiz copy (dimension names, questions, rubric labels) comes bilingual from the
config; the page picks the primary/secondary locale via `useLocale()`.

## Acceptance Criteria

- Given `/quiz`, when questions are loading, then a Skeleton renders; the quiz appears only after `questionsLoaded`.
- Given a dimension with all questions answered, when its tab renders, then it shows a checkmark badge.
- Given any unanswered question anywhere, when viewing the last dimension, then "Submit" is disabled.
- Given the `factory` variant, when rubric options render, then they are ordered A → F; all other variants 1 → 5.
- Given "✕ Exit" → "Leave", when confirmed, then answers reset and the user lands on `/`.
- Given a submit failure, when the error returns, then a red banner shows and answers are preserved.

## Status

- [x] `QuizPage.tsx` — tabs, cards, progress, navigation, exit dialog
- [x] `quizSlice.ts` — state + actions as specified
- [x] Vitest `quizSlice.test.ts` — `setAnswer`, `resetQuiz`, `setCurrentStep`, `allAnswered`
- [x] Playwright E2E — full run to `/results`; disabled-submit check

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
