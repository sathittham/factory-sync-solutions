# web-official — End-to-End Tests

Playwright end-to-end tests for the public marketing site (`@repo/web-official`).
They run against a **running site** — either a local Astro dev server or a
deployed URL (e.g. staging) — and verify routing, rendering, and the shared
chrome (header/footer) that every page depends on.

For the full test strategy (unit + e2e, coverage, gaps) see
[`docs/product/official-site/test-plan.md`](../../../docs/product/official-site/test-plan.md).

## Specs

| File | Covers |
|------|--------|
| `landing.spec.ts` | Landing page — all section anchors render, footer, `<title>`, sign-in link, and locale switch (TH ⇄ EN) via the desktop Settings menu. |
| `navigation.spec.ts` | Cross-route navigation and HTTP status (`/`, `/knowledge`, 404, logo → home). |
| `smoke.spec.ts` | Site-wide smoke — every route family (landing, about, contact, knowledge, legal, services incl. dynamic `group/child`) returns 200 with header + footer. Knowledge article/category/tag URLs are derived from the hub, so it runs against seeded content and skips gracefully when empty. |

## Running

```bash
# From apps/web-official/ (or with: pnpm --filter @repo/web-official <script>)

pnpm test:e2e                     # all specs, auto-starts a local dev server
pnpm test:e2e:ui                  # interactive Playwright UI mode
pnpm test:e2e:install             # one-time: install browser binaries

# Single spec / project
pnpm exec playwright test e2e/smoke.spec.ts
pnpm exec playwright test --project=chromium --project=mobile-chrome
```

### Against a deployed URL (no local server)

Set `PLAYWRIGHT_BASE_URL` to target a remote origin. When it is set, no local
dev server is started — tests hit the deployed site directly.

```bash
PLAYWRIGHT_BASE_URL=https://staging.factorysyncsolutions.com \
  pnpm exec playwright test --project=chromium --project=mobile-chrome
```

## Configuration

[`playwright.config.ts`](../playwright.config.ts) (one level up):

- **Base URL** — `PLAYWRIGHT_BASE_URL` if set, else `http://localhost:4321`.
- **Local server** — an Astro dev server is managed automatically *unless*
  `PLAYWRIGHT_BASE_URL` is set.
- **Projects** — `chromium`, `firefox`, `webkit`, `mobile-chrome` (Pixel 5).
  The CI post-deploy gate runs `chromium` + `mobile-chrome` only.
- **CI** — serial (`workers: 1`), `retries: 2`, trace on first retry, screenshot
  on failure, and an HTML report (`playwright-report/`) uploaded as an artifact.

## CI — runs after the staging deploy

The `e2e-official` job in
[`.github/workflows/deploy-staging.yml`](../../../.github/workflows/deploy-staging.yml)
runs this suite against the deployed staging site whenever `web-official` is
part of a `v*-staging` release:

1. `deploy-official` publishes the site to Cloudflare Pages.
2. `e2e-official` polls the staging URL until it returns 200.
3. Playwright runs against `PLAYWRIGHT_BASE_URL=https://staging.factorysyncsolutions.com`.
4. A failure fails the deploy and is reported to Slack; the HTML report is
   uploaded as `playwright-report-official`.

## Conventions

- Prefer accessibility-first locators (`getByRole`, `getByText`); use CSS only
  for structural elements (`header`, `footer`, `#hero`).
- No hard waits (`waitForTimeout`) — rely on Playwright auto-waiting. The nav is
  a `client:load` island, so interactions that depend on hydration retry until
  the target appears (see `switchToEnglish` in `landing.spec.ts`).
- Desktop-only controls are skipped on mobile with an explicit
  `test.skip(isMobile, …)` and a reason.
- Keep dynamic-route tests environment-robust: derive real URLs from a listing
  page instead of hardcoding CMS slugs.

## Scope

These tests are a **smoke + routing** net, not full regression. Deliberately not
automated yet (tracked in the test plan): contact-form + Turnstile submission,
cookie-consent flow, theme-toggle persistence, and content-depth assertions on
services/knowledge detail pages.
