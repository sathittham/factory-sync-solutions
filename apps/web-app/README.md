<div align="center">

<img src="../../packages/shared/brand/fs-light.png#gh-light-mode-only" alt="FactorySync Solutions logo" width="110" />
<img src="../../packages/shared/brand/fs-dark.png#gh-dark-mode-only" alt="FactorySync Solutions logo" width="110" />

# FactorySync Solutions — App

**The authenticated assessment app.** `@repo/web-app`

React SPA where factory operators complete a diagnostic quiz, receive a health score with a
per-dimension spider chart, and get actionable recommendations.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)

[← Monorepo root](../../README.md) · [Tech Stack](#tech-stack) · [Structure](#project-structure) · [Scripts](#scripts) · [Testing](#testing) · [Routes](#routes)

</div>

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | React Router 7 (`react-router`) |
| State | Redux Toolkit |
| Styling | Tailwind CSS 4 (CSS-config) + shadcn/ui (Radix primitives) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | Motion |
| Auth | Firebase Auth (Google sign-in) |
| Bot protection | Cloudflare Turnstile |
| Analytics | GTM + GA4 |
| i18n | Custom context (Thai / English) |
| Linting | Biome |
| Testing | Vitest + Testing Library, Playwright (E2E) |

## Project Structure

```
apps/web-app/
└── src/
    ├── components/
    │   ├── ui/            # shadcn/ui primitives (Button, Card, Dialog, etc.)
    │   ├── form/          # select-field.tsx (shadcn Select + react-hook-form)
    │   ├── guards/        # Route guards (AuthGuard, RegisterGuard, AdminGuard, CompanySettingsGuard)
    │   ├── Layout.tsx     # App shell: header, nav, footer, theme/locale switchers
    │   ├── motion.tsx     # Motion animation wrappers
    │   ├── CookieConsent.tsx
    │   ├── LegalModal.tsx
    │   ├── ProfileDialog.tsx
    │   └── Turnstile.tsx
    ├── hooks/
    │   └── useAuth.ts     # Firebase auth state listener
    ├── lib/
    │   ├── api.ts         # HTTP client
    │   ├── analytics.ts   # GTM/GA4 event tracking
    │   ├── dayjs.ts       # Date formatting (Buddhist Era for Thai)
    │   ├── firebase.ts    # Firebase config
    │   ├── i18n.tsx       # Locale provider (TH/EN)
    │   ├── theme.tsx      # Theme provider (light/dark/system)
    │   └── utils.ts       # cn() merge helper
    ├── pages/
    │   ├── SignInPage.tsx     # index route (sign-in / landing)
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── QuizPage.tsx
    │   ├── ResultPage.tsx
    │   ├── AdminPage.tsx
    │   ├── AuthActionPage.tsx
    │   ├── CompanySettingsPage.tsx
    │   ├── ProfilePage.tsx
    │   └── NotFoundPage.tsx
    ├── store/
    │   ├── index.ts       # Redux store
    │   ├── authSlice.ts
    │   ├── quizSlice.ts
    │   └── resultSlice.ts
    ├── test/setup.ts      # Vitest + Testing Library setup
    ├── router.tsx
    ├── App.tsx
    ├── main.tsx
    └── index.css          # Tailwind 4 base + CSS theme variables
```

> Unit tests live alongside their source (`*.test.ts`) — e.g. `store/quizSlice.test.ts`, `lib/utils.test.ts`.

## Getting Started

### Prerequisites

- Node.js 20+
- npm (comes with Node)

### Install

```bash
npm install
```

### Environment

Copy the example and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase public API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket from project settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_BASE_URL` | API base URL (empty = Vite proxy to `localhost:8080`) |
| `VITE_OFFICIAL_WEB_URL` | Official website URL for legal and marketing links |
| `VITE_CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `VITE_GTM_ID` | Google Tag Manager container ID |
| `VITE_GA_MEASUREMENT_ID` | GA4 measurement ID |

### Development

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). API requests to `/api` are proxied to `localhost:8080`.

### Build

```bash
npm run build
```

