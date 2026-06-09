export const meta = {
  name: 'deploy-smoke-test',
  description: 'Deploy changed frontend apps to Cloudflare Pages and verify each URL returns 200 with valid HTML',
  phases: [
    { title: 'Discover', detail: 'Find changed frontend apps vs base branch' },
    { title: 'Deploy', detail: 'Build + deploy each changed app to Cloudflare Pages' },
    { title: 'Smoke Test', detail: 'Verify each deployed URL returns 200 and valid HTML' },
  ],
}

// Usage: Workflow({ name: 'deploy-smoke-test', args: { base: 'main', env: 'staging' } })
// args.base: branch to diff against (default: 'main')
// args.env:  'staging' | 'prod' (default: 'staging')

const base = args?.base || 'main'
const env  = args?.env  || 'staging'

// Only the two deployable frontend apps. fs-backend deploys separately (Cloud Run / Docker).
const APP_CONFIG = {
  'fs-app-web': {
    dir:        'apps/fs-app-web',
    staging:    { script: 'deploy:staging', url: 'https://factory-sync-solutions-staging.pages.dev',          cfProject: 'factory-sync-solutions-staging' },
    prod:       { script: 'deploy:prod',    url: 'https://factory-sync-solutions.pages.dev',                  cfProject: 'factory-sync-solutions' },
  },
  'fs-official-web': {
    dir:        'apps/fs-official-web',
    staging:    { script: 'deploy:staging', url: 'https://factory-sync-solutions-official-staging.pages.dev', cfProject: 'factory-sync-solutions-official-staging' },
    prod:       { script: 'deploy:prod',    url: 'https://factory-sync-solutions-official.pages.dev',         cfProject: 'factory-sync-solutions-official' },
  },
}
const ALL_APPS = Object.keys(APP_CONFIG)

const APPS_SCHEMA = {
  type: 'object',
  properties: {
    changedApps:   { type: 'array', items: { type: 'string' } },
    sharedChanged: { type: 'boolean' },
    reason:        { type: 'string' },
  },
  required: ['changedApps', 'sharedChanged', 'reason'],
}

const DEPLOY_SCHEMA = {
  type: 'object',
  properties: {
    app:       { type: 'string' },
    deployed:  { type: 'boolean' },
    deployUrl: { type: 'string' },
    error:     { type: 'string' },
  },
  required: ['app', 'deployed'],
}

const SMOKE_SCHEMA = {
  type: 'object',
  properties: {
    app:        { type: 'string' },
    url:        { type: 'string' },
    statusCode: { type: 'number' },
    hasHtml:    { type: 'boolean' },
    passed:     { type: 'boolean' },
    error:      { type: 'string' },
  },
  required: ['app', 'url', 'statusCode', 'hasHtml', 'passed'],
}

// ─── Phase 1: Discover ────────────────────────────────────────────────────────
phase('Discover')

log(`Budget: ${budget.total ? Math.round(budget.remaining() / 1000) + 'k tokens remaining' : 'unbounded — pass +200k to cap spending'}`)
log(`Target env: ${env}`)

const discovered = await agent(
  `Find which deployable frontend apps changed vs ${base}.

Run:
1. git diff --name-only origin/${base}...HEAD 2>/dev/null || git diff --name-only ${base}...HEAD
   → full list of changed files

2. Map "apps/<name>/..." paths to known frontend apps: ${ALL_APPS.join(', ')}

3. Check whether any changed file is under packages/ (shared) → set sharedChanged=true

Rules:
- changedApps = intersection with known apps
- If sharedChanged=true → include ALL apps: ${ALL_APPS.join(', ')}
- Ignore changes only under apps/fs-backend (deploys separately, not via Cloudflare Pages)
- If nothing relevant changed → changedApps = []
- reason = one sentence on scope`,
  { label: 'discover', phase: 'Discover', agentType: 'Explore', schema: APPS_SCHEMA }
)

if (!discovered || !discovered.changedApps.length) {
  log('No changed frontend apps found vs ' + base + ' — nothing to deploy')
  return { deployed: [], passed: true, base, env }
}

