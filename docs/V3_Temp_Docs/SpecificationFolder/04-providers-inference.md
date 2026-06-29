# 04 — Providers, Models & Inference

> **Status:** Final specification. Confirmed requirements only.
> **Component:** GoText ("GoText") — Go + Wails v2 backend.
> **Scope of this document:** the provider abstraction, per-kind field contracts, inference logic,
> model discovery, provider verification, error/retry taxonomy, and how all of this integrates into the
> existing Go codebase under `internal/llms` and `internal/settings`. The error model used throughout is
> `apperr.AppError` (`07-error-handling-logging.md`); the provider layer constructs `AppError` directly —
> there is **no** separate sentinel-error set.

Related specification documents (cross-referenced by filename, not by path):

- `03-architecture.md` — layered architecture (Handler → Service → Repository), DI, Wails binding rules.
- `05-stacks-actions-engine.md` — action families, prompt-chain orchestration, tasklog.
- `06-data-model-database.md` — `providers` schema and the exact persisted field names.
- `07-error-handling-logging.md` — the `apperr.AppError` model, `ErrorCode` constants, and constructors.
- `08-api-contracts.md` — the bound handler contract, the `VerifyResult`/`VerifyOutcome` envelope, and `models.ts` typings.

---

## 1. Scope and binding constraints

This document specifies the **logic** of providers, model discovery, inference, error handling, and
retries, plus the per-kind field contracts for the five supported provider kinds. Concrete persistence
format and the settings UI are specified elsewhere (`06-data-model-database.md`); this document defines
the data and behavior those layers bind to.

The following constraints are **requirements** and are encoded by the logic in this document:

1. **Credentials are NEVER stored.** A provider configuration references an **environment-variable
   name** only. The secret is read from the environment at request time via `os.Getenv(api_key_env_var)`
   and is never persisted, never logged, and never present inline in any configuration.
2. **Persistence is behind an abstraction.** All provider persistence goes through a
   `ProviderRepository` interface (CRUD + get/set "current"). The provider/inference logic depends on
   the abstraction, not on any file or database format.
3. **The HTTP/LLM client is a thin, hand-rolled, OpenAI-compatible HTTP client** behind a `Provider`
   interface driven by a per-kind `ProviderProfile`. **No external LLM library is used in v1.** Native
   non-OpenAI vendors (Anthropic, Google) are future `Provider` implementations behind the same
   interface and may use an official SDK at that time; they do not affect this design now.
4. **No token streaming in v1.** Every completion request is non-streaming (`Stream: false`).
5. **Wails rule.** Bound handler methods take no `context.Context` parameter; the `ctx` stored at
   `OnStartup` is used for all runtime calls and as the parent context for inference cancellation.

---

## 2. Supported provider kinds

GoText supports exactly **five** provider kinds. All five speak **one** chat wire format — the
OpenAI chat-completions JSON body. They differ only in: **(a)** completion URL shape, **(b)** auth
scheme, **(c)** discovery endpoint and response shape, and **(d)** minor body quirks. These differences
are captured by a per-kind **profile** (§3), not by separate clients or libraries.

| Kind | Provider-agnostic category | Examples | Wire format | Default auth |
|---|---|---|---|---|
| `ollama` | LM Studio / Ollama / llama.cpp-compatible (local) | local Ollama server | OpenAI-compatible chat; native discovery | none — **optional bearer** |
| `lmstudio` | LM Studio (local) | local LM Studio server | OpenAI-compatible | none — **optional bearer** |
| `llamacpp` | llama.cpp-compatible (local) | local `llama-server` | OpenAI-compatible | none — **optional bearer** |
| `openai` | OpenAI-compatible | OpenAI, OpenRouter, NVIDIA, any generic OpenAI-compatible endpoint | OpenAI-compatible | bearer |
| `azure` | Azure-compatible (deployment-style) | Azure OpenAI; any Azure-style deployment proxy | Azure deployment-style | api-key |

**The `azure` kind absorbs the deployment-proxy case.** An Azure-style deployment proxy is an
Azure-shaped API that only requires an api-key. It is therefore the `azure` kind with `api_version` (and
other Azure-only fields) left empty/optional. There is no separate kind for it.

**Anthropic-compatible and Google-compatible** are explicitly **future** kinds. They are not
implemented in v1 but the architecture (§3) admits them as new `Provider` implementations registered in
the factory with no redesign.

### 2.1 Local-provider API notes

GoText stays on the **OpenAI-compatible `/v1/*` surface** for all five kinds for portability; native
endpoints are optional enhancements only.

