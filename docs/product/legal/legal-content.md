# LegalContent (web-official)

## Summary

Single React island that renders all five standalone legal pages on the public marketing
site. Lives at `apps/web-official/src/components/legal/LegalContent.tsx`; each Astro page
under `apps/web-official/src/pages/` mounts it with a `page` prop selecting the document.

## Implementation

- `LegalContent({ page, appUrl, version })` — renders the full-page policy for the given
  `page` inside the Astro layout, in the active locale from the `LocaleProvider`.
- Content is bundled inline per policy per locale — the same policy text as the web-app
  `LegalModal`, maintained in parallel (see maintenance note in
  [legal-modal.md](./legal-modal.md)).
- Switching locale re-renders immediately — no page reload.

### Route map

| URL | `page` prop | Document |
|-----|-------------|----------|
| `/terms` | `"terms"` | Terms and Conditions |
| `/privacy` | `"privacy"` | Privacy Policy |
| `/cookies` | `"cookies"` | Cookie Policy |
| `/marketing` | `"marketing"` | Marketing Policy |
| `/cookie-settings` | `"cookie-settings"` | Cookie preference manager |

`/cookie-settings` is the standalone entry point into the cookie-consent preference state
(`fss-*` localStorage keys) — the banner and footer modal are owned by the
[cookie-consent](../cookie-consent/feature-spec.md) feature.

## Configuration

Each Astro page passes two build-time environment variables as props:

| Env var | Prop | Default | Description |
|---------|------|---------|-------------|
| `PUBLIC_APP_URL` | `appUrl` | `"#"` | Link target for "open the app" CTAs inside policy text |
| `PUBLIC_APP_VERSION` | `version` | `"dev"` | Version string rendered in the page footer |

## Usage

Call sites: `terms.astro`, `privacy.astro`, `cookies.astro`, `marketing.astro`,
`cookie-settings.astro` under `apps/web-official/src/pages/`.

```
# pseudocode — each Astro page is a thin wrapper
<Layout>
  <LegalContent client:load
    page="terms"
    appUrl={import.meta.env.PUBLIC_APP_URL ?? "#"}
    version={import.meta.env.PUBLIC_APP_VERSION ?? "dev"} />
</Layout>
```

> web-official islands use `client:load`; the static build has a known hydration caveat —
> smoke-test the built output, not just dev (see the Layout recovery nudge in
> `Layout.astro`).

## Acceptance Criteria

- Given any of the four policy routes, when visited, then the correct policy renders in the active locale.
- Given `/cookie-settings`, when visited, then the cookie preference manager renders and persists choices to the `fss-*` localStorage keys.
- Given the locale switcher is used, when toggled, then the content re-renders TH ⇄ EN without a reload.
- Given the footer on any web-official page, when a legal link is clicked, then it navigates to the matching route.

## Status

- [x] `LegalContent.tsx` implemented with all five pages (TH + EN)
- [x] Five Astro routes wired with `appUrl` + `version` props
- [x] Footer links live on web-official
- [x] `make lint-web` passes

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
