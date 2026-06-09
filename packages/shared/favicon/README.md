# Shared Favicon Assets

Single source of truth for FactorySync favicons, shared by every app.

| File | Use |
|------|-----|
| `favicon.ico` | Legacy / multi-size icon |
| `favicon-16x16.png`, `favicon-32x32.png` | Browser tab icons |
| `apple-touch-icon.png` | iOS home-screen icon (180×180) |
| `android-chrome-192x192.png`, `android-chrome-512x512.png` | Android / PWA icons |
| `site.webmanifest` | PWA manifest (references the icons by root path) |

## How apps consume these

Favicons are served by **URL path** (`<link href="/favicon.ico">`), not bundled
through Vite — so unlike `../brand/` logos, they can't be imported via the
`@shared` alias. Instead each app copies them into its own `public/` at
build/dev time via the `sync:favicon` npm script, which runs
`packages/shared/scripts/copy-favicon.mjs`.

The copied files in each app's `public/` are git-ignored — **edit them here**,
not in any app, and every app picks up the change on its next build.

## Attribution

Generated with the font **IBM Plex Sans Thai Looped**
(https://fonts.gstatic.com/s/ibmplexsansthailooped/).
