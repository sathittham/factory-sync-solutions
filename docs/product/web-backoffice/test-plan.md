---
isoOutput: SI.O4 / SI.O5
version: 1.3.0
lastUpdated: 2026-07-05
---

# Test Plan — Backoffice Admin App (`web-backoffice`)

*ISO 29110 Basic Profile · SI.O4 Unit Test Documentation + SI.O5 Integration Test Documentation*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | Internal admin/backoffice app — `apps/web-backoffice` (React 19 + Redux Toolkit + `react-router` + Firebase Auth, staff/superadmin roles) |
| **Version** | 1.0.0 |
| **Status** | Active |
| **Author** | Sathittham (Phoo) |
| **Date** | 2026-07-05 |
| **SRS Reference** | N/A — this app was built incrementally across many features, each with its own SRS under `docs/product/<feature>/feature-spec.md` (e.g. `bo-analytics-menu`, `bo-upload-utility`, `audit`). This plan documents the app's test suite as a whole, not one feature. |
| **SDD Reference** | [CLAUDE.md](../../../CLAUDE.md) — project structure and layer conventions |

---

## 1. Test Scope

### 1.1 In Scope
- **Unit tests** (Vitest + jsdom + Testing Library): `apps/web-backoffice/src/**/*.test.{ts,tsx}` (41 files, previously 11)
  - Route guards: `AuthGuard`, `BackofficeGuard`, `SuperAdminGuard`
  - Redux store: `authSlice`, `store/index`
  - Library modules: `api`, `cmsSso`, `dayjs`, `firebase`, `i18n`, `theme`, `utils`
  - API client: `src/api/backoffice.ts` (full `backofficeApi` surface — projects, users, staff, audit, results, analytics, uploads)
  - Hooks: `useAuth`, `use-mobile`
  - Pages: `SignInPage`, `DashboardPage`, `AnalyticsPage`, `ProfilePage`, `ProjectsPage`, `ProjectDetailPage`, `UsersPage`, `ResultsPage`, `StaffPage`, `AuditPage`, `ApiDocsPage`, `UploadUtilityPage`, `UnauthorizedPage`, `NotFoundPage`
  - Feature components: `Layout`, `Sidebar`, `AuditActivityDialog`, `AppDebugPanel`, plus the pre-existing `components/analytics/**` suite
- **End-to-end tests** (Playwright): `apps/web-backoffice/e2e/*.spec.ts` (4 files — this app had zero e2e infrastructure before this test plan)
  - Smoke: sign-in form, login → dashboard chrome, one guarded-route redirect, 404
  - Regression: login (happy path + invalid credentials), navigation (guard redirects, 404, `/unauthorized` reachability, authenticated chrome), superadmin-only route reachability for superadmin **and** the non-superadmin-staff redirect (`/staff`, `/audit`, `/help/api-docs`)

### 1.2 Out of Scope
- Backend API, Firestore, Firebase Admin — validated in `apps/backend`.
- Third-party SDK internals (Firebase client SDK) — mocked at the boundary.
- shadcn/ui primitives under `src/components/ui/**` — excluded from the coverage gate (thin Radix wrappers).
- Thin composition/wiring files — `App.tsx`, `router.tsx` — excluded from the coverage gate as declarative wiring, not logic.
- Full CRUD e2e coverage on projects/users (create/edit/deactivate/delete flows) and CSV export — covered at the unit level (page tests mock the API layer and assert these flows), not yet driven through a real browser end-to-end.

### 1.3 Test Environment
| Environment | Details |
|---|---|
| Unit | `pnpm --filter @repo/web-backoffice test` (Vitest + jsdom). Global setup in `src/test/setup.ts` (`@testing-library/jest-dom`, `matchMedia` stub, `__APP_VERSION__` stub) — new as of this test plan; consolidates the per-file `// @vitest-environment jsdom` pragma previously used by the original 11 test files. |
| Coverage | `pnpm --filter @repo/web-backoffice test:coverage` (v8, `all: true` over `src/**`, hard-enforced 70% gate on statements/branches/functions/lines) — new as of this test plan; this app previously had no `coverage` config at all. |
| E2E (local) | `pnpm --filter @repo/web-backoffice test:e2e` — auto-starts a local Vite dev server on `localhost:5174`. Requires `e2e/.env.e2e.local` (copy from `.env.e2e.example`) with `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` for a staff/superadmin backoffice account (no public self-registration exists for this app). |
| E2E (deployed) | `E2E_BASE_URL=https://backoffice-staging.factorysyncsolutions.com playwright test` — no local server. |
| E2E subsets | `pnpm test:e2e:smoke` (`--grep @smoke`) · `pnpm test:e2e:regression` (`--grep @regression --grep-invert @flaky`). |
| Browsers | Local: chromium, firefox, webkit, mobile-chrome. |

