# Verification Guide

## Two Dev Server Targets

GoText v3 uses two dev server configurations. Every change must pass gates on **both** before merging.

### Target A — Frontend-only (mocked bridge)

```bash
cd frontend
npm run dev          # starts Vite at http://localhost:5173
```

All `wailsjs/go/main/*Handler` imports are intercepted by the Vite bridge-mock plugin and replaced with deterministic TypeScript stubs (`frontend/src/dev/bridge-mock/`). No Go backend required.

**Use Target A for:** unit tests, RTL component tests, responsive layout verification, visual/a11y gates.

### Target B — Backend-connected (real bridge)

```bash
wails dev            # starts Go + Vite at http://localhost:34115
```

The real Wails bindings call the running Go handlers. Target A mocking is disabled because `WAILS_BUILD_MODE` is set by Wails.

**Use Target B for:** end-to-end journeys, real LLM provider flows, cancellation, event streaming.

---

## Gated Verification Pipeline

Run the full pipeline before opening a PR:

```bash
# Backend
go fmt ./...
go vet ./...
go test -race ./...

# Frontend
cd frontend
npm run verify        # format-check + lint + type-check + unit tests + UI gates (Target A)

# Backend-connected smoke (requires wails dev in a separate terminal)
BASE_URL=http://localhost:34115 npm run verify:smoke
```

### Gate Table (from 13-testing-specification.md §11)

| # | Gate | Command | Blocks on |
|---|---|---|---|
| 1 | Format | `gofmt -l .` / `npm run format:check` | Unformatted files |
| 2 | Lint/type | `go vet` / `npm run lint && tsc --noEmit` | Lint or type errors |
| 3 | Go tests | `go test -race ./...` | Test failure or race |
| 4 | FE unit tests | `npm test` (Jest + RTL + jest-axe + coverage) | Test failure or coverage drop |
| 5 | Codegen drift | `sqlc generate --diff` / `wails generate module` | Generated files out of sync |
| 6 | Build | `go build ./...` / `npm run build` | Build failure |
| 7 | UI gates (A) | `npm run dev` → `npm run verify:ui` | Overflow / console errors / font / missing element |
| 8 | UI gates (B) | `wails dev` → `BASE_URL=… npm run verify:smoke` | Backend journey failure |
| 9 | Security/CI | `@mui`/`@emotion` guard / `govulncheck` / `npm audit` | Guard violations |
| 10 | Clean tree | `git status` | Uncommitted generated/formatted files |

**Rule:** Any red gate anywhere on the branch must be fixed before merging. "Pre-existing" is not acceptable.

---

## Bridge Mock

The bridge mock (`frontend/src/dev/bridge-mock/`) provides TypeScript implementations of every Wails-bound method from `08-api-contracts.md`. It is injected **only** in dev mode via a Vite plugin (`vite.config.ts`). It is never bundled into production builds.

To add a new handler as features land:
1. Add the TypeScript file to `frontend/src/dev/bridge-mock/go/main/<HandlerName>.ts`
2. Re-export from `frontend/src/dev/bridge-mock/index.ts`

---

## Coverage Targets

| Area | Target |
|---|---|
| FE `logic/` | ≥90% |
| FE components | ≥80% |
| Go `internal/apperr` | ≥95% |
| Go `internal/prompts` | ≥90% |
| Go `internal/actions`, `internal/llms` | ≥85% |
| Go repo-wide aggregate | ≥85% |

Run coverage locally:
```bash
# Go
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out

# Frontend
cd frontend && npm run test:coverage
```
