import { bootstrapDocumentTypes, DocumentsService } from '@sonicjs-cms/core'
import { getPlatformProxy } from 'wrangler'
import { KNOWLEDGE_ARTICLES } from './knowledge-articles.mjs'

/**
 * Seed script: Knowledge Hub mockup articles (LOCAL D1).
 *
 * Inserts 8 published `blog_post` documents — one per Knowledge Hub category
 * (apps/web-official/src/lib/knowledge.ts). Article content lives in the shared
 * source of truth `scripts/knowledge-articles.mjs`; each is bilingual (TH + EN)
 * in a single document to match the locale-blind fetch in
 * apps/web-official/src/lib/cms.ts, so 8 docs → exactly 8 rendered articles.
 *
 * Uses SonicJS's own DocumentsService so version/publish flags are set correctly.
 * Idempotent: an article whose slug already exists is skipped.
 *
 * Usage (local miniflare D1, .wrangler/state — same target as `npm run seed`):
 *   npm run db:migrate:local   # ensure tables exist
 *   npm run seed               # ensure the admin author user exists
 *   npm run seed:knowledge
 *
 * For staging/prod, use scripts/seed-knowledge-remote.mjs (seed:knowledge:staging).
 */

async function seed() {
  const { env, dispose } = await getPlatformProxy()

  if (!env?.DB) {
    console.error('❌ DB binding not found. Run migrations first: npm run db:migrate:local')
    process.exit(1)
  }

  try {
    await bootstrapDocumentTypes(env.DB)

    const type = await env.DB.prepare(
      'SELECT id, queryable_fields, schema_version FROM document_types WHERE name = ?'
    )
      .bind('blog_post')
      .first<{ id: string; queryable_fields: string; schema_version: number }>()

    if (!type) {
      console.error('❌ blog_post document type not found. Is the collection registered?')
      await dispose()
      process.exit(1)
    }

    // Author = the seeded admin user (the `author` field is type "user").
    const author = await env.DB.prepare(
      'SELECT id FROM auth_user WHERE email = ? OR role = ? ORDER BY created_at ASC LIMIT 1'
    )
      .bind('admin@web-cms.local', 'admin')
      .first<{ id: string }>()

    if (!author) {
      console.error('❌ No admin author found. Run `npm run seed` first to create the admin user.')
      await dispose()
      process.exit(1)
    }

    let queryableFields: unknown[] = []
    try {
      queryableFields = JSON.parse(type.queryable_fields || '[]')
    } catch {
      queryableFields = []
    }

    const docs = new DocumentsService(env.DB, {
      tenantId: 'default',
      queryableFields: queryableFields as never,
      typeSchemaVersion: type.schema_version,
    })

    let created = 0
    let skipped = 0

    for (const article of KNOWLEDGE_ARTICLES) {
      const existing = await env.DB.prepare(
        'SELECT id FROM documents WHERE type_id = ? AND slug = ? LIMIT 1'
      )
        .bind(type.id, article.slug)
        .first()

      if (existing) {
        console.log(`  ↷ skip (exists): ${article.slug}`)
        skipped++
        continue
      }

      await docs.create(
        {
          typeId: type.id,
          locale: 'default',
          slug: article.slug,
          title: article.title,
          publishOnCreate: true,
          data: {
            title: article.title,
            slug: article.slug,
            category: article.category,
            excerpt: article.excerpt,
            featuredImage: article.featuredImage,
            tags: article.tags,
            isPinned: article.isPinned,
            content: article.content,
            author: author.id,
            publishedAt: article.publishedAt,
          },
        },
        author.id
      )

      console.log(`  ✓ created: [${article.category}] ${article.slug}`)
      created++
    }

    console.log(`\n✓ Knowledge Hub seed complete — ${created} created, ${skipped} skipped.`)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    await dispose()
    process.exit(1)
  }

  await dispose()
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
