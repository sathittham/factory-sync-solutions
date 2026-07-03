# DBD Lookup & Duplicate-ID Check

## Summary

Assistive lookup inside the registration form: a 13-digit company registration ID plus the
"ค้นหา" button auto-fills the company name and estimated size from the DBD Open Data API,
after first checking whether the ID is already registered on the platform. Frontend logic
lives in `RegisterPage.tsx` (`handleDbdLookup`); the DBD proxy endpoint is owned by the
[dbd](../dbd/feature-spec.md) feature (`apps/backend/services/dbd/`), the duplicate check
by the profile service.

## Implementation

Clicking "ค้นหา" runs two calls in order:

1. `GET /api/v1/profile/check/:regId` — returns `{registered: false}` or
   `{registered: true, companyName, companyRegId, industryType, companySize}`. When taken,
   the form shows a blue "already registered" notice and pre-fills name / industry / size
   from the existing record — the user can still register (their profile links to the same
   company context).
2. `GET /api/v1/dbd/:regId` — proxies the DBD Open Data API and returns
   `{nameTh, nameEn, type, registerCapital, objectiveTextTh, …}`. When data is found *and*
   the ID was not already registered, the form pre-fills `companyName` from `nameTh` and
   estimates `companySize` from `registerCapital`. A `DbdInfoCard` (name, type, address) is
   shown either way. Lookup failure is silent — the user fills the fields manually.

### Company-size estimation

Applied automatically on DBD success; the user can override
([feature-spec.md § 4.2](./feature-spec.md#42-company-size-mapping-from-dbd-register-capital)):

| Register capital | Inferred size |
|-----------------|---------------|
| < 5,000,000 THB | `small` |
| 5,000,000 – 199,999,999 THB | `medium` |
| ≥ 200,000,000 THB | `large` |

### Button state machine

"ค้นหา" is disabled while loading or after a successful lookup. Label transitions:
idle → `register.lookup` · loading → `register.lookupLoading` · found →
`register.lookupFound`. Editing the reg ID input resets `dbdInfo` and `regIdTaken`,
re-enabling the button.

## Usage

Call site: `apps/web-app/src/pages/RegisterPage.tsx`.

```
# pseudocode — handleDbdLookup
check = GET /profile/check/:regId
if check.registered → show blue notice; prefill from check

dbd = GET /dbd/:regId
if dbd ok:
    if not check.registered → prefill companyName = nameTh; companySize = estimate(registerCapital)
    show DbdInfoCard(name, type, address)
else → silent (manual entry)
```

## Acceptance Criteria

- Given a valid 13-digit reg ID, when ค้นหา is clicked, then company name and estimated size are pre-filled from DBD and the `DbdInfoCard` is shown.
- Given a reg ID already used by another user, when ค้นหา is clicked, then a blue notice is shown, the form is pre-filled from the existing record, and registration can still proceed.
- Given a DBD lookup failure, when ค้นหา is clicked, then no error blocks the user — fields stay manually editable.
- Given a successful lookup, when the reg ID input changes, then `dbdInfo` and `regIdTaken` reset and the button re-enables.

## Status

- [x] `handleDbdLookup` + `DbdInfoCard` in `RegisterPage.tsx`
- [x] `GET /api/v1/profile/check/:regId` (profile service)
- [x] `GET /api/v1/dbd/:regId` (dbd service — see [dbd/feature-spec.md](../dbd/feature-spec.md))
- [x] Tests — `estimateCompanySize` boundary unit tests; Playwright DBD-prefill E2E

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
