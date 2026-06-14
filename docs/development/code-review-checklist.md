---
version: 1.2.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
---

# Code Review Checklist

All code must strictly adhere to the [Engineering Principles](setup.md#engineering-principles): enterprise-grade production quality, long-term maintainability, best performance, cost optimization, and security first.

Check every item below when writing or modifying code. For new endpoints or services, verify ALL items before completing.

---

## 1. Security

> Reference: [security.md](../operations/security.md)

- [ ] Firebase ID token verified via `auth.VerifyIDToken` on all authenticated endpoints
- [ ] User UID extracted from verified token — never from request body or query params
- [ ] Admin role checked server-side via Firebase custom claims (authoritative source) — never trust frontend-only checks
- [ ] Input validated with struct tags (`validate:"required,min=2,max=50"`)
- [ ] No sensitive data logged (passwords, tokens, PII, Firebase ID tokens)
- [ ] Firestore security rules enforce user-scoped access (users can only read/write their own data)
- [ ] Cloudflare Turnstile token verified server-side on registration form
- [ ] Rate limiting on public endpoints
- [ ] Secrets stored in GitHub Secrets or env vars — never hardcoded
- [ ] User input sanitized — no injection vectors
- [ ] CORS origins from `ALLOWED_ORIGINS` env var — no wildcard in production

---

## 2. API Conventions

> Reference: [conventions.md](../api/conventions.md)

- [ ] Follows handler → service → repository layer pattern
- [ ] Named sentinel errors: `var ErrXxx = errors.New("...")` in service package
- [ ] Uses standard response helpers (`pkg.RespondJSON`, `pkg.RespondError`, `pkg.RespondList`)
- [ ] camelCase for JSON tags and Firestore field names
- [ ] HTTP status codes match convention (200/201/400/401/403/404/409/500)
- [ ] Error codes match convention: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `INTERNAL_ERROR`
- [ ] Swagger annotations on handler functions (see [swagger.md](../api/swagger.md))
- [ ] Timestamps use UTC RFC3339 format

---

## 3. Performance

- [ ] Firestore client initialized once at startup — not per request
- [ ] No N+1 queries — batch reads where possible
- [ ] Firestore queries use indexed fields (check composite index requirements)
- [ ] Slice pre-allocated when size is known (`make([]T, 0, len(items))`)
- [ ] Quiz questions loaded from static JSON config — not from Firestore per request
- [ ] Static/global data computed once at init — not rebuilt per request

---

## 4. Cost Optimization

- [ ] Firestore reads minimized — fetch only what's needed
- [ ] Cloud Run configured with appropriate memory and timeout settings
- [ ] Cloud Logging retention set per environment (staging: 14 days, production: 90 days)
- [ ] No unbounded Firestore queries — always use limits
- [ ] Quiz question definitions served from bundled config — zero Firestore read cost

---

## 5. Maintainability

> Reference: [code-quality.md](code-quality.md)

- [ ] `golangci-lint run ./...` passes
- [ ] `npx biome check .` passes (frontend)
- [ ] Test coverage >= 80% for service layer
- [ ] Cognitive complexity ≤ 15 per function
- [ ] `errors.As` for error type checking (not type assertion)
- [ ] `errors.Is` for sentinel error comparison (not `==`)
- [ ] Constants for repeated strings (3+ occurrences)
- [ ] Import grouping: stdlib → third-party → internal
- [ ] No dead code — remove unused functions, types, variables
- [ ] `data-testid` attributes on all components used in E2E tests

---

## 6. Frontend

- [ ] Mobile-first responsive design with Tailwind breakpoints
- [ ] WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, keyboard navigation)
- [ ] Loading/skeleton states for all async operations
- [ ] Error boundaries on major route components
- [ ] Form validation with `@tanstack/react-form` + shadcn `Field`/`FieldGroup`/`FieldLabel`/`FieldError` components
- [ ] No secrets or API keys in frontend code (`VITE_` prefix only for public config)

---

## Review Severity Levels

| Level | Action |
|-------|--------|
| Critical | Block merge. Fix immediately. |
| High | Fix in this PR. |
| Medium | Fix in the next sprint. |
| Low | Fix when touching the file again. |

### Default Severity by Area

| Area | Default Severity |
|------|-----------------|
| Security (auth bypass, data exposure) | Critical |
| Security (CORS, rate limiting) | High |
| API bugs (wrong response, data loss) | High |
| Performance (N+1 queries) | High |
| Performance (missing optimizations) | Medium |
| Cost (log retention, redundant reads) | Medium |
| Maintainability (dead code, complexity) | Low |

---

## Fix Verification

After implementing fixes:

```bash
# Backend
cd apps/fs-backend
go build ./...
go test -race ./...
golangci-lint run ./...

# Frontend
cd apps/fs-app-web
npx biome check .
npm run test
npx tsc --noEmit

# Full pipeline (from project root)
make lint
make test
```

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated: Swagger note, Cloud Functions → Cloud Run, GCP Secret Manager → GitHub Secrets, turbo → Makefile |
| 1.2.0 | 2026-06-13 | Fix broken links; update form validation to @tanstack/react-form; fix verification paths |

*Version: 1.2.0*
*Last updated: 13 June 2026*
