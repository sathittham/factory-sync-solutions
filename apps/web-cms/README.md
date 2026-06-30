# FactorySync Blog CMS

A headless blog CMS built with [SonicJS](https://sonicjs.com) (`@sonicjs-cms/core` v3) on Cloudflare's edge platform (Workers + D1 + R2). It is deployed as a standalone Worker — see [Deployment](#deployment).

## Getting Started (local development)

### Prerequisites

- Node.js 18 or higher
- Wrangler CLI (installed as a dev dependency — no global install needed)
- A Cloudflare account is only required to **deploy**; local dev runs entirely on miniflare

### Installation

Local dev uses miniflare, so you don't need to provision remote D1/R2 first. The
top-level bindings in [`wrangler.toml`](./wrangler.toml) persist state under
`.wrangler/` locally.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Apply migrations to the local database:**
   ```bash
   npm run db:migrate:local
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open the admin UI:**
   Navigate to `http://localhost:8787/admin`.

To provision and deploy the staging/production Workers, see [Deployment](#deployment).

## Project Structure

```
web-cms/
├── src/
│   ├── collections/                  # Content type definitions
│   │   └── blog-posts.collection.ts
│   └── index.ts                      # Worker entry point — registers collections
├── scripts/
│   ├── setup-cloudflare.sh           # Idempotent per-env provisioning (cf:setup:*)
│   ├── seed-admin.ts                 # Seed local admin user
│   └── seed-admin-remote.mjs         # Seed remote (staging/prod) admin user
├── migrations/                       # Local D1 migrations (core migrations live in node_modules)
├── wrangler.toml                     # Worker + D1 + R2 config (dev / staging / production)
├── .dev.vars                         # Local-only secrets (git-ignored)
├── package.json
└── tsconfig.json
```

## Available Scripts

**Develop & test**
- `npm run dev` — Start the local dev server (miniflare)
- `npm run type-check` — Check TypeScript types (`tsc --noEmit`)
- `npm run test` / `npm run test:watch` — Run Vitest
- `npm run db:studio` — Open Drizzle Studio against the database

**Database migrations**
- `npm run db:migrate:local` — Apply migrations to the local DB
- `npm run db:migrate:staging` — Apply migrations to the remote staging DB
- `npm run db:migrate:prod` — Apply migrations to the remote production DB
- `npm run db:reset` — Interactive SonicJS DB reset (destructive)

**Deploy & provision**
- `npm run cf:setup:staging` / `npm run cf:setup:prod` — One-time idempotent provisioning
- `npm run deploy:staging` / `npm run deploy:prod` — Redeploy the Worker
- `npm run seed:staging` / `npm run seed:prod` — Seed the remote admin user

**Maintenance**
- `npm run update` — Update `@sonicjs-cms/core` to the latest release
- `npm run update:beta` — Update `@sonicjs-cms/core` to the latest beta

## Creating Collections

Collections define your content types. Create a new file in `src/collections/`,
then register it in [`src/index.ts`](./src/index.ts) so the app picks it up.

```typescript
// src/collections/products.collection.ts
import type { CollectionConfig } from '@sonicjs-cms/core'

export default {
  name: 'product',
  displayName: 'Product',
  slug: 'products',
  icon: '📦',

  schema: {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name', required: true },
      price: { type: 'number', title: 'Price', required: true },
      description: { type: 'lexical', title: 'Description' },
    },
    required: ['name', 'price'],
  },

  listFields: ['name', 'price'],
  managed: true,
  isActive: true,
  // Opt in to public read access (otherwise only authenticated users can read).
  access: { public: ['read'] },
} satisfies CollectionConfig
```

Then register it:

```typescript
// src/index.ts
import productsCollection from './collections/products.collection'

registerCollections([
  blogPostsCollection,
  productsCollection,
])
```

## API Access

Your collections are automatically available via REST API:

- `GET /api/content/blog-posts` - List all blog posts
- `GET /api/content/blog-posts/:id` - Get a single post
- `POST /api/content/blog-posts` - Create a post (requires auth)
- `PUT /api/content/blog-posts/:id` - Update a post (requires auth)
- `DELETE /api/content/blog-posts/:id` - Delete a post (requires auth)

## Deployment

This app deploys as a **Cloudflare Worker** (not Pages) with two environments —
`staging` (`factory-sync-cms-staging`) and `production` (`factory-sync-cms`) —
each backed by its own D1 database and R2 bucket. Config lives in
[`wrangler.toml`](./wrangler.toml); the Cloudflare account is pinned there
(`account_id`) and in `scripts/setup-cloudflare.sh`.

### One-time provisioning (per environment)

> Requires logging in as the account owner (`s.sathittham@gmail.com`).

```bash
npx wrangler login          # log in to the account that owns factory-sync-*
npm run cf:setup:staging    # create D1 + R2, migrate, set secret, deploy, seed admin
```

`cf:setup:*` is idempotent. It:

1. Creates the D1 database (if missing) and writes its id into `wrangler.toml`
2. Creates the R2 bucket (if missing)
3. Applies migrations to the remote D1
4. Generates + sets the `BETTER_AUTH_SECRET` and `JWT_SECRET` worker secrets (if not already set). Both are required; production hard-fails (500s on auth/CSRF paths) without a secure `JWT_SECRET`.
5. Deploys the worker
6. Seeds the initial admin user

**Verify staging**, then promote to production:

```bash
npm run cf:setup:prod
```

Override the seeded admin credentials with env vars:

```bash
CMS_ADMIN_EMAIL=you@example.com CMS_ADMIN_PASSWORD='a-strong-password' npm run cf:setup:prod
```

### Routine redeploys (after provisioning)

```bash
npm run deploy:staging      # wrangler deploy --env staging
npm run deploy:prod         # wrangler deploy --env production
```

Run new migrations against a remote DB with `npm run db:migrate:staging` /
`npm run db:migrate:prod`. From the repo root the same actions are available as
`npm run setup:web-cms:staging|prod` and `npm run deploy:web-cms:staging|prod`.

### RBAC fallback

The seed step creates the `auth_user` + `auth_account` rows needed to log in;
SonicJS bootstraps document types and the RBAC role/permission seed server-side.
If the first admin login reports missing permissions, run the interactive
remote reset (destructive — recreates the remote schema) and re-seed:

```bash
npm run db:reset            # follow prompts; choose the remote/production DB
npm run seed:prod           # re-create the admin row
```

## Documentation

- [SonicJS Documentation](https://sonicjs.com)
- [Collection Configuration](https://sonicjs.com/collections)
- [Plugin Development](https://sonicjs.com/plugins)
- [API Reference](https://sonicjs.com/api)

## Support

- [GitHub Issues](https://github.com/lane711/sonicjs/issues)
- [Discord Community](https://discord.gg/8bMy6bv3sZ)
- [Documentation](https://sonicjs.com)

## License

MIT
