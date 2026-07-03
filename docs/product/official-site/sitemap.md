---
version: 0.1.0
lastUpdated: 2026-07-04
author: Sathittham Sangthong
status: Draft
---

# Official Site — Sitemap & Information Architecture

> Target IA for `factorysyncsolutions.com` (`apps/web-official`). This document is
> the **source of truth** for the site restructure shown in the reference
> mockups (`docs/ref/messageImage_1782292944152.jpg`,
> `docs/ref/messageImage_1782292974212.jpg`). Write/approve this before
> implementation (ISO 29110 SI.2 — requirements before code).

---

## 1. Summary

The current site is a **single-page landing** (8 anchor sections) plus **4
service detail pages** and legal pages. The target IA expands this into a
**multi-page marketing site** with:

- A real **Home** page
- An **About Us** section (3 sub-pages)
- A **Services mega menu** with 4 groups, two of which are Hub pages with
  children (5 + 8 service detail pages)
- A **Knowledge Hub** (blog) with 8 categories
- A floating **"Free Factory Health Check" CTA** on every page
- A **Contact** page
- An **Admin / Client Portal** (back office — *separate app scope*, see §7)

This is a **breaking restructure** of the public site's routing. The portal is
**not** part of `web-official`; it maps to `web-backoffice` / `web-cms` and is
documented here only for completeness.

---

## 2. Full Sitemap (transcribed from reference)

```
factorysyncsolutions.com
│
├─ หน้าแรก (Home)
│
├─ เกี่ยวกับเรา (About Us)
│   ├─ ประวัติบริษัท / วิสัยทัศน์            (Company history / vision)
│   ├─ ทีมวิศวกร                            (Engineer team — licensed industrial
│   │                                        engineers + consultant/trainer team)
│   └─ ผลงาน / ลูกค้าที่ไว้วางใจ (Case Study) (Portfolio / trusted clients)
│
├─ บริการของเรา (Services) ── Mega Menu, 4 groups
│   │
│   ├─ 1. ตรวจสุขภาพโรงงานเบื้องต้น (ฟรี)   ★ Flagship / primary CTA
│   │
│   ├─ 2. บริการที่รัฐสนับสนุน  (Hub)         (Government-supported services)
│   │   ├─ 2.1 Digital Factory Layout 360
│   │   ├─ 2.2 Smart Preventive Maintenance
│   │   ├─ 2.3 Shindan–Lean–Kaizen           (SME productivity improvement)
│   │   ├─ 2.4 การตลาดออนไลน์ & ระบบทำงานอัจฉริยะ (Online marketing & smart ops)
│   │   └─ 2.5 In House Training
│   │
│   ├─ 3. ที่ปรึกษางานวิศวกรรม              (Engineering consulting — overview/strategy)
│   │
│   └─ 4. ออกแบบงานวิศวกรรม & เซ็นรับรองแบบ (Hub) (Engineering design & certified sign-off)
│       ├─ 4.1 ขอใบอนุญาตโรงงาน (รง.2 / รง.4) ทุกประเภท (Factory licenses)
│       ├─ 4.2 ออกแบบเครื่องจักร / ระบบอัตโนมัติ (SA/SI)
│       ├─ 4.3 ที่ปรึกษาวิศวกรรม (เฉพาะโครงการออกแบบ/เซ็นรับรอง)
│       ├─ 4.4 งานขออนุญาตก่อสร้าง / อาคาร
│       ├─ 4.5 งานติดตั้งระบบพิเศษ
│       ├─ 4.6 งานระบบบำบัดมลพิษ / สิ่งแวดล้อม
│       ├─ 4.7 ขึ้นทะเบียนเครื่องจักร ทุกประเภท
│       └─ 4.8 ใบอนุญาตและรับรองระบบ (มาตรฐาน / ISO ฯลฯ)
│
├─ บทความ / ความรู้ (Knowledge Hub) ── 8 categories
│   ├─ กฎหมาย / ใบอนุญาตโรงงาน              (Law / factory licensing)
│   ├─ ความปลอดภัยโรงงาน                    (Factory safety)
│   ├─ Digital Factory & เทคโนโลยี
│   ├─ เครื่องจักร & ระบบอัตโนมัติ
│   ├─ สิ่งแวดล้อม / บำบัดมลพิษ
│   ├─ Lean & Kaizen / เพิ่มผลผลิต
│   ├─ การตลาดออนไลน์ & Digital Transformation
│   └─ สิทธิประโยชน์ภาครัฐ / มาตรฐานสากล
│
├─ ขอประเมิน / นัดตรวจสุขภาพโรงงานฟรี      (Floating CTA — every page)
│
├─ ติดต่อเรา (Contact)
│
└─ ระบบหลังบ้าน (Admin / Client Portal) ── separate app, see §7
    ├─ Dashboard ภาพรวม
    ├─ CRM จัดการ Lead / ลูกค้า
    ├─ Case / Engagement Tracking (per-service-group flow)
    ├─ Document & Drawing Management
    ├─ CMS บทความ
    ├─ ปฏิทินนัดวิศวกร / ที่ปรึกษา / วิทยากร
    ├─ โมดูล Preventive Maintenance
    ├─ โมดูลติดตาม Lean / Kaizen (KPI ก่อน–หลัง)
    ├─ โมดูลจัดการ Training (ตารางอบรม / ผู้เข้าร่วม / วุฒิบัตร)
    ├─ ใบเสนอราคา / ใบแจ้งหนี้
    └─ จัดการผู้ใช้งาน / สิทธิ์การเข้าใช้งาน
```

