# fs-backoffice-web

Internal backoffice for FactorySync Solutions. Restricted to users with a Firebase custom claim `backofficeRole` of `staff` or `superadmin`; staff management, audit search, and API docs are additionally gated to `superadmin`.

**Stack:** React 19 · React Router 7 · Redux Toolkit · shadcn/ui · Tailwind CSS v4 · Vite · TypeScript · Firebase Auth · Biome · Vitest

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
VITE_PROXY_TARGET=http://localhost:8080   # fs-backend dev server
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
