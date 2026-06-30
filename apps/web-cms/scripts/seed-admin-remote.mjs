/**
 * Seed the initial admin user into a REMOTE D1 database (staging | production).
 *
 * Mirrors scripts/seed-admin.ts (same PBKDF2 format and auth_user/auth_account
 * rows) but writes to the remote DB via `wrangler d1 execute --remote` since
 * getPlatformProxy() only ever talks to the local database.
 *
 * Usage:
 *   node scripts/seed-admin-remote.mjs <staging|production>
 *
 * Credentials come from env vars (with safe-ish defaults — CHANGE THE PASSWORD):
 *   CMS_ADMIN_EMAIL     (default: admin@web-cms.local)
 *   CMS_ADMIN_PASSWORD  (default: ChangeMe12345!)
 *
 * Note: SonicJS bootstraps document types and the RBAC role/permission seed
 * server-side on startup. This script only creates the credential rows needed
 * to log in. If the first login reports missing permissions, see the runbook
 * in README.md (Deployment) for the RBAC fallback.
 */

import { execFileSync } from 'node:child_process'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
  console.error('Usage: node scripts/seed-admin-remote.mjs <staging|production>')
  process.exit(1)
}

const email = process.env.CMS_ADMIN_EMAIL || 'admin@web-cms.local'
const password = process.env.CMS_ADMIN_PASSWORD || 'ChangeMe12345!'

const sqlEscape = (v) => String(v).replace(/'/g, "''")

async function hashPassword(pw) {
  const iterations = 100000
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${iterations}:${toHex(salt.buffer)}:${toHex(hashBuffer)}`
}

function d1(command, { json = false } = {}) {
  const args = ['wrangler', 'd1', 'execute', 'DB', '--env', env, '--remote', '--command', command]
  if (json) args.push('--json')
  return execFileSync('npx', args, { encoding: 'utf-8' })
}

async function main() {
  // 1. Skip if the admin already exists (idempotent re-runs).
  const out = d1(`SELECT id FROM auth_user WHERE email = '${sqlEscape(email)}'`, { json: true })
  let exists = false
  try {
    const parsed = JSON.parse(out)
    const rows = Array.isArray(parsed) ? parsed[0]?.results ?? [] : parsed?.results ?? []
    exists = rows.length > 0
  } catch {
    // If parsing fails, fall through and let the INSERT's UNIQUE constraint guard it.
  }
  if (exists) {
    console.log(`✓ Admin user already exists on ${env} (${email})`)
    return
  }

  // 2. Insert the credential rows (same shape as the local seed).
  const passwordHash = await hashPassword(password)
  const now = Date.now()
  const uid = `admin-${now}-${Math.random().toString(36).slice(2, 11)}`
  const accountRowId = crypto.randomUUID()
  const accountId = uid

  const sql = [
    `INSERT INTO auth_user (id, email, first_name, last_name, role, is_active, created_at, updated_at, name)`,
    `VALUES ('${uid}', '${sqlEscape(email)}', 'Admin', 'User', 'admin', 1, ${now}, ${now}, 'Admin User');`,
    `INSERT INTO auth_account (id, user_id, account_id, provider_id, password, created_at, updated_at)`,
    `VALUES ('${accountRowId}', '${uid}', '${accountId}', 'credential', '${passwordHash}', ${now}, ${now});`,
  ].join(' ')

  d1(sql)
  console.log(`✓ Admin user created on ${env}`)
  console.log(`  Email: ${email}`)
  console.log(`  Role:  admin`)
}

main().catch((err) => {
  console.error('❌ Remote seed failed:', err?.message || err)
  process.exit(1)
})
