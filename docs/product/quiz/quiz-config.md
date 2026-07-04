# Quiz Config + Registry (backend)

## Summary

JSON-driven question sets and the in-memory registry that serves them. Configs live in
`apps/backend/config/questions*.json` (one file per variant); `scoring.QuizRegistry` in
`apps/backend/services/scoring/scoring.go` loads all five at startup. No questions are
hard-coded anywhere in the codebase.

## Implementation

- `scoring.QuizRegistry` — startup-loaded map of `quizId → QuizConfig`; `registry.Get(quizId)`
  returns the config or a miss that the quiz service maps to `ErrQuizNotFound` (404).
- A `QuizConfig` carries `id`, `version`, `nameTh`/`nameEn`, `dimensions[]`
  (`id`, `nameTh`, `nameEn`, `weight`), and `questions[]`.
- Registered variants:

| Quiz ID | File | Version | Dimensions | Questions |
|---------|------|---------|------------|-----------|
| `shindan` (default) | `questions.json` | 2.0.0 | 8 | 43 |
| `factory` | `questions-factory.json` | 1.0.0 | 7 | 49 |
| `cybersecurity` | `questions-cybersecurity.json` | 1.0.0 | 8 | 51 |
| `lean` | `questions-lean.json` | 1.0.0 | 12 | 29 |
| `iso29110` | `questions-iso29110.json` | 1.0.0 | 8 | 38 |

### Question shape

Each question in `questions*.json`:

```jsonc
{
  "id": "bm-1",                      // unique, kebab-case
  "dimensionId": "basic-management", // must match a dimension id
  "textTh": "5 ส.",
  "textEn": "5S (Sort, Set, Shine, Standardize, Sustain)",
  "descriptionTh": "...",            // optional — note below the question
  "descriptionEn": "...",
  "weight": 1.0,                     // per-question weight for the weighted average
  "rubric": {                        // optional — omitted → numeric 1–5 buttons
    "1": { "th": "สับสน", "en": "Confused / no system" },
    "5": { "th": "มีการแก้ไขและป้องกัน", "en": "Corrective and preventive actions" }
  }
}
```

### Notable behavior

- **Rubric optional:** questions without a `rubric` render as 5 compact numeric buttons
  on the client; the stored answer is always an integer 1–5 either way.
- **Bilingual by construction:** every dimension, question, and rubric level carries both
  `th` and `en` text — the config is the single source of TH/EN quiz copy.
- The dimension count differences per variant flow straight through scoring — the overall
  score is the mean of however many dimensions the variant defines.

## Usage

Call sites: `apps/backend/services/quiz/service.go` (both endpoints).

```
# pseudocode — questions endpoint
GET /quiz/questions?quizId=shindan
  cfg, ok := registry.Get(quizId)
  !ok → ErrQuizNotFound → pkg.RespondError(w, 404, "NOT_FOUND", msg)
  ok  → pkg.RespondJSON(w, 200, cfg)   # dimensions + questions + rubrics
```

```
# pseudocode — submit uses the same config as the validation source of truth
cfg := registry.Get(req.quizId)            # ErrQuizNotFound if unknown
len(req.answers) != len(cfg.questions)     → ErrIncompleteAnswers (400)
answer.questionId not in cfg / value ∉ 1–5 → ErrInvalidAnswer (400)
```

## Acceptance Criteria

- Given a registered `quizId`, when `/quiz/questions` is called, then the full config (dimensions, questions, rubrics, TH+EN) is returned.
- Given an unknown `quizId`, when either endpoint is called, then `404` via `ErrQuizNotFound`.
- Given a config file with a question whose `dimensionId` matches a dimension, when loaded at startup, then the question is grouped under that dimension.
- Given a question without a `rubric`, when served, then the client renders numeric 1–5 buttons.

## Status

- [x] Five variant configs bundled in `apps/backend/config/`
- [x] `QuizRegistry` loads all variants at startup — `services/scoring/scoring.go`
- [x] `GET /quiz/quizzes` lists all registered variants
- [x] Unknown-variant deny path covered in `services/quiz/service_test.go`

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
