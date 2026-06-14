#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  release-flow.sh --target <staging|production|both> --version <vX.Y.Z> [--feature <feature-branch>] [--dry-run]

Examples:
  .agents/skills/release-flow/scripts/release-flow.sh --target staging --feature feature/ux-improvements --version v0.8.1
  .agents/skills/release-flow/scripts/release-flow.sh --target production --version v0.8.1
  .agents/skills/release-flow/scripts/release-flow.sh --target both --feature feature/ux-improvements --version v0.8.1

Promotes:
  staging:    feature/* -> develop -> staging + vX.Y.Z-staging
  production: staging -> main + vX.Y.Z
  both:       staging flow, then production flow
USAGE
}

feature_branch=""
version=""
target="both"
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      target="${2:-}"
      shift 2
      ;;
    --feature)
      feature_branch="${2:-}"
      shift 2
      ;;
    --version)
      version="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$version" ]]; then
  usage >&2
  exit 2
fi

if [[ "$target" != "staging" && "$target" != "production" && "$target" != "both" ]]; then
  echo "Target must be staging, production, or both: $target" >&2
  exit 2
fi

if [[ ! "$version" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must use vX.Y.Z format: $version" >&2
  exit 2
fi

staging_tag="${version}-staging"

if [[ "$target" == "staging" || "$target" == "both" ]]; then
  if [[ -z "$feature_branch" ]]; then
    echo "--feature is required for target: $target" >&2
    exit 2
  fi

  if [[ ! "$feature_branch" =~ ^feature/[A-Za-z0-9._/-]+$ ]]; then
    echo "Feature branch must start with feature/: $feature_branch" >&2
    exit 2
  fi
fi

run() {
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  if [[ "$dry_run" -eq 0 ]]; then
    "$@"
  fi
}

require_clean_tree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Working tree is not clean. Commit, stash, or discard unrelated changes first." >&2
    git status --short >&2
    exit 1
  fi
}

require_remote_branch() {
  local branch="$1"
  if ! git show-ref --verify --quiet "refs/remotes/origin/${branch}"; then
    echo "Missing remote branch: origin/${branch}" >&2
    exit 1
  fi
}

require_no_tag() {
  local tag="$1"
  if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
    echo "Local tag already exists: ${tag}" >&2
    exit 1
  fi
  if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
    echo "Remote tag already exists: ${tag}" >&2
    exit 1
  fi
}

require_tag_exists() {
  local tag="$1"
  if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
    return 0
  fi
  if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
    return 0
  fi
  echo "Required staging tag does not exist: ${tag}" >&2
  exit 1
}

run_staging_release() {
  run git switch develop
  run git merge --ff-only "origin/${feature_branch}"

  main_ahead="$(git rev-list --left-right --count develop...origin/main | awk '{print $2}')"
  if [[ "$main_ahead" != "0" ]]; then
    run git merge --no-edit origin/main
  fi
  run git push origin develop

  run git switch staging
  run git merge --ff-only develop
  run git tag "$staging_tag"
  run git push origin staging "$staging_tag"
}

run_production_release() {
  run git switch staging
  run git merge --ff-only origin/staging

  run git switch main
  run git merge --ff-only origin/main
  run git merge --ff-only staging
  run git tag "$version"
  run git push origin main "$version"
}

if [[ "$dry_run" -eq 0 ]]; then
  require_clean_tree
fi
run git fetch origin --prune --tags

require_remote_branch develop
require_remote_branch staging
require_remote_branch main
if [[ "$target" == "staging" || "$target" == "both" ]]; then
  require_remote_branch "$feature_branch"
  require_no_tag "$staging_tag"
fi
if [[ "$target" == "production" || "$target" == "both" ]]; then
  require_no_tag "$version"
fi
if [[ "$target" == "production" && "$dry_run" -eq 0 ]]; then
  require_tag_exists "$staging_tag"
fi

echo "Release plan:"
echo "  target: ${target}"
if [[ "$target" == "staging" || "$target" == "both" ]]; then
  echo "  feature: ${feature_branch}"
  echo "  staging tag: ${staging_tag}"
fi
if [[ "$target" == "production" || "$target" == "both" ]]; then
  echo "  production tag: ${version}"
fi

if [[ "$target" == "staging" || "$target" == "both" ]]; then
  run_staging_release
fi

if [[ "$target" == "production" || "$target" == "both" ]]; then
  run_production_release
fi

run git status --branch --short
run git branch -vv --list develop staging main
run git tag --points-at HEAD