log('Deploying ' + discovered.changedApps.length + ' app(s) to ' + env + ': ' + discovered.changedApps.join(', '))

// ─── Phase 2: Deploy ─────────────────────────────────────────────────────────
// Sequential per app — concurrent wrangler runs against the same Cloudflare
// account can race on auth. Use a for-of loop, not pipeline().
phase('Deploy')

const deployResults = []
for (const app of discovered.changedApps) {
  const cfg    = APP_CONFIG[app]
  const target = cfg[env] || cfg.staging
  const result = await agent(
    `Deploy ${app} to ${env} (Cloudflare Pages).

Run from the repo root:
  cd ${cfg.dir} && npm run ${target.script} 2>&1

This builds the app and deploys to Cloudflare Pages — it may take 2-5 minutes.
Wait for the command to complete. Do NOT terminate early.

Success criteria:
- Exit code 0
- Output contains a deployment URL or "Success" / "Deployment complete"
- Does NOT end with "Error" / "Failed" / "ERROR"

If successful:
- deployed = true
- deployUrl = the URL printed by wrangler, else ${target.url}

If failed:
- deployed = false
- error = last 20 lines of output

Always set app: "${app}".`,
    { label: 'deploy:' + app, phase: 'Deploy', agentType: 'frontend-dev', schema: DEPLOY_SCHEMA }
  )
  deployResults.push(result)
}

const deployedOk   = deployResults.filter(Boolean).filter(r => r.deployed)
const deployFailed = deployResults.filter(Boolean).filter(r => !r.deployed)

if (deployFailed.length) {
  log('Deploy failures (' + deployFailed.length + '): ' + deployFailed.map(r => r.app).join(', '))
}
if (!deployedOk.length) {
  log('All deployments failed — skipping smoke tests')
  return { deployedCount: 0, deployFailed: deployFailed.length, smokeResults: [], passed: false, base, env }
}

log(deployedOk.length + ' deployed — running smoke tests')

// ─── Phase 3: Smoke Test ──────────────────────────────────────────────────────
phase('Smoke Test')

const smokeResults = await pipeline(
  deployedOk,
  r => {
    const cfg = APP_CONFIG[r.app]
    const url = (cfg[env] || cfg.staging).url
    return agent(
      `Smoke test the deployed ${r.app} (${env}).

Wait 10 seconds for Cloudflare propagation:
  sleep 10

Then:
1. SITE RESPONSE
   STATUS=$(curl -s -o /tmp/smoke-${r.app}.html -w "%{http_code}" --max-time 15 "${url}")
   → statusCode = integer value of STATUS (e.g. 200, 404, 503)

2. HTML CONTENT CHECK
   grep -cE "<!DOCTYPE html|<html" /tmp/smoke-${r.app}.html
   → hasHtml = true if count > 0 (real page, not a CF error page)
   → also: grep -iE "error|not found|503|504" /tmp/smoke-${r.app}.html | head -3

Set passed=true if statusCode=200 AND hasHtml=true.
url = "${url}". Always set app: "${r.app}".`,
      { label: 'smoke:' + r.app, phase: 'Smoke Test', agentType: 'frontend-dev', schema: SMOKE_SCHEMA }
    )
  }
)

const smokeOk     = smokeResults.filter(Boolean).filter(r => r.passed)
const smokeFailed = smokeResults.filter(Boolean).filter(r => !r.passed)

log('Smoke tests: ' + smokeOk.length + ' passed, ' + smokeFailed.length + ' failed')

for (const r of smokeFailed) {
  log('  FAIL ' + r.app + ': HTTP ' + r.statusCode + (r.error ? ' — ' + r.error : '') + (r.hasHtml ? '' : ' (no HTML)'))
}
for (const r of smokeOk) {
  log('  OK   ' + r.app + ': ' + r.url + ' → ' + r.statusCode)
}

return {
  base,
  env,
  deployedCount: deployedOk.length,
  deployFailed:  deployFailed.length,
  smokePassed:   smokeOk.length,
  smokeFailed:   smokeFailed.length,
  allPassed:     deployFailed.length === 0 && smokeFailed.length === 0,
  results:       smokeResults.filter(Boolean),
}
