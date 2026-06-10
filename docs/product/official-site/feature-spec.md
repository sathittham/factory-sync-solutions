---
version: 1.0.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done
---

# Official Marketing Site — Feature Spec

> Public-facing Astro 6 + React islands marketing site. One-page landing with
> eight anchor sections, four service detail pages, five legal pages, and a
> cookie-settings page. No authentication required. Bilingual (TH/EN),
> dark-mode aware, fully static (Cloudflare Pages).

---

## 1. Summary

`apps/fs-official-web` is the public marketing site. It is separate from the
authenticated app (`fs-app-web`) and has its own URL. Its primary goal is to
explain the service and drive registrations via CTA buttons that link to
`PUBLIC_APP_URL` (the app).

All interactive sections are React islands (`client:load`). Static content
is rendered by Astro at build time. The site has no backend calls — it is purely
static.

---

## 2. Architecture

```
Astro 6 (SSG)
    └─ pages/
        ├─ index.astro              → LandingContent (React island)
        ├─ services/[slug].astro    → ServiceContent (React island)
        ├─ terms.astro              → LegalContent (React island)
        ├─ privacy.astro            → LegalContent (React island)
        ├─ cookies.astro            → LegalContent (React island)
        ├─ marketing.astro          → LegalContent (React island)
        └─ cookie-settings.astro   → LegalContent (React island)
```

Each Astro page is a thin shell that passes `appUrl` and `version` env vars as
props to a React island. All UI logic lives in the React components.

**Shared chrome** (`apps/fs-official-web/src/components/site/chrome.tsx`):
`LogoIcon`, `ThemeSwitcher`, `LocaleSwitcher`, `SiteFooter` — exported and reused
by both `LandingContent` and `ServiceContent`.

**Environment variables:**

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PUBLIC_APP_URL` | No | `"#"` | CTA link target (the app URL) |
| `PUBLIC_APP_VERSION` | No | `"dev"` | Version displayed in footer |

---

## 3. Pages

### 3.1 Landing Page (`/`)

**Component:** `apps/fs-official-web/src/components/landing/LandingContent.tsx`

A single-page layout with 8 anchor sections, sticky nav, locale switcher, and
theme switcher. All content strings go through `useLocale()`.

**Nav links (in order):**

| i18n key | Anchor |
|----------|--------|
| `nav.home` | `#hero` |
| `nav.healthCheck` | `#dimensions` |
| `nav.engineering` | `#expert` |
| `nav.peace` | `#services` |
| `nav.cases` | `#results` |
| `nav.blog` | `#process` |
| `nav.about` | `#about` |
| `nav.contact` | `#contact` |

#### Sections

**`#hero` — HeroSection**

Full-bleed background image with light/dark gradient overlays and a CSS
scanlines effect. Two columns on desktop (text left, image right implied by
background). Four stat cards in a 2×4 grid: `43` questions, `8` dimensions,
`15` minutes, and a "report" card. Two CTAs: "เริ่มประเมินฟรี" (`appUrl`) and
"ปรึกษาผู้เชี่ยวชาญ" (`#contact`).

**`#dimensions` — DimensionsSection**

8-dimension card grid (2-col mobile, 4-col desktop) beside a live SVG radar
chart. The radar uses hardcoded demonstration values (not real user data). Each
dimension card shows a number badge (01–08), icon, and localised name.

| No. | i18n key | Dimension |
|-----|----------|-----------|
| 01 | `landing.dim.basic` | การจัดการงานเบื้องต้น / Basic Management |
| 02 | `landing.dim.improvement` | การปรับปรุงงาน / Work Improvement |
| 03 | `landing.dim.coordination` | การประสานงาน / Coordination |
| 04 | `landing.dim.maintenance` | การบำรุงรักษา / Maintenance |
| 05 | `landing.dim.quality` | คุณภาพ / Quality |
| 06 | `landing.dim.production` | การผลิต / Production |
| 07 | `landing.dim.material` | วัสดุ / Material |
| 08 | `landing.dim.cost` | ต้นทุน / Cost |

**`#expert` — ExpertSection**

