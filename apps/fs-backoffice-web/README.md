# fs-backoffice-web

Internal backoffice for FactorySync Solutions. Restricted to users with the `backoffice` role; the Staff page is additionally gated to `super_admin`.

**Stack:** React 19 · React Router 7 · Redux Toolkit · shadcn/ui · Tailwind CSS v4 · Vite · TypeScript · Firebase Auth · Biome · Vitest

---

## Routes

| Path | Guard | Description |
|---|---|---|
| `/sign-in` | — | Firebase sign-in |
| `/dashboard` | auth + backoffice | Overview dashboard |
| `/projects` | auth + backoffice | Project list |
| `/projects/:projectID` | auth + backoffice | Project detail |
| `/users` | auth + backoffice | User management |
| `/results` | auth + backoffice | Assessment results |
| `/staff` | auth + backoffice + super_admin | Staff management |

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

Or run everything from the repo root with `make dev` / `make lint` / `make test`.

---

## Access Control

Three route guards layer access:

- **AuthGuard** — must be signed in via Firebase Auth
- **BackofficeGuard** — Firebase custom claim `role === "backoffice"` (or `super_admin`)
- **SuperAdminGuard** — Firebase custom claim `role === "super_admin"` only

Access is set by the backend admin service; contact a super admin to request backoffice access.
