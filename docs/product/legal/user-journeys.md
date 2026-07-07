# Legal Documents — User Journeys

How each app's users move through the legal content. See [README.md](./README.md) for the
design spec and [feature-spec.md](./feature-spec.md) for the formal requirements.

> Reflects what is **built today** — all journeys below are fully shipped. Roadmap steps
> (re-consent on version bump, web-app footer links) are shown dashed.

---

## Table of Contents

- [Factory operator — consent at registration](#factory-operator--consent-at-registration)
- [Public visitor — reading a policy on the official site](#public-visitor--reading-a-policy-on-the-official-site)
- [Any user — managing cookie preferences](#any-user--managing-cookie-preferences)

---

## Factory operator — consent at registration

A new operator signing up on `web-app` must accept Terms + Privacy before the form submits;
they can read any policy inline without losing form state.

```mermaid
flowchart TD
    A["/register — form with consent section"] --> B{"Clicks a policy link?"}
    B -->|"Terms / Privacy / Marketing link"| C["LegalModal opens (TH/EN)"]
    C -->|"Escape / backdrop / ✕"| A
    B -->|"Submits form"| D{"acceptTerms checked?"}
    D -->|No| E["Zod blocks submit — acceptTerms error shown"]
    E --> A
    D -->|Yes| F["POST /profile — marketingConsent true/false"]
    F --> G["Profile created: consentVersion + consentAt stored"]
    G -.->|roadmap| H["Re-consent prompt when consentVersion bumps"]
```

**Guard(s):** registration requires a verified Firebase session; the backend takes the UID
from `middleware.GetUID(r)` and sets `consentAt` server-side. Detail in
[legal-modal.md](./legal-modal.md).

---

## Public visitor — reading a policy on the official site

An unauthenticated visitor on `web-official` reaches the standalone policy pages from the
footer (or a direct link, e.g. from the registration modal's context).

```mermaid
flowchart LR
    A["Any web-official page"] -->|"footer link"| B["/terms · /privacy · /cookies · /marketing"]
    B --> C["LegalContent island renders policy"]
    C -->|"locale switcher"| D["Content re-renders TH ⇄ EN — no reload"]
```

**Guard(s):** none — public pages, no auth. Detail in [legal-content.md](./legal-content.md).

---

## Any user — managing cookie preferences

Three entry points converge on the same preference state (`fss-*` localStorage keys, owned
by the [cookie-consent](../cookie-consent/feature-spec.md) feature).

```mermaid
flowchart TD
    A["First visit — cookie banner"] --> D["Set preference: all / partial / essential"]
    B["Footer 'Cookie Settings'"] --> D
    C["/cookie-settings page"] --> D
    D --> E["fss-cookie-consent + fss-analytics-consent + fss-marketing-consent saved"]
    E -.->|roadmap| F["web-app footer links to /cookies + /cookie-settings"]
```

**Guard(s):** none — client-side preference, no auth.

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
