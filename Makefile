.PHONY: dev dev-api dev-web build build-api build-web test test-api test-web lint lint-api lint-web lint-fix clean install

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

build-api:
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
