export const meta = {
  name: 'feature-dev',
  description: 'Implement a full-stack feature: gate on SRS, build the Go backend service (handler→service→models→tests), then the React frontend (types→api→store→components→i18n→routes), then review and verify',
  phases: [
    { title: 'Explore',         detail: 'Map existing patterns and the contract this feature must follow' },
    { title: 'ISO 29110 Gate',  detail: 'SI.2 — verify SRS exists before construction begins' },
    { title: 'Backend',         detail: 'Build the Go service: models → service → handler → tests' },
    { title: 'Frontend',        detail: 'Build React: types → api → store → components → i18n → routes' },
    { title: 'Verify',          detail: 'Run go test / vet and tsc / biome / vitest; fix what breaks' },
    { title: 'Review',          detail: '5-point checklist review of the new code' },
  ],
}

// Usage: Workflow({ name: 'feature-dev', args: {
//   ticket: 'FHC-123',
//   description: 'Quiz history list page with per-assessment detail',
//   service: 'result',          // backend service dir under apps/backend/services/
//   feature: 'result',          // docs/product/<feature>/ folder (defaults to service name)
//   scope: 'full',              // 'backend' | 'frontend' | 'full'  (default: 'full')
//   skipSrsCheck: false,        // set true to bypass the ISO 29110 SRS gate
// }})

const ticket       = args?.ticket || 'NO-TICKET'
const description  = args?.description || ''
const service      = args?.service || 'feature'
const feature      = args?.feature || service
const scope        = args?.scope || 'full'
const skipSrsCheck = args?.skipSrsCheck === true

if (!description) {
  log('args.description is required — what should this feature do?')
  return { error: 'missing description' }
}

const doBackend  = scope === 'full' || scope === 'backend'
const doFrontend = scope === 'full' || scope === 'frontend'

const SRS_GATE_SCHEMA = {
  type: 'object',
  properties: {
    srsFound:         { type: 'boolean' },
    srsPath:          { type: 'string' },
    testPlanFound:    { type: 'boolean' },
    testPlanPath:     { type: 'string' },
    availableFolders: { type: 'array', items: { type: 'string' } },
  },
  required: ['srsFound', 'srsPath', 'testPlanFound', 'testPlanPath'],
}

const EXPLORE_SCHEMA = {
  type: 'object',
  properties: {
    backendPattern:  { type: 'string' },
    frontendPattern: { type: 'string' },
    apiContract:     { type: 'string' },
    referenceFiles:  { type: 'array', items: { type: 'string' } },
    risks:           { type: 'array', items: { type: 'string' } },
  },
  required: ['backendPattern', 'frontendPattern', 'referenceFiles'],
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    filesCreated:  { type: 'array', items: { type: 'string' } },
    filesModified: { type: 'array', items: { type: 'string' } },
    endpoints:     { type: 'array', items: { type: 'string' } },
    notes:         { type: 'string' },
    blocked:       { type: 'boolean' },
    blockReason:   { type: 'string' },
  },
  required: ['filesCreated', 'filesModified', 'notes'],
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    goVetPassed:   { type: 'boolean' },
    goTestPassed:  { type: 'boolean' },
    tscPassed:     { type: 'boolean' },
    biomePassed:   { type: 'boolean' },
    vitestPassed:  { type: 'boolean' },
    fixesApplied:  { type: 'array', items: { type: 'string' } },
    remaining:     { type: 'array', items: { type: 'string' } },
    allGreen:      { type: 'boolean' },
    summary:       { type: 'string' },
  },
  required: ['allGreen', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    verdict:  { type: 'string', enum: ['ship', 'fix-first'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          dimension: { type: 'string' },
          severity:  { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          file:      { type: 'string' },
          issue:     { type: 'string' },
          fix:       { type: 'string' },
        },
        required: ['dimension', 'severity', 'issue', 'fix'],
      },
    },
  },
  required: ['verdict', 'findings'],
}

