---
name: doc-review
allowed-tools: Bash(find:*), Bash(grep:*), Bash(git fetch:*), Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(git tag:*), Bash(ls:*), Bash(tail:*), Bash(wc:*), Read, Glob, Grep
description: Review docs/ files for accuracy, currency, version/date format, and ISO 29110 artifact alignment. Run after modifying any documentation.
---

# Doc Review Skill

You are a strict documentation reviewer for Factory Health Check. Find **real problems** — wrong content, stale dates, broken links, missing ISO 29110 artifacts, and API endpoints that don't match the code. Skip minor style opinions.

## Context

- Current branch: !`git branch --show-current`
- Modified docs: !`git diff --name-only origin/main...HEAD 2>/dev/null | grep "\.md$" || git diff --name-only HEAD 2>/dev/null | grep "\.md$" || echo "(none)"`

## How to Use This Skill

```
/doc-review                                    # Review all modified .md files on this branch
/doc-review docs/product/quiz/                 # Review a specific feature folder
/doc-review docs/api/user.md                   # Review a single file
/doc-review iso29110                           # Review all ISO 29110 artifacts only
```

---

## Doc Folder Map

| Folder | Code location | Type |
|--------|--------------|------|
| `docs/product/<feature>/` | `apps/backend/services/<feature>/` | Feature SRS + test plan |
| `docs/architecture/` | Both apps | Design documents |
| `docs/api/` | `apps/backend/services/` | API reference |
| `docs/iso29110/` | — | Process artifacts |
| `docs/operations/` | — | Deployment + runbooks |

---

## Your Task

### Step 1 — Determine scope

Parse the args:
- Single file path → review that file only
- Directory path → review all `.md` files in it recursively
- `iso29110` → review all files under `docs/iso29110/` + check per-feature coverage
- No args → list modified `.md` files:
  ```bash
  git diff --name-only origin/main...HEAD 2>/dev/null | grep "\.md$"
  ```
  Fallback if empty:
  ```bash
  git diff --name-only HEAD 2>/dev/null | grep "\.md$"
  ```

If scope is still empty: report "No modified `.md` files found — specify a path or run from a branch with changes." and stop.

### Step 2 — For each file, run ALL checks

---

**[RULE-DATE] Last Updated Date**
- Every `.md` file MUST end with `*Last updated: DD Month YYYY*` on the last non-empty line
- Full day number, full English month, 4-digit year: `*Last updated: 11 June 2026*`
- Flag MISSING: no `*Last updated*` line
- Flag WRONG FORMAT: abbreviated month, numeric date, wrong asterisks
- Flag STALE: run `git log -1 --format="%ad" --date=format:"%d %B %Y" -- <file>` — if file date is earlier than last commit date, it is stale
- Check: `tail -5 <file>`

**[RULE-VER] Document Version**
- Every `.md` file MUST have `*Version: X.Y.Z*` immediately above `*Last updated*` (no blank line between)
- Flag MISSING, WRONG FORMAT (`v1.0` not semver, has `v` prefix, lowercase `version`)
- Flag NOT ADJACENT: blank line between the two
- Check: `tail -5 <file>`

**[RULE-CAMEL] camelCase Fields**
- All JSON field names in doc examples MUST be camelCase
- Flag `snake_case` fields (`user_id`, `created_at`, `is_active`)
- Check JSON code blocks only

**[RULE-BOOL] Boolean Naming**
- Boolean fields MUST use `is*` or `has*` prefix
- Flag: `"active": true`, `"completed": false` (missing prefix)
- Check: look for `": true"` and `": false"` in JSON examples

