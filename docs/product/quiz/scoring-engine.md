# Scoring Engine (backend)

## Summary

Server-side scoring for every quiz variant. Lives in
`apps/backend/services/scoring/` (`scoring.go` + `models.go`); called by the quiz
service on submit. The client never computes or sends scores — it only sends raw
answers.

## Implementation

- `ComputeScores(questions, dimensions, answers) ScoringResult` — returns
  `{ dimensionScores, overallScore, strengths, weaknesses, diagnosis }`.
- `DetermineDiagnosis(overallScore) string` — maps the overall score to one of four
  diagnosis labels.

### Algorithm

**Step 1 — dimension score** (weighted average of the dimension's questions):

```
dimensionScore = Σ(answer.value × question.weight) / Σ(question.weight)
```

Rounded to 2 decimal places; `maxScore` is always `5.0`.

**Step 2 — overall score:**

```
overallScore = Σ(dimensionScore) / numberOfDimensions
```

Rounded to 2 decimal places.

**Step 3 — strengths and weaknesses:**

| Condition | Classification |
|-----------|----------------|
| `dimensionScore >= 3.50` | Strength |
| `dimensionScore < 2.50` | Weakness |
| `2.50 ≤ score < 3.50` | Neutral (not listed) |

**Step 4 — diagnosis:**

| Overall score | Diagnosis |
|---------------|-----------|
| ≥ 4.00 | `"Advanced"` |
| ≥ 3.00 | `"Established"` |
| ≥ 2.00 | `"Developing"` |
| < 2.00 | `"Beginning"` |

### Notable behavior

- Strengths/weaknesses store dimension names in **EN**; the per-dimension score entries
  carry both `dimensionName` and `dimensionNameTh` so the result page can localize.
- Boundary values are inclusive downward exactly as tabled: `1.99 → Beginning`,
  `2.00 → Developing`, `3.00 → Established`, `4.00 → Advanced` (asserted in tests).
- The engine is variant-agnostic — dimension count and question weights come entirely
  from the config ([quiz-config.md](./quiz-config.md)).

## Usage

Call site: `apps/backend/services/quiz/service.go` (submit path).

```
# pseudocode — submit pipeline
validate answers (count · ids · 1–5)         # sentinel errors on failure
result := scoring.ComputeScores(cfg.questions, cfg.dimensions, answers)
store Assessment{ id: uuid, uid, quizId, answers, scores: result.dimensionScores,
                  overallScore, strengths, weaknesses, diagnosis, submittedAt }
audit.Log(EventAssessmentSubmitted)
go notification.NotifyQuizResult(...)        # async — never blocks the response
pkg.RespondJSON(w, 201, assessment)
```

## Acceptance Criteria

- Given all answers are 5, when scored, then every dimension is a strength and the diagnosis is `"Advanced"`.
- Given mixed answers, when scored, then dimensions ≥ 3.50 are strengths, < 2.50 are weaknesses, and the rest are omitted.
- Given overall scores 1.99 / 2.00 / 3.00 / 4.00, when diagnosed, then Beginning / Developing / Established / Advanced respectively.
- Given weighted questions, when scored, then the dimension score is the weight-normalized average rounded to 2 dp.

## Status

- [x] `ComputeScores` + `DetermineDiagnosis` — `services/scoring/scoring.go`
- [x] `ScoringResult` models — `services/scoring/models.go`
- [x] `scoring_test.go` — all-5s, mixed, and boundary-value cases (serves the ≥ 80% coverage goal)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
