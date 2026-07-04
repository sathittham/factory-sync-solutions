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

**Live.** `DashboardPage.tsx` (597 lines, with inline `StatCard` / `GhostStatCard` /
`DimensionRow`) is routed at `/dashboard` via
`routes/_authed/_registered/dashboard.tsx`, listed first in the `Layout.tsx` nav, and is
the post-login landing page (`SignInPage` and `RegisterPage` both redirect there). The
route/nav wiring shipped with the TanStack Router adoption (PR #25, 1 July 2026); the
current KPI-cards + dimension-bars design and TanStack Query data layer shipped in the
Query rollout (2 July 2026), which also retired the old `resultSlice` flow and the
earlier `MiniScoreRing` card-grid design.

Both formerly open decisions are resolved in code: the retake action targets the
**active** quiz (`activeId ?? 'shindan'`, fallback defensive only), and `/dashboard` is
the post-login landing route.

The Vitest unit suite landed 4 July 2026 — `DashboardPage.test.tsx`, 16 tests covering
UT-001–UT-017, all passing — together with the i18n cleanup (`dashboard.times` key
replaces the inline ternary; `quiz.assessedOn` trailing space + `.trim()` removed) and
`aria-hidden="true"` on the page's decorative SVGs (clears its Biome a11y errors).

**What remains:** the dashboard Playwright spec (`e2e/dashboard.spec.ts`) — blocked on
seeding dedicated test accounts for the empty-state and multi-quiz cases
([test-plan.md § 3.2](./test-plan.md)).

No backend work — the page reuses `GET /results` and `GET /quiz/quizzes` through
TanStack Query. The separate `web-backoffice` dashboard is unaffected and live
([backoffice/feature-spec.md](../backoffice/feature-spec.md)).

---

## Build Checklist

Mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state) and
[§ 10](./feature-spec.md#10-open-tasks):

- [x] `DashboardPage` component — `apps/web-app/src/pages/DashboardPage.tsx`
- [x] `StatCard` / `GhostStatCard` / `DimensionRow` (inline) — in `DashboardPage.tsx`
- [x] `/dashboard` route — `apps/web-app/src/routes/_authed/_registered/dashboard.tsx`
- [x] "Dashboard" nav item — `apps/web-app/src/components/Layout.tsx` (`getNavItems()`)
- [x] Post-login / post-registration redirect to `/dashboard` — `SignInPage.tsx`, `RegisterPage.tsx`
- [x] Empty-state i18n keys (`quiz.noResults.title`, `quiz.noResults.desc`) — `lib/i18n.tsx`
- [x] `quiz.yourCompany` / `quiz.startNewAssessment` / `quiz.start` i18n keys — verified present (TH + EN)
- [x] Retake target derives from the active quiz (`activeId`)
- [x] i18n cleanup — `dashboard.times` key replaces the inline ternary; `quiz.assessedOn` trailing space removed
- [x] a11y — `aria-hidden="true"` on decorative SVGs (page is Biome-clean)

### Tests

Per [test-plan.md](./test-plan.md):

- [x] Vitest — `DashboardPage.test.tsx` (16 tests, UT-001–UT-017): derivations, thresholds, `DimensionRow`, `handleStartQuiz`, state selection, tabs, KPI formatting
- [x] Playwright — post-login redirect lands on `/dashboard` (`e2e/login.spec.ts`)
- [ ] Playwright — `dashboard.spec.ts`: empty state · KPI values · tab switching · Start/Retake → `/quiz` · View Results → `/results` (needs seeded empty-state + multi-quiz test accounts)
- [x] `make test-web` green (96 tests)

---

## Open Decisions

None. Both prior decisions are resolved and recorded in
[feature-spec.md § 10.3](./feature-spec.md#103-resolved-decisions-for-the-record).

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [test-plan.md](./test-plan.md) · [dashboard-page.md](./dashboard-page.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 2.1.0*
*Last updated: 4 July 2026*
