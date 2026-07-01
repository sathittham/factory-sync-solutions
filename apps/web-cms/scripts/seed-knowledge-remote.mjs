/**
 * Seed the Knowledge Hub mockup articles into a REMOTE D1 database
 * (staging | production).
 *
 * Mirrors scripts/seed-knowledge.ts but writes to the remote DB via
 * `wrangler d1 execute --remote`, since getPlatformProxy() only ever talks to
 * the local database. The row shape matches what DocumentsService.create(...,
 * { publishOnCreate: true }) produces: a single published row that is also the
 * current draft (verified against a local seed).
 *
 * Article content is the shared source of truth in scripts/knowledge-articles.mjs.
 *
 * Prerequisites (remote):
 *   - Migrations applied:  npm run db:migrate:staging   (or :prod)
 *   - Admin author exists: npm run seed:staging          (or :prod)
 *
 * Usage:
 *   node scripts/seed-knowledge-remote.mjs <staging|production>
 * or:
 *   npm run seed:knowledge:staging
 *   npm run seed:knowledge:prod
 *
 * Idempotent: an article whose slug already exists is skipped.
 */

import { execFileSync } from 'node:child_process'
import { KNOWLEDGE_ARTICLES } from './knowledge-articles.mjs'

const env = process.argv[2]
if (env !== 'staging' && env !== 'production') {
  console.error('Usage: node scripts/seed-knowledge-remote.mjs <staging|production>')
  process.exit(1)
}

const sqlEscape = (v) => String(v).replace(/'/g, "''")

function d1(command, { json = false } = {}) {
  const args = ['wrangler', 'd1', 'execute', 'DB', '--env', env, '--remote', '--command', command]
  if (json) args.push('--json')
  return execFileSync('npx', args, { encoding: 'utf-8' })
}

/** Parse the `results` array out of a `wrangler d1 execute --json` response. */
function rowsOf(out) {
  try {
    const parsed = JSON.parse(out)
    return Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed?.results ?? [])
  } catch {
    return []
  }
}

function scalar(command) {
  const rows = rowsOf(d1(command, { json: true }))
  const first = rows[0]
  if (!first) return undefined
  return first[Object.keys(first)[0]]
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000)
}

function toSeconds(iso) {
  const ms = Date.parse(iso)
  return Number.isNaN(ms) ? nowSeconds() : Math.floor(ms / 1000)
}

/** A URL-safe-ish random id (TEXT primary key). */
function newId() {
  return `kb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function main() {
  // 1. Resolve the blog_post document type id (registered server-side on startup).
  const typeId = scalar(`SELECT id FROM document_types WHERE name = 'blog_post'`)
  if (!typeId) {
    console.error(
      `❌ blog_post document type not found on ${env}. Deploy the CMS (which bootstraps types) first.`,
    )
    process.exit(1)
  }

  // 2. Resolve the admin author (the `author` field is type "user").
  const authorId = scalar(
    `SELECT id FROM auth_user WHERE email = 'admin@web-cms.local' OR role = 'admin' ORDER BY created_at ASC LIMIT 1`,
  )
  if (!authorId) {
    console.error(`❌ No admin author on ${env}. Run \`npm run seed:${env === 'production' ? 'prod' : 'staging'}\` first.`)
    process.exit(1)
  }

  let created = 0
  let skipped = 0

  for (const article of KNOWLEDGE_ARTICLES) {
    const exists = scalar(
      `SELECT id FROM documents WHERE type_id = '${sqlEscape(typeId)}' AND slug = '${sqlEscape(article.slug)}' LIMIT 1`,
    )
    if (exists) {
      console.log(`  ↷ skip (exists): ${article.slug}`)
      skipped++
      continue
    }

    const id = newId()
    const now = nowSeconds()
    const publishedAt = toSeconds(article.publishedAt)
    const data = JSON.stringify({
      title: article.title,
      slug: article.slug,
      category: article.category,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage,
      tags: article.tags,
      isPinned: article.isPinned,
      content: article.content,
      author: authorId,
      publishedAt: article.publishedAt,
    })

    const sql = [
      `INSERT INTO documents`,
      `(id, root_id, type_id, type_version, version_number, is_current_draft, is_published, status,`,
      ` parent_root_id, slug, title, sort_order, visible, published_at, tenant_id, locale,`,
      ` translation_group_id, data, metadata, owner_id, created_by, updated_by, created_at, updated_at)`,
      `VALUES`,
      `('${id}', '${id}', '${sqlEscape(typeId)}', 1, 1, 1, 1, 'published',`,
      ` '', '${sqlEscape(article.slug)}', '${sqlEscape(article.title)}', 0, 1, ${publishedAt}, 'default', 'default',`,
      ` '', '${sqlEscape(data)}', '{}', NULL, '${sqlEscape(authorId)}', '${sqlEscape(authorId)}', ${now}, ${now});`,
    ].join(' ')

    d1(sql)
    console.log(`  ✓ created: [${article.category}] ${article.slug}`)
    created++
  }

  console.log(`\n✓ Knowledge Hub remote seed complete on ${env} — ${created} created, ${skipped} skipped.`)
}

try {
  main()
} catch (err) {
  console.error('❌ Remote seed failed:', err?.message || err)
  process.exit(1)
}
