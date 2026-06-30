/**
 * Legacy `auth_token` → request user bridge.
 *
 * SonicJS beta.20 authenticates `/admin` from a better-auth session
 * (`getSession()` populates `c.get("user")`). The SSO handover, however, signs
 * the *legacy* `auth_token` JWT via `AuthManager` — the supported seam for
 * "plugins implementing alternative auth methods" — which core no longer wires
 * into the admin guard. Without this bridge a freshly handed-off user reaches
 * `/admin` with no `user` set and is bounced to `/auth/login`.
 *
 * Mounted via `config.middleware.afterAuth`, this runs *after* better-auth's
 * getSession (and the API-key middleware) but *before* the `/admin` guards:
 * only when neither has established a user do we verify the `auth_token` cookie
 * and project its claims onto the request, matching the shape getSession sets.
 *
 * Trust is unchanged: the claims come from a JWT signed with `JWT_SECRET`, the
 * same key `AuthManager` mints with — it cannot be forged client-side.
 */

import type { Context } from 'hono'
import { AuthManager } from '@sonicjs-cms/core'

export function authTokenBridge(): (
  c: Context,
  next: () => Promise<void>,
) => Promise<void> {
  return async (c, next) => {
    // Only fill in when no better-auth session / API key already authenticated.
    if (!c.get('user' as never)) {
      const payload = await AuthManager.verifyAuthRequest(c)
      if (payload) {
        // Mirror the object getSession sets (exp/iat in ms). The legacy JWT
        // carries seconds; convert so any downstream session-window check lines
        // up. SSO users are never platform super-admins (handover sets 0).
        c.set('user' as never, {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          isSuperAdmin: false,
          exp: payload.exp ? payload.exp * 1000 : 0,
          iat: payload.iat ? payload.iat * 1000 : 0,
        } as never)
      }
    }
    await next()
  }
}