---

## 3. Public Route Map (`web-official`)

Proposed URL structure. Slugs are English/kebab-case; Thai labels come from i18n.

| # | Page | Route | Type | Notes |
|---|------|-------|------|-------|
| — | Home | `/` | Page | Replaces current one-page landing as the entry point |
| **About** | | | | |
| | About (overview) | `/about` | Page | Section landing |
| | Company / Vision | `/about/company` | Page | History, vision, mission |
| | Engineer Team | `/about/team` | Page | Licensed engineers + consultants/trainers |
| | Case Studies | `/about/case-studies` | Page | Portfolio / trusted clients |
| **Services** | | | | Mega menu |
| | Free Health Check | `/services/factory-health-check` | Page ★ | Flagship; CTA → `PUBLIC_APP_URL` |
| | Gov-Supported (Hub) | `/services/government-supported` | Hub | Lists 2.1–2.5 |
| | Digital Factory Layout 360 | `/services/government-supported/digital-factory-layout-360` | Detail | |
| | Smart Preventive Maintenance | `/services/government-supported/smart-preventive-maintenance` | Detail | |
| | Shindan–Lean–Kaizen | `/services/government-supported/shindan-lean-kaizen` | Detail | |
| | Online Marketing & Smart Ops | `/services/government-supported/online-marketing-smart-ops` | Detail | |
| | In-House Training | `/services/government-supported/in-house-training` | Detail | |
| | Engineering Consulting | `/services/engineering-consulting` | Page | Overview/strategy |
| | Engineering Design & Sign-off (Hub) | `/services/engineering-design` | Hub | Lists 4.1–4.8 |
| | Factory License (รง.2/รง.4) | `/services/engineering-design/factory-license` | Detail | |
| | Machine / Automation Design (SA/SI) | `/services/engineering-design/machine-automation-design` | Detail | |
| | Engineering Consulting (design/sign-off) | `/services/engineering-design/engineering-consulting` | Detail | Project-specific |
| | Construction / Building Permits | `/services/engineering-design/construction-permits` | Detail | |
| | Special System Installation | `/services/engineering-design/special-systems` | Detail | |
| | Pollution / Environmental Systems | `/services/engineering-design/environmental-systems` | Detail | |
| | Machine Registration | `/services/engineering-design/machine-registration` | Detail | |
| | Certifications & Standards (ISO) | `/services/engineering-design/certifications` | Detail | |
| **Knowledge** | | | | |
| | Knowledge Hub | `/knowledge` | Hub | Article listing |
| | Category | `/knowledge/category/[category]` | List | 8 categories (see §5) |
| | Article | `/knowledge/[slug]` | Detail | CMS-driven (see §6) |
| **Other** | | | | |
| | Contact | `/contact` | Page | |
| | Legal (existing) | `/terms` `/privacy` `/cookies` `/marketing` `/cookie-settings` | Page | Unchanged |

