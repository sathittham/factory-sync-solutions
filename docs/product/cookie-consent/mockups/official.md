# web-official · Cookie Consent — ASCII Mockups

Surface: `web-official` (public Astro marketing site); the `web-app` banner and modal are
**equivalent in behaviour** with identical AC-referenced labels (shared `fss-*` keys), so
no separate app mockup is kept. The UI below is already built and is **not changed** by
this spec — the Consent Mode wiring happens behind these screens. The static
`/cookie-settings` guidance page belongs to the
[legal](../../legal/mockups/official.md) feature.

---

## 1. Any page — first-visit consent banner

### 1a. State: no stored consent (banner overlays bottom of viewport)

```
┌────────────────────────────────────────────────────────────────────┐
│  ◉ FactorySync      Home  Features  Pricing  Contact      EN ▾     │
│                                                                    │
│                        <page content>                              │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  🍪 We use cookies to improve your experience. Essential cookies   │
│     are always on; you choose the rest. <Cookie Policy>            │
│                                                                    │
│              [ Cookie Settings ]        [ Accept All ]             │
└────────────────────────────────────────────────────────────────────┘

Accept All → saves analytics=true, marketing=true → banner dismissed.
Cookie Settings → opens the settings modal (screen 2).
Returning visitors with a stored choice never see the banner.
```

---

## 2. Cookie settings modal

Opened from the banner, or re-opened any time from the footer "Cookie Settings" link
(`OPEN_SETTINGS_EVENT`).

### 2a. State: default (current toggles loaded from `fss-*` keys)

```
┌───────────────────────────────────────────────────┐
│  Privacy Settings                  [ Accept All ] │
│                                                   │
│  ┌───────────────────────────────────────────────┐│
│  │ Essential cookies              Always Active  ││
│  │ Required for the site to work                 ││
│  │ <Cookie Policy>                               ││
│  ├───────────────────────────────────────────────┤│
│  │ Analytics cookies              ( ●──) on      ││
│  │ Help us understand site usage                 ││
│  │ <Cookie Policy>                               ││
│  ├───────────────────────────────────────────────┤│
│  │ Marketing cookies              (──● ) off     ││
│  │ Personalised offers and ads                   ││
│  │ <Cookie Policy>                               ││
│  └───────────────────────────────────────────────┘│
│  ─────────────────────────────────────────────────│
│  [            Confirm My Selection              ] │
└───────────────────────────────────────────────────┘

No ✕ button — the modal closes via Escape or clicking the backdrop
(web-app: shadcn Dialog, which does render its own ✕).

Confirm My Selection → saves toggles:
  fss-cookie-consent    = all / partial / essential
  fss-analytics-consent = "true" / "false"
  fss-marketing-consent = "true" / "false"
then pushes consent('update'); turning analytics off deletes
_ga / _ga_* cookies — see consent-mode.md.
```

### 2b. State: withdrawal (both toggles off)

```
┌───────────────────────────────────────────────────┐
│  Privacy Settings                  [ Accept All ] │
│                                                   │
│  │ Essential cookies              Always Active  ││
│  │ Analytics cookies              (──● ) off     ││
│  │ Marketing cookies              (──● ) off     ││
│  ─────────────────────────────────────────────────│
│  [            Confirm My Selection              ] │
└───────────────────────────────────────────────────┘

Confirm → fss-cookie-consent = "essential"; pushes consent('update')
back to denied + _ga* cookie deletion.
```

---

## 3. Footer — persistent re-entry point

```
├────────────────────────────────────────────────────────────────────┤
│  © FactorySync   Terms · Privacy · Cookies · Marketing ·           │
│                  Cookie Settings   ← reopens modal (screen 2)      │
└────────────────────────────────────────────────────────────────────┘
```

---

*Version: 1.0.2*
*Last updated: 4 July 2026*
