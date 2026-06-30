#!/usr/bin/env bash
#
# swap-project-id.sh — repoint project-ID config from OLD to NEW.
#
# Usage: ./scripts/migration/swap-project-id.sh <OLD_PROJECT_ID> <NEW_PROJECT_ID>
#   e.g. ./scripts/migration/swap-project-id.sh factory-health-check factory-sync-solutions
#
# Idempotent: running again after a successful swap is a no-op (OLD is gone).
# Run at CUTOVER time only — see docs/operations/migrate-to-factory-sync-solutions.md.
#
# Touches ONLY the files below. It deliberately does NOT touch:
#   - apps/web-official/src/**          ("factory-health-check" there is a QUIZ SLUG, not the project)
#   - firebase-sa.json                     (replaced wholesale by the new service-account key)
#   - .playwright-mcp/**, .claude/settings.local.json (transient / local-machine paths)
#
# After running, you must still PASTE the new Firebase web config values
# (apiKey, appId, messagingSenderId) into apps/web-app/.env.* — this script
# cannot know those; they come from the new Firebase web app.

set -euo pipefail

OLD="${1:?Usage: swap-project-id.sh <OLD_PROJECT_ID> <NEW_PROJECT_ID>}"
NEW="${2:?Usage: swap-project-id.sh <OLD_PROJECT_ID> <NEW_PROJECT_ID>}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

TARGETS=(
  ".github/workflows/deploy-staging.yml"
  ".github/workflows/deploy-production.yml"
  "apps/backend/.env.production"
  "apps/backend/.env.staging"
  "apps/backend/.env.development"
  "apps/web-app/.env.production"
  "apps/web-app/.env.staging"
  "apps/web-app/.env.development"
  "docs/operations/deployment.md"
  "docs/operations/env-variables.md"
)

echo "Swapping project ID: '$OLD' -> '$NEW'"
echo "Root: $ROOT"
echo

changed=0
for rel in "${TARGETS[@]}"; do
  f="$ROOT/$rel"
  if [[ ! -f "$f" ]]; then
    echo "  skip (missing): $rel"
    continue
  fi
  hits="$(grep -c -- "$OLD" "$f" || true)"
  if [[ "$hits" -eq 0 ]]; then
    echo "  ok   (no '$OLD'): $rel"
    continue
  fi
  # \Q..\E = treat OLD literally (it contains hyphens, no regex surprises)
  perl -pi -e "s/\Q$OLD\E/$NEW/g" "$f"
  echo "  EDIT ($hits occurrence(s)): $rel"
  changed=$((changed + 1))
done

echo
echo "Done. Files changed: $changed"
echo
echo "NEXT (manual): paste new Firebase web config into apps/web-app/.env.*"
echo "  VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "  and set VITE_API_BASE_URL to the new Cloud Run URL."
echo
echo "Review with:  git diff -- ${TARGETS[*]}"
