# 07 — Error Handling, Logging & Crash Resilience

> **Status:** Specification (normative). Part of the GoText ("Text Processing Suite") v3
> redesign — Go + Wails v2 backend, React 19 / TypeScript frontend.
> **Date:** 2026-06-23.
> **Scope:** This document specifies three cross-cutting concerns as a single coherent system:
> (A) error handling — a uniform typed-error model and Result envelope across every bound method;
> (B) logging — a configured, structured, rotating logger; and (C) crash resilience — panic
> recovery, startup-failure handling, and graceful shutdown. Related specs are referenced by
> filename: provider error taxonomy (`04-providers-inference.md`), chain orchestration and the
> run registry (`05-stacks-actions-engine.md`), and the settings key-value store and database
> lifecycle (`06-data-model-database.md`).

---

## 1. Goals & principles

1. **One typed error, one envelope.** Exactly one error shape (`apperr.AppError`) and one result
   shape (a concrete Result envelope) exist app-wide. There is no second error mechanism.
2. **Classify at the source.** An error is given its `ErrorCode` once, at the layer that knows the
   truth (provider HTTP status, transport, validation, chain planner/orchestrator).
3. **Present once, on the frontend.** The user sees a clear, formatted, typed message keyed by
   `code` + `details`. The user never sees internal code paths, file paths, op prefixes, or stack
   traces.
4. **Log the full chain.** The backend boundary logs the complete wrapped error (including the
   internal `cause`) for diagnosis; inner layers keep `fmt.Errorf("…: %w", err)` purely for log
   context.
5. **Minimal blast radius.** Business/service layers keep their idiomatic `(T, error)` signatures.
   Only the handler boundary and the frontend adapters change shape.
6. **Secrets are never logged.** Auth tokens are resolved from environment variables at request
   time and must never appear in any log or any serialized field. Only the **environment-variable
   name** may be logged or shown (see `04-providers-inference.md`).

---

## 2. Architecture (end-to-end)

```
[source layer]   build *AppError{Code,Title,Message,Details,Retryable,cause}
       │         (provider HTTP / transport / validation / chain planner / orchestrator)
       │         inner layers may wrap with %w for log context only
       ▼
[handler boundary]  toWire(err): errors.As → log FULL chain → WireError{code,title,message,details,retryable}
       │            wrap into the method's concrete envelope (Data and/or Error set)
       │            recover() guard → any panic becomes an `internal` envelope
       ▼            (Wails: the promise RESOLVES with the envelope; an unrecovered panic → reject → global FE fallback)
[frontend adapter]  returns Promise<XResult>
       ▼
[frontend consume]  unwrap(res) / read res.error → notifyError(code → presentation)
                    + render res.data (including partial chain output)
```

The same envelope carries success, expected failure, and **partial** results (chain runs that
produced output *and* failed). There is no special side-channel for partial results.

---

# Part A — Error Handling

## 3. New package `internal/apperr`

A new package `internal/apperr` owns the error type, the code constants, the constructors, the
boundary mapper, and the wire/envelope types. It depends on **no other internal package**, so any
layer can import it without creating an import cycle.

Repo-root-relative layout:

| File | Contents |
|---|---|
| `internal/apperr/apperr.go` | `AppError`, `ErrorCode` constants, constructors |
| `internal/apperr/wire.go` | `WireError`, `toWire` mapper helper |
| `internal/apperr/results.go` | concrete (non-generic) Result envelope types |

### 3.1 The `AppError` type

```go
package apperr

type ErrorCode string

type AppError struct {
    Code      ErrorCode         // classified at the source
    Title     string            // short, user-facing heading
    Message   string            // user-facing sentence; NEVER contains op-prefixes/paths
    Details   map[string]string // SAFE-to-show allowlist only — never secrets, never full URLs with keys
    Retryable bool              // transient? (drives retry policy below the boundary + a Retry affordance)
    cause     error             // internal wrapped chain — used for LOGS ONLY, never serialized
}

func (e *AppError) Error() string { return e.Message }
func (e *AppError) Unwrap() error { return e.cause } // keeps errors.As / %w chains intact
```

- `cause` is **unexported** and is never part of the JSON wire shape. It exists so the boundary can
  log the full chain and so `errors.As` keeps working through wrapped layers.
- `Details` is a strict **allowlist** of safe values (see the catalog in §3.4). It must never carry
  a secret, an authorization header, or a URL that embeds a key.

### 3.2 `ErrorCode` constants

