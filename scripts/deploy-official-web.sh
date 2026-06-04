#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Manual deploy script for apps/fs-official-web → Cloudflare Pages
#
# Usage:
#   ./scripts/deploy-official-web.sh staging
#   ./scripts/deploy-official-web.sh production
#
# Required env vars (export or place in scripts/.env.deploy):
#   CLOUDFLARE_API_TOKEN
#   CLOUDFLARE_ACCOUNT_ID
#
# Optional env vars (have defaults):
#   PUBLIC_APP_URL        — override the app URL injected at build time
#   PUBLIC_APP_VERSION    — defaults to the latest git tag
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO_ROOT/apps/fs-official-web"

# Load local deploy secrets if present (not committed)
ENV_FILE="$SCRIPT_DIR/.env.deploy"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

# --- Validate argument -------------------------------------------------------
if [[ $# -ne 1 ]] || [[ "$1" != "staging" && "$1" != "production" ]]; then
  echo "Usage: $0 <staging|production>"
  exit 1
fi
ENVIRONMENT="$1"

# --- Cloudflare config per environment --------------------------------------
if [[ "$ENVIRONMENT" == "production" ]]; then
  CF_PROJECT="factory-sync-solutions-official"
  CF_BRANCH="main"
  DEFAULT_APP_URL="https://factorysyncsolutions.com"
else
  CF_PROJECT="factory-sync-solutions-official-staging"
  CF_BRANCH="staging"
  DEFAULT_APP_URL="https://staging.factorysyncsolutions.com"
fi

# --- Resolve env vars --------------------------------------------------------
: "${CLOUDFLARE_API_TOKEN:?ERROR: CLOUDFLARE_API_TOKEN is not set}"
: "${CLOUDFLARE_ACCOUNT_ID:?ERROR: CLOUDFLARE_ACCOUNT_ID is not set}"

PUBLIC_APP_VERSION="${PUBLIC_APP_VERSION:-$(git -C "$REPO_ROOT" describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")}"
PUBLIC_APP_URL="${PUBLIC_APP_URL:-$DEFAULT_APP_URL}"

# --- Summary -----------------------------------------------------------------
echo ""
echo "┌─────────────────────────────────────────────┐"
echo "│  Deploy: fs-official-web → Cloudflare Pages │"
echo "└─────────────────────────────────────────────┘"
echo "  Environment : $ENVIRONMENT"
echo "  CF Project  : $CF_PROJECT"
echo "  CF Branch   : $CF_BRANCH"
echo "  App URL     : $PUBLIC_APP_URL"
echo "  App Version : $PUBLIC_APP_VERSION"
echo ""

# --- Build -------------------------------------------------------------------
echo "▶ Installing dependencies..."
npm ci --prefix "$APP_DIR"

echo "▶ Building..."
BUILD_SCRIPT="build"
[[ "$ENVIRONMENT" == "staging" ]] && BUILD_SCRIPT="build:staging"
PUBLIC_APP_URL="$PUBLIC_APP_URL" \
PUBLIC_APP_VERSION="$PUBLIC_APP_VERSION" \
  npm run "$BUILD_SCRIPT" --prefix "$APP_DIR"

# --- Deploy ------------------------------------------------------------------
echo "▶ Deploying to Cloudflare Pages ($CF_PROJECT)..."
CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN" \
  npx wrangler pages deploy "$APP_DIR/dist" \
    --project-name="$CF_PROJECT" \
    --branch="$CF_BRANCH" \
    --account-id="$CLOUDFLARE_ACCOUNT_ID"

echo ""
echo "✓ Deployed $ENVIRONMENT successfully."
