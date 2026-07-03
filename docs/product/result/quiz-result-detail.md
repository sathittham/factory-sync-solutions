# QuizResultDetail, ScoreRing & DimensionDetail (web-app)

## Summary

The visual layer of the results page: `QuizResultDetail` composes the full layout for one
assessment out of `ScoreRing`, a recharts radar chart, `DimensionDetail` accordion rows and
the strengths/weaknesses panels. All live in the web-app alongside
`apps/web-app/src/pages/ResultPage.tsx`.

## Implementation

### `QuizResultDetail`

Full result layout for one assessment, in order:

1. Hero score card — `ScoreRing` + diagnosis badge + submitted date (`formatDateTime`).
2. Radar chart — recharts `RadarChart`, 280–320 px, dark-mode aware colours, plus an
   `sr-only` div listing all dimension scores as plain text for screen readers.
3. 2-column `DimensionDetail` grid (md+).
4. Strengths (score ≥ 3.50) + Weaknesses (score < 2.50) panels — each omitted when empty.

Dimension names in the radar chart and S/W panels resolve from `dimLookup` (fetched via
`GET /quiz/questions?quizId=<id>`) in the active locale, falling back to the name stored in
the assessment document until the lookup loads. The component re-mounts on tab change (new
`assessment` prop) so all animations replay.

### `ScoreRing`

SVG circle with two concentric rings — background (`--border`) and filled arc
(`--primary`). Arc length ∝ `score / 5`, animated `transition-all duration-1000 ease-out`;
the score text is absolutely positioned in the centre.

### `DimensionDetail`

Accordion row (a `<button>` with a visible focus ring). Header: dimension name, mono score,
progress bar. Expanded: a 5-cell level grid highlighting cells up to `Math.floor(score)`
with "Beginning → Advanced" labels, plus exact score / maxScore.

### Diagnosis visual config

| Diagnosis | Score range | Badge colours |
|-----------|-------------|---------------|
| `Beginning` | < 2.00 | Red (`text-red-700`, `bg-red-50`, `border-red-200`) |
| `Developing` | 2.00 – 2.99 | Amber |
| `Established` | 3.00 – 3.99 | Blue |
| `Advanced` | ≥ 4.00 | Emerald |

Dark mode uses `dark:` equivalents (`dark:bg-red-950/30` etc.). Unknown keys fall back to
`Beginning`. Score colours for progress bars / mono labels: ≥ 4.00 emerald · ≥ 3.00 blue ·
≥ 2.00 amber · < 2.00 red ([feature-spec.md § 7](./feature-spec.md#7-diagnosis-visual-config)).

### Animation sequence

`framer-motion` wrappers from `@/components/motion`: hero `ScaleIn` (0 s) → radar `FadeIn`
(0.1 s) → dimensions `FadeIn` (0.15 s) → S/W `StaggerChildren` (0.1 s stagger) → history
`FadeIn` (0.3 s) — full table in [feature-spec.md § 12](./feature-spec.md#12-animation-sequence).

## Usage

```
# pseudocode — ResultPage renders one detail per selected assessment
<QuizResultDetail assessment={selected} dimLookup={dimCache[activeQuizId]} />
  → ScoreRing(score = assessment.overallScore)
  → RadarChart(data = assessment.scores, names from dimLookup ?? stored names)
  → assessment.scores.map(s => <DimensionDetail …/>)
  → strengths/weaknesses panels if non-empty
```

## Acceptance Criteria

- Given an overall score of 3.47/5, when the hero card renders, then the ring arc fills ~69% and the badge is blue `Established`.
- Given all dimension scores, when the radar chart renders, then every dimension appears on the correct axis with a screen-reader text alternative.
- Given a dimension row, when clicked, then it expands to the level grid with cells highlighted to `Math.floor(score)`.
- Given no dimension ≥ 3.50 (or < 2.50), when the panels render, then the strengths (or weaknesses) panel is omitted.
- Given the TH locale, when names render, then localised dimension names and Buddhist-Era dates are used.

## Status

- [x] `QuizResultDetail` layout (hero · radar · grid · panels)
- [x] `ScoreRing` SVG component with animated arc
- [x] `DimensionDetail` accordion with level grid
- [x] Diagnosis/score colour config incl. dark mode + `Beginning` fallback
- [x] Tests — `getScoreColor` / `diagnosisConfig` unit tests; Playwright chart/panel assertions

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