> **Slug naming — DECIDED:** services are **nested under group hubs** (URLs
> above). Better SEO + breadcrumbs. `getStaticPaths` must emit the nested paths.

---

## 4. Navigation & Mega Menu

**Primary nav (desktop):** Home · About ▾ · Services ▾ (mega) · Knowledge · Contact
· `[ตรวจสุขภาพโรงงานฟรี]` (button, accent).

**Services mega menu** — 4 columns matching the 4 groups:

```
┌──────────────────┬───────────────────────┬──────────────────┬────────────────────────┐
│ 1. Free Health   │ 2. Gov-Supported       │ 3. Engineering   │ 4. Design & Sign-off   │
│    Check ★       │    (Hub →)             │    Consulting    │    (Hub →)             │
│                  │  • Digital Factory 360 │                  │  • Factory License     │
│  Flagship card,  │  • Smart Prev. Maint.  │  Overview /      │  • Machine/Automation  │
│  accent border,  │  • Shindan-Lean-Kaizen │  strategy page   │  • Eng. Consulting     │
│  "ฟรี" badge,    │  • Online Mktg & Ops   │                  │  • Construction Permit │
│  CTA button      │  • In-House Training   │                  │  • Special Systems     │
│                  │                        │                  │  • Environmental       │
│                  │                        │                  │  • Machine Reg.        │
│                  │                        │                  │  • Certifications/ISO  │
└──────────────────┴───────────────────────┴───────────────────────┴────────────────────┘
```

**Mobile nav:** accordion drawer; Services expands to the 4 groups, hubs expand
to their children.

**Floating CTA:** persistent button/pill on every page (bottom-right on mobile,
inline-sticky on desktop) → "ขอประเมิน/นัดตรวจสุขภาพโรงงานฟรี" linking to the
free health check flow (`PUBLIC_APP_URL`).

---

## 5. Knowledge Hub Categories

| Category slug | Thai | English |
|---|---|---|
| `law-licensing` | กฎหมาย/ใบอนุญาตโรงงาน | Law / Factory Licensing |
| `factory-safety` | ความปลอดภัยโรงงาน | Factory Safety |
| `digital-factory` | Digital Factory & เทคโนโลยี | Digital Factory & Tech |
| `machinery-automation` | เครื่องจักร & ระบบอัตโนมัติ | Machinery & Automation |
| `environment` | สิ่งแวดล้อม/บำบัดมลพิษ | Environment / Pollution Treatment |
| `lean-kaizen` | Lean & Kaizen / เพิ่มผลผลิต | Lean & Kaizen / Productivity |
| `digital-marketing` | การตลาดออนไลน์ & Digital Transformation | Online Marketing & DX |
| `gov-benefits` | สิทธิประโยชน์ภาครัฐ/มาตรฐานสากล | Gov Benefits / Intl Standards |

---

## 6. Content Source Strategy (decision needed)

The Knowledge Hub and service detail copy need a content source. Options:

1. **Static content collections** (Astro `src/content/`, Markdown/MDX) — no
   backend, fast, version-controlled. Good for low publish frequency.
2. **`web-cms` (SonicJS)** — the CMS already in the monorepo. Articles authored
   in the portal, fetched at build (SSG) or runtime. Matches the "CMS บทความ"
   portal module and the current `feature/web-cms-sonicjs` branch.

> **DECIDED:** Knowledge Hub articles → **web-cms** (SonicJS — matches portal CMS
> module and current `feature/web-cms-sonicjs` work). Service pages → **static
> content collection** (stable copy, owned by marketing).

---

## 7. Admin / Client Portal — Out of Scope for `web-official`

The "ระบบหลังบ้าน (Admin/Client Portal)" branch is a **separate application**,
not part of the public marketing site. It maps to existing/planned apps:

| Portal module | Likely home | Status |
|---|---|---|
| Dashboard | `web-backoffice` | exists |
| CRM (Lead/customer) | `web-backoffice` | new |
| Case / Engagement Tracking | `web-backoffice` | new |
| Document & Drawing Mgmt | `web-backoffice` | new |
| CMS (articles) | `web-cms` | in progress (`feature/web-cms-sonicjs`) |
| Engineer/consultant calendar | `web-backoffice` | new |
| Preventive Maintenance module | `web-backoffice` | new |
| Lean/Kaizen KPI tracking | `web-backoffice` | new |
| Training management | `web-backoffice` | new |
| Quotation / Invoice | `web-backoffice` | new |
| User & role management | `web-backoffice` (RBAC) | partial |

