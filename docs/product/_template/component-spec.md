<!--
  COMPONENT SUB-DOC TEMPLATE — one per non-trivial component of a feature.

  How to use:
  - Copy + rename to <component-slug>.md (e.g. scoring-rubric.md, dbd-lookup.md).
  - Scope it to ONE component: its contract, config, call sites, and acceptance criteria.
  - Reference it from the feature README.md § References and from status.md.
  - Pseudocode/contracts only — no real implementation code.
  - Keep the footer current.
  Remove this comment block before committing.
-->

# <Component Name>

## Summary

<1–2 sentences: what this component is, which service/package or component it lives in
(e.g. `services/<name>/`, `apps/web-app/src/components/`), and what it's for.>

## Implementation

<!-- The contract: exported functions/types, signatures, and behavior in plain English.
     Describe intent and edge cases (fail-open/closed, retries, defaults) — not line-by-line code.
     Wrap every error: fmt.Errorf("context: %w", err). Sentinel errors are domain-specific. -->

- `<package>.<Constructor>(...) <Type>`
- `(<Type>).<Method>(ctx, ...) (<return>, error)` — <what it does and returns>

### <Notable behavior / edge case>

<Describe the non-obvious behavior: failure modes, environment-gated paths, etc.>

## Configuration

<!-- Drop this section if the component needs no config. Secrets (.env*, firebase-sa.json)
     are git-ignored — never commit them (CLAUDE.md rule 9). -->

| Env var | Description |
|---------|-------------|
| `<ENV_VAR>` | <description + where the secret comes from> |

## Usage

<!-- Where it's called from, and how errors map to the response envelope. Short pseudocode
     illustrating the contract is fine; keep it illustrative, not a copy of the source. -->

Call site: `apps/backend/services/<name>/service.go`.

```
# pseudocode — service maps a failed check to a sentinel error
res, err := <component>.<Method>(ctx, input)
if err != nil  → return fmt.Errorf("<context>: %w", err)
if !res.ok     → return Err<Specific>
```

```
# pseudocode — handler maps the sentinel error to the response envelope
errors.Is(err, Err<Specific>NotFound) → pkg.RespondError(w, 404, "NOT_FOUND", msg)
default                               → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
```

## Acceptance Criteria

- Given <precondition>, when <action>, then <observable result>.
- Given <failure precondition>, when <action>, then <deny / error result>.

## Status

- [ ] <Implementation item — name the file>
- [ ] <Wiring / config item>
- [ ] <Tests — name the test file (`service_test.go`) and the coverage target it serves>

---

*Version: 0.1.0*
*Last updated: <DD Month YYYY>*
