# GoText — System Overview

> **Version:** v3 · **Stack:** Go + Wails v2 backend; React 19 + TypeScript + Redux Toolkit frontend.

## Summary

GoText ("Text Processing Suite") is a native desktop application for AI-powered text transformation.
A Wails v2 runtime hosts a Go backend and serves an embedded React SPA as the UI. All inference,
persistence, and orchestration happen in the Go process; the frontend is presentation and local
interaction state.

Users compose single actions or multi-step stacks across 60+ text-processing directives (rewriting,
summarising, translating, structuring, prompt-engineering), run them against a configured LLM provider,
and review the result with markdown and diff rendering.

## Provider support

| Type | Providers |
|---|---|
| Local | Ollama, LM Studio, Llama.cpp, and any OpenAI-compatible local API |
| Cloud | OpenAI, OpenRouter, and any OpenAI-compatible cloud API |

Credentials are never stored — only the **name** of an environment variable is persisted; the secret
is read with `os.Getenv` at request time and never written to the database or logs.

## Tech stack

| Component | Version / package |
|---|---|
| Go | 1.25.1 |
| Desktop framework | Wails v2.11.0 |
| React | 19.2.3 |
| TypeScript | 5.9.3 |
| Redux Toolkit | 2.11.2 |
| UI primitives | `radix-ui` (Radix Primitives — not Radix Themes) |
| Command palette | `cmdk` |
| Build tool | Vite 7.x |
| HTTP client | `github.com/go-resty/resty/v2` |
| SQLite driver | `modernc.org/sqlite` (pure Go, no CGO) |
| Migrations | `github.com/pressly/goose/v3` |
| Type-safe SQL | `sqlc` (generated into `internal/db/store/`) |
| Structured logging | `github.com/rs/zerolog` + `gopkg.in/natefinch/lumberjack.v2` |
| Styling | Custom tokenized CSS (CSS variables + CSS Modules) — no Tailwind, no MUI |

## Project structure

```
internal/        Go backend packages
frontend/        React TypeScript SPA
build/           Wails platform configs (icons, manifests, Info.plist)
docs/            Architecture docs, guides, agent rules, specs
main.go          Wails entry point
```

## Architecture diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + TypeScript + Redux Toolkit)                     │
│    components → thunks → logic/adapter → Wails JS bindings + EventsOn │
└───────────────────────────┬──────────────────────────────────────────┘
                             │  Wails bridge (method calls + runtime events)
                             │  uniform Result envelope · EnumBind · chain:* progress events
┌───────────────────────────┴──────────────────────────────────────────┐
│  Backend (Go)                                                          │
│   Handlers  (Wails-bound; envelope returns; no ctx param)              │
│       ↓                                                                │
│   Services  (business logic; idiomatic (T, error) signatures)          │
│       ↓                                                                │
│   Repositories  (SQLite via sqlc-generated queries)                    │
│                                                                        │
│   Cross-cutting: providers · actions/orchestrator · prompts ·          │
│                  apperr · logging · db · file · tasklog                │
└──────────────────────────────────────────────────────────────────────┘
```

## Architecture philosophy

- **Layered backend:** Handler → Service → Repository, wired by manual DI in `internal/application/`
- **Interface-based:** every collaborator is an interface — testable and replaceable without touching callers
- **Redux Toolkit:** unidirectional data flow; slices cover settings, editor, actions, stacks, run progress, history, ui, notifications, about
- **Adapter isolation:** frontend components reach the backend only through `frontend/src/logic/adapter/`, never importing `wailsjs` directly
- **Single code path:** a single action is the degenerate one-step chain — same orchestrator, same envelope, same history entry
- **Env-only credentials:** provider configs store only the env-var name; secrets are never persisted or logged
- **Local-first:** all computation runs in the Go process; optional cloud LLM providers receive only the user-provided text

## Key design decisions

| Decision | Choice |
|---|---|
| Persistence | SQLite via `modernc.org/sqlite` (pure Go — cross-compiles cleanly with `wails build`) |
| Schema management | Goose versioned migrations embedded in the binary; run on every `db.Open` |
| Query layer | sqlc-generated type-safe Go code (`internal/db/store/`); never hand-edited |
| Error contract | One typed `AppError`; one `WireError` on the wire; one concrete Result envelope per payload shape |
| UI components | Radix Primitives (behaviour + accessibility) + custom tokenized CSS (all visual appearance) |
| Concurrency | Single-writer SQLite + WAL; single in-flight inference per window (`InferenceGate`) |
| Cancellation | Id-based cooperative cancel: `CancelChain(runId)` → registered `CancelFunc` → stops after current group |

## Related documentation

- [Backend architecture](02-backend-architecture.md) — packages, DI wiring, handler pattern
- [Frontend architecture](03-frontend-architecture.md) — slices, adapter, Radix, CSS tokens
- [Data flow & communication](04-data-flow-and-communication.md) — events, cancellation, envelope
- [Build & configuration](05-build-and-configuration.md) — commands, deps, CI guards
- [Developer guide](../guides/DEVELOPER_GUIDE.md) — how to extend the app
