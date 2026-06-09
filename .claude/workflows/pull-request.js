export const meta = {
  name: 'pull-request',
  description: 'Full PR lifecycle: preflight → create PR → squash merge into develop → cleanup',
  phases: [
    { title: 'Preflight', detail: 'Check branch state, uncommitted changes, push if needed' },
    { title: 'Create PR', detail: 'Build title/description from commits and open PR via gh' },
    { title: 'Merge',     detail: 'Squash merge into develop and remove source branch' },
    { title: 'Cleanup',   detail: 'Switch to develop, pull, delete local branch, prune' },
  ],
}

// Usage: /pull-request   (no args needed — reads branch + commits automatically)
// Optional args: { ticket: 'FHC-123', title: 'custom title', base: 'develop', remote: 'origin' }
const base   = args?.base   || 'develop'
const remote = args?.remote || 'origin'

// ─── Phase 1: Preflight ────────────────────────────────────────────────────
phase('Preflight')

const preflight = await agent(
  `Check the current git state and prepare for a pull request in the factory-health-check repo (GitHub).

  Run these commands and report results:
  1. git branch --show-current
  2. git status --porcelain
  3. git log ${remote}/${base}..HEAD --oneline
  4. git remote get-url ${remote}

  Rules:
  - If current branch is main, staging, or develop → ABORT: report error "Cannot open a PR from a protected branch"
  - If there are uncommitted changes → ABORT: report error "You have uncommitted changes — commit or stash them before running the PR workflow"
  - If commits ahead of ${base} is 0 → ABORT: report error "No commits ahead of ${base}"
  - If the branch has no remote tracking → push it: run "git push -u ${remote} <branch>"

  Return JSON:
  {
    "branch": "<current branch name>",
    "ticket": "<FHC-XXX extracted from branch name or commit, or NO-TICKET if none>",
    "commitsAhead": ["list of commit one-liners"],
    "remotePushed": true/false,
    "error": "<error message or null>"
  }`,
  {
    label: 'preflight:check',
    phase: 'Preflight',
    schema: {
      type: 'object',
      properties: {
        branch:       { type: 'string' },
        ticket:       { type: 'string' },
        commitsAhead: { type: 'array', items: { type: 'string' } },
        remotePushed: { type: 'boolean' },
        error:        { type: ['string', 'null'] },
      },
      required: ['branch', 'ticket', 'commitsAhead', 'remotePushed', 'error'],
    },
  }
)

if (preflight.error) {
  log(`Preflight failed: ${preflight.error}`)
  return { error: preflight.error }
}

const ticket = args?.ticket || preflight.ticket
const branch = preflight.branch
log(`Branch: ${branch} | Ticket: ${ticket} | ${preflight.commitsAhead.length} commit(s) ahead of ${base}`)

// ─── Phase 2: Create PR ────────────────────────────────────────────────────
phase('Create PR')

const prCreated = await agent(
  `Create a GitHub pull request for the factory-health-check repo.

  Branch: ${branch}
  Base branch: ${base}
  Ticket: ${ticket}
  Commits:
  ${preflight.commitsAhead.map(c => `  - ${c}`).join('\n')}
  Custom title override: ${args?.title || 'none'}

  Steps:
  1. Derive the PR title from the commits list, following the project commit format
     "<type>(<scope>): <description>" (scopes: quiz, scoring, admin, profile, result,
     dbd, audit, notification, web):
     - If single commit: use its message (strip the commit hash prefix)
     - If multiple commits: write a concise summary covering all changes
     - Max 72 chars, imperative mood, no trailing period
     - If a custom title was provided, use that instead

  2. Write a PR body with:
     ## Summary  — bullet list of the changes
     ## Test plan — checkbox list
     If a ticket other than NO-TICKET is present, reference it in the body.
     End the body with:
     🤖 Generated with [Claude Code](https://claude.com/claude-code)

  3. Run (write the body to a temp file and pass it via --body-file to preserve formatting):
     gh pr create --base ${base} --head ${branch} --title "<derived title>" --body-file <file>

  4. Extract the PR number from the output (the integer after "/pull/").
     If the command fails, set error to the failure message and prNumber to null.

  Return JSON:
  {
    "prNumber": <integer or null>,
    "prUrl": "<full URL or empty string>",
    "title": "<title used>",
    "error": "<error message or null>"
  }`,
  {
    label: 'create:pr',
    phase: 'Create PR',
    schema: {
      type: 'object',
      properties: {
        prNumber: { type: ['integer', 'null'] },
        prUrl:    { type: 'string' },
        title:    { type: 'string' },
        error:    { type: ['string', 'null'] },
      },
      required: ['prNumber', 'prUrl', 'title', 'error'],
    },
  }
)

if (!prCreated || prCreated.error || !prCreated.prNumber) {
  log(`PR creation failed: ${prCreated?.error || 'prNumber missing from response'}`)
  return { error: 'PR creation failed', details: prCreated }
}

log(`PR #${prCreated.prNumber} created: ${prCreated.title}`)

// ─── Phase 3: Merge ────────────────────────────────────────────────────────
phase('Merge')

const merged = await agent(
  `Squash-merge GitHub PR #${prCreated.prNumber} in the factory-health-check repo.

  Per project rules, feature/bugfix branches merge into ${base} via SQUASH merge.

  Run:
    gh pr merge ${prCreated.prNumber} --squash --delete-branch

  Confirm success by checking the output for "Merged" / "Squashed and merged".
  If unclear, run:
    gh pr view ${prCreated.prNumber} --json state,mergedAt
  and check that state equals "MERGED".

  Return JSON:
  {
    "success": true/false,
    "output": "<gh output>"
  }`,
  {
    label: 'merge:pr',
    phase: 'Merge',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        output:  { type: 'string' },
      },
      required: ['success', 'output'],
    },
  }
)

if (!merged.success) {
  log(`Merge failed: ${merged.output}`)
  return { error: 'Merge failed', prNumber: prCreated.prNumber, output: merged.output }
}

log(`PR #${prCreated.prNumber} squash-merged into ${base}`)

// ─── Phase 4: Cleanup ──────────────────────────────────────────────────────
phase('Cleanup')

const cleanup = await agent(
  `Clean up after merging branch "${branch}" into ${base} in the factory-health-check repo.

  Run these steps in order:
  1. git checkout ${base}
  2. git fetch ${remote} ${base}
     Verify the squash commit appears before pulling (retry up to 3 times with a short delay if not yet visible).
  3. git pull ${remote} ${base}
  4. git branch -D ${branch}
     (squash merges always require -D because the tip is unreachable from ${base})
  5. git fetch ${remote} --prune
  6. git log --oneline -3

  Return JSON:
  {
    "success": true/false,
    "steps": ["list of completed steps"],
    "finalLog": ["last 3 commits on ${base}"]
  }`,
  {
    label: 'cleanup:branch',
    phase: 'Cleanup',
    schema: {
      type: 'object',
      properties: {
        success:  { type: 'boolean' },
        steps:    { type: 'array', items: { type: 'string' } },
        finalLog: { type: 'array', items: { type: 'string' } },
      },
      required: ['success', 'steps', 'finalLog'],
    },
  }
)

if (cleanup.success) {
  log(`Cleanup done — now on ${base}`)
} else {
  log('Cleanup warning: some steps may not have completed. Check repo state manually.')
}

return {
  branch,
  ticket,
  prNumber: prCreated.prNumber,
  prUrl: prCreated.prUrl,
  title: prCreated.title,
  merged: true,
  cleanup: cleanup.steps,
}
