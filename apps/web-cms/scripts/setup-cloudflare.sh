#!/usr/bin/env bash
#
# Provision + deploy the SonicJS CMS worker for one environment.
#
#   bash scripts/setup-cloudflare.sh <staging|production>
#
# Idempotent: safe to re-run. It will only create resources that are missing.
# Prerequisite: `npx wrangler login` as the user who owns the target account.
#
# Steps per environment:
#   1. Create the D1 database (if missing) and write its id into wrangler.toml
#   2. Create the R2 bucket (if missing)
#   3. Apply database migrations to the remote D1
#   4. Set the BETTER_AUTH_SECRET worker secret (generated if not already set)
#   5. Deploy the worker
#   6. Seed the initial admin user
#
set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  staging)    SUFFIX="-staging"; TOKEN="STAGING_DATABASE_ID" ;;
  production) SUFFIX="";         TOKEN="PRODUCTION_DATABASE_ID" ;;
  *) echo "Usage: bash scripts/setup-cloudflare.sh <staging|production>"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
TOML="$APP_DIR/wrangler.toml"
cd "$APP_DIR"

# Pin the account so commands don't depend on the wrangler default account.
export CLOUDFLARE_ACCOUNT_ID="9cfbba8b3a373fdc0d11abaf64071719"

DB_NAME="factory-sync-cms-db${SUFFIX}"
BUCKET_NAME="factory-sync-cms-media${SUFFIX}"
WRANGLER="npx --yes wrangler"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }

bold "▶ Environment: $ENVIRONMENT  (account $CLOUDFLARE_ACCOUNT_ID)"

# --- Sanity: are we logged in to an account that can see this? ----------------
if ! $WRANGLER whoami >/dev/null 2>&1; then
  echo "✖ Not logged in. Run: npx wrangler login"; exit 1
fi

# --- 1. D1 database -----------------------------------------------------------
db_id_for() {
  $WRANGLER d1 list --json 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s||"[]");const m=(Array.isArray(a)?a:[]).find(x=>x.name===process.argv[1]);process.stdout.write(m?(m.uuid||m.database_id||""):"")})' "$1"
}

DB_ID="$(db_id_for "$DB_NAME" || true)"
if [ -z "$DB_ID" ]; then
  bold "▶ Creating D1 database: $DB_NAME"
  $WRANGLER d1 create "$DB_NAME" >/dev/null
  DB_ID="$(db_id_for "$DB_NAME")"
fi
[ -n "$DB_ID" ] || { echo "✖ Could not resolve D1 id for $DB_NAME"; exit 1; }
echo "  D1 $DB_NAME → $DB_ID"

# Write the id into wrangler.toml (replace the env's placeholder token, or an
# already-written id for this same env block — keyed by the unique token name).
if grep -q "\"$TOKEN\"" "$TOML"; then
  perl -pi -e "s/\"\Q$TOKEN\E\"/\"$DB_ID\"/" "$TOML"
  echo "  Wrote $DB_NAME id into wrangler.toml"
else
  echo "  wrangler.toml already has the $ENVIRONMENT database id"
fi

# --- 2. R2 bucket -------------------------------------------------------------
if $WRANGLER r2 bucket list 2>/dev/null | grep -qx "$BUCKET_NAME" \
   || $WRANGLER r2 bucket list 2>/dev/null | grep -q "name:\s*$BUCKET_NAME"; then
  echo "  R2 bucket $BUCKET_NAME already exists"
else
  bold "▶ Creating R2 bucket: $BUCKET_NAME"
  $WRANGLER r2 bucket create "$BUCKET_NAME"
fi

# --- 3. Remote migrations -----------------------------------------------------
bold "▶ Applying migrations to $DB_NAME (remote)"
$WRANGLER d1 migrations apply DB --env "$ENVIRONMENT" --remote

# --- 4. Worker secrets --------------------------------------------------------
# SonicJS requires BOTH of these. JWT_SECRET is hard-enforced in production —
# a missing/insecure value makes the security layer throw 500s on auth/CSRF
# paths, so it must be set before/with the first production deploy.
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
  fi
}
SECRET_LIST="$($WRANGLER secret list --env "$ENVIRONMENT" 2>/dev/null || true)"
for NAME in BETTER_AUTH_SECRET JWT_SECRET; do
  if echo "$SECRET_LIST" | grep -q "\"\?$NAME\"\?"; then
    echo "  $NAME already set for $ENVIRONMENT"
  else
    bold "▶ Setting $NAME for $ENVIRONMENT"
    printf '%s' "$(gen_secret)" | $WRANGLER secret put "$NAME" --env "$ENVIRONMENT"
  fi
done

# --- 5. Deploy ----------------------------------------------------------------
bold "▶ Deploying worker (env: $ENVIRONMENT)"
$WRANGLER deploy --env "$ENVIRONMENT"

# --- 6. Seed admin ------------------------------------------------------------
bold "▶ Seeding admin user (remote)"
node "$SCRIPT_DIR/seed-admin-remote.mjs" "$ENVIRONMENT" || \
  echo "  ⚠ Admin seed step failed — see README.md › Deployment for the manual fallback."

bold "✓ $ENVIRONMENT is live"
echo "  Visit the deployed worker's /admin (URL printed in the deploy output above)."
