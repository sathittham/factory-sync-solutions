export const meta = {
  name: 'release-production',
  description: 'Promote staging → main and push vX.Y.Z tag to trigger CI production deploy. Run after /release-staging and verifying staging.',
  phases: [
    { title: 'Preflight',   detail: 'Check staging→main commits, derive production tag from latest staging tag' },
    { title: 'Production',  detail: 'Fast-forward main to staging, push, tag vX.Y.Z' },
  ],
}

// Usage:
//   /release-production
//
// Always run /release-staging first and verify staging before running this.
// The production tag is derived automatically from the latest vX.Y.Z-staging tag.

const remote = 'origin'

// ─── Phase 1: Preflight ────────────────────────────────────────────────────
phase('Preflight')

const preflight = await agent(
  `Check the git state of the factory-sync-solutions repo to prepare a staging → main promotion.

  Run these commands:
  1. git fetch origin --prune
  2. git log origin/main..origin/staging --oneline
  3. git tag --sort=-creatordate | head -10

  Determine:
  - commitsToMain: list of commits that will move from staging → main (from step 2)
  - latestStagingTag: most recent tag matching vX.Y.Z-staging exactly
  - productionTag: strip "-staging" from latestStagingTag (e.g. "v0.7.3-staging" → "v0.7.3")
  - nothingToPromote: true if commitsToMain is empty

  Return JSON:
  {
    "commitsToMain": ["<hash> <msg>", ...],
    "latestStagingTag": "vX.Y.Z-staging",
    "productionTag": "vX.Y.Z",
    "nothingToPromote": true/false,
    "error": "<error message or null>"
  }`,
  {
    label: 'preflight:check',
    phase: 'Preflight',
    schema: {
      type: 'object',
      properties: {
        commitsToMain:    { type: 'array', items: { type: 'string' } },
        latestStagingTag: { type: 'string' },
        productionTag:    { type: 'string' },
        nothingToPromote: { type: 'boolean' },
        error:            { type: ['string', 'null'] },
      },
      required: ['commitsToMain', 'latestStagingTag', 'productionTag', 'nothingToPromote', 'error'],
    },
  }
)

if (preflight.error) {
  log(`Preflight failed: ${preflight.error}`)
  return { error: preflight.error }
}

if (preflight.nothingToPromote) {
  log('Nothing to promote — staging is already in sync with main.')
  return { nothingToPromote: true }
}

const { productionTag, latestStagingTag, commitsToMain } = preflight

log(`Promoting ${latestStagingTag} → ${productionTag}`)
log(`→ ${commitsToMain.length} commit(s) moving to main`)

// ─── Phase 2: Production ───────────────────────────────────────────────────
phase('Production')

const result = await agent(
  `Promote staging → main in the factory-sync-solutions repo and create the production release tag.

  IMPORTANT: Never force-push main. --ff-only only.

  Steps (run in order, stop immediately on any error):
  1. git checkout main
  2. git pull ${remote} main
  3. git merge --ff-only ${remote}/staging
     If this fails, ABORT — set error to the merge failure message.
  4. git push ${remote} main
  5. git tag -a ${productionTag} -m "Release ${productionTag}: ${commitsToMain.slice(0, 3).map(c => c.replace(/^[a-f0-9]+ /, '')).join('; ')}"
  6. git push ${remote} ${productionTag}

  Verify: confirm ${productionTag} appears in "git tag --sort=-creatordate | head -3".

  Return JSON:
  {
    "success": true/false,
    "productionTag": "${productionTag}",
    "mainHead": "<short commit hash>",
    "error": "<error message or null>"
  }`,
  {
    label: 'promote:main',
    phase: 'Production',
    schema: {
      type: 'object',
      properties: {
        success:       { type: 'boolean' },
        productionTag: { type: 'string' },
        mainHead:      { type: 'string' },
        error:         { type: ['string', 'null'] },
      },
      required: ['success', 'productionTag', 'mainHead', 'error'],
    },
  }
)

if (!result.success) {
  log(`Production promotion failed: ${result.error}`)
  return { error: 'Production promotion failed', details: result }
}

log(`✓ main at ${result.mainHead} — tagged ${productionTag} — CI production deploy triggered`)

return {
  productionTag,
  mainHead:       result.mainHead,
  commitsShipped: commitsToMain.length,
}
