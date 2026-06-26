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

**Agent routing:**

| Files being changed | Use agent |
|---|---|
| `internal/**/*.go`, `main.go` (non-test) | `go-engineer` |
| `internal/**/*_test.go`, any `*_test.go` | `go-tester` |
| `frontend/src/**/*.ts`, `frontend/src/**/*.tsx` (non-test) | `ts-engineer` |
| `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx` | `ts-tester` |
| New feature design, system-level changes | `architect` |
| Wails runtime, bindings, events, menus | load `wails-dev` skill |

## Project Overview

**Text Processing Suite** is a native desktop application built with Go + React via [Wails v2](https://wails.io/). It provides AI-powered text transformation through multiple LLM providers (Ollama, LM Studio, OpenAI, OpenRouter, or any OpenAI-compatible API). Module name: `go_text`.

## Prerequisites

- Go 1.25+, Node.js v20+, npm v10+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- macOS: Xcode Command Line Tools
- Linux: `sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev`
- Windows: C++ Build Tools + WebView2 Runtime

## Common Commands

```bash
wails dev                    # Dev mode with hot reload (backend + frontend)
wails build                  # Production build → build/bin/
wails doctor                 # Verify Wails installation

cd frontend && npm install   # Install frontend deps
cd frontend && npm run test  # Run Jest tests
cd frontend && npm run test:coverage

go test ./...                # Run all Go tests
go test ./internal/...       # Run backend unit/integration tests
go test -run TestName ./internal/actions/   # Run a specific test
```

> **Wails reference:** When touching bindings, runtime events, menus, or platform options, load the `wails-dev` skill for complete API documentation.

## Architecture

### Backend (Go, `internal/`)

Layered architecture wired by a manual DI container in `internal/application/application.go`:

```
Wails bindings
    ↓
Handlers  (actions/handler.go, settings/handler.go)   ← exposed to frontend
    ↓
Services  (actions/service.go, settings/service.go, llms/service.go, prompts/service.go)
    ↓
Repository  (settings/repository.go → JSON file on disk)
```

**Key packages:**
- `internal/actions/` — `ActionHandler` + `ActionService`: orchestrates LLM calls (prompt → LLM → sanitized response)
- `internal/settings/` — provider config CRUD, validation, JSON persistence
- `internal/llms/` — HTTP calls to LLM providers via Resty; timeout 2 min, 3 retries
- `internal/prompts/` — 60+ prompt definitions compiled into the binary; categories live in `internal/prompts/categories/`
- `internal/application/` — `ApplicationContextHolder` (DI root, wired in `main.go`)
- `internal/logging/` — zerolog wrapper bridged to Wails logger
- `internal/tasklog/` — `TaskLogService`: appends JSONL task-execution records to daily log files; controlled by `AppBehaviorConfig`
- `internal/file/` — `FileUtilsService`: OS-specific path resolution for settings and logs directories
- `internal/apperr/` — `AppError`, `ErrorCode`, `WireError`, `ToWire`, and all `*Result` envelope types

### Handler Boundary Convention

All Wails-bound handler methods **must** follow the result-envelope pattern:
- Return a concrete `apperr.*Result` struct — never `(T, error)`.
- Use a named return + `defer/recover` to convert panics to `apperr.CodeInternal`.
- Call `apperr.ToWire(h.zlog, err)` for any service error before returning.
- Inner services keep `(T, error)` signatures — the envelope is handler-boundary only.
- After any bound-signature change, run `wails generate module` to regenerate TypeScript bindings.

```go
func (h *XxxHandler) DoSomething() (res apperr.XxxResult) {
    defer func() {
        if r := recover(); r != nil {
            ae := apperr.Internal(fmt.Errorf("panic: %v", r))
            wire := apperr.ToWire(h.zlog, ae)
            res = apperr.XxxResult{Error: &wire}
        }
    }()
    data, err := h.service.DoSomething()
    if err != nil {
        wire := apperr.ToWire(h.zlog, err)
        return apperr.XxxResult{Error: &wire}
    }
    return apperr.XxxResult{Data: data}
}
```

### Frontend (React/TypeScript, `frontend/src/`)

```
ui/widgets/views/   → feature views (Settings, Editor, MainContent)
ui/widgets/base/    → AppBar, StatusBar, overlays
logic/adapter/      → thin wrappers around Wails auto-generated JS bindings (frontend/wailsjs/)
logic/store/        → Redux Toolkit slices: settings, actions, editor, ui, notifications
```

Wails auto-generates JS bindings from Go methods into `frontend/wailsjs/` — never edit those files manually.

### Data Flow

User action → Redux thunk → adapter → `wailsjs/` bindings → Go `ActionHandler.ProcessPrompt` → `ActionService` (fetches settings + prompt, calls `LLMService`) → Resty HTTP POST to provider → sanitized response back to Redux.

### Settings Persistence

JSON at platform-specific paths:
- macOS: `~/Library/Application Support/TextProcessingSuite/SettingsV2.json`
- Linux: `~/.config/TextProcessingSuite/SettingsV2.json`
- Windows: `%APPDATA%\TextProcessingSuite\SettingsV2.json`

## Extending the App

### Adding a Prompt

1. Add constants to the relevant `internal/prompts/categories/<category>.go` (template placeholders: `{{user_text}}`, `{{user_format}}`, `{{input_language}}`, `{{output_language}}`)
2. Register the prompt in `internal/prompts/constants.go` under the appropriate `PromptGroup`
3. Restart `wails dev` — prompts are compiled into the binary

### Adding a New Prompt Group

1. Create `internal/prompts/categories/my_category.go` with system prompt + group name constants
2. Add a new `PromptGroup` entry in `internal/prompts/constants.go` with a unique `GroupID`

### Adding a New Service

1. Define an interface (e.g., `HistoryServiceAPI`) in your new package
2. Implement the struct
3. Add field + instantiation to `ApplicationContextHolder` in `internal/application/application.go`
4. Expose via Wails `Bind` in `main.go` if needed by the frontend

## Testing

Backend integration tests use `net/http/httptest` to mock LLM providers — see `internal/llms/service_integration_test.go`. No external LLM needed for tests.

Frontend uses Jest. Redux async thunks are testable without a real backend.

## Debugging

- **Backend logs**: terminal output during `wails dev` (DEBUG level in dev, WARNING in prod)
- **Frontend logs + Redux state**: right-click app window → Inspect, use Redux DevTools extension
- **Wails bindings missing**: run `wails generate module`
- **Context missing error**: verify `app.SetContext(ctx)` in `OnStartup` in `main.go`

## Temporary Files

For the intermediate files, temporary files, plans and other documents and files that are needed only for short period of time and not part of the project - use ".tmp" folder to store them.

# During Application Live Testing you can use local Providers (Not Unit/Integration, only live app testing)

## [LM STUDIO SERVER] Supported endpoints:

### LM Studio API

GET  http://localhost:1234/api/v1/models
POST http://localhost:1234/api/v1/chat
POST http://localhost:1234/api/v1/models/load
POST http://localhost:1234/api/v1/models/download
GET http://localhost:1234/api/v1/models/download/status:job_id


### OpenAI-compatible

GET  http://localhost:1234/v1/models
POST http://localhost:1234/v1/responses
POST http://localhost:1234/v1/chat/completions
POST http://localhost:1234/v1/completions
POST http://localhost:1234/v1/embeddings

## Ollama

Base URL: http://localhost:11434/api

### Ollama Native

http://localhost:11434/api/generate
http://localhost:11434/api/chat
http://localhost:11434/api/embed
http://localhost:11434/api/tags
http://localhost:11434/api/ps
http://localhost:11434/api/show
http://localhost:11434/api/version

### OpenAI-compatible

GET  http://localhost:11434/v1/models
POST http://localhost:11434/v1/responses
POST http://localhost:11434/v1/chat/completions
POST http://localhost:11434/v1/completions
POST http://localhost:11434/v1/embeddings

## Notes

All these endpoints and models are available on the current PC.
If you need test inference - chose the smallest model available.