// ─── Phase 1: Explore ──────────────────────────────────────────────────────────
phase('Explore')

log(`Budget: ${budget.total ? Math.round(budget.remaining() / 1000) + 'k tokens remaining' : 'unbounded — pass +300k to cap spending'}`)
log(`[${ticket}] ${description} (scope: ${scope}, service: ${service}, feature: ${feature})`)

const explore = await agent(
  `We are about to build a feature for Factory Health Check.

TICKET: ${ticket}
DESCRIPTION: ${description}
BACKEND SERVICE: apps/backend/services/${service}/

Study the existing conventions so the new code matches exactly. Read at least 2 existing backend services (e.g. apps/backend/services/quiz, result, profile) and the frontend structure (apps/web-app/src/{pages,components,store,hooks,lib}).

Report:
- backendPattern: how a service is structured here (handler.go + service.go + models.go + service_test.go; how routes register; how pkg.Respond* + middleware.GetUID + sentinel errors + fmt.Errorf wrapping are used).
- frontendPattern: how a page+slice+api call is wired (Redux slice in src/store, api in src/lib/api.ts, useLocale() for text, shadcn/ui components, formatDateTime).
- apiContract: the endpoint(s) this feature implies — method, path, request, response shape. Infer from the description + existing patterns.
- referenceFiles: the 4-8 most useful files to copy patterns from.
- risks: anything ambiguous or risky (auth, scoring spec, Firestore indexes).`,
  { label: 'explore', phase: 'Explore', agentType: 'feature-dev:code-explorer', schema: EXPLORE_SCHEMA }
)

const refBlock = explore
  ? `\n\nESTABLISHED PATTERNS:\nBackend: ${explore.backendPattern}\nFrontend: ${explore.frontendPattern}\nAPI contract: ${explore.apiContract || '(infer)'}\nReference files: ${(explore.referenceFiles || []).join(', ')}\nRisks: ${(explore.risks || []).join('; ') || 'none noted'}`
  : ''

// ─── Phase 2: ISO 29110 Gate (SI.2 — SRS must precede construction) ───────────
phase('ISO 29110 Gate')

const srsPath = `docs/product/${feature}/feature-spec.md`
let srsFound = false

if (skipSrsCheck) {
  log(`ISO 29110 Gate: skipped (skipSrsCheck=true)`)
  srsFound = true
} else {
  const testPlanPath = `docs/product/${feature}/test-plan.md`

  const srsCheck = await agent(
    `ISO 29110 gate — check whether the SRS and test plan exist before construction begins.

Run these commands:
1. test -f "${srsPath}" && echo "SRS_EXISTS" || echo "SRS_MISSING"
2. test -f "${testPlanPath}" && echo "TESTPLAN_EXISTS" || echo "TESTPLAN_MISSING"
3. ls docs/product/ 2>/dev/null

Return:
- srsFound: true if "${srsPath}" exists, false if missing
- srsPath: "${srsPath}"
- testPlanFound: true if "${testPlanPath}" exists, false if missing
- testPlanPath: "${testPlanPath}"
- availableFolders: array of folder names listed under docs/product/`,
    { label: 'iso29110-gate', phase: 'ISO 29110 Gate', schema: SRS_GATE_SCHEMA }
  )

  srsFound = srsCheck?.srsFound === true

  if (srsFound) {
    log(`ISO 29110 SI.2: SRS found — ${srsPath}`)
  } else {
    log(`ISO 29110 WARNING: SRS not found at ${srsPath}`)
    log(`  ISO 29110 SI.2 requires requirements before construction.`)
    log(`  Fix: copy docs/iso29110/srs-template.md → ${srsPath} and fill it in.`)
    log(`  Available folders: ${(srsCheck?.availableFolders || []).join(', ') || '(none)'}`)
    log(`  Continuing — pass args.skipSrsCheck=true to silence this warning.`)
  }

  if (srsCheck?.testPlanFound) {
    log(`ISO 29110 SI.O4-O5: test-plan.md found — ${testPlanPath}`)
  } else {
    log(`ISO 29110 WARNING (SI.O4-O5): test-plan.md not found at ${testPlanPath}`)
    log(`  Fix: copy docs/iso29110/test-plan-template.md → ${testPlanPath} and use @qa-dev to fill it in.`)
  }
}

