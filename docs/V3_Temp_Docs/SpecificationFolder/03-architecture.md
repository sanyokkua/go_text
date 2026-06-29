# GoText — Architecture Specification (03)

> **Document:** 03 — Architecture
> **Application:** GoText ("GoText") — a native desktop LLM text-processing application.
> **Stack:** Go + [Wails v2] backend; React 19 + TypeScript + Redux Toolkit frontend.
> **Module name:** `go_text`.
> **Status:** Specification (confirmed requirements only).

This document defines the end-to-end architecture: the layered Go backend and its dependency-injection
wiring, the Wails binding contract, the React/Redux frontend, and the integration bridge between them
(the uniform Result envelope, progress events, cancellation, retry, and synchronization).

Related specification documents are cross-referenced by filename:
- `04-providers-inference.md` — provider/model/inference logic and the error taxonomy.
- `05-stacks-actions-engine.md` — stacks, chain orchestration, action metadata.
- `07-error-handling-logging.md` — `apperr` types, the Result envelope, logging, crash resilience, lifecycle.
- `06-data-model-database.md` — SQLite persistence (schema, migrations, sqlc, seeding) and action history.
- `08-api-contracts.md` — every Wails-bound method, the envelope types, and the events contract.
- `10-ui-ux-specification.md` — About window and Prompt Inspector.

---

## 1. Architectural overview

GoText is a single-user desktop application. A Wails v2 runtime hosts a Go backend and serves an
embedded React single-page application as the UI; the two communicate over the Wails bridge (generated
JS bindings + runtime events). All inference, persistence, and orchestration happen in the Go process;
the frontend is presentation and local interaction state.

The backend follows a strict **layered architecture** — **Handler → Service → Repository** — wired by a
manual dependency-injection (DI) container in `internal/application/application.go`. Each layer depends
only on the interface of the layer below it, which keeps the system testable (every collaborator is an
interface) and lets implementations (for example, the persistence backend) be swapped without touching
callers.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + TypeScript + Redux Toolkit)                          │
│    components → thunks → logic/adapter → Wails JS bindings + EventsOn       │
└───────────────────────────────┬────────────────────────────────────────────┘
                                 │  Wails bridge (bindings + events)
                                 │  uniform Result envelope · EnumBind · progress events
