/**
 * FactorySync rebrand middleware.
 *
 * SonicJS server-renders its auth and admin HTML with no branding hook, so we
 * rewrite the HTML response: inject brand CSS + a no-FOUC theme init + a
 * light/dark toggle, swap the SonicJS logo for the FactorySync mark, repoint
 * the favicon, recolor the accent, and rebrand titles/links.
 *
 * Mounted via `config.middleware.beforeAuth`, which wraps the entire downstream
 * chain, so every server-rendered page passes through here.
 */

import type { Context } from 'hono'
import {
  ASSET_FAVICON,
  ASSET_LOGO_DARK,
  ASSET_LOGO_LIGHT,
  BRAND_CSS,
  BRAND_NAME,
  BRAND_NAME_ADMIN,
  BRAND_URL,
  GOOGLE_SIGNIN_HTML,
  THEME_INIT_SCRIPT,
  THEME_TOGGLE_HTML,
} from './brand'

/** The SonicJS logo SVG, identifiable across templates by its viewBox. */
const LOGO_SVG_RE =
  /<svg\s+class="([^"]*)"\s+viewBox="380 1300 2250 400"[^>]*>[\s\S]*?<\/svg>/g

/** Replacement: dual logo images toggled by theme via CSS (see BRAND_CSS). */
function logoImgs(svgClass: string): string {
  const cls = svgClass.trim()
  return (
    `<img src="${ASSET_LOGO_LIGHT}" alt="${BRAND_NAME}" class="fs-logo fs-logo-light ${cls}">` +
    `<img src="${ASSET_LOGO_DARK}" alt="${BRAND_NAME}" class="fs-logo fs-logo-dark ${cls}">`
  )
}

/** Anchor: the auth form (login or register) better-auth/SonicJS renders. */
const AUTH_FORM_RE = /(<form\b[^>]*hx-post="\/auth\/(?:login|register)\/form)/

export interface RebrandOptions {
  /** When true, inject a "Continue with Google" button on the auth pages. */
  googleEnabled?: boolean
}

/**
 * Rebrand a full SonicJS HTML document. Pure and idempotent-friendly: when the
 * input has no `</head>` (e.g. an HTMX fragment) the head injections are
 * skipped and only safe text/logo replacements apply.
 */
export function rebrandHtml(html: string, opts: RebrandOptions = {}): string {
  let out = html

  // 1) Logo swap (auth pages + admin shell share the same SVG).
  out = out.replace(LOGO_SVG_RE, (_m, cls: string) => logoImgs(cls))

  // 2) Favicon -> FactorySync.
  out = out.replace(
    /<link rel="icon"[^>]*href="\/favicon\.svg"[^>]*>/g,
    `<link rel="icon" type="image/png" href="${ASSET_FAVICON}">`,
  )

  // 3) Product name + attribution (longest match first).
  out = out
    .replaceAll('https://sonicjs.com', BRAND_URL)
    .replaceAll('SonicJS AI Admin', BRAND_NAME_ADMIN)
    .replaceAll('SonicJS AI', BRAND_NAME)
    .replaceAll('SonicJS', BRAND_NAME)
    .replaceAll('sonicjs.com', 'factorysyncsolutions.com')

  // 4) Head injections: brand CSS + no-FOUC theme init (full documents only).
  if (out.includes('</head>')) {
    const head = `<style id="fs-brand">${BRAND_CSS}</style><script id="fs-theme-init">${THEME_INIT_SCRIPT}</script>`
    out = out.replace('</head>', `${head}</head>`)
  }

  // 5) "Continue with Google" above the auth form (when configured).
  if (opts.googleEnabled) {
    out = out.replace(AUTH_FORM_RE, `${GOOGLE_SIGNIN_HTML}$1`)
  }

  // 6) Theme toggle button (full documents only).
  if (out.includes('</body>')) {
    out = out.replace('</body>', `${THEME_TOGGLE_HTML}</body>`)
  }

  return out
}

/**
 * Hono middleware that applies {@link rebrandHtml} to HTML responses.
 * Non-HTML responses (JSON APIs, redirects, assets) pass through untouched.
 */
export function brandingMiddleware(): (
  c: Context,
  next: () => Promise<void>,
) => Promise<void> {
  return async (c, next) => {
    await next()

    const contentType = c.res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) return

    // better-auth auto-enables the Google provider when both vars are set;
    // only then do we show the button (see brand.ts).
    const env = c.env as Record<string, unknown> | undefined
    const googleEnabled = Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET)

    const original = await c.res.text()
    const rebranded = rebrandHtml(original, { googleEnabled })

    const headers = new Headers(c.res.headers)
    headers.delete('content-length') // length changed; let the platform recompute

    c.res = new Response(rebranded, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers,
    })
  }
}
