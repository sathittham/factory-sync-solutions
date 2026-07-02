---
isoOutput: SI.O2
version: 0.1.0
lastUpdated: 2026-07-02
author: Sathittham Sangthong
---

# Software Design Description — Profile server-state via TanStack Query (CR-003 Phase 2)

*ISO 29110 Basic Profile · SI.O2*

---

## Document Information

| Field | Value |
|---|---|
| **Feature / Module** | `web-app` profile server-state migration (CR-003 Phase 2) |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Author** | Sathittham Sangthong |
| **Date** | 2026-07-02 |
| **SRS Reference** | [docs/product/tanstack-adoption/feature-spec.md](../product/tanstack-adoption/feature-spec.md) · [change-request-log CR-003](../iso29110/change-request-log.md) |

---

## 1. Introduction

### 1.1 Purpose
Move the user **profile** out of the Redux `authSlice` and onto TanStack Query
as its single source of truth, completing the "do not mirror server data into
Redux" rule for the last remaining server entity. Phase 1 (writes → 
`useUpdateProfileMutation`) shipped in v0.13.0; this document designs Phase 2
(reads).

### 1.2 Scope
`apps/web-app` only. Affected: `store/authSlice.ts`, `hooks/useAuth.ts`,
`lib/queries.ts`, new `lib/profile.ts`, the 4 route guards, and ~9 consumer
components/pages. Backend and other apps are unchanged — the `GET /profile`,
`PUT /profile`, and `POST /invitations/accept` contracts are untouched.

### 1.3 Design Constraints
- React 19 + TanStack Query v5; `QueryClient` in `lib/queryClient.ts`.
- Firebase Auth drives the session; profile fetch is gated on a signed-in user.
- No behavioral change to auth/registration/company-switching UX.

---

## 2. Current State (pre-Phase 2)

`authSlice` holds `user`, `profile`, and four derived flags (`isAuthenticated`,
`isRegistered`, `isAdmin`, `hasCompletedQuiz`) plus `loading`. `useAuth` fetches
the profile imperatively inside `onAuthStateChanged` with three branches:

1. **200** → `setProfile`, then fetch `/results` to set `hasCompletedQuiz`.
2. **404** → `POST /invitations/accept`; success ⇒ profile, failure(404) ⇒ no
   profile (user proceeds through `/register`).
3. **401** → `auth.signOut()` + `logout()`.

`normalizeProfile` (active-company resolution) and the permission helpers
(`canManageUsers`, `canManageCompanySettings`) live in `authSlice`.

**Consumer inventory:**

| File | Reads |
|---|---|
| guards/AuthGuard | `isAuthenticated`, `loading` — **session, stays in Redux** |
| guards/RegisterGuard | `isRegistered` |
| guards/AdminGuard | `isAdmin`, `profile` → `canManageUsers` |
| guards/CompanySettingsGuard | `isAdmin`, `profile` → `canManageCompanySettings` |
| Layout | `profile`, `isAdmin`, `canManage*`, `setActiveCompany` |
| pages/AdminPage | `isAdmin`, `profile` → `canManageUsers` |
| pages/DashboardPage | `profile` |
| pages/CompanySettingsPage | `profile` |
| pages/ProfilePage (×4) | `profile`, `user` |
| pages/RegisterPage | `user`, `isAuthenticated`, `isRegistered`, `loading` |
| pages/NotFoundPage | `isAuthenticated`, `isRegistered` |
| pages/SignInPage | `isAuthenticated`, `loading` — **session** |
| components/ProfileDialog | `profile`, `user` |
| components/AppDebugPanel | full state (incl. `hasCompletedQuiz`) |

---

## 3. Target Design

### 3.1 Ownership split
- **Redux `authSlice` (trimmed):** `user`, `isAuthenticated`, `loading` — pure
  Firebase session state. Removes `profile`, `isRegistered`, `isAdmin`,
  `hasCompletedQuiz`, `setProfile`, `setActiveCompany`, `setHasCompletedQuiz`.
- **TanStack Query `['profile']`:** the profile object, `select`-normalized.
- **Derived, computed at read time:** `isRegistered = profile !== null`,
  `isAdmin = profile?.role === 'admin'`, `canManage*` from the pure helpers.
- **`hasCompletedQuiz`:** derived from `useAssessmentsQuery` (`data.length > 0`)
  — no longer stored; QuizPage's post-submit `invalidateQueries(['results'])`
  already refreshes it.

