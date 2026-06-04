#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# One-time setup: create Cloudflare Pages projects for fs-official-web
# and attach custom domains.
#
# Run once before first deploy:
#   1. Fill in scripts/.env.deploy (copy from scripts/.env.deploy.example)
#   2. ./scripts/setup-official-web-cf.sh
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_FILE="$SCRIPT_DIR/.env.deploy"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found."
  echo "Copy scripts/.env.deploy.example → scripts/.env.deploy and fill in values."
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${CLOUDFLARE_API_TOKEN:?ERROR: CLOUDFLARE_API_TOKEN is not set in .env.deploy}"
: "${CLOUDFLARE_ACCOUNT_ID:?ERROR: CLOUDFLARE_ACCOUNT_ID is not set in .env.deploy}"

export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

echo ""
echo "┌───────────────────────────────────────────────────┐"
echo "│  Cloudflare Pages — fs-official-web project setup │"
echo "└───────────────────────────────────────────────────┘"

# ---------------------------------------------------------------------------
# Helper: create project (skip if already exists)
# ---------------------------------------------------------------------------
create_project() {
  local name="$1"
  local branch="$2"

  echo ""
  echo "▶ Creating project: $name (production branch: $branch)"
  if npx wrangler pages project create "$name" --production-branch="$branch" 2>&1; then
    echo "  ✓ Created $name"
  else
    echo "  ↷ Project $name may already exist — continuing."
  fi
}

# ---------------------------------------------------------------------------
# Helper: add custom domain via Cloudflare API (wrangler pages domain was
# removed in wrangler v4)
# ---------------------------------------------------------------------------
add_domain() {
  local name="$1"
  local domain="$2"

  echo ""
  echo "▶ Adding domain $domain → $name"
  local response
  response=$(curl -s -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${name}/domains" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${domain}\"}")
  if echo "$response" | grep -q '"success":true'; then
    echo "  ✓ Domain added: $domain"
  else
    echo "  ↷ $domain — $(echo "$response" | python3 -c 'import sys,json; e=json.load(sys.stdin).get("errors",[]); print(e[0]["message"] if e else "already attached or pending")')"
  fi
}

# ---------------------------------------------------------------------------
# Production project
# ---------------------------------------------------------------------------
create_project "factory-sync-solutions-official" "main"
add_domain     "factory-sync-solutions-official" "factorysyncsolutions.com"
add_domain     "factory-sync-solutions-official" "www.factorysyncsolutions.com"

# ---------------------------------------------------------------------------
# Staging project
# ---------------------------------------------------------------------------
create_project "factory-sync-solutions-official-staging" "staging"
add_domain     "factory-sync-solutions-official-staging" "staging.factorysyncsolutions.com"

echo ""
echo "┌───────────────────────────────────────────────────────────────────┐"
echo "│  Setup complete.                                                   │"
echo "│                                                                    │"
echo "│  Next: add DNS records in Cloudflare for each domain:             │"
echo "│    factorysyncsolutions.com        → CNAME  factory-sync-solutions-official.pages.dev"
echo "│    www.factorysyncsolutions.com    → CNAME  factory-sync-solutions-official.pages.dev"
echo "│    staging.factorysyncsolutions.com → CNAME factory-sync-solutions-official-staging.pages.dev"
echo "│                                                                    │"
echo "│  Then run the first deploy:                                        │"
echo "│    ./scripts/deploy-official-web.sh staging                       │"
echo "│    ./scripts/deploy-official-web.sh production                    │"
echo "└───────────────────────────────────────────────────────────────────┘"
