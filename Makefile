.PHONY: dev dev-api dev-web build build-api build-web docs-api publish-api-docs-staging publish-api-docs-prod test test-api test-web lint lint-api lint-web lint-fix clean install

# --- Development ---

dev:
	@echo "Starting API and Web in parallel..."
	$(MAKE) dev-api & $(MAKE) dev-web & wait

dev-api:
	cd apps/fs-backend && go run main.go

dev-web:
	cd apps/fs-app-web && npx vite

# --- Build ---

build: build-api build-web

docs-api:
	API_DOCS_API_VERSION=v1 ./scripts/generate-api-docs.sh

publish-api-docs-staging: docs-api
	API_DOCS_ENVIRONMENT=staging API_DOCS_API_VERSION=v1 ./scripts/publish-api-docs-r2.sh

publish-api-docs-prod: docs-api
	API_DOCS_ENVIRONMENT=production API_DOCS_API_VERSION=v1 ./scripts/publish-api-docs-r2.sh

build-api: docs-api
	cd apps/fs-backend && go build ./...

build-web:
	cd apps/fs-app-web && npx tsc -b && npx vite build

# --- Test ---

test: test-api test-web

test-api:
	cd apps/fs-backend && go test -race -cover ./...

test-web:
	cd apps/fs-app-web && npx vitest run

# --- Lint ---

lint: lint-api lint-web

lint-api:
	cd apps/fs-backend && go vet ./...

lint-web:
	cd apps/fs-app-web && npx biome check .

lint-fix:
	cd apps/fs-app-web && npx biome check --fix .

# --- Install ---

install:
	cd apps/fs-app-web && npm install

# --- Clean ---

clean:
	rm -rf apps/fs-app-web/dist apps/fs-app-web/node_modules/.vite
