# FactorySync Solutions — Docs

```
docs/
├── api/           API reference (endpoints, conventions, swagger)
├── architecture/  System design, data models, domain decisions
├── development/   Local setup, Go patterns, testing, code quality
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
| [api/conventions.md](api/conventions.md) | Response format, error codes, naming |
| [api/swagger.md](api/swagger.md) | swaggo setup and Swagger UI |

## Architecture

| File | Description |
|------|-------------|
| [architecture/overview.md](architecture/overview.md) | Infrastructure, services, data flow |
| [architecture/database.md](architecture/database.md) | Firestore schema and security rules |
| [architecture/quiz-design.md](architecture/quiz-design.md) | Quiz domain, scoring algorithm, thresholds |
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

## Product

| File | Description |
|------|-------------|
| [product/user-flow.md](product/user-flow.md) | User journey with decision points |
| [product/wireframes.md](product/wireframes.md) | Screen layouts for all pages |
| [product/roadmap.md](product/roadmap.md) | Phased roadmap with milestones |

## Reference

| File | Description |
|------|-------------|
| [ref/](ref/) | Source quiz assessment documents (xlsx, docx) |