- **Ollama.** The local server has **no auth by default** but can be secured (e.g. behind a reverse
  proxy), and the hosted surface uses `Authorization: Bearer <token>`. GoText supports **optional
  bearer** for it. The OpenAI-compatible path **requires `/v1`** in the URL
  (`{base}/v1/chat/completions`, `{base}/v1/models`). The **native** model list is `{base}/api/tags`
  (at the root, **not** under `/v1`); GoText uses this native path for Ollama discovery. The native
  `/api/*` surface also exposes richer model management not needed in v1.
- **LM Studio.** **Auth is off by default**; it can be enabled (Server Settings → API tokens), after
  which requests need `Authorization: Bearer <token>` — GoText supports **optional bearer**. The
  OpenAI-compatible endpoints remain at `/v1/*`. LM Studio also exposes a **native REST API**
  (`/api/v1/*`, plus legacy `/api/v0/models`) with **rich model info** (e.g. `max_context_length`,
  quantization, loaded/unloaded). This is an **optional capability source**: discovery *may* populate
  `ModelCaps` from `/api/v0|v1/models`; v1 base discovery stays on `/v1/models` and treats the rich
  endpoint as a secondary, opt-in call.
- **llama.cpp (`llama-server`).** Optional `--api-key` / `--api-key-file` enables
  `Authorization: Bearer` auth; an invalid key returns a 401 in OpenAI error format. Endpoints are
  `/v1/chat/completions` and `/v1/models`. It often serves a single model (discovery may return one
  generic id, so the `custom_models` fallback is useful).

**Net contract effect:** `auth_scheme` is optionally `bearer` for `ollama`/`lmstudio`/`llamacpp` (token
via env var); everything stays on the OpenAI `/v1` surface; LM Studio (and Ollama/Azure) may optionally
enrich discovery with capability metadata.

---

## 3. Domain model

### 3.1 The `Provider` interface — the only extension seam

The `Provider` interface is the single seam through which new vendors are added. v1 ships exactly one
concrete implementation: `OpenAICompatibleProvider`, parameterized by a `ProviderProfile`.

```go
// Provider is the only abstraction the inference layer depends on.
type Provider interface {
    // Chat performs one non-streaming chat completion.
    Chat(ctx context.Context, req ChatRequest) (ChatResponse, error)

    // ListModels runs the kind's discovery strategy. When the kind/config does not
    // support discovery (Capabilities().SupportsDiscovery == false), the discovery layer
    // does NOT surface an error to the user — it falls back to the configured custom
    // model list (use_custom_models / custom_models). See §5.4.
    ListModels(ctx context.Context) ([]ModelInfo, error)

    // Capabilities exposes static/derived capability hints for this provider/kind.
    // ProviderCapabilities is BACKEND-INTERNAL ONLY — it is never bound to the frontend
    // (not in 08-api-contracts.md, not in models.ts). See §3.1 note below.
    Capabilities() ProviderCapabilities

    // Kind returns the provider kind.
    Kind() ProviderKind
}

type ProviderKind string

const (
    KindOllama   ProviderKind = "ollama"
    KindLMStudio ProviderKind = "lmstudio"
    KindLlamaCpp ProviderKind = "llamacpp"
    KindOpenAI   ProviderKind = "openai"
    KindAzure    ProviderKind = "azure"
)

// ProviderCapabilities are coarse, kind-level traits (distinct from per-model ModelCaps).
type ProviderCapabilities struct {
    SupportsDiscovery     bool // false → ListModels falls back to custom_models (no user-facing error)
    SupportsRichModelMeta bool // true → discovery may return ModelCaps (azure; lmstudio native)
    DeploymentInURL       bool // true for azure (deployment id is in the path)
    StripThinkTags        bool // single source of truth for <think> stripping; true for local
                               // kinds (ollama/lmstudio/llamacpp), false for openai/azure (§4.3)
}
```

> **`ProviderCapabilities` is backend-internal only — it is NEVER bound to the frontend.** It is not
> part of any handler contract in `08-api-contracts.md` and has no representation in `models.ts`. It is
> derived from the provider kind/profile and consumed solely by `internal/llms` to drive URL/auth/body
> behavior, discovery fallback, and think-tag stripping. The frontend never reads it.

### 3.2 `ProviderProfile` — per-kind data

A `ProviderProfile` declares, for a kind, the completion-URL template, the discovery endpoint and
parser, the auth scheme, and any body quirks. It is resolved from `kind`; a few fields may be overridden
by configuration (the generic `openai` case).

