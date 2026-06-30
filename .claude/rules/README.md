---
description: How rules work and how to add new ones — meta-guide for the rules/ directory
paths:
  - ".claude/rules/**/*.md"
---

# Rules

Rules are coding standards that Claude Code loads automatically based on what you're editing.

> This README is itself path-gated (see frontmatter above) so it loads only when
> you edit a rule file — not into every session. Any bare `.md` placed directly
> under `rules/` without `paths:` becomes an always-on rule. Always gate docs.

## How Rules Work

Each rules file has a `paths` field in its frontmatter that gates when the file is loaded:

```yaml
---
paths:
  - "apps/backend/**/*.go"   # loads whenever you edit any .go file under apps/backend
---
```

If no `paths` field is present, the rules load in every conversation (always-on).

---

## Rules Files

| File | Loads when | Covers |
|------|-----------|--------|
| `go.md` | Editing `apps/backend/**/*.go` | Chi routes, Firestore, Firebase Auth, response format, error handling |
| `react.md` | Editing `apps/web-app/**/*.tsx` or `*.ts` | shadcn/ui, Redux, i18n, dayjs, Tailwind, accessibility |
| `git.md` | Always | Branch naming, commit format, merge strategy, protected branch rules |
| `dev-process.md` | Always | Code review checklist, naming conventions, architecture, quiz domain |

---

## Key Rules Summary

### Go (`go.md`)
- Always use `pkg.RespondJSON`, `pkg.RespondList`, `pkg.RespondError` — never raw JSON
- UID always from `middleware.GetUID(r)` — never from request body
- Wrap all errors: `fmt.Errorf("context: %w", err)`
- Sentinel errors: domain-specific per service (`ErrProfileNotFound`, `ErrAlreadyRegistered`, …) — not generic `ErrNotFound`
- `errors.Is` for checks — never type assertion

### React (`react.md`)
- Always shadcn/ui — never native `<select>`, `<dialog>`, `window.confirm()`
- Always `useLocale()` for text — no hardcoded strings
- Always `formatDateTime()` from `@/lib/dayjs` — no raw `toLocaleDateString()`
- No nested ternaries (SonarQube S3358)
- Base font: 17px — `text-sm` minimum for labels

### Git (`git.md`)
- Branch format: `feature/short-description`
- Commit format: `feat(scope): description`
- Squash merge feature branches to `main`
- Never force push to `main`
- Tags trigger deploys: `v*-staging` → staging, `v*.*.*` → production

---

## Adding a New Rule

1. Create `rules/<topic>.md`
2. Add frontmatter with `paths` if path-gated, or omit for always-on
3. Keep rules concise — detailed guides belong in `docs/`
4. Add a row to the table above

```markdown
---
description: Short description of what this rule covers
paths:
  - "**/pattern/**"   # omit for always-on
---

# Rule Title

[Rules content]

*Version: 1.0.0*
*Last updated: DD Month YYYY*
```

---

*Version: 1.0.0*
*Last updated: 04 June 2026*