┌───────────────────────────────┴────────────────────────────────────────────┐
│  Backend (Go)                                                                │
│                                                                              │
│   Handlers  (Wails-bound; map domain errors → WireError; no ctx param)       │
│       │                                                                       │
│   Services (business logic; keep (T, error) signatures)                       │
│       │                                                                       │
│   Repositories (SQLite via sqlc; provider/stack/history/settings)            │
│       │                                                                       │
│   Cross-cutting: providers · actions/orchestrator · prompts · apperr ·       │
│                  logging · db · file · tasklog                               │
└──────────────────────────────────────────────────────────────────────────┘
```

[Wails v2]: https://wails.io/

---

## 2. Backend architecture

### 2.1 Layers and responsibilities

| Layer | Responsibility | Notes |
|---|---|---|
| **Handler** | Wails-bound entry point. Validates/translates the call, invokes the service, maps any `error` to the uniform Result envelope (`07-error-handling-logging.md`). | Bound methods take **no `context.Context` parameter** (§2.3). They drop the Go `error` return and always return an envelope. |
| **Service** | Business logic and orchestration. Coordinates other services and repositories. | Keeps idiomatic `(T, error)` signatures. Classifies errors at the source by building `*apperr.AppError`. |
| **Repository** | Persistence. Type-safe SQLite access through sqlc-generated queries. | Behind an interface so the storage backend is swappable; maps domain structs ⇄ rows. |

A single code path is preserved end-to-end: a single action is the degenerate one-step chain, so the
same orchestrator, handler, and envelope serve both single actions and multi-step stacks.

### 2.2 Package map

Packages preserved from the current codebase, evolved packages, and new packages required by the v3
design:

| Package | Status | Responsibility |
|---|---|---|
| `internal/application` | evolved | DI container (`ApplicationContextHolder`); constructs and wires every service/handler; holds the app `ctx`; orchestrates startup/shutdown ordering. |
| `internal/db` | **new** | SQLite open + pragmas, embedded migration runner, seeding; owns the sqlc-generated query layer. |
| `internal/db/store` | **new (generated)** | sqlc-generated `Queries` struct, `Querier` interface, and row models. Committed, never hand-edited. |
| `internal/apperr` | **new** | Typed `AppError` + `ErrorCode` catalog + constructors; the `WireError` / Result envelope types and the `toWire` boundary mapper. Imports no other internal package (cycle-free). |
| `internal/llms` (evolving to a `providers` design) | evolved | `Provider` interface, `OpenAICompatibleProvider`, per-kind `ProviderProfile`, `ProviderFactory`, discovery strategies, and provider verification. |
| `internal/actions` | evolved | `runStep`, `Planner`, `Composer`, `ChainOrchestrator`, the run registry (`runId → CancelFunc`), and the bound `ActionHandler`. |
| `internal/prompts` | evolved | Two-tier family system prompts, the `ActionMeta` catalog, the shared `BuildPlanAndPrompts`, and `PreviewPrompt` composition. |
| `internal/history` | **new** | Per-run action history: models, repository, service, and bound handler. |
| `internal/settings` | evolved | Provider/model/inference/language/app-behavior config; SQLite-backed repository behind the preserved service interface. |
| `internal/logging` | evolved | Structured zerolog instance + console/file multi-writer with lumberjack rotation; `WithOp`/`Timer` helpers; implements the Wails `logger.Logger` interface. |
| `internal/file` | preserved | OS-specific path resolution (config folder, DB file path, logs folder). |
| `internal/tasklog` | **preserved (unchanged)** | Per-step daily JSONL diagnostic logging of full prompts, gated by `EnableTaskLogging`. Distinct from user-facing history. |

> The provider package may be introduced as `internal/providers` or implemented as the evolved
> `internal/llms`; either way the seam is the `Provider` interface plus per-kind profiles and a factory.
> Throughout this spec, repo-root-relative source paths are used (for example `internal/llms/service.go`,
> `frontend/src/logic/store/`).

#### 2.2.1 `internal/db` — SQLite open / migrate / seed

`internal/db` owns the database lifecycle. It opens `gotext.db` (in the app config folder resolved by
`internal/file`) using the pure-Go driver **`modernc.org/sqlite`** (no CGO, so `wails build`
cross-compiles cleanly). On open it applies connection pragmas — WAL journal mode, `foreign_keys=ON`,
`busy_timeout`, `synchronous=NORMAL` — and constrains the pool to a single writer
(`SetMaxOpenConns(1)`) for the single-user desktop case.

Schema migrations are **versioned and embedded** (`//go:embed migrations/*.sql`) and applied with
**`pressly/goose/v3`** in library mode at startup. Type-safe data access is **sqlc-generated** into
`internal/db/store` from the migration files (schema source) and `internal/db/queries/*.sql`; no runtime
ORM is used. Seeding inserts the default providers, languages, and settings **only when the DB is empty**;
the same seeder powers "Reset to defaults" (wipe + reseed in a transaction). See
`06-data-model-database.md` for the full schema, the KV settings key catalog, and query definitions.

#### 2.2.2 `internal/apperr` — typed errors + Result envelope mapper

`internal/apperr` defines exactly one error type, `AppError{Code, Title, Message, Details, Retryable,
cause}`, where `Code` is an `ErrorCode` enum, `Details` is a **safe allowlist** (never secrets, tokens,
or URLs containing keys), and `cause` is the internal wrapped chain (logged, never serialized).
Constructors (`Auth`, `Timeout`, `Validation`, `RateLimited`, `Unreachable`, `ModelNotFound`,
`Upstream`, `MissingCredential`, `ContextWindow`, `StepFailed`, `Cancelled`, `Internal`, `InvalidPlan`,
`EmptyCompletion`) are called **at the source**, where the truth is known.

The package also owns the wire layer: `WireError` and the concrete (non-generic) Result envelope structs
(`VoidResult`, `StringResult`, `ModelsResult`, `CatalogResult`, `SettingsResult`, `ChainResultEnv`,
`StacksResult`, `StackResult`, history/preview results), plus the `toWire(err)` boundary mapper that
logs the full chain once and emits a clean `WireError`. The taxonomy and mapping table live in
`07-error-handling-logging.md`.