Output goes to `dist/`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Sync favicon, then start dev server |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run build:staging` | Type-check + build with `--mode staging` |
| `npm run preview` | Preview production build locally |
| `npm run deploy:staging` | Build (staging) + deploy to Cloudflare Pages (`factory-sync-solutions-staging`) |
| `npm run deploy:prod` | Build + deploy to Cloudflare Pages (`factory-sync-solutions`) |
| `npm run lint` | Lint with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests (Playwright, headless) |
| `npm run test:e2e:headed` | Run E2E tests with visible browser |
| `npm run test:e2e:debug` | Run E2E tests with Playwright inspector |
| `npm run sync:favicon` | Copy shared favicon into `public/` |

## Testing

### Unit Tests (Vitest)

```bash
npm test                  # run once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

Unit tests use Vitest + React Testing Library + jsdom. Test files live alongside source files (`*.test.ts`).

### E2E Tests (Playwright)

**First-time setup:**

```bash
npx playwright install    # download Chromium, Firefox, WebKit
```

**Run tests:**

```bash
npm run test:e2e          # headless (all browsers)
npm run test:e2e:headed   # with visible browser
npm run test:e2e:debug    # with Playwright inspector
```

E2E specs live in the `e2e/` directory: `a11y.spec.ts`, `cookie-consent.spec.ts`, `landing.spec.ts`, `navigation.spec.ts`, `theme.spec.ts`. Components expose `data-testid` attributes for stable selectors:

| Test ID | Component |
|---|---|
| `signin-google-btn` | Google sign-in button |
| `cookie-settings-btn` | Cookie consent settings |
| `cookie-accept-all-btn` | Cookie accept all |
| `cookie-confirm-btn` | Cookie confirm selection |
| `nav-profile-btn` / `nav-profile-link` / `nav-profile-summary` | Header profile nav |
| `registration-form` / `registration-submit-btn` | Registration form |
| `reg-company-id-input` | Registration company ID |
| `reg-dbd-lookup-btn` | DBD lookup button |
| `profile-dialog` / `profile-form` / `profile-submit-btn` | Profile dialog |
| `quiz-stepper` / `quiz-question-card` | Quiz progress & question |
| `quiz-prev-btn` / `quiz-next-btn` / `quiz-submit-btn` | Quiz navigation |
| `result-summary` / `result-spider-chart` | Result summary & chart |
| `result-strengths-panel` / `result-weaknesses-panel` | Result strengths / weaknesses |
| `admin-export-csv-btn` (+ `-mobile`) | Admin CSV export |
| `admin-filter-industry` | Admin industry filter |
| `admin-filter-size` | Admin company size filter |
| `admin-filter-role` | Admin role filter |
| `admin-assessment-table` | Admin assessment table |
| `admin-users-table` | Admin users table |
| `admin-role-confirm-btn` | Admin role change confirm |
| `admin-role-cancel-btn` | Admin role change cancel |

## Theme System

The app supports **light**, **dark**, and **system** themes:

- Theme preference is stored in `localStorage` (`fss-theme`)
- An inline script in `index.html` applies the theme class before first paint to prevent flash
- `ThemeProvider` in `src/lib/theme.tsx` manages runtime theme switching
- All colors use CSS custom properties defined in `src/index.css`
- Use semantic Tailwind tokens (`bg-background`, `bg-card`, `text-foreground`, etc.) — avoid hardcoded colors like `bg-white`

## i18n

Built-in Thai (default) and English support via `LocaleProvider`. Use the `t()` function from `useLocale()` hook for all user-facing strings. Locale is stored in `localStorage` (`fss-locale`).

## Routes

Defined in [`src/router.tsx`](src/router.tsx):

| Path | Page | Guard |
|---|---|---|
| `/` | Sign-in / landing | Public |
| `/auth/action` | Firebase auth action handler | Public |
| `/register` | Registration | Auth |
| `/quiz` | Assessment quiz | Auth + Registered |
| `/results` | Score & recommendations | Auth + Registered |
| `/dashboard` | Assessment dashboard | Auth + Registered |
| `/profile` | Profile page | Auth + Registered |
| `/company-settings` | Company settings | Auth + Registered + Company role |
| `/admin` | Admin dashboard | Auth + Admin role |
| `*` | Not found | Public |

`ProfileDialog` is also mounted in the app shell for profile edits from navigation.