```go
// ProviderProfile is mostly-static, per-kind data driving OpenAICompatibleProvider.
type ProviderProfile struct {
    Kind ProviderKind

    DefaultAuthScheme AuthScheme // none | bearer | apiKey
    DefaultBaseURL    string     // e.g. "http://127.0.0.1:11434/"

    // URL templates relative to base_url. {deployment} and {api_version}
    // are substituted for azure.
    CompletionPathTemplate string // e.g. "v1/chat/completions"
    ModelsPathTemplate     string // e.g. "v1/models" or "api/tags" or "openai/deployments"

    // Discovery parsing strategy (handles {data:[]} vs bare array, native tags, rich azure).
    DiscoveryStrategy DiscoveryStrategy

    Capabilities ProviderCapabilities
}

type AuthScheme string

const (
    AuthNone   AuthScheme = "none"
    AuthBearer AuthScheme = "bearer"
    AuthAPIKey AuthScheme = "apiKey"
)
```

### 3.3 `ProviderFactory` — kind → builder registry

The factory builds a concrete `Provider` from a resolved configuration plus the profile for its kind. It
is a registry keyed by `ProviderKind`. Future kinds register a new builder without touching existing
code.

```go
type ProviderBuilder func(cfg ResolvedProviderConfig, profile ProviderProfile) (Provider, error)

type ProviderFactory struct {
    builders map[ProviderKind]ProviderBuilder
    profiles map[ProviderKind]ProviderProfile
}

// Build resolves the profile for cfg.Kind and constructs the Provider.
// Build results may be cached by a hash of the effective config (§4.1).
func (f *ProviderFactory) Build(cfg ResolvedProviderConfig) (Provider, error)

// Register adds a new kind's builder + profile (e.g. future Anthropic/Google).
func (f *ProviderFactory) Register(kind ProviderKind, b ProviderBuilder, p ProviderProfile)
```

**`ResolvedProviderConfig`** is exactly the stored `ProviderConfig` (§3.4) **plus** the secret resolved
from the environment at build/request time. The secret is sourced from `os.Getenv(api_key_env_var)` when
`auth_scheme != none`, lives **only in memory** for the duration of the request, and is **never
persisted and never logged**.

```go
// ResolvedProviderConfig = stored ProviderConfig + request-time secret.
// Build/request-scoped only; the Secret field never leaves memory and is never logged.
type ResolvedProviderConfig struct {
    Config ProviderConfig // the stored configuration (§3.4), env-var NAME only — no secret
    Secret string         // resolved from os.Getenv(Config.APIKeyEnvVar); empty when auth_scheme == none
}
```

If `auth_scheme != none` and the env var is empty/unset at resolution, the build returns an
`apperr.AppError` with code `missing_credential` (constructor `apperr.MissingCredential(provider,
envVar)`) — no HTTP request is made.

### 3.4 Logical fields of a provider configuration

These are the **logical** fields, independent of storage format. The field names below match the
persisted columns in `06-data-model-database.md` and the wire fields in `08-api-contracts.md` exactly.
The persistence mapping (column types, defaults) is in `06-data-model-database.md`.

| Field | Type | Meaning |
|---|---|---|
| `id` | string (UUID) | system-generated, stable |
| `name` | string | user label, unique |
| `kind` | enum (`ProviderKind`) | one of the five |
| `base_url` | string | scheme + host (+ optional base path), normalized to end with `/` |
| `auth_scheme` | enum `none\|bearer\|apiKey` | defaulted by kind |
| `api_key_env_var` | string | **name** of the env var holding the secret (never the secret itself) |
| `selected_model` | string | active model id; for `azure` this is the **deployment** id |
| `use_custom_models` | bool | if true, skip discovery and use `custom_models` |
| `custom_models` | []string | static model list / discovery fallback |
| `headers` | map[string]string | extra headers (attribution, org/project, enterprise headers) |
| `completion_path` | string (optional) | override; otherwise derived from the profile |
| `models_path` | string (optional) | override; otherwise derived from the profile |
| `api_version` | string (optional) | Azure-only; query parameter when present |

**Token resolution.** `secret = os.Getenv(api_key_env_var)` at request time. If `auth_scheme != none`
and the env var is empty or unset, the operation returns an `apperr.AppError` with code
`missing_credential` (constructor `apperr.MissingCredential(provider, envVar)`) — surfaced to the UI and
not retryable.

### 3.5 `ChatRequest` / `ChatResponse`