#### 2.2.3 Provider package — interface, profiles, factory, discovery, verification

The provider layer is the single extension seam for inference. Its shape (per
`04-providers-inference.md`):

- **`Provider` interface** — `Chat(ctx, ChatRequest)`, `ListModels(ctx)`, `Kind()`. One v1
  implementation: `OpenAICompatibleProvider`, parameterized by a profile.
- **`ProviderProfile`** — per-kind, mostly-static data: completion-URL template, discovery endpoint +
  parser, auth scheme, and body quirks. Resolved from `kind`; a few fields may be config-overridden.
- **`ProviderFactory`** — builds a `Provider` from `(resolved config + profile + resolved secret)`;
  build may be cached by a hash of the effective config and invalidated on config change. Future native
  vendors register new builders without touching existing code.
- **Discovery strategies** — per-kind model listing + normalizers producing `[]ModelInfo` (with optional
  `ModelCaps`), with a tolerant parser (accepts `{data:[…]}` and bare arrays) and a static `customModels`
  fallback. No persisted model cache; discovery is live.
- **Verification** — the three discrete methods `TestConnection`, `TestModels`, `TestInference`
  (`08-api-contracts.md` §6), reusing the same provider layer, each returning a `VerifyResult` envelope
  with a duration. Verification runs are diagnostic only — never recorded to history or tasklog.

Credentials are **never stored**: a provider config carries only the **name** of an environment variable
(`apiKeyEnvVar`); the secret is read with `os.Getenv` at request time and never persisted or logged.

#### 2.2.4 `internal/actions` — runStep · Planner · Composer · ChainOrchestrator · run registry

`internal/actions` orchestrates execution:

- **`runStep(ctx, ChatRequest)`** — a single inference: build request → call the provider → sanitize the
  response (strip native `<think>…</think>`; ignore Azure-style `custom_content`) → write the per-step
  tasklog entry. Extracted from the legacy single-action path so single actions and chains share it.
- **`Planner`** — applies canonical ordering, exclusivity dedupe, caps (≤ 5 steps, ≤ 3 inference
  groups), and same-family merge grouping to produce a `ChainPlan`. Cap/exclusivity violations →
  `InvalidPlan`.
- **`Composer`** — for each merge group, picks the family system prompt and concatenates the group's
  ordered directive fragments into one user prompt, injecting shared run context (`{{user_text}}`,
  `{{user_format}}`, languages) once.
- **`ChainOrchestrator`** — resolves provider/model/temperature **once** (fixed for the whole chain),
  iterates groups feeding output → input, emits progress events, honors cancellation, returns partial
  results on failure/cancel, writes per-step tasklog, and records one history entry per run.
- **Run registry** — a mutex-guarded `map[runId]context.CancelFunc` plus the stored app `ctx`. Each run
  derives a child `ctx`; `CancelChain(runId)` calls the registered cancel func.
- **Single-flight `InferenceGate`** — a process-wide, single-slot, non-blocking gate ensuring **at most
  one inference runs at a time across the whole app**. `ProcessPromptChain` acquires it before planning and
  releases it on completion/cancel/panic; the **same gate instance is shared with provider Test inference**
  (`04-providers-inference.md §5.6`). A concurrent run or Test inference fails fast with the typed `busy`
  error — no queueing, no second LLM call.

The `Planner` + `Composer` are also exposed via a shared `BuildPlanAndPrompts(req)` reused by the
Prompt Inspector (`10-ui-ux-specification.md`) so the preview can never drift from a real
run.

#### 2.2.5 `internal/prompts` — two-tier prompts · ActionMeta catalog · PreviewPrompt

`internal/prompts` holds the **two-tier** prompt library: five family system prompts (rewrite, structure,
summarize, translate, prompt-engineering) and atomic **directive fragments** per action.
Each action carries `ActionMeta` (family, order rank, exclusivity group, mergeable, terminal, requires),
compiled with the prompts and exposed via `GetActionCatalog()` so the frontend mirrors the same
ordering/exclusivity/merge rules. The package provides the authoritative composition used by
`BuildPlanAndPrompts` and by the read-only `PreviewPrompt` flow (no LLM call).

