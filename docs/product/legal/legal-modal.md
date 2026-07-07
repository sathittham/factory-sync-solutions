# LegalModal (web-app)

## Summary

In-app dialog that renders any of the four legal policies during registration. Lives at
`apps/web-app/src/components/LegalModal.tsx`; opened from inline links in the
`RegisterPage` consent-checkbox labels so the operator can read a policy without leaving
the form.

## Implementation

- `LegalModal({ type, onClose })` — renders a shadcn/ui `Dialog` (max-w-2xl, max-h-[80vh], scrollable body).
- `LegalType = 'terms' | 'privacy' | 'cookies' | 'marketing' | null` — `null` means closed.
- Content is bundled inline per policy per locale — no network call. The TH or EN component
  is selected by `locale` from `useLocale()`.
- Closing (Escape, backdrop click, ✕ button) calls `onClose()`, which sets the page's
  `legalModal` state back to `null`. The modal is rendered outside the form, so open/close
  never touches form state.

### Title map

| Type | TH | EN |
|------|----|----|
| `terms` | ข้อกำหนดและเงื่อนไขการใช้งาน | Terms and Conditions |
| `privacy` | นโยบายความเป็นส่วนตัว | Privacy Policy |
| `cookies` | นโยบายคุกกี้ | Cookie Policy |
| `marketing` | นโยบายทางการตลาด | Marketing Policy |

### Maintenance note

The "last updated" date inside the policy text is a hardcoded per-locale string
(TH: `แก้ไขล่าสุด: 7 มีนาคม 2568` · EN: `Last updated: March 7, 2025`). A policy update
must change it in **both** surfaces — this component and `LegalContent.tsx` on
web-official.

## Usage

Call site: `apps/web-app/src/pages/RegisterPage.tsx`.

```
# pseudocode — RegisterPage owns the open/close state
legalModal: LegalType = null

consent label link "Terms and Conditions"  → legalModal = 'terms'
consent label link "Privacy Policy"        → legalModal = 'privacy'
marketing label link "Marketing Policy"    → legalModal = 'marketing'

<LegalModal type={legalModal} onClose={() => legalModal = null} />
```

Consent gating itself is the form's concern: `acceptTerms` is validated with Zod
`z.literal(true)` and blocks submission; `marketingConsent` is optional and unchecked by
default.

## Acceptance Criteria

- Given the registration form, when a policy link in a consent label is clicked, then the modal opens showing that policy in the active locale.
- Given an open modal, when the user closes it (Escape / backdrop / ✕), then focus returns to the form and no input is lost.
- Given the locale is switched, when the modal is (re)opened, then title and content match the new locale.
- Given `acceptTerms` is unchecked, when the form is submitted, then Zod blocks the submit with an error on the checkbox.

## Status

- [x] `LegalModal.tsx` implemented with all four policies (TH + EN)
- [x] Wired to `RegisterPage.tsx` consent labels
- [x] `make lint-web` passes

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
