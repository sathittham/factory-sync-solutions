export const meta = {
  name: 'pre-release-audit',
  description: 'Audit changed apps before a release tag: Go (vet + race tests) and frontend (Biome + tsc + Vitest + security scan), then verify ISO 29110 compliance artifacts',
  phases: [
    { title: 'Discover',    detail: 'Find changed apps vs base branch' },
    { title: 'Audit',       detail: 'Lint + types + tests + security per app in parallel' },
    { title: 'ISO 29110',   detail: 'Verify PM + SI compliance artifacts: VDD, progress log, risk register, SRS coverage' },
  ],
}

// Usage: Workflow({ name: 'pre-release-audit', args: { base: 'main', version: 'v1.2.0' } })
// args.base:    branch to diff against (default: 'main')
// args.version: upcoming release version — used to check that a VDD exists at
//               docs/iso29110/releases/<version>.md (optional; omit to skip VDD check)

const base    = args?.base    || 'main'
const version = args?.version || null

// App registry. kind drives which checks run (go vs frontend vs astro).
const APP_CONFIG = {
  'backend':      { dir: 'apps/backend',      kind: 'go' },
  'web-app':      { dir: 'apps/web-app',      kind: 'frontend' },
  'web-official': { dir: 'apps/web-official', kind: 'astro' },
}
const ALL_APPS = Object.keys(APP_CONFIG)

const APPS_SCHEMA = {
  type: 'object',
  properties: {
    changedApps:     { type: 'array', items: { type: 'string' } },
    sharedChanged:   { type: 'boolean' },
    reason:          { type: 'string' },
  },
  required: ['changedApps', 'sharedChanged', 'reason'],
}

const AUDIT_SCHEMA = {
  type: 'object',
  properties: {
    app:            { type: 'string' },
    lintPassed:     { type: 'boolean' },
    lintErrors:     { type: 'array', items: { type: 'string' } },
    typesPassed:    { type: 'boolean' },
    typesErrors:    { type: 'array', items: { type: 'string' } },
    testsPassed:    { type: 'boolean' },
    testSummary:    { type: 'string' },
    securityPassed: { type: 'boolean' },
    securityNotes:  { type: 'array', items: { type: 'string' } },
    passed:         { type: 'boolean' },
    summary:        { type: 'string' },
  },
  required: ['app', 'lintPassed', 'typesPassed', 'testsPassed', 'securityPassed', 'passed', 'summary'],
}

const ISO29110_SCHEMA = {
  type: 'object',
  properties: {
    projectPlanFound:        { type: 'boolean' },
    riskRegisterFound:       { type: 'boolean' },
    progressLogCurrent:      { type: 'boolean' },
    changeRequestLogFound:   { type: 'boolean' },
    vddFound:                { type: 'boolean' },
    vddPath:                 { type: 'string' },
    missingSrsFeatures:      { type: 'array', items: { type: 'string' } },
    missingTestPlanFeatures: { type: 'array', items: { type: 'string' } },
    findings:                { type: 'array', items: { type: 'string' } },
    passed:                  { type: 'boolean' },
    summary:                 { type: 'string' },
  },
  required: ['projectPlanFound', 'riskRegisterFound', 'progressLogCurrent', 'vddFound', 'passed', 'summary'],
}

// ─── Phase 1: Discover ────────────────────────────────────────────────────────
phase('Discover')

log(`Budget: ${budget.total ? Math.round(budget.remaining() / 1000) + 'k tokens remaining' : 'unbounded — pass +200k to cap spending'}`)
log(`Release: ${version || '(no version specified — VDD check skipped)'}  Base: ${base}`)

const discovered = await agent(
  `Determine which apps changed vs ${base} and whether shared code (packages/, firestore.rules, firestore.indexes.json) changed.

Run these commands:
1. git diff --name-only origin/${base}...HEAD 2>/dev/null || git diff --name-only ${base}...HEAD
   → full list of changed files

2. From that list, map each "apps/<name>/..." path to its app directory name.
   Known apps: ${ALL_APPS.join(', ')}

3. Check whether any changed file is under packages/, or is firestore.rules / firestore.indexes.json.
   → if so, set sharedChanged=true

Rules:
- changedApps = apps from step 2 that exist in the known list
- If sharedChanged=true → changedApps must include ALL apps: ${ALL_APPS.join(', ')}
- If nothing changed in apps/ or shared code → changedApps = []
- reason = one sentence explaining why these apps are in scope`,
  { label: 'discover', phase: 'Discover', agentType: 'Explore', schema: APPS_SCHEMA }
)

if (!discovered?.changedApps?.length) {
  log('No changed apps found vs ' + base + ' — nothing to audit')
  return { apps: [], passed: true, base }
}

if (discovered.sharedChanged) {
  log('Shared code changed — auditing ALL apps: ' + discovered.changedApps.join(', '))
} else {
  log('Auditing ' + discovered.changedApps.length + ' changed app(s): ' + discovered.changedApps.join(', '))
}

