# Status

> Tracks build progress for the Dashboard Page feature against
> [README.md § Build Sequence](./README.md#build-sequence). Design detail is in
> [README.md](./README.md), requirements in [feature-spec.md](./feature-spec.md), and the
> per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

**Built, not shipped.** `DashboardPage.tsx` (436 lines, including the inline
`MiniScoreRing`) is fully implemented and exported — but it has **zero references** in the
app: it is not imported in `router.tsx`, has no route path, and has no nav link in
`Layout.tsx`. It cannot be reached through normal navigation. Wiring the route is the
single blocking task; everything else is polish behind it.

Two known code-quality gaps in the built component: the empty-state copy uses inline
`locale === 'th' ? … : …` comparisons instead of `t()` (violates the i18n rule), and the
"Retake Assessment" action card is hardcoded to `quizId='shindan'` even for users who have
never taken the Shindan quiz.

One drift note: the spec's data flow reads `resultSlice`, which has since been retired in
the TanStack Query migration — the fetch/caching wiring needs revisiting when the page is
routed. The separate `web-backoffice` dashboard is unaffected and already live
([backoffice/feature-spec.md](../backoffice/feature-spec.md)).

No backend work — the page reuses `GET /results` and `GET /quiz/quizzes`.

---

## Build Checklist

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state) and
[§ 10](./feature-spec.md#10-open-tasks-before-shipping):

- [x] `DashboardPage` component — `apps/web-app/src/pages/DashboardPage.tsx`
- [x] `MiniScoreRing` (inline SVG) — in `DashboardPage.tsx`
- [ ] **BLOCKING** — `/dashboard` route entry — `apps/web-app/src/router.tsx`
- [ ] "Dashboard" nav link — `apps/web-app/src/components/Layout.tsx`
- [ ] Empty-state i18n keys (`dashboard.noResults`, `dashboard.noResultsDesc`) — `apps/web-app/src/lib/i18n.tsx`
- [ ] Verify `quiz.yourCompany` / `quiz.startNewAssessment` / `quiz.start` i18n keys exist
- [ ] Resolve hardcoded `'shindan'` retake target
- [ ] Decide post-login navigation intent (`/`, `useAuth`, `SignInPage` → `/dashboard`?)

### Tests

Planned per [feature-spec.md § 14](./feature-spec.md#14-testing) — none written yet:

- [ ] Vitest — `handleStartQuiz` dispatches `resetQuiz()`, `setQuizId(id)`, navigates `/quiz`
- [ ] Vitest — `quizGroups` / `uncompletedQuizzes` derivations
- [ ] Vitest — `MiniScoreRing` arc math (score 2.5 → 50% arc)
- [ ] Playwright — empty state · populated cards · card → `/results` · Start → `/quiz`
- [ ] `make lint-web` + `make test-web` pass with the route wired

---

## Open Decisions

Mirrors [README.md § Open decisions](./README.md#open-items--future-work).

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Retake target hardcoded to `'shindan'` | **Open**: keep + relabel "Retake Shindan", or derive from first completed quiz |
| 2 | Post-login landing route | **Open**: `/results` today; `/dashboard` candidate once routed |

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [dashboard-page.md](./dashboard-page.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