#### 2.2.6 `internal/history`, `internal/settings`, `internal/logging`, `internal/file`, `internal/tasklog`

- **`internal/history`** — one entry per run (single = one entry; stack = one entry with the ordered
  applied-action snapshot). SQLite `history` table with count-based retention (default 100). Written by
  the orchestrator after each run; failures are logged and swallowed so history never breaks a run. See
  `06-data-model-database.md`.
- **`internal/settings`** — provider/model/inference/language/app-behavior config behind the preserved
  `SettingsServiceAPI`; the repository is the SQLite implementation (`SqliteSettingsRepository`) over the
  sqlc queries. Provider configs adopt the evolved fields (`kind`, `authScheme`, `apiKeyEnvVar`,
  `apiVersion`, `selectedModel`, `completionPath`, `modelsPath`); no secret is ever stored.
- **`internal/logging`** — a configured (non-global) zerolog instance writing to a console + rotating
  file multi-writer (`gopkg.in/natefinch/lumberjack.v2`), with runtime-settable level and structured
  fields (`component`/`op`, `runId`, `provider`, `duration_ms`). Implements the Wails `logger.Logger`
  interface so Wails' own logs flow through the same sinks. Secrets are never logged (only env-var
  names). See `07-error-handling-logging.md`.
- **`internal/file`** — OS-specific path resolution; adds the database file path
  (`GetAppDatabaseFilePath`) and the shared logs folder.
- **`internal/tasklog`** — preserved unchanged: per-step daily JSONL diagnostic records, gated by
  `EnableTaskLogging`, independent of history.

### 2.3 Wails binding rules

The handler layer is the only layer bound to Wails. Bound methods follow these mandatory rules:

1. **No `context.Context` parameter.** Wails strips a leading `ctx` from bound signatures, so handler
   methods take none. The application stores the runtime `ctx` from `OnStartup`
   (`app.SetContext(ctx)`); that stored `ctx` is the parent for all runtime calls and for inference/chain
   cancellation. No naked `context.Background()` appears in request paths.
2. **Drop the Go `error` return; return an envelope.** Bound methods return a concrete Result envelope
   (Data and/or Error). The JS promise always resolves; the frontend reads `res.error`. A genuine panic
   is recovered (by Wails and by a belt-and-suspenders handler-level `recover`) and surfaced as an
   `internal` envelope error.
3. **Regenerate bindings after Go signature changes.** Any change to a bound method signature or a bound
   struct requires running `wails generate module`, which regenerates `frontend/wailsjs/` and
   `models.ts` (including the result types and the `ErrorCode` enum via `EnumBind`). Generated bindings
   are never hand-edited.

### 2.4 Dependency-injection container

`ApplicationContextHolder` in `internal/application/application.go` is the DI root. It holds the app
`ctx`, the opened `*db.Database`, the resty client, and every bound handler; its constructor instantiates
each layer bottom-up and injects interfaces downward. Because opening the database can fail, the
constructor returns `(*ApplicationContextHolder, error)`.

Construction order (dependencies first):

```
file utils
  → db.Open (open + migrate + seed)        → *db.Database (SQL + sqlc Queries)
  → SqliteSettingsRepository               → SettingsService → SettingsHandler
  → SqliteStackRepository                  → StackService    → StackHandler
  → SqliteHistoryRepository                → HistoryService  → HistoryHandler
  → tasklog, prompts, provider/llm services
  → ActionService (prompts + provider + settings + tasklog + history)
                                           → ActionHandler
```

`main.go` constructs the structured logger and resty client, calls the constructor, and **handles the
error** (fatal log + minimal error dialog instead of running half-initialized). Handlers are exposed via
the Wails `Bind` list; `EnumBind` exposes `apperr.ErrorCode` to TypeScript.

### 2.5 Startup and shutdown sequence

The application lifecycle is anchored by Wails `OnStartup` / `OnShutdown` and the DI constructor.

**Startup (`OnStartup`):**
1. `app.SetContext(ctx)` — store the runtime `ctx` (the parent for all later runtime calls/cancellation).
2. `db.Open` (invoked during construction) — **open DB → migrate (goose) → seed-if-empty** atomically;
   any failure aborts construction and is reported as a fatal storage error (not silently ignored).
