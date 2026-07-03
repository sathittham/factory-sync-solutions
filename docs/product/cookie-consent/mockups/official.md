# web-official · Cookie Consent — ASCII Mockups

Surface: `web-official` (public Astro marketing site); the `web-app` banner and modal are
**identical in behaviour and copy** (shared `fss-*` keys), so no separate app mockup is
kept. The UI below is already built and is **not changed** by this spec — the Consent Mode
wiring happens behind these screens. The standalone `/cookie-settings` page belongs to the
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
│  Cookie Settings                               ✕  │
│                                                   │
│  ┌───────────────────────────────────────────────┐│
│  │ Essential cookies              [always on]    ││
│  │ Required for the site to work                 ││
│  ├───────────────────────────────────────────────┤│
│  │ Analytics cookies              ( ●──) on      ││
│  │ Help us understand site usage                 ││
│  ├───────────────────────────────────────────────┤│
│  │ Marketing cookies              (──● ) off     ││
│  │ Personalised offers and ads                   ││
│  └───────────────────────────────────────────────┘│
│                                                   │
│        [ Accept All ]   [ Confirm My Selection ]  │
└───────────────────────────────────────────────────┘

Confirm My Selection → saves toggles:
  fss-cookie-consent    = all / partial / essential
  fss-analytics-consent = "true" / "false"
  fss-marketing-consent = "true" / "false"
(roadmap: also pushes consent('update'); turning analytics off
deletes _ga / _ga_* cookies — see consent-mode.md)
```

### 2b. State: withdrawal (both toggles off)

```
┌───────────────────────────────────────────────────┐
│  Cookie Settings                               ✕  │
│                                                   │
│  │ Essential cookies              [always on]    ││
│  │ Analytics cookies              (──● ) off     ││
│  │ Marketing cookies              (──● ) off     ││
│                                                   │
│        [ Accept All ]   [ Confirm My Selection ]  │
└───────────────────────────────────────────────────┘

Confirm → fss-cookie-consent = "essential"; roadmap: consent('update')
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

*Version: 1.0.0*
*Last updated: 3 July 2026*
