# Help / API Docs Page (web-backoffice)

## Summary

Superadmin-only viewer page at `/help/api-docs` in `apps/web-backoffice`. Renders the
published OpenAPI spec in Swagger UI, shows artifact metadata, and offers JSON/YAML
downloads — the single superadmin-facing place to inspect current and historical API
behavior without exposing operational documentation publicly.

## Implementation

- Route `/help/api-docs`, nested under `BackofficeGuard` + `SuperAdminGuard`. The sidebar
  Help item renders only for superadmins; staff cannot see it and cannot open the route
  directly (the backend independently returns 403).
- API version is selected with a shadcn `Select` (never a native `<select>`), populated
  from `GET /backoffice/api-docs/versions`.
- The page fetches the authenticated JSON endpoint and passes `data.spec` to Swagger UI —
  Swagger UI is never given a URL to fetch itself, so the Firebase token stays in the app's
  API client.
- Metadata strip shows `environment`, `apiVersion`, short `gitSHA`, and `generatedAt`
  (via `formatDateTime()` from `@/lib/dayjs` — Buddhist Era in Thai locale).
- Download JSON serializes `data.spec`; Download YAML fetches the YAML endpoint and saves
  `data.yaml`.
- All visible text via `useLocale()` (TH/EN); shadcn/ui components only.
- States: loading, empty, and error. In local dev, a missing artifact error names the
  generation command so the developer knows to run `make docs-api`.
- Layout remains usable at 320px width.

## Usage

```
# pseudocode — page load
versions = GET /backoffice/api-docs/versions          → populate Select (default v1)
meta     = GET /backoffice/api-docs/{v}/metadata      → metadata strip
spec     = GET /backoffice/api-docs/{v}/openapi.json  → SwaggerUI({ spec: data.spec })

on error         → localized error state (+ generation-command hint in local dev)
Download JSON    → save serialized data.spec
Download YAML    → GET .../openapi.yaml → save data.yaml
```

Backend contract in [api-docs-service.md](./api-docs-service.md); wireframes in
[mockups/backoffice.md](./mockups/backoffice.md).

## Acceptance Criteria

- Given a superadmin, when the page loads, then the metadata, version selector, and Swagger UI render from the authenticated endpoints.
- Given a staff user, when the sidebar renders, then no Help item is shown; direct navigation to `/help/api-docs` is blocked by `SuperAdminGuard`.
- Given a failed fetch or missing artifact, when the page loads, then a localized error state renders (naming the generation command in local dev).
- Given the download buttons, when clicked, then the JSON/YAML artifacts save locally.
- Given a 320px viewport, when the page renders, then it remains usable.

## Status

- [x] `/help/api-docs` route + superadmin-only sidebar item — `apps/web-backoffice`
- [x] Swagger UI viewer fed from `data.spec`; version `Select`; metadata strip; downloads
- [x] TH/EN i18n keys; loading/empty/error states
- [ ] Vitest coverage recorded (render · staff hidden · error state) — status not recorded in the spec

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