3. Per-run seeding/init formerly done at startup is removed; seeding now lives entirely in `db.Open`.

**Shutdown (`OnShutdown`):**
1. **Cancel runs** — cancel every in-flight run via the `runId → CancelFunc` registry.
2. **Flush logs** — flush/close the rotating log file.
3. **Close DB** — `app.Database.Close()`.

```text
OnStartup:  SetContext(ctx) → [db.Open: open → migrate → seed] → bindings ready
OnShutdown: cancel in-flight runs → flush log file → close DB
```

---

## 3. Frontend architecture

The frontend is a React 19 + TypeScript SPA with Redux Toolkit for state. It never imports the generated
Wails bindings directly in components; all backend access goes through `frontend/src/logic/adapter/`,
which wraps the bindings and unwraps the Result envelope.

### 3.1 Redux Toolkit slices

State is partitioned into focused slices, each registered in `frontend/src/logic/store/`:

| Slice | State (representative) | Purpose |
|---|---|---|
| `settings` | providers, current provider, model/inference/language/app-behavior config, metadata | Settings and provider management. |
| `editor` | input text, output text, view mode, derived diff | Input/output editor content. |
| `actions` (catalog) | `ActionMeta[]` grouped by category, load status | The action catalog driving the sidebar and FE-mirrored rules. |
| `stacks/builder` | ordered `actionIds`, derived plan (groups + inference count), validity, name/icon | The live stack builder. |
| `stacks/saved` | saved stacks list, CRUD status | "My Stacks". |
| `run` (progress) | `status: idle\|building\|running\|done\|error\|cancelled`, currentGroup, totalGroups, failedIndex, runId | Run lifecycle and progress. |
| `history` | entries (current page), selectedId, loading, hasMore, total | Action history rail. |
| `ui` | viewMode, layout (side/stacked), sidebar/historyRail collapse, theme | View and layout preferences. |
| `notifications` | queued notifications (`title?`, `details?`, severity) | Toast/inline error and status surface. |
| `about` | open section, selected item, inspector open/loading, preview-input toggle | About window + Prompt Inspector UI state. |

The store is configured in `frontend/src/logic/store/index.ts`, which composes these reducers and exports
the typed `useAppDispatch` / `useAppSelector` hooks.

### 3.2 Adapter and data flow

`frontend/src/logic/adapter/` is the single boundary to the backend. It wraps the generated Wails
bindings (from `frontend/wailsjs/`) and subscribes to runtime events; **components never import
`wailsjs` directly.** The adapter unwraps the Result envelope (`unwrap` / `tryUnwrap`), dispatches typed
error notifications, and a global rejection handler maps any unexpected rejection (panic, serialization
failure) to an `internal` error.

The canonical data flow is unidirectional:

```
component → dispatch(thunk) → adapter → Wails handler → service → provider/repository
                                                          │
              (chain:progress / chain:done events) ◄──────┘
component ◄── selector ◄── slice reducer ◄── thunk fulfilled/rejected ◄── adapter (unwrap)
```

Views live under `frontend/src/ui/widgets/views/` (Editor, Settings, About, and the main content
shell); base chrome (app bar, status bar, overlays) lives under `frontend/src/ui/widgets/base/`.

### 3.3 Component / data-flow diagram

```text
┌───────────────┐   dispatch    ┌───────────────┐   call    ┌───────────────────┐
│  Component     │ ────────────► │  Redux thunk   │ ───────► │ logic/adapter      │
│ (views/*)      │ ◄──────────── │ (slice/thunks) │ ◄─────── │ (wraps bindings)   │
└──────┬─────────┘   selector    └───────────────┘  envelope └─────────┬─────────┘
       │ render                                                         │ Wails bridge
       ▼                                                                ▼
┌───────────────┐                                            ┌───────────────────┐
│ Redux store    │ ◄── reducer ── thunk(fulfilled/rejected)  │ Wails Handler (Go) │
│ (slices)       │                                            └─────────┬─────────┘
└───────────────┘                                                       ▼
       ▲   chain:progress / chain:error / chain:done events    ┌───────────────────┐
       └───────────────────────────────────────────────────── │ Service → Provider │
                          (EventsOn → run slice)               │     / Repository    │
                                                               └───────────────────┘
```

