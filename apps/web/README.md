# Factory Health Check — Web

React SPA for the Factory Health Check assessment platform. Factory operators complete a diagnostic quiz, receive a health score with per-dimension breakdown, and get actionable recommendations.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router 7 |
| State | Redux Toolkit |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix primitives) |
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
src/
├── components/
│   ├── ui/            # shadcn/ui primitives (Button, Card, Dialog, etc.)
│   ├── form/          # Custom form components (native-select)
│   ├── guards/        # Route guards (AuthGuard, RegisterGuard, AdminGuard)
│   ├── Layout.tsx     # App shell: header, nav, footer, theme/locale switchers
│   ├── CookieConsent.tsx
│   ├── LegalModal.tsx
│   ├── ProfileDialog.tsx
│   └── Turnstile.tsx
├── hooks/
│   └── useAuth.ts     # Firebase auth state listener
├── lib/
│   ├── api.ts         # HTTP client
│   ├── analytics.ts   # GTM/GA4 event tracking
│   ├── dayjs.ts       # Date formatting
│   ├── firebase.ts    # Firebase config
│   ├── i18n.tsx       # Locale provider (TH/EN)
│   ├── theme.tsx      # Theme provider (light/dark/system)
│   └── utils.ts       # cn() merge helper
├── pages/
│   ├── LandingPage.tsx
│   ├── RegisterPage.tsx
│   ├── QuizPage.tsx
│   ├── ResultPage.tsx
│   ├── AdminPage.tsx
│   ├── ProfilePage.tsx
│   └── NotFoundPage.tsx
├── store/
│   ├── index.ts       # Redux store
│   ├── authSlice.ts
│   ├── quizSlice.ts
│   └── resultSlice.ts
├── router.tsx
├── App.tsx
├── main.tsx
└── index.css          # Tailwind base + CSS theme variables
```

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
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_API_BASE_URL` | API base URL (empty = Vite proxy to `localhost:8080`) |
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
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint with Biome |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:e2e` | Run E2E tests (Playwright) |

## Theme System

The app supports **light**, **dark**, and **system** themes:

- Theme preference is stored in `localStorage` (`fhc-theme`)
- An inline script in `index.html` applies the theme class before first paint to prevent flash
- `ThemeProvider` in `src/lib/theme.tsx` manages runtime theme switching
- All colors use CSS custom properties defined in `src/index.css`
- Use semantic Tailwind tokens (`bg-background`, `bg-card`, `text-foreground`, etc.) — avoid hardcoded colors like `bg-white`

## i18n

Built-in Thai (default) and English support via `LocaleProvider`. Use the `t()` function from `useLocale()` hook for all user-facing strings. Locale is stored in `localStorage` (`fhc-locale`).

## Routes

| Path | Page | Guard |
|---|---|---|
| `/` | Landing | Public |
| `/register` | Registration | Auth |
| `/quiz` | Assessment quiz | Auth + Registered |
| `/results` | Score & recommendations | Auth + Registered |
| `/admin` | Admin dashboard | Auth + Admin role |
