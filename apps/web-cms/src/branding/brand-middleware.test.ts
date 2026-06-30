import { describe, expect, it } from 'vitest'
import { rebrandHtml } from './brand-middleware'

const FULL_PAGE = `<!DOCTYPE html>
<html lang="en" class="h-full dark">
<head>
  <title>Login - SonicJS AI</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body class="h-full bg-zinc-950">
  <svg class="w-full h-auto" viewBox="380 1300 2250 400" aria-hidden="true"><path d="M0 0z"></path></svg>
  <a href="https://sonicjs.com">SonicJS</a>
</body>
</html>`

describe('rebrandHtml', () => {
  it('swaps the SonicJS logo SVG for FactorySync logo images, preserving size class', () => {
    const out = rebrandHtml(FULL_PAGE)
    expect(out).not.toContain('viewBox="380 1300 2250 400"')
    expect(out).toContain('src="/brand/fs-light.png"')
    expect(out).toContain('src="/brand/fs-dark.png"')
    // original svg class is carried onto the imgs so layout sizing is kept
    expect(out).toContain('fs-logo-light w-full h-auto')
  })

  it('repoints the favicon to the brand asset', () => {
    const out = rebrandHtml(FULL_PAGE)
    expect(out).toContain('href="/brand/favicon.png"')
    expect(out).not.toContain('/favicon.svg')
  })

  it('rebrands product name and attribution', () => {
    const out = rebrandHtml(FULL_PAGE)
    expect(out).toContain('<title>Login - FactorySync</title>')
    expect(out).not.toContain('SonicJS')
    expect(out).toContain('href="https://factorysyncsolutions.com"')
  })

  it('maps the admin shell title distinctly', () => {
    const out = rebrandHtml('<title>Dashboard - SonicJS AI Admin</title>')
    expect(out).toBe('<title>Dashboard - FactorySync CMS</title>')
  })

  it('injects brand CSS, theme init, and the toggle into full documents', () => {
    const out = rebrandHtml(FULL_PAGE)
    expect(out).toContain('<style id="fs-brand">')
    expect(out).toContain('<script id="fs-theme-init">')
    expect(out).toContain('id="fs-theme-toggle"')
    // head injection lands inside <head>
    expect(out.indexOf('fs-brand')).toBeLessThan(out.indexOf('</head>'))
  })

  it('injects the Google button above the auth form only when enabled', () => {
    const authPage = `<head></head><body class="bg-zinc-950"><form id="login-form" hx-post="/auth/login/form" class="space-y-6"></form></body>`

    const off = rebrandHtml(authPage)
    expect(off).not.toContain('id="fs-google-btn"')

    const on = rebrandHtml(authPage, { googleEnabled: true })
    expect(on).toContain('id="fs-google-btn"')
    // sits immediately before the form
    expect(on.indexOf('fs-google-btn')).toBeLessThan(on.indexOf('<form id="login-form"'))
    expect(on).toContain('/auth/sign-in/social')
  })

  it('does not inject the Google button on non-auth pages even when enabled', () => {
    const adminPage = `<head></head><body class="bg-white dark:bg-zinc-900"><form hx-post="/admin/api/things"></form></body>`
    const out = rebrandHtml(adminPage, { googleEnabled: true })
    expect(out).not.toContain('id="fs-google-btn"')
  })

  it('leaves HTMX fragments without <head> free of head injections', () => {
    const fragment = '<div class="text-cyan-400">SonicJS user</div>'
    const out = rebrandHtml(fragment)
    expect(out).not.toContain('<style id="fs-brand">')
    expect(out).not.toContain('id="fs-theme-toggle"')
    // safe text replacement still applies
    expect(out).toContain('FactorySync user')
  })
})
