export const meta = {
  name: 'feature-review',
  description: 'Review a feature across the 5-point checklist (security, best-practice, performance, correctness, maintainability), adversarially verify findings, and write REVIEW.md',
  phases: [
    { title: 'Map',     detail: 'Locate the feature files across backend service + frontend' },
    { title: 'Review',  detail: 'One reviewer per checklist dimension, in parallel' },
    { title: 'Verify',  detail: 'Adversarially verify each finding before reporting' },
    { title: 'Report',  detail: 'Write REVIEW.md with a production-readiness verdict' },
  ],
}

// Usage: Workflow({ name: 'feature-review', args: {
//   feature: 'quiz',                 // human label for the feature
//   service: 'quiz',                 // backend dir under apps/fs-backend/services/ (optional)
//   paths: ['apps/fs-app-web/src/pages/QuizPage.tsx'],  // optional explicit hints
//   reviewDoc: 'docs/reviews/quiz-REVIEW.md',           // optional output path
// }})

const feature   = args?.feature || 'feature'
const service   = args?.service || feature
const hintPaths = Array.isArray(args?.paths) ? args.paths : []
const reviewDoc = args?.reviewDoc || `docs/reviews/${feature}-REVIEW.md`

const MAP_SCHEMA = {
  type: 'object',
  properties: {
    backendFiles:  { type: 'array', items: { type: 'string' } },
    frontendFiles: { type: 'array', items: { type: 'string' } },
    summary:       { type: 'string' },
  },
  required: ['backendFiles', 'frontendFiles', 'summary'],
}

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    dimension: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:    { type: 'string' },
          file:     { type: 'string' },
          line:     { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          detail:   { type: 'string' },
          fix:      { type: 'string' },
        },
        required: ['title', 'file', 'severity', 'detail', 'fix'],
      },
    },
  },
  required: ['dimension', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    isReal:     { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning:  { type: 'string' },
  },
  required: ['isReal', 'confidence', 'reasoning'],
}

// The 5-point checklist from .claude/rules/dev-process.md, in priority order.
const DIMENSIONS = [
  {
    key: 'security',
    agentType: 'backend-dev',
    prompt: `SECURITY review. Check for: exposed secrets/credentials; auth bypass or missing Firebase auth checks on protected endpoints; UID taken from request body instead of middleware.GetUID(r); user-controlled IDs used without ownership checks; Turnstile bypass; Firestore rules gaps; tokens in localStorage on the frontend; hardcoded API URLs. Cite file:line for each.`,
  },
  {
    key: 'best-practice',
    agentType: 'frontend-dev',
    prompt: `BEST-PRACTICE review against project conventions. Backend: must use pkg.RespondJSON / pkg.RespondList / pkg.RespondError (no raw JSON), wrap errors with fmt.Errorf("context: %w", err), use sentinel errors + errors.Is. Frontend: must use shadcn/ui (never native <select>/<dialog>/window.confirm), useLocale() for all text (no hardcoded strings), formatDateTime() from @/lib/dayjs (no raw toLocaleDateString). Cite file:line.`,
  },
  {
    key: 'performance',
    agentType: 'backend-dev',
    prompt: `PERFORMANCE review. Backend: N+1 Firestore queries, unbounded reads, missing composite indexes, queries in loops. Frontend: unnecessary re-renders, missing memoization, large lists without virtualization, fetching in render. Cite file:line.`,
  },
  {
    key: 'correctness',
    agentType: 'backend-dev',
    prompt: `CORRECTNESS review. Verify business logic matches the quiz/scoring spec (8-dimension Shindan rubric, 43 questions, config at apps/fs-backend/config/questions.json, scoring in apps/fs-backend/services/scoring/). Check edge cases: empty/partial answers, score boundaries, locale fallbacks, error paths. Cite file:line.`,
  },
  {
    key: 'maintainability',
    agentType: 'frontend-dev',
    prompt: `MAINTAINABILITY review. Flag: nested ternaries (SonarQube S3358), dead code, swallowed/unwrapped errors, missing tests, magic numbers, duplicated logic, components doing too much. Cite file:line.`,
  },
]

// ─── Phase 1: Map ──────────────────────────────────────────────────────────────
phase('Map')

log(`Budget: ${budget.total ? Math.round(budget.remaining() / 1000) + 'k tokens remaining' : 'unbounded — pass +200k to cap spending'}`)

