# GoText — Backend Architecture

> **Version:** v3 · Module: `go_text` · Entry point: `main.go`

The Go backend follows a strict **Handler → Service → Repository** layered architecture wired by a
manual dependency-injection container in `internal/application/application.go`. Each layer depends
only on the interface of the layer below it, keeping the system testable and replaceable.

---

## 1. Layers and responsibilities

| Layer | Responsibility | Notes |
|---|---|---|
| **Handler** | Wails-bound entry point. Validates/translates the call, invokes the service, maps any `error` to the uniform Result envelope. | Bound methods take **no `context.Context` parameter**. They always return a concrete envelope (never `(T, error)`). |
| **Service** | Business logic and orchestration. Coordinates other services and repositories. | Keeps idiomatic `(T, error)` signatures. Classifies errors at the source by building `*apperr.AppError`. |
| **Repository** | Persistence. Type-safe SQLite access through sqlc-generated queries. | Behind an interface so the storage backend is swappable; maps domain structs ⇄ rows. |

A **single code path** is preserved end-to-end: a single action is the degenerate one-step chain, so
the same orchestrator, handler, and envelope serve both single actions and multi-step stacks.

---

## 2. Package map

All packages below are part of the current, stable architecture. The **Origin** column records each
package's provenance relative to the pre-v3 codebase for historical context only — it is not a
work-in-progress indicator.