```go
// ChatRequest is provider-agnostic; built by the action/chain layer (see 05-stacks-actions-engine.md).
type ChatRequest struct {
    Model       string     // body model; for azure it is informational (deployment is in the URL)
    System      string     // category/family system prompt
    Messages    []Message  // user message(s); chain step outputs feed the next step's input
    Temperature *float64   // omitted when disabled or unsupported (per ModelCaps)
    MaxTokens   *int       // mapped to max_tokens OR max_completion_tokens (§4.4)
    NumCtx      *int       // ollama-only; ignored elsewhere (§4.5)
}

type Message struct {
    Role    string // "system" | "user" | "assistant"
    Content string
}

type ChatResponse struct {
    Content      string        // extracted choices[0].message.content, post-processed
    FinishReason string
    Usage        TokenUsage
    Duration     time.Duration
}
```

### 3.6 `ModelInfo` and `ModelCaps`

```go
type ModelInfo struct {
    ID    string
    Label string
    Caps  *ModelCaps // nil when the provider does not expose capability metadata
}

type ModelCaps struct {
    MaxPromptTokens     *int  // context-window hint
    SupportsTemperature *bool // from a rich catalog (e.g. azure features.temperature)
    SupportsSystemPrompt *bool
    // The token-limit param (max_tokens vs max_completion_tokens) is inferred or manual — see §4.4.
}
```

`Caps` is `nil` for plain catalogs (`ollama`/`lmstudio`/`llamacpp`/`openai`); the UI then shows manual
toggles. When `Caps` is present, the UI can pre-fill/grey controls (§5.5).

---

## 4. Inference logic

### 4.1 Provider and model selection (resolution at run time)

1. The repository holds N provider configurations and exactly **one current** provider.
2. A run resolves the **active provider** = the current provider; the **active model** = its
   `selected_model`; and **inference settings** (temperature, token limit, timeout, retries, markdown)
   from the global inference settings.
3. The factory builds a `Provider` from `(config + profile + resolved secret)`. The build may be cached
   by a hash of the effective configuration; the cache is invalidated on any configuration change.
4. For a **prompt chain**, the active provider, model, and temperature are **fixed for the entire
   chain** (consistency). They are resolved once at chain start.

### 4.2 Single inference — `runStep`

`runStep(ctx, ChatRequest) (ChatResponse, error)` is the single, reusable inference primitive. It is the
extraction of today's inline completion flow into a provider-driven step.

1. Resolve the active provider (§4.1) and build it via the factory.
2. The provider builds the **completion URL** (profile template + `base_url` + deployment for azure), the
   **auth header** (scheme + resolved secret), and merges `headers`.
3. POST the OpenAI chat body, **non-streaming** (`Stream: false`), with the configured timeout.
4. Apply the retry policy (§6).
5. **Response extraction:** take `choices[0].message.content`.
   - **Strip `<think>…</think>`** (and equivalent reasoning tags) **iff** the provider's
     `Capabilities().StripThinkTags == true`. This flag is the **single source of truth** for think-tag
     stripping and is driven by the provider profile/kind: it is `true` for the local kinds
     (`ollama` / `lmstudio` / `llamacpp`) and `false` for `openai` / `azure`. No other mechanism toggles
     stripping.
   - **Ignore `custom_content`.** Azure-style adapters may put reasoning in
     `custom_content.stages`/`state`; `content` is already clean. Do **not** parse stages in v1.
   - Empty content on a non-error (2xx) status → `apperr.AppError` with code `empty_completion`
     (constructor `apperr.EmptyCompletion(provider, model)`); surfaced, retry per policy.
