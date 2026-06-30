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

// Backoffice → CMS single sign-on: POST /sso/handover verifies a Firebase ID
// token and starts an admin session, so a backoffice user lands on /admin
// without a second sign-in (see src/sso/). Mounted as a beforeAuth middleware
// (not a plugin route) so it runs ahead of core's CSRF guard.
import { ssoHandoverMiddleware } from './sso/middleware'
import { authTokenBridge } from './sso/auth-token-bridge'

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
    // beforeAuth wraps the whole downstream chain, ahead of the CSRF guard:
    //  1. SSO handover — the cross-site form POST can't carry a csrf_token, so
    //     it must be handled before CSRF (the Firebase token is the trust anchor).
    //  2. Branding — rewrites SonicJS's server-rendered HTML for FactorySync.
    beforeAuth: [ssoHandoverMiddleware(), brandingMiddleware()],
    // Honors the SSO handover's legacy `auth_token` JWT when better-auth has no
    // session, so a handed-off backoffice user is recognized by the /admin
    // guards (runs after getSession, before requireAuth/requireRbac).
    afterAuth: [authTokenBridge()],
  },
}

// Create and export the application
export default createSonicJSApp(config)