```go
const (
    CodeValidation          ErrorCode = "validation"            // bad field value / missing field
    CodeInvalidPlan         ErrorCode = "invalid_plan"          // chain cap / exclusivity violation
    CodeBusy                ErrorCode = "busy"                  // an inference is already running (single-flight)
    CodeAuth                ErrorCode = "auth"                  // provider 401 / 403
    CodeMissingCredential   ErrorCode = "missing_credential"   // env var empty at token resolution
    CodeProviderUnreachable ErrorCode = "provider_unreachable" // dial / connection failure
    CodeTimeout             ErrorCode = "timeout"              // context deadline exceeded
    CodeRateLimited         ErrorCode = "rate_limited"         // provider 429
    CodeModelNotFound       ErrorCode = "model_not_found"      // provider 404
    CodeUpstream            ErrorCode = "upstream"             // provider 5xx / 502 / 503
    CodeEmptyCompletion     ErrorCode = "empty_completion"     // 2xx with empty body
    CodeContextWindow       ErrorCode = "context_window"       // input exceeds model context
    CodeStepFailed          ErrorCode = "step_failed"          // chain step wrapper
    CodeCancelled           ErrorCode = "cancelled"            // ctx cancelled mid-run
    CodeInternal            ErrorCode = "internal"             // catch-all / unclassified / panic
)
```

### 3.3 Constructors

Constructors are called **at the source layer** that detects the condition. Each one fills `Code`,
`Title`, `Message`, the allowlisted `Details`, `Retryable`, and (where applicable) wraps the
internal `cause`.

```go
func Validation(field, expected, got string) *AppError
func InvalidPlan(reason string, steps, inferences int) *AppError
func Busy() *AppError // an inference is already running (single-flight gate); non-retryable, no details
func Auth(provider, statusCode, reason string, cause error) *AppError
func MissingCredential(provider, envVar string) *AppError
func Unreachable(provider, baseURL string, cause error) *AppError
func Timeout(provider string, seconds int, cause error) *AppError
func RateLimited(provider string, retryAfter int, cause error) *AppError
func ModelNotFound(provider, model string, cause error) *AppError
func Upstream(provider, statusCode string, cause error) *AppError
func EmptyCompletion(provider, model string) *AppError
func ContextWindow(model string, limit int, cause error) *AppError
func StepFailed(index int, family string, inner *AppError) *AppError // wraps a step's *AppError with chain context
func Cancelled(stepIndex int) *AppError
func Internal(cause error) *AppError
```

`MissingCredential` takes **only the env-var name**, never the resolved value. `Unreachable` may
record `baseURL` only if it contains no embedded credentials; otherwise it is omitted.

### 3.4 `ErrorCode` catalog

`Classified at` is the layer that constructs the `AppError`. `Retryable` drives the retry policy
(`04-providers-inference.md`): retries happen **below** the boundary on transient codes only, so
the user sees a surfaced error only after retries are exhausted. The user-facing copy lives on the
frontend (§7) and is reproduced here only for completeness; `Details` lists the exact allowlisted
keys for that code.

| Code | Classified at | Retryable | `details` keys (allowlist) | Title / message template |
|---|---|---|---|---|
| `validation` | settings validation / action pre-flight | no | `field`, `expected`, `got` | "Invalid {field}" / "{field} {expected}; got {got}." |
| `invalid_plan` | chain Planner (cap / exclusivity) | no | `reason`, `steps`, `inferences` | "Stack not allowed" / "{reason} (max 5 steps, 3 inferences)." |
| `busy` | single-flight gate (run start / Test inference) | no | — | "Already running" / "An inference is already in progress — wait for it to finish before starting another." |
| `auth` | provider HTTP (401 / 403) | no | `provider`, `statusCode`, `reason?` | "Authentication failed" / "Request to {provider} was rejected: authentication failed{ — {reason}}." |
| `missing_credential` | token resolution (env empty) | no | `provider`, `envVar` | "API key not set" / "Set the {envVar} environment variable for {provider}." |
| `provider_unreachable` | transport (dial / conn) | yes | `provider`, `baseUrl?` | "Provider unreachable" / "Couldn't reach {provider} — check the Base URL and that it's running." |
| `timeout` | transport (deadline exceeded) | yes | `provider`, `timeout` | "Request timed out" / "{provider} did not respond within {timeout}s." |
| `rate_limited` | provider HTTP (429) | yes | `provider`, `retryAfter?` | "Rate limited" / "{provider} is rate-limiting requests{ — retrying in {retryAfter}s}." |
| `model_not_found` | provider HTTP (404) | no | `provider`, `model` | "Model not found" / "Model/deployment {model} wasn't found on {provider}." |
| `upstream` | provider HTTP (5xx) | yes | `provider`, `statusCode` | "Provider error" / "{provider} had a server error ({statusCode}). Please retry." |
| `empty_completion` | response parse (2xx empty) | no (not retried by default) | `provider`, `model` | "No response" / "{provider} returned an empty result." |
| `context_window` | provider error / pre-flight | no | `model`, `limit?` | "Input too long" / "The text exceeds the model's context window." |
| `step_failed` | chain orchestrator | (inner) | `stepIndex`, `family`, + inner | "Step {n} failed" / "Step {n} ({family}) failed: {inner.message}. Earlier steps completed." |
| `cancelled` | chain (ctx cancel) | no | `stepIndex` | "Cancelled" / "Run cancelled after step {n}. Partial result kept." |
| `internal` | boundary fallback / panic | yes | — | "Something went wrong" / "An unexpected error occurred. Please try again." |

