# Cloudflare R2 Buckets

| Environment | Bucket | Public custom domain |
|---|---|---|
| Staging uploads | `uploads-factorysyncsolutions-com-staging` | `https://cdn-staging.factorysyncsolutions.com` |
| Production uploads | `uploads-factorysyncsolutions-com` | `https://cdn.factorysyncsolutions.com` |
| Staging API docs | `apidoc-factorysyncsolutions-com-staging` | Private backend-read bucket |
| Production API docs | `apidoc-factorysyncsolutions-com` | Private backend-read bucket |

Upload buckets store public user-facing assets such as avatars. API docs buckets
remain private and are accessed by the backend with scoped R2 credentials.