6. Log the step to the tasklog (existing JSONL behavior, reusing today's record shape).

`runStep` is consumed by both the single-action path and the prompt-chain orchestrator
(see `05-stacks-actions-engine.md`); the single-action path is the degenerate one-step chain.

### 4.3 Response extraction rules (summary)

| Concern | Rule |
|---|---|
| Primary content | `choices[0].message.content` |
| Reasoning-tag stripping | strip `<think>…</think>` and equivalents **iff** `Capabilities().StripThinkTags == true` (local kinds `ollama`/`lmstudio`/`llamacpp`; never for `openai`/`azure`) — single source of truth |
| Azure `custom_content` | ignored in v1; `content` is authoritative (already clean) |
| Empty 2xx content | code `empty_completion` (`apperr.EmptyCompletion`; retry per policy) |
| No `choices` | treated as empty/upstream error per §6 |

### 4.4 Token-limit parameter (`max_tokens` vs `max_completion_tokens`)

- Governed by the inference setting (today's `UseLegacyMaxTokens`).
- `max_completion_tokens` is the modern field; `max_tokens` is the legacy field for older models.
- Because `max_completion_tokens` applies to OpenAI-family models specifically, the choice is **per
  provider/model in practice**. v1 keeps it a **setting** (optionally pre-filled from `ModelCaps`/family
  when discovery provides a hint). It is **not** auto-forced.
- Exactly **one** of the two fields is emitted in the request body per the setting.

### 4.5 Ollama `num_ctx`

- Ollama's OpenAI-compatible `/v1` endpoint does **not** accept `num_ctx`; it requires the native
  `/api/chat` `options` block.
- **Deferred for v1.** `num_ctx` exists as an optional field but is **not** wired to a native path in
  v1. When required, a native Ollama code path is added **behind the same `Provider` interface** (no
  redesign). The limitation is documented; everything else works over `/v1`.

---

## 5. Model-discovery logic

### 5.1 Goal

Produce a normalized `[]ModelInfo` for the model picker, with optional capability metadata, from
heterogeneous endpoints — or fall back to a static list. Discovery results are **real-time and NOT
cached in the database**; they are cached only in memory per provider id (§5.4).

### 5.2 Per-kind discovery strategy

| Kind | Discovery request | Response shape → normalization |
|---|---|---|
| `ollama` | `GET {base}/api/tags` (native) | `{models:[{name,size,…}]}` → `ID=name`, `Label=name` |
| `lmstudio` | `GET {base}/v1/models` | `{data:[{id}]}` → `ID=id` (optional rich `/api/v0\|v1/models` → `Caps`) |
| `llamacpp` | `GET {base}/v1/models` | `{data:[{id}]}` → `ID=id` (often one entry) |
| `openai` | `GET {base}/v1/models` | `{data:[{id}]}` → `ID=id` (OpenRouter returns a large catalog) |
| `azure` | `GET {base}/openai/deployments?api-version=…` (or `{base}/openai/models`) | `{data:[{id,display_name,display_version,features,limits,capabilities}]}` → rich `ModelInfo + Caps` |

### 5.3 Robustness rules

- The parser **must accept both** `{ "data": [ … ] }` **and a bare array `[ … ]`** (some
  Azure-style deployment listing paths return a bare array). Both normalize to `[]ModelInfo`.
- **Chat-only filtering for deployment catalogs.** For rich (`azure`) catalogs, keep only
  chat/completion models (e.g. `capabilities.chat_completion == true`); exclude embeddings, image, and
  non-model (agent) entries. `Label = display_name (+ display_version)`. Extract `Caps` from
  `features.temperature` and `limits.max_prompt_tokens` when present.
- For plain catalogs (`ollama`/`lmstudio`/`llamacpp`/`openai`): `Caps = nil` → UI shows manual toggles.
- **Optional capability enrichment (not only Azure).** `lmstudio` may populate `Caps`
  (`MaxPromptTokens` from `max_context_length`, plus quantization) via its native `/api/v0|v1/models`.
  This is opt-in; base discovery stays on `/v1/models`, and the rich endpoint is a secondary call only
  when present.

### 5.4 Fallback and caching

- If `use_custom_models` is true, **or** discovery returns empty / is unreachable / is unsupported (the
  kind's `Capabilities().SupportsDiscovery == false`) → use `custom_models` (static). **No user-facing
  error is surfaced when discovery is unsupported** — the static/custom-model list is used silently and
  this case maps to **no wire error code**. If `custom_models` is also empty, the picker is empty and the
  user may type a model id.
- Discovery results are **cached in memory per provider id**; a **manual refresh** re-fetches. There is
  **no background polling** and **no DB caching** of discovery results.
- Discovery uses the same auth/headers as inference but a **shorter timeout** and **no body retries
  beyond transient** (it is a GET).

### 5.5 Capability-aware auto-config (when `Caps` present)

On model select, the logic pre-fills/greys the temperature toggle (`SupportsTemperature`) and exposes a
context-window hint (`MaxPromptTokens`). When `Caps == nil`, it degrades silently to manual controls. UI
binding is specified in `08-api-contracts.md`; this layer only exposes `Caps`.

### 5.6 Provider verification — Test connection · Test models · Test inference

Three independent, on-demand checks in the Providers settings screen. Each **reuses the provider layer**
(no separate code path), returns the **`VerifyResult` envelope carrying a `VerifyOutcome`** (defined in
`08-api-contracts.md`) — `ok` + `durationMs` + a typed failure reason (an `apperr.AppError` `code` in the
envelope's error slot) — is **diagnostic-only**, and **never blocks saving** the provider.

1. **Test connection** — resolve the env-var credential, then issue a lightweight reachability request
   to the base URL / models endpoint. Confirms the host is reachable and that auth is accepted. Failures
   return an `apperr.AppError` with code `provider_unreachable` / `auth` / `missing_credential`.
2. **Test models (discovery)** — run the kind's discovery strategy (§5.2) and report the **count** plus
   a small sample. Confirms the discovery endpoint and parser work for this provider. Failures return an
   `apperr.AppError` with code `provider_unreachable` / `model_not_found` (a parse failure → `internal`).
3. **Test inference** — call `Provider.Chat(ctx, req)` **directly** with a tiny throwaway prompt (e.g.
   system "reply 'ok'", user "ping"), non-streaming, to the **selected model**, using a **short per-check
   timeout** independent of the configured request timeout. It does **NOT** depend on `runStep` or the
   chain orchestrator (those are extracted later in T12); Test inference must work before that extraction
   exists. Because it performs a real completion, it **acquires the shared single-flight `InferenceGate`**
   (the same gate the chain orchestrator uses, `05-stacks-actions-engine.md §4.5`): if an inference is
   already in progress it returns immediately with code `busy` and makes no LLM call; otherwise it acquires
   the gate, runs the probe, and releases it (via `defer`) on completion or failure. Confirms the whole
   path round-trips (URL build → auth → body → response parse). Reports a duration and snippet. Failures
   return an `apperr.AppError` with code `busy` / `auth` / `model_not_found` / `timeout` / `rate_limited` /
   `context_window`.

**Backend surface.** `TestConnection(providerId)`, `TestModels(providerId)`, `TestInference(providerId)`
handlers (or a single `VerifyProvider(providerId, check)`), each returning a `VerifyResult` (see
`08-api-contracts.md`). **Test inference calls `Provider.Chat(...)` directly** with an isolated minimal
request and its own short per-check timeout — it has **no dependency on `runStep` or the chain
orchestrator**. Verification runs are **diagnostic only** — **not** recorded to history or tasklog
(optionally logged at debug level).

**Edge cases.** Test inference requires a `selected_model`; if none is set, the user is prompted to
pick/refresh first. Local providers with `auth_scheme = none` skip the credential step in Test
connection. All three checks are **read-only and safe to re-run**; a failed check shows the typed reason
instead of a success mark and does not prevent Save or Set-as-current.

---

## 6. Error handling and retries

### 6.1 Status → typed-error mapping

| HTTP / condition | Typed error code | Retryable? | UI intent |
|---|---|---|---|
| transport timeout / dial error | `provider_unreachable` | yes (transient) | "Provider unreachable — check Base URL / that the server is running" |
| explicit request timeout | `timeout` | yes (transient) | "Request timed out — retrying" |
| 401 / 403 | `auth` | **no** | "Authentication failed — check the API key env var" |
| 404 | `model_not_found` | **no** | "Model/deployment not found (or wrong api-version)" |
| 408 / 425 | `upstream` (transient) | yes | retry |
| 429 | `rate_limited` | yes (respect `Retry-After`) | "Rate limited — backing off" |
| 500 / 502 / 503 | `upstream` | yes | "Provider error/overloaded — retrying" |
| empty content (2xx) | `empty_completion` | per policy | "No content returned" |
| missing env credential | `missing_credential` | **no** | "Set the API key environment variable" |
| context window exceeded | `context_window` | **no** | "Input too long for the model's context window" |

These codes are the canonical taxonomy: `auth`, `missing_credential`, `provider_unreachable`, `timeout`,
`rate_limited`, `model_not_found`, `upstream`, `empty_completion`, `context_window`. The provider layer
constructs an `apperr.AppError` directly via the matching constructor (`apperr.Auth`,
`apperr.MissingCredential`, `apperr.Unreachable`, `apperr.Timeout`, `apperr.RateLimited`,
`apperr.ModelNotFound`, `apperr.Upstream`, `apperr.EmptyCompletion`, `apperr.ContextWindow`) — there is
**no** separate sentinel-error set. The full `ErrorCode` catalog and constructor signatures are defined
in `07-error-handling-logging.md`.

### 6.2 Retry policy

- `maxRetries` (default 3, bounded 0–10) and `timeoutSeconds` (default 60, bounded 1–600) come from the
  inference settings.
- **Retry only transient classes:** `provider_unreachable`, `timeout`, `rate_limited`, `upstream`.
  **Never retry** `auth`, `model_not_found`, `missing_credential`.
- Backoff is **exponential with jitter**; on `429`, honor the `Retry-After` header when present.
- Respect `ctx` cancellation **between** attempts (chain cancel / app shutdown).
- Retries apply **per `runStep`**; a chain does **not** restart from the beginning on a mid-chain retry.

### 6.3 Pre-flight validation (non-retryable)

Before any HTTP call, validate: `base_url` present and well-formed; `selected_model` set; if
`auth_scheme != none` then `api_key_env_var` is set and resolves to a non-empty environment value; for
`azure`, the `selected_model` (deployment) is present. Validation failures return an `apperr.AppError`
with code `validation` (or `missing_credential` when the env var resolves empty) without making an HTTP
request.

---

## 7. Per-kind field contracts (required / optional)

Legend: **R** = required, **O** = optional, **Derived** = set by the profile (not entered by the user),
**—** = not applicable / ignored.

### 7.1 `ollama`

| Field | R/O | Default / Note |
|---|---|---|
| name, kind | R | |
| base_url | R | `http://127.0.0.1:11434/` (the OpenAI path needs `/v1`; see §2.1) |
| auth_scheme | O | `none` default; **optionally `bearer`** if the server/cloud is secured |
| api_key_env_var | O | required **iff** `auth_scheme=bearer` (e.g. `OLLAMA_API_KEY`) |
| selected_model | R (for inference) | from discovery |
| completion_path | Derived | `v1/chat/completions` |
| models_path | Derived | native `api/tags` at the root (see §5.2) |
| use_custom_models / custom_models | O | fallback when discovery is off/unreachable |
| headers | O | |
| num_ctx (body quirk) | O | Ollama context window; native path **deferred** (§4.5) |

### 7.2 `lmstudio`

| Field | R/O | Default / Note |
|---|---|---|
| name, kind | R | |
| base_url | R | `http://127.0.0.1:1234/` |
| auth_scheme | O | `none` default; **optionally `bearer`** (API tokens via Server Settings) |
| api_key_env_var | O | required **iff** `auth_scheme=bearer` |
| selected_model | R | from discovery |
| completion_path / models_path | Derived | `v1/chat/completions` · `v1/models` (optional rich `/api/v0\|v1/models` → `Caps`) |
| use_custom_models / custom_models | O | |
| headers | O | |

### 7.3 `llamacpp`

| Field | R/O | Default / Note |
|---|---|---|
| name, kind | R | |
| base_url | R | `http://127.0.0.1:8080/` |
| auth_scheme | O | `none` default; **optionally `bearer`** when started with `--api-key` / `--api-key-file` |
| api_key_env_var | O | required **iff** `auth_scheme=bearer` |
| selected_model | R | often a single served model |
| completion_path / models_path | Derived | `v1/chat/completions` · `v1/models` |
| use_custom_models / custom_models | O | llama.cpp may report one generic id |
| headers | O | |

### 7.4 `openai` (OpenAI-compatible: OpenAI, OpenRouter, NVIDIA, generic)

| Field | R/O | Default / Note |
|---|---|---|
| name, kind | R | |
| base_url | R | e.g. `https://api.openai.com/`, `https://openrouter.ai/api/`, an NVIDIA base |
| auth_scheme | Derived | `bearer` |
| api_key_env_var | R | e.g. `OPENAI_API_KEY`, `OPENROUTER_API_KEY` |
| selected_model | R | |
| completion_path / models_path | Derived (O override) | `v1/chat/completions` · `v1/models`; override for non-standard generics |
| headers | O | OpenRouter `HTTP-Referer` / `X-Title`; OpenAI `OpenAI-Organization` / `OpenAI-Project` |
| use_custom_models / custom_models | O | fallback when `/v1/models` is absent |
| token-limit param | O | see §4.4 |

### 7.5 `azure` (Azure OpenAI **and** Azure-style deployment proxy)

| Field | R/O | Default / Note |
|---|---|---|
| name, kind | R | |
| base_url | R | Azure resource base or Azure-style deployment proxy base (e.g. `https://my-resource.openai.azure.com/`) |
| auth_scheme | Derived | `apiKey` (header `Api-Key`) |
| api_key_env_var | R | e.g. `AZURE_OPENAI_API_KEY` |
| selected_model | R | this is the **deployment id** (in the URL path) |
| api_version | O | **required for true Azure OpenAI deployments**; **omit for an Azure-style deployment proxy** |
| completion_path | Derived | `openai/deployments/{deployment}/chat/completions` (+ `?api-version` when set) |
| models_path | Derived | `openai/deployments` (+ `?interface_type=chat`, + `?api-version` when set) |
| headers | O | e.g. a Bearer-JWT alternative for an Azure-style deployment proxy; enterprise headers |
| use_custom_models / custom_models | O | fallback |

**Azure-style deployment proxy = `azure` with `api_version` empty.** Same kind, same engine. The only
practical differences (api-version optional, richer/looser discovery) are handled by leaving optional
fields blank and by the tolerant discovery parser (§5.3).

---

## 8. Integration into the current codebase

The existing layered architecture (Handler → Service → Repository), DI via `ApplicationContextHolder`,
interfaces for testability, and the Wails binding rules are preserved (see `03-architecture.md`).

### 8.1 `internal/llms` (largest change)

- Introduce the `Provider` interface, `OpenAICompatibleProvider`, `ProviderProfile` (per-kind data),
  `ProviderFactory` (kind → builder), and the discovery strategies + normalizers.
- **Keep `LLMServiceAPI` as the façade.** Route it through the factory/provider instead of the current
  single inline flow. Today's helpers — `buildRequestParameters`, `getAuthToken`,
  `buildRequestHeaders`, `buildRequestURL`, `mapModelNames`, `modelListRequest`, `completionRequest`
  (in `internal/llms/service.go`) — are **refactored into** profile-driven URL/header building plus
  per-kind discovery parsers.
- **Auth:** drop the inline-token logic in `getAuthToken` (which today reads `provider.AuthToken` /
  `provider.UseAuthTokenFromEnv`); resolve the secret from `api_key_env_var` **only**.
- Keep the existing thin HTTP transport (the `resty` client in `service.go`, or stdlib `net/http`); add
  **no new LLM dependency**.
- The existing wire structs in `internal/llms/llms.go` (`ChatCompletionRequest`,
  `ChatCompletionResponse`, `ModelsListResponse`, `RequestParameters`) remain the OpenAI-compatible wire
  shapes the `OpenAICompatibleProvider` serializes/parses. The discovery parser is extended to also
  accept a bare array and rich azure catalogs (§5.3).

### 8.2 `internal/settings`

- Extend the provider configuration model (`ProviderConfig` in `internal/settings/settings.go`) with
  `kind` (replacing the current `ProviderType` set, which only has `open-ai-compatible` and `ollama` —
  see `internal/settings/constants.go`), `api_key_env_var` (replacing the inline `AuthToken` /
  `UseAuthTokenFromEnv` / `EnvVarTokenName` triple), optional `api_version`, and the `selected_model`
  semantics. **Remove** any field that stores a secret (`AuthToken`).
- Keep a `ProviderRepository` interface (CRUD + get/set current). The current JSON-backed repository
  remains behind that interface until a SQLite repository replaces it, with no change to provider logic
  (see `06-data-model-database.md`).
- `ModelConfig` / `InferenceBaseConfig` (in `settings.go`) remain the source of
  temperature / token-limit (`UseLegacyMaxTokens`) / timeout / retries / markdown.
- The `SettingsService` (`internal/settings/service.go`, methods `GetCurrentProviderConfig`,
  `GetInferenceBaseConfig`) **resolves env tokens by name** at request time and never returns or stores
  the secret value.

### 8.3 `internal/actions`

- Extract `runStep(ctx, ChatRequest)` from the existing single-action processing path.
- Add the prompt-chain orchestrator (canonical order, merge groups, sequential run, cancel, partial
  result) reusing `runStep` and the tasklog. The single-action path becomes the degenerate one-step
  chain (same code path). Full chain behavior is specified in `05-stacks-actions-engine.md`.

### 8.4 Handlers / Wails / DI

- Bound methods take **no** `context.Context`; the stored `ctx` parents inference and cancellation.
- Register the `ProviderFactory` in `ApplicationContextHolder`; expose chain, discovery, and the three
  verification checks (§5.6) via the existing handler/bind patterns. Run `wails generate module` after
  Go signature changes.

### 8.5 Testing

- Unit-test profiles (URL/header/discovery-parse) per kind with table tests.
- Integration-test inference and chains with `httptest` mocking each kind's endpoints, including:
  `{data:[]}` vs bare-array discovery, `Api-Key` vs `Bearer` auth, deployment-in-path,
  401/404/429/5xx mapping, and cancel/partial-failure. No real LLM is required.

---

## 9. Forward constraints encoded now (so later work is drop-in)

- **Env-only credentials.** Configuration carries `api_key_env_var`, never a secret; the secret is read at
  request time and discarded after the request.
- **Repository abstraction.** All persistence is behind `ProviderRepository`; SQLite swaps in later
  with no provider-logic change.
- **UI-agnostic logic.** Discovery exposes `ModelInfo + Caps`; selection/inference expose typed errors
  and progress; the future settings UI binds to these without logic changes.
- **Extensibility seam.** Native non-OpenAI vendors (Anthropic-compatible, Google-compatible) are added
  as new `Provider` implementations plus a factory registration; nothing else changes.
