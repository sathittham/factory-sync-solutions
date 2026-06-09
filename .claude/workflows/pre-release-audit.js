export const meta = {
  name: 'pre-release-audit',
  description: 'Audit changed apps before a release tag: Go (vet + race tests) and frontend (Biome + tsc + Vitest + security scan)',
  phases: [
    { title: 'Discover', detail: 'Find changed apps vs base branch' },
    { title: 'Audit', detail: 'Lint + types + tests + security per app in parallel' },
  ],
}

// Usage: Workflow({ name: 'pre-release-audit', args: { base: 'main' } })
// args.base: branch to diff against (default: 'main')

const base = args?.base || 'main'

// App registry. kind drives which checks run (go vs frontend vs astro).
const APP_CONFIG = {
  'fs-backend':      { dir: 'apps/fs-backend',      kind: 'go' },
  'fs-app-web':      { dir: 'apps/fs-app-web',      kind: 'frontend' },
  'fs-official-web': { dir: 'apps/fs-official-web', kind: 'astro' },
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

// ─── Phase 1: Discover ────────────────────────────────────────────────────────
phase('Discover')

log(`Budget: ${budget.total ? Math.round(budget.remaining() / 1000) + 'k tokens remaining' : 'unbounded — pass +200k to cap spending'}`)

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

if (!discovered || !discovered.changedApps.length) {
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
  return `Audit the Go backend ${app} for release readiness. Run all checks from the repo root.

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
   a. grep -rn "GetUID\\|r.Body\\|uid.*:=.*body\\|userID.*:=.*req\\." ${dir}/services --include="*.go" | grep -i "body\\|request\\.\\|payload" | head
      → UID must come from middleware.GetUID(r), NEVER from request body. Flag any UID/userID read from the request body.
   b. grep -rn "json.NewEncoder\\|w.Write(\\|http.Error(" ${dir}/services --include="*.go" | head
      → handlers must use pkg.RespondJSON / pkg.RespondList / pkg.RespondError, not raw JSON encoding. Flag raw writes in handlers.
   c. grep -rniE "api[_-]?key|secret|password|firebase-sa|BEGIN PRIVATE KEY" ${dir} --include="*.go" | grep -v "_test.go\\|os.Getenv\\|// " | head
      → no hardcoded secrets/credentials.
   securityPassed = true if (a) and (c) return NO real matches. (b) is a strong warning — note any raw writes.
   securityNotes = files/lines found.

Set passed=true only if lintPassed AND typesPassed AND testsPassed AND securityPassed.
summary = one line: what failed, or "all checks passed".
Always set app: "${app}".`
}

function frontendPrompt(app, dir, isAstro) {
  return `Audit the frontend app ${app} for release readiness. Run all checks from the repo root.

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
   a. grep -rn "localStorage.setItem.*[Tt]oken\\|localStorage.setItem.*[Aa]ccess\\|localStorage.setItem.*[Rr]efresh" ${dir}/src --include="*.ts" --include="*.tsx" | head
      → auth tokens MUST NOT be in localStorage.
   b. grep -rn "https://[a-z0-9.-]*run.app\\|https://.*\\.a\\.run\\.app\\|http://localhost:8080" ${dir}/src --include="*.ts" --include="*.tsx" | grep -v "\\.test\\.\\|\\.spec\\." | head
      → API base URLs must NOT be hardcoded (use import.meta.env / VITE_ env vars).
   c. grep -rniE "firebase.*apiKey.*['\\\"]AIza|BEGIN PRIVATE KEY" ${dir}/src --include="*.ts" --include="*.tsx" | head
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

log('Results: ' + passed.length + ' passed, ' + failed.length + ' failed')

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

return {
  base,
  total:       valid.length,
  passedCount: passed.length,
  failedCount: failed.length,
  allPassed:   failed.length === 0,
  results:     valid,
}
