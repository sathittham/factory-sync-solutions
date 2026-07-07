# DBD Integration — User Journeys

Where the DBD data surfaces for users. See [README.md](./README.md) for the design spec
and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — the whole flow is shipped. The DBD integration has no
> UI of its own; its single surface is the company-lookup step inside the registration
> form (owned by the [register](../register/feature-spec.md) feature).

---

## Table of Contents

- [Factory operator — company lookup at registration](#factory-operator--company-lookup-at-registration)

---

## Factory operator — company lookup at registration

A new operator registering on `web-app` enters their 13-digit Thai company registration
ID and taps "ค้นหา / Lookup" to auto-fill the company name instead of typing it.

```mermaid
flowchart TD
    A["/register — enters 13-digit regId"] -->|"clicks ค้นหา / Lookup"| B["GET /profile/check/{regId} — duplicate check"]
    B -->|duplicate| C["Blocked — company already registered"]
    B -->|not duplicate| D["GET /api/v1/dbd/{regId}"]
    D -->|200| E["companyName pre-filled with nameTh — user can still edit"]
    D -->|404| F["Company not found in DBD — user types the name manually"]
    D -->|502| G["DBD unavailable — user types the name manually"]
    E --> H["Continues registration and submits"]
    F --> H
    G --> H
```

**Guard(s):** the lookup requires a Firebase session — the endpoint sits behind
`FirebaseAuth` middleware (anonymous callers get 401), and the handler validates
`regId` as `^\d{13}$` before any upstream call. Detail in
[dbd-lookup.md](./dbd-lookup.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