**[RULE-RESPONSE] Response Format**
- Single item: must use `"data"` key → `{ "success": true, "data": <item> }` (factory-sync-solutions pkg.RespondJSON format)
- List: must use `"data"` array + `"count"` → `{ "success": true, "data": [...], "count": N }` (pkg.RespondList format)
- Error: must use `{ "success": false, "error": { "code": "...", "message": "..." } }` (pkg.RespondError format)
- Flag: `"item"`, `"items"`, `"result"` as top-level keys — this project uses `"data"` and `"count"`
- Flag: `"isSuccess"` — this project uses `"success"` (boolean)

**[RULE-API] API Endpoint Accuracy** (applies to files in `docs/api/`)
- Extract documented endpoints from the file:
  ```bash
  grep -E "(GET|POST|PUT|PATCH|DELETE) /api/" <file>
  grep -oE "\`(GET|POST|PUT|PATCH|DELETE) [^\`]+\`" <file>
  ```
- For each endpoint, find the corresponding handler in `apps/backend/services/`:
  ```bash
  grep -rn "r\.Get\|r\.Post\|r\.Put\|r\.Patch\|r\.Delete\|\.Get(\|\.Post(" \
    apps/backend/services/ --include="*.go" | grep -v "_test.go"
  ```
- Flag: endpoint in doc with no handler match
- Flag: handler path that has no doc entry (undocumented endpoint)
- Flag: HTTP method mismatch between doc and handler

**[RULE-ISO] ISO 29110 Artifact Accuracy** (applies to files in `docs/iso29110/`)
- `project-plan.md`: check `lastUpdated` field is not more than 90 days old
- `risk-register.md`: check Review History has an entry in the last 30 days
- `progress-log.md`: check an entry exists since the last production tag:
  ```bash
  git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1
  git log --oneline <last-tag>..HEAD -- docs/iso29110/progress-log.md
  ```
- `change-request-log.md`: count open CRs — flag if > 3 open with no target date
- VDD: flag if `docs/iso29110/releases/` has no VDD matching the most recent staging tag

**[RULE-FEATURE-COVERAGE]** (applies when scope is `iso29110` or `docs/product/`)
- For each folder under `docs/product/` (skip `iso29110`):
  - Check `feature-spec.md` exists → ✅/❌
  - Check `test-plan.md` exists → ✅/❌
- Report the coverage table

**[RULE-LINKS] Relative Links**
- Extract relative markdown links: `grep -oE "\[[^]]+\]\(\.\./[^)]+\.md[^)]*\)" <file>`
- Verify each target file exists on disk
- Flag broken links

---

### Step 3 — Format findings

Group by file. Report real violations only.

```
## docs/product/quiz/feature-spec.md
- [RULE-DATE] Stale: file says "1 May 2026" but last committed 10 June 2026 — update to today
- [RULE-CAMEL] Field "quiz_id" in line ~34 should be "quizID"

## docs/api/user.md
- [RULE-API] Endpoint `POST /api/v1/profile` in doc but no handler found in services/profile/
- [RULE-RESPONSE] Response uses "item" key (line ~82) — this project uses "data" key

## docs/iso29110/risk-register.md
- [RULE-ISO] Review History last entry > 30 days ago — add a new review entry

## docs/product/ [COVERAGE]
  auth/       feature-spec.md ✅  test-plan.md ✅
  quiz/       feature-spec.md ✅  test-plan.md ❌ MISSING
  backoffice/ feature-spec.md ❌ MISSING  test-plan.md ❌ MISSING
```

If a file is clean:
```
## docs/product/quiz/test-plan.md — OK
```

### Step 4 — Summary

```
Found X violations across Y files. Z files are clean.
Next actions: [list the highest-priority fixes]
```

---

## Rules

- **Read the actual file** before reporting — do not guess
- **Check handler code** when verifying API accuracy — grep the services directory
- **Skip style opinions** — only flag rule violations, not preferences
- **Batch repeated violations** — if a file has 5+ of the same rule, write "5 instances of [RULE-X]"
- **ISO 29110 takes priority** — missing SRS/test-plan artifacts are more important than formatting

*Version: 1.0.0*
*Last updated: 11 June 2026*
