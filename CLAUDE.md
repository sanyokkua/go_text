# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Standards

All code in this project must follow the rules defined in `docs/ai_agent_rules/`. These are automatically loaded:

@docs/ai_agent_rules/CleanCodeRules.md
@docs/ai_agent_rules/GoLoggingRules.md
@docs/ai_agent_rules/GoUnitTestsRules.md
@docs/ai_agent_rules/TypescriptCodingRules.md
@docs/ai_agent_rules/TypescriptDocumentationRules.md
@docs/ai_agent_rules/TypescriptReduxRules.md
@docs/ai_agent_rules/TypescriptReactTestingRules.md
@docs/ai_agent_rules/TypescriptUnitTestsRules.md
@docs/ai_agent_rules/ErrorEnvelopeRules.md
@docs/ai_agent_rules/SqliteGooseSqlcRules.md
@docs/ai_agent_rules/RadixUICSSRules.md

**Agent routing:**

| Files being changed | Use agent |
|---|---|
| `internal/**/*.go`, `main.go` (non-test) | `go-engineer` |
| `internal/**/*_test.go`, any `*_test.go` | `go-tester` |
| `frontend/src/**/*.ts`, `frontend/src/**/*.tsx` (non-test) | `ts-engineer` |
| `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx` | `ts-tester` |
| New feature design, system-level changes | `architect` |
| Wails runtime, bindings, events, menus, EnumBind | load `wails-dev` skill |
| `internal/db/queries/*.sql` or `internal/db/store/` | run `sqlc generate` after changes |
| `internal/db/migrations/*.sql` | migration runs automatically on next `db.Open`; confirm it is additive |

## Project Overview

