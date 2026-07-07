# web-app · Company Registration — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
`/register` renders as a standalone card (max-w-3xl, shadow-lg) — form left, `AuthPanel`
right (hidden on mobile; `md:grid-cols-2` at ≥ md) — outside the app-shell sidebar.
The `LegalModal` opened from the consent labels is mocked in
[legal/mockups/app.md](../../legal/mockups/app.md).

---

## 1. `/register` — Registration form

### 1a. State: default (fresh form)

```
┌───────────────────────────────────────────┬──────────────────────────┐
│  ⚙ Register your company                  │                          │
│  Tell us about your factory to begin      │      ◉ FactorySync       │
│                                           │                          │
│  Company registration ID                  │   Signed in as           │
│  [ 0115560016313          ]  [ ค้นหา ]    │   ◍ somchai@example.com  │
│                                           │                          │
│  Company name                             │   [ Sign out ]           │
│  [                                   ]    │                          │
│                                           │   (AuthPanel — hidden    │
│  Industry type ▾        Company size ▾    │    on mobile)            │
│  [ Select…        ]     [ Select…    ]    │                          │
│                                           │                          │
│  ── Contact ────────────────────────────  │                          │
│  Contact name                             │                          │
│  [                                   ]    │                          │
│  Contact email (disabled)   Phone         │                          │
│  [ somchai@example.com ]  [          ]    │                          │
│                                           │                          │
│  [ ] I accept the <Terms> and <Privacy>   │                          │
│  [ ] Marketing consent <Marketing Policy> │                          │
│                                           │                          │
│  ┌ Turnstile widget ─────────────┐        │                          │
│  │  ✓ I am human        cloudflare│        │                          │
│  └───────────────────────────────┘        │                          │
│                                           │                          │
│                        [ ลงทะเบียน ]      │                          │
└───────────────────────────────────────────┴──────────────────────────┘

<underlined> = inline link — opens LegalModal (legal feature).
Contact email is pre-filled from Firebase: cursor-not-allowed, bg-muted/40.
```

### 1b. State: DBD lookup success (DbdInfoCard shown, fields pre-filled)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Company registration ID                                     │
   │  [ 0115560016313          ]  [ ✓ พบข้อมูล ]  ← disabled      │
   │                                                              │
   │  ┌─ DbdInfoCard ──────────────────────────────────────────┐  │
   │  │ บริษัท ตัวอย่าง จำกัด                                   │  │
   │  │ Type: บริษัทจำกัด · Address: 123 ถ.สุขุมวิท กรุงเทพฯ    │  │
   │  └────────────────────────────────────────────────────────┘  │
   │                                                              │
   │  Company name          ← pre-filled from nameTh              │
   │  [ บริษัท ตัวอย่าง จำกัด            ]                        │
   │  Company size ▾        ← estimated from registerCapital      │
   │  [ Medium         ]      (user can override)                 │
   └──────────────────────────────────────────────────────────────┘

Button label: idle → register.lookup · loading → register.lookupLoading
· found → register.lookupFound. Editing the reg ID resets and re-enables it.
```

### 1c. State: reg ID already registered (blue notice)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Company registration ID                                     │
   │  [ 0115560016313          ]  [ ✓ พบข้อมูล ]                  │
   │                                                              │
   │  ┌────────────────────────────────────────────────────────┐  │
   │  │ ℹ  This registration ID is already in use — your data  │  │
   │  │    will be linked to the existing company record.      │  │
   │  └────────────────────────────────────────────────────────┘  │
   │                                                              │
   │  Company name / industry / size pre-filled from the          │
   │  existing record — registration still proceeds.              │
   └──────────────────────────────────────────────────────────────┘
```

### 1d. State: validation errors / submit blocked

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Company registration ID                                     │
   │  [ 12345                  ]  [ ค้นหา ]                       │
   │  ⚠ Registration ID must be exactly 13 digits                 │
   │                                                              │
   │  Company name                                                │
   │  [                                   ]                       │
   │  ⚠ Required                                                  │
   │                                                              │
   │  [ ] I accept the <Terms> and <Privacy>                      │
   │  ⚠ You must accept the Terms and Privacy Policy              │
   │                                                              │
   │  ┌────────────────────────────────────────────────────────┐  │
   │  │ ⚠  กรุณายืนยัน captcha                                  │  │
   │  └────────────────────────────────────────────────────────┘  │
   │                                                              │
   │                        [ ลงทะเบียน ]                         │
   └──────────────────────────────────────────────────────────────┘

Same red-banner slot shows the server message on 409 (already registered)
and the generic register.error string on 5xx.
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
