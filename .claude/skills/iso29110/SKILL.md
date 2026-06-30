---
name: iso29110
allowed-tools: Read, Edit, Write, Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Bash(git tag:*), Bash(make:*), Bash(find:*), Bash(ls:*), Bash(test:*), Glob, Grep
description: ISO 29110 Basic Profile compliance helper — run the release checklist, generate a VDD, create a feature SRS or test plan, review the risk register, or get a full artifact health summary.
---

# ISO 29110 Compliance Skill

ISO/IEC 29110 Basic Profile compliance helper for the Factory Health Check project. All process artifacts live in `docs/iso29110/`. Feature-level documents live in `docs/product/<feature>/`.

## Usage

```
/iso29110 checklist          — Run the pre-release compliance checklist
/iso29110 status             — Full ISO 29110 artifact health dashboard
/iso29110 vdd vX.Y.Z         — Generate a Version Description Document for a release tag
/iso29110 progress           — Add a sprint/milestone entry to the progress log
/iso29110 risk               — Review risk register: flag open High risks, prompt for updates
/iso29110 srs <feature>      — Create docs/product/<feature>/feature-spec.md from template
/iso29110 test-plan <feature> — Create docs/product/<feature>/test-plan.md from template
```

---

## Command: checklist

Run the ISO 29110 pre-release compliance checklist and report pass/fail for every item.

Steps:
1. Read `docs/iso29110/README.md` — extract the compliance checklist items
2. For each artifact, check existence and currency:

   **PM.O1 — Project Plan**
   - Read `docs/iso29110/project-plan.md` — confirm it exists and note `lastUpdated`
   - Read `docs/iso29110/risk-register.md` — check the Review History for a recent entry (≤ 30 days)

   **PM.O2 — Progress Log**
   - Read `docs/iso29110/progress-log.md`
   - Confirm there is an entry since the last production tag: `git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1`
   - Check it covers the current release candidate

   **SI.O1 — Feature Specifications (SRS)**
   - Run: `ls docs/product/`
   - For each folder (skip `iso29110`): check `docs/product/<folder>/feature-spec.md` exists
   - Report which features are missing their SRS

   **SI.O2 — Design Documents (SDD)**
   - Run: `ls docs/architecture/`
   - For non-trivial features, check `docs/architecture/<feature>-design.md` exists
   - Note any features that have a feature-spec.md but no design doc

   **SI.O4-O5 — Test Plans and Test Execution**
   - For each folder under `docs/product/` (skip `iso29110`): check `docs/product/<folder>/test-plan.md` exists
   - Report which features are missing their test plan
   - Run tests and report results:
     `make test-api 2>&1 | tail -20`
     `make test-web 2>&1 | tail -10`

   **SI.O6 — User Guide / Release Notes**
   - Read `docs/iso29110/user-guide.md` — confirm it exists; note `lastUpdated`
   - Flag if more than 60 days stale

   **SI.O7 — Version Description Document**
   - Determine target version: `git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+-staging$' | head -1`
   - Check if `docs/iso29110/releases/<version>.md` exists (strip `-staging` suffix for VDD filename)
   - If no staging tag exists, check for the most recent planned version in progress-log.md

   **Change Request Log**
   - Read `docs/iso29110/change-request-log.md` — count rows with Status = Open
   - Flag if > 3 open CRs without a target close date

3. Print a summary table:

   ```
   ✅ Pass / ⚠️ Needs attention / ❌ Missing
   ```

4. List concrete actions required before the release can be tagged production.

---

## Command: status

Full ISO 29110 artifact health dashboard — quick overview of all outputs and their currency.

Steps:
1. Check each required artifact file exists:
   - `docs/iso29110/project-plan.md` ✅/❌
   - `docs/iso29110/progress-log.md` ✅/❌
   - `docs/iso29110/risk-register.md` ✅/❌
   - `docs/iso29110/change-request-log.md` ✅/❌
   - `docs/iso29110/user-guide.md` ✅/❌
   - `docs/iso29110/srs-template.md` ✅/❌
   - `docs/iso29110/sdd-template.md` ✅/❌
   - `docs/iso29110/test-plan-template.md` ✅/❌
   - `docs/iso29110/vdd-template.md` ✅/❌
   - `docs/iso29110/releases/` — count VDDs ✅/❌

