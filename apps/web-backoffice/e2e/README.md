# web-backoffice — End-to-End Tests

Playwright end-to-end tests for the staff/superadmin backoffice
(`@repo/web-backoffice`). They run against a **running app** — either a local
Vite dev server or a deployed URL (e.g. staging) — and verify authentication,
route guarding, and the shared chrome (header/sidebar) every authenticated
page depends on.

## Specs

| File | Covers |
|------|--------|
| `login.spec.ts` | Email/password sign-in via `/sign-in` → redirect to `/dashboard`; invalid credentials show an inline error and stay on `/sign-in`. |
| `navigation.spec.ts` | Sign-in page loads; unauthenticated visits to a guarded route (`/dashboard`) redirect to `/sign-in`; unknown routes render the 404 page; `/unauthorized` is reachable without auth; header/sidebar chrome renders once authenticated. |
| `smoke.spec.ts` | Fast critical-path net — sign-in form renders, login + dashboard chrome, one guarded-route redirect check, 404 rendering. |

## Tagging convention

Tests are tagged using Playwright's `tag` option (`test('name', { tag: '@smoke' }, async (...) => {...})`), not `test.describe` prefixes, so tags can be combined with `--grep` / `--grep-invert`.

- **`@smoke`** — fast critical-path net. Run on every deploy/PR check; must stay green and fast.
- **`@regression`** — deeper flow coverage (every spec in this directory except `smoke.spec.ts`). Run before releases.
- **`@flaky`** — additive tag for a test proven unstable in CI, e.g. `test('name', { tag: ['@regression', '@flaky'] }, ...)`. Excluded from `test:e2e:regression` via `--grep-invert @flaky`; run in isolation via `--grep @flaky` for triage. No test in this suite is currently tagged `@flaky` — this is a convention reserved for future use, not a current state.

## Running

```bash
# From apps/web-backoffice/ (or with: pnpm --filter @repo/web-backoffice <script>)

pnpm test:e2e                     # all specs, auto-starts a local dev server
pnpm test:e2e:smoke               # @smoke only
pnpm test:e2e:regression          # @regression, excluding @flaky
pnpm test:e2e:headed              # headed browser
pnpm test:e2e:debug               # Playwright inspector

# Single spec / project
pnpm exec playwright test e2e/login.spec.ts
pnpm exec playwright test --project=chromium --project=mobile-chrome
```

## Configuration

[`playwright.config.ts`](../playwright.config.ts):

- **Base URL** — `E2E_BASE_URL` if set, else `http://localhost:5174`.
- **Local server** — a Vite dev server is managed automatically *unless*
  `E2E_BASE_URL` is set (dual-mode: local dev vs. a deployed environment).
- **Credentials** — copy [`e2e/.env.e2e.example`](.env.e2e.example) to
  `e2e/.env.e2e.local` (gitignored) and set `E2E_USER_EMAIL` /
  `E2E_USER_PASSWORD`. This app has **no public self-registration** — the test
  account must be an existing backoffice user (staff or superadmin access),
  not a regular quiz-taking user account from `web-app`.
- **Projects** — `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 5).

## Conventions

- Prefer accessibility-first locators (`getByRole`, `getByText`) and stable
  `data-*` attributes (`data-sidebar="trigger"`); use CSS only for structural
  elements (`header`, form field IDs like `#bo-email`).
- Log in via the shared `loginWithEmail(page)` helper
  (`e2e/helpers/auth.ts`) — never duplicate the sign-in form fill/submit
  sequence inline.
- No hard waits (`waitForTimeout`) — rely on Playwright auto-waiting and
  `expect(...).toHaveURL(...)` for redirects.
- Assert chrome (header, sidebar trigger) rather than sidebar-panel visibility
  directly — on mobile viewports the sidebar renders as a closed Sheet and
  isn't in the accessibility tree until toggled.

## Scope

These tests are a **smoke + routing + auth** net, not full regression.
Deliberately not automated yet:

- Superadmin-only route access (`/staff`, `/audit`, `/help/api-docs`) — needs
  a superadmin-specific test account distinct from the staff account used
  here, since `SuperAdminGuard` gates on role, not just backoffice membership.
- CRUD flows on `/projects` and `/users` (create/edit/delete).
- CSV export from `/results` / `/analytics`.
