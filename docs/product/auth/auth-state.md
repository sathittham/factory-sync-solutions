# Auth State & Token Attachment (web-app · web-backoffice)

## Summary

The client-side auth plumbing shared in shape by both apps: the Redux `authSlice`
(`apps/web-app/src/store/authSlice.ts`, `apps/web-backoffice/src/store/authSlice.ts`), the
`useAuth` bootstrap hook (`src/hooks/useAuth.ts` in each app), and the `api.ts` helper that
attaches the Firebase ID token to every request.

## Implementation

### `authSlice` (web-app)

State shape (contract, not code):

| Field | Meaning |
|-------|---------|
| `user` | Firebase user (`uid`, `email`, `displayName`, `photoURL`) or `null` |
| `profile` | Firestore profile (company + contact data) or `null` |
| `isAuthenticated` | `user !== null` |
| `isRegistered` | `profile !== null` |
| `isAdmin` | `profile.role === "admin"` |
| `hasCompletedQuiz` | at least one result exists |
| `loading` | `true` until `onAuthStateChanged` resolves |

Actions: `setUser`, `setProfile`, `setHasCompletedQuiz`, `setLoading`, `logout` (resets
everything). `loading` starts `true` on page load and blocks route guards from redirecting
before Firebase resolves the session — this prevents a flash-of-unauthenticated redirect on
hard refresh.

The `web-backoffice` variant reads the `backofficeRole` claim instead
(`setBackofficeRole(role)` from `getIdTokenResult(forceRefresh=true)`); there is no
profile/registration concept for staff.

### `useAuth` bootstrap

```
# pseudocode — runs once at app start
onAuthStateChanged(firebaseUser):
  if null → dispatch logout(); setLoading(false); return
  dispatch setUser({uid, email, displayName, photoURL})
  GET /api/v1/profile (Bearer)
    ok  → setProfile(profile); GET /results → setHasCompletedQuiz(len > 0)
    404 → setProfile(null)            # authenticated but not registered
    401 → dispatch logout()           # token rejected server-side
  setLoading(false)
```

### `api.ts` token attachment

Every API call goes through the helper:

```
# pseudocode
token = auth.currentUser.getIdToken()          # auto-refreshed by the Firebase SDK
fetch(API_BASE + path, headers: {Authorization: "Bearer " + token})
2xx     → unwrap {success, data} → return data
non-2xx → parse {error.message}  → throw ApiError(status, message)
```

`ApiError` carries the HTTP status so `useAuth` can map `401 → logout()` and
`404 → setProfile(null)`. No raw UID is ever sent in a request body — the backend derives
it from the verified token.

## Configuration

| Env var | App | Description |
|---------|-----|-------------|
| `VITE_FIREBASE_*` (six vars) | web-app, web-backoffice | Firebase client config — same project, separate `.env` files |
| `VITE_API_BASE_URL` | web-app, web-backoffice | Optional; defaults to `/api/v1` |

## Usage

Call sites: every page/component that hits the API uses `api.ts`; guards and pages read the
slice via selectors (`isAuthenticated`, `isRegistered`, `isAdmin`, `loading`).

## Acceptance Criteria

- Given a fresh page load, when Firebase has not yet resolved, then `loading` is `true` and no guard redirects.
- Given a signed-in user with no profile, when `/profile` returns 404, then `isRegistered` is `false` and the app routes to `/register`.
- Given a rejected token, when any API call returns 401, then `logout()` resets all auth state.
- Given any API call, when dispatched, then a fresh Bearer token is attached and the `{success, data}` envelope is unwrapped.

## Status

- [x] `authSlice.ts` in both apps
- [x] `useAuth.ts` bootstrap in both apps
- [x] `api.ts` helper in both apps
- [ ] Vitest suites for reducers and `api.ts` recorded in [status.md](./status.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