2. For each existing file, read its `lastUpdated` or `date` metadata — flag if > 60 days old

3. Feature-level coverage:
   - Run: `ls docs/product/` (skip `iso29110`)
   - For each feature folder: check `feature-spec.md`, `test-plan.md` — report ✅/⚠️/❌ per folder

4. Open items:
   - Read `docs/iso29110/risk-register.md` — count open High/Critical risks
   - Read `docs/iso29110/change-request-log.md` — count open CRs

5. Print a compact health dashboard:

```
=== ISO 29110 Artifact Health ===

Process Artifacts
  project-plan.md      ✅  Last updated: YYYY-MM-DD
  progress-log.md      ✅  Last entry: YYYY-MM-DD
  risk-register.md     ✅  2 open High risks
  change-request-log   ⚠️  1 open CR
  user-guide.md        ✅  Last updated: YYYY-MM-DD

Feature Coverage (docs/product/)
  auth/       feature-spec.md ✅  test-plan.md ✅
  quiz/       feature-spec.md ✅  test-plan.md ⚠️ MISSING
  result/     feature-spec.md ✅  test-plan.md ✅
  backoffice/ feature-spec.md ❌ MISSING  test-plan.md ❌ MISSING

VDDs (docs/iso29110/releases/)
  v0.5.0.md  ✅

Action items: [list anything requiring attention]
```

---

## Command: vdd `vX.Y.Z`

Generate or fill out a Version Description Document for the specified release version.

Steps:
1. Verify the version arg is provided (format: `vX.Y.Z`) — abort with instructions if missing
2. Determine the previous production tag:
   ```bash
   git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -2 | tail -1
   ```
3. Get commits since the previous tag:
   ```bash
   git log <prev-tag>..HEAD --oneline 2>/dev/null || git log --oneline -30
   ```
4. Get changed files since the previous tag:
   ```bash
   git diff <prev-tag>..HEAD --stat 2>/dev/null || git diff --stat HEAD~10..HEAD
   ```
5. Map changed `apps/backend/services/<name>/` dirs to service names; map `apps/web-app/` and `apps/web-official/` to frontend
6. For each changed feature, read `docs/product/<feature>/feature-spec.md` for the feature title — use the commit subject if no spec exists
7. Run tests to get current results:
   ```bash
   make test-api 2>&1 | tail -20
   make test-web 2>&1 | tail -10
   ```
8. Read `docs/iso29110/change-request-log.md` for open CRs — list them in the VDD
9. Read `docs/iso29110/vdd-template.md` — copy and fill in:
   - Version, release date (today), changed components from git diff stat
   - New features from feature-spec titles (or commit subjects)
   - Test results from make test output
   - Open CRs from change-request-log
10. Save to `docs/iso29110/releases/${version}.md`
11. Tell the user which sections need manual completion:
    - Known Issues, Breaking Changes, Config Changes, Deployment Steps

---

## Command: progress

Add a sprint or milestone entry to the progress log (PM.O2).

Steps:
1. Read `docs/iso29110/progress-log.md` — note the last entry date and format
2. Read recent commits: `git log --oneline -20`
3. Read current branch: `git branch --show-current`
4. Summarize completed work from the commit history:
   - Group by scope (quiz, scoring, admin, profile, result, dbd, audit, notification, web)
   - List key changes, any blockers resolved
5. Prompt: "What is the current milestone or sprint name?" (ask the user if not in args)
6. Draft a new progress log entry following the existing format:
   - Date: today
   - Milestone: from user or inferred from git tags
   - Completed: from commits summary
   - In progress: infer from uncommitted or recent branch work
   - Next: list open features without completed status
7. Prepend the new entry to `docs/iso29110/progress-log.md` (newest first)
8. Show the user the entry for review before writing

---

## Command: risk

Review the risk register for open High-priority items.

Steps:
1. Read `docs/iso29110/risk-register.md`
2. Filter rows where Score ≥ 8 (High or Critical) AND Status = Open
3. For each high-priority open risk:
   - Show the risk title, description, owner, score, and current mitigation
   - Report how long it has been open (from the created/last-reviewed date)
   - Ask: has the mitigation been implemented? Should it be closed or the score updated?