| Package | Origin | Responsibility |
|---|---|---|
| `internal/bootstrap` | added in v3 | Pre-DB, pre-context logger construction (`NewLogger`) used by `main()` before `ApplicationContextHolder` exists. Resolves dev-vs-release purely from a compile-time `dev`/`!dev` build tag (Wails' own CLI sets `dev` for `wails dev`), since `runtime.Environment(ctx)` isn't available this early. |
| `internal/application` | evolved | DI container (`ApplicationContextHolder`); constructs and wires every service/handler; holds the app `ctx`; orchestrates startup/shutdown ordering |
| `internal/db` | added in v3 | SQLite open + WAL pragmas; embedded goose migration runner; seeding. Owns `internal/db/store/` |
| `internal/db/store` | added in v3 (generated) | sqlc-generated `Queries` struct, `Querier` interface, and row models. **Never hand-edited.** |
| `internal/apperr` | added in v3 | Typed `AppError` + `ErrorCode` catalog + constructors; `WireError` / Result envelope types; `toWire` boundary mapper. Imports no other internal package (cycle-free). |
| `internal/llms` | evolved | `Provider` interface, `OpenAICompatibleProvider`, per-kind `ProviderProfile`, `ProviderFactory`, discovery strategies, provider verification |
| `internal/actions` | evolved | `runStep`, `Planner`, `Composer`, `ChainOrchestrator`, run registry (`runId → CancelFunc`), and the bound `ActionHandler` |
| `internal/prompts` | evolved | Two-tier family system prompts + atomic directive fragments; `ActionMeta` catalog; `BuildPlanAndPrompts`; `PreviewPrompt` composition |
| `internal/history` | added in v3 | Per-run action history: model, SQLite repository, service, bound handler |
| `internal/settings` | evolved | Provider/model/inference/language/app-behavior config; SQLite-backed repository behind the preserved service interface |
| `internal/stacks` | added in v3 | Saved stack CRUD; SQLite repository; bound handler |
| `internal/gate` | added in v3 | Single-flight `InferenceGate` — process-wide, single-slot; shared by chain runs and provider test-inference |
| `internal/logging` | evolved | Configured zerolog instance + console/lumberjack file multi-writer; `WithOp`/`Timer` helpers; implements the Wails `logger.Logger` interface |
| `internal/file` | preserved | OS-specific path resolution: config folder, DB file path, logs folder |
| `internal/tasklog` | preserved | Per-step daily JSONL diagnostic records, gated by `EnableTaskLogging`. Independent of user-facing history. |
| `internal/verification` | added in v3 | Provider diagnostics (`TestConnection`, `TestModels`, `TestInference`) — never recorded to history |

---

## 3. Handler boundary convention

The handler is the only layer bound to Wails. Every bound method follows these mandatory rules:

1. **No `context.Context` parameter.** Wails strips a leading `ctx` from bound signatures, so handler
   methods take none. The app `ctx` from `OnStartup` is stored in `ApplicationContextHolder` and injected
   into handlers at construction time.

2. **Drop the Go `error` return; return an envelope.** Bound methods return a concrete Result envelope
   (`apperr.*Result`). The JS promise always resolves; the frontend reads `res.error`. A genuine panic is
   recovered by a belt-and-suspenders handler-level `recover` and surfaced as an `internal` envelope error.

3. **Regenerate bindings after Go signature changes.** Any change to a bound method signature or a bound
   struct requires running `wails generate module`, which regenerates `frontend/wailsjs/` and `models.ts`
   (including the `ErrorCode` enum via `EnumBind`). Generated bindings are never hand-edited.

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

---

## 4. Key package details

### 4.1 `internal/db` — SQLite open / migrate / seed

Opens `gotext.db` (path resolved by `internal/file`) using the pure-Go driver `modernc.org/sqlite`
(no CGO — `wails build` cross-compiles cleanly). On open it applies connection pragmas:

```sql
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA busy_timeout=5000;
PRAGMA synchronous=NORMAL;
```

And restricts to a single writer: `db.SetMaxOpenConns(1)`.

Schema migrations are **versioned and embedded** (`//go:embed migrations/*.sql`) and applied with
**goose** in library mode at startup. Type-safe data access is **sqlc-generated** into `internal/db/store`
from the migration files and `internal/db/queries/*.sql`; no runtime ORM is used.

Seeding inserts default providers, languages, and settings **only when the DB is empty**; the same
seeder powers "Reset to defaults" (wipe + reseed in a transaction).

### 4.2 `internal/apperr` — typed errors + Result envelope

Defines exactly one error type: `AppError{Code, Title, Message, Details, Retryable, cause}`, where
`Code` is an `ErrorCode` enum, `Details` is a **safe allowlist** (never secrets, tokens, or URLs
containing keys), and `cause` is the internal wrapped chain (logged, never serialized).

Constructors — called **at the source**, where the truth is known:

| Constructor | When |
|---|---|
| `apperr.Auth` | HTTP 401/403, API-key rejection |
| `apperr.Timeout` | Request timeout |
| `apperr.Validation` | Invalid user input |
| `apperr.RateLimited` | HTTP 429 |
| `apperr.Unreachable` | Network / DNS failure |
| `apperr.ModelNotFound` | Model name invalid or not deployed |
| `apperr.Upstream` | Provider 5xx |
| `apperr.MissingCredential` | Env-var name set but `os.Getenv` returns empty |
| `apperr.ContextWindow` | Prompt exceeds model context |
| `apperr.StepFailed` | A chain step failed |
| `apperr.Cancelled` | Run cancelled via `CancelChain` |
| `apperr.Internal` | Unexpected / programming error (panic recovery) |
| `apperr.InvalidPlan` | Planner rejected the chain plan |
| `apperr.EmptyCompletion` | Provider returned empty content |

The package also owns: `WireError`, concrete Result envelope structs (`VoidResult`, `StringResult`,
`ModelsResult`, `CatalogResult`, `SettingsResult`, `ChainResultEnv`, `StacksResult`, `StackResult`,
`HistoryListResult`, `HistoryEntryResult`, `PromptPreviewResult`), and the `toWire(logger, err)`
boundary mapper that logs the full wrapped chain once and emits a clean `WireError`.

`ErrorCode` is exposed to TypeScript via **`EnumBind`** in `main.go`, giving the frontend a real
TS enum in `models.ts` for typed error handling.

### 4.3 `internal/actions` — runStep · Planner · Composer · ChainOrchestrator

- **`runStep`** — one inference: build request → call provider → sanitize response → write tasklog entry.
  Shared by single actions and chains.
- **`Planner`** — applies canonical ordering, exclusivity dedupe, caps (≤ 5 steps, ≤ 3 inference
  groups), and same-family merge grouping to produce a `ChainPlan`. Violations → `InvalidPlan`.
- **`Composer`** — for each merge group, picks the family system prompt and concatenates the group's
  ordered directive fragments into one user prompt, injecting shared run context once.
- **`ChainOrchestrator`** — resolves provider/model/temperature **once** (fixed for the whole chain),
  iterates groups feeding output → input, emits progress events, honors cancellation, returns partial
  results on failure/cancel, and records one history entry per run.
- **Run registry** — a mutex-guarded `map[runId]context.CancelFunc` plus the stored app `ctx`. Each
  run derives a child `ctx`; `CancelChain(runId)` calls the registered cancel func.
- **`InferenceGate`** (`internal/gate`) — a process-wide, single-slot, non-blocking gate ensuring at
  most one inference runs at a time. Shared with provider test-inference. A concurrent attempt fails
  fast with the typed `busy` error — no queueing.

### 4.4 Provider layer (`internal/llms`)

- **`Provider` interface** — `Chat(ctx, ChatRequest)`, `ListModels(ctx)`, `Kind()`.
- **`ProviderProfile`** — per-kind static data: completion-URL template, discovery endpoint, auth
  scheme, body quirks. A single `OpenAICompatibleProvider` is parameterized by its profile.
- **`ProviderFactory`** — builds a `Provider` from `(config + profile + resolved secret)`.
- **Discovery** — per-kind model listing with tolerant parser; no persisted model cache (always live).
- **Credentials** — configs carry only the env-var name (`apiKeyEnvVar`); the secret is read with
  `os.Getenv` at request time and never persisted or logged.

---

## 5. Dependency-injection container

`ApplicationContextHolder` in `internal/application/application.go` is the DI root. Construction is
**two-phase**, because the database can only be opened once a config-folder path can be resolved
(via `os.UserConfigDir()`), and the real per-run `ctx` Wails hands back in `OnStartup` isn't available
before that — see `internal/bootstrap` in §2 for why the same reasoning applies to the logger.

**Phase 1 — `NewApplicationContextHolder(appLogger, restyClient)`** (called synchronously in
`main()`, before `wails.Run`): wires every service and handler with a **nil settings repository**
and the bootstrap console-only logger. All handlers are fully constructed and already assigned to
the `ApplicationContextHolder` struct fields Wails binds — but nothing has touched the database yet.

```
file utils
  → SettingsService(repo=nil)               → SettingsHandler
  → tasklog, prompts, provider/llm services
  → ActionService (prompts + provider + settings + tasklog + history)
                                            → ActionHandler
  → StackHandler(repo=nil), HistoryHandler(repo=nil)
```

**Phase 2 — `Init(ctx)`** (called from `OnStartup`, after `SetContext(ctx)`, once the real Wails
`ctx` exists): opens the database (`db.Open`, which runs goose migrations and seeding), then
backfills the already-constructed services with real SQLite-backed repositories via
`SetRepository`/`Configure` calls — the handlers and services built in phase 1 are never replaced,
only given real persistence. `Init` also restores the last-saved window size and reconfigures the
bootstrap logger (level, rotation, file output) from the now-loadable `log.*` settings.

`main.go` constructs the structured logger and resty client, calls the phase-1 constructor, and
passes the resulting `ApplicationContextHolder` to `wails.Run`. If `Init` (phase 2) fails — most
commonly because another instance already holds the DB's advisory lock — the app shows an error
dialog instead of running half-initialized; it does not fall back to phase-1-only operation.
Handlers are exposed via the Wails `Bind` list; `EnumBind` exposes `apperr.ErrorCode` to TypeScript.

---

## 6. Startup and shutdown sequence

**Before `wails.Run` (in `main()`):**
1. `bootstrap.NewLogger()` — console-only logger, dev/release resolved by compile-time build tag.
2. `application.NewApplicationContextHolder(appLogger, restyClient)` — DI phase 1 (§5): every
   service/handler constructed with a nil settings repository.

**Startup (`OnStartup`):**
1. `app.SetContext(ctx)` — store the real Wails runtime ctx (parent for all later runtime calls
   and cancellation).
2. `app.Init(ctx)` — DI phase 2 (§5): open DB → migrate (goose) → seed-if-empty, atomically; wire
   SQLite repositories into the already-built services/handlers; restore window size; reconfigure
   the logger from settings. If `Init` fails, show an error dialog instead of proceeding — a
   locked-database failure (another instance already running) gets a distinct "Already running"
   message rather than the generic startup-error one.

**Shutdown (`OnShutdown`):**
1. Cancel every in-flight run via the `runId → CancelFunc` registry.
2. Close the database: `db.Close()`.
3. Flush and close the rotating log file.

```
main():     bootstrap.NewLogger() → NewApplicationContextHolder (DI phase 1, nil repos)
OnStartup:  SetContext(ctx) → Init(ctx) (DI phase 2: open → migrate → seed → wire repos)
OnShutdown: cancel in-flight runs → close DB → flush log file
```

---

## 7. Key interfaces

| Interface | Package | Role |
|---|---|---|
| `ActionServiceAPI` | `internal/actions` | Process chain requests |
| `SettingsServiceAPI` | `internal/settings` | Provider/model/config CRUD |
| `HistoryServiceAPI` | `internal/history` | Read/write run history |
| `StackServiceAPI` | `internal/stacks` | Saved stack CRUD |
| `LLMServiceAPI` | `internal/llms` | Provider factory + discovery |
| `ProviderRepository` | `internal/settings` | Persistence for provider configs |
| `HistoryRepository` | `internal/history` | Persistence for run history |
| `StackRepository` | `internal/stacks` | Persistence for saved stacks |
| `PromptsServiceAPI` | `internal/prompts` | Action catalog + prompt composition |

---

## 8. Synchronization

- **Single-writer SQLite + WAL:** `SetMaxOpenConns(1)` serializes writes; WAL lets reads proceed
  without blocking the writer.
- **Transactions:** compound operations (create-stack-with-steps, reset-to-defaults, delete-provider +
  repoint-current, history insert + prune) run inside transactions (`q.WithTx(tx)`).
- **InferenceGate:** at most one chain or test-inference runs at a time per app instance.
- **Run registry and shared maps** are mutex-guarded; CI runs with `-race`.