// ─── Phase 3: Backend ──────────────────────────────────────────────────────────
let backend = null
if (doBackend) {
  phase('Backend')
  backend = await agent(
    `Implement the BACKEND for this feature. Follow .claude/rules/go.md exactly.

TICKET: ${ticket}
DESCRIPTION: ${description}
SERVICE DIR: apps/backend/services/${service}/
${refBlock}

Build in this order, matching the reference services:
1. models.go — request/response/domain structs. IDs in camelCase (userID, quizID, assessmentID); booleans IsActive/HasCompleted.
2. service.go — business logic. Wrap every error: fmt.Errorf("context: %w", err). Use domain-specific sentinel errors per service (ErrProfileNotFound, ErrAlreadyRegistered, ErrResultNotFound, …) — not generic ErrNotFound. NEVER read UID from input — it comes from the handler via middleware.GetUID.
3. handler.go — Chi handlers. Get UID from middleware.GetUID(r). Respond ONLY with pkg.RespondJSON / pkg.RespondList / pkg.RespondError. Add/After-update swagger annotations. Register routes where existing services register theirs.
4. service_test.go — table-driven tests for the service logic, including edge cases.

Run \`make build-api\` before finishing. If it fails to compile, fix it.
Set blocked=true with blockReason ONLY if a decision genuinely cannot be made from the patterns.`,
    { label: 'backend', phase: 'Backend', agentType: 'backend-dev', schema: BUILD_SCHEMA }
  )
  if (backend?.blocked) {
    log(`Backend BLOCKED: ${backend.blockReason}`)
    return { ticket, blocked: true, where: 'backend', reason: backend.blockReason, explore, srsFound }
  }
  log(`Backend: +${backend?.filesCreated?.length || 0} / ~${backend?.filesModified?.length || 0} files. Endpoints: ${(backend?.endpoints || []).join(', ') || 'n/a'}`)
}

// ─── Phase 4: Frontend ─────────────────────────────────────────────────────────
let frontend = null
if (doFrontend) {
  phase('Frontend')
  const contract = backend?.endpoints?.length
    ? `Backend endpoints just built: ${backend.endpoints.join(', ')}. Notes: ${backend.notes}`
    : `API contract: ${explore?.apiContract || 'infer from the description'}`
  frontend = await agent(
    `Implement the FRONTEND for this feature in apps/web-app. Follow .claude/rules/react.md and project memory exactly.

TICKET: ${ticket}
DESCRIPTION: ${description}
${contract}
${refBlock}

Build in this order, matching existing pages/slices:
1. Types — TypeScript interfaces for the API request/response (mirror the Go structs; keep camelCase).
2. API — add the call(s) to src/lib/api.ts using the shared client (never raw fetch that bypasses auth).
3. Store — a <feature>Slice in src/store/ with Redux Toolkit (loading/error/data states).
4. Components/Pages — in src/components and src/pages. Use shadcn/ui ONLY (no native <select>/<dialog>/window.confirm). 17px base, text-sm minimum. No nested ternaries (SonarQube S3358).
5. i18n — add TH + EN keys to src/lib/i18n.tsx and use useLocale() for ALL text. Dates via formatDateTime() from @/lib/dayjs (Buddhist Era for TH).
6. Routes — register the page in src/router.tsx.

Run \`cd apps/web-app && npx tsc -b --noEmit\` (or \`make build-web\`) before finishing and fix type errors.
Set blocked=true with blockReason only if truly stuck.`,
    { label: 'frontend', phase: 'Frontend', agentType: 'frontend-dev', schema: BUILD_SCHEMA }
  )
  if (frontend?.blocked) {
    log(`Frontend BLOCKED: ${frontend.blockReason}`)
    return { ticket, blocked: true, where: 'frontend', reason: frontend.blockReason, backend, explore, srsFound }
  }
  log(`Frontend: +${frontend?.filesCreated?.length || 0} / ~${frontend?.filesModified?.length || 0} files`)
}

