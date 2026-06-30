-- Patch: add auth_user columns missing from SonicJS core's shipped migration.
--
-- @sonicjs-cms/core@3.0.0-beta.20 defines these columns in its better-auth
-- Drizzle user model but its migrations/0001_core.sql never creates them, so
-- every user INSERT (Google social sign-in and email/password registration
-- alike) fails with "Failed query: insert into auth_user (...)". This patch
-- reconciles the table with the runtime schema.
--
-- migrations_dir in wrangler.toml points at node_modules (regenerated on
-- install), so this fix lives here and is applied out-of-band:
--   pnpm --filter @repo/web-cms exec wrangler d1 execute DB --local \
--     --file=patches/0001_auth_user_authfields.sql
--   # staging:    add  --env staging    --remote   (drop --local)
--   # production: add  --env production --remote   (drop --local)
--
-- One-time per database. Re-apply after `db:reset`. Remove once core ships the
-- columns in its own migration.

ALTER TABLE auth_user ADD COLUMN password_reset_token TEXT;
ALTER TABLE auth_user ADD COLUMN password_reset_expires INTEGER;
ALTER TABLE auth_user ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0;
