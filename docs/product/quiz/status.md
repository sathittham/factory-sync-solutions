# Status

> Tracks build progress for the Quiz (Assessment) feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Future Work](#future-work)
- [Related Documents](#related-documents)

---

## Current State

**Shipped end to end.** All five quiz variants (`shindan` default, `factory`,
`cybersecurity`, `lean`, `iso29110`) are bundled as JSON configs and registered in the
in-memory `QuizRegistry` at startup. `QuizPage` renders the dimension-tabbed quiz with
free navigation, live progress, rubric/grade option rendering, and an exit-confirmation
dialog; `quizSlice` holds answers, step, and load state. The submit pipeline validates
(count, questionIds, 1–5 range), scores server-side, persists the `assessments` document,
writes an audit log entry, and fires email + Slack notifications asynchronously.

Deliberate scope limits (non-goals, not gaps): no draft save between sessions, no
re-take without admin intervention, no branching logic, no time limits.

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as suites are re-measured.

---

## Build Checklist

Single phase — mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state).

- [x] Quiz page — `apps/web-app/src/pages/QuizPage.tsx`
- [x] Quiz Redux slice — `apps/web-app/src/store/quizSlice.ts`
- [x] Backend handler — `apps/backend/services/quiz/handler.go`
- [x] Backend service — `apps/backend/services/quiz/service.go`
- [x] Quiz models — `apps/backend/services/quiz/models.go`
- [x] Scoring engine — `apps/backend/services/scoring/scoring.go`
- [x] Scoring models — `apps/backend/services/scoring/models.go`
- [x] Quiz configs (5 variants) — `apps/backend/config/questions*.json`
- [x] Quiz registry — `scoring.QuizRegistry` in `scoring.go`
- [x] Notifications (email + Slack) — `notification.Service.NotifyQuizResult`
- [x] Audit logging on submit — `audit.Logger.Log`

### Tests

- [x] `services/scoring/scoring_test.go` — `ComputeScores` + `DetermineDiagnosis` boundary values
- [x] `services/quiz/service_test.go` — `ErrIncompleteAnswers` / `ErrQuizNotFound` / `ErrInvalidAnswer` deny paths
- [x] Vitest `quizSlice.test.ts` — `setAnswer`, `resetQuiz`, `setCurrentStep`, `allAnswered`
- [x] Playwright E2E — full quiz → `/results`; unanswered question keeps submit disabled

Coverage recorded:

- [ ] `go test ./services/quiz/... ./services/scoring/... -cover` → **n/a — not yet recorded here**

---

## Future Work

Non-goals that may be revisited via a new CR; all ❌ not started.

- [ ] Draft save — persist partial progress between sessions
- [ ] Re-take strategy — separate assessment ID per submission

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [quiz-config.md](./quiz-config.md) · [scoring-engine.md](./scoring-engine.md) · [quiz-page.md](./quiz-page.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
