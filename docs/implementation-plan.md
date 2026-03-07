---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Implementation Plan & Checklist

## Current State

| Component | Status |
|-----------|--------|
| Documentation (18 docs) | Done |
| Phase 0: Backend Foundation (pkg, middleware, config, main.go) | Done |
| Phase 1: Core Services (scoring, profile, result, quiz) | Done |
| Phase 2: Notification Service (email, Slack) | Done |
| Phase 3: Admin Service (list, detail, CSV export) | Done |
| Phase 4: Frontend Scaffold & Auth | Done |
| Phase 5: Frontend Pages (register, quiz, result, 404) | Done |
| Phase 6: Admin Dashboard | Done |
| Phase 7: Testing & Quality | Done |
| Phase 8: CI/CD & Deployment | Done |

---

## Phase 0: Backend Foundation

Everything else depends on this. Build first.

- [x] **0.1** `apps/api/pkg/firestore.go` — Firestore client initialization (Firebase Admin SDK, emulator support)
- [x] **0.2** `apps/api/pkg/validator.go` — Shared `validator.Validate` singleton
- [x] **0.3** `apps/api/pkg/turnstile.go` — Cloudflare Turnstile server-side verification helper
- [x] **0.4** `apps/api/middleware/cors.go` — CORS middleware (reads `ALLOWED_ORIGINS` env var)
- [x] **0.5** `apps/api/middleware/auth.go` — `FirebaseAuth(authClient)`, `RequireAdmin(authClient)`, `GetUID(r)`
- [x] **0.6** `apps/api/middleware/ratelimit.go` — Per-IP rate limiter (defense-in-depth)
- [x] **0.7** `apps/api/middleware/security.go` — Security headers middleware
- [x] **0.8** `apps/api/config/questions.json` — All 35 quiz questions (7 dimensions × 5)
- [x] **0.9** `apps/api/main.go` — Entry point: Firebase init, Firestore init, wire repos/services/handlers, Chi router, Cloud Functions framework
- [x] **0.10** Run `go build ./...` — verify everything compiles
- [x] **0.11** Run `go test ./...` — verify existing tests still pass
- [x] **0.12** Update `go.mod` — add all required dependencies

---

## Phase 1: Core Backend Services

### 1.1 scoring-service (pure logic, no Firestore)

