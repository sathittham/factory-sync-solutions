/**
 * SSO handover middleware: intercepts `POST /sso/handover` ahead of SonicJS's
 * CSRF guard.
 *
 * web-backoffice submits the signed-in user's Firebase ID token here via a
 * top-level, cross-site form POST. That request cannot carry the CMS's
 * `csrf_token`, and core's `csrfProtection()` enforces CSRF on any POST that
 * presents an `auth_token` cookie — so the *second* handover onward (once the
 * first one set `auth_token`) is rejected with 403 "CSRF token missing".
 *
 * The route is CSRF-exempt by design: the unforgeable Firebase ID token *is*
 * the anti-CSRF token (an attacker can't mint one for the victim). Core hardcodes
 * `csrfProtection()` with no exempt-path config, but `middleware.beforeAuth`
 * runs before it, so handling the route here bypasses CSRF cleanly. See
 * handover.ts and firebase-verify.ts for the verification + session logic.
 */

import type { Context } from 'hono'
import { handleHandover } from './handover'

export function ssoHandoverMiddleware(): (
  c: Context,
  next: () => Promise<void>,
) => Promise<void> {
  return async (c, next) => {
    if (c.req.method === 'POST' && new URL(c.req.url).pathname === '/sso/handover') {
      // Short-circuit before the downstream CSRF guard: set the response and
      // return without calling next().
      c.res = await handleHandover(c)
      return
    }
    await next()
  }
}
