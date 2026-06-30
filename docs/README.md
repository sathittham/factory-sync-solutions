# FactorySync Solutions — Docs

```
docs/
├── api/           API reference (endpoints, conventions, swagger)
├── architecture/  System design, data models, domain decisions
├── development/   Local setup, Go patterns, testing, code quality
├── design/        Brand and UI design assets
├── iso29110/      ISO/IEC 29110 project artifacts
├── operations/    Deployment, env vars, security, monitoring
├── product/       User flows, wireframes, roadmap
└── ref/           Source quiz documents (xlsx, docx)
```

---

## API

| File | Description |
|------|-------------|
| [api/user.md](api/user.md) | All user-facing endpoints |
| [api/admin.md](api/admin.md) | Admin endpoints + audit event reference |
| [api/project.md](api/project.md) | Project & RBAC endpoints |
| [api/backoffice.md](api/backoffice.md) | Backoffice `/api/v1/backoffice/` endpoints (staff/superadmin) |
| [api/conventions.md](api/conventions.md) | Response format, error codes, naming |
| [api/swagger.md](api/swagger.md) | swaggo setup and Swagger UI |

## Architecture

| File | Description |
|------|-------------|
| [architecture/overview.md](architecture/overview.md) | Infrastructure, services, data flow |
| [architecture/database.md](architecture/database.md) | Firestore schema and security rules |
| [architecture/quiz-design.md](architecture/quiz-design.md) | Quiz domain, scoring algorithm, thresholds |
| [architecture/microservice-roadmap.md](architecture/microservice-roadmap.md) | Phased migration plan to domain-driven, event-driven Cloud Run services |
| [architecture/domain-events.md](architecture/domain-events.md) | Domain event envelope, DLQ, idempotency, and migration rules |
| [architecture/decisions.md](architecture/decisions.md) | Architecture Decision Records (ADRs) |

## Development

| File | Description |
|------|-------------|
| [development/setup.md](development/setup.md) | Local dev workflow and engineering principles |
| [development/go-patterns.md](development/go-patterns.md) | Chi router, Firestore, handler/service layers |
| [development/error-handling.md](development/error-handling.md) | Sentinel errors, handler mapping, Firestore errors |
| [development/code-quality.md](development/code-quality.md) | Biome, golangci-lint, import ordering |
| [development/code-review-checklist.md](development/code-review-checklist.md) | Pre-merge checklist |
| [development/testing.md](development/testing.md) | Testing strategy, Vitest, Playwright |
| [development/testing-guide.md](development/testing-guide.md) | Go test patterns, mocks, table-driven tests |
| [development/locale-guide.md](development/locale-guide.md) | i18n, Thai locale, Buddhist Era |

## Operations

| File | Description |
|------|-------------|
| [operations/deployment.md](operations/deployment.md) | Cloud Run, Cloudflare Pages, CI/CD |
| [operations/env-variables.md](operations/env-variables.md) | All env vars per environment |
| [operations/security.md](operations/security.md) | Auth, CORS, rate limiting, Turnstile, secrets |
| [operations/monitoring.md](operations/monitoring.md) | Logging, Cloud Monitoring, Slack alerts |
| [operations/release-flow.md](operations/release-flow.md) | Branch promotion, release tags, and deployment triggers |
| [operations/archive/](operations/archive/) | Historical migration runbooks |

## Product

| File | Description |
|------|-------------|
| [product/user-flow.md](product/user-flow.md) | User journey with decision points |
| [product/wireframes.md](product/wireframes.md) | Screen layouts for all pages |
| [product/roadmap.md](product/roadmap.md) | Phased roadmap with milestones |
| [product/admin/feature-spec.md](product/admin/feature-spec.md) | Customer-facing admin dashboard |
| [product/api-docs/feature-spec.md](product/api-docs/feature-spec.md) | Versioned Swagger/OpenAPI publishing to R2 and superadmin Help |
| [product/audit/feature-spec.md](product/audit/feature-spec.md) | Audit events and backoffice audit search |
| [product/auth/feature-spec.md](product/auth/feature-spec.md) | Firebase auth, guards, and role claims |
| [product/backoffice/feature-spec.md](product/backoffice/feature-spec.md) | Backoffice web app — RBAC, pages, API, deployment |
| [product/cookie-consent/feature-spec.md](product/cookie-consent/feature-spec.md) | Cookie consent and analytics gating |
| [product/dashboard/feature-spec.md](product/dashboard/feature-spec.md) | Authenticated app dashboard |
| [product/dbd/feature-spec.md](product/dbd/feature-spec.md) | Thai DBD company lookup |
| [product/legal/feature-spec.md](product/legal/feature-spec.md) | Terms, privacy, cookie policy, and legal consent |
| [product/notification/feature-spec.md](product/notification/feature-spec.md) | Email and Slack notification behavior |
| [product/official-site/feature-spec.md](product/official-site/feature-spec.md) | Public Astro site and service pages |
| [product/profile/feature-spec.md](product/profile/feature-spec.md) | User profile and activity timeline |
| [product/project/feature-spec.md](product/project/feature-spec.md) | Project workspace and member RBAC |
| [product/quiz/feature-spec.md](product/quiz/feature-spec.md) | Quiz variants, question flow, and scoring |
| [product/register/feature-spec.md](product/register/feature-spec.md) | Registration and company setup |
| [product/result/feature-spec.md](product/result/feature-spec.md) | Result report and recommendations |
| [product/upload/feature-spec.md](product/upload/feature-spec.md) | R2-backed avatar and file upload plan |

## ISO 29110

| File | Description |
|------|-------------|
| [iso29110/README.md](iso29110/README.md) | ISO/IEC 29110 artifact map |
| [iso29110/project-plan.md](iso29110/project-plan.md) | Project plan |
| [iso29110/progress-log.md](iso29110/progress-log.md) | Progress status records |
| [iso29110/risk-register.md](iso29110/risk-register.md) | Risk register |
| [iso29110/change-request-log.md](iso29110/change-request-log.md) | Change request log |
| [iso29110/user-guide.md](iso29110/user-guide.md) | User guide |

## Reference

| File | Description |
|------|-------------|
| [ref/](ref/) | Source quiz assessment documents (xlsx, docx) |
