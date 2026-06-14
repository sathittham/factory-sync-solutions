# Cloudflare Domains

| Hostname | Purpose | Target |
|---|---|---|
| `factorysyncsolutions.com` | Public marketing site | Cloudflare Pages |
| `staging.factorysyncsolutions.com` | Staging marketing site | Cloudflare Pages |
| `app.factorysyncsolutions.com` | Production user app | Cloudflare Pages |
| `app-staging.factorysyncsolutions.com` | Staging user app | Cloudflare Pages |
| `backoffice.factorysyncsolutions.com` | Production backoffice | Cloudflare Pages + Cloudflare Access |
| `backoffice-staging.factorysyncsolutions.com` | Staging backoffice | Cloudflare Pages |
| `api.factorysyncsolutions.com` | Production API gateway | Cloudflare Worker `factory-sync-api-gateway` |
| `api-staging.factorysyncsolutions.com` | Staging API gateway | Cloudflare Worker `factory-sync-api-gateway-staging` |
| `cdn.factorysyncsolutions.com` | Production public uploads | R2 bucket custom domain |
| `cdn-staging.factorysyncsolutions.com` | Staging public uploads | R2 bucket custom domain |

The public API path is `/v1`. The Worker rewrites it to the backend's internal
`/api/v1` route before proxying to Cloud Run.
