# 08 — API Contracts (Wails Bridge)

> **Application:** GoText — *"GoText"* (Go + Wails v2).
> **Transport:** the frontend and backend communicate **over the Wails bridge**, *not* over REST/HTTP.
> Bound Go handler methods are exposed to TypeScript as **async functions** (`Promise<…>`). There is no
> URL, verb, status code, or wire protocol the caller chooses — the method *is* the contract.
> **Status:** Specification. Self-contained. Cross-references other spec documents by filename.

This document defines **every Wails-bound handler method** as an API contract: its Go signature, the
generated TypeScript signature, the request schema, the response schema (the envelope's `Data` shape),
the error schema, and validation rules. It also defines the **Result envelope** types and the runtime
**events** contract used for chain progress.

Related specs: provider/inference logic (`04-providers-inference.md`), stacks & chains
(`05-stacks-actions-engine.md`), error handling (`07-error-handling-logging.md`), persistence
(`06-data-model-database.md`), action history (`06-data-model-database.md`), About/Prompt Inspector
(`10-ui-ux-specification.md`).

---

## 1. Transport model — how the bridge works

### 1.1 Binding mechanics

- The backend registers handler structs in `main.go` via `Bind: []interface{}{…}`. Wails reflects over
  each bound struct and generates a TypeScript module under `frontend/wailsjs/go/<package>/<Handler>`
  with one async function per exported method. Wails also generates `frontend/wailsjs/go/models.ts`
  containing the TypeScript equivalents of every Go struct used in a bound signature.
- **Regenerate bindings with `wails generate module` after any Go signature or bound-struct change.**
  TypeScript signatures shown in this document are the *expected* generated shapes; the source of truth
  is the Go side.
- **No `context.Context` parameter** appears in any bound method. Per the Wails rule, the application
  `ctx` captured in `OnStartup` (`app.SetContext(ctx)`) is stored on the handler/holder and used for all
  runtime calls and as the parent context for inference cancellation. The frontend never passes a `ctx`.

### 1.2 The uniform Result envelope

Every bound method **returns a concrete Result envelope** (never a bare value, never a Go-generic
type — Wails v2 has no usable generics in bound returns). Bound methods **drop the Go `error` return**;
the JS promise always *resolves* with the envelope. The frontend reads `res.error`; it never relies on
a rejected promise for *expected* failures.

- **Success** → `Data` populated, `Error` is `null`/absent.
- **Expected failure** → `Error` populated (a `WireError`), `Data` is `null`/absent.
- **Partial (chain only)** → **both** `Data` (partial `ChainResult`) **and** `Error` are populated in
  the same envelope. There is no separate channel for partial results.

A genuine **panic** inside a bound call is recovered by Wails and surfaces as a JS promise **rejection**,
which the frontend maps through a **single global fallback** to a synthetic `internal` error. This is
the only path that ever rejects.

### 1.3 Authentication

**None.** GoText is a **local, single-user desktop application**. There is no login, session, token, or
per-call auth on the bridge. Provider **secrets are supplied via environment variables only** — a
provider config stores the **name** of an environment variable (`apiKeyEnvVar`), and the secret is read
from the process environment at request time and never persisted, never logged, and never serialized
into any envelope, `details` map, or prompt text. See `04-providers-inference.md` and
`07-error-handling-logging.md`.

---

## 2. Concrete envelope & result type definitions

All result types are **concrete (non-generic)** structs grouped in the backend (e.g.
`internal/apperr/wire.go` + `results.go`). One shared `WireError`, one result type per **payload shape**,
reused across methods.

### 2.1 `WireError`

```go
// internal/apperr
type ErrorCode string

type WireError struct {
    Code      ErrorCode         `json:"code"`              // machine code; FE owns user copy
    Title     string            `json:"title"`             // short heading
    Message   string            `json:"message"`           // safe, user-facing message (no paths/op-prefixes)
    Details   map[string]string `json:"details,omitempty"` // SAFE allowlist only — never secrets/keys/full URLs
    Retryable bool              `json:"retryable"`         // whether a Retry affordance is meaningful
}
```

```ts
// models.ts (generated)
export interface WireError {
    code: ErrorCode;
    title: string;
    message: string;
    details?: Record<string, string>;
    retryable: boolean;
}
```

> The internal `cause error` chain on the backend `AppError` is **never serialized** — it is logged at
> the handler boundary only. See `07-error-handling-logging.md`.

### 2.2 Result envelopes

```go
type VoidResult         struct {                                       Error *WireError `json:"error,omitempty"` }
type StringResult       struct { Data string                `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type ModelsResult       struct { Data []ModelInfo           `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type CatalogResult      struct { Data []ActionMeta          `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type SettingsResult     struct { Data *Settings             `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ChainResultEnv     struct { Data *ChainResult          `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type StacksResult       struct { Data []SavedStack          `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type StackResult        struct { Data *SavedStack           `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type HistoryListResult  struct { Data []HistoryEntry        `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type HistoryEntryResult struct { Data *HistoryEntry         `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type PromptPreviewResult struct { Data *PromptPreview       `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }

// Settings-domain envelopes (one per settings payload shape):
type ProviderResult     struct { Data *ProviderConfig       `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ProvidersResult    struct { Data []ProviderConfig      `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type InferenceResult    struct { Data *InferenceBaseConfig  `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type ModelConfigResult  struct { Data *ModelConfig          `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type AppBehaviorResult  struct { Data *AppBehaviorConfig    `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LanguageResult     struct { Data *LanguageConfig       `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LanguagesResult    struct { Data []string              `json:"data"`;           Error *WireError `json:"error,omitempty"` }
type MetadataResult     struct { Data *AppSettingsMetadata  `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type VerifyResult       struct { Data *VerifyOutcome        `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
type LoggingResult      struct { Data *LoggingConfig        `json:"data,omitempty"`; Error *WireError `json:"error,omitempty"` }
```

```ts
// models.ts (generated) — TS equivalents
export interface VoidResult          { error?: WireError; }
export interface StringResult        { data: string;               error?: WireError; }
export interface ModelsResult        { data: ModelInfo[];          error?: WireError; }
export interface CatalogResult       { data: ActionMeta[];         error?: WireError; }
export interface SettingsResult      { data?: Settings;            error?: WireError; }
export interface ChainResultEnv      { data?: ChainResult;         error?: WireError; }
export interface StacksResult        { data: SavedStack[];         error?: WireError; }
export interface StackResult         { data?: SavedStack;          error?: WireError; }
export interface HistoryListResult   { data: HistoryEntry[];       error?: WireError; }
export interface HistoryEntryResult  { data?: HistoryEntry;        error?: WireError; }
export interface PromptPreviewResult { data?: PromptPreview;       error?: WireError; }
export interface ProviderResult      { data?: ProviderConfig;      error?: WireError; }
export interface ProvidersResult     { data: ProviderConfig[];     error?: WireError; }
export interface InferenceResult     { data?: InferenceBaseConfig; error?: WireError; }
export interface ModelConfigResult   { data?: ModelConfig;         error?: WireError; }
export interface AppBehaviorResult   { data?: AppBehaviorConfig;   error?: WireError; }
export interface LanguageResult      { data?: LanguageConfig;      error?: WireError; }
export interface LanguagesResult     { data: string[];             error?: WireError; }
export interface MetadataResult      { data?: AppSettingsMetadata; error?: WireError; }
export interface VerifyResult        { data?: VerifyOutcome;       error?: WireError; }
export interface LoggingResult       { data?: LoggingConfig;       error?: WireError; }
```

> The `PromptPreviewResult` envelope wraps a `PromptPreview` payload (the `Kind/Inferences/Groups/Summary`
> structure from `10-ui-ux-specification.md`). The payload type is named `PromptPreview`
> here so the **envelope** can keep the `PromptPreviewResult` name required by the spec.

### 2.3 Frontend consumption helper

```ts
// unwrap throws on expected error (caught by RTK rejected); use tryUnwrap where partial data matters
export function unwrap<T>(res: { data?: T; error?: WireError }): T {
    if (res.error) { store.dispatch(notifyError(res.error)); throw res.error; }
    return res.data as T;
}
```

A **global** `unhandledrejection` handler maps any unexpected rejection (panic, serialization failure) to
`notifyError({ code: 'internal', … })`.

---

## 3. Shared payload type definitions

These structs appear inside the envelopes above and are generated into `models.ts`.

### 3.1 `ErrorCode` enum (shared via `EnumBind`)

Exposed to TypeScript as a real enum via `EnumBind` in `main.go` so the FE `notifyError` switch is
type-checked.

```go
const (
    CodeValidation          ErrorCode = "validation"
    CodeInvalidPlan         ErrorCode = "invalid_plan"
    CodeBusy                ErrorCode = "busy"
    CodeAuth                ErrorCode = "auth"
    CodeMissingCredential   ErrorCode = "missing_credential"
    CodeProviderUnreachable ErrorCode = "provider_unreachable"
    CodeTimeout             ErrorCode = "timeout"
    CodeRateLimited         ErrorCode = "rate_limited"
    CodeModelNotFound       ErrorCode = "model_not_found"
    CodeUpstream            ErrorCode = "upstream"
    CodeEmptyCompletion     ErrorCode = "empty_completion"
    CodeContextWindow       ErrorCode = "context_window"
    CodeStepFailed          ErrorCode = "step_failed"
    CodeCancelled           ErrorCode = "cancelled"
    CodeInternal            ErrorCode = "internal"
)
```

| Code | Classified at | Retryable | `details` keys |
|---|---|---|---|
| `validation` | settings / action pre-flight | no | `field`, `expected`, `got` |
| `invalid_plan` | chain Planner (cap/exclusivity) | no | `reason`, `steps`, `inferences` |
| `busy` | single-flight gate (run start / Test inference) | no | — |
| `auth` | provider HTTP 401/403 | no | `provider`, `statusCode`, `reason?` |
| `missing_credential` | token resolution (env empty) | no | `provider`, `envVar` |
| `provider_unreachable` | transport (dial/conn) | yes | `provider`, `baseUrl?` |
| `timeout` | transport (deadline) | yes | `provider`, `timeout` |
| `rate_limited` | provider HTTP 429 | yes | `provider`, `retryAfter?` |
| `model_not_found` | provider HTTP 404 | no | `provider`, `model` |
| `upstream` | provider HTTP 5xx | yes | `provider`, `statusCode` |
| `empty_completion` | response parse (2xx empty) | no (not retried by default) | `provider`, `model` |
| `context_window` | provider error / pre-flight | no | `model`, `limit?` |
| `step_failed` | chain orchestrator | (inner) | `stepIndex`, `family` (+ inner) |
| `cancelled` | chain (ctx cancel) | no | `stepIndex` |
| `internal` | boundary fallback | yes | — |

> The transport/provider codes **are** the error taxonomy of `04-providers-inference.md §6`; `validation`,
> `invalid_plan`, `busy`, `step_failed`, and `cancelled` are service/orchestration-level codes. `busy` is
> returned by the single-flight gate when an inference is already running (see §4.1 and
> `05-stacks-actions-engine.md`).
> Retries happen **below** the handler boundary; the user sees an error only after retries are exhausted.
> `empty_completion` is **not retried by default** (a 2xx-with-empty-body is surfaced immediately).

### 3.2 Chain & action models (`05-stacks-actions-engine.md`)

```go
type ChainStep struct {
    ActionID    string `json:"actionId"`
    TargetModel string `json:"targetModel,omitempty"` // prompteng family only
    Goal        string `json:"goal,omitempty"`        // prompteng family only
}

type ChainRequest struct {
    RunID            string      `json:"runId"`            // FE-generated uuid; correlates events + cancel
    InputText        string      `json:"inputText"`
    Steps            []ChainStep `json:"steps"`            // 1..5
    InputLanguageID  string      `json:"inputLanguageId"`
    OutputLanguageID string      `json:"outputLanguageId"`
    UseMarkdown      bool        `json:"useMarkdown"`
}

type ChainResult struct {
    FinalText   string `json:"finalText"`             // final (or partial) output; intermediates never returned
    Completed   int    `json:"completed"`             // number of groups completed
    FailedIndex *int   `json:"failedIndex,omitempty"` // group index that failed; nil on full success
    Error       string `json:"error,omitempty"`       // short reason string ("cancelled", typed message)
}

type ActionMeta struct {
    ID               string `json:"id"`
    Name             string `json:"name"`
    Category         string `json:"category"`
    Family           string `json:"family"`           // rewrite|structure|summarize|translate|prompteng
    Directive        string `json:"directive"`        // atomic instruction fragment (two-tier)
    OrderRank        int    `json:"orderRank"`        // canonical sort key
    ExclusivityGroup string `json:"exclusivityGroup"` // ≤1 action per group per stack; prompteng sub-groups: prompteng-text|prompteng-image|prompteng-video
    Mergeable        bool   `json:"mergeable"`
    Terminal         bool   `json:"terminal"`
    Requires         []string `json:"requires"`       // snake_case tokens: "input_language","output_language","target_model","goal"
}
```

### 3.3 Provider, model & settings models (`04-providers-inference.md`, `06-data-model-database.md`)

```go
type ModelInfo struct {
    ID    string     `json:"id"`
    Label string     `json:"label"`
    Caps  *ModelCaps `json:"caps,omitempty"` // nil when provider doesn't expose capabilities
}
type ModelCaps struct {
    MaxPromptTokens     *int  `json:"maxPromptTokens,omitempty"`
    SupportsTemperature *bool `json:"supportsTemperature,omitempty"`
    SupportsSystemPrompt *bool `json:"supportsSystemPrompt,omitempty"`
}

type ProviderConfig struct {
    ID             string            `json:"id"`             // system-generated UUID, stable
    Name           string            `json:"name"`           // user label, UNIQUE
    Kind           string            `json:"kind"`           // ollama|lmstudio|llamacpp|openai|azure
    BaseURL        string            `json:"baseUrl"`        // scheme+host(+path), normalized to end with /
    AuthScheme     string            `json:"authScheme"`     // none|bearer|apiKey
    APIKeyEnvVar   string            `json:"apiKeyEnvVar"`   // NAME of env var only — never the secret
    APIVersion     string            `json:"apiVersion"`     // azure optional; query param when set
    SelectedModel  string            `json:"selectedModel"`  // model id; for azure = deployment id
    CompletionPath string            `json:"completionPath"` // override; else derived from kind profile
    ModelsPath     string            `json:"modelsPath"`     // override; else derived from kind profile
    UseCustomModels bool             `json:"useCustomModels"`
    Headers        map[string]string `json:"headers"`
    CustomModels   []string          `json:"customModels"`
    CreatedAt      int64             `json:"createdAt"`
    UpdatedAt      int64             `json:"updatedAt"`
}

type InferenceBaseConfig struct {
    Timeout              int  `json:"timeout"`              // seconds; default 60, bounds 1–600
    MaxRetries           int  `json:"maxRetries"`           // default 3, bounds 0–10
    UseMarkdownForOutput bool `json:"useMarkdownForOutput"`
}
type ModelConfig struct {
    Name               string  `json:"name"`
    UseTemperature     bool    `json:"useTemperature"`
    Temperature        float64 `json:"temperature"`        // 0–2 when used
    UseContextWindow   bool    `json:"useContextWindow"`
    ContextWindow      int     `json:"contextWindow"`      // 1024–200000 when used
    UseLegacyMaxTokens bool    `json:"useLegacyMaxTokens"` // true=max_tokens, false=max_completion_tokens
}
type AppBehaviorConfig struct {
    EnableTaskLogging bool   `json:"enableTaskLogging"` // per-step diagnostic task log (independent of LoggingConfig)
    HistoryEnabled    bool   `json:"historyEnabled"`    // default true
    HistoryMaxEntries int    `json:"historyMaxEntries"` // default 100; clamped 10–1000
}
// LoggingConfig is the app-logger group, kept separate from the task-logging toggle above.
// Maps to the `log.*` KV keys (06-data-model-database.md §A.6); drives the rotating zerolog instance
// (07-error-handling-logging.md §10). Changing it reconfigures the logger live (no restart).
type LoggingConfig struct {
    LogFileEnabled bool   `json:"logFileEnabled"` // default false
    LogLevel       string `json:"logLevel"`       // "trace".."fatal"; default "info"
    LogDirectory   string `json:"logDirectory"`   // "" = OS default logs dir (shared with tasklog)
    LogMaxSizeMB   int    `json:"logMaxSizeMB"`   // default 10
    LogMaxBackups  int    `json:"logMaxBackups"`  // default 5
    LogMaxAgeDays  int    `json:"logMaxAgeDays"`  // default 30
    LogCompress    bool   `json:"logCompress"`    // default false
}
type LanguageConfig struct {
    Languages             []string `json:"languages"`
    DefaultInputLanguage  string   `json:"defaultInputLanguage"`
    DefaultOutputLanguage string   `json:"defaultOutputLanguage"`
}
type Settings struct {
    AvailableProviderConfigs []ProviderConfig    `json:"availableProviderConfigs"`
    CurrentProviderConfig    ProviderConfig      `json:"currentProviderConfig"`
    InferenceBaseConfig      InferenceBaseConfig `json:"inferenceBaseConfig"`
    ModelConfig              ModelConfig         `json:"modelConfig"`
    LanguageConfig           LanguageConfig      `json:"languageConfig"`
    AppBehaviorConfig        AppBehaviorConfig   `json:"appBehaviorConfig"`
}
type AppSettingsMetadata struct {
    AuthSchemes    []string `json:"authSchemes"`    // none|bearer|apiKey
    ProviderKinds  []string `json:"providerKinds"`  // the five kinds
    SettingsFolder string   `json:"settingsFolder"`
    DatabaseFile   string   `json:"databaseFile"`   // …/GoTextApp/gotext.db
    LogsFolder     string   `json:"logsFolder"`     // resolved absolute path
    AppVersion     string   `json:"appVersion"`
}

type VerifyOutcome struct {
    Check      string `json:"check"`      // "connection" | "models" | "inference"
    OK         bool   `json:"ok"`
    DurationMs int64  `json:"durationMs"`
    ModelCount int    `json:"modelCount,omitempty"` // models check
    Sample     string `json:"sample,omitempty"`     // small snippet (models sample / inference reply)
}
```

### 3.4 Stacks, history & preview models (`04-…`, `10-…`, `12-…`)

```go
type SavedStack struct {
    ID            string   `json:"id"`
    Name          string   `json:"name"`          // UNIQUE
    Icon          string   `json:"icon"`
    Steps         []string `json:"steps"`         // ordered action IDs
    DefaultFormat string   `json:"defaultFormat"` // "plain"|"markdown"|""
    DefaultInLang string   `json:"defaultInLang"`
    DefaultOutLang string  `json:"defaultOutLang"`
    CreatedAt     int64    `json:"createdAt"`
    UpdatedAt     int64    `json:"updatedAt"`
}

type AppliedAction struct {
    ID       string `json:"id"`
    Name     string `json:"name"`
    Category string `json:"category"`
}
type HistoryEntry struct {
    ID           string          `json:"id"`           // = runId
    CreatedAt    int64           `json:"createdAt"`
    Kind         string          `json:"kind"`         // "single"|"stack"
    Title        string          `json:"title"`
    InputText    string          `json:"inputText"`
    OutputText   string          `json:"outputText"`   // final or partial output
    Applied      []AppliedAction `json:"applied"`
    ProviderName string          `json:"providerName"`
    Model        string          `json:"model"`
    InputLang    string          `json:"inputLang"`
    OutputLang   string          `json:"outputLang"`
    Format       string          `json:"format"`       // "plain"|"markdown"
    DurationMs   int64           `json:"durationMs"`
    Inferences   int             `json:"inferences"`
    Status       string          `json:"status"`       // "success"|"partial"|"error"
    ErrorCode    string          `json:"errorCode"`
    FailedIndex  int             `json:"failedIndex"`  // -1 when none
}

type PromptPreviewRequest struct {
    ActionID         string      `json:"actionId,omitempty"` // single-action preview (xor Steps/StackID)
    Steps            []ChainStep `json:"steps,omitempty"`    // ad-hoc stack preview
    StackID          string      `json:"stackId,omitempty"`  // saved-stack preview
    UseMarkdown      bool        `json:"useMarkdown"`
    InputLanguageID  string      `json:"inputLanguageId"`
    OutputLanguageID string      `json:"outputLanguageId"`
    SampleInput      string      `json:"sampleInput,omitempty"` // injected into group 1 when present
}
type PreviewParams struct {
    Model       string `json:"model"`
    Temperature *float64 `json:"temperature,omitempty"`
    Format      string `json:"format"`     // "plain"|"markdown"
    InputLang   string `json:"inputLang,omitempty"`
    OutputLang  string `json:"outputLang,omitempty"`
    TokenParam  string `json:"tokenParam"` // "max_tokens"|"max_completion_tokens"
    Stream      bool   `json:"stream"`     // always false
}
type PreviewGroup struct {
    Index          int             `json:"index"`
    Family         string          `json:"family"`
    AppliedActions []AppliedAction `json:"appliedActions"`
    SystemPrompt   string          `json:"systemPrompt"`
    UserPrompt     string          `json:"userPrompt"`
    Parameters     PreviewParams   `json:"parameters"`
}
type PromptPreview struct { // wrapped by PromptPreviewResult
    Kind       string         `json:"kind"`       // "single"|"stack"
    Inferences int            `json:"inferences"`
    Groups     []PreviewGroup `json:"groups"`
    Summary    string         `json:"summary"`    // "2 inferences: Rewrite → Translate"
}
```

---

## 4. ActionHandler

Package `internal/actions`. Bound as `app.ActionHandler` in `main.go`. Holds the run registry
`map[runId]context.CancelFunc`, the stored app `ctx`, and a process-wide **single-flight inference gate**
(shared with provider Test inference) that allows **at most one inference in progress at a time**
(`05-stacks-actions-engine.md`).

> **Note on legacy methods.** The v2 single-shot helpers (`GetModelsList`,
> `GetCompletionResponse(ForProvider)`, `GetPromptGroups`, `ProcessPrompt`) are **removed in v3** — they
> are not bound and no back-compat shims remain. Their behavior is fully subsumed by the contracts below:
> a single action runs as the **degenerate one-step chain** through `ProcessPromptChain`; model discovery
> is `GetModels`; prompt groups are `GetActionCatalog`. All single-action and stack runs route through the
> one `ProcessPromptChain` code path.

### 4.1 `ProcessPromptChain`

Runs a stack (or a single action, as a one-step chain). Synchronous call; per-group progress is delivered
through the `chain:progress` **event** (§8). Provider/model/temperature are resolved **once** and fixed
for the whole chain.

| | |
|---|---|
| **Go** | `func (h *ActionHandler) ProcessPromptChain(req ChainRequest) ChainResultEnv` |
| **TS** | `ProcessPromptChain(req: ChainRequest): Promise<ChainResultEnv>` |

**REQUEST** — `ChainRequest` (§3.2).

**RESPONSE** — envelope `ChainResultEnv`; `Data` is `ChainResult` (§3.2): `finalText`, `completed`,
`failedIndex`, `error`.

**Semantics:**
- **Single-flight (checked first).** If an inference is already in progress — any other `ProcessPromptChain`
  run **or** a provider `TestInference` — the call returns **immediately** with `Data: null`,
  `Error = WireError{ code: "busy" }`: no plan is built, no provider is resolved, no LLM call is made, no
  history/tasklog is written. The gate is acquired only after pre-flight validation passes and is released
  on success, partial failure, cancel, or panic. At most one inference exists process-wide at any moment.
- Success → `Data` set (`failedIndex: null`), `Error: null`.
- **Partial failure** at group *k* → **both** set: `Data` = `{ finalText: <last good>, completed: k, failedIndex: k }`
  and `Error` = `WireError{ code: "step_failed", … }`.
- **Cancel** → both set: `Data` = `{ finalText: <last good>, failedIndex: null, error: "cancelled" }`,
  `Error` = `WireError{ code: "cancelled", … }`.

**VALIDATION (pre-flight, non-retryable):**
- `inputText` non-empty (else `validation` / `field=inputText`).
- `1 ≤ len(steps) ≤ 5` (else `invalid_plan`).
- Plan must collapse to **≤ 3 inference groups** after merge (else `invalid_plan`, `details.reason`).
- **≤ 1 action per `exclusivityGroup`** (else `invalid_plan`).
- Per-family `Requires` (snake_case tokens): translate steps require `input_language` + `output_language`
  (supplied via `ChainRequest.inputLanguageId`/`outputLanguageId`); image prompt-eng steps require
  `target_model` + `goal`; video prompt-eng steps require `target_model` (else `validation`).
- Provider pre-flight (`04-providers-inference.md §6.3`): a current provider exists, `baseUrl` well-formed, `selectedModel`
  set, and if `authScheme != none` the `apiKeyEnvVar` resolves to a non-empty value.

**ERRORS** — `WireError`. Applicable codes: `validation`, `invalid_plan`, `missing_credential`, `auth`,
`provider_unreachable`, `timeout`, `rate_limited`, `model_not_found`, `upstream`, `empty_completion`,
`context_window`, `step_failed`, `cancelled`, `internal`.

### 4.2 `CancelChain`

Cooperatively cancels a running chain by `runId`. The orchestrator stops **after the current group** and
`ProcessPromptChain` returns its partial result.

| | |
|---|---|
| **Go** | `func (h *ActionHandler) CancelChain(runId string) VoidResult` |
| **TS** | `CancelChain(runId: string): Promise<VoidResult>` |

**REQUEST** — `runId string` (the same id passed in `ChainRequest.RunID`).
**RESPONSE** — `VoidResult` (no `Data`). `Error: null` on success — including the no-op case where the
run already finished or the `runId` is unknown (cancel is idempotent and safe).
**VALIDATION** — `runId` non-empty (else `validation`).
**ERRORS** — `validation`, `internal`.

### 4.3 `GetActionCatalog`

Returns the full built-in action catalog with metadata. Drives the FE sidebar and the FE-mirrored
ordering/exclusivity/merge rules. Backend remains the source of truth.

| | |
|---|---|
| **Go** | `func (h *ActionHandler) GetActionCatalog() CatalogResult` |
| **TS** | `GetActionCatalog(): Promise<CatalogResult>` |

**REQUEST** — none.
**RESPONSE** — `CatalogResult`; `Data` is `[]ActionMeta` (§3.2), grouped logically by category. Static
(compiled with the prompts), so this is effectively constant per build.
**VALIDATION** — none.
**ERRORS** — `internal` only (catalog is in-binary).

### 4.4 `GetModels` (discovery)

Runs live model discovery for a provider (the kind's discovery strategy, with `customModels` fallback).
Used by the toolbar model picker's refresh control. No background polling; results cached per provider id
on the backend.

| | |
|---|---|
| **Go** | `func (h *ActionHandler) GetModels(providerId string) ModelsResult` |
| **TS** | `GetModels(providerId: string): Promise<ModelsResult>` |

**REQUEST** — `providerId string` (empty → use current provider).
**RESPONSE** — `ModelsResult`; `Data` is `[]ModelInfo` (§3.3) — normalized ids/labels, optional `Caps`.
On discovery-off / empty / unreachable, the static `customModels` are returned; if those are also empty,
`Data` is `[]` (the user may type a model id).
**VALIDATION** — `providerId` (when set) must reference an existing provider (else `validation`).
**ERRORS** — `validation`, `missing_credential`, `auth`, `provider_unreachable`, `timeout`,
`model_not_found`, `internal`.

### 4.5 `PreviewPrompt`

Read-only; **no LLM call**. Reuses the same Planner + Composer the orchestrator uses (shared
`BuildPlanAndPrompts`) so the Inspector can never drift from a real run. See
`10-ui-ux-specification.md`.

| | |
|---|---|
| **Go** | `func (h *ActionHandler) PreviewPrompt(req PromptPreviewRequest) PromptPreviewResult` |
| **TS** | `PreviewPrompt(req: PromptPreviewRequest): Promise<PromptPreviewResult>` |

**REQUEST** — `PromptPreviewRequest` (§3.4). Exactly one of `actionId`, `steps`, `stackId` identifies the
target.
**RESPONSE** — `PromptPreviewResult`; `Data` is `PromptPreview` (§3.4): `kind`, `inferences`, ordered
`groups` (each with composed `systemPrompt` + `userPrompt` + `parameters`), and a `summary`.
`{{user_text}}` is a marked placeholder unless `sampleInput` is supplied for group 1; later groups always
show `‹output of previous step›`.
**VALIDATION** — exactly one target specifier set (else `validation`); same plan validation as
`ProcessPromptChain` (cap, exclusivity, per-family `Requires`); referenced action/stack must exist in the
live catalog (else `validation` / `model_not_found`-style not-found).
**ERRORS** — `validation`, `invalid_plan`, `internal`.

---

## 5. SettingsHandler

Package `internal/settings`. Bound as `app.SettingsHandler`. The repository is backed by SQLite
(`06-data-model-database.md`); the handler surface is unchanged by the storage swap. All methods return
envelopes (the legacy `(T, error)` returns are replaced by Result envelopes per
`07-error-handling-logging.md`).

### 5.1 Aggregate & metadata

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `GetSettings() SettingsResult` | `GetSettings(): Promise<SettingsResult>` | — | `Settings` |
| `ResetSettingsToDefault() SettingsResult` | `ResetSettingsToDefault(): Promise<SettingsResult>` | — | `Settings` (wipe + reseed) |
| `GetAppSettingsMetadata() MetadataResult` | `GetAppSettingsMetadata(): Promise<MetadataResult>` | — | `AppSettingsMetadata` |

`AppSettingsMetadata` (§3.3) carries static UI data: the enumerations (`authSchemes`, `providerKinds`),
the resolved settings/database/logs paths, and the app version. **No secrets.** Called once on first load.

**ERRORS** (all three): `internal`. `ResetSettingsToDefault` may also surface a storage `internal`.

### 5.2 Provider CRUD + current

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `GetAllProviderConfigs() ProvidersResult` | `GetAllProviderConfigs(): Promise<ProvidersResult>` | — | `[]ProviderConfig` |
| `GetProviderConfig(id string) ProviderResult` | `GetProviderConfig(id: string): Promise<ProviderResult>` | `id` | `ProviderConfig` |
| `GetCurrentProviderConfig() ProviderResult` | `GetCurrentProviderConfig(): Promise<ProviderResult>` | — | `ProviderConfig` (or `Data: null` if none) |
| `CreateProviderConfig(cfg ProviderConfig) ProviderResult` | `CreateProviderConfig(cfg): Promise<ProviderResult>` | `cfg` (no `id`) | created `ProviderConfig` (server-set `id`) |
| `UpdateProviderConfig(cfg ProviderConfig) ProviderResult` | `UpdateProviderConfig(cfg): Promise<ProviderResult>` | `cfg` (with `id`) | updated `ProviderConfig` |
| `DeleteProviderConfig(id string) VoidResult` | `DeleteProviderConfig(id: string): Promise<VoidResult>` | `id` | — |
| `SetAsCurrentProviderConfig(id string) ProviderResult` | `SetAsCurrentProviderConfig(id: string): Promise<ProviderResult>` | `id` | now-current `ProviderConfig` |

**VALIDATION (provider create/update):**
- `name` non-empty and **unique** (else `validation` — UNIQUE conflict → "A provider named X already exists").
- `kind` ∈ {`ollama`,`lmstudio`,`llamacpp`,`openai`,`azure`} (else `validation`).
- `baseUrl` present, well-formed, normalized to end with `/` (else `validation`).
- `authScheme` ∈ {`none`,`bearer`,`apiKey`}; if `authScheme != none` then `apiKeyEnvVar` non-empty
  (the **env-var name**, never a secret) (else `validation`).
- `openai`: `apiKeyEnvVar` required. `azure`: `apiKeyEnvVar` required; `selectedModel` is the deployment
  id; `apiVersion` optional (required for true Azure OpenAI, omitted for Azure-style deployment proxy).
- Delete/Update/SetCurrent: `id` non-empty and existing (else `validation`/not-found).
- `DeleteProviderConfig` repoints `current` in a transaction (first remaining provider or none).

**ERRORS** — `validation`, `internal`. (Secrets are env-resolved at *inference* time, so provider CRUD
itself never produces `auth`/`missing_credential`; those arise from the verification methods §6 and from
runs §4.)

### 5.3 Inference / Model / App-behavior settings

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `GetInferenceBaseConfig() InferenceResult` | `GetInferenceBaseConfig(): Promise<InferenceResult>` | — | `InferenceBaseConfig` |
| `UpdateInferenceBaseConfig(cfg InferenceBaseConfig) InferenceResult` | `UpdateInferenceBaseConfig(cfg): Promise<InferenceResult>` | `cfg` | updated `InferenceBaseConfig` |
| `GetModelConfig() ModelConfigResult` | `GetModelConfig(): Promise<ModelConfigResult>` | — | `ModelConfig` |
| `UpdateModelConfig(cfg ModelConfig) ModelConfigResult` | `UpdateModelConfig(cfg): Promise<ModelConfigResult>` | `cfg` | updated `ModelConfig` |
| `GetAppBehaviorConfig() AppBehaviorResult` | `GetAppBehaviorConfig(): Promise<AppBehaviorResult>` | — | `AppBehaviorConfig` |
| `UpdateAppBehaviorConfig(cfg AppBehaviorConfig) AppBehaviorResult` | `UpdateAppBehaviorConfig(cfg): Promise<AppBehaviorResult>` | `cfg` | updated `AppBehaviorConfig` |
| `GetLoggingConfig() LoggingResult` | `GetLoggingConfig(): Promise<LoggingResult>` | — | `LoggingConfig` |
| `UpdateLoggingConfig(cfg LoggingConfig) LoggingResult` | `UpdateLoggingConfig(cfg): Promise<LoggingResult>` | `cfg` | updated `LoggingConfig` (logger reconfigured live) |

**VALIDATION:**
- Inference: `timeout` 1–600s; `maxRetries` 0–10 (out of range → `validation`, `details.field/expected/got`).
- Model: when `useTemperature`, `temperature` ∈ [0, 2]; when `useContextWindow`, `contextWindow`
  1024–200000 (else `validation`). `useLegacyMaxTokens` selects `max_tokens` vs `max_completion_tokens`.
- App-behavior: `historyMaxEntries` clamped 10–1000. This struct carries the **task-logging** toggle
  (`enableTaskLogging`) and the **history** toggles (`historyEnabled`, `historyMaxEntries`) — task logging
  and history are independent.
- Logging: `logLevel` ∈ {`trace`,`debug`,`info`,`warn`,`error`,`fatal`} (else `validation`);
  `logMaxSizeMB`, `logMaxBackups`, `logMaxAgeDays` ≥ 0; `logDirectory` "" = OS default logs dir.
  `UpdateLoggingConfig` reconfigures the logger live (rebuilds sinks / applies the new level) — no restart.

**ERRORS** — `validation`, `internal`.

> **Logging, theme & language settings** persist via the KV `settings` table (`06-data-model-database.md`):
> `ui.theme`, `ui.layout`, `ui.viewMode` are written through the settings path (dedicated UI-pref keys).
> The **app-logger** group (`log.*` keys) is owned by `LoggingConfig` and flows through
> `GetLoggingConfig`/`UpdateLoggingConfig`. The **task-logging** toggle (`app.enableTaskLogging`) and
> **history** (`history.enabled`, `history.maxEntries`) live in `AppBehaviorConfig`. App logging and task
> logging are independent (`07-error-handling-logging.md` §10.5–§10.6).

### 5.4 Languages (add / remove / set default)

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `GetLanguageConfig() LanguageResult` | `GetLanguageConfig(): Promise<LanguageResult>` | — | `LanguageConfig` |
| `AddLanguage(name string) LanguagesResult` | `AddLanguage(name: string): Promise<LanguagesResult>` | `name` | updated `[]string` languages |
| `RemoveLanguage(name string) LanguagesResult` | `RemoveLanguage(name: string): Promise<LanguagesResult>` | `name` | updated `[]string` languages |
| `SetDefaultInputLanguage(name string) VoidResult` | `SetDefaultInputLanguage(name: string): Promise<VoidResult>` | `name` | — |
| `SetDefaultOutputLanguage(name string) VoidResult` | `SetDefaultOutputLanguage(name: string): Promise<VoidResult>` | `name` | — |

**VALIDATION:** `name` non-empty (else `validation`). Add is idempotent (`ON CONFLICT DO NOTHING`).
Set-default targets must exist in the language list (else `validation`).
**ERRORS** — `validation`, `internal`.

---

## 6. Provider-verification methods (ActionHandler / SettingsHandler)

Three independent, on-demand, **read-only** diagnostic checks for the Providers settings screen. Each
reuses the provider layer, returns a `VerifyResult` with a duration, and **never** blocks saving or
setting-current. Verification runs are **not** recorded to history or tasklog. Bound on the handler that
owns the provider layer (ActionHandler or a dedicated provider handler). See `04-providers-inference.md §5.6`.

| Method (Go) | TS | Request | Response `Data` (`VerifyOutcome`) |
|---|---|---|---|
| `TestConnection(providerId string) VerifyResult` | `TestConnection(providerId: string): Promise<VerifyResult>` | `providerId` | `check:"connection"`, `ok`, `durationMs` |
| `TestModels(providerId string) VerifyResult` | `TestModels(providerId: string): Promise<VerifyResult>` | `providerId` | `check:"models"`, `ok`, `durationMs`, `modelCount`, `sample` |
| `TestInference(providerId string) VerifyResult` | `TestInference(providerId: string): Promise<VerifyResult>` | `providerId` | `check:"inference"`, `ok`, `durationMs`, `sample` |

- **TestConnection** — resolve the env credential (skipped for `authScheme=none`), then a lightweight
  reachability request to the base/models endpoint. Failures → `provider_unreachable` / `auth` /
  `missing_credential`.
- **TestModels** — run the kind's discovery strategy; report count + small sample. Failures →
  `provider_unreachable` / `model_not_found` / `internal` (parse error).
- **TestInference** — send a tiny throwaway non-streaming completion to `selectedModel` with a short
  per-check timeout (independent of the configured request timeout); report duration + snippet. Requires a
  `selectedModel` (else `validation` — prompt to pick/refresh). Because it performs an actual completion it
  **acquires the same single-flight inference gate** as `ProcessPromptChain`: if an inference is already in
  progress it returns immediately with `Error = busy` (no LLM call). Failures → `auth` / `model_not_found` /
  `timeout` / `rate_limited` / `context_window`. (TestConnection/TestModels do **not** acquire the gate —
  they perform no completion.)

**VALIDATION** — `providerId` non-empty + existing (else `validation`); `TestInference` requires
`selectedModel` set.
**ERRORS** — `validation`, `missing_credential`, `auth`, `provider_unreachable`, `timeout`,
`rate_limited`, `model_not_found`, `context_window`, `internal`. A failed check returns
`Data: { ok: false, … }` with the typed `Error` populated; it does **not** prevent Save / Set-as-current.

> The contract is the **three discrete methods** `TestConnection`, `TestModels`, and `TestInference`.
> There is no combined `VerifyProvider` entry point.

---

## 7. StackHandler & HistoryHandler

### 7.1 StackHandler (saved stacks CRUD)

Package `internal/stacks`. Bound as `app.StackHandler`. Backed by SQLite `stacks`/`stack_steps`
(`06-data-model-database.md`). See `05-stacks-actions-engine.md`.

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `ListStacks() StacksResult` | `ListStacks(): Promise<StacksResult>` | — | `[]SavedStack` |
| `GetStack(id string) StackResult` | `GetStack(id: string): Promise<StackResult>` | `id` | `SavedStack` |
| `CreateStack(s SavedStack) StackResult` | `CreateStack(s): Promise<StackResult>` | `s` (no `id`) | created `SavedStack` |
| `UpdateStack(s SavedStack) StackResult` | `UpdateStack(s): Promise<StackResult>` | `s` (with `id`) | updated `SavedStack` |
| `DeleteStack(id string) VoidResult` | `DeleteStack(id: string): Promise<VoidResult>` | `id` | — |
| `DuplicateStack(id string, newName string) StackResult` | `DuplicateStack(id, newName): Promise<StackResult>` | `id`, `newName` | duplicated `SavedStack` |

**VALIDATION:**
- `name` non-empty and **unique** (else `validation` — name conflict).
- `steps` is an ordered list of action IDs; the **same plan rules** apply (≤5 steps, ≤3 inference groups,
  ≤1 per exclusivity group) → otherwise `invalid_plan`.
- On load, unknown/removed action IDs are **dropped with a warning** (graceful — not an error).
- Create/Duplicate: `id` ignored/regenerated; `newName` non-empty + unique.
- `DeleteStack` cascades `stack_steps`. Create/Update write stack + steps in one transaction.

**ERRORS** — `validation`, `invalid_plan`, `internal`. Not-found (`GetStack`/`UpdateStack`/`DeleteStack`)
→ `validation`-class not-found (`sql.ErrNoRows` mapped).

### 7.2 HistoryHandler (run history)

Package `internal/history`. Bound as `app.HistoryHandler`. Backed by SQLite `history` table, count-based
retention (default 100). **No events** — the FE prepends the just-finished run or refetches. See
`06-data-model-database.md`. History entries are **written by the chain orchestrator**, not by a bound
method.

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `ListHistory(limit int, offset int) HistoryListResult` | `ListHistory(limit: number, offset: number): Promise<HistoryListResult>` | `limit`, `offset` | `[]HistoryEntry` (newest first) |
| `GetHistoryEntry(id string) HistoryEntryResult` | `GetHistoryEntry(id: string): Promise<HistoryEntryResult>` | `id` | `HistoryEntry` |
| `DeleteHistoryEntry(id string) VoidResult` | `DeleteHistoryEntry(id: string): Promise<VoidResult>` | `id` | — |
| `ClearHistory() VoidResult` | `ClearHistory(): Promise<VoidResult>` | — | — |

**VALIDATION:** `limit ≥ 1` (clamped), `offset ≥ 0`; `id` non-empty for Get/Delete (else `validation`).
Disabling history (`historyEnabled=false`) stops new writes but **keeps existing entries** (use Clear to
remove).
**ERRORS** — `validation`, `internal`. Not-found on `GetHistoryEntry` → `validation`-class not-found.

### 7.3 App handler — diagnostics & runtime/util methods

Package `internal/application`. Bound as `app` (the top-level handler holder). These methods give the
frontend a contract-backed surface for the few Wails-runtime capabilities the UI needs (clipboard, open
external) and for the root error boundary's backend report. They are thin wrappers over the stored app
`ctx` and the Wails `runtime` package — but they are **custom bound methods** (not raw runtime calls
reached from the frontend), so `10-ui-ux-specification.md` and `16-markdown-rendering.md` cite them by
name.

| Method (Go) | TS | Request | Response `Data` |
|---|---|---|---|
| `LogError(message string) VoidResult` | `LogError(message: string): Promise<VoidResult>` | `message` | — |
| `ClipboardGetText() StringResult` | `ClipboardGetText(): Promise<StringResult>` | — | clipboard text (`string`) |
| `ClipboardSetText(text string) VoidResult` | `ClipboardSetText(text: string): Promise<VoidResult>` | `text` | — |
| `BrowserOpenURL(url string) VoidResult` | `BrowserOpenURL(url: string): Promise<VoidResult>` | `url` | — |

- **`LogError`** — called by the React root error boundary (`07-error-handling-logging.md` §12) and the
  global `window.onerror`/`unhandledrejection` hooks to report a frontend render error (message +
  component stack) to the backend logger at `Error` level. Always resolves; never surfaces an error of its
  own (logging failures are swallowed). No secrets are ever passed.
- **`ClipboardGetText` / `ClipboardSetText`** — back the editor paste/copy affordances; wrap
  `runtime.ClipboardGetText(ctx)` / `runtime.ClipboardSetText(ctx, text)`.
- **`BrowserOpenURL`** (a.k.a. open-external) — opens a URL in the OS default browser for rendered Markdown
  links (`16-markdown-rendering.md`); wraps `runtime.BrowserOpenURL(ctx, url)`. Only `http`/`https` URLs
  are opened; other schemes are rejected (`validation`).

**VALIDATION** — `LogError`/`ClipboardSetText`: `message`/`text` may be empty (no-op). `BrowserOpenURL`:
`url` non-empty and `http(s)` scheme (else `validation`).
**ERRORS** — `validation` (`BrowserOpenURL` only), `internal`.

---

## 8. Events contract (chain progress)

Chains report progress through **Wails runtime events** (`runtime.EventsEmit` on the backend,
`EventsOn`/`EventsOff` on the frontend) — *in addition to* the synchronous `ProcessPromptChain` return
value. Events are the only push channel in the app; the FE subscribes on mount and unsubscribes on
unmount. The `runId` in every payload correlates with the active run and guards against stale events.

### 8.1 `chain:progress` — per-group lifecycle

Emitted as each inference group starts, completes, or fails.

```go
type StepProgress struct {
    RunID       string `json:"runId"`
    GroupIndex  int    `json:"groupIndex"`   // 0-based group within the plan
    TotalGroups int    `json:"totalGroups"`  // total inference groups (1–3)
    Family      string `json:"family"`       // family of the group (rewrite|structure|…)
    Status      string `json:"status"`       // "running" | "done" | "failed"
}
```

```ts
export interface StepProgress {
    runId: string; groupIndex: number; totalGroups: number; family: string; status: string;
}
// Subscribe:
EventsOn("chain:progress", (p: StepProgress) => dispatch(runProgress(p)));
```

> `groupIndex` is **0-based**. The UI displays the human step number as `step = groupIndex + 1`
> (rendered "Step *i* of *N*", where *N* = `totalGroups`).

| Event | Payload | When emitted |
|---|---|---|
| `chain:progress` | `StepProgress` | group enters `running`; transitions to `done`; or marked `failed` |

### 8.2 `chain:done` and `chain:error`

`ProcessPromptChain` **also returns** the final `ChainResultEnv` synchronously. These completion events
are convenience signals carrying the same data, for UI that listens rather than awaits. Their payloads are
**definitive**: `chain:done` carries a `ChainResult` (§3.2) and `chain:error` carries a `WireError` (§2.1)
— the exact same `ChainResult` placed in the envelope's `Data` and the exact same `WireError` placed in
the envelope's `Error`, respectively. The envelope returned by `ProcessPromptChain` remains authoritative.

| Event | Payload | When emitted |
|---|---|---|
| `chain:done` | `ChainResult` (§3.2) | run finished successfully (or with a kept partial result); identical to the envelope's `Data` |
| `chain:error` | `WireError` (§2.1) | run failed; identical to the envelope's `Error` |

```ts
EventsOn("chain:done",  (r: ChainResult) => dispatch(applyChainResult(r)));
EventsOn("chain:error", (e: WireError)   => dispatch(notifyError(e)));
```

**Invariants:** intermediate step outputs are **never** emitted or rendered — only group status flows over
`chain:progress`; the final/partial text arrives via the `ProcessPromptChain` return (and the optional
`chain:done`). One chain runs at a time per window; the `runId` discriminates events.

---

## 9. main.go binding & regeneration

```go
EnumBind: []interface{}{
    []interface{}{"ErrorCode", apperr.ErrorCode("")},
},
Bind: []interface{}{
    app,                 // LogError, ClipboardGetText, ClipboardSetText, BrowserOpenURL
    app.ActionHandler,   // ProcessPromptChain, CancelChain, GetActionCatalog, GetModels,
                         // PreviewPrompt, TestConnection, TestModels, TestInference
    app.SettingsHandler, // settings + provider CRUD + languages + metadata + logging config
    app.StackHandler,    // saved-stack CRUD
    app.HistoryHandler,  // history list/get/delete/clear
},
```

- The application `ctx` is captured in `OnStartup` (`app.SetContext(ctx)`) and used by all bound methods;
  `OnShutdown` closes the database.
- **`EnumBind`** exposes `ErrorCode` to TypeScript as a real enum in `models.ts`.
- **After any Go signature, struct, or bound-handler change, run `wails generate module`** to regenerate
  `frontend/wailsjs/go/**` and `models.ts`. The TypeScript signatures in this document are the expected
  output of that generation; the Go declarations are authoritative.

---

## 10. Contract index (quick reference)

| Handler | Method | Returns (envelope) |
|---|---|---|
| App | `LogError(message)` | `VoidResult` |
| App | `ClipboardGetText()` | `StringResult` |
| App | `ClipboardSetText(text)` | `VoidResult` |
| App | `BrowserOpenURL(url)` | `VoidResult` |
| ActionHandler | `ProcessPromptChain(ChainRequest)` | `ChainResultEnv` |
| ActionHandler | `CancelChain(runId)` | `VoidResult` |
| ActionHandler | `GetActionCatalog()` | `CatalogResult` |
| ActionHandler | `GetModels(providerId)` | `ModelsResult` |
| ActionHandler | `PreviewPrompt(PromptPreviewRequest)` | `PromptPreviewResult` |
| ActionHandler | `TestConnection(providerId)` | `VerifyResult` |
| ActionHandler | `TestModels(providerId)` | `VerifyResult` |
| ActionHandler | `TestInference(providerId)` | `VerifyResult` |
| SettingsHandler | `GetSettings()` | `SettingsResult` |
| SettingsHandler | `ResetSettingsToDefault()` | `SettingsResult` |
| SettingsHandler | `GetAppSettingsMetadata()` | `MetadataResult` |
| SettingsHandler | `GetAllProviderConfigs()` | `ProvidersResult` |
| SettingsHandler | `GetProviderConfig(id)` | `ProviderResult` |
| SettingsHandler | `GetCurrentProviderConfig()` | `ProviderResult` |
| SettingsHandler | `CreateProviderConfig(cfg)` | `ProviderResult` |
| SettingsHandler | `UpdateProviderConfig(cfg)` | `ProviderResult` |
| SettingsHandler | `DeleteProviderConfig(id)` | `VoidResult` |
| SettingsHandler | `SetAsCurrentProviderConfig(id)` | `ProviderResult` |
| SettingsHandler | `GetInferenceBaseConfig()` / `UpdateInferenceBaseConfig(cfg)` | `InferenceResult` |
| SettingsHandler | `GetModelConfig()` / `UpdateModelConfig(cfg)` | `ModelConfigResult` |
| SettingsHandler | `GetAppBehaviorConfig()` / `UpdateAppBehaviorConfig(cfg)` | `AppBehaviorResult` |
| SettingsHandler | `GetLoggingConfig()` / `UpdateLoggingConfig(cfg)` | `LoggingResult` |
| SettingsHandler | `GetLanguageConfig()` | `LanguageResult` |
| SettingsHandler | `AddLanguage(name)` / `RemoveLanguage(name)` | `LanguagesResult` |
| SettingsHandler | `SetDefaultInputLanguage(name)` / `SetDefaultOutputLanguage(name)` | `VoidResult` |
| StackHandler | `ListStacks()` | `StacksResult` |
| StackHandler | `GetStack(id)` | `StackResult` |
| StackHandler | `CreateStack(s)` / `UpdateStack(s)` / `DuplicateStack(id,newName)` | `StackResult` |
| StackHandler | `DeleteStack(id)` | `VoidResult` |
| HistoryHandler | `ListHistory(limit,offset)` | `HistoryListResult` |
| HistoryHandler | `GetHistoryEntry(id)` | `HistoryEntryResult` |
| HistoryHandler | `DeleteHistoryEntry(id)` / `ClearHistory()` | `VoidResult` |
| Events | `chain:progress` / `chain:done` / `chain:error` | `StepProgress` / `ChainResult` / `WireError` |