---

## 4. Integration (the Wails bridge)

### 4.1 Uniform Result envelope

Every bound method returns a **uniform Result envelope** with `Data` and/or `Error`. Because Wails v2 has
no usable generics in bound returns, the envelopes are **concrete, non-generic** types — one per payload
shape, reused across methods (defined in `internal/apperr`, see `07-error-handling-logging.md`):

```go
type WireError struct {
    Code      ErrorCode         `json:"code"`
    Title     string            `json:"title"`
    Message   string            `json:"message"`
    Details   map[string]string `json:"details,omitempty"`
    Retryable bool              `json:"retryable"`
}
// e.g. VoidResult, StringResult, ModelsResult, CatalogResult,
//      SettingsResult, ChainResultEnv, StacksResult, StackResult,
//      HistoryListResult, HistoryEntryResult, PromptPreviewResult
```

**Envelope semantics:**
- **Success** → `Data` set, `Error` nil.
- **Expected failure** → `Error` set, `Data` nil.
- **Partial (chain)** → **both set** — a partial `ChainResult` travels in the same envelope as its
  `WireError`; there is no separate channel for partial results.

> **`ChainResult.error` is a display hint only.** The short `error` string carried inside `ChainResult`
> (e.g. `"cancelled"`) is a convenience label for the UI; the **typed `WireError` in the envelope's
> `Error` field is authoritative** for classification, retry, and presentation.

The `ErrorCode` enum is shared to TypeScript via **`EnumBind`**, so `models.ts` gains a real TS enum that
the frontend's `notifyError(code → presentation)` switches on; the frontend owns all user-facing copy
(i18n-ready). The handler boundary's `toWire` logs the full wrapped chain once and emits the clean
`WireError`; the user never sees op-prefixes, paths, or stack traces.

### 4.2 Progress events

Long-running chains report progress via **Wails runtime events** (the first use of events in the app),
not by polling. The orchestrator emits, and the adapter subscribes with `EventsOn` (unsubscribing on
unmount), dispatching into the `run` slice:

