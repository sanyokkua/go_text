# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Backend integration tests use `net/http/httptest` to mock LLM providers — see `internal/llms/service_integration_test.go` and `internal/actions/handler_integration_test.go`. No external LLM needed for tests.

Frontend uses Jest. Redux async thunks are testable without a real backend.

## Debugging

- **Backend logs**: terminal output during `wails dev` (DEBUG level in dev, WARNING in prod)
- **Frontend logs + Redux state**: right-click app window → Inspect, use Redux DevTools extension
- **Wails bindings missing**: run `wails generate module`
- **Context missing error**: verify `app.SetContext(ctx)` in `OnStartup` in `main.go`