Three-column layout: certificate card (decorative), service bullet list, and a
"trusted by" stat column. Certificate card renders a gold seal SVG (with text
from i18n `landing.seal.*`). Bullet points are locale-specific arrays
(`EXPERT_BULLETS.th` / `.en`).

**`#services` — ServicesSection**

4-card grid for the four services. Cards use Unsplash images (HTTPS, no CDN key
required for public usage). Each card links to the corresponding service detail
page (`/services/{slug}`).

| Title key | Slug | Image |
|-----------|------|-------|
| `service.healthCheck.title` | `factory-health-check` | Unsplash `1504917595217` |
| `service.production.title` | `production-assessment` | Unsplash `1565043666747` |
| `service.consulting.title` | `efficiency-consulting` | Unsplash `1581092160607` |
| `service.digital.title` | `digital-factory` | Unsplash `1518770660439` |

**`#process` — ProcessSection**

4-step numbered process cards: Register → Assessment → AI + Expert Analysis →
Report. Content is locale-specific (`PROCESS_STEPS.th` / `.en`). Step time for
the assessment: "ประมาณ 15 นาที" / "approximately 15 minutes".

**`#results` — ResultsSection**

4 anonymised case-study cards showing industry badge, metric (e.g. `-28%`),
description, and timeframe. Content is locale-specific (`RESULTS_CARDS.th` / `.en`).

| Badge | Industry | Metric | Timeframe |
|-------|----------|--------|-----------|
| A | AUTOPARTS | -28% defects | 6 months |
| B | BEVERAGE | +22% productivity | 5 months |
| E | ELECTRONICS | -35% downtime | 4 months |
| P | PACKAGING | +18% delivery | 3 months |

**`#contact` — ContactSection**

Contact details card: phone, email (`info@factorysyncsolutions.com`), Line
contact icon, and office hours. Alongside a CTA card repeating the register
prompt.

**`#about` — AboutSection** *(within the page)*

Company background, mission, and trust signals. Shares the same visual language
as the TrustBarSection.

**Footer**

`SiteFooter` shared component. Contains nav links to legal pages, cookie
settings, social links, version badge, and copyright.

---

### 3.2 Service Detail Pages (`/services/[slug]`)

**Component:** `apps/fs-official-web/src/components/services/ServiceContent.tsx`

Four static routes generated from `SERVICE_ORDER`:

| Slug | Thai Title | English Title |
|------|-----------|---------------|
| `factory-health-check` | ตรวจสุขภาพโรงงาน | Factory Health Check |
| `production-assessment` | ตรวจประเมินระบบการผลิต | Production System Assessment |
| `efficiency-consulting` | ที่ปรึกษาปรับปรุงประสิทธิภาพ | Efficiency Improvement Consulting |
| `digital-factory` | Digital Factory & Smart Dashboard | Digital Factory & Smart Dashboard |

Each page shares:
- Stripped-down nav (logo + locale/theme switchers + CTA only, no anchor links)
- Hero with service title, description, feature checklist
- Related services section (other 3 slugs)
- `SiteFooter`

Service detail content is stored in `SERVICE_DETAILS` constant inside
`ServiceContent.tsx` as locale-keyed objects (`th` / `en`).

---

### 3.3 Legal Pages

Documented in [legal/feature-spec.md](../legal/feature-spec.md). Summary:

| Route | Component prop |
|-------|---------------|
| `/terms` | `page="terms"` |
| `/privacy` | `page="privacy"` |
| `/cookies` | `page="cookies"` |
| `/marketing` | `page="marketing"` |
| `/cookie-settings` | `page="cookie-settings"` |

---

## 4. Locale & Theme

Both features live inside the `LocaleProvider` and `useTheme` hook in
`LandingContent.tsx` and are shared via `chrome.tsx` exports.

**Locale:**
- Persisted to `localStorage` key `fss-locale` via `useLocale()`'s `setLocale`.
- Default: `"th"` (no browser-language detection).
- Switched via `LocaleSwitcher` dropdown in the nav.

**Theme:**
- `"light"` | `"dark"` | `"system"`.
- Persisted to `localStorage` key `fss-theme`.
- Default: `"system"`.
- Switched via `ThemeSwitcher` dropdown in the nav.
- Applied by toggling `dark` class on `document.documentElement`.

