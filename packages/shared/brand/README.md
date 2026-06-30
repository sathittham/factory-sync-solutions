# Shared Brand Assets

Single source of truth for FactorySync brand imagery used across apps.

| File | Use |
|------|-----|
| `fs-light.png` | Logo for light backgrounds |
| `fs-dark.png` | Logo for dark backgrounds |

## Usage

Both frontend apps expose an `@shared/*` alias mapped to `packages/shared/*`
(configured in each app's `tsconfig.json` and Vite/Astro config):

```tsx
import fsLightLogo from "@shared/brand/fs-light.png";
import fsDarkLogo from "@shared/brand/fs-dark.png";
```

Vite (used by both `web-app` and `web-official`) bundles the imported
asset into that app's own `dist/` at build time, so each app stays
independently deployable.

Do not copy these files into an app directory — update them here so every app
picks up the change.