### 3.2 New module `lib/profile.ts`
Holds the profile **type** and all **pure functions** (moved from `authSlice`):
`Profile`, `CompanyOption`, `ProfilePermissions`, `getCompanyCandidates`,
`normalizeProfile`, `getEffectiveRole`, `canManageUsers`,
`canManageCompanySettings`. `authSlice` re-exports the type and helpers for
backward compatibility during migration (no consumer import churn).

### 3.3 `useProfileQuery` (lib/queries.ts)
```
queryKey: ['profile']
enabled: !!user           // from authSlice session
queryFn: fetchProfile      // GET /profile with 404→invite / 401→signOut branches
select: normalizeProfile
retry: false               // 404/401 are terminal, not transient
```
`fetchProfile` encapsulates the exact branching `useAuth` does today:
- 200 → profile
- 404 → `POST /invitations/accept`; success ⇒ profile, 404 ⇒ `return null`
  (unregistered), other ⇒ throw
- 401 → `auth.signOut()` then throw

`null` data means "authenticated but unregistered" (drives RegisterGuard).

### 3.4 `useProfile()` facade (lib/queries.ts)
Single hook consumers call instead of `useAppSelector(s => s.auth)`:
```
{ profile, isRegistered, isAdmin, canManageUsers, canManageCompanySettings,
  isLoading, isPending }
```
Keeps consumer diffs mechanical: `const { profile, isAdmin } = useProfile()`.

### 3.5 Writes & cache coherence
- `useUpdateProfileMutation.onSuccess` switches from `dispatch(setProfile)` to
  `queryClient.setQueryData(['profile'], updated)`.
- Company switching (`Layout`): replace `dispatch(setActiveCompany(id))` with
  `queryClient.setQueryData(['profile'], p => selectCompany(p, id))`.
- Sign-out: `queryClient.removeQueries({ queryKey: ['profile'] })` in `useAuth`'s
  no-user branch.

### 3.6 Bootstrap (`useAuth`)
Reduces to session only: on `onAuthStateChanged`, `setUser` + `setLoading(false)`.
The profile query (enabled by `user`) does the fetching. `loading` stays =
Firebase auth resolution, **not** profile loading.

### 3.7 Guard gating (the delicate part)
- **AuthGuard:** unchanged (`isAuthenticated`, `loading`).
- **RegisterGuard:** must gate on `useProfile().isPending` → render a skeleton
  while the profile query is in flight; only show the "no profile" dialog once
  `data === null`. **Failure mode if wrong:** the register dialog flashes on
  every load. Must be verified live.
- **AdminGuard / CompanySettingsGuard:** gate on `isPending` before evaluating
  `canManage*`, else they redirect to `/` during the initial fetch. Must be
  verified live.

---

## 4. Build Sequence

1. **Foundation (this branch, verifiable offline):** create `lib/profile.ts`;
   `authSlice` imports + re-exports from it; add `useProfileQuery` + `useProfile`
   to `lib/queries.ts`. No consumer/guard/bootstrap change yet. `tsc` + Vitest
   green.
2. **Wire writes:** `useUpdateProfileMutation` + company-switch → `setQueryData`.
3. **Migrate guards** (RegisterGuard, AdminGuard, CompanySettingsGuard) with
   `isPending` gating. **Live auth test after this step.**
4. **Migrate consumers** (Layout, AdminPage, Dashboard, CompanySettings,
   ProfilePage×4, ProfileDialog, RegisterPage, NotFoundPage, AppDebugPanel).
5. **Rewire `useAuth`** to session-only; remove profile fetch.
6. **Trim `authSlice`**; delete now-dead reducers/selectors; update slice tests.
7. **Full regression:** login, register (no-profile + invite paths), admin
   gating, company switch, profile save, quiz submit → dashboard.

Steps 3–7 require live Firebase and MUST NOT merge until step 7 passes.

---

## 5. Test Strategy
- **Unit (offline):** `lib/profile.ts` pure helpers (normalize/permissions) —
  table-driven Vitest. `fetchProfile` branch logic with a mocked `api`.
- **Integration (live Firebase, manual/e2e):** the step-7 regression checklist,
  focusing on the three guard failure modes in §3.7.

---

## 6. Risks
- **R-009** (registered) — auth-gated flow regression. Guard mis-gating is the
  primary hazard; mitigated by `isPending` gating + mandatory live test gate
  before merge. Rollback = revert the feature branch (Phase 1 in v0.13.0 stands
  independently).

---

*Prepared by: Sathittham Sangthong · Status: Draft — foundation implemented, steps 3–7 pending live-auth verification*
