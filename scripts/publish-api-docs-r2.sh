#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

API_DOCS_ENVIRONMENT="${API_DOCS_ENVIRONMENT:-}"
API_DOCS_API_VERSION="${API_DOCS_API_VERSION:-v1}"
API_DOCS_R2_BUCKET="${API_DOCS_R2_BUCKET:-}"
API_DOCS_R2_PREFIX="${API_DOCS_R2_PREFIX:-openapi}"
API_DOCS_SOURCE_DIR="${API_DOCS_SOURCE_DIR:-$ROOT_DIR/apps/backend/docs/$API_DOCS_API_VERSION}"
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
WRANGLER="${WRANGLER:-npx --yes wrangler@latest}"
API_DOCS_DRY_RUN="${API_DOCS_DRY_RUN:-false}"

if [ -z "$API_DOCS_ENVIRONMENT" ]; then
  echo "API_DOCS_ENVIRONMENT is required: staging or production" >&2
  exit 1
fi

if [ -z "$API_DOCS_R2_BUCKET" ]; then
  echo "API_DOCS_R2_BUCKET is required" >&2
  exit 1
fi

JSON_FILE="$API_DOCS_SOURCE_DIR/swagger.json"
YAML_FILE="$API_DOCS_SOURCE_DIR/swagger.yaml"

if [ ! -f "$JSON_FILE" ] || [ ! -f "$YAML_FILE" ]; then
  echo "Swagger artifacts are missing. Run scripts/generate-api-docs.sh first." >&2
  exit 1
fi

VERSION_PREFIX="$API_DOCS_R2_PREFIX/$API_DOCS_API_VERSION/versions/$GIT_SHA"
CURRENT_PREFIX="$API_DOCS_R2_PREFIX/$API_DOCS_API_VERSION/current"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

make_metadata() {
  local output_file="$1"
  local json_key="$2"
  local yaml_key="$3"

  node - "$JSON_FILE" "$output_file" "$API_DOCS_ENVIRONMENT" "$API_DOCS_API_VERSION" "$GIT_SHA" "$GENERATED_AT" "$json_key" "$yaml_key" <<'NODE'
const fs = require("fs");

const [
  swaggerPath,
  outputPath,
  environment,
  apiVersion,
  gitSHA,
  generatedAt,
  jsonKey,
  yamlKey,
] = process.argv.slice(2);

const spec = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
const openapiVersion = spec.openapi || spec.swagger || "";

const metadata = {
  environment,
  apiVersion,
  gitSHA,
  generatedAt,
  openapiVersion,
  jsonKey,
  yamlKey,
};

fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
NODE
}

upload_object() {
	local key="$1"
	local file="$2"
	local content_type="$3"

	if [ "$API_DOCS_DRY_RUN" = "true" ]; then
		echo "DRY RUN: upload $file to r2://$API_DOCS_R2_BUCKET/$key ($content_type)"
		return 0
	fi

	$WRANGLER r2 object put "$API_DOCS_R2_BUCKET/$key" \
		--file "$file" \
		--content-type "$content_type" \
		--remote
}

verify_object() {
	local key="$1"
	local expected_file="$2"
	local verify_file="$TMP_DIR/verify-${key//\//_}"

	if [ "$API_DOCS_DRY_RUN" = "true" ]; then
		echo "DRY RUN: verify r2://$API_DOCS_R2_BUCKET/$key"
		return 0
	fi

	$WRANGLER r2 object get "$API_DOCS_R2_BUCKET/$key" --file "$verify_file" --remote >/dev/null
	if ! cmp -s "$expected_file" "$verify_file"; then
		echo "R2 upload verification failed for r2://$API_DOCS_R2_BUCKET/$key" >&2
		exit 1
	fi
}

VERSION_METADATA="$TMP_DIR/version-metadata.json"
CURRENT_METADATA="$TMP_DIR/current-metadata.json"

make_metadata "$VERSION_METADATA" "$VERSION_PREFIX/swagger.json" "$VERSION_PREFIX/swagger.yaml"
make_metadata "$CURRENT_METADATA" "$CURRENT_PREFIX/swagger.json" "$CURRENT_PREFIX/swagger.yaml"

upload_object "$VERSION_PREFIX/swagger.json" "$JSON_FILE" "application/json"
upload_object "$VERSION_PREFIX/swagger.yaml" "$YAML_FILE" "application/yaml"
upload_object "$VERSION_PREFIX/metadata.json" "$VERSION_METADATA" "application/json"

upload_object "$CURRENT_PREFIX/swagger.json" "$JSON_FILE" "application/json"
upload_object "$CURRENT_PREFIX/swagger.yaml" "$YAML_FILE" "application/yaml"
upload_object "$CURRENT_PREFIX/metadata.json" "$CURRENT_METADATA" "application/json"

verify_object "$VERSION_PREFIX/swagger.json" "$JSON_FILE"
verify_object "$VERSION_PREFIX/swagger.yaml" "$YAML_FILE"
verify_object "$VERSION_PREFIX/metadata.json" "$VERSION_METADATA"

verify_object "$CURRENT_PREFIX/swagger.json" "$JSON_FILE"
verify_object "$CURRENT_PREFIX/swagger.yaml" "$YAML_FILE"
verify_object "$CURRENT_PREFIX/metadata.json" "$CURRENT_METADATA"

echo "Published API docs to r2://$API_DOCS_R2_BUCKET/$CURRENT_PREFIX"