const touched = [
  ...(backend?.filesCreated || []), ...(backend?.filesModified || []),
  ...(frontend?.filesCreated || []), ...(frontend?.filesModified || []),
]

// ─── Phase 5: Verify ───────────────────────────────────────────────────────────
phase('Verify')

const verify = await agent(
  `Verify the feature compiles and tests pass, then fix anything that breaks. Run only the checks relevant to what changed (scope: ${scope}).

${doBackend ? `BACKEND (from repo root):
  make lint-api 2>&1 | head -40        → goVetPassed   (go vet ./... in apps/backend)
  make test-api 2>&1 | tail -40        → goTestPassed  (go test -race -cover ./... in apps/backend)
` : ''}${doFrontend ? `FRONTEND (from repo root):
  cd apps/web-app && npx tsc -b --noEmit 2>&1 | head -50   → tscPassed
  make lint-web 2>&1 | tail -40        → biomePassed (run \`make lint-fix\` to auto-fix, then re-check)
  make test-web 2>&1 | tail -30        → vitestPassed
` : ''}
Fix failures you can clearly resolve (type errors, lint, import paths, obvious test breaks). Re-run after fixing.
fixesApplied = what you changed. remaining = anything still red and why.
allGreen = true only if every check you ran passed. summary = one line.`,
  { label: 'verify', phase: 'Verify', agentType: doBackend ? 'backend-dev' : 'frontend-dev', schema: VERIFY_SCHEMA }
)

log(`Verify: ${verify?.allGreen ? 'all green' : 'issues remain'} — ${verify?.summary || ''}`)

// ─── Phase 6: Review ───────────────────────────────────────────────────────────
phase('Review')

const review = await agent(
  `Review ONLY the code added/changed for this feature against the 5-point checklist in .claude/rules/dev-process.md, in priority order:
1. Security  2. Best Practice  3. Performance  4. Correctness  5. Maintainability

FILES TOUCHED:
${touched.map(f => '- ' + f).join('\n') || '(infer from git diff)'}

Run \`git diff --stat\` and \`git diff\` to see the actual changes. Report concrete findings (file + severity + fix). verdict='ship' if no critical/high issues, else 'fix-first'.`,
  { label: 'review', phase: 'Review', agentType: 'feature-dev:code-reviewer', schema: REVIEW_SCHEMA }
)

const blocking = (review?.findings || []).filter(f => f.severity === 'critical' || f.severity === 'high')
log(`Review verdict: ${review?.verdict || 'unknown'} (${blocking.length} blocking finding(s))`)
for (const f of blocking) log(`  [${f.severity}] ${f.dimension} — ${f.file || '?'}: ${f.issue}`)

if (!srsFound) {
  log(`ISO 29110 REMINDER (SI.2): SRS still missing at ${srsPath} — create it before closing this ticket.`)
}
log(`ISO 29110 REMINDER (SI.O4-O5): Ensure test-plan.md exists at docs/product/${feature}/test-plan.md — use @qa-dev to create it and fill in test cases.`)
log(`ISO 29110 REMINDER (SI.2): If this feature modifies approved scope, log it in docs/iso29110/change-request-log.md.`)

return {
  ticket,
  description,
  scope,
  srsFound,
  srsPath,
  filesTouched: touched,
  backend,
  frontend,
  verify,
  review,
  ready: verify?.allGreen === true && review?.verdict === 'ship',
}