// ─── Phase 2: Audit — one agent per app, all in parallel ─────────────────────
phase('Audit')

function goPrompt(app, dir) {
  return String.raw`Audit the Go backend ${app} for release readiness. Run all checks from the repo root.

1. VET (lint)
   Run: cd ${dir} && go vet ./... 2>&1 | head -60
   lintPassed = true only if exit code 0 (no output / no vet errors).
   lintErrors = up to 10 lines from output.

2. BUILD (types/compile — Go has no separate typecheck)
   Run: cd ${dir} && go build ./... 2>&1 | head -40
   typesPassed = true only if exit code 0.
   typesErrors = up to 10 compile error lines.

3. UNIT TESTS (race + coverage)
   Run: cd ${dir} && go test -race -cover ./... 2>&1 | tail -40
   testsPassed = true only if exit code 0 and no "FAIL" lines.
   testSummary = the ok/FAIL summary lines (and total coverage if shown).

4. SECURITY SCAN (project conventions — see .claude/rules/go.md)
   a. grep -rn "GetUID\|r.Body\|uid.*:=.*body\|userID.*:=.*req\." ${dir}/services --include="*.go" | grep -i "body\|request\.\|payload" | head
      → UID must come from middleware.GetUID(r), NEVER from request body. Flag any UID/userID read from the request body.
   b. grep -rn "json.NewEncoder\|w.Write(\|http.Error(" ${dir}/services --include="*.go" | head
      → handlers must use pkg.RespondJSON / pkg.RespondList / pkg.RespondError, not raw JSON encoding. Flag raw writes in handlers.
   c. grep -rniE "api[_-]?key|secret|password|firebase-sa|BEGIN PRIVATE KEY" ${dir} --include="*.go" | grep -v "_test.go\|os.Getenv\|// " | head
      → no hardcoded secrets/credentials.
   securityPassed = true if (a) and (c) return NO real matches. (b) is a strong warning — note any raw writes.
   securityNotes = files/lines found.

Set passed=true only if lintPassed AND typesPassed AND testsPassed AND securityPassed.
summary = one line: what failed, or "all checks passed".
Always set app: "${app}".`
}

function frontendPrompt(app, dir, isAstro) {
  return String.raw`Audit the frontend app ${app} for release readiness. Run all checks from the repo root.

1. LINT (Biome)
   Run: cd ${dir} && npx biome check . 2>&1 | tail -40
   lintPassed = true only if exit code 0 (no errors).
   lintErrors = up to 10 error lines.

2. TYPES
   Run: ${isAstro
      ? `cd ${dir} && npx astro check 2>&1 | tail -40`
      : `cd ${dir} && npx tsc -b --noEmit 2>&1 | head -60`}
   typesPassed = true only if exit code 0 and no "error TS" / type-error lines.
   typesErrors = up to 10 error lines.

3. UNIT TESTS (Vitest)
   Run: cd ${dir} && npx vitest run 2>&1 | tail -30
   testsPassed = true only if exit code 0 and output contains "passed" (not "failed").
   testSummary = last line showing pass/fail count.

4. SECURITY SCAN (see .claude/rules/react.md + project memory)
   a. grep -rn "localStorage.setItem.*[Tt]oken\|localStorage.setItem.*[Aa]ccess\|localStorage.setItem.*[Rr]efresh" ${dir}/src --include="*.ts" --include="*.tsx" | head
      → auth tokens MUST NOT be in localStorage.
   b. grep -rn "https://[a-z0-9.-]*run.app\|https://.*\.a\.run\.app\|http://localhost:8080" ${dir}/src --include="*.ts" --include="*.tsx" | grep -v "\.test\.\|\.spec\." | head
      → API base URLs must NOT be hardcoded (use import.meta.env / VITE_ env vars).
   c. grep -rniE "firebase.*apiKey.*['"]AIza|BEGIN PRIVATE KEY" ${dir}/src --include="*.ts" --include="*.tsx" | head
      → no hardcoded private keys (public Firebase web config keys are OK).
   securityPassed = true if (a) and (b) return NO matches.
   securityNotes = files/issues found.

Set passed=true only if lintPassed AND typesPassed AND testsPassed AND securityPassed.
summary = one line: what failed, or "all checks passed".
Always set app: "${app}".`
}

const results = await parallel(
  discovered.changedApps.map(app => () => {
    const cfg = APP_CONFIG[app]
    const isGo = cfg.kind === 'go'
    const prompt = isGo
      ? goPrompt(app, cfg.dir)
      : frontendPrompt(app, cfg.dir, cfg.kind === 'astro')
    return agent(prompt, {
      label: app,
      phase: 'Audit',
      agentType: isGo ? 'backend-dev' : 'frontend-dev',
      schema: AUDIT_SCHEMA,
    })
  })
)

const valid  = results.filter(Boolean)
const failed = valid.filter(r => !r.passed)
const passed = valid.filter(r => r.passed)

