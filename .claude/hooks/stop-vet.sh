#!/bin/bash
# Stop hook: run go vet on apps/fs-backend if any .go files were modified.

changed_files=$(
  {
    git diff --name-only HEAD 2>/dev/null
    git diff --cached --name-only 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | grep '\.go$' | sort -u
)

[ -z "$changed_files" ] && exit 0

# Check if any changed files are under apps/fs-backend
api_files=$(echo "$changed_files" | grep '^apps/fs-backend/')
[ -z "$api_files" ] && exit 0

echo "→ go vet apps/fs-backend/..."
if ! (cd apps/fs-backend && go vet ./... 2>&1); then
  exit 1
fi

exit 0