---

## 2. Unit Test Cases (SI.O4)

Representative cases per area (see each `*.test.{ts,tsx}` file for the full assertion set — 274 tests total across 41 files).

| ID | Test Name | Module | Precondition | Action | Expected Result | Status |
|---|---|---|---|---|---|---|
| UT-B01 | Redirects unauthenticated visitor to `/sign-in` | `AuthGuard` | No auth session | Render behind guard | Redirect to `/sign-in` (not `/`, unlike `web-app`) | ✅ |
| UT-B02 | Blocks non-backoffice role | `BackofficeGuard` | Authenticated, no backoffice role | Render behind guard | Redirect to `/unauthorized` | ✅ |
| UT-B03 | Restricts superadmin-only content to superadmin | `SuperAdminGuard` | Authenticated staff (non-superadmin) | Render behind guard | Redirect to `/unauthorized`; superadmin role renders children | ✅ |
| UT-B04 | Resolves superadmin/staff claim on login | `useAuth` | Firebase user + custom claims | `onAuthStateChanged` fires, `getIdTokenResult` | Redux role state set correctly; cleared on claim-fetch rejection | ✅ |
| UT-B05 | `backofficeApi` builds correct URL/verb/payload for every method | `src/api/backoffice.ts` | Mocked `@/lib/api` | Call each exported method | Correct HTTP verb, path, query-string branches (`isActive`, `projectID`, pagination), and body; `exportCSV`'s Bearer-token vs. signed-out branch both covered | ✅ |
| UT-B06 | Superadmin-gated project deactivate/reactivate | `ProjectDetailPage` | Superadmin vs. staff role | Click deactivate/reactivate | Action available only for superadmin; API called correctly | ✅ |
| UT-B07 | Add-staff validation + disabled submit while email empty | `StaffPage` | Empty/invalid email input | Type, submit | Submit button disabled until non-empty; invalid format rejected; 403 handled | ✅ |
| UT-B08 | CSV export success + failure | `ResultsPage` | Mocked export call | Click export | Success downloads via a stubbed anchor click; failure shows error | ✅ |
| UT-B09 | Nav items gated by `isSuperAdmin`; active-route highlighting | `Sidebar` | Various roles/routes | Render | Admin section hidden for staff; `data-active` reflects current + nested routes | ✅ |
| UT-B10 | Breadcrumb resolves async project name with fallback | `Layout` | Route with `:projectID` | Mount | Breadcrumb shows resolved name; falls back gracefully on fetch failure | ✅ |
| UT-B11 | Sign-in error/loading/reset-password/Google flows | `SignInPage` | Various auth outcomes | Submit / click Google / reset | Correct error/loading states; cancelled-Google-popup handled without error toast | ✅ |

