#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/apps/fs-backend}"
API_DOCS_API_VERSION="${API_DOCS_API_VERSION:-v1}"
API_DOCS_ENVIRONMENT="${API_DOCS_ENVIRONMENT:-development}"
API_DOCS_R2_PREFIX="${API_DOCS_R2_PREFIX:-openapi}"
SWAG_PACKAGE="${SWAG_PACKAGE:-github.com/swaggo/swag/cmd/swag}"
OUTPUT_DIR="$BACKEND_DIR/docs/$API_DOCS_API_VERSION"
GIT_SHA="${GITHUB_SHA:-$(git rev-parse HEAD)}"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cd "$BACKEND_DIR"

go run "$SWAG_PACKAGE" init \
  -g main.go \
  -o "$OUTPUT_DIR" \
  --parseDependency \
  --parseInternal

node - "$OUTPUT_DIR/swagger.json" "$API_DOCS_API_VERSION" <<'NODE'
const fs = require("fs");

const [swaggerPath, apiVersion] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
const actualVersion = spec?.info?.version;

if (actualVersion !== apiVersion) {
  console.error(
    `Swagger info.version must match API_DOCS_API_VERSION. expected=${apiVersion} actual=${actualVersion}`,
  );
  process.exit(1);
}

const badPaths = Object.keys(spec.paths || {}).filter((path) => path.startsWith("/api/v1"));
if (badPaths.length > 0) {
  console.error(`Swagger @Router paths must be relative to @BasePath. Bad paths: ${badPaths.join(", ")}`);
  process.exit(1);
}
NODE

node - "$OUTPUT_DIR/swagger.json" "$OUTPUT_DIR/metadata.json" "$API_DOCS_ENVIRONMENT" "$API_DOCS_API_VERSION" "$GIT_SHA" "$GENERATED_AT" "$API_DOCS_R2_PREFIX" <<'NODE'
const fs = require("fs");

const [
  swaggerPath,
  metadataPath,
  environment,
  apiVersion,
  gitSHA,
  generatedAt,
  prefix,
] = process.argv.slice(2);

const spec = JSON.parse(fs.readFileSync(swaggerPath, "utf8"));
const openapiVersion = spec.openapi || spec.swagger || "";
const currentPrefix = `${prefix.replace(/\/+$/, "")}/${apiVersion}/current`;
const metadata = {
  environment,
  apiVersion,
  gitSHA,
  generatedAt,
  openapiVersion,
  jsonKey: `${currentPrefix}/swagger.json`,
  yamlKey: `${currentPrefix}/swagger.yaml`,
};

fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
NODE

echo "Generated API docs for $API_DOCS_API_VERSION at $OUTPUT_DIR"
