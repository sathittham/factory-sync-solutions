export const meta = {
  name: 'branch-cleanup',
  description: 'Prune stale tracking refs and delete merged local + remote branches (protects main/staging/develop)',
  phases: [
    { title: 'Scan',    detail: 'Find merged and gone branches' },
    { title: 'Cleanup', detail: 'Delete merged local branches and remote gone-refs' },
  ],
}

// Usage: /branch-cleanup
// Optional args: { remote: 'origin', base: 'develop' }
const remote = args?.remote || 'origin'
const base   = args?.base   || 'develop'

// ─── Phase 1: Scan ───────────────────────────────────────────────────────────
phase('Scan')

const scanResult = await agent(
  `Scan for branches to clean up in the factory-health-check repo (GitHub).

  Run these commands and report the results:
  1. git fetch ${remote} --prune
  2. git branch --merged ${base} | grep -vE "^\\*|main|staging|develop"
     — local branches already merged into ${base} (safe to delete)
  3. git branch -vv | grep ': gone]' | awk '{print $1}'
     — local branches whose remote was deleted (safe to delete).
     Use single quotes around the awk program to avoid shell expansion.
  4. git branch -r --merged ${base} | grep -vE "main|staging|develop|HEAD"
     — remote branches merged into ${base} (can delete)
  5. git branch --show-current

  Report findings as JSON: {
    mergedLocal: string[],
    goneLocal: string[],
    mergedRemote: string[],
    currentBranch: string
  }`,
  { label: 'scan:branches', phase: 'Scan', schema: {
    type: 'object',
    properties: {
      mergedLocal:   { type: 'array', items: { type: 'string' } },
      goneLocal:     { type: 'array', items: { type: 'string' } },
      mergedRemote:  { type: 'array', items: { type: 'string' } },
      currentBranch: { type: 'string' },
    },
    required: ['mergedLocal', 'goneLocal', 'mergedRemote', 'currentBranch'],
  }}
)

if (!scanResult || scanResult.error) {
  return { error: 'Scan failed — git may be unavailable or returned an error', details: scanResult }
}

const total = (scanResult.mergedLocal?.length || 0) + (scanResult.goneLocal?.length || 0)
log(`Found ${total} local branch(es) to clean up, ${scanResult.mergedRemote?.length || 0} remote`)

if (total === 0 && (scanResult.mergedRemote?.length || 0) === 0) {
  log('Repository is already clean — nothing to delete')
  return { cleaned: [], skipped: 'nothing to clean' }
}

// Show planned deletions before executing — remote deletes are irreversible
if (scanResult.mergedRemote?.length > 0) {
  log(`Remote branches to delete: ${scanResult.mergedRemote.join(', ')}`)
}
if (scanResult.mergedLocal?.length > 0) {
  log(`Local merged branches to delete: ${scanResult.mergedLocal.join(', ')}`)
}
if (scanResult.goneLocal?.length > 0) {
  log(`Local gone branches to delete: ${scanResult.goneLocal.join(', ')}`)
}

// ─── Phase 2: Cleanup ──────────────────────────────────────────────────────
phase('Cleanup')

const cleanupResult = await agent(
  `Clean up branches in the factory-health-check repo (GitHub, remote: ${remote}).

  Branches to delete:
  - Merged local: ${JSON.stringify(scanResult.mergedLocal)}
  - Gone local (remote deleted): ${JSON.stringify(scanResult.goneLocal)}
  - Merged remote: ${JSON.stringify(scanResult.mergedRemote)}

  Current branch (DO NOT DELETE): ${scanResult.currentBranch}

  Steps:
  1. Delete merged local branches: git branch -d <branch> (for each)
  2. Delete gone local branches: git branch -D <branch> (force OK — remote already gone)
  3. Delete merged remote branches: git push ${remote} --delete <branch>
     (for each, strip the "${remote}/" prefix)
  4. Run git fetch ${remote} --prune to sync
  5. Run git branch -a to show final state

  NEVER delete: main, staging, develop, or the current branch.

  Return JSON:
  {
    "deletedLocal": ["branches deleted locally"],
    "deletedRemote": ["branches deleted from remote"],
    "errors": ["any errors encountered"]
  }`,
  { label: 'cleanup:branches', phase: 'Cleanup', schema: {
    type: 'object',
    properties: {
      deletedLocal:  { type: 'array', items: { type: 'string' } },
      deletedRemote: { type: 'array', items: { type: 'string' } },
      errors:        { type: 'array', items: { type: 'string' } },
    },
    required: ['deletedLocal', 'deletedRemote', 'errors'],
  }}
)

if (!cleanupResult || cleanupResult.error) {
  return { error: 'Cleanup failed', details: cleanupResult, scanned: scanResult }
}

if (cleanupResult.errors?.length > 0) {
  log(`Cleanup completed with errors: ${cleanupResult.errors.join(', ')}`)
} else {
  log('Branch cleanup complete')
}

return { scanned: scanResult, cleanupResult }
