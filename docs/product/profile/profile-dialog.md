# ProfileDialog (web-app)

## Summary

Three-section modal (Account / Contact Person / Company Profile) that is the current
primary profile-editing surface. Lives at
`apps/web-app/src/components/ProfileDialog.tsx`; mounted once, permanently, at the bottom
of `Layout` and opened via `open` / `onOpenChange` props from three nav triggers.

## Implementation

- shadcn/ui `Dialog`, `max-w-lg`, `max-h-[90vh]` with `overflow-y-auto`.
- **Account section** is read-only: Google avatar, display name, email, and the 13-digit
  registration ID — none of these are sent in the PUT body.
- **Contact / Company sections** hold the six editable fields (`contactName`,
  `contactEmail`, `contactPhone`, `companyName`, `industryType`, `companySize`);
  `industryType` and `companySize` use shadcn `SelectField`, never native `<select>`.
- Opening resets the form to the **latest profile in Redux**
  (`useEffect([open, profile, reset])`) so a re-open after another device/tab updated the
  profile never shows stale values.
- "Save Changes" is disabled while `!isDirty` or `isSubmitting`.
- On 200: dispatch `setProfile(updated)` to `authSlice`, show a success banner, clear it
  after 3 s. On error: inline error message; the dialog stays open.
- Closing (✕ / backdrop / Escape) discards unsaved changes without an API call.

### Analytics

Only the dialog tracks events — `ProfilePage` does not.

| Event | Trigger | Properties |
|-------|---------|------------|
| `profile_open` | Dialog opened from nav | `{ source: 'desktop_dropdown' \| 'mobile_drawer' \| 'mobile_nav' }` |
| `profile_save` | Form submitted (before API call) | `{ industry, size }` |
| `profile_save_success` | API returns 200 | `{ industry, size }` |
| `profile_save_error` | API call fails | `{ error }` |

## Usage

Call site: `apps/web-app/src/components/Layout.tsx` (mount) + nav components (triggers).

```
# pseudocode — Layout owns the open state; nav triggers open it
profileOpen = false

NavDesktop avatar/name button   → profileOpen = true  (source: desktop_dropdown)
NavMobile user summary row      → profileOpen = true  (source: mobile_drawer)
NavMobile "Profile" link        → profileOpen = true  (source: mobile_nav)

<ProfileDialog open={profileOpen} onOpenChange={set} />

# submit — all six fields sent (no partial sends from the client)
PUT /api/v1/profile { companyName, industryType, companySize,
                      contactName, contactEmail, contactPhone }
200 → dispatch(setProfile(data)); success banner 3 s
err → inline error; trackEvent('profile_save_error')
```

The backend treats every field as `omitempty` and does a selective field update — see
[feature-spec.md § 8](./feature-spec.md#8-backend-api).

## Acceptance Criteria

- Given the dialog opens, when the form renders, then all fields are pre-filled from the current Redux profile.
- Given the profile changed elsewhere, when the dialog is re-opened, then the form shows the latest Redux data.
- Given a pristine form, when viewed, then "Save Changes" is disabled; editing any field enables it.
- Given a successful save, when the API returns 200, then `setProfile` is dispatched, the nav updates immediately, and a 3-second success banner shows.
- Given an API failure, when the save completes, then an inline error is shown and `profile_save_error` is tracked.
- Given unsaved changes, when the dialog is closed via ✕ / backdrop / Escape, then no API call is made and the changes are discarded.

## Status

- [x] `ProfileDialog.tsx` implemented and mounted in `Layout`
- [x] Three nav triggers wired with `profile_open` source tracking
- [ ] Vitest suite (pre-fill, reset, button states, dispatch, error path)
- [ ] Shared form logic extracted with `ProfilePage` (`useProfileForm` — future work)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
