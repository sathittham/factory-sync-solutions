/**
 * Blog Posts Collection
 *
 * Example collection configuration for blog posts
 */

import type { CollectionConfig } from '@sonicjs-cms/core';

export default {
  name: 'blog_post',
  displayName: 'Blog Post',
  slug: 'blog-posts',
  description: 'Manage your blog posts',
  icon: '📝',

  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: 'Title',
        required: true,
        maxLength: 200,
      },
      slug: {
        type: 'slug',
        title: 'URL Slug',
        required: true,
        maxLength: 200,
      },
      category: {
        type: 'select',
        title: 'Category',
        required: true,
        // Slugs MUST stay in sync with the public site's Knowledge Hub taxonomy
        // (apps/web-official/src/lib/knowledge.ts) and sitemap.md §5.
        enum: [
          'law-licensing',
          'factory-safety',
          'digital-factory',
          'machinery-automation',
          'environment',
          'lean-kaizen',
          'digital-marketing',
          'gov-benefits',
        ],
        enumLabels: [
          'Law / Factory Licensing',
          'Factory Safety',
          'Digital Factory & Tech',
          'Machinery & Automation',
          'Environment / Pollution Treatment',
          'Lean & Kaizen / Productivity',
          'Online Marketing & DX',
          'Gov Benefits / Intl Standards',
        ],
      },
      excerpt: {
        type: 'textarea',
        title: 'Excerpt',
        description: 'Short summary shown on listing cards and used as the meta description.',
        maxLength: 300,
      },
      content: {
        type: 'lexical',
        title: 'Content',
        required: true,
      },
      author: {
        type: 'user',
        title: 'Author',
        required: true,
      },
      publishedAt: {
        type: 'datetime',
        title: 'Published Date',
      },
    },
    required: ['title', 'slug', 'content', 'author'],
  },

  // List view configuration
  listFields: ['title', 'category', 'author', 'status', 'publishedAt'],
  searchFields: ['title', 'excerpt', 'content', 'author'],
  defaultSort: 'createdAt',
  defaultSortOrder: 'desc',

  // Mark as config-managed (code-based) collection
  managed: true,
  isActive: true,

  // Opt in to public read access. Without this, only authenticated users
  // (admin/editor) can read content via the API. See docs/authentication.md.
  access: {
    public: ['read'],
  },

  // Per-collection cache override. TTL in seconds; falls back to the cache plugin
  // default (CACHE_CONFIGS.api.ttl, currently 300s) if unset.
  cache: {
    enabled: true,
    ttl: 5,
  },
} satisfies CollectionConfig;