---

## 5. Cookie Consent

`CookieConsent.tsx` renders a consent banner on the first visit and is mounted
as a React island on the landing page. Documented in
[cookie-consent/feature-spec.md](../cookie-consent/feature-spec.md).

---

## 6. `AppHandoff.tsx`

A React island on the landing page that reads the `?registered=1` query param
(set by `fs-app-web` after successful registration) and shows a brief success
message before the CTA. This is the only cross-app communication between
`fs-official-web` and `fs-app-web`.

---

## 7. Build & Deploy

```bash
cd apps/fs-official-web
npm run build        # astro build → dist/
npm run preview      # local preview of static output
npm run deploy:staging  # wrangler pages deploy dist/ --project-name=... (staging)
npm run deploy:prod     # wrangler pages deploy dist/ --project-name=... (prod)
```

Deployed to Cloudflare Pages. GitHub Actions triggers on `v*-staging` and
`v*.*.*` tags. See [git.md](../../../.claude/rules/git.md) for release flow.

---

## 8. SEO

Each Astro page sets `<title>` via `Layout.astro`. The landing page title is:
`"FactorySync Solutions — ประเมินสุขภาพโรงงานด้วย AI"`. Service pages use the
generic title `"FactorySync Solutions"` (slug-specific titles not yet wired).

Open Graph and structured data are not yet implemented (future work).

---

## 9. Open Tasks

### 9.1 Service page `<title>` SEO

`[slug].astro` passes a generic `"FactorySync Solutions"` title to `Layout`.
Fix: pass the service's localised title as the page title for better search
indexing.

### 9.2 Open Graph / structured data

No `<meta property="og:*">` or `application/ld+json` schema is present. Add
organisation and service schema for rich search results.

### 9.3 Sitemap and robots.txt

Astro's `@astrojs/sitemap` integration is not configured. Add it and submit to
Google Search Console.

### 9.4 Unsplash image dependency

Service card images are loaded directly from Unsplash URLs. These are public but
not owned assets. Replace with owned photography or a licensed image service.

---

## 10. Acceptance Criteria

- [ ] `/` loads and displays the hero section with both CTA buttons.
- [ ] The 8 dimension cards render with correct TH and EN labels on locale switch.
- [ ] The radar chart renders with all 8 axes and correct labels.
- [ ] `/services/factory-health-check`, `production-assessment`, `efficiency-consulting`, `digital-factory` each return 200.
- [ ] Service pages display the correct Thai and English title on locale switch.
- [ ] Theme switcher persists choice across page reload (via localStorage).
- [ ] Locale switcher persists choice across page reload.
- [ ] Cookie consent banner appears on first visit and is suppressible.
- [ ] Footer links to `/terms`, `/privacy`, `/cookies`, `/marketing` all resolve.
- [ ] CTA "เริ่มประเมินฟรี" / "Start Free Assessment" links point to `PUBLIC_APP_URL`.
- [ ] `npm run build` completes without errors.
- [ ] Deployed URL returns 200 for all above routes.

---

## 11. References

- Landing content: [LandingContent.tsx](../../../apps/fs-official-web/src/components/landing/LandingContent.tsx)
- Service content: [ServiceContent.tsx](../../../apps/fs-official-web/src/components/services/ServiceContent.tsx)
- Site chrome: [site/chrome.tsx](../../../apps/fs-official-web/src/components/site/)
- Landing page: [index.astro](../../../apps/fs-official-web/src/pages/index.astro)
- Service pages: [services/[slug].astro](../../../apps/fs-official-web/src/pages/services/)
- Cookie consent: [CookieConsent.tsx](../../../apps/fs-official-web/src/components/CookieConsent.tsx)
- App handoff: [AppHandoff.tsx](../../../apps/fs-official-web/src/components/AppHandoff.tsx)
- Legal feature: [legal/feature-spec.md](../legal/feature-spec.md)
- Cookie consent feature: [cookie-consent/feature-spec.md](../cookie-consent/feature-spec.md)
