export const meta = {
  name: 'release-staging',
  description: 'Promote develop → staging and push vX.Y.Z-staging tag to trigger CI staging deploy',
  phases: [
    { title: 'Preflight',  detail: 'Check develop→staging commits, compute next staging tag' },
    { title: 'Staging',    detail: 'Fast-forward staging to develop, push, tag vX.Y.Z-staging' },
  ],
}

// Usage:
//   /release-staging                   → auto-detect bump (feat → minor, fix/chore → patch)
//   /release-staging { bump: "minor" } → force minor bump
//   /release-staging { bump: "patch" } → force patch bump

const remote    = 'origin'
const forceBump = args?.bump || null

// ─── Phase 1: Preflight ────────────────────────────────────────────────────
phase('Preflight')

const preflight = await agent(
  `Check the git state of the factory-sync-solutions repo to prepare a develop → staging promotion.

  Run these commands:
  1. git fetch origin --prune
  2. git log origin/staging..origin/develop --oneline
  3. git tag --sort=-creatordate | head -10

  Determine:
  - commitsToStaging: list of commits that will move from develop → staging (from step 2)
  - latestProductionTag: most recent semver tag matching vX.Y.Z exactly (no -staging suffix)
  - bumpType: auto-detect from commitsToStaging unless forceBump="${forceBump || 'auto'}" is set:
      • if any commit message starts with "feat": "minor"
      • otherwise: "patch"
  - nextVersion: increment latestProductionTag by bumpType
      • patch: vX.Y.Z → vX.Y.(Z+1)
      • minor: vX.Y.Z → vX.(Y+1).0
  - stagingTag: nextVersion + "-staging"
  - nothingToPromote: true if commitsToStaging is empty

  Return JSON:
  {
    "commitsToStaging": ["<hash> <msg>", ...],
    "latestProductionTag": "vX.Y.Z",
    "bumpType": "minor" | "patch",
    "nextVersion": "vX.Y.Z",
    "stagingTag": "vX.Y.Z-staging",
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
        latestProductionTag: { type: 'string' },
        bumpType:            { type: 'string', enum: ['minor', 'patch'] },
        nextVersion:         { type: 'string' },
        stagingTag:          { type: 'string' },
        nothingToPromote:    { type: 'boolean' },
        error:               { type: ['string', 'null'] },
      },
      required: ['commitsToStaging', 'latestProductionTag', 'bumpType',
                 'nextVersion', 'stagingTag', 'nothingToPromote', 'error'],
    },
  }
)

if (preflight.error) {
  log(`Preflight failed: ${preflight.error}`)
  return { error: preflight.error }
}

if (preflight.nothingToPromote) {
  log('Nothing to promote — develop is already in sync with staging.')
  return { nothingToPromote: true }
}

const { stagingTag, nextVersion, bumpType, commitsToStaging } = preflight

log(`Next version: ${nextVersion} (${bumpType} bump from ${preflight.latestProductionTag})`)
log(`→ ${commitsToStaging.length} commit(s) moving to staging`)

// ─── Phase 2: Staging ──────────────────────────────────────────────────────
phase('Staging')

const result = await agent(
  `Promote develop → staging in the factory-sync-solutions repo and create the staging release tag.

  Steps (run in order, stop immediately on any error):
  1. git checkout staging
  2. git pull ${remote} staging
  3. git merge --ff-only ${remote}/develop
     If this fails, ABORT — set error to the merge failure message.
  4. git push ${remote} staging
  5. git tag -a ${stagingTag} -m "Release ${nextVersion} to staging: ${commitsToStaging.slice(0, 3).map(c => c.replace(/^[a-f0-9]+ /, '')).join('; ')}"
  6. git push ${remote} ${stagingTag}

  Verify: confirm ${stagingTag} appears in "git tag --sort=-creatordate | head -3".

  Return JSON:
  {
    "success": true/false,
    "stagingTag": "${stagingTag}",
    "stagingHead": "<short commit hash>",
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

if (!result.success) {
  log(`Staging promotion failed: ${result.error}`)
  return { error: 'Staging promotion failed', details: result }
}

log(`✓ staging at ${result.stagingHead} — tagged ${stagingTag} — CI staging deploy triggered`)

return {
  nextVersion,
  bumpType,
  stagingTag,
  stagingHead:    result.stagingHead,
  commitsShipped: commitsToStaging.length,
}