> **Unification.** These codes *are* the provider error taxonomy of `04-providers-inference.md`.
> The provider layer constructs `apperr.AppError` directly — there is no separate sentinel-error
> set. The retry policy keys off `Retryable` together with the code.

### 3.5 Classification points (the "classify at the source" rule)

| Layer | Condition → constructor |
|---|---|
| `internal/llms` (provider / transport) | HTTP 401/403 → `Auth`; 429 → `RateLimited`; 404 → `ModelNotFound`; 5xx → `Upstream`; dial/conn error → `Unreachable`; `context.DeadlineExceeded` → `Timeout`; 2xx empty body → `EmptyCompletion`; context-window error → `ContextWindow` |
| token resolution | empty env var → `MissingCredential` |
| `internal/settings` validation | bad / missing value → `Validation` |
| `internal/actions` pre-flight | bad request field → `Validation` |
| chain Planner | cap / exclusivity violation → `InvalidPlan` |
| chain Orchestrator | failing step's `*AppError` → wrap with `StepFailed(index, family, inner)`; `ctx` cancel → `Cancelled(index)` |
| everything else | stays a plain `error`; the boundary maps it to `Internal` |

The **classify-at-source rule** is normative: a code is assigned exactly once, by the layer that
holds the ground truth. Layers above never re-classify; they only wrap with `%w` for log context or
(in the orchestrator's case) wrap a child `*AppError` inside `StepFailed`.

## 4. Result envelope types (concrete, non-generic)

> **Why concrete types.** Wails v2 cannot bind Go generics in method return positions
> ([wailsapp/wails#2323]). A generic `Result[T]` would not generate usable TypeScript bindings.
> Therefore the envelope is expressed as **one shared `WireError` plus one concrete result struct
> per payload shape**. The result structs are reused across every method that returns that shape.

[wailsapp/wails#2323]: https://github.com/wailsapp/wails/issues/2323

```go
type WireError struct {
    Code      ErrorCode         `json:"code"`
    Title     string            `json:"title"`
    Message   string            `json:"message"`
    Details   map[string]string `json:"details,omitempty"`
    Retryable bool              `json:"retryable"`
}

type VoidResult     struct {                                Error *WireError `json:"error,omitempty"` }
type StringResult   struct { Data string         `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type ModelsResult   struct { Data []ModelInfo    `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type CatalogResult  struct { Data []ActionMeta   `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type SettingsResult struct { Data *Settings      `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ChainResultEnv struct { Data *ChainResult   `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type StacksResult   struct { Data []SavedStack   `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type StackResult    struct { Data *SavedStack    `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type HistoryListResult struct { Data []HistoryEntry `json:"data"`;        Error *WireError `json:"error,omitempty"` }
type HistoryEntryResult struct { Data *HistoryEntry `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type PromptPreviewResult struct { Data *PromptPreview `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }

// Settings-domain envelopes (one per settings payload shape — see 08-api-contracts.md §2.2):
type ProviderResult    struct { Data *ProviderConfig      `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ProvidersResult   struct { Data []ProviderConfig     `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type InferenceResult   struct { Data *InferenceBaseConfig `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ModelConfigResult struct { Data *ModelConfig         `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type AppBehaviorResult struct { Data *AppBehaviorConfig   `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LoggingResult     struct { Data *LoggingConfig       `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LanguageResult    struct { Data *LanguageConfig      `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LanguagesResult   struct { Data []string             `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type MetadataResult    struct { Data *AppSettingsMetadata `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type VerifyResult      struct { Data *VerifyOutcome       `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
```

`WireError` is the *only* serialized form of an error — `cause` never crosses the wire. The set of
result structs grows by **payload shape**, not by method count; add a new struct only when a genuinely
new data shape appears. The complete, authoritative envelope catalog (Go + generated TypeScript) lives in
`08-api-contracts.md` §2.2; this list mirrors it and must not contradict it.

### 4.1 Envelope semantics

| Outcome | `Data` | `Error` |
|---|---|---|
| Success | set | `nil` |
| Expected failure | `nil` (or zero) | set |
| **Partial** (chain produced output *and* failed/cancelled) | **set (partial)** | **set** |

Partial results are first-class: a chain that completed steps `1..k-1` and failed at step `k`
returns the partial `ChainResult` **and** a `WireError`, both in the same `ChainResultEnv`. The
frontend renders the partial output *and* surfaces the error.

## 5. Handler boundary

### 5.1 The `toWire` mapper

The boundary runs `errors.As` to recover the `*AppError`, logs the **full wrapped chain** at
`Error` level (including the internal `cause`), and emits a clean `WireError`. An unclassified
error becomes `internal`.

```go
func (h *Handler) toWire(err error) WireError {
    var ae *apperr.AppError
    if errors.As(err, &ae) {
        h.log.Error(fmt.Sprintf("[%s] %v", h.op, err)) // FULL chain (incl. cause) → log only
        return WireError{
            Code: ae.Code, Title: ae.Title, Message: ae.Message,
            Details: ae.Details, Retryable: ae.Retryable,
        }
    }
    h.log.Error(fmt.Sprintf("[%s] unclassified: %v", h.op, err))
    return WireError{
        Code:      apperr.CodeInternal,
        Title:     "Something went wrong",
        Message:   "An unexpected error occurred. Please try again.",
        Retryable: true,
    }
}
```

The full chain is logged **only** at the boundary, where structured fields (op, runId, provider —
see Part B) are also stamped. Inner layers do not log the user-facing error; they only wrap it.

### 5.2 Bound methods drop the Go `error` return

Every bound method returns **only its envelope** — never `(Env, error)`. The promise always
resolves; the frontend reads `res.error`. A genuine panic in a bound call is caught either by the
boundary recover guard (§11.2, producing an `internal` envelope) or, failing that, by Wails' own
recover → JS rejection → the **global frontend fallback** (§8.2).

```go
func (h *ActionHandler) ProcessPromptChain(req ChainRequest) ChainResultEnv {
    data, err := h.svc.RunChain(h.ctx, req) // service: (*ChainResult, error); data may be partial
    env := ChainResultEnv{Data: data}
    if err != nil {
        we := h.toWire(err)
        env.Error = &we
    }
    return env // no error return; promise resolves
}
```

Notes:
- Bound methods take **no `ctx` parameter** (Wails strips it from the binding); the stored
  application `ctx` is used instead.
- Optional helper constructors (`okString`, `failVoid`, `partialChain`) may be provided to reduce
  boilerplate, but they are conveniences, not separate mechanisms.

### 5.3 `EnumBind` — share `ErrorCode` with TypeScript

`apperr.ErrorCode` is exposed to the frontend as a real TypeScript enum via Wails `EnumBind`, so the
frontend `notifyError` switch is exhaustive and type-checked:

```go
// main.go (Wails options)
EnumBind: []interface{}{
    []interface{}{"ErrorCode", apperr.ErrorCode("")},
    // … any other shared enums …
},
```

After `wails generate module`, `models.ts` contains `WireError`, every result struct from §4, and
the `ErrorCode` enum. The frontend imports these — there are **no hand-written duplicates**.

## 6. Frontend consumption: `unwrap`

```ts
// Throwing variant — used by RTK thunks; the thrown WireError lands in the `rejected` action.
export function unwrap<T>(res: { data?: T; error?: WireError }): T {
  if (res.error) {
    store.dispatch(notifyError(res.error));
    throw res.error;
  }
  return res.data as T;
}

// Non-throwing variant — used wherever partial data must survive (chain runs).
export function tryUnwrap<T>(res: { data?: T; error?: WireError }):
    { data?: T; error?: WireError } {
  if (res.error) store.dispatch(notifyError(res.error));
  return res;
}

// Chain (partial): read BOTH — never discard partial output.
const env = await ProcessPromptChain(req);
if (env.error) store.dispatch(notifyError(env.error));
if (env.data)  applyChainResult(env.data); // partial output still rendered
```

`unwrap` is the default for single-result calls; `tryUnwrap` is used for the chain path where both
`data` and `error` may be present.

## 7. Frontend presentation: `notifyError(code → presentation)`

A single mapping owns **all** user-facing copy. It switches on `code` and interpolates `details`,
which makes it i18n-ready (codes are stable; copy is replaceable). This is the only place
user-facing error text exists.

| Code | Severity | Surface | Rendered copy (interpolating `details`) |
|---|---|---|---|
| `auth` | error | toast | "Request to **{provider}** failed: authentication was rejected{ — *{reason}*}." |
| `missing_credential` | error | toast | "Set the **{envVar}** environment variable for **{provider}**." |
| `timeout` | error | toast | "**{provider}** did not respond within **{timeout}s**. The request was stopped." |
| `rate_limited` | warning | toast | "**{provider}** is rate-limiting requests{ — retrying in {retryAfter}s}." |
| `provider_unreachable` | error | toast | "Couldn't reach **{provider}** — check the Base URL and that it's running." |
| `model_not_found` | error | toast | "Model/deployment **{model}** wasn't found on **{provider}**." |
| `upstream` | error | toast | "**{provider}** had a server error ({statusCode}). Please retry." |
| `empty_completion` | warning | toast | "**{provider}** returned an empty result." |
| `validation` | error | **inline** | "**{field}** {expected}; got **{got}**." |
| `invalid_plan` | error | toast | "{reason} (max 5 steps · 3 inferences)." |
| `busy` | warning | toast | "An inference is already running — wait for it to finish before starting another." |
| `context_window` | error | toast | "The text exceeds the model's context window — shorten it or raise the context size." |
| `step_failed` | error | toast | "Step **{n}** ({family}) failed: {inner}. Earlier steps completed." |
| `cancelled` | info | toast | "Run cancelled after step **{n}**. Partial result kept." |
| `internal` | error | toast | "Something went wrong. Please try again." + **Retry** |

The provider name shown is whatever the user configured for that provider profile — the app is
**provider-agnostic**, so the rendered string uses the configured display name (e.g. an Ollama
profile renders "Ollama did not respond within 60s. The request was stopped."; a validation failure
renders "Temperature must be between 0 and 2; got 3.5.").

### 7.1 Notification model + display policy

- The `Notification` model (`notifications/types.ts`) gains optional `title?: string` and
  `details?: Record<string, string>`. The `enqueueNotification` creator accepts them.
- **Toast** is used for run/provider errors (`auth`, `timeout`, `rate_limited`, `upstream`,
  `model_not_found`, `provider_unreachable`, `empty_completion`, `busy`, chain `step_failed` /
  `cancelled`, `internal`).
- **Inline** is used for `validation` — rendered on the offending field. For this code,
  `notifyError` returns a presentation object the field component renders instead of dispatching a
  toast.
- **Retryable** codes may show a **Retry** affordance that re-dispatches the same action.
  Auto-backoff already happened below the boundary, so this Retry is for the final, surfaced error.

### 7.2 Remove the old colon-splitting parser

The legacy `formatBackendError` colon-splitting logic in `logic/utils/error_utils.ts` is **removed**.
The old approach parsed `"op: detail"` strings out of opaque error messages; it is obsolete now that
every error arrives typed via the envelope. `parseError` is repurposed as the **catastrophic
fallback only** — it maps an unexpected, non-`WireError` rejection to an `internal` notification.
All normal errors flow through the typed envelope.

## 8. Flows

**Single action error (auth).** A thunk calls `ProcessPromptChain` (one step) → handler calls
`RunChain` → provider returns `apperr.Auth(...)` → boundary logs the full chain and sets
`env.Error = WireError{auth}` → frontend reads `env.error` → `notifyError` → toast "Authentication
failed…". No data.

**Chain partial failure.** Steps `1..k-1` succeed; step `k` hits 429 (retries exhausted) →
orchestrator returns `(*ChainResult{FinalText:<partial>, FailedIndex:k}, StepFailed(k, …))` →
`ChainResultEnv{Data:<partial>, Error:WireError{step_failed}}` → frontend renders the partial output
**and** shows "Step k failed…". The `chain:progress` event had already marked group `k` as failed
(`05-stacks-actions-engine.md`).

**Validation.** Settings save → service returns `apperr.Validation("temperature", "must be 0–2",
"3.5")` → `SettingsResult{Error}` → frontend renders **inline** on the temperature field.

**Cancel.** The user cancels → `ctx` is cancelled → orchestrator returns
`(*ChainResult{partial}, Cancelled(k))` → the envelope carries both → frontend keeps the partial
output and shows an info toast "Cancelled after step k".

### 8.1 File-by-file change map

**Create (Go):** `internal/apperr/apperr.go`, `internal/apperr/wire.go`,
`internal/apperr/results.go`.

**Modify (Go):**
- `internal/llms/*` — construct `apperr.*` on HTTP status / transport / empty body (replacing
  `fmt.Errorf` at those points); keep `%w` elsewhere.
- `internal/settings/*` — validation builds `apperr.Validation`; handler methods return envelopes.
- `internal/actions/*` — pre-flight `Validation`; orchestrator
  `StepFailed` / `Cancelled` / `InvalidPlan`; handler methods return envelopes, dropping `error`
  returns.
- `main.go` — add `EnumBind` for `ErrorCode`.

**Generated:** `wails generate module` → `models.ts` gains `WireError`, the result structs, and the
`ErrorCode` enum.

**Modify (TS):**
- `logic/adapter/services.ts` + `interfaces.ts` — wrapper return types become `XResult`; add
  `unwrap` / `tryUnwrap` and the global rejection fallback.
- `logic/utils/error_utils.ts` — drop the colon-split; keep the catastrophic fallback only.
- `logic/store/notifications/*` — extend `Notification` (`title?`, `details?`); add the
  `notifyError` action creator (code → presentation).
- thunks / components (settings tabs, editor run) — consume via `unwrap` / `res.error`; validation
  rendered inline.

### 8.2 Global frontend fallback

A single global handler (a wrapper in the adapter, plus `window.onerror` /
`window.onunhandledrejection`, see §12) maps any unexpected rejection — a backend panic that became
a JS reject, a serialization failure, or any thrown non-`WireError` — to
`notifyError({ code: 'internal', … })`. This is the catch-all that sits behind the envelope
`unwrap`.

## 9. Invariants (error handling)

1. The UI never receives op-prefixes, file paths, or stack traces.
2. Exactly one error/result shape exists app-wide (the envelope), plus one global fallback.
3. Classification happens at the source; presentation happens on the frontend keyed by
   `code` + `details`.
4. The full wrapped chain is always logged at the boundary; `Details` is a safe allowlist that
   never contains secrets.
5. Partial chain results travel with their error in the same envelope.
6. Retries happen below the boundary; the user sees an error only after they are exhausted.

---

# Part B — Logging

## 10. Configured zerolog instance

### 10.1 Current state (to be replaced)

`internal/logging/logger.go` is a thin wrapper over zerolog's **global** logger
(`github.com/rs/zerolog/log`). It writes to **stdout only**: no file sink, no rotation, no
runtime-configurable level, and no structured fields (messages are plain strings; `op` and
durations are hand-concatenated into the message). In a built application these app logs are
effectively lost — only the per-task JSONL (`internal/tasklog`) reaches disk. `main.go` hardwires
the level (`LogLevel: DEBUG`, `LogLevelProduction: WARNING`) through Wails options, so it is not
settings-driven.

### 10.2 Target: a configured instance, not the global logger

The replacement is a **configured zerolog `Logger` instance** (not the package-global) built in
`main.go` from logging settings read at startup and rebuildable when settings change. The
architecture:

- **Sinks:** `zerolog.MultiLevelWriter(consoleWriter, fileWriter)`.
  - **Console** — pretty `zerolog.ConsoleWriter` in development; plain JSON otherwise.
  - **File** — JSON written through `gopkg.in/natefinch/lumberjack.v2` for rotation. lumberjack is
    configured from settings: `MaxSize` (MB), `MaxBackups`, `MaxAge` (days), `Compress`. The app log
    lives in the same logs folder as the task log but under a distinct filename (e.g. `app.log`).
    *(zerolog has no native rotation; lumberjack is the standard pairing.)*
- **Level** comes from settings and is applied to the instance; it is **runtime-settable** (changing
  the setting rebuilds/reconfigures the instance rather than requiring a restart).
- The instance still **implements the Wails `logger.Logger` interface**
  (`Print/Trace/Debug/Info/Warning/Error/Fatal`), so **Wails' own internal logs flow through the
  same console + rotating-file sinks**. The instance is passed as the `Logger` in Wails options,
  exactly as the current `AppStructLogger` is.

```go
// internal/logging — sketch of the builder (replacing the global-logger wrapper)
type Config struct {
    FileEnabled bool
    Level       string // "trace".."fatal"
    Directory   string // "" → OS default logs dir (shared with tasklog)
    MaxSizeMB   int
    MaxBackups  int
    MaxAgeDays  int
    Compress    bool
}

type Logger struct {
    zl    zerolog.Logger
    file  *lumberjack.Logger // retained so it can be flushed/closed on shutdown
}

func New(cfg Config, dev bool) (*Logger, error) {
    var writers []io.Writer
    if dev {
        writers = append(writers, zerolog.ConsoleWriter{Out: os.Stdout})
    } else {
        writers = append(writers, os.Stdout)
    }
    var lj *lumberjack.Logger
    if cfg.FileEnabled {
        lj = &lumberjack.Logger{
            Filename:   filepath.Join(resolveDir(cfg.Directory), "app.log"),
            MaxSize:    cfg.MaxSizeMB,  // megabytes
            MaxBackups: cfg.MaxBackups,
            MaxAge:     cfg.MaxAgeDays, // days
            Compress:   cfg.Compress,
        }
        writers = append(writers, lj)
    }
    lvl, _ := zerolog.ParseLevel(cfg.Level)
    zl := zerolog.New(zerolog.MultiLevelWriter(writers...)).
        Level(lvl).With().Timestamp().Logger()
    return &Logger{zl: zl, file: lj}, nil
}

// Wails logger.Logger interface — Wails internal logs flow through the same sinks.
func (l *Logger) Print(m string)   { l.zl.Log().Msg(m) }
func (l *Logger) Trace(m string)   { l.zl.Trace().Msg(m) }
func (l *Logger) Debug(m string)   { l.zl.Debug().Msg(m) }
func (l *Logger) Info(m string)    { l.zl.Info().Msg(m) }
func (l *Logger) Warning(m string) { l.zl.Warn().Msg(m) }
func (l *Logger) Error(m string)   { l.zl.Error().Msg(m) }
func (l *Logger) Fatal(m string)   { l.zl.Fatal().Msg(m) }

func (l *Logger) Close() error { if l.file != nil { return l.file.Close() }; return nil }
```

### 10.3 Structured fields & timings

Replace string-concatenated `op` with structured fields:

- A context-logger helper `l.WithOp("ActionService.RunChain")` returns a sub-logger that stamps a
  `component` / `op` field; `runId`, `provider`, and `model` are added as fields where relevant.
- Timings are **structured fields, not strings**: a small `Timer` helper —
  `t := l.StartTimer(op); defer t.Stop()` — logs `duration_ms` as a field on completion. The
  per-step and per-run timings the code already gathers become queryable.
- The granular levels (Trace/Debug/Info/Warn/Error/Fatal) already exist; the change is making the
  level **runtime-settable**. Trace/Debug carry verbose detail (request bodies, prompts — at debug
  only); Info marks lifecycle; Warn/Error mark problems.

```go
op := l.WithOp("ActionService.RunChain").
    Str("runId", runID).Str("provider", profile.DisplayName).Str("model", model)
t := op.StartTimer()
defer t.Stop() // emits {"op":"ActionService.RunChain","runId":…,"duration_ms":…}
```

### 10.4 Redaction (mandatory)

**Secrets are never logged.** Auth tokens are resolved from environment variables at request time
and must never appear in any log line — only the **env-var name** may be logged (consistent with
`04-providers-inference.md`). User text is logged only at debug/trace and may be truncated. Error
logs include the full chain (`cause`) but never secrets. A small redaction helper guards
header/token fields before they reach a sink.

### 10.5 Settings (KV store)

The logger is driven by these keys in the settings key-value store
(`06-data-model-database.md`):

| Key | Type | Default |
|---|---|---|
| `log.fileEnabled` | bool | `false` |
| `log.level` | string | `info` (development override: `debug`) |
| `log.directory` | string | `''` (OS default logs dir; shared with tasklog) |
| `log.maxSizeMB` | int | `10` |
| `log.maxBackups` | int | `5` |
| `log.maxAgeDays` | int | `30` |
| `log.compress` | bool | `false` |

The Settings UI exposes a Logging section: a file-logging switch, a level select, the rotation
fields, and an **Open logs folder** action. Changing any of these **reconfigures the logger live**
(rebuilds the sinks / applies the new level) rather than requiring a restart. These keys form the
`LoggingConfig` group, kept **separate** from the task-logging toggle. `LoggingConfig` is read/written
over the bridge via the bound `GetLoggingConfig`/`UpdateLoggingConfig` methods returning a `LoggingResult`
envelope (`08-api-contracts.md` §5.3); the `log.*` keys above are its persisted backing
(`06-data-model-database.md` §A.6).

### 10.6 Diagnostic task logging (separate, independent toggle)

The per-step diagnostic **task log** (`internal/tasklog`) is a **distinct, independent feature**
from the app logger and is **preserved**. It writes one JSONL line per completed task to a daily
file (`tasks-YYYY-MM-DD.jsonl`) in the logs folder, capturing the action, prompts, provider/model,
input/output text, and `durationMs`. Its I/O errors are intentionally swallowed (Warn-logged only)
so that diagnostic logging never disrupts the main processing flow. It is gated by its own setting
(`EnableTaskLogging`), entirely separate from the `log.*` keys above — enabling or disabling one has
no effect on the other.

### 10.7 Code changes (logging)

- Rewrite `internal/logging` into a settings-driven `Logger` builder (multi-writer + lumberjack)
  plus the `WithOp` / `Timer` helpers, keeping the Wails-interface methods.
- Add `gopkg.in/natefinch/lumberjack.v2` to `go.mod`.
- Build the logger in `main.go` from settings and pass the instance as the Wails `Logger`; remove
  the hardwired `LogLevel` / `LogLevelProduction` reliance in favor of the settings-driven level.

---

# Part C — Crash Resilience

**Target:** no backend panic and no UI render error can crash the window. Every failure degrades to
a typed error (Part A) plus a log entry (Part B).

## 11. Backend resilience

### 11.1 `safego(fn)` — recovering goroutines

Every spawned goroutine runs through a `safego` helper that recovers, logs the stack at `Error`,
and — when the panic happened inside a run — marks that run failed as `internal`.

```go
func safego(l *logging.Logger, where string, fn func()) {
    go func() {
        defer func() {
            if r := recover(); r != nil {
                l.Error(fmt.Sprintf("[panic %s] %v\n%s", where, r, debug.Stack()))
                // if inside a run: mark it failed with apperr.Internal(...)
            }
        }()
        fn()
    }()
}
```

Use `safego` for the chain runner (if async), event emitters, provider discovery, and any
background work.

### 11.2 Handler boundary recover

Each bound handler wraps its body in a recover guard so a panic becomes a clean `internal`
**envelope** instead of an opaque promise rejection. This is belt-and-suspenders on top of Wails'
own recover (§5.2).

```go
func (h *ActionHandler) ProcessPromptChain(req ChainRequest) (env ChainResultEnv) {
    defer func() {
        if r := recover(); r != nil {
            h.log.Error(fmt.Sprintf("[%s panic] %v\n%s", h.op, r, debug.Stack()))
            we := WireError{Code: apperr.CodeInternal, Title: "Something went wrong",
                Message: "An unexpected error occurred. Please try again.", Retryable: true}
            env = ChainResultEnv{Error: &we}
        }
    }()
    // … normal body …
}
```

### 11.3 Fix the silent startup error

The current `main.go` `OnStartup` **silently ignores** the settings-init error with a bare
`return // Ignoring error`, leaving the app half-initialized; there is no DB-open failure handling.
This is **fixed**:

- Application initialization (which now includes opening the database — see
  `06-data-model-database.md`) returns an error.
- `main` must **handle** it: log at **Fatal** with a clear message **and** show a minimal error
  dialog via `runtime.MessageDialog` (e.g. on a DB-open failure) rather than continuing
  half-initialized or dying silently.

```go
OnStartup: func(ctx context.Context) {
    app.SetContext(ctx)
    if err := app.Init(ctx); err != nil { // opens DB, inits default settings
        log.Fatal(fmt.Sprintf("startup failed: %v", err)) // logged at Fatal
        runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
            Type: runtime.ErrorDialog, Title: "Startup error",
            Message: "The application could not start (database unavailable). See logs.",
        })
        // process terminates rather than running half-initialized
    }
},
```

Non-critical subsystem failures (history, task log, discovery) are logged and **never break a run**
— extending the existing swallow-and-Warn policy already used by `internal/tasklog`.

## 12. Frontend resilience

- **React error boundary at the root.** A render error shows a recoverable fallback
  ("Something went wrong — Reload") instead of a white screen, and reports to the backend (a
  `LogError` bound method). The boundary wraps the application root.
- **Global hooks.** `window.onerror` and `window.onunhandledrejection` map any uncaught error or
  unhandled rejection to `notifyError({ code: 'internal' })` (Part A, §8.2) and log to the backend.
  These sit behind the envelope `unwrap` as the final catch-all.
- **Defensive rendering.** Components never assume `data` is present; they guard against null /
  partial data from envelopes (the partial-chain case always carries both `data` and `error`).

```tsx
// root error boundary (sketch)
class RootErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    LogError(`${err.message}\n${info.componentStack}`); // report to backend
  }
  render() {
    return this.state.failed ? <Fallback onReload={() => location.reload()} /> : this.props.children;
  }
}

// global hooks (installed once at startup)
window.addEventListener('error', () => store.dispatch(notifyError({ code: 'internal' } as WireError)));
window.addEventListener('unhandledrejection', () =>
  store.dispatch(notifyError({ code: 'internal' } as WireError)));
```

## 13. Graceful shutdown (`OnShutdown`)

The current `main.go` has **no** `OnShutdown` (no DB close, no run cancellation, no log flush). A
`OnShutdown` hook is added and wired in `main.go` to:

1. **Cancel all in-flight runs** via the `runId → CancelFunc` registry
   (`05-stacks-actions-engine.md`).
2. **Flush and close the log file** (the retained lumberjack writer, §10.2 `Logger.Close`).
3. **Close the database** (`06-data-model-database.md`).

```go
OnShutdown: func(ctx context.Context) {
    app.CancelAllRuns()   // run registry → CancelFunc
    app.DB.Close()        // close SQLite
    appLogger.Close()     // flush + close rotating file
},
```

## 14. Invariants (crash resilience)

1. No backend panic and no UI render error can crash the window; both degrade to an `internal`
   typed error plus a log entry.
2. Every spawned goroutine runs under `safego` (recover + log + mark run failed where applicable).
3. Startup failure is never silent: it logs at Fatal and shows an error dialog.
4. Shutdown cancels in-flight runs, flushes/closes logs, and closes the database.

---

## 15. Testing

- **Go (error handling):** table tests per classification point (status → code / details /
  retryable); `toWire` mapping (`AppError` → `WireError`; unclassified → `internal`); orchestrator
  partial-failure returns both data and error.
- **Go (integration, `httptest`):** 401 / 404 / 429 / 5xx / timeout / empty body → correct codes;
  chain partial failure.
- **Go (logging):** level filtering; redaction (secrets never reach a sink, env-var name does);
  `duration_ms` emitted; lumberjack rotation wiring.
- **Go (resilience):** panic-recovery tests for `safego` and the handler boundary;
  startup-failure → Fatal + dialog path; `OnShutdown` cancels runs and closes resources.
- **TypeScript:** `unwrap` / `tryUnwrap` (success / error / partial); `notifyError` copy per code;
  inline-vs-toast routing; error boundary fallback; global hooks → `internal`.
