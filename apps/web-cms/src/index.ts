/**
 * FactorySync Blog CMS
 *
 * Entry point for the SonicJS headless CMS that powers the blog.
 * Collections are defined under src/collections/ and registered below.
 */

import { createSonicJSApp, registerCollections } from '@sonicjs-cms/core'
import type { SonicJSConfig } from '@sonicjs-cms/core'

// Import your collection configurations.
// Add new collections here after creating them in src/collections/.
import blogPostsCollection from './collections/blog-posts.collection'

// FactorySync rebrand: re-skins SonicJS's server-rendered auth/admin pages and
// adds light/dark theming (see src/branding/).
import { brandingMiddleware } from './branding/brand-middleware'
import { BRAND_NAME } from './branding/brand'

// Register collections BEFORE creating the app.
registerCollections([
  blogPostsCollection,
  // Add more collections here as you create them
])

// Application configuration
const config: SonicJSConfig = {
  name: BRAND_NAME,
  plugins: {
    register: [
      // Add your own plugins here
    ],
  },
  middleware: {
    // Rewrites SonicJS's server-rendered HTML to apply FactorySync branding
    // and light/dark theming. beforeAuth wraps the whole downstream chain.
    beforeAuth: [brandingMiddleware()],
  },
}

// Create and export the application
export default createSonicJSApp(config)
