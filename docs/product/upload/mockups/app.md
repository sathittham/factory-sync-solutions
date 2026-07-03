# web-app · Upload Service — ASCII Mockups

Surface: `web-app` (authenticated React app). Design system: shadcn/ui · Tailwind.
The upload surface in web-app today is the avatar section of `/profile` (Phase 1). The
Phase 2–3 attachment picker has no UI yet — no mockup until that design lands.

---

## 1. `/profile` — Avatar section

### 1a. State: default (avatar set)

```
   ┌──────────────────────────────────────────────────────────────┐
   │  Profile                                                     │
   │                                                              │
   │   ┌────────┐                                                 │
   │   │  ◍◍◍  │   <Company / contact name>                       │
   │   │  ◍◍◍  │   JPEG · PNG · WebP · GIF — max 2 MB             │
   │   └────────┘                                                 │
   │                [ Change photo ]   [ Remove ]                 │
   │                                                              │
   │  ... profile form fields below ...                           │
   └──────────────────────────────────────────────────────────────┘

   Avatar image loads from the CDN URL in users/{uid}.avatarURL.
   Change photo → file picker → POST /upload/avatar (multipart).
   Remove → DELETE /upload/avatar → fallback avatar (state 1c).
```

### 1b. State: uploading (request in flight)

```
   ┌──────────────────────────────────────────────────────────────┐
   │   ┌────────┐                                                 │
   │   │ ▒▒▒▒▒▒ │   Uploading…                                    │
   │   │ ▒▒▒▒▒▒ │                                                 │
   │   └────────┘                                                 │
   │                [ Change photo ]   [ Remove ]   (disabled)    │
   └──────────────────────────────────────────────────────────────┘

   Backend resizes to 256×256 + converts to WebP; on 200 the new
   CDN URL replaces the image in place (no page reload).
```

### 1c. State: no avatar / removed (fallback)

```
   ┌──────────────────────────────────────────────────────────────┐
   │   ┌────────┐                                                 │
   │   │   ◍    │   <Company / contact name>                      │
   │   │        │   JPEG · PNG · WebP · GIF — max 2 MB            │
   │   └────────┘                                                 │
   │                [ Change photo ]                              │
   └──────────────────────────────────────────────────────────────┘
```

### 1d. State: validation error (wrong type or > 2 MB)

```
   ┌──────────────────────────────────────────────────────────────┐
   │   ┌────────┐                                                 │
   │   │  ◍◍◍  │   ⚠  <Unsupported file type or file too large    │
   │   │  ◍◍◍  │       — use JPEG/PNG/WebP/GIF up to 2 MB>        │
   │   └────────┘                                                 │
   │                [ Change photo ]   [ Remove ]                 │
   └──────────────────────────────────────────────────────────────┘

   400 VALIDATION_ERROR from the API → inline error via useLocale();
   the existing avatar is untouched.
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
