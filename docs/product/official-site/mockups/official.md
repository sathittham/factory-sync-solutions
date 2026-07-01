# web-official · Official Site Restructure — ASCII Mockups

Surface: `web-official` (public Astro 6 + React islands). Design system: shadcn/ui · Tailwind.
Bilingual TH/EN via `useLocale()` (default TH). Dark-mode aware. Wireframes for intent and layout, not
pixel specs. Transcribed from the reference mockups
(`docs/ref/messageImage_1782292944152.jpg`, `…2974212.jpg`); IA source of truth is [sitemap.md](../sitemap.md).

---

## 1. Header — desktop nav + Services mega menu

### 1a. State: default (mega menu closed)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ◉ FactorySync   หน้าแรก   เกี่ยวกับเรา ▾   บริการ ▾   บทความ   ติดต่อ    TH▾  ☼  [ ตรวจฟรี ] │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 1b. State: Services mega menu open (4 columns)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ◉ FactorySync   หน้าแรก   เกี่ยวกับเรา ▾   [บริการ ▾]   บทความ   ติดต่อ   TH▾ ☼ [ ตรวจฟรี ]│
├────────────────────┬──────────────────────┬─────────────────┬────────────────────────┤
│ 1. ตรวจสุขภาพ        │ 2. บริการที่รัฐสนับสนุน  │ 3. ที่ปรึกษา       │ 4. ออกแบบ & เซ็นรับรอง   │
│    โรงงาน (ฟรี) ★    │    (Hub →)            │    งานวิศวกรรม     │    (Hub →)             │
│ ┌────────────────┐ │ • Digital Factory 360 │                 │ • ขอใบอนุญาต รง.2/รง.4  │
│ │ badge: ฟรี      │ │ • Smart Prev. Maint.  │  ภาพรวม /        │ • ออกแบบเครื่องจักร SA/SI│
│ │ [ เริ่มเลย → ]  │ │ • Shindan-Lean-Kaizen │  กลยุทธ์          │ • ที่ปรึกษา (ออกแบบ)    │
│ └────────────────┘ │ • Online Mktg & Ops   │                 │ • ขออนุญาตก่อสร้าง      │
│  accent border      │ • In-House Training   │                 │ • ระบบพิเศษ            │
│                    │                       │                 │ • บำบัดมลพิษ           │
│                    │                       │                 │ • ขึ้นทะเบียนเครื่องจักร  │
│                    │                       │                 │ • ใบอนุญาต/ISO         │
└────────────────────┴──────────────────────┴─────────────────┴────────────────────────┘
```

### 1c. State: mobile drawer (accordion, Services expanded)

```
┌───────────────────────────┐
│  ◉ FactorySync        ✕    │
├───────────────────────────┤
│  หน้าแรก                    │
│  เกี่ยวกับเรา            ▸   │
│  บริการ                  ▾  │
│   ├ ตรวจสุขภาพโรงงาน (ฟรี)★ │
│   ├ บริการที่รัฐสนับสนุน  ▸  │
│   ├ ที่ปรึกษางานวิศวกรรม     │
│   └ ออกแบบ & เซ็นรับรอง  ▸  │
│  บทความ                    │
│  ติดต่อ                     │
├───────────────────────────┤
│  TH ▾    ☼ ธีม              │
│  [   ตรวจสุขภาพโรงงานฟรี   ] │
└───────────────────────────┘
```

---

## 2. Top CTA bar (every page)

Full-width bar pinned at the very top, above the sticky header. The call-to-action opens the LINE@
official account in a new tab. Mounted globally in `Layout.astro`.

### 2a. Desktop

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│              ขอประเมิน / นัดตรวจสุขภาพโรงงานฟรี   →   (LINE)                              │  ← bg-primary
├──────────────────────────────────────────────────────────────────────────────────────┤
│  [ Header 1a — sticky ]                                                                │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 2b. Mobile (label shortens)

```
┌───────────────────────────┐
│   ตรวจโรงงานฟรี  → (LINE)  │  ← bg-primary
├───────────────────────────┤
│  ◉ FactorySync        ☰    │
└───────────────────────────┘
```

---

## 3. `/` — Home

Retains the current one-pager sections (hero, dimensions, expert, services, process, results, about,
contact-teaser). Top CTA bar (→ LINE@) persistent above the header. About/Contact detail now live on
their own routes.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Header 1a ]                                                          │
├──────────────────────────────────────────────────────────────────────┤
│  HERO — ประเมินสุขภาพโรงงานด้วย AI                                       │
│   [ เริ่มประเมินฟรี ]  [ ปรึกษาผู้เชี่ยวชาญ ]                              │
│   ┌────┬────┬────┬────┐  43 คำถาม · 8 มิติ · 15 นาที · รายงาน           │
│   └────┴────┴────┴────┘                                                │
├──────────────────────────────────────────────────────────────────────┤
│  8 มิติการประเมิน  +  เรดาร์ชาร์ต                                         │
│  ผู้เชี่ยวชาญ · บริการ · ขั้นตอน · ผลลัพธ์ (case studies)                  │
├──────────────────────────────────────────────────────────────────────┤
│ [ SiteFooter — legal links · version · social ]                        │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. `/services/government-supported` — Hub page (group 2)

Same pattern for `/services/engineering-design` (group 4, 8 children).

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Header ]                                                             │
├──────────────────────────────────────────────────────────────────────┤
│  บริการที่รัฐสนับสนุน                                                     │
│  <hub intro — what this group covers, who qualifies>                   │
│                                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │ Digital      │ │ Smart Prev.  │ │ Shindan-Lean │   … 5 cards        │
│  │ Factory 360  │ │ Maintenance  │ │ -Kaizen      │                   │
│  │ [ ดูบริการ → ] │ │ [ ดูบริการ → ] │ │ [ ดูบริการ → ] │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
├──────────────────────────────────────────────────────────────────────┤
│ [ SiteFooter ]                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. `/services/government-supported/[slug]` — Service detail

Generated from the static content collection. One uniform template for all 13 pages (Q5 resolved); the
flagship `/services/factory-health-check` uses the same template with marketing copy + a CTA into web-app.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Header ]   breadcrumb: บริการ › รัฐสนับสนุน › Digital Factory 360      │
├──────────────────────────────────────────────────────────────────────┤
│  HERO — <service title TH/EN>                                          │
│  <tagline>                          ✓ feature 1                        │
│  [ ขอประเมินฟรี → ]                  ✓ feature 2                        │
│                                     ✓ feature 3                        │
├──────────────────────────────────────────────────────────────────────┤
│  <body content from content collection>                               │
│  บริการที่เกี่ยวข้อง:  [ card ] [ card ] [ card ]                          │
├──────────────────────────────────────────────────────────────────────┤
│ [ SiteFooter ]                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. `/knowledge` — Knowledge Hub listing

### 6a. State: populated

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Header ]                                                             │
├──────────────────────────────────────────────────────────────────────┤
│  บทความ / ความรู้                                                       │
│  [ ทั้งหมด ][ กฎหมาย ][ ความปลอดภัย ][ Digital Factory ][ … 8 cats ]     │
│                                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │ [thumb]      │ │ [thumb]      │ │ [thumb]      │                   │
│  │ category tag │ │ category tag │ │ category tag │                   │
│  │ <title>      │ │ <title>      │ │ <title>      │                   │
│  │ <date พ.ศ.>  │ │ <date พ.ศ.>  │ │ <date พ.ศ.>  │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
│              ‹  1  2  3  ›                                             │
├──────────────────────────────────────────────────────────────────────┤
│ [ SiteFooter ]                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

### 6b. State: empty / CMS unreachable at build

```
┌──────────────────────────────────────────────────────────────────────┐
│  บทความ / ความรู้                                                       │
│        ┌────────────────────────────────────────────┐                 │
│        │   ยังไม่มีบทความในขณะนี้                        │                 │
│        │   (No articles available)                    │                 │
│        └────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 6c. Seed content — mockup articles

