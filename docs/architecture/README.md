# GoText — Architecture Documentation

> **Version:** v3 · Stack: Go + Wails v2 · React 19 + TypeScript + Redux Toolkit

## Documentation index

| Document | What it covers |
|---|---|
| [01 — System Overview](01-system-overview.md) | High-level summary, provider support, tech stack, key decisions |
| [02 — Backend Architecture](02-backend-architecture.md) | Package map, layered architecture, handler boundary, DI wiring, startup/shutdown |
| [03 — Frontend Architecture](03-frontend-architecture.md) | Redux slices, CSS tokens, Radix Primitives, adapter isolation, component structure |
| [04 — Data Flow & Communication](04-data-flow-and-communication.md) | Result envelope, chain:* events, cancellation, retry, context propagation |
| [05 — Build & Configuration](05-build-and-configuration.md) | Dev commands, test commands, CI guards, dependencies, settings paths |

For practical how-to guides (adding providers, prompts, services, migrations), see
[docs/guides/DEVELOPER_GUIDE.md](../guides/DEVELOPER_GUIDE.md).

---

## Quick start

### Prerequisites

- Go 1.25+, Node.js 20+, npm 10+
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- macOS: Xcode Command Line Tools
- Linux: `sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev`
- Windows: C++ Build Tools + WebView2 Runtime

No SQLite system library needed — `modernc.org/sqlite` is a pure-Go driver.

### Run in development

```bash
wails dev                       # full stack (Go + React) with hot-reload at http://localhost:34115
cd frontend && npm run dev      # frontend-only with bridge mock (no Go backend required)
```

### Run tests

```bash
go test -race ./...                           # backend
cd frontend && npm run test                   # frontend (Jest)
cd frontend && npm run verify:ui              # UI tests (Playwright)
```

### Production build

```bash
wails build                     # → build/bin/GoText
```

### After Go signature changes

```bash
wails generate module           # regenerate frontend/wailsjs/ bindings
```

---

## Architecture at a glance

```
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + TypeScript + Redux Toolkit)                     │
│    components → thunks → logic/adapter → wailsjs/ bindings + EventsOn │
└───────────────────────────┬──────────────────────────────────────────┘
                             │  Wails bridge
                             │  Result envelope · EnumBind · chain:* events
┌───────────────────────────┴──────────────────────────────────────────┐
│  Backend (Go)                                                          │
│   Handlers (envelope returns; no ctx param)                            │
│       ↓                                                                │
│   Services (T, error) signatures                                       │
│       ↓                                                                │
│   Repositories (SQLite via sqlc)                                       │
│   Cross-cutting: apperr · db · logging · gate · file · tasklog        │
└──────────────────────────────────────────────────────────────────────┘
```

## Key invariants

1. Bound methods take no `ctx` parameter; always return a concrete Result envelope.
2. `wails generate module` runs after any Go signature change.
3. `ErrorCode` is shared to TypeScript via `EnumBind` — a real TS enum in `models.ts`.
4. Components never import from `wailsjs/` — all backend access goes through `logic/adapter/`.
5. Credentials are env-only: configs store env-var names, not secrets. DB stores no secrets.
6. SQLite driver is `modernc.org/sqlite` (pure Go) — required for `wails build` cross-compilation.
7. `internal/db/store/` is sqlc-generated — never hand-edit it; run `sqlc generate` instead.
8. Theme class (`.dark`) lives on `document.documentElement` so portaled Radix content inherits it.
