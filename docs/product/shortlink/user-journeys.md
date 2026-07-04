# Shortlink Service — User Journeys

How each app's users will move through the shortlink feature. See
[README.md](./README.md) for the design spec and [feature-spec.md](./feature-spec.md) for
the formal requirements.

> Reflects what is **built today** — nothing. The feature is in planning; **every journey
> below is roadmap**, so all edges are shown dashed.

---

## Table of Contents

- [Authenticated user — creating and managing shortlinks](#authenticated-user--creating-and-managing-shortlinks)
- [Authenticated user — viewing analytics](#authenticated-user--viewing-analytics)
- [Public visitor — following a shortlink](#public-visitor--following-a-shortlink)

---

## Authenticated user — creating and managing shortlinks

An authenticated `web-app` user shortens a long URL (optionally with a custom slug) and
manages their links from `/shortlinks`.

```mermaid
flowchart TD
    A["/shortlinks — ShortlinkListPage"] -.-> B["Create Shortlink → dialog"]
    B -.-> C{"URL valid? slug ≤ 20 chars, available?"}
    C -.->|No| D["Inline validation errors"]
    D -.-> B
    C -.->|Yes| E["POST /shortlinks"]
    E -.->|201| F["Link appears in list — no reload · slug, shortURL, QR ready"]
    E -.->|"429 rate limit"| G["Friendly error: try again later"]
    F -.-> H["Copy link → clipboard"]
    F -.-> I["Download QR → qrcode-{slug}.svg"]
    F -.-> J["Delete → shadcn AlertDialog → DELETE /shortlinks/:id → 204"]
```

**Guard(s):** all management routes require a Bearer Firebase token; UID from
`middleware.GetUID(r)`; creation rate-limited to 10/hour per user. Detail in
[shortlink-service.md](./shortlink-service.md).

---

## Authenticated user — viewing analytics

The link owner inspects click performance over a chosen date range.

```mermaid
flowchart LR
    A["/shortlinks list"] -.->|"View Analytics"| B["/shortlinks/:id/analytics"]
    B -.-> C["GET /shortlinks/:id/analytics?startDate&endDate"]
    C -.-> D["Charts: clicks over time · geography · devices"]
    C -.-> E["Tables: top referrers · recent clicks"]
    B -.-> F["Date range: 7 / 30 / 90 days · custom"]
    F -.-> C
```

**Guard(s):** Bearer token; `403` when the shortlink belongs to another user. IPs are never
exposed in responses. Detail in [click-analytics.md](./click-analytics.md).

---

## Public visitor — following a shortlink

Anyone (no auth) clicking a short URL or scanning its QR code is redirected while the click
is logged.

```mermaid
flowchart LR
    A["Click fs.link/abc123 or scan QR"] -.-> B["GET /s/:slug — public"]
    B -.-> C{"Slug exists?"}
    C -.->|Yes| D["Log click (UA · IP · geo · referrer) → clicks collection"]
    D -.-> E["301 redirect to originalURL"]
    C -.->|"No / deleted"| F["404"]
```

**Guard(s):** none for the redirect itself (public by design); rate-limited 100/min per IP
to prevent abuse. Detail in [shortlink-service.md](./shortlink-service.md).

---

*See [README.md](./README.md) for the feature spec.*

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
