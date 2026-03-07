.PHONY: dev dev-api dev-web build build-api build-web test test-api test-web lint lint-api lint-web lint-fix clean install

# --- Development ---

dev:
	@echo "Starting API and Web in parallel..."
	$(MAKE) dev-api & $(MAKE) dev-web & wait

dev-api:
	cd apps/api && go run main.go

dev-web:
	cd apps/web && npx vite

# --- Build ---

build: build-api build-web

build-api:
	cd apps/api && go build ./...

build-web:
	cd apps/web && npx tsc -b && npx vite build

# --- Test ---

test: test-api test-web

test-api:
	cd apps/api && go test -race -cover ./...

test-web:
	cd apps/web && npx vitest run

# --- Lint ---

lint: lint-api lint-web

lint-api:
	cd apps/api && go vet ./...

lint-web:
	cd apps/web && npx biome check .

lint-fix:
	cd apps/web && npx biome check --fix .

# --- Install ---

install:
	cd apps/web && npm install

# --- Clean ---

clean:
	rm -rf apps/web/dist apps/web/node_modules/.vite