log('Code audit results: ' + passed.length + ' passed, ' + failed.length + ' failed')

for (const r of failed) {
  const flags = [
    r.lintPassed     ? null : 'lint',
    r.typesPassed    ? null : 'types',
    r.testsPassed    ? null : 'tests',
    r.securityPassed ? null : 'security',
  ].filter(Boolean).join(', ')
  log('  FAIL ' + r.app + ' [' + flags + ']: ' + r.summary)
}
for (const r of passed) {
  log('  OK   ' + r.app + ': ' + r.summary)
}

// ─── Phase 3: ISO 29110 Compliance Artifacts ─────────────────────────────────
phase('ISO 29110')

const vddPath = version ? `docs/iso29110/releases/${version}.md` : null

const iso = await agent(
  `Check ISO 29110 Basic Profile compliance artifacts before this release.
This is the document-side gate — it verifies that process records are in place.

Run ALL of these checks:

1. PROJECT PLAN (PM.O1)
   test -f docs/iso29110/project-plan.md && echo "EXISTS" || echo "MISSING"
   → projectPlanFound

2. RISK REGISTER (PM.O1 component)
   test -f docs/iso29110/risk-register.md && echo "EXISTS" || echo "MISSING"
   → riskRegisterFound

3. CHANGE REQUEST LOG (PM.O1 component)
   test -f docs/iso29110/change-request-log.md && echo "EXISTS" || echo "MISSING"
   → changeRequestLogFound

4. PROGRESS LOG CURRENCY (PM.O2)
   Run:
     git log --oneline -1 -- docs/iso29110/progress-log.md
     LAST_PROD=$(git tag --sort=-creatordate 2>/dev/null | grep -E '^v[0-9]+\\.[0-9]+\\.[0-9]+$' | head -1)
     echo "Last prod tag: $LAST_PROD"
     if [ -n "$LAST_PROD" ]; then
       git log --oneline "${LAST_PROD}..HEAD" -- docs/iso29110/progress-log.md 2>/dev/null
     fi
   progressLogCurrent = true if:
     - progress-log.md was committed MORE RECENTLY than the last production tag, OR
     - no production tag exists yet (first release)
   If the log has no commits since the last prod tag → progressLogCurrent = false

5. VERSION DESCRIPTION DOCUMENT (SI.O7)
   ${vddPath
     ? `test -f "${vddPath}" && echo "EXISTS" || echo "MISSING"
   → vddFound = true if file exists. vddPath = "${vddPath}"`
     : `No version specified — vddFound = true (skip). vddPath = "(not checked)"`
   }

6. PER-FEATURE SRS COVERAGE (SI.O1)
   List all feature folders: ls docs/product/ 2>/dev/null
   For each folder, check: test -f docs/product/<folder>/feature-spec.md
   missingSrsFeatures = list of folders that are MISSING feature-spec.md
   (skip only: iso29110 — this is a process folder, not a feature folder)

7. PER-FEATURE TEST PLAN COVERAGE (SI.O4-O5)
   For each folder under docs/product/ (same list as step 6, same exclusion):
     test -f docs/product/<folder>/test-plan.md
   missingTestPlanFeatures = list of folders that are MISSING test-plan.md

findings = plain-English list of every gap found (missing files, stale log, missing SRS, missing test plans).
passed = true only if projectPlanFound AND riskRegisterFound AND progressLogCurrent AND vddFound AND missingSrsFeatures is empty AND missingTestPlanFeatures is empty.
summary = one line.`,
  { label: 'iso29110', phase: 'ISO 29110', schema: ISO29110_SCHEMA }
)

if (iso) {
  if (iso.passed) {
    log('ISO 29110: all compliance artifacts present and current')
  } else {
    log('ISO 29110 WARNINGS — compliance gaps found:')
    for (const f of (iso.findings || [])) log('  ⚠ ' + f)
    if ((iso.missingSrsFeatures || []).length) {
      log('  ⚠ Missing SRS (feature-spec.md) for: ' + iso.missingSrsFeatures.join(', '))
    }
    if ((iso.missingTestPlanFeatures || []).length) {
      log('  ⚠ Missing test plan (test-plan.md) for: ' + iso.missingTestPlanFeatures.join(', '))
      log('    Fix: copy docs/iso29110/test-plan-template.md → docs/product/<feature>/test-plan.md and use @qa-dev to fill it in.')
    }
    log('  These are documentation gaps, not code failures. Resolve before tagging production.')
  }
}

return {
  base,
  version: version || null,
  total:          valid.length,
  passedCount:    passed.length,
  failedCount:    failed.length,
  allCodePassed:  failed.length === 0,
  iso29110:       iso,
  iso29110Passed:          iso?.passed === true,
  missingSrsFeatures:      iso?.missingSrsFeatures || [],
  missingTestPlanFeatures: iso?.missingTestPlanFeatures || [],
  allPassed:               failed.length === 0 && iso?.passed === true,
  results:        valid,
}
