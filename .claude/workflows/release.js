export const meta = {
  name: 'release',
  description: 'Full release: develop → staging (tag) → main (tag). Runs release-staging then release-production in sequence.',
  phases: [
    { title: 'Staging',    detail: 'Fast-forward staging to develop, push vX.Y.Z-staging tag' },
    { title: 'Production', detail: 'Fast-forward main to staging, push vX.Y.Z tag' },
  ],
}

// Usage:
//   /release                   → auto-detect bump (feat → minor, fix/chore → patch)
//   /release { bump: "minor" } → force minor bump
//   /release { bump: "patch" } → force patch bump
//
// To promote one step at a time (recommended):
//   /release-staging  → promote develop → staging, verify, then:
//   /release-production → promote staging → main

const stagingResult = await workflow('release-staging', args?.bump ? { bump: args.bump } : undefined)

if (stagingResult?.error) {
  log(`Staging failed — production skipped. Error: ${stagingResult.error}`)
  return { error: stagingResult.error, stagingDone: false }
}

if (stagingResult?.nothingToPromote) {
  log('develop is already in sync with staging — checking if staging needs promoting to main…')
}

const productionResult = await workflow('release-production')

if (productionResult?.error) {
  log(`Production failed — staging was tagged but main was NOT promoted. Error: ${productionResult.error}`)
  return {
    error:       productionResult.error,
    stagingDone: true,
    stagingTag:  stagingResult?.stagingTag,
  }
}

return {
  stagingTag:     stagingResult?.stagingTag,
  productionTag:  productionResult?.productionTag,
  commitsShipped: (stagingResult?.commitsShipped ?? 0) + (productionResult?.commitsShipped ?? 0),
}
