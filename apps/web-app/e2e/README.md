# web-app — End-to-End Tests

Playwright end-to-end tests for the authenticated app (`@repo/web-app`). They
run against a **running app** — either a local Vite dev server or a deployed
URL (e.g. staging) — and verify sign-in, routing, guarded routes, and the
shared chrome the authenticated experience depends on.

## Specs

| File | Covers |
|------|--------|
| `smoke.spec.ts` | Fast critical-path net — sign-in form renders, login reaches `/dashboard` with chrome visible, one guarded-route redirect, 404 page. |
| `login.spec.ts` | Email/password login reaches the dashboard welcome state; system-admin access to `/admin`. |
| `navigation.spec.ts` | Cross-route navigation — sign-in page 200, 404 page, guarded redirects for `/quiz`, `/admin`, `/results`, sign-in form visible on `/`. |
| `auth-action.spec.ts` | `/auth/action` password-reset flow — error card with no `oobCode`, form with a valid `oobCode`, and that the route is allowed unauthenticated (no redirect). |
| `cookie-consent.spec.ts` | Cookie consent banner + settings dialog, and Consent Mode v2 `gtag` signal wiring (default-denied, accept-all, partial consent, replay on reload, URL handoff params). |
| `theme.spec.ts` | Theme resolution and persistence (`fss-theme` in `localStorage`) across system/light/dark. Note: `lib/theme.tsx` only ever toggles a `dark` class (Tailwind class-strategy dark mode) — light mode is the *absence* of that class, not a literal `"light"` class. |
| `a11y.spec.ts` | Document title, image `alt` attributes, keyboard focus reachability, cookie-toggle ARIA `role="switch"`, minimum base font size (17px). |

## Running

```bash
# From apps/web-app/ (or with: pnpm --filter @repo/web-app <script>)

pnpm test:e2e                     # all specs, auto-starts a local dev server
pnpm test:e2e:smoke               # --grep @smoke — fast critical-path net
pnpm test:e2e:regression          # --grep @regression --grep-invert @flaky — full non-smoke coverage
pnpm test:e2e:headed              # headed browser
pnpm test:e2e:debug               # Playwright inspector

# Single spec
npx playwright test e2e/smoke.spec.ts
npx playwright test e2e/login.spec.ts --project=chromium
```

### Against a deployed URL (no local server)

Set `E2E_BASE_URL` to target a remote origin. When it is set, no local dev
server is started — tests hit the deployed app directly.

```bash
E2E_BASE_URL=https://app-staging.factorysyncsolutions.com \
  npx playwright test --project=chromium
```

## Tagging convention

Every test carries a tag as the second argument to `test(...)`:

- **`@smoke`** — the fast critical-path net in `smoke.spec.ts`. Sign-in
  renders, login succeeds, one guarded route, 404. Runs in seconds; safe to
  gate a deploy on.
- **`@regression`** — deeper flow coverage. All tests outside `smoke.spec.ts`
  currently carry this tag. Run via `pnpm test:e2e:regression`, which excludes
  `@flaky`.
- **`@flaky`** — additive, combined with `@regression` (e.g.
  `{ tag: ['@regression', '@flaky'] }`), for a test that has proven unstable.
  Excluded from the blocking `test:e2e:regression` run via `--grep-invert
  @flaky`; runnable in isolation for triage/quarantine via
  `npx playwright test --grep @flaky`. No test is currently tagged `@flaky` —
  this is a convention for future use, not a current state.

```ts
test('does something', { tag: '@smoke' }, async ({ page }) => { ... });
test('does something deeper', { tag: '@regression' }, async ({ page }) => { ... });
test('proven unstable', { tag: ['@regression', '@flaky'] }, async ({ page }) => { ... });
```

## Configuration

[`playwright.config.ts`](../playwright.config.ts):

- **Base URL** — `E2E_BASE_URL` if set, else `http://localhost:5173`.
- **Local server** — a Vite dev server (`npm run dev`) is managed
  automatically *unless* `E2E_BASE_URL` is set.
- **Credentials** — copy `e2e/.env.e2e.example` to `e2e/.env.e2e.local`
  (gitignored) and fill in `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` for an
  existing registered test account. Loaded via `dotenv` in
  `playwright.config.ts`; consumed by `loginWithEmail()`.
- **Projects** — `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 5).
- **CI** — serial (`workers: 1`), `retries: 2`, trace on first retry,
  screenshot on failure, GitHub reporter.

## Conventions

- Prefer accessibility-first locators (`getByRole`, `getByText`, `getByTestId`
  for elements without a semantic role); use CSS only for structural elements
  (`header`, `footer`, `html`).
- No hard waits (`waitForTimeout`) — rely on Playwright auto-waiting and
  `expect(...).toHaveURL(...)` for redirects.
- Reuse the `loginWithEmail()` helper (`e2e/helpers/auth.ts`) for any test
  that needs an authenticated session — don't re-implement the login flow
  inline.

## Scope

This is smoke + regression coverage of the authenticated flows (sign-in,
dashboard access, route guards, cookie consent, theme, a11y basics) — not
full visual-regression or exhaustive accessibility auditing. `a11y.spec.ts`
checks a handful of concrete, deterministic assertions (title, image `alt`
attributes, one keyboard-focus check, ARIA `role="switch"` on the cookie
toggles, minimum base font size) — it is not an automated axe-core scan, and
does not cover full WCAG conformance, color contrast, or screen-reader
behavior. Quiz-taking and results flows are not yet covered by this suite.