| Event | Payload | Meaning |
|---|---|---|
| `chain:progress` | `StepProgress{runId, groupIndex, totalGroups, family, status}` | Per-group running / done / failed. |
| `chain:error` | step/run error context | A step failed (paired with the final envelope's `WireError`). |
| `chain:done` | `ChainResult` (optional; also returned as the call's value) | Completion. |

`runId` guards against stale events for an earlier run.

### 4.3 Sequence — run a stack with progress, cancel, and partial failure

```text
Component        Thunk/Adapter        ActionHandler        ChainOrchestrator        Provider
   │ Run()            │                     │                      │                    │
   ├─ dispatch ──────►│                     │                      │                    │
   │                  ├─ ProcessPromptChain(req) ─────────────────►│                    │
   │                  │                     ├─ register runId→cancel│                    │
   │                  │                     ├─ Planner→plan, resolve provider/model once │
   │                  │                     │   (fixed for chain)   │                    │
   │ EventsOn ◄───────┼── chain:progress {g1,running} ◄────────────┤                    │
   │ (run slice)      │                     │    Composer→runStep ──┼───────────────────►│
   │                  │                     │                       │◄── content ────────┤
   │ ◄────────────────┼── chain:progress {g1,done} ◄───────────────┤                    │
   │ Cancel() ───────►│ CancelChain(runId) ─┼──────► cancel ctx ───►│ (stop after g)     │
   │                  │                     │                       ├─ build partial result
   │                  │◄── ChainResultEnv{Data:<partial>, Error:WireError{cancelled|step_failed}}
   │ ◄── render partial output once + toast (cancelled / "Step k failed")               │
   │   (orchestrator records ONE history entry: status partial/error)                   │
```

On cooperative cancel the run stops after the current group and returns the last good output
(`cancelled`). On a step failure at group *k* (for example a 429 after retries are exhausted), the
orchestrator returns the partial output plus `step_failed{index:k}`; earlier work is never discarded. In
both cases the envelope carries both `Data` and `Error`, and the frontend renders the partial output and
shows the typed message.

### 4.4 Cancellation

Cancellation is cooperative and id-based. The orchestrator registers each run's `CancelFunc` in the run
registry keyed by `runId`; `CancelChain(runId)` (a bound method) looks up and invokes it, cancelling the
run's child `ctx` derived from the stored app `ctx`. The orchestrator stops after the current group,
returns the partial result, and removes the registry entry. On `OnShutdown`, every registered run is
cancelled.

### 4.5 Retry behavior

Retries happen **below the handler boundary**, so the user sees an error only after retries are
exhausted (per `04-providers-inference.md` §6 and `07-error-handling-logging.md`):

- **Transient-only.** Only transient classes are retried: `provider_unreachable`, `timeout`,
  `rate_limited`, `upstream` (and the generic transient class). Non-transient codes — `auth`,
  `model_not_found`, `missing_credential`, `validation` — are **never** retried.
- **Exponential backoff + Retry-After.** Backoff is exponential with jitter; on a 429 the provider's
  `Retry-After` header is honored when present.
- **Scope.** `maxRetries` (default 3, bounded) and `timeoutSeconds` (default 60, bounded) come from
  inference settings. Retries apply per `runStep`; a chain does not restart from the beginning on a
  mid-chain retry. `ctx` cancellation is respected between attempts.
- **Surfaced retry.** Because auto-backoff already happened below the boundary, a retryable code may still
  show a manual **Retry** affordance for the final surfaced error.

### 4.6 Synchronization

Persistence uses a **single-writer SQLite** connection with **WAL** journaling: `SetMaxOpenConns(1)`
serializes writes (no "database is locked" contention on a single-user desktop), while WAL lets reads
(for example live discovery results or history paging) proceed without blocking the writer. Compound
operations — create-stack-with-steps, update-stack (delete + reinsert steps), delete-provider +
repoint-current, reset-to-defaults, seed, and history insert + prune — run inside transactions
(`q.WithTx(tx)`). At the application level, **one chain runs at a time per window**; the run registry and
any shared maps are mutex-guarded, and CI runs with `-race`. See `06-data-model-database.md` and
`07-error-handling-logging.md`.

---

## 5. Cross-cutting architecture concerns

- **Error handling** is uniform app-wide: classify once at the source (`apperr` constructors), map once
  at the boundary (`toWire`), present once on the frontend (`notifyError` keyed by `code` + `details`).
- **Crash resilience:** spawned goroutines run under a `safego`/`recover` helper; each bound handler
  recovers panics into an `internal` envelope; the startup error is handled (no silent ignore); the
  frontend adds a root React error boundary plus global `window.onerror` / `unhandledrejection` hooks.
- **Logging** is structured, file-backed, and rotated, with `duration_ms` timings as fields and
  mandatory secret redaction.
- **Secrets** are environment-only: configs carry env-var names, never secrets; nothing secret is written
  to the DB or the logs.

These concerns are specified in detail in `07-error-handling-logging.md`.

---

## 6. Architectural invariants (summary)

1. **Layering:** Handler → Service → Repository, wired by DI in `internal/application/application.go`;
   each layer depends only on the interface below it.
2. **Wails contract:** bound methods take no `ctx`, drop the `error` return, and always resolve a Result
   envelope; `wails generate module` runs after any Go signature change.
3. **One error/result shape** across the bridge (concrete non-generic envelopes; `ErrorCode` via
   `EnumBind`); partial chain results travel with their error in the same envelope.
4. **One code path:** a single action is the degenerate one-step chain.
5. **Provider/model/temperature fixed per chain**; non-streaming; intermediate text never rendered.
6. **Credentials env-only**, never persisted or logged; SQLite stores no secrets.
7. **Retries below the boundary**, transient-only, exponential backoff + Retry-After.
8. **Single-writer SQLite + WAL**; one chain per window; transactions for compound writes.
9. **Frontend isolation:** components reach the backend only through `frontend/src/logic/adapter/`, never
   importing `wailsjs` directly.
10. **Lifecycle:** startup opens → migrates → seeds the DB; shutdown cancels runs → flushes logs →
    closes the DB.
