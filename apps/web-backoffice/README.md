<div align="center">

<img src="../../packages/shared/brand/fs-light.png#gh-light-mode-only" alt="FactorySync Solutions logo" width="110" />
<img src="../../packages/shared/brand/fs-dark.png#gh-dark-mode-only" alt="FactorySync Solutions logo" width="110" />

# FactorySync Solutions — Backoffice

**The internal staff console.** `@repo/web-backoffice`

React SPA for platform operators — project management, user and staff administration, assessment
results, and audit search. Gated by the Firebase custom claim `backofficeRole` (`staff` or
`superadmin`); staff management, audit, and API docs require `superadmin`.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)

[← Monorepo root](../../README.md) · [Routes](#routes) · [Getting Started](#getting-started) · [Commands](#commands) · [Access Control](#access-control)

</div>

---

## Routes

| Path | Guard | Description |
|---|---|---|
| `/` | — | Redirects to `/dashboard` |
| `/sign-in` | — | Firebase sign-in |
| `/unauthorized` | — | Access denied page |
| `/dashboard` | auth + `backofficeRole` | Overview dashboard |
| `/profile` | auth + `backofficeRole` | Signed-in staff profile |
| `/projects` | auth + `backofficeRole` | Project list |
| `/projects/:projectID` | auth + `backofficeRole` | Project detail |
| `/users` | auth + `backofficeRole` | User management |
| `/results` | auth + `backofficeRole` | Assessment results |
| `/staff` | auth + `superadmin` | Staff management |
| `/audit` | auth + `superadmin` | Platform audit search |
| `/help/api-docs` | auth + `superadmin` | Internal Swagger/OpenAPI viewer |

---

## Source Layout

```
src/
├── pages/          # Route-level components
├── components/
│   ├── guards/     # AuthGuard, BackofficeGuard, SuperAdminGuard
│   └── ui/         # shadcn/ui components
├── store/          # Redux Toolkit (authSlice)
├── hooks/          # useAuth
└── lib/            # api.ts, firebase.ts, i18n.tsx, dayjs.ts, utils.ts
```

---

## Getting Started

**1. Copy env and fill in Firebase credentials:**

```bash
cp .env.example .env.local
```

Required variables:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=/api/v1
VITE_PROXY_TARGET=http://localhost:8080   # backend dev server
VITE_OFFICIAL_WEB_URL=https://www.factorysyncsolutions.com
```

**2. Install and run:**

```bash
npm install
npm run dev
```

The dev server proxies `/api` → `VITE_PROXY_TARGET` so the backend can run separately.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run build:staging` | Staging build |
| `npm run lint` | Biome check |
| `npm run lint:fix` | Biome check + auto-fix |
| `npm test` | Vitest (single run) |
| `npm run test:watch` | Vitest (watch) |
| `npm run deploy:staging` | Build + deploy to Cloudflare Pages (staging) |
| `npm run deploy:prod` | Build + deploy to Cloudflare Pages (production) |

Root `make` targets do not run the backoffice app; use the commands above from this directory.

---

## Access Control

Three route guards layer access:

- **AuthGuard** — must be signed in via Firebase Auth
- **BackofficeGuard** — Firebase custom claim `backofficeRole === "staff"` or `"superadmin"`
- **SuperAdminGuard** — Firebase custom claim `backofficeRole === "superadmin"` only

Access is set by backend superadmin-only staff endpoints; contact a super admin to request backoffice access.