### 2.1 Shared Test Fixtures
- `src/test/setup.ts` — imports `@testing-library/jest-dom/vitest`, stubs `globalThis.__APP_VERSION__`, and installs a default `window.matchMedia` stub (`matches: false`) for the theme system, matching the pattern already used in `web-app`/`web-official`.
- Route-aware tests (guards, `Sidebar`, `Layout`, `ProjectDetailPage`) wrap with `MemoryRouter`/`Routes`/`Route` from `react-router` (this app's routing library — not `react-router-dom`).

---

## 3. Integration / End-to-End Test Cases (SI.O5)

### 3.1 End-to-End (Playwright) — `e2e/*.spec.ts`

| ID | Scenario | Spec | Steps | Expected | Status |
|---|---|---|---|---|---|
| E2E-101 | Sign-in form renders | `smoke.spec.ts` | Load `/sign-in` | `#bo-email`/`#bo-password` visible | ✅ |
| E2E-102 | Login reaches dashboard with chrome | `smoke.spec.ts` | `loginWithEmail()` | Redirects to `/dashboard`; sidebar/header visible | ✅ |
| E2E-103 | Guarded route redirects unauthenticated visitor | `smoke.spec.ts` | `goto /dashboard` (no session) | Redirects to `/sign-in` | ✅ |
| E2E-104 | Unknown route renders 404 | `smoke.spec.ts` | `goto /not-a-page` | `404` heading + "Page not found" visible | ✅ |
| E2E-105 | Email/password login → dashboard | `login.spec.ts` | Fill `#bo-email`/`#bo-password`, submit | Redirect to `/dashboard` | ✅ |
| E2E-106 | Invalid credentials show inline error | `login.spec.ts` | Submit wrong password | `p.text-destructive` error visible; stays on `/sign-in` | ✅ |
| E2E-107 | Sign-in page reachable unauthenticated | `navigation.spec.ts` | `goto /sign-in` | Form renders | ✅ |
| E2E-108 | Guarded route redirect | `navigation.spec.ts` | `goto /dashboard` (no session) | Redirects to `/sign-in` | ✅ |
| E2E-109 | Unknown route 404 | `navigation.spec.ts` | `goto /not-a-page` | 404 content visible | ✅ |
| E2E-110 | `/unauthorized` reachable without auth | `navigation.spec.ts` | `goto /unauthorized` (no session) | Card content renders (no redirect loop) | ✅ |
| E2E-111 | Authenticated chrome (sidebar trigger + header) | `navigation.spec.ts` | Login, load `/dashboard` | `[data-sidebar="trigger"]` + header visible | ✅ |
| E2E-112 | Superadmin can reach `/staff` | `superadmin.spec.ts` | Login (superadmin), `goto /staff` | 200; "Staff" heading + "Add Staff" button visible | ✅ |
| E2E-113 | Superadmin can reach `/audit` | `superadmin.spec.ts` | Login (superadmin), `goto /audit` | 200; "Audit Log" heading + "Search" filter button visible | ✅ |
| E2E-114 | Superadmin can reach `/help/api-docs` | `superadmin.spec.ts` | Login (superadmin), `goto /help/api-docs` | 200; "API Docs" heading + "Swagger UI" viewer card visible | ✅ |
| E2E-115 | Staff cannot reach `/staff` | `superadmin.spec.ts` | Login (staff), `goto /staff` | Ends at `/dashboard` (see note³), chrome renders | ✅ |
| E2E-116 | Staff cannot reach `/audit` | `superadmin.spec.ts` | Login (staff), `goto /audit` | Ends at `/dashboard` (see note³), chrome renders | ✅ |
| E2E-117 | Staff cannot reach `/help/api-docs` | `superadmin.spec.ts` | Login (staff), `goto /help/api-docs` | Ends at `/dashboard` (see note³), chrome renders | ✅ |

³ `SuperAdminGuard` navigates a non-superadmin to `/unauthorized`, but `UnauthorizedPage` immediately bounces any signed-in *backoffice* user (staff included, not just superadmin) onward to `/dashboard` — so staff denied a superadmin-only route never actually see the `/unauthorized` card, they land on `/dashboard` instead. `/unauthorized`'s card is only shown to a non-backoffice visitor (E2E-110). Discovered running these tests for real; not an application bug — see §6 note.

**Tagging:** all `smoke.spec.ts` tests carry `{ tag: '@smoke' }`; `login.spec.ts`/`navigation.spec.ts`/`superadmin.spec.ts` carry `{ tag: '@regression' }`. No test is currently tagged `@flaky` (see `e2e/README.md` for the quarantine convention).

**Deliberately not automated** (documented gaps, §6): project/user/staff CRUD flows end-to-end, CSV export end-to-end, audit-log filtering end-to-end.

---

## 4. Coverage Targets

| Component | Target | Tool |
|---|---|---|
| `src/**` statements | ≥ 70% | Vitest v8 |
| `src/**` lines | ≥ 70% | Vitest v8 |
| `src/**` functions | ≥ 70% | Vitest v8 |
| `src/**` branches | ≥ 70% | Vitest v8 |
| E2E smoke | 100% of critical-path routes (sign-in, login→dashboard, one guard, 404) | Playwright |

Run: `pnpm --filter @repo/web-backoffice test:coverage` — thresholds are hard-enforced in `vitest.config.ts` (non-zero exit below 70%).

---

## 5. Test Results

| Run Date | Environment | Unit (Vitest) | Coverage (stmt/branch/func/line) | E2E (Playwright, listed) | Result |
|---|---|---|---|---|---|
| 2026-07-04 | Local | 53 passed / 11 files | Not measured — no coverage config existed | — | Baseline |
| 2026-07-05 | Local | **274 passed / 41 files** | **88.97% / 78.11% / 85.49% / 91.72%** | 11 unique tests / 3 specs (4 smoke + 7 regression) | ✅ Pass |
| 2026-07-05 | Staging¹ | — | — | 11/11 passed (chromium) — 4 smoke + 7 regression, executed for real against `https://backoffice-staging.factorysyncsolutions.com` | ✅ Pass |
| 2026-07-05 | Staging² | — | — | 14/14 passed (chromium + mobile-chrome, 28 total) — adds 3 superadmin-route regression cases, executed for real against `https://backoffice-staging.factorysyncsolutions.com` | ✅ Pass |
| 2026-07-05 | Staging³ | — | — | 17/17 passed (chromium + mobile-chrome, 34 total) — adds 3 non-superadmin-staff redirect cases using a newly-provisioned staff test account, executed for real against `https://backoffice-staging.factorysyncsolutions.com` | ✅ Pass |
| 2026-07-05 | Local⁴ | **304 passed / 41 files** | **92.69% / 82.91% / 90.84% / 94.99%** | — | ✅ Pass |

¹ First real (non-`--list`) e2e run, using a staff/superadmin test account (`dev@factorysyncsolutions.com`, promoted via `cmd/set-superadmin` on the staging Firebase project). Found and fixed one test bug: `navigation.spec.ts`'s `/unauthorized` case used a regex matching both the heading and body text (`getByText` strict-mode violation) — narrowed to `getByRole('heading', ...)`. No application bugs found.

² Adds `superadmin.spec.ts` (E2E-112–114), closing the positive-path half of the §6 superadmin-coverage gap. Passed on the first run — no fixes needed. `firefox`/`webkit` were not exercised locally (browsers not installed in this environment); this matches the chromium-only precedent of the prior staging run above.

³ Provisioned a staff-only (`backofficeRole=staff`) test account on the staging Firebase project via a generalized `cmd/set-superadmin --role staff --create` (see [database.md](../../architecture/database.md) / `cmd/set-superadmin`), closing the last §6 gap. First test-writing attempt asserted a redirect to `/unauthorized`, which failed for real — see the E2E-115–117 note³ above for what's actually happening and why the test was corrected instead of the app.

⁴ Adds targeted branch coverage on `ApiDocsPage.tsx` (70.58%→90.19% branch), `StaffPage.tsx` (63.33%→85% branch), and `UsersPage.tsx` (56.14%→84.21% branch), closing the §6 low-coverage gap. Remaining uncovered lines are defensive guard clauses unreachable through the UI (e.g. `handleDelete`'s `if (!deleteTarget) return`) — left uncovered rather than adding dead-code-only tests.

---

## 6. Known Gaps & Follow-ups

| Gap | Priority | Note |
|---|---|---|
| Project/user/staff CRUD and CSV export not driven end-to-end | Low | Covered at the unit level (mocked API layer); a real browser-driven flow against a seeded staging project would close this gap. |
| Staff denied a superadmin-only route see no error message | Low (product/UX) | `UnauthorizedPage` bounces any signed-in backoffice user (staff included) straight to `/dashboard`, so `SuperAdminGuard`'s `/unauthorized` redirect is invisible to staff in practice (see E2E-115–117 note in §3.1) — they land on the dashboard with no explanation. Not a security issue (they still can't reach the page), but worth a product decision on whether staff should see an explicit "you don't have access" message instead. |
| Accessibility (axe) + visual regression | Low | Not yet adopted repo-wide (same gap noted in `web-official`'s and `web-app`'s test plans). |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-07-05 | Sathittham (Phoo) | Initial test plan — documents web-backoffice's from-scratch test infrastructure (Vitest coverage gate, Playwright e2e suite), raised unit coverage (guards/store/lib/hooks/pages/components/API client), and smoke/regression/flaky e2e tagging convention |
| 1.1.0 | 2026-07-05 | Sathittham (Phoo) | Adds `superadmin.spec.ts` (E2E-112–114) covering superadmin reachability of `/staff`, `/audit`, `/help/api-docs`; narrows the §6 gap to the remaining non-superadmin redirect case, which needs a staff-only test account |
| 1.2.0 | 2026-07-05 | Sathittham (Phoo) | Provisions a staff-only e2e test account on staging (generalized `cmd/set-superadmin --role --create`), adds E2E-115–117 verifying staff are kept off superadmin-only routes, and documents that they land on `/dashboard` rather than seeing `/unauthorized` — closing the last §6 superadmin-coverage gap |
| 1.3.0 | 2026-07-05 | Sathittham (Phoo) | Raises `ApiDocsPage.tsx`/`StaffPage.tsx`/`UsersPage.tsx` branch coverage (56-64% → 84-90%) with targeted unit tests, closing the last remaining §6 gap besides the product/UX note |

---

*Version: 1.3.0*
*Last updated: 5 July 2026*
