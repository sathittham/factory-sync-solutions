# Cookie Consent & Analytics — User Journeys

How visitors move through consent on both web surfaces. See [README.md](./README.md) for
the design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — the banner, modal, `fss-*` storage, and official → app
> handoff are shipped. The Consent Mode `default`/`update` signalling this spec adds is not
> yet baselined as shipped (spec status: Draft) and is shown dashed.

---

## Table of Contents

- [Visitor — first visit and consent choice](#visitor--first-visit-and-consent-choice)
- [Returning visitor — stored choice replayed](#returning-visitor--stored-choice-replayed)
- [Any user — withdrawing consent](#any-user--withdrawing-consent)
- [Visitor — official → app handoff](#visitor--official--app-handoff)

---

## Visitor — first visit and consent choice

A first-time visitor on either surface sees the banner; their choice lands in the three
`fss-*` localStorage keys.

```mermaid
flowchart TD
    A["First page load"] -.->|roadmap| B["consent 'default' = denied before GTM loads"]
    A --> C["Consent banner shown"]
    C --> D{"Choice"}
    D -->|"Accept All"| E["save analytics=true, marketing=true"]
    D -->|"Cookie Settings → Confirm My Selection"| F["save chosen toggles"]
    E & F --> G["fss-cookie-consent = all / partial / essential<br/>fss-analytics-consent · fss-marketing-consent"]
    G -.->|roadmap| H["consent 'update' — GA4 fires granted hit on the same page"]
```

**Guard(s):** none — public, client-side only; essential cookies are always active and
never gated. Detail in [consent-mode.md](./consent-mode.md).

---

## Returning visitor — stored choice replayed

A visitor who already chose sees no banner; their stored choice must be replayed before the
first analytics hit.

```mermaid
flowchart LR
    A["Page load"] --> B{"fss-cookie-consent present?"}
    B -->|Yes| C["No banner shown"]
    C -.->|roadmap| D["consent 'update' from stored values — before GA4's first call"]
    B -->|No| E["First-visit journey above"]
```

**Guard(s):** none. The replay runs in the same head script as the defaults so there is no
denied first hit — see [consent-mode.md](./consent-mode.md).

---

## Any user — withdrawing consent

Withdrawal must be as easy as granting: the footer "Cookie Settings" entry point is always
available (plus the standalone `/cookie-settings` page owned by
[legal](../legal/README.md)).

```mermaid
flowchart TD
    A["Footer 'Cookie Settings' (OPEN_SETTINGS_EVENT)"] --> B["Settings modal — toggles off"]
    C["/cookie-settings page (legal feature)"] --> B
    B --> D["fss-* keys saved as false / essential"]
    D -.->|roadmap| E["consent 'update' = denied + existing _ga / _ga_* cookies deleted"]
```

**Guard(s):** none. Withdrawal does not retract data already sent to GA4 while consent was
granted — the `/privacy` policy states this.

---

## Visitor — official → app handoff

A choice made on the marketing site carries into the app, so the user never sees a second
banner.

```mermaid
flowchart LR
    A["web-official — consent chosen"] --> B["AppHandoff.tsx appends consent query params to the app link"]
    B --> C["web-app index.html boot script seeds localStorage, strips params"]
    C --> D["App: no banner"]
    D -.->|roadmap| E["initAnalytics(): denied defaults → replay seeded consent → inject GTM"]
```

**Guard(s):** none. The boot script must run before `initAnalytics()` (it does, in
`main.tsx`). Detail in [consent-mode.md](./consent-mode.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