**Text Processing Suite** ("GoText") is a native desktop application built with Go + React via
[Wails v2](https://wails.io/). It provides AI-powered text transformation through multiple LLM
providers (Ollama, LM Studio, Llama.cpp, OpenAI, OpenRouter, or any OpenAI-compatible API).
Module name: `go_text`.

## Prerequisites

- Go 1.25+, Node.js v20+, npm v10+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- macOS: Xcode Command Line Tools
- Linux: `sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev`
- Windows: C++ Build Tools + WebView2 Runtime

> No SQLite system library needed — GoText uses `modernc.org/sqlite` (pure-Go, no CGO).

## Common Commands

```bash
wails dev                    # dev mode with hot reload (backend + frontend at http://localhost:34115)
cd frontend && npm run dev   # frontend-only with bridge mock (no Go backend required)
wails build                  # production build → build/bin/
wails doctor                 # verify Wails installation
wails generate module        # regenerate frontend/wailsjs/ after any Go signature change

cd frontend && npm install   # install frontend deps
cd frontend && npm run test  # run Jest tests
cd frontend && npm run test:coverage
cd frontend && npm run verify:ui  # Playwright/Chromium UI tests

go test -race ./...          # all Go tests with race detector (always use -race)
go test ./internal/...       # backend unit/integration tests
go test -run TestName ./internal/actions/   # run a specific test
```

> **Wails reference:** When touching bindings, runtime events, menus, EnumBind, or platform
> options, load the `wails-dev` skill for complete API documentation.

## Architecture

### Backend (Go, `internal/`)

Layered architecture wired by a manual DI container in `internal/application/application.go`:

```
Wails bindings
    ↓
Handlers  (actions/handler.go, settings/handler.go, history/handler.go, stacks/handler.go)
    ↓                          ← exposed to frontend; envelope returns; no ctx param
Services  (actions/service.go, settings/service.go, llms/service.go, prompts/service.go, etc.)
    ↓
Repositories  (settings/repository_sqlite.go, history/repository_sqlite.go, etc. → SQLite)
```

**Key packages:**
- `internal/apperr/` — `AppError`, `ErrorCode` catalog, constructors, `WireError`, `ToWire`, and all `*Result` envelope types. Imports no other internal package.
- `internal/db/` — SQLite open (modernc.org/sqlite) + WAL pragmas, goose migrations, seeding. `internal/db/store/` is sqlc-generated — **never hand-edit it**.
- `internal/actions/` — `runStep`, `Planner`, `Composer`, `ChainOrchestrator`, run registry (`runId → CancelFunc`), `ActionHandler`.
- `internal/gate/` — `InferenceGate`: single-flight, process-wide; shared by chain runs and provider test-inference. At most one inference at a time.
- `internal/history/` — Per-run action history: model, SQLite repository, service, bound handler.
- `internal/stacks/` — Saved stack CRUD: model, SQLite repository, service, bound handler.
- `internal/settings/` — Provider/model/inference/language/app-behavior config; SQLite-backed repository.
- `internal/llms/` — `Provider` interface, `OpenAICompatibleProvider`, `ProviderProfile`, `ProviderFactory`, model discovery, provider verification.
- `internal/prompts/` — Two-tier system: family system prompts + atomic directive fragments; `ActionMeta` catalog; `BuildPlanAndPrompts`; `PreviewPrompt`. Categories in `internal/prompts/categories/`.
- `internal/verification/` — Provider diagnostic tests (`TestConnection`, `TestModels`, `TestInference`). Diagnostic only; never recorded to history.
- `internal/application/` — DI root `ApplicationContextHolder`; wires all services/handlers; holds app `ctx`.
- `internal/logging/` — Configured zerolog instance + console/lumberjack file multi-writer; implements Wails `logger.Logger`.
- `internal/tasklog/` — Per-step JSONL diagnostic records, gated by `EnableTaskLogging`. Separate from user-facing history.
- `internal/file/` — OS-specific path resolution: config folder, DB file path, logs folder.

### Handler Boundary Convention

All Wails-bound handler methods **must** follow the Result envelope pattern:
- Return a concrete `apperr.*Result` struct — never `(T, error)`.
- Take **no `context.Context` parameter** — Wails strips it from bound signatures.
- Use a named return + `defer/recover` to convert panics to `apperr.CodeInternal`.
- Call `apperr.ToWire(h.zlog, err)` for any service error before returning.
- Inner services keep `(T, error)` signatures — the envelope is handler-boundary only.
- After any bound-signature change, run `wails generate module` to regenerate TypeScript bindings.
- `ErrorCode` is exposed to TypeScript via `EnumBind` in `main.go` — it becomes a real TS enum in `models.ts`.
- On `OnShutdown`, cancel all in-flight chain runs via the run registry.

```go
func (h *XxxHandler) DoSomething(req SomeRequest) (res apperr.XxxResult) {
    defer func() {
        if r := recover(); r != nil {
            ae := apperr.Internal(fmt.Errorf("panic: %v", r))
            wire := apperr.ToWire(h.zlog, ae)
            res = apperr.XxxResult{Error: &wire}
        }
    }()
    data, err := h.service.DoSomething(h.ctx, req)
    if err != nil {
        wire := apperr.ToWire(h.zlog, err)
        return apperr.XxxResult{Error: &wire}
    }
    return apperr.XxxResult{Data: data}
}
```

### Frontend (React/TypeScript, `frontend/src/`)

```
ui/styles/         → tokens.css (CSS custom properties — all colors, spacing, radii, fonts)
                     base.css (minimal reset + global defaults)
ui/primitives/     → thin Radix Primitives wrappers (Select, Dialog, Switch, Tabs, Toast, etc.)
ui/components/     → presentational + app-specific (Button, EditorPane, StackBuilderBar, etc.)
ui/widgets/views/  → feature views (Editor, Settings, About, ManageStacks)
ui/widgets/base/   → AppBar, StatusBar, overlays
logic/adapter/     → thin wrappers around Wails auto-generated JS bindings (frontend/wailsjs/)
logic/store/       → Redux Toolkit slices: settings, editor, actions, stacks, run, history, ui,
                     notifications, about
logic/hooks/       → typed useAppDispatch / useAppSelector
dev/bridge-mock/   → dev-only bridge mock (frontend-only Vite dev server; no Go backend)
```

**Components never import from `wailsjs/` directly — all backend access goes through `logic/adapter/`.**

UI styling uses **Radix Primitives** (behavior + accessibility) and **custom tokenized CSS** (visual
appearance). All components read `var(--…)` tokens from `tokens.css`. The `.dark` class on
`document.documentElement` switches to dark mode — never on an inner div (portals must inherit it).

### Data Flow

User action → Redux thunk → adapter → `wailsjs/` bindings → Go `ActionHandler.ProcessPromptChain`
→ Planner → Composer → `ChainOrchestrator` (per group: runStep → LLM provider HTTP POST)
→ Result envelope back to Redux. Long-running chains emit `chain:progress` / `chain:done` events
that the adapter subscribes to and dispatches into the `run` slice.

### Settings Persistence

| Platform | JSON settings | SQLite database |
|---|---|---|
| macOS | `~/Library/Application Support/TextProcessingSuite/SettingsV2.json` | `.../gotext.db` |
| Linux | `~/.config/TextProcessingSuite/SettingsV2.json` | `.../gotext.db` |
| Windows | `%APPDATA%\TextProcessingSuite\SettingsV2.json` | `.../gotext.db` |

## Extending the App

### Adding a Prompt

1. Add constants to the relevant `internal/prompts/categories/<category>.go`
   (template placeholders: `{{user_text}}`, `{{user_format}}`, `{{input_language}}`, `{{output_language}}`)
2. Register the prompt as an `ActionMeta` entry in `internal/prompts/constants.go`
3. Restart `wails dev` — prompts are compiled into the binary

### Adding a New Prompt Group (Family)

1. Create `internal/prompts/categories/my_category.go` with system prompt + group name constants
2. Add a new `PromptGroup` entry in `internal/prompts/constants.go` with a unique `GroupID`

### Adding a New Service

1. Define an interface in your new package (e.g., `MyServiceAPI`)
2. Implement the struct
3. Add field + instantiation to `ApplicationContextHolder` in `internal/application/application.go`
   following the construction order: file utils → db → repositories → services → handlers
4. Expose via Wails `Bind` in `main.go` if the frontend needs it
5. Run `wails generate module` if you added or changed bound methods

### Working with SQLite / sqlc / goose

- Schema migrations: `internal/db/migrations/*.sql` (goose format). Never modify existing files — add a new numbered migration.
- Queries: `internal/db/queries/*.sql`. After changing a query, run `sqlc generate` to regenerate `internal/db/store/`.
- **Never hand-edit `internal/db/store/`** — it is always overwritten by sqlc.
- The SQLite driver is `modernc.org/sqlite` (pure Go, no CGO) — required for `wails build` cross-compilation.

## Testing

Backend tests use `go test -race ./...` — always include `-race`.
Integration tests in `internal/llms/` use `net/http/httptest` to mock LLM providers (no external LLM needed).

Frontend uses Jest (`npm run test`) and Playwright (`npm run verify:ui`).

**CI guards that must pass:**
```bash
go build ./...                                        # backend builds clean
wails generate module && git diff --exit-code frontend/wailsjs/   # bindings in sync
! grep -rq "@mui\|@emotion" frontend/src             # no MUI/emotion reintroduced
go test -race ./...                                   # race-free
```

## Debugging

- **Backend logs**: terminal output during `wails dev` (DEBUG level in dev, WARNING in prod)
- **Frontend logs + Redux state**: right-click app window → Inspect, use Redux DevTools extension
- **SQLite**: DB file at `[config folder]/gotext.db`; open with any SQLite browser for inspection
- **Wails bindings missing**: run `wails generate module`
- **Context missing error**: verify `app.SetContext(ctx)` in `OnStartup` in `main.go`
- **History not recording**: check history service wiring in `internal/application/application.go`
- - **For each found bug or reported issue**: create new test case or adopt existing to cover the issue and write tests for this found bug or reported issue

## Temporary Files

For intermediate files, plans, and other documents not part of the project — use the `.tmp` folder.

# During Application Live Testing (local providers only — not for unit/integration tests)

## LM Studio

```
GET  http://localhost:1234/v1/models
POST http://localhost:1234/v1/chat/completions
```

## Ollama

```
GET  http://localhost:11434/v1/models
POST http://localhost:11434/v1/chat/completions
GET  http://localhost:11434/api/tags
```

All these endpoints are available on the current PC. If you need test inference, choose the smallest model available.

# Finishing task

Always in the end of the task use `wails dev` to verify that app is working. Do the manual like testing of the real app instance to verify created functionality in the current session/branch/commit/last change.