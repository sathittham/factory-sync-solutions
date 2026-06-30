/**
 * SSO handover: turn a verified web-backoffice identity into a CMS admin session.
 *
 * Flow (see middleware.ts for the route mount):
 *   1. web-backoffice POSTs the user's Firebase ID token to /sso/handover.
 *   2. We verify it (firebase-verify.ts) and read email + backofficeRole.
 *   3. Map the backoffice role to a CMS role; reject non-backoffice users.
 *   4. Upsert the auth_user row (auto-create + keep role in sync).
 *   5. Assign the matching RBAC role doc — /admin gates on `rbac_user_roles`,
 *      not the auth_user.role column, so this is what grants `portal:access`.
 *   6. Mint the `auth_token` JWT and redirect to /admin. The admin guard reads
 *      better-auth sessions, so auth-token-bridge.ts re-honors this cookie.
 */

import { AuthManager, RbacService } from '@sonicjs-cms/core'
import type { Context } from 'hono'
import { verifyFirebaseToken } from './firebase-verify'

type CmsRole = 'admin' | 'editor'

interface SsoEnv {
  DB: D1Database
  FIREBASE_PROJECT_ID?: string
  JWT_SECRET?: string
  CACHE_KV?: KVNamespace
}

/**
 * Map a web-backoffice role to a CMS role. Returns null for anyone who is not a
 * backoffice user, which the handler turns into a 403 (access restricted to
 * backoffice staff).
 */
export function mapCmsRole(backofficeRole: string): CmsRole | null {
  switch (backofficeRole) {
    case 'superadmin':
      return 'admin'
    case 'staff':
      return 'editor'
    default:
      return null
  }
}

/** Split a display name into first/last; last_name is NOT NULL, so fall back. */
export function splitName(name: string, email: string): { first: string; last: string } {
  const trimmed = name.trim()
  if (!trimmed) {
    const local = email.split('@')[0] || 'User'
    return { first: local, last: '-' }
  }
  const parts = trimmed.split(/\s+/)
  return { first: parts[0], last: parts.length > 1 ? parts.slice(1).join(' ') : '-' }
}

/**
 * Create the auth_user row if absent, else keep role/name in sync and reactivate.
 * Returns the user id to embed in the session token.
 */
async function upsertUser(
  db: D1Database,
  identity: { email: string; name: string },
  role: CmsRole,
  now: number,
): Promise<string> {
  const existing = await db
    .prepare('SELECT id FROM auth_user WHERE email = ?')
    .bind(identity.email)
    .first<{ id: string }>()

  if (existing) {
    await db
      .prepare('UPDATE auth_user SET role = ?, name = ?, is_active = 1, updated_at = ? WHERE id = ?')
      .bind(role, identity.name || null, now, existing.id)
      .run()
    return existing.id
  }

  const id = crypto.randomUUID()
  const { first, last } = splitName(identity.name, identity.email)
  await db
    .prepare(
      `INSERT INTO auth_user
        (id, email, name, first_name, last_name, role,
         is_super_admin, is_active, email_verified, failed_login_count, two_factor_enabled,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 1, 1, 0, 0, ?, ?)`,
    )
    .bind(id, identity.email, identity.name || null, first, last, role, now, now)
    .run()
  return id
}

/** Hono handler for POST /sso/handover. */
export async function handleHandover(c: Context): Promise<Response> {
  const env = c.env as SsoEnv
  if (!env.FIREBASE_PROJECT_ID) {
    return c.text('SSO is not configured (FIREBASE_PROJECT_ID missing).', 500)
  }

  const body = await c.req.parseBody()
  const token = typeof body.token === 'string' ? body.token : ''
  if (!token) return c.redirect('/auth/login')

  let identity: Awaited<ReturnType<typeof verifyFirebaseToken>>
  try {
    identity = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID)
  } catch {
    // Invalid/expired token — send the user to the normal login page.
    return c.redirect('/auth/login')
  }

  const role = mapCmsRole(identity.backofficeRole)
  if (!role) {
    return c.text('Your account does not have access to the CMS.', 403)
  }

  const userId = await upsertUser(env.DB, identity, role, Date.now())

  // RBAC drives /admin access via `rbac_user_roles` documents — the auth_user
  // `role` column alone grants nothing. The raw upsert above bypasses the
  // better-auth create hook that would assign a role, so do it explicitly here.
  // `admin`/`editor` both carry the `portal:access` grant. Idempotent.
  await new RbacService(env.DB, env.CACHE_KV).addUserRoleByName(userId, role)

  const authToken = await AuthManager.generateToken(userId, identity.email, role, env.JWT_SECRET)
  AuthManager.setAuthCookie(c, authToken)
  return c.redirect('/admin')
}
