<!--
  STATUS TRACKER TEMPLATE — the live build-progress doc for a feature folder.

  How to use:
  - Mirrors the Build Sequence in this folder's README.md. Tick items as they merge into `develop`.
  - "Current State" is prose: a few short paragraphs on what's actually shipped right now.
    Keep it honest — partial / deferred work belongs here explicitly.
  - Record real `go test -cover` numbers per package as suites land.
  - Bump the footer Version + Last-updated on every edit.
  Remove this comment block before committing.
-->

# Status

> Tracks build progress for the <Feature Name> feature against
> [README.md § Build Sequence](./README.md#build-sequence). Design detail is in
> [README.md](./README.md), requirements in [feature-spec.md](./feature-spec.md), and the
> per-component sub-docs. Tick items off as they are implemented and merged into `develop`.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Phase 1 — MVP](#phase-1--mvp)
- [Phase 2](#phase-2)
- [Open Decisions](#open-decisions)
- [Related Documents](#related-documents)

---

## Current State

<!-- Prose snapshot of what is actually built and wired into the live router/app right now.
     Lead with the headline (e.g. "Phase 1 backend shipped end to end."), then the specifics.
     Call out anything partial or deferred — don't imply done work that isn't. -->

<2–4 short paragraphs describing what is shipped, what is partial, and what has not started.>

Coverage goal follows [README.md § Testing](./README.md#testing): critical `services/` ≥ 80%.
Record actual `go test ./... -cover` numbers per package as each suite lands.

---

## Phase 1 — MVP

<One line scoping what Phase 1 delivers — the launch-critical surface.>

- [ ] <Build-sequence item — mirror README.md task, name the file>
- [ ] <Build-sequence item>

See [README.md § Build Sequence](./README.md#build-sequence) for full detail.

### Phase 1 Tests

**Goal:** critical `services/` ≥ 80%. Each suite is table-driven and asserts the deny path
(401/403/404), not just the happy path.

- [ ] `services/<name>/service_test.go` — <funcs under test, cases>
- [ ] `services/<name>/handler_test.go` — <deny-path cases>

Coverage recorded:

- [ ] `go test ./services/<name>/... -cover` → **<n>%**

---

## Phase 2

<One line scoping Phase 2.>

- [ ] <item>

See [README.md § Build Sequence](./README.md#build-sequence) for full detail.

### Phase 2 Tests

**Goal:** same threshold as Phase 1.

- [ ] <test item>

---

## Open Decisions

Mirrors [README.md § Open decisions](./README.md#open-items--future-work); resolve and tick
off as each lands.

| # | Decision | Resolution |
|---|----------|------------|
| 1 | <decision> | **Open**: <default until decided> |

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [<sub-doc>.md](./<sub-doc>.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 0.1.0*
*Last updated: <DD Month YYYY>*