const map = await agent(
  `Locate all files implementing the "${feature}" feature.

Search both halves of the stack:
- Backend: apps/fs-backend/services/${service}/ (handler.go, service.go, models.go, service_test.go) and any related pkg/ usage.
- Frontend: apps/fs-app-web/src/ — pages/, components/, store/ slices, hooks/, lib/ that reference "${feature}".
${hintPaths.length ? `Known hint paths: ${hintPaths.join(', ')}` : ''}

Use grep/glob to find them. Return:
- backendFiles: list of apps/fs-backend/... paths
- frontendFiles: list of apps/fs-app-web/... paths
- summary: one paragraph on how the feature is wired end-to-end (endpoint → service → Firestore, and page → slice → api).`,
  { label: 'map', phase: 'Map', agentType: 'Explore', schema: MAP_SCHEMA }
)

if (!map || (!map.backendFiles.length && !map.frontendFiles.length)) {
  log(`No files found for feature "${feature}" — check args.feature / args.service`)
  return { feature, found: false }
}

const fileList = [...map.backendFiles, ...map.frontendFiles]
log(`Mapped ${fileList.length} file(s): ${map.backendFiles.length} backend, ${map.frontendFiles.length} frontend`)

// ─── Phase 2 + 3: Review each dimension, verify findings as they land ──────────
const filesBlock = `\n\nFILES IN SCOPE:\n${fileList.map(f => '- ' + f).join('\n')}\n\nRead these files. Report ONLY real issues with concrete file:line citations. If a dimension is clean, return an empty findings array.`

const reviewed = await pipeline(
  DIMENSIONS,
  d => agent(d.prompt + filesBlock, {
    label: `review:${d.key}`, phase: 'Review', agentType: d.agentType, schema: FINDINGS_SCHEMA,
  }),
  (review, d) => parallel(
    (review?.findings || []).map(f => () =>
      agent(
        `Adversarially verify this ${d.key} finding. Read the cited code yourself and try to REFUTE it. Default to isReal=false if you cannot confirm it from the actual code.

FINDING: ${f.title}
FILE: ${f.file}${f.line ? ':' + f.line : ''}
CLAIM: ${f.detail}
PROPOSED FIX: ${f.fix}`,
        { label: `verify:${d.key}:${(f.file || '').split('/').pop()}`, phase: 'Verify', agentType: d.agentType, schema: VERDICT_SCHEMA }
      ).then(v => ({ ...f, dimension: d.key, verdict: v }))
    )
  )
)

const confirmed = reviewed
  .flat()
  .filter(Boolean)
  .filter(f => f.verdict?.isReal && f.verdict?.confidence !== 'low')

const sevRank = { critical: 0, high: 1, medium: 2, low: 3 }
confirmed.sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9))

const counts = confirmed.reduce((acc, f) => { acc[f.severity] = (acc[f.severity] || 0) + 1; return acc }, {})
log(`Confirmed ${confirmed.length} finding(s): ` +
    ['critical', 'high', 'medium', 'low'].map(s => `${counts[s] || 0} ${s}`).join(', '))

// ─── Phase 4: Report ───────────────────────────────────────────────────────────
phase('Report')

const blocking = (counts.critical || 0) + (counts.high || 0)
const verdict = blocking > 0 ? 'NOT READY' : confirmed.length > 0 ? 'READY WITH NITS' : 'READY'

const findingsMd = confirmed.length
  ? confirmed.map(f =>
      `### [${f.severity.toUpperCase()}] ${f.title}\n` +
      `- **Dimension**: ${f.dimension}\n` +
      `- **Location**: \`${f.file}${f.line ? ':' + f.line : ''}\`\n` +
      `- **Issue**: ${f.detail}\n` +
      `- **Fix**: ${f.fix}\n`
    ).join('\n')
  : '_No confirmed issues. Feature passes the 5-point checklist._\n'

await agent(
  `Write a code-review report to ${reviewDoc}. Create parent directories if needed (mkdir -p).

Write EXACTLY this Markdown content (do not editorialize beyond it):

# Feature Review — ${feature}

> Generated by the feature-review workflow. Verdict: **${verdict}**

## Scope
${map.summary}

**Files reviewed (${fileList.length}):**
${fileList.map(f => '- `' + f + '`').join('\n')}

## Summary
- Confirmed findings: ${confirmed.length}
- Critical: ${counts.critical || 0} · High: ${counts.high || 0} · Medium: ${counts.medium || 0} · Low: ${counts.low || 0}
- Verdict: **${verdict}**${blocking ? ` — ${blocking} blocking issue(s) must be fixed before release.` : ''}

## Findings
${findingsMd}

---
*Reviewed against .claude/rules/dev-process.md (5-point checklist).*

After writing the file, confirm the path written.`,
  { label: 'write-review', phase: 'Report', agentType: 'frontend-dev' }
)

log(`Review written to ${reviewDoc} — verdict: ${verdict}`)

return {
  feature,
  reviewDoc,
  verdict,
  filesReviewed: fileList.length,
  findingsCount: confirmed.length,
  counts,
  findings: confirmed,
}