Each portal module needs its **own** SRS + SDD when scoped. This document only
records the mapping so the sitemap is complete. **Do not build the portal as
part of the official-site work.**

---

## 8. Gap Analysis (current → target)

| Area | Current | Target | Work |
|---|---|---|---|
| Home | One-page landing, 8 anchors | Dedicated Home page | Re-frame landing sections as Home; some sections move to About/Services |
| About | Anchor section `#about` | 3 routed pages | New `/about`, `/about/company`, `/about/team`, `/about/case-studies` |
| Services | 4 flat detail pages | 4 groups, 2 hubs, 13 detail pages | New hubs + 9 new detail pages; restructure slugs |
| Mega menu | Simple anchor nav | 4-column mega menu | New nav component |
| Knowledge Hub | none | Hub + 8 categories + articles | New section + content source (§6) |
| Floating CTA | Inline CTAs only | Persistent floating CTA | New global component |
| Contact | Anchor section `#contact` | `/contact` page | Extract to routed page |
| Portal | n/a | separate app | Out of scope (§7) |
| Sitemap.xml | `@astrojs/sitemap` configured | regenerate for new routes | Automatic on build |

---

## 9. Proposed Implementation Phases

1. **Phase 0 — Approve this doc.** Decisions locked: nested slugs (§3), articles
   via web-cms + static service copy (§6), keep rich one-pager as Home and
   distribute About/Contact/Services detail to their own routed pages (§10 Q3).
2. **Phase 1 — Navigation shell:** new header with mega menu + mobile drawer +
   floating CTA. Keep existing pages working.
3. **Phase 2 — Home + Contact + About:** routed pages; migrate landing sections.
4. **Phase 3 — Services:** group hubs (2 & 4) + 13 detail pages from a single
   `SERVICE_DETAILS` data structure (extend the current pattern).
5. **Phase 4 — Knowledge Hub:** listing, category, article pages wired to chosen
   content source.
6. **Phase 5 — SEO polish:** per-page titles, OG tags, JSON-LD, sitemap verify.

Each phase: i18n keys (TH/EN) added in `src/lib/i18n.tsx`, build green
(`pnpm --filter @repo/web-official build`), deploy to staging, smoke test.

---

## 10. Decisions & Open Questions

**Resolved (2026-06-30):**

1. ✅ **Slug structure** — nested under group hubs. (§3)
2. ✅ **Content source** — articles via web-cms; service copy static. (§6)
3. ✅ **Home vs. landing** — keep the rich one-pager as Home; distribute
   About / Contact / Services-detail content to their own routed pages.
4. ✅ **Free Health Check** — dedicated marketing page
   `/services/factory-health-check` (explains the 8-dimension assessment) whose
   CTA deep-links into `web-app` (`PUBLIC_APP_URL`). Best for SEO + warming cold visitors.
5. ✅ **Service detail depth** — one **uniform**, content-collection-driven
   template for all 13 service pages (the flagship uses the same template with
   marketing-oriented copy + deep-link CTA). No bespoke per-page layouts.

*All Phase 0–3 decisions are now locked; no open questions remain.*

---

## 11. References

This document is the **IA source of truth** for the restructure. The feature folder follows the
`docs/product/_template` structure:

- Design index: [README.md](./README.md)
- Requirements (ISO 29110 SRS): [feature-spec.md](./feature-spec.md)
- Live progress: [status.md](./status.md)
- Visitor flows: [user-journeys.md](./user-journeys.md)
- Screen wireframes: [mockups/official.md](./mockups/official.md)
- Reference mockups: `docs/ref/messageImage_1782292944152.jpg`,
  `docs/ref/messageImage_1782292974212.jpg`
- Legal pages: [legal/feature-spec.md](../legal/feature-spec.md)
- CMS work: `feature/web-cms-sonicjs` branch, `apps/web-cms`
- SRS template (for per-page specs): [srs-template.md](../../iso29110/srs-template.md)

---

*Version: 0.1.0*
*Last updated: 4 July 2026*
