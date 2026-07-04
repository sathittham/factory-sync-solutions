# Status

> Tracks build progress for the TanStack Table + Query Adoption work against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md). Tick items off as they are implemented and merged
> into `develop`.
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

**SRS approved, implementation not recorded.** The requirements were approved on
1 July 2026 (VSE self-approval, logged as
[CR-003](../../iso29110/change-request-log.md)). The spec itself marks no component as
built, so every item below starts unticked — this tracker was backfilled from the spec on
3 July 2026 and should be updated as work merges into `develop`.

Scope is a single iteration: one reusable `DataTable`, one table migration (the AdminPage
assessment table), and one Query pilot page. The wider per-page Query rollout and the
remaining AdminPage tables are explicitly out of scope (tracked under
[Future Work](#future-work)).

No backend surface — there is no Go coverage number to record. Verification is the
`web-app` toolchain per [README.md § Testing](./README.md#testing).

---

## Build Checklist

Single iteration — mirrors the spec's in-scope items (§ 1.2) and functional requirements.

- [ ] Reusable shadcn `DataTable` + `table` primitive on `@tanstack/react-table` — `apps/web-app/src/components/ui/`
- [ ] AdminPage assessment table migrated to `DataTable` — click-to-sort on Company / Score / Date (FR-001) — `apps/web-app/src/pages/AdminPage.tsx`
- [ ] Client-side pagination, default 10 rows/page with prev/next (FR-002)
- [ ] Company-name search box, client-side filter (FR-003)
- [ ] Behaviour preserved: expandable detail rows, responsive hidden columns, server-side industry/size filters, `data-testid` hooks, `useLocale()` i18n (FR-004)
- [ ] `QueryClientProvider` wraps the app (FR-005)
- [ ] Pilot page migrated from `fetch`+`useState`+`useEffect` to `useQuery`, identical `Skeleton` loading + error UX (FR-005, FR-006)
- [ ] Query/Redux boundary documented in `.claude/rules/react.md` (NFR-004)

### Tests

- [ ] `pnpm build`, Biome, `tsc`, and Vitest pass for `@repo/web-app` (NFR-003)
- [ ] Existing Playwright e2e suites remain green (NFR-003)

---

## Future Work

Out of scope this iteration per [feature-spec.md § 1.2](./feature-spec.md#12-scope); all ❌ not started.

- [ ] Per-page rollout of TanStack Query to the remaining fetch call sites (after the pilot)
- [ ] Migrate the AdminPage feature-matrix table to `DataTable`
- [ ] Migrate the user-management tables to `DataTable`

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md)
- [CR-003 — change-request-log.md](../../iso29110/change-request-log.md) · [progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
