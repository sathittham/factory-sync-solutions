# web-official · Legal Documents — ASCII Mockups

Surface: `web-official` (public Astro marketing site). Design system: shadcn/ui · Tailwind,
rendered inside the `LegalContent` React island. Site shell: top nav + footer.

---

## 1. `/terms` · `/privacy` · `/cookies` · `/marketing` — standalone policy page

### 1a. State: default (EN locale; TH via switcher, no reload)

```
┌────────────────────────────────────────────────────────────────────┐
│  ◉ FactorySync      Home  Features  Pricing  Contact      EN ▾     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Terms and Conditions                                             │
│   Last updated: March 7, 2025                                      │
│                                                                    │
│   1. Acceptance of Terms                                           │
│      <policy body ...>                                             │
│   2. Description of Service                                        │
│      <policy body ...>                                             │
│   ...                                                              │
│   11. Contact: info@factorysyncsolutions.com                       │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│  © FactorySync vX.Y.Z   Terms · Privacy · Cookies · Marketing ·    │
│                         Cookie Settings                            │
└────────────────────────────────────────────────────────────────────┘

Footer legal links navigate between the five routes. Same layout for all
four policies — only title + body change (route map in legal-content.md).
```

---

## 2. `/cookie-settings` — cookie preference manager

### 2a. State: default (current preference loaded from localStorage)

```
┌────────────────────────────────────────────────────────────────────┐
│  ◉ FactorySync      Home  Features  Pricing  Contact      EN ▾     │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│   Cookie Settings                                                  │
│   Manage which cookies this site may use.                          │
│                                                                    │
│   ┌────────────────────────────────────────────────────────────┐   │
│   │  Essential cookies                          [always on]    │   │
│   │  Auth session · locale · consent state                     │   │
│   ├────────────────────────────────────────────────────────────┤   │
│   │  Security cookies                           [always on]    │   │
│   │  Cloudflare Turnstile · CDN                                │   │
│   ├────────────────────────────────────────────────────────────┤   │
│   │  Analytics cookies                          ( ●──) on      │   │
│   │  Google Analytics 4 · Tag Manager                          │   │
│   ├────────────────────────────────────────────────────────────┤   │
│   │  Marketing cookies                          (──● ) off     │   │
│   │  GA4 ad signals · future marketing tags                    │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│                             [ Save preferences ]                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Save → writes fss-cookie-consent / fss-analytics-consent /
fss-marketing-consent (cookie-consent feature owns the keys).
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