Populated state (6a) is backed by **20 seeded `blog_post` records** — the 8 flagship
articles below (one per category) plus 12 shorter "filler" articles for breadth, so
pagination, the pinned featured carousel (3 pinned), and category/tag filtering all
have real data. Each is authored bilingually in a single document (Thai section +
`— English version —` divider + English section) to match the locale-blind build-time
fetch in `apps/web-official/src/lib/cms.ts`. Records also carry `featuredImage` (Lorem
Picsum, per-slug), comma-separated `tags`, and `isPinned`. Source of truth + seeders:
`apps/web-cms/scripts/knowledge-articles.mjs` (shared data),
`seed-knowledge.ts` (`pnpm --filter @repo/web-cms seed:knowledge`, local) and
`seed-knowledge-remote.mjs` (`seed:knowledge:staging` / `:prod`).

| # | Category (slug) | Slug | TH / EN working title |
|---|-----------------|------|-----------------------|
| 1 | `law-licensing` | `factory-license-ror-ngor-4-basics` | ใบอนุญาต รง.4 ก่อนเปิดโรงงาน / Factory Licence (Ror.Ngor.4) starter guide |
| 2 | `factory-safety` | `five-common-factory-hazards` | 5 จุดเสี่ยงที่แก้ได้ทันที / 5 common factory hazards |
| 3 | `digital-factory` | `starting-a-digital-factory-on-a-budget` | เริ่ม Digital Factory ด้วยงบจำกัด / Digital factory on a budget |
| 4 | `machinery-automation` | `when-does-automation-pay-off` | ลงทุนอัตโนมัติเมื่อไหร่คุ้ม / When does automation pay off |
| 5 | `environment` | `meeting-wastewater-standards` | น้ำเสียให้ผ่านมาตรฐาน / Meeting wastewater standards |
| 6 | `lean-kaizen` | `your-first-kaizen-start-with-5s` | เริ่ม Kaizen ด้วย 5ส / First Kaizen with 5S |
| 7 | `digital-marketing` | `b2b-factory-lead-generation-online` | โรงงาน B2B หาลูกค้าออนไลน์ / B2B online lead generation |
| 8 | `gov-benefits` | `boi-incentives-and-grants-for-sme-factories` | สิทธิประโยชน์ BOI & เงินสนับสนุน / BOI incentives & grants |

> Mockup copy only — legal/numeric claims are kept general with a "verify with the
> authority" line; not vetted regulatory guidance. Replace with marketing-owned
> articles before launch.

---

## 7. `/contact` — Contact page

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Header ]                                                             │
├──────────────────────────────────────────────────────────────────────┤
│  ติดต่อเรา                                                              │
│  ┌────────────────────────────┐   ┌────────────────────────────┐      │
│  │ ☎ โทร · ✉ info@…           │   │  พร้อมเริ่มหรือยัง?           │      │
│  │ ◍ LINE · 🕑 เวลาทำการ        │   │  [ ขอประเมินฟรี → ]          │      │
│  └────────────────────────────┘   └────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────┤
│ [ SiteFooter ]                                                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

*Version: 0.2.0*
*Last updated: 1 July 2026*