> Ref: [quiz-design.md](quiz-design.md), [database.md](database.md#scoring-algorithm)

- [x] `services/scoring/models.go` — `Question`, `QuizAnswer`, `DimensionScore`, `ScoringResult`
- [x] `services/scoring/scoring.go` — `LoadQuestions()`, `ComputeScores()`, `DetermineDiagnosis()`
  - [x] Weighted average per dimension
  - [x] Overall score = average of 7 dimension scores
  - [x] Round to 2 decimal places
  - [x] Strengths: dimensions >= 3.50
  - [x] Weaknesses: dimensions < 2.50
  - [x] Diagnosis: Beginning / Developing / Established / Advanced
- [x] `services/scoring/scoring_test.go` — table-driven tests (coverage: 96.3%)
  - [x] All 1s → Beginning (1.00)
  - [x] All 5s → Advanced (5.00)
  - [x] Mixed scores → correct diagnosis
  - [x] Boundary: 2.00, 3.00, 4.00 exact
  - [x] Rounding behavior (e.g., 3.995 → 4.00 = Advanced)
  - [x] Empty answers → error/zero
- [x] Coverage >= 90% ✓ (96.3%)

### 1.2 profile-service

> Ref: [database.md](database.md#firestore-collections), [go-patterns.md](go-patterns.md)

- [x] `services/profile/models.go` — `Profile`, `CreateProfileRequest`, `ProfileResponse`
- [x] `services/profile/repository.go` — `Repository` with `GetByUID`, `Create`, `Update`
- [x] `services/profile/service.go` — `RepositoryInterface`, `Service`, sentinel errors (`ErrProfileNotFound`, `ErrAlreadyRegistered`)
  - [x] `GetProfile(ctx, uid)` — get user profile
  - [x] `CreateProfile(ctx, uid, email, displayName, req)` — verify Turnstile, check existing, create profile
  - [x] `UpdateProfile(ctx, uid, req)` — update profile fields
- [x] `services/profile/handler.go` — `Handler`, `Routes(r)`, swagger annotations
  - [x] `GET /api/v1/profile` → 200 / 404
  - [x] `POST /api/v1/profile` → 201 / 400 / 409
  - [x] `PUT /api/v1/profile` → 200 / 400 / 404
- [x] `services/profile/adapter.go` — ProfileDataAdapter for quiz notification data
- [x] `services/profile/service_test.go` — unit tests (4 tests pass)
- [ ] `services/profile/handler_test.go` — handler tests (TODO: improve coverage)
- [x] Coverage: 12.1% (service tested, handler tests pending)

### 1.3 result-service

> Ref: [database.md](database.md#firestore-collections)

- [x] `services/result/models.go` — `Assessment` struct (matches `assessments` collection)
- [x] `services/result/repository.go` — `Create`, `GetByID`, `GetByUID`, `ListAll` (admin with filters)
- [x] `services/result/service.go` — `StoreResult`, `GetResult`, `GetUserResults`
  - [x] Sentinel error: `ErrResultNotFound`
- [x] `services/result/handler.go` — `Handler`, `Routes(r)`
  - [x] `GET /api/v1/results` → user's results
  - [x] `GET /api/v1/results/{assessmentId}` → specific result (scoped to user)
- [ ] Tests + mocks (TODO)

### 1.4 quiz-service (orchestrator)

> Depends on: scoring-service (1.1), result-service (1.3)

- [x] `services/quiz/models.go` — `SubmitQuizRequest`
- [x] `services/quiz/service.go` — `Service` struct
  - [x] `GetQuestions()` — return loaded quiz config
  - [x] `SubmitQuiz(ctx, uid, answers)` — validate 35 answers, call scoring, store result, trigger notifications
  - [x] Sentinel errors: `ErrIncompleteAnswers`, `ErrInvalidAnswer`
- [x] `services/quiz/handler.go` — `Handler`, `Routes(r)`
  - [x] `GET /api/v1/quiz/questions` → quiz questions JSON
  - [x] `POST /api/v1/quiz/submit` → submit answers → 201 with assessment result
- [ ] Tests + mocks (TODO)

---

## Phase 2: Notification Service ✓

> Depends on: profile-service (1.2), quiz-service (1.4)

- [x] `services/notification/email.go` — Resend API integration
  - [x] `SendResultEmail(ctx, to, contactName, companyName, result)` → send HTML email with scores
  - [x] HTML email template (inline)
  - [x] Uses `RESEND_API_KEY` env var
- [x] `services/notification/slack.go` — Slack webhook integration
  - [x] `SendRegistrationNotification(ctx, profile)` → post to `#registrations`
  - [x] `SendQuizResultNotification(ctx, companyName, score, diagnosis)` → post to `#quiz-results`
- [x] `services/notification/service.go` — orchestrates email + Slack
  - [x] `NotifyRegistration(ctx, profile)`
  - [x] `NotifyQuizResult(ctx, profile, assessment)`
- [x] `services/notification/models.go` — `EmailJob` struct (matches `email_jobs` collection)
- [x] Wired into quiz-service (email + Slack on submit, fire-and-forget)
- [x] **Decision**: notification failures must NOT fail the main operation — log error and continue ✓

---

## Phase 3: Admin Service ✓

> Depends on: result-service (1.3)

- [x] `services/admin/handler.go` — `Handler`, `Routes(r)`
  - [x] `GET /api/v1/admin/assessments` → list all assessments
  - [x] `GET /api/v1/admin/assessments/{assessmentId}` → detail
  - [x] `GET /api/v1/admin/export` → CSV download
- [ ] `apps/api/cmd/seed/main.go` — CLI to set admin custom claims + create admin user doc (TODO)

---

## Phase 4: Frontend Scaffold & Auth

> Can start in parallel with Phase 1 backend work.

### 4.1 Project setup

- [x] `apps/web/vite.config.ts` — Vite config with React plugin, `@/` alias, dev proxy
- [x] `apps/web/tsconfig.json` — strict TS with path aliases
- [x] `apps/web/tailwind.config.ts` + `postcss.config.js`
- [x] `apps/web/src/main.tsx` — entry point
- [x] `apps/web/src/App.tsx` — Router + Redux providers + AuthInitializer
- [x] `apps/web/src/index.css` — Tailwind directives + CSS variables
- [x] `apps/web/src/lib/utils.ts` — `cn()` utility
- [x] `apps/web/src/vite-env.d.ts` — Vite env type declarations
- [x] `npm install` — all deps install
- [x] `tsc --noEmit` — TypeScript compiles cleanly
- [x] `vite build` — production build succeeds

### 4.2 shadcn/ui components ✓

- [x] Button, Card, Input, Select, Progress, Badge, Skeleton
- [x] `components.json` configured

### 4.3 Firebase & API setup ✓

- [x] `src/lib/firebase.ts` — Firebase app init from `VITE_` env vars + GoogleAuthProvider
- [x] `src/lib/api.ts` — HTTP client with auto-attached Bearer token, `ApiError` class

### 4.4 State management (Redux) ✓

- [x] `src/store/index.ts` — RTK store + typed hooks (`useAppDispatch`, `useAppSelector`)
- [x] `src/store/authSlice.ts` — user, profile, isAuthenticated, isRegistered, isAdmin, loading
- [x] `src/store/quizSlice.ts` — questions, dimensions, answers map, currentStep, isSubmitting
- [x] `src/store/resultSlice.ts` — assessment, assessments list, loading

### 4.5 Routing & guards ✓

- [x] `src/router.tsx` — React Router v7 with nested route guards
- [x] `src/components/guards/AuthGuard.tsx` — redirect to `/` if unauthenticated
- [x] `src/components/guards/RegisterGuard.tsx` — redirect to `/register` if unregistered
- [x] `src/components/guards/AdminGuard.tsx` — redirect to `/` if not admin
- [x] `src/components/Layout.tsx` — header nav with conditional links + sign out

### 4.6 Auth pages ✓

- [x] `src/pages/LandingPage.tsx` — hero + Google Sign-In CTA + 7 dimension overview
- [x] `src/hooks/useAuth.ts` — `onAuthStateChanged`, profile fetch, dispatch to store
- [x] All `data-testid` attributes per [testing.md](testing.md)

---

## Phase 5: Frontend Pages ✓

### 5.1 Registration page ✓

> Depends on: profile-service API (1.2), Phase 4

- [x] `src/pages/RegisterPage.tsx`
  - [x] react-hook-form + Zod validation (matches backend `CreateProfileRequest`)
  - [x] Company Reg ID field with DBD lookup button (`GET /api/v1/dbd/{regId}`) for auto-prefill
  - [x] Mobile-first responsive layout (full-width on mobile, 2-col on tablet+)
  - [x] Loading state on submit
  - [x] Error display on failure
  - [x] Navigate to `/quiz` on success
- [x] `data-testid` attributes: `registration-form`, `registration-submit-btn`

### 5.2 Quiz page ✓

> Depends on: quiz-service API (1.4), Phase 4

- [x] `src/pages/QuizPage.tsx`
  - [x] Fetch questions from `GET /api/v1/quiz/questions`
  - [x] Dimension tab stepper (scrollable on mobile)
  - [x] 5 question cards per step with 1-5 circle buttons
  - [x] Progress bar (answered/35 × 100%)
  - [x] Previous / Next navigation
  - [x] Submit button on step 7 (enabled when all 35 answered)
  - [x] Loading indicator on submit
  - [x] Navigate to `/results` on success
- [x] `data-testid`: `quiz-stepper`, `quiz-question-card`, `quiz-next-btn`, `quiz-prev-btn`, `quiz-submit-btn`

### 5.3 Result page ✓

> Depends on: result-service API (1.3), Phase 4

- [x] `src/pages/ResultPage.tsx`
  - [x] Fetch results from `GET /api/v1/results`
  - [x] Overall score card with diagnosis badge (color-coded)
  - [x] Spider/radar chart (Recharts `RadarChart`, 7 axes)
  - [x] Dimension score bars with values
  - [x] Strengths panel (green)
  - [x] Weaknesses panel (red)
  - [x] Accessible text alternative for spider chart (`sr-only`)
  - [x] Previous assessments selector
- [x] `data-testid`: `result-summary`, `result-spider-chart`, `result-strengths-panel`, `result-weaknesses-panel`

### 5.4 404 page ✓

- [x] `src/pages/NotFoundPage.tsx` — friendly 404 with link back to home

---

## Phase 6: Admin Dashboard ✓

> Depends on: admin-service API (Phase 3), Phase 4

- [x] `src/pages/AdminPage.tsx`
  - [x] Stats cards: total submissions, average score, diagnosis distribution
  - [x] Filter bar: industry type dropdown, company size dropdown
  - [x] Assessment table: ID, score, diagnosis, date
  - [x] CSV export button (downloads as blob)
  - [x] Horizontal scroll table on mobile
- [x] `data-testid`: `admin-assessment-table`, `admin-filter-industry`, `admin-filter-size`, `admin-export-csv-btn`

---

## Phase 7: Testing & Quality ✓

### 7.1 Backend ✓

- [x] `go test -cover -race ./...` — all tests pass, no race conditions
  - scoring: 96.3% coverage
  - dbd: 83.9% coverage
  - profile: 57.3% coverage (service + handler tests)
  - result: 17.6% coverage (service tests)
  - quiz: 41.7% coverage (service tests)
- [x] `go vet ./...` — clean
- [x] `middleware/testing.go` — test helper for auth context injection

### 7.2 Frontend ✓

- [x] Vitest config + jsdom environment + setup file
- [x] Unit tests: `cn()` utility (4 tests)
- [x] Redux slice tests: authSlice (7), quizSlice (6), resultSlice (4) — 21 tests total
- [x] `npx tsc --noEmit` — TypeScript compiles cleanly
- [x] `npx vite build` — production build succeeds

### 7.3 E2E (Playwright)

- [ ] `e2e/auth/google-signin.spec.ts` (TODO: requires running app)
- [ ] `e2e/auth/registration.spec.ts`
- [ ] `e2e/quiz/quiz-flow.spec.ts`
- [ ] `e2e/result/result-display.spec.ts`
- [ ] `e2e/admin/admin-dashboard.spec.ts`

---

## Phase 8: CI/CD & Deployment ✓

- [x] `.github/workflows/test.yml` — lint + test on push/PR (frontend + backend)
- [x] `.github/workflows/deploy-staging.yml` — deploy to staging on push to `staging`
- [x] `.github/workflows/deploy-production.yml` — deploy to production on push to `main` (runs tests first)
- [x] `firestore.rules` — security rules (user-scoped reads, admin reads, backend-only writes)
- [x] `firestore.indexes.json` — composite index for assessments by uid + submittedAt
- [x] `.env.example` — all env vars documented (frontend + backend)
- [ ] GCP Secret Manager setup for staging + production (manual setup)
- [ ] Cloudflare Pages project connected to GitHub (manual setup)
- [ ] Post-deploy smoke test (manual)

---

## Dependency Graph

```
Phase 0 (Foundation)
├─→ Phase 1.1 (scoring) ─────────────────────┐
├─→ Phase 1.2 (profile) ──→ Phase 2 (notif.) │
├─→ Phase 1.3 (result) ──────────────────────┤
│                                             ▼
│                              Phase 1.4 (quiz = orchestrator)
│                                             │
├─→ Phase 3 (admin) ◄────── result repo ──────┘
│
└─→ Phase 4 (frontend scaffold + auth) — parallel with backend
     ├─→ Phase 5.1 (register page) ◄── profile API
     ├─→ Phase 5.2 (quiz page) ◄── quiz API
     ├─→ Phase 5.3 (result page) ◄── result API
     └─→ Phase 6 (admin page) ◄── admin API
              │
              ▼
     Phase 7 (testing) → Phase 8 (CI/CD + deploy)
```

---

## Recommended Build Order (Solo Developer)

| # | Task | Depends On |
|---|------|-----------|
| 1 | Phase 0: Foundation | — |
| 2 | Phase 1.1: scoring-service | Phase 0 |
| 3 | Phase 1.2: profile-service | Phase 0 |
| 4 | Phase 1.3: result-service | Phase 0 |
| 5 | Phase 1.4: quiz-service | 1.1, 1.3 |
| 6 | Phase 2: notification-service | 1.2, 1.4 |
| 7 | Phase 3: admin-service | 1.3 |
| 8 | Phase 4: Frontend scaffold + auth | — (parallel with backend) |
| 9 | Phase 5.1: Register page | 1.2, Phase 4 |
| 10 | Phase 5.2: Quiz page | 1.4, Phase 4 |
| 11 | Phase 5.3: Result page | 1.3, Phase 4 |
| 12 | Phase 6: Admin dashboard | Phase 3, Phase 4 |
| 13 | Phase 7: Testing & quality | All above |
| 14 | Phase 8: CI/CD & deployment | All above |

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin role source of truth | Firebase custom claims | Single authoritative source; Firestore `role` field is read-only mirror |
| Notification failure handling | Log and continue | Email/Slack failures must NOT fail quiz submission |
| Rate limiting in serverless | Cloudflare WAF primary + per-instance defense-in-depth | In-memory limiters don't work across Cloud Function instances |
| Score rounding | 2 decimal places before classification | Prevents ambiguous boundary behavior (e.g., 3.995 → 4.00 = Advanced) |
| Quiz questions source | Static JSON in `apps/api/config/` | Zero Firestore cost, version-controlled, easy PR review |

---

## See Also

- [architecture.md](architecture.md) — System architecture and platform choices
- [go-patterns.md](go-patterns.md) — Handler/service/repository patterns (reference implementation in `services/dbd/`)
- [database.md](database.md) — Firestore collections, data models, scoring algorithm
- [quiz-design.md](quiz-design.md) — All 35 questions and scoring rules
- [testing.md](testing.md) + [testing-guide.md](testing-guide.md) — Testing strategy and Go test patterns
- [env-variables.md](env-variables.md) — All required environment variables
- [deployment-guide.md](deployment-guide.md) — Deployment runbook

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
