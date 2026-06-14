# FactorySync API Gateway

Cloudflare Worker that exposes the Go API through custom domains:

| Environment | Worker | Domain | Upstream |
|---|---|---|---|
| Staging | `factory-sync-api-gateway-staging` | `api-staging.factorysyncsolutions.com` | Cloud Run staging API |
| Production | `factory-sync-api-gateway` | `api.factorysyncsolutions.com` | Cloud Run production API |

The gateway handles CORS preflight at the edge, forwards requests to Cloud Run,
and adds conservative `Cache-Control: no-store` headers for API responses.
Firebase Auth, authorization, validation, and API response shaping remain in the
Go backend.

Only `/v1` is exposed publicly. The Worker rewrites `/v1/...` to the backend's
internal `/api/v1/...` route before proxying. Requests to `/api/v1/...` on the
gateway hostname return a gateway 404.

## Commands

```bash
npm test
npm run deploy:staging
npm run deploy:prod
```

## Cloudflare Setup

The zone `factorysyncsolutions.com` must be active in Cloudflare. Deploy uses
Wrangler `custom_domain` routes from `wrangler.toml`. In GitHub Actions, set
`CLOUDFLARE_WORKERS_API_TOKEN` to a Cloudflare token that can edit Workers and
manage custom domains/routes for this zone.

Frontend builds should use:

```text
staging:    https://api-staging.factorysyncsolutions.com/v1
production: https://api.factorysyncsolutions.com/v1
```
