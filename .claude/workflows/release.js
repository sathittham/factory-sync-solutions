export const meta = {
  name: 'release',
  description: 'Promote develop → staging (tag) → main (tag): fast-forward both branches and push semver tags to trigger CI deploys',
  phases: [
    { title: 'Preflight',   detail: 'Check branch state, compute next version from latest tag and commit types' },
    { title: 'Staging',     detail: 'Fast-forward staging to develop, push, create and push vX.Y.Z-staging tag' },
    { title: 'Production',  detail: 'Fast-forward main to staging, push, create and push vX.Y.Z tag' },
  ],
}

// Usage:
//   /release                  → auto-detect bump type from commits (feat → minor, fix/chore → patch)
//   /release { bump: "minor" } → force minor bump
//   /release { bump: "patch" } → force patch bump
//
// Tags trigger GitHub Actions:
//   vX.Y.Z-staging  → staging deploy
//   vX.Y.Z          → production deploy

const remote = 'origin'
const forceBump = args?.bump || null  // "minor" | "patch" | null

// ─── Phase 1: Preflight ────────────────────────────────────────────────────
phase('Preflight')

const preflight = await agent(
  `Check the git state of the factory-sync-solutions repo to prepare a release promotion.

  Run these commands:
  1. git fetch origin --prune
  2. git log origin/staging..origin/develop --oneline
  3. git log origin/main..origin/staging --oneline
  4. git tag --sort=-creatordate | head -10
  5. git status --porcelain

  Determine:
  - commitsToStaging: list of commits that will move from develop → staging
  - commitsToMain: list of commits already in staging but not yet in main
  - allNewCommits: commitsToStaging + commitsToMain (everything going to production)
  - latestProductionTag: the most recent semver tag matching vX.Y.Z (no -staging suffix)
  - latestStagingTag: the most recent tag matching vX.Y.Z-staging
  - bumpType (auto-detect from allNewCommits unless overridden by forceBump="${forceBump || 'auto'}"):
      - if any commit starts with "feat": "minor"
      - otherwise: "patch"
  - nextVersion: increment latestProductionTag according to bumpType (e.g. v0.7.2 + patch → v0.7.3)
  - stagingTag: nextVersion + "-staging"  (e.g. "v0.7.3-staging")
  - productionTag: nextVersion  (e.g. "v0.7.3")
  - nothingToPromote: true if commitsToStaging is empty AND commitsToMain is empty

  Return JSON:
  {
    "commitsToStaging": ["<hash> <msg>", ...],
    "commitsToMain": ["<hash> <msg>", ...],
    "latestProductionTag": "vX.Y.Z",
    "latestStagingTag": "vX.Y.Z-staging",
    "bumpType": "minor" | "patch",
    "nextVersion": "vX.Y.Z",
    "stagingTag": "vX.Y.Z-staging",
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
        commitsToStaging:    { type: 'array', items: { type: 'string' } },
        commitsToMain:       { type: 'array', items: { type: 'string' } },
        latestProductionTag: { type: 'string' },
        latestStagingTag:    { type: 'string' },
        bumpType:            { type: 'string', enum: ['minor', 'patch'] },
        nextVersion:         { type: 'string' },
        stagingTag:          { type: 'string' },
        productionTag:       { type: 'string' },
        nothingToPromote:    { type: 'boolean' },
        error:               { type: ['string', 'null'] },
      },
      required: ['commitsToStaging', 'commitsToMain', 'latestProductionTag', 'latestStagingTag',
                 'bumpType', 'nextVersion', 'stagingTag', 'productionTag', 'nothingToPromote', 'error'],
    },
  }
)

if (preflight.error) {
  log(`Preflight failed: ${preflight.error}`)
  return { error: preflight.error }
}

if (preflight.nothingToPromote) {
  log('Nothing to promote — develop == staging == main. All branches are in sync.')
  return { nothingToPromote: true }
}

const { stagingTag, productionTag, nextVersion, bumpType, commitsToStaging, commitsToMain } = preflight

log(`Next version: ${nextVersion} (${bumpType} bump from ${preflight.latestProductionTag})`)
log(`→ staging: ${commitsToStaging.length} new commit(s)`)
log(`→ main:    ${commitsToMain.length + commitsToStaging.length} commit(s) total`)

// ─── Phase 2: Staging ──────────────────────────────────────────────────────
phase('Staging')

const stagingResult = await agent(
  `Promote develop → staging in the factory-sync-solutions repo and tag the release.

  Steps (run in order):
  1. git checkout staging
  2. git pull ${remote} staging
  3. git merge --ff-only ${remote}/develop
     If this fails (not fast-forwardable), ABORT and set error to the merge output.
  4. git push ${remote} staging
  5. git tag -a ${stagingTag} -m "Release ${nextVersion} to staging: ${commitsToStaging.slice(0, 3).map(c => c.replace(/^[a-f0-9]+ /, '')).join('; ')}"
  6. git push ${remote} ${stagingTag}

  Verify: run "git log --oneline -3" and confirm ${stagingTag} appears in "git tag --sort=-creatordate | head -3".

  Return JSON:
  {
    "success": true/false,
    "stagingTag": "${stagingTag}",
    "stagingHead": "<short commit hash now at staging HEAD>",
    "error": "<error message or null>"
  }`,
  {
    label: 'promote:staging',
    phase: 'Staging',
    schema: {
      type: 'object',
      properties: {
        success:     { type: 'boolean' },
        stagingTag:  { type: 'string' },
        stagingHead: { type: 'string' },
        error:       { type: ['string', 'null'] },
      },
      required: ['success', 'stagingTag', 'stagingHead', 'error'],
    },
  }
)

if (!stagingResult.success) {
  log(`Staging promotion failed: ${stagingResult.error}`)
  return { error: 'Staging promotion failed', details: stagingResult }
}

log(`✓ staging at ${stagingResult.stagingHead} — tagged ${stagingTag} — CI staging deploy triggered`)

// ─── Phase 3: Production ───────────────────────────────────────────────────
phase('Production')

const productionResult = await agent(
  `Promote staging → main in the factory-sync-solutions repo and tag the production release.

  IMPORTANT: Never force-push main. Use --ff-only only.

  Steps (run in order):
  1. git checkout main
  2. git pull ${remote} main
  3. git merge --ff-only ${remote}/staging
     If this fails (not fast-forwardable), ABORT and set error to the merge output.
  4. git push ${remote} main
  5. git tag -a ${productionTag} -m "Release ${nextVersion}: ${[...commitsToMain, ...commitsToStaging].slice(0, 3).map(c => c.replace(/^[a-f0-9]+ /, '')).join('; ')}"
  6. git push ${remote} ${productionTag}

  Verify: run "git log --oneline -3" and confirm ${productionTag} appears in "git tag --sort=-creatordate | head -3".

  Return JSON:
  {
    "success": true/false,
    "productionTag": "${productionTag}",
    "mainHead": "<short commit hash now at main HEAD>",
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

if (!productionResult.success) {
  log(`Production promotion failed: ${productionResult.error}`)
  return {
    error:        'Production promotion failed — staging was tagged but main was NOT promoted',
    stagingTag,
    stagingDone:  true,
    details:      productionResult,
  }
}

log(`✓ main at ${productionResult.mainHead} — tagged ${productionTag} — CI production deploy triggered`)

return {
  nextVersion,
  bumpType,
  stagingTag,
  productionTag,
  commitsShipped: commitsToStaging.length + commitsToMain.length,
  stagingHead:    stagingResult.stagingHead,
  mainHead:       productionResult.mainHead,
}
