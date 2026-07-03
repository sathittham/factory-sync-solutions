# ProfilePage (web-app)

## Summary

Standalone account page routed at `/profile`. Lives at
`apps/web-app/src/pages/ProfilePage.tsx`; renders an account summary card plus Profile,
Notifications, Activity, and Security tabs. The Activity tab is the user-facing audit log
for the signed-in user.

## Implementation

- `max-w-2xl` page inside the app shell.
- **Profile tab** — the same company/contact form as `ProfileDialog` (currently
  duplicated Zod schema, `industryKeys`, `sizeKeys`, and submit logic; extraction to a
  shared `useProfileForm` hook is tracked as future work).
- **Activity tab** — calls `GET /api/v1/profile/activity` and renders events newest
  first with localized labels (`profile.activity.*` i18n keys). Events include actions
  where the caller is the actor and actions where the caller is the target (e.g. a
  superadmin changing their role).
- **Security tab** — sign-in methods and password controls.
- Unlike `ProfileDialog`, this page tracks **no** analytics events.

### Activity endpoint contract

| Query param | Default | Description |
|-------------|---------|-------------|
| `limit` | `50` | Max `100` |
| `before` | none | RFC3339 cursor for older events |
| `eventType` | none | Optional exact event type |

The UID always comes from `middleware.GetUID(r)` — the endpoint never accepts a UID in
the body or path, so users can only read their own log.

### Known cleanup (open)

Timestamps currently render with raw `new Date(...).toLocaleString()` — they must move to
`formatDateTime()` from `@/lib/dayjs` (Thai locale = Buddhist Era) before the tab ships as
the main personal audit surface. Loading, empty, and error tests are also still to be added.

## Usage

```
# pseudocode — Activity tab
on tab open → GET /api/v1/profile/activity?limit=50
  200 → render events newest-first:
          label = t('profile.activity.' + eventType)   # localized TH/EN
          time  = formatDateTime(createdAt)            # target state (cleanup open)
  []  → render t('profile.activityEmpty')
  err → error state
```

```
# pseudocode — login event (fired by the auth bootstrap, not this page)
after Firebase auth + profile load → POST /api/v1/profile/activity/login
  failure → ignored (audit logging never blocks login UX)
```

## Acceptance Criteria

- Given `/profile`, when the Activity tab is opened, then `GET /api/v1/profile/activity` is called and events render newest first with localized labels.
- Given the response is empty, when the tab renders, then the `profile.activityEmpty` copy is shown.
- Given any activity event, when rendered, then its timestamp uses `formatDateTime()` from `@/lib/dayjs`.
- Given any user, when they use the Activity tab, then only their own actor/target events are visible.
- Given the Profile tab, when the form is saved, then the behavior matches `ProfileDialog` (dirty gating, `setProfile` dispatch, success banner).

## Status

- [x] `ProfilePage.tsx` implemented and routed at `/profile`
- [x] Activity tab wired to `GET /api/v1/profile/activity`
- [ ] Timestamps migrated to `formatDateTime()` (currently raw `toLocaleString()`)
- [ ] Activity loading/empty/error tests (Playwright)
- [ ] Shared form logic extracted with `ProfileDialog` (future work)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
