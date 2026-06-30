#!/bin/bash
# Stop hook: run go vet on apps/backend if any .go files were modified.

changed_files=$(
  {
    git diff --name-only HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | grep '\.go$' | sort -u
)

[ -z "$changed_files" ] && exit 0

# Check if any changed files are under apps/backend
api_files=$(echo "$changed_files" | grep '^apps/backend/')
[ -z "$api_files" ] && exit 0

echo "→ go vet apps/backend/..."
if ! (cd apps/backend && go vet ./... 2>&1); then
  exit 1
fi

exit 0