4. Check the Review History section — if the last review was > 30 days ago, flag it
5. Check ALL open risks (any score) — list them with their scores and owners
6. Offer to:
   - Update the last-reviewed date in the Review History
   - Close a risk (change status to Closed with a resolution note)
   - Downgrade a score (with reason)

---

## Command: srs `<feature>`

Create `docs/product/<feature>/feature-spec.md` from the SRS template (ISO 29110 SI.2).

Steps:
1. Verify the feature arg is provided — abort with usage if missing
2. Check if `docs/product/<feature>/feature-spec.md` already exists:
   - If it exists: report "Already exists — open it to edit rather than overwriting" and stop
3. Run: `ls docs/product/` — note existing feature folders for context
4. Read `docs/iso29110/srs-template.md`
5. Create `docs/product/<feature>/` directory if it does not exist
6. Write the template content to `docs/product/<feature>/feature-spec.md`:
   - Replace `[Feature Name]` with the feature arg (capitalized)
   - Set today's date in the Document Information table
   - Leave all other placeholders intact for the user to fill in
7. Read `docs/iso29110/change-request-log.md` — remind the user to add a CR entry if this feature modifies approved scope
8. Report: "SRS created at docs/product/<feature>/feature-spec.md — fill in requirements before writing code. Next: create the test plan with `/iso29110 test-plan <feature>`"

---

## Command: test-plan `<feature>`

Create `docs/product/<feature>/test-plan.md` from the test plan template (ISO 29110 SI.O4-O5).

Steps:
1. Verify the feature arg is provided — abort with usage if missing
2. Check if `docs/product/<feature>/feature-spec.md` exists:
   - If it does NOT exist: warn "SRS not found — run `/iso29110 srs <feature>` first (SI.2 requires requirements before test planning)"
   - Continue anyway (don't block — the user may be retrofitting tests)
3. Check if `docs/product/<feature>/test-plan.md` already exists:
   - If it exists: report "Already exists — open it to edit" and stop
4. Read `docs/iso29110/test-plan-template.md`
5. Write template content to `docs/product/<feature>/test-plan.md`:
   - Replace `[Feature Name]` with the feature arg (capitalized)
   - Set today's date in the Document Information table
   - Set SRS Reference to `docs/product/<feature>/feature-spec.md`
   - Pre-fill the test environment rows for backend (`go test -race -cover ./services/<feature>/...`) and frontend (`npm test`)
   - Leave test case rows intact for the user to fill in
6. Report: "Test plan created at docs/product/<feature>/test-plan.md — fill in test cases TDD-first with @qa-dev before writing implementation code."

---

## Artifact Map (quick reference)

| ISO Output | Artifact | Path | Updated |
|---|---|---|---|
| PM.O1 | Project Plan | `docs/iso29110/project-plan.md` | Per release |
| PM.O2 | Progress Log | `docs/iso29110/progress-log.md` | Per sprint/milestone |
| PM.O3 | Project Closure | `docs/iso29110/progress-log.md` (Closure section) | At end |
| — | Risk Register | `docs/iso29110/risk-register.md` | As needed (≤ 30 days) |
| — | Change Request Log | `docs/iso29110/change-request-log.md` | Per scope change |
| SI.O1 | Feature SRS | `docs/product/<feature>/feature-spec.md` | Before construction |
| SI.O2 | Design Doc | `docs/architecture/<feature>-design.md` | Per non-trivial change |
| SI.O4-O5 | Test Plan | `docs/product/<feature>/test-plan.md` | During development |
| SI.O6 | User Guide | `docs/iso29110/user-guide.md` | Per release |
| SI.O7 | VDD | `docs/iso29110/releases/vX.Y.Z.md` | Per `v*.*.*` tag |

Test commands:
- Backend: `make test-api` (`go test -race -cover ./...` in `apps/backend`)
- Frontend: `make test-web` (`npx vitest run` in `apps/web-app`)
- Single service: `cd apps/backend && go test -v -race -cover ./services/<name>/...`

*Version: 1.0.0*
*Last updated: 11 June 2026*
