.PHONY: dev dev-api dev-web build build-api build-consumer build-web docs-api publish-api-docs-staging publish-api-docs-prod test test-api test-web lint lint-api lint-web lint-fix clean install setup-domain-event-worker setup-domain-event-monitoring

# --- Development ---

dev:
	@echo "Starting API and Web in parallel..."
	$(MAKE) dev-api & $(MAKE) dev-web & wait

dev-api:
	cd apps/backend && go run main.go

dev-web:
	cd apps/web-app && npx vite

# --- Build ---

build: build-api build-web

docs-api:
	API_DOCS_API_VERSION=v1 ./scripts/generate-api-docs.sh

publish-api-docs-staging: docs-api
	API_DOCS_ENVIRONMENT=staging API_DOCS_API_VERSION=v1 ./scripts/publish-api-docs-r2.sh

publish-api-docs-prod: docs-api
	API_DOCS_ENVIRONMENT=production API_DOCS_API_VERSION=v1 ./scripts/publish-api-docs-r2.sh

build-api: docs-api
	cd apps/backend && go build ./...

build-consumer:
	cd apps/backend && go build ./cmd/domain-event-consumer

build-web:
	cd apps/web-app && npx tsc -b && npx vite build

# --- Test ---

test: test-api test-web

test-api:
	cd apps/backend && go test -race -cover ./...

test-web:
	cd apps/web-app && npx vitest run

# --- Lint ---

lint: lint-api lint-web

lint-api:
	cd apps/backend && go vet ./...

lint-web:
	cd apps/web-app && npx biome check .

lint-fix:
	cd apps/web-app && npx biome check --fix .

# --- Install ---

install:
	cd apps/web-app && npm install

# --- Clean ---

clean:
	rm -rf apps/web-app/dist apps/web-app/node_modules/.vite

setup-domain-event-worker:
	./scripts/setup-domain-event-worker.sh --environment staging --project $(or $(GCP_PROJECT_ID),factory-sync-solutions)

setup-domain-event-monitoring:
	./scripts/setup-domain-event-monitoring.sh --environment $(or $(ENVIRONMENT),staging) --project $(or $(GCP_PROJECT_ID),factory-sync-solutions)
