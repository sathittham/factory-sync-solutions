# web-app · Legal Documents — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The legal surface in web-app is the consent section of `/register` plus the `LegalModal`
dialog — there is no dedicated legal page in the app shell.

---

## 1. `/register` — Consent section

### 1a. State: default (nothing checked)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ... company + contact fields above ...                      │
   │                                                              │
   │  ─────────────────── Consent ───────────────────             │
   │                                                              │
   │  [ ] I accept the <Terms and Conditions> and                 │
   │      <Privacy Policy>                            (required)  │
   │                                                              │
   │  [ ] I agree to receive marketing communications             │
   │      per the <Marketing Policy>                  (optional)  │
   │                                                              │
   │                                  [ Register ]                │
   └──────────────────────────────────────────────────────────────┘

   <underlined> = inline link — opens LegalModal (screen 2)
```

### 1b. State: submit blocked (acceptTerms unchecked)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  [ ] I accept the <Terms and Conditions> and                 │
   │      <Privacy Policy>                                        │
   │  ⚠ You must accept the Terms and Privacy Policy to register  │
   │                                                              │
   │  [ ] I agree to receive marketing communications ...         │
   │                                                              │
   │                                  [ Register ]                │
   └──────────────────────────────────────────────────────────────┘
```

---

## 2. `LegalModal` — policy dialog

shadcn `Dialog`, max-w-2xl, body scrolls at max-h-[80vh]. Title + content follow the
active locale (EN shown; TH: ข้อกำหนดและเงื่อนไขการใช้งาน).

### 2a. State: open (`type = 'terms'`)

```
┌───────────────────────────────────────────────────┐
│  Terms and Conditions                          ✕  │
│  Last updated: March 7, 2025                      │
│ ┌───────────────────────────────────────────────┐ │
│ │ 1. Acceptance of Terms                        │ │
│ │    <policy body ...>                          │ │
│ │ 2. Description of Service                     │ │
│ │    <policy body ...>                          │ │
│ │ ...                                        ▒  │ │  ← scrollable
│ └───────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘

Close: Escape / backdrop / ✕ → onClose(), form state untouched.
Same layout for 'privacy', 'cookies', 'marketing' (title map in legal-modal.md).
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
