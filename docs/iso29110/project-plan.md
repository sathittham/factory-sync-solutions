---
isoOutput: PM.O1
version: 1.2.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
status: active
---

# Project Plan — FactorySync Solutions

*ISO 29110 Basic Profile · PM.O1*

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Project Name** | FactorySync Solutions — Factory Health Assessment Platform |
| **Short Name** | factory-sync-solutions |
| **Customer / Stakeholder** | Thai SME manufacturers; internal product team |
| **Project Type** | SaaS web application (multi-quiz health assessment + backoffice) |
| **Project Start** | 2026-03-06 |
| **Current Phase** | Active development — Phase 10 (ISO 29110) / backoffice in progress |
| **Repository** | `github.com/sathittham/factory-sync-solutions` |
| **Production URL** | (see [env-variables.md](../operations/env-variables.md)) |

### Objectives

1. Provide Thai factory operators a self-serve, scored health assessment across 8 production dimensions.
2. Support multiple quiz variants (Shindan, Factory, Lean, Cybersecurity, ISO 29110).
3. Offer a backoffice portal for internal staff to manage projects, users, and results.
4. Operate within the free/low-cost tier (Firebase, Cloudflare Pages, Cloud Run).

---

## 2. Statement of Work Summary

The project delivers:

- **fs-backend** — REST API (Go + Chi + Firestore + Firebase Auth, deployed on Cloud Run)
- **fs-app-web** — Authenticated user app for quiz-taking and results (React 19 + Vite, Cloudflare Pages)
- **fs-backoffice-web** — Internal backoffice (React 19 + Vite, Cloudflare Pages, `backofficeRole: "staff" | "superadmin"` claim)
- **fs-official-web** — Public marketing site (Astro 6, Cloudflare Pages)
- **Shared packages** — scripts, assets

Detailed feature scope per component: see `docs/product/*/feature-spec.md`.

---

## 3. Project Schedule & Milestones

| Milestone | Target | Status |
|---|---|---|
| Phase 0: Backend Foundation | 2026-03-06 | Done |
| Phase 1: Core Services | 2026-03-10 | Done |
| Phase 2: Notification | 2026-03-12 | Done |
| Phase 3: Admin | 2026-03-14 | Done |
| Phase 4–6: Frontend App + Admin Dashboard | 2026-03-20 | Done |
| Phase 7–8: Testing & CI/CD | 2026-03-25 | Done |
| Phase 10: ISO 29110 Quiz + Compliance Artifacts | 2026-06-11 | In Progress |
| Phase 9: Project & RBAC (multi-user workspace) | TBD | Planned |
| fs-backoffice-web — Initial Build | TBD | In Progress |

Full task-level roadmap: [docs/product/roadmap.md](../product/roadmap.md).

---

## 4. Team & Roles

| Name | Role | ISO 29110 Role | Responsibilities |
|---|---|---|---|
| Sathittham Sangthong | Lead Developer / Owner | Project Manager + Technical Lead | Architecture, backend, CI/CD, project decisions |
| _(collaborator TBD)_ | Frontend Developer | Software Implementer | React UI, pages, tests |

*VSE size: ≤ 5 active contributors. All contributors must follow CLAUDE.md and `.claude/rules/`.*

---

## 5. Resource Plan

| Resource | Details |
|---|---|
| **Version Control** | Git (GitHub) — single `main` branch strategy with `feature/*`, `bugfix/*` |
| **CI/CD** | GitHub Actions (test on PR; deploy on tag) |
| **Backend Hosting** | Google Cloud Run (free tier) |
| **Frontend Hosting** | Cloudflare Pages (free tier) |
| **Database** | Cloud Firestore (free tier — Spark plan) |
| **Auth** | Firebase Auth (free tier) |
| **Email** | Resend (free tier, 100 emails/day) |
| **Dev Tools** | Go 1.24+, Node 22+, Vite, shadcn/ui, Biome, Vitest |
| **Budget** | Free-tier infrastructure; labor cost = developer time only |

---

## 6. Risk Management

Active risks are tracked in [risk-register.md](risk-register.md).

**Risk process:**
- New risks identified → added to register immediately
- Reviewed at every progress meeting
- Owner assigned; mitigation plan documented within one iteration

---

## 7. Configuration Management Plan

| Item | Approach |
|---|---|
| **Source Code** | Git on GitHub; all changes via branches + PR |
| **Branch Protection** | `main` is protected; direct pushes forbidden |
| **Versioning** | Semantic versioning `vX.Y.Z`; `vX.Y.Z-staging` for staging |
| **Release Tags** | Git tags trigger automated deploy via GitHub Actions |
| **Config Files** | `.env*` files git-ignored; `.env.example` documents all vars |
| **Secrets** | GitHub Secrets for CI/CD; never committed |
| **Quiz Configs** | Static JSON in `apps/fs-backend/config/questions*.json` — version-controlled |
| **Firestore Rules** | `firestore.rules` committed; deployed manually via Firebase CLI |
| **Change Requests** | Logged in [change-request-log.md](change-request-log.md) |

Full branch and commit rules: [release-flow.md](../operations/release-flow.md).

---

## 8. Quality Assurance Plan

| Activity | Tool / Method | Frequency | Owner |
|---|---|---|---|
| Code review | PR review (GitHub) | Every merge | Lead Developer |
| Backend unit tests | `go test -race -cover ./...` | Every PR + CI | CI (GitHub Actions) |
| Frontend unit tests | Vitest | Every PR + CI | CI (GitHub Actions) |
| TypeScript type check | `tsc --noEmit` | Every PR + CI | CI (GitHub Actions) |
| Lint | Biome (frontend) + `go vet` (backend) | Every PR + CI | CI (GitHub Actions) |
| Security headers | Middleware (Chi) | Always on | Runtime |
| Rate limiting | Per-IP in-process + Cloudflare WAF | Always on | Runtime |
| Pre-release audit | `make pre-release-audit` (workflow) | Before each release | Lead Developer |
| Staging smoke test | Deploy + verify 200 | Before production tag | Lead Developer |

QA checklist: [docs/development/code-review-checklist.md](../development/code-review-checklist.md).

---

## 9. Communication Plan

| Activity | Participants | Channel | Frequency |
|---|---|---|---|
| Progress status update | All team | Progress log ([PM.O2](progress-log.md)) | Per iteration / weekly |
| Issue discussion | Affected members | GitHub Issues + PR comments | As needed |
| Risk review | All team | Progress meeting | Every 2 weeks |
| Change request review | Lead Developer | [change-request-log.md](change-request-log.md) | Per request |
| Release announcement | All stakeholders | Slack / email | Per production release |

---

## 10. Deliverables & Acceptance Criteria

| Deliverable | Acceptance Criteria |
|---|---|
| fs-backend API | All endpoints return correct responses; `go test -cover` ≥ 80% for critical services |
| fs-app-web | Quiz flow completes end-to-end; TypeScript clean; Vitest passing |
| fs-backoffice-web | Auth guards work; all routes accessible to correct roles only |
| fs-official-web | Public pages load < 2s; Lighthouse score ≥ 90 |
| ISO 29110 artifacts | All PM.O1–O3, SI.O1–O8 outputs present and up-to-date per release |

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-03-06 | Sathittham | Initial project plan |
| 1.1.0 | 2026-03-25 | Sathittham | Added CI/CD, testing QA plan |
| 1.2.0 | 2026-06-11 | Sathittham | Added ISO 29110 compliance section; backoffice scope |
