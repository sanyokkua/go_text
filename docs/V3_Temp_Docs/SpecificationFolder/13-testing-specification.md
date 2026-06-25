# 13 — Testing Specification

> **Status:** Specification (normative). Part of the GoText ("Text Processing Suite") v3
> redesign — Go + Wails v2 backend, React 19 / TypeScript frontend.
> **Date:** 2026-06-23.
> **Scope:** This document is the authoritative test plan for the v3 redesign. It defines, for
> every shipped capability, the **unit**, **integration**, **end-to-end**, **regression**, and
> **edge-case** tests required, plus **Given/When/Then acceptance criteria** per major feature and
> the **accessibility** test obligations. It states *what must be tested and to what bar* — not the
> implementation of each test. Related specs are referenced by filename: providers, inference and
> the chain run loop (`04-providers-inference.md`); the actions/stacks engine, Planner, Composer and
> orchestrator (`05-stacks-actions-engine.md`); the data model, migrations and repositories
> (`06-data-model-database.md`); the typed-error model, Result envelope and logging
> (`07-error-handling-logging.md`); the Wails API contracts (`08-api-contracts.md`); the prompt
> library and Prompt Inspector (`09-prompts.md`); and the UI inventory, states and theming
> (`10-ui-ux-specification.md`, `12-ui-implementation.md`).

---

## 1. Goals, principles & toolchain

### 1.1 Goals

1. **Behavior is pinned by tests, not by inspection.** Every confirmed requirement in the related
   specs has at least one test that fails if the behavior regresses.
2. **Tests are hermetic.** No test contacts a real LLM provider, a real network host, or the user's
   real configuration. Provider endpoints are mocked with `net/http/httptest`; persistence uses an
   in-memory or temp-file SQLite database; environment is sandboxed per test.
3. **Classification, not strings.** Error tests assert on the typed `ErrorCode` / `WireError.code`
   (see `07-error-handling-logging.md`), never on substring matches of human-readable messages.
4. **One bar, every layer.** The same coverage and quality gates apply to Go packages and to the
   frontend.
5. **The Inspector and the run share a path.** Prompt-composition tests assert that the Prompt
   Inspector preview and the real run produce identical prompts (shared `BuildPlanAndPrompts`, see
   `09-prompts.md`).

### 1.2 Test pyramid & layers

| Layer | Backend (Go) | Frontend (TS/React) |
|---|---|---|
| **Unit** | `go test` table tests per package; pure functions, no I/O | Jest + React Testing Library; reducers, helpers, components in isolation |
| **Integration** | `go test` + `httptest` mock providers; in-memory SQLite + goose migrations | Jest with mocked Wails adapter; component + slice + adapter together |
| **End-to-end** | scripted user journeys via the built webview (manual or automated) | same journeys driving the rendered app |
| **Accessibility** | n/a | `jest-axe` (no violations) + keyboard-navigation tests |

### 1.3 Toolchain (confirmed)

| Concern | Tool |
|---|---|
| Go unit/integration | standard `go test`; `github.com/stretchr/testify` (`assert`/`require`) |
| Provider HTTP mocking | `net/http/httptest` |
| DB tests | `modernc.org/sqlite` (pure Go) on `file::memory:?cache=shared` or a temp-file DB; `pressly/goose/v3` `Up`/`Down` |
| Race detection | `go test -race` |
| Go vulnerabilities | `govulncheck` |
| Frontend unit/integration | Jest 30 + `ts-jest`; React Testing Library + `@testing-library/user-event` |
| Frontend accessibility | `jest-axe` |
| Frontend UI / E2E (rendered app) | **Playwright** driving **headless Chromium** against a running dev server |
| Frontend audit | `npm audit` |
| Wails health | `wails doctor` |
| SQL codegen drift | `sqlc generate --diff` |

> The frontend test runner is already wired (`frontend/package.json` exposes `npm test`,
> `test:watch`, `test:coverage` on Jest 30 + ts-jest). `@testing-library/react`,
> `@testing-library/user-event`, `@testing-library/jest-dom`, `jest-axe`, and `playwright` are added
> as dev dependencies for the v3 component, accessibility, and UI tests. The runner-agnostic harness
> that installs and wires all of this is task **T00** in `14-implementation-plan.md` (run before any
> feature task).

### 1.4 Coverage requirements

| Scope | Statement/line coverage target | Notes |
|---|---|---|
| `internal/apperr` | ≥ 95 % | small, pure mapping logic — near-total |
| `internal/prompts` (Planner, Composer, catalog) | ≥ 90 % | core engine logic |
| `internal/actions` (orchestrator, `runStep`) | ≥ 85 % | I/O paths mocked |
| `internal/llms` (profiles, discovery, classification) | ≥ 85 % | per-kind table tests |
| `internal/settings`, `internal/db`, `internal/stacks`, `internal/history` (repositories) | ≥ 85 % | DB-backed |
| `internal/logging` | ≥ 80 % | level + redaction paths |
| Frontend `logic/` (reducers, adapter helpers, `unwrap`, `notifyError`) | ≥ 90 % | pure logic |
| Frontend components (editors, dialogs, inputs, diff, theme) | ≥ 80 % | behavior + a11y |
| **Repository-wide aggregate** | **≥ 85 %** | enforced in CI |

Coverage is measured with `go test -coverprofile` and `jest --coverage`. A pull request that drops
aggregate coverage below the bar fails CI. Generated code (`internal/db/store`, Wails-generated
`models.ts`/bindings) is excluded from coverage accounting.

### 1.5 Frontend run targets — two dev servers

Because this is a Wails app, the frontend can be served — and therefore tested — in **two distinct
run targets**. Both are first-class and both are exercised by the UI suite; a test names the target it
needs.

| Target | How it is launched | Backend | Wails bridge (`window.go.*`, `window.runtime`) | What it is for |
|---|---|---|---|---|
| **A — Frontend-only dev server** | `cd frontend && npm run dev` (Vite, e.g. `http://localhost:5173`) | **None** — no Go process | **Mocked**: a dev-only **browser bridge mock** implements every bound method signature and the event API (`EventsOn`/`EventsEmit`), returning fixtures | Fast, deterministic UI: component states, responsive/visual checks, every error/loading/empty/partial state, theming — without a backend |
| **B — Backend-connected dev server** | `wails dev` (serves the rendered app with the live bridge at `http://localhost:34115`) | **Real** Go backend, all handlers bound | **Real** — generated bindings call the running Go code | Full end-to-end journeys through the real backend; provider HTTP is the only thing faked (httptest-style local stub) |

Rules for the two targets:

1. **The bridge mock is the contract.** Target A's mock implements exactly the `08-api-contracts.md`
   Result-envelope shapes and `chain:progress`/`chain:error`/`chain:done` events. It can be switched
   per scenario to return success, each typed `WireError`, partial chains, and progress streams — so
   UI behavior for *every* envelope is testable without a backend. The mock lives under
   `frontend/src/dev/bridge-mock/` and is injected only in dev/test builds (never shipped).
2. **Target A proves the UI; Target B proves the wiring.** Pure UI gates (responsive, visual, console,
   focus, theming, state rendering) run against **A** because they must be deterministic and need no
   Go. Integration journeys that must exercise the real bridge, events, and cancellation run against
   **B**.
3. **No real LLM in either.** Target A uses fixtures; Target B uses a local/mock stub provider at the
   network boundary. Neither contacts a real external provider.
4. **Same component, both targets.** A view's `MarkdownView`, dialogs, and run lifecycle behave
   identically in A and B; tests assert that the rendered behavior matches across targets for the
   shared flows (run a single action, render Markdown, switch theme).

---

## 2. (A) Unit testing

Unit tests exercise one package/function in isolation with no network and no real filesystem beyond
a sandboxed temp directory. They are table-driven where the input space is enumerable.

### 2.1 Backend unit targets — per package

#### 2.1.1 `internal/apperr` — typed errors & boundary mapping

| Test | Given | Assert |
|---|---|---|
| Constructor fields | each constructor (`Auth`, `Timeout`, `Validation`, `RateLimited`, `Unreachable`, `ModelNotFound`, `Upstream`, `MissingCredential`, `ContextWindow`, `StepFailed`, `Cancelled`, `Busy`, `Internal`) | correct `Code`, `Retryable`, and only **allowlisted** `Details` keys are set; `Busy()` → code `busy`, `Retryable=false`, empty `Details` |
| `toWire` — classified | an `*AppError` (possibly wrapped with `%w`) | `errors.As` resolves it; returned `WireError` carries the same `Code/Title/Message/Details/Retryable`; `cause` is **not** serialized |
| `toWire` — unclassified | a plain `error` (not an `AppError`) | returns `WireError{Code: internal, Retryable: true}` with the generic title/message |
| `toWire` — wrapped chain | `fmt.Errorf("op: %w", appErr)` | unwraps to the inner `AppError`; full chain is available to the logger, never to the wire payload |
| Details safety | constructors fed provider/url/token-like inputs | `Details` never contains a secret, token, or a full URL embedding a key |
| `Retryable` matrix | every code | matches the taxonomy: retryable = `provider_unreachable`, `timeout`, `rate_limited`, `upstream`, `internal`; `empty_completion` is **not retried by default** (policy); non-retryable = `auth`, `missing_credential`, `model_not_found`, `validation`, `invalid_plan`, `busy`, `context_window`, `cancelled` |

#### 2.1.2 `internal/llms` — provider profiles, discovery, capabilities

Table-driven across the five kinds (`ollama`, `lmstudio`, `llamacpp`, `openai`, `azure`).

| Test | Given | Assert |
|---|---|---|
| Completion URL build | per kind, a config (baseUrl + selected model/deployment + optional `apiVersion`) | URL = profile template applied: e.g. `{base}/v1/chat/completions`; azure = `{base}openai/deployments/{deployment}/chat/completions` (+ `?api-version` only when set) |
| Models URL build | per kind | `ollama` → `{base}api/tags`; `lmstudio/llamacpp/openai` → `{base}v1/models`; `azure` → `{base}openai/deployments` (+ `api-version` when set) |
| Auth header build | per `authScheme` | `none` → no auth header; `bearer` → `Authorization: Bearer <secret>`; `apiKey` (azure) → `Api-Key: <secret>`; secret resolved from `apiKeyEnvVar`, never inline |
| Custom-header merge | a config with `customHeaders` | custom headers are merged onto the request; they never overwrite the computed auth header silently (documented precedence) |
| Discovery parse `{data:[]}` | a models body `{"data":[{"id":"m"}]}` | normalized to `[]ModelInfo{ID:"m"}` |
| Discovery parse bare array | a body `[{"id":"m"}]` | parser accepts the bare array form and normalizes identically |
| Discovery parse — ollama native | `{"models":[{"name":"llama3"}]}` from `api/tags` | `ID=name`, `Label=name` |
| Capability extraction (azure rich) | a rich catalog with `display_name`, `features.temperature`, `limits.max_prompt_tokens`, `capabilities.chat_completion` | chat entries kept; embeddings/image/agent entries filtered out; `Caps.SupportsTemperature` and `Caps.MaxPromptTokens` populated; `Label = display_name (+ display_version)` |
| Capability absent (plain) | a plain `{data:[{id}]}` catalog | `Caps == nil` (UI falls back to manual toggles) |
| Missing-credential pre-flight | `authScheme != none` and the named env var unset/empty | returns `apperr.MissingCredential` (typed) **without** an HTTP call |

#### 2.1.3 `internal/prompts` — Planner, Composer, catalog

| Component | Test | Assert |
|---|---|---|
| **Planner — canonical order** | actions added out of order (e.g. translate, then proofread, then tone) | output order follows the canonical pipeline `proofread → rewrite-intent → tone → style → format → doc-structure → summarize → translate`; PromptEng standalone; terminal actions pinned last regardless of insertion order |
| **Planner — exclusivity dedupe** | two actions in the same `ExclusivityGroup` (e.g. two tones) | second replaces or is rejected; plan never contains two members of one exclusivity group; backend produces `apperr.InvalidPlan` when a duplicate slips through |
| **Planner — cap enforcement** | a build with > 5 steps, or a combination yielding > 3 inference groups | `apperr.InvalidPlan` with `details{reason, steps, inferences}`; never produces an over-cap plan |
| **Planner — merge grouping** | adjacent same-family mergeable steps (e.g. proofread + professionalize) vs a structural transform + a terminal | mergeable same-family neighbours collapse into one group; non-mergeable/terminal steps each start a new group; `inferences = len(groups)`; single action → one group |
| **Composer — two-tier output** | a merge group of N directives | output is one `system` (the family system prompt) + one `user` with the directive fragments concatenated in canonical sub-order; shared context (`{{user_text}}`, `{{user_format}}`, and for translate `{{input_language}}`/`{{output_language}}`) injected **once** at the orchestration layer, not per fragment |
| **Composer — translate placeholders** | a translate group | the language placeholders are present and substituted from run context |
| **Same-language translate skip** | a translate step with `inputLang == outputLang` (translate as the only/terminal step) | the step is a no-op pass-through (output = input); no LLM call is composed for it |
| **Catalog integrity** | `Catalog()` / `GetActionCatalog()` | every action has a non-empty `ID`, `Family`, `Directive`, `OrderRank`; `Terminal`/`Mergeable`/`ExclusivityGroup` are internally consistent (e.g. terminal families are not marked mergeable) |

#### 2.1.4 `internal/settings`, `internal/db` repositories — CRUD, KV groups, lifecycle

These run against an in-memory or temp-file SQLite database with `goose.Up` applied (see §3.4). They
are listed under unit because each method is exercised in isolation; the migration round-trip itself
is an integration test (§3.5).

| Test | Assert |
|---|---|
| Provider CRUD | `CreateProviderConfig` → `GetProviderConfig`/`GetAllProviderConfigs` round-trips all fields incl. `kind`, `authScheme`, `apiKeyEnvVar`, `apiVersion`, `selectedModel`, `completionPath`, `modelsPath`, `useCustomModels`, `headers` (JSON), `customModels` (JSON); `UpdateProviderConfig` mutates; `DeleteProviderConfig` removes |
| KV setting groups | `UpdateModelConfig`/`UpdateInferenceBaseConfig`/`UpdateAppBehaviorConfig` upsert the `model.*` / `inference.*` / `app.*` / `history.*` / `log.*` / `ui.*` keys; the matching `Get*Config` reassembles the typed struct with correct types and defaults for absent keys |
| Current-provider repoint | `SetAsCurrentProviderConfig` sets `app_state.current_provider_id`; deleting the **current** provider repoints (in one tx) to the first remaining provider or to NULL |
| Seed (fresh) | on an empty DB, the seeder inserts the 5 default providers, the default languages, the default settings KV rows (incl. the full `log.*` set), the default current provider, **and the starter stacks** (see `06-data-model-database.md` §B.5/§B.5.1) |
| Starter-stack seed validity | each seeded starter stack is **planner-valid** (≤ 5 steps, ≤ 3 inference groups, ≤ 1 action per exclusivity group, terminal action only last) and references only live action ids from the catalog |
| App-settings metadata | `GetAppSettingsMetadata` returns app version, settings/DB/logs paths, and the `providerKinds`/`authSchemes` enums; paths are read-only and never embed secrets |
| Logging config | `GetLoggingConfig`/`UpdateLoggingConfig` round-trip the `log.*` keys (`fileEnabled`/`level`/`directory`/`maxSizeMB`/`maxBackups`/`maxAgeDays`/`compress`) with correct types + defaults |
| Reset to defaults | `ResetSettingsToDefault` wipes entity + settings tables and re-seeds; post-reset state equals fresh-seed state |
| Unique constraints | duplicate `providers.name` / `languages.name` / `stacks.name` → typed conflict (`validation`), not a raw driver error |
| Languages | `AddLanguage`/`RemoveLanguage`/`SetDefaultInputLanguage`/`SetDefaultOutputLanguage` behave; ordering by `sort_order, name` |
| Stacks repo | `CreateStack` writes stack + ordered steps (one tx); `GetStackSteps` returns by `position`; `UpdateStack` replaces steps; `DeleteStack` cascades steps; `DuplicateStack` copies under a new name |

#### 2.1.5 `internal/history` — add + prune, ordering, clear

| Test | Assert |
|---|---|
| `Add` + prune to `maxEntries` | inserting more than `maxEntries` keeps exactly the newest N (prune runs in the same tx as the insert) |
| Ordering | `List` returns entries `created_at DESC`; pagination via `limit`/`offset` is stable |
| `Get` / `Delete` / `Clear` / `Count` | round-trip; `Clear` empties the table; `Count` reflects size |
| Service gate | `Record` no-ops when `history.enabled = false`; existing entries are preserved (not cleared) when disabling |
| Status mapping | `Record` maps `ChainResult` → `status` ∈ {`success`,`partial`,`error`} with `error_code` and `failed_index` set on partial/error |
| Failure isolation | a repository error inside `Record` is logged and swallowed — it never propagates to fail the run |

#### 2.1.6 `internal/logging` — level & redaction

| Test | Assert |
|---|---|
| Level gating | at level `warn`, `Debug`/`Info` emit nothing and `Warn`/`Error` emit; level is applied from settings and is runtime-settable |
| Structured fields | `WithOp` stamps `component`/`op`; the `Timer` helper emits a `duration_ms` field |
| Redaction (mandatory) | a record carrying an auth token / `Authorization` header value is redacted; only the **env-var name** appears; full URLs containing keys are not logged |
| User-text gating | user text is logged only at `debug`/`trace` (and may be truncated); never at `info`+ |

### 2.2 Frontend unit targets

**Coverage mandate (non-negotiable):** *every* frontend unit — each reducer/slice, adapter helper,
hook, pure helper, presentational component, primitive wrapper, and view — has **at least one unit
test** (Jest + React Testing Library), **and every rendered view/overlay additionally has at least one
UI test** (Playwright/Chromium, §4). "Frontend is fully covered" means both: the logic layer is pinned
by RTL unit/integration tests, and the rendered surface is pinned by the Chromium UI suite. A new
component without both is incomplete and fails the §1.4 coverage floor and the §11 verification
pipeline. The view↔test mapping is enumerated in §2.3.

| Target | Test | Assert |
|---|---|---|
| **`unwrap` / `tryUnwrap`** | success envelope (`data` set) | returns `data`; dispatches no error |
| | error envelope (`error` set) | dispatches `notifyError(error)`; throwing variant throws the `WireError`; non-throwing variant returns `{error}` |
| | **partial chain** envelope (both `data` and `error`) | partial `data` is returned/applied **and** `notifyError` is dispatched — data is never discarded |
| **`notifyError` copy** | each `ErrorCode` | produces the exact user copy from `07-error-handling-logging.md`, interpolating `details` (provider, envVar, model, timeout, retryAfter, statusCode, field/expected/got, step n, family); correct severity (error/warning/info) and toast-vs-inline routing (`validation` → inline) |
| **`TagInput`** (custom models) | type + Enter | adds a chip; duplicate is ignored/normalized; ✕ removes a chip; empty submit is a no-op; keyboard-only operable |
| **`KvEditor`** (custom headers) | add row / edit name+value / remove row | the emitted header bag matches the rows; empty-name rows excluded |
| **`DiffView`** | input vs output text | added words marked added (green), removed words marked removed (struck red); counts correct; "Copy clean" copies the output without diff markup; disabled when there is no output |
| **Theme resolve/apply** | `resolve(mode)` for `auto`/`light`/`dark` | `auto` returns `dark`/`light` per `matchMedia`; explicit modes ignore the OS; `applyTheme` toggles the `.dark` root class; the `matchMedia` `change` listener re-applies only while in `auto` |
| **Reducers** | each slice (`editor`, `ui`, `stacks/builder`, `stacks/saved`, `run`, `history`, `notifications`, `theme`, `about`) | known action → expected next state; unknown action → unchanged; builder reducer mirrors canonical-order/dedupe/cap/merge derivations from catalog metadata (FE mirror of the backend rules) |

### 2.3 Frontend coverage matrix (every view/component → unit + UI test)

Each rendered surface has a **unit test** (RTL, Target-A logic in jsdom) **and** a **UI test**
(Playwright/Chromium, §4, Target A unless a real-bridge journey is required, then Target B). This table
is the checklist the §11 pipeline enforces.

| Surface (component / view) | Unit test (Jest + RTL) | UI test (Playwright / Chromium) |
|---|---|---|
| **Editor view** (input/output panes, per-pane buttons) | pane buttons enable/disable by content; copy/clear/use-as-input wiring | type → Run (single action) renders output once; no overflow/console errors (A); full run via real bridge (B) |
| **View modes** Preview / Source / Diff | mode switch reducer + render branch | toggle modes; Diff highlights; Source shows raw (A) |
| **`MarkdownView` / `MermaidBlock`** | each §9 example in `16-markdown-rendering.md`; HTML inert; link externalized; mermaid loading→SVG + error | Markdown output (table/code/mermaid/math) renders & is token-themed in light+dark; E7–E9 (§4.2) |
| **Toolbar** (provider/model/lang/format/view/layout/⌘K/history/info/settings) | controlled-value sync to store | every control reachable; popovers open; no overflow at 3 widths × 2 themes (A) |
| **Sidebar** (Actions, My Stacks, search) | list render + filter | expand/collapse; pick action; search filters (A) |
| **Run bar / `StepProgress`** | progress reducer from `chain:progress`; `ui.inferenceRunning` disables all start triggers | run lifecycle shows progress + cancel; partial keeps output; **while running, Run/My-Stacks-Run/⌘K-run/Test-inference are disabled** (A) |
| **`StackBuilderBar`** + Save dialog + Manage grid | builder mirror (order/dedupe/cap/merge); Save disabled at 0 steps | build → run → save → manage (B); cap/exclusivity greying (A) |
| **History rail** | card render; restore re-arm; empty/disabled states | open rail → restore populates editors (B) |
| **Settings — 7 sections** | each control persists; inline validation; capability pre-fill | per-section render at 3 widths × 2 themes; add+verify provider (B) |
| **About·Info + Prompt Inspector** | catalog render; Inspector calls `PreviewPrompt` | open Inspector → composed prompts + copy; ⌘K run/add (B) |
| **Primitive wrappers** (Select/Dialog/AlertDialog/Tabs/Menu/Toast/Tooltip/Switch/Slider/Segmented/Combobox/CommandPalette) | controlled-value sync; `jest-axe` zero violations | keyboard nav (§8.2); overlay covers viewport; focus trap (A) |
| **`TagInput` / `KvEditor` / `DiffView`** | add/edit/remove; emitted model; keyboard-only | interaction smoke flow (A) |
| **Theme (resolve/apply)** | `auto`/`light`/`dark` resolution; `.dark` toggle; `matchMedia` follow | switch theme re-themes instantly, no FOUC (A); OS-flip live (E6) |
| **Toasts / confirms / error boundary** | `notifyError` copy per code; boundary fallback; global `onerror` hooks | typed error → toast; destructive op → AlertDialog (A) |

> Surfaces marked **(B)** must additionally pass against the backend-connected server because they
> depend on real bridge calls, events, or cancellation; all surfaces pass their deterministic gates
> against **(A)**.

---

## 3. (B) Integration testing

Integration tests wire real collaborators together with only the outermost boundary faked: provider
HTTP via `httptest`, persistence via in-memory/temp SQLite. They follow the established pattern in
`internal/actions/handler_integration_test.go` (a sandboxed temp config dir, an `httptest` mock
server whose behavior is switched per sub-test, and sequential `t.Run` steps that share state).

### 3.1 Provider HTTP: status → typed code

A single `httptest` server parameterized by a per-test behavior (status code, body, delay) covers the
whole status matrix. Each row asserts the **typed code** surfaced through the handler boundary.

| Mock condition | Expected `ErrorCode` | Retryable |
|---|---|---|
| `200` with valid body | (success — no error) | — |
| `401` / `403` | `auth` | no |
| `404` | `model_not_found` | no |
| `429` (with `Retry-After`) | `rate_limited` (honors `Retry-After`) | yes |
| `500` / `502` / `503` | `upstream` | yes |
| transport timeout (delay > configured timeout) | `timeout` | yes |
| dial/connection failure (bad host) | `provider_unreachable` | yes |
| `200` with empty `choices[0].message.content` | `empty_completion` | not retried by default |
| `authScheme != none`, env var unset | `missing_credential` (no HTTP call) | no |

### 3.2 Chain run — single and multi-step

| Test | Assert |
|---|---|
| Single action | a one-step chain runs one inference group and renders the final output once (degenerate chain = single action, one code path) |
| Multi-step merge | a build of same-family mergeable steps collapses to one inference group; ≤ 5 steps yield ≤ 3 groups |
| Multi-group flow | each group's sanitized output feeds the next group's input (`Messages`); provider/model/temperature are resolved **once** and fixed for the whole chain |
| `chain:progress` events | per-group `running`/`done`/`failed` events are emitted with `GroupIndex`/`TotalGroups`; events carry the `runId` |
| Partial failure | when group *k* fails after retries, the orchestrator returns the completed output **and** the typed error — both travel in the same `ChainResultEnv` (`Data` partial + `Error` set); prior work is not discarded; `FailedIndex = k` |
| Cancel keeps partial | cancelling the run's `ctx` mid-chain stops after the current group and returns the last good output with `Error = cancelled`; the run registry's cancel func is invoked by `CancelChain(runId)` |
| **Single-flight — concurrent run rejected** | with one `ProcessPromptChain` in progress (gate held), a second `ProcessPromptChain` returns immediately `Data:null` + `Error.code = busy`; no plan is built, no provider resolved, no LLM call, no history/tasklog write |
| **Single-flight — run vs Test inference** | while a run holds the gate, `TestInference` returns `busy`; while `TestInference` holds the gate, `ProcessPromptChain` returns `busy`; `TestConnection`/`TestModels` are **not** gated (succeed concurrently) |
| **Single-flight — gate released** | after a run completes / fails / is cancelled / panics, the gate is free and the next `ProcessPromptChain` (or `TestInference`) acquires it and runs normally (no stuck gate) |
| **Single-flight — at most one inference** | the `InferenceGate.TryAcquire` is non-blocking (no queue); under concurrent calls exactly one proceeds and the rest get `busy` |
| Reasoning sanitization | native local `<think>…</think>` blocks are stripped from output; azure `custom_content` is ignored (content already clean) |

### 3.3 Provider verification — three checks

| Check | Mock | Assert |
|---|---|---|
| Test connection | reachable host, accepted auth | ✓ with a duration; failures map to `provider_unreachable` / `auth` / `missing_credential`; local `authScheme=none` skips the credential step |
| Test models | discovery endpoint returns `{data:[]}` or a bare array | ✓ with model count + sample; failures map to `provider_unreachable` / `model_not_found` (parse error → `internal`) |
| Test inference | a tiny throwaway completion against `selectedModel` with a short per-check timeout | ✓ with duration + snippet; failures map across the full taxonomy (`auth`/`model_not_found`/`timeout`/`rate_limited`/`context_window`); requires `selectedModel` (else prompts to pick) |
| Diagnostic-only | any verification run | is **not** written to history or tasklog; is read-only and safe to re-run; never blocks Save / Set-as-current |

### 3.4 Repositories on real SQLite

| Test | Assert |
|---|---|
| Open + migrate + seed | `db.Open` on a temp/in-memory DB runs `goose.Up`, then seeds when empty (providers, languages, settings incl. `log.*`, current provider, starter stacks); pragmas (WAL, `foreign_keys=ON`, `busy_timeout`, single writer conn) applied; `GetCurrentProviderID` tolerates a missing `app_state` row (returns empty, not error) |
| Settings repo end-to-end | `SqliteSettingsRepository` round-trips providers + KV groups; JSON columns (`headers`, `custom_models`) marshal/unmarshal; `DeleteProviderConfig` repoint in a tx |
| Stack repo end-to-end | `SqliteStackRepository` CRUD incl. ordered steps and cascade delete |
| History repo end-to-end | add+prune, list/get/delete/clear on the real table with the `idx_history_created` index |
| Error mapping | `sql.ErrNoRows` → typed not-found; UNIQUE violation → `validation`/conflict; open/migrate failure → `internal` (storage) |

### 3.5 Migrations — goose Up/Down round-trip

| Test | Assert |
|---|---|
| `Up` clean | `goose.Up` on an empty temp/in-memory DB creates all tables (`settings`, `providers`, `app_state`, `languages`, `stacks`, `stack_steps`, `history`) and indexes; `goose_db_version` tracks the applied versions |
| `Down` clean | `goose.Down` reverses each migration (incl. `0002_history`) leaving no application tables |
| Round-trip | `Up → Down → Up` is idempotent and leaves a consistent schema |
| sqlc parity | the schema sqlc reads (the migration files) matches the generated `store` — verified by the `sqlc generate --diff` CI guard (§5.2) |

### 3.6 Provider CRUD + delete-current repoint (handler boundary)

| Test | Assert |
|---|---|
| Create/Update/Delete via handler | the `SettingsHandler` methods return Result envelopes (`08-api-contracts.md`); created providers persist and list |
| Delete current → repoint | deleting the current provider in the same tx repoints current to the first remaining provider, or NULL when none remain (UI shows "no current provider") |

### 3.7 Frontend integration

| Test | Assert |
|---|---|
| Adapter ↔ slice | a thunk calling a mocked Wails binding that returns an error envelope drives `notifyError` and the RTK `rejected` path; a success envelope updates the target slice |
| Chain partial in UI | a mocked `ProcessPromptChain` returning `{data: partial, error: step_failed}` renders the partial output **and** shows the typed toast |
| Restore from history | a mocked `GetHistoryEntry` populates input + output editors and re-arms the action/stack when valid; falls back to text-only with an "actions changed" note on drift |
| Theme init | reading `ui.theme` on load resolves and applies the class before first paint (no FOUC) |

---

## 4. (C) End-to-end testing

End-to-end tests validate complete user journeys through the rendered application (the built
webview). They are **scripted scenarios** that may be run **manually** against a debug build or
**automated** by driving the webview. Each scenario uses a mocked or local stub provider — no real
external LLM. Each scenario lists pre-conditions, numbered steps, and expected observable outcomes.

| # | Journey | Scripted steps (abridged) | Expected outcome |
|---|---|---|---|
| E1 | **Run a single action** | open app → type input → pick an action from the sidebar (or ⌘K) → Run | output renders once; one inference; a history entry is recorded (if history enabled) |
| E2 | **Build + run + save a stack** | add several actions → observe live canonical order, merge-group badges, "N / 5 steps · M inferences" → Run (unsaved) → per-group progress → Save… → name + icon → confirm | output renders; the stack appears in My Stacks; saved steps reload correctly |
| E3 | **Restore from history** | open the history rail → select an entry → Restore | input + output editors populate; the applied action/stack re-arms when still valid; text-only fallback + note on drift |
| E4 | **Add + verify a provider** | Settings → Providers → New → choose kind → set base URL + env-var name → Save → Test connection / Test models / Test inference | each check shows ✓/✗ with a typed reason and timing; verification never blocks Save / Set-as-current |
| E5 | **Preview a prompt** | About·Info → Actions & Stacks → click an action or stack → Prompt Inspector | the composed System + User prompt(s) + parameters render; a multi-step stack shows fewer prompts than steps with the merge summary; Copy works; "Use current input" injects editor text into group 1 |
| E6 | **Switch theme** | Settings → Appearance → choose Auto / Light / Dark | the UI re-themes instantly (no restart); Auto follows the OS live; the choice persists across a restart |

E2E acceptance: every scenario completes without an uncaught error, every error path surfaces a
typed toast/inline message (never a raw stack trace), and the global error boundary is never
triggered during a happy-path run.

### 4.1 Headless-Chromium UI verification (Playwright)
Because the frontend runs in a webview, automated UI checks drive the rendered app in **headless
Chromium via Playwright** against a running dev server. The scripts accept a `BASE_URL` so they run
against either run target from §1.5: **Target A** (`npm run dev`, mocked bridge) for the deterministic
responsive/visual/state gates, and **Target B** (`wails dev`, real backend) for the bridge-dependent
journeys. CI runs the gates against Target A by default and the integration journeys against Target B.
Two scripts under `frontend/scripts/`:

- **Responsive/visual gate** (`verify-ui.mjs`): for every primary route × at least three viewport widths
  (narrow / tablet / wide) × **both themes** (light, dark), assert: (1) **no horizontal overflow**
  (`scrollWidth ≤ clientWidth + 1`); (2) **no console errors / page errors**; (3) the expected key
  element is present (e.g. the editor on the main view); (4) body font is the sans-serif token, not a
  fallback serif. Capture a screenshot per combination for review.
- **Interaction smoke flows** (`smoke-tests.mjs`): scripted user flows (run a single action with a
  mocked/local stub provider; build + run a stack; open the History rail; add + verify a provider;
  switch theme; open the Prompt Inspector; **render Markdown output in Preview**) — each performs
  type/click/assert and captures before/after screenshots.

Both run via an aggregate `verify:ui` script and in CI (headless). They use a mocked or local stub
provider — never a real external LLM.

### 4.2 Markdown rendering (E2E)
| # | Journey | Steps (abridged) | Expected outcome |
|---|---|---|---|
| E7 | **Render Markdown output** | run an action whose output is Markdown (table + fenced code + a `mermaid` block) → ensure format is Markdown → Preview | the table, a **syntax-highlighted** code block, and a **mermaid SVG** render, styled with the design tokens; no console errors; no horizontal overflow; switch to **Source** shows raw text and **Diff** shows the word diff |
| E8 | **Theme consistency of Preview** | with Markdown output shown, toggle Light ↔ Dark | the rendered document (including code highlighting and the mermaid diagram) re-themes to match the app; no FOUC |
| E9 | **Untrusted output is inert** | output containing raw `<script>`/`<img onerror>` and a `javascript:` link → Preview | HTML is shown literally (not executed); the disallowed-scheme link is inert; an `https:` link opens in the OS browser, not the app window |

---

## 5. (D) Regression testing

### 5.1 Preserved behaviors (must not regress)

| Behavior | Pinned by | Assertion |
|---|---|---|
| **Single-action processing parity** | integration test mirroring `handler_integration_test.go` | proofread/rewrite/format/summarize/translate single actions still produce the expected transformed output via the single-step chain path |
| **Same-language translate optimization** | unit + integration | translate with `inputLang == outputLang` returns input unchanged, no LLM call |
| **Task logging** (diagnostic) | `internal/tasklog` tests | per-step daily JSONL with full system/user prompts is still written when `EnableTaskLogging` is on; unchanged by the new history feature; independent toggle |
| **Settings persistence** | settings/db repo tests | the four config groups + providers + languages persist across an app restart (DB reopen); `ResetSettingsToDefault` returns to fresh-seed state with 5 default providers and the default current provider |
| **Five default providers / default current** | seed + reset tests | a fresh install and a factory reset both yield exactly 5 default providers and a defined default current provider |

### 5.2 CI guards (build fails on violation)

| Guard | Command / check | Fails the build when |
|---|---|---|
| **No MUI / Emotion** | grep the frontend dependency tree and source for `@mui` and `@emotion` | any `@mui/*` or `@emotion/*` import or dependency is present (MUI is removed in v3; Radix + tokens replace it) |
| **sqlc drift** | `sqlc generate --diff` | the committed `internal/db/store` differs from what the migrations + queries would generate |
| **Go data races** | `go test -race ./...` | any test trips the race detector |
| **Wails health** | `wails doctor` | the Wails toolchain/environment is unhealthy |
| **Go vulnerabilities** | `govulncheck ./...` | a known vulnerability affects a reachable symbol |
| **Frontend vulnerabilities** | `npm audit` (fail threshold pinned) | a dependency vulnerability at/above the threshold is found |
| **Coverage floor** | `go test -coverprofile` + `jest --coverage` | aggregate coverage drops below the §1.4 bar |

> The "no `@mui`/`@emotion`" guard is load-bearing for this redesign: the current
> `frontend/package.json` still lists `@mui/material`, `@mui/icons-material`, `@emotion/react` and
> `@emotion/styled`. The guard exists precisely to prove those are gone once the Radix migration
> lands, and to prevent reintroduction.

---

## 6. (E) Edge-case testing

Each edge case maps to a layer, a trigger, the required behavior, and the test that pins it.

| Edge case | Layer | Trigger | Required behavior | Pinned by |
|---|---|---|---|---|
| Empty input | actions pre-flight | Run with empty input | blocked pre-flight; no LLM call; `validation` | unit + E2E |
| Same-language translate | prompts/actions | `inputLang == outputLang` | no-op pass-through (output = input) | unit + integration (§3.2) |
| Exclusivity violation | Planner | second action in the same exclusivity group | UI greys/replaces; backend rejects with `invalid_plan` | unit (§2.1.3) |
| Cap violation | Planner | > 5 steps or > 3 inference groups | blocked in UI; backend `invalid_plan` | unit (§2.1.3) |
| Terminal pinning | Planner | summarize/translate/prompteng clicked before non-terminal actions | forced last regardless of click order | unit (§2.1.3) |
| Missing credential | llms token resolution | `authScheme != none`, env var unset | `missing_credential`, no HTTP call | unit + integration (§3.1) |
| Provider unreachable | transport | bad host / dial failure | `provider_unreachable` (retryable) | integration (§3.1) |
| Timeout | transport | response slower than timeout | `timeout` (retryable) | integration (§3.1) |
| Rate limited | provider HTTP | `429` (+ `Retry-After`) | `rate_limited`; honors `Retry-After`; retried below the boundary | integration (§3.1) |
| Model not found | provider HTTP | `404` | `model_not_found` (non-retryable) | integration (§3.1) |
| Context window exceeded | provider/pre-flight | over-long merged/multi-pass input | `context_window` (non-retryable) | integration |
| Removed action in a saved stack | stacks/history | a saved stack references a deleted action id | drop with warning on load; entry/preview still readable; restore loads text, warns on drift | unit + FE integration (§3.7) |
| History disabled | history service | `history.enabled = false` | new runs not recorded; existing entries preserved; empty/"disabled" state | unit (§2.1.5) + FE |
| Fresh-install seed | db | empty DB on first `Open` | migrate → seed 5 providers + languages + settings → default current | integration (§3.4) |
| Factory reset | db | `ResetSettingsToDefault` | wipe + reseed; equals fresh-seed state | integration (§3.4) + regression |
| Large I/O | history / editors | very large input/output | stored whole (retention bounds size); list preview truncated, detail full; UI stays responsive | unit + E2E |
| Theme auto OS-flip | theme (FE) | OS switches light↔dark while in Auto | UI updates live via `matchMedia`, no restart | unit (§2.2) + E2E |
| Panic → recovery | handler boundary / FE | a panic in a bound call; a render error | handler returns an `internal` envelope (belt-and-suspenders on Wails recover); React error boundary shows a recoverable "Reload" fallback; `window.onerror`/`unhandledrejection` route to `notifyError({code:'internal'})` | Go panic-recovery test + FE error-boundary test |

---

## 7. (F) Acceptance criteria & test scenarios per major feature

Acceptance criteria are written **Given/When/Then**. Each is directly testable; the right-hand
column names the layer that verifies it.

### 7.1 Providers

| # | Given / When / Then | Verified by |
|---|---|---|
| P1 | **Given** a provider of any of the five kinds, **when** a request URL is built, **then** it matches that kind's profile template (azure puts the deployment in the path and adds `api-version` only when set) | unit |
| P2 | **Given** `authScheme = bearer`/`apiKey`, **when** the request is built, **then** the secret is read from `apiKeyEnvVar` at request time and placed in the correct header; the secret is never persisted or logged | unit + redaction |
| P3 | **Given** a discovery response in `{data:[]}` form **or** a bare array, **when** parsed, **then** both normalize to the same `[]ModelInfo` | unit |
| P4 | **Given** a rich azure catalog, **when** parsed, **then** chat models are kept, non-chat filtered, and `Caps` extracted | unit |
| P5 | **Given** a provider, **when** Test connection / models / inference run, **then** each returns a typed Result + duration and never blocks Save | integration |
| P6 | **Given** the current provider is deleted, **when** the delete commits, **then** current repoints to the first remaining provider or NULL, atomically | integration |

### 7.2 Inference & chain

| # | Given / When / Then | Verified by |
|---|---|---|
| I1 | **Given** a single action, **when** Run, **then** exactly one inference runs and the final output renders once | integration + E2E |
| I2 | **Given** a multi-step stack, **when** Run, **then** groups run sequentially, output→input, with provider/model/temperature fixed for the whole chain | integration |
| I3 | **Given** group *k* fails after retries, **when** the run ends, **then** completed output + the typed error + `FailedIndex=k` are returned together; earlier work is kept | integration |
| I4 | **Given** a running chain, **when** cancelled, **then** it stops after the current group and keeps the partial result (`cancelled`) | integration |
| I5 | **Given** a transient failure (`timeout`/`429`/`5xx`/unreachable), **when** retries remain, **then** it retries below the boundary and the user sees an error only after retries are exhausted | integration |
| I6 | **Given** an inference already in progress (a run or a Test inference), **when** a second run or Test inference is requested, **then** it is rejected immediately with `busy` (no LLM call) and the in-flight one is unaffected; **at most one inference runs app-wide** | integration |
| I7 | **Given** a run finishes, fails, is cancelled, or panics, **when** it ends, **then** the single-flight gate is released and the next run/Test inference can start | integration |
| I8 | **Given** an inference is in progress, **when** the editor is shown, **then** the UI disables every start trigger (Run, My Stacks Run, ⌘K run, Test inference) and re-enables them when it ends | component + E2E |

### 7.3 Stacks (builder & engine)

| # | Given / When / Then | Verified by |
|---|---|---|
| S1 | **Given** actions added in any order, **when** planned, **then** canonical order is applied and terminal actions are pinned last | unit |
| S2 | **Given** a duplicate exclusivity group or > 5 steps / > 3 groups, **when** planned, **then** the build is invalid (`invalid_plan`) | unit |
| S3 | **Given** same-family mergeable neighbours, **when** grouped, **then** they collapse into one inference | unit |
| S4 | **Given** a saved stack, **when** loaded/run, **then** its ordered steps and defaults are restored; unknown action ids are dropped with a warning | unit + FE |

### 7.4 History

| # | Given / When / Then | Verified by |
|---|---|---|
| H1 | **Given** a completed run, **when** recorded, **then** exactly one entry per run is added (single = one; stack = one with the applied-actions snapshot) and pruned to `maxEntries` | unit |
| H2 | **Given** `history.enabled = false`, **when** a run completes, **then** nothing is recorded and existing entries are preserved | unit |
| H3 | **Given** a partial/error run, **when** recorded, **then** `status` + `error_code` + `failed_index` + partial output are stored | unit |
| H4 | **Given** a history entry, **when** Restore, **then** editors populate and the action/stack re-arms if valid (text-only fallback on drift) | FE integration + E2E |
| H5 | **Given** a `Record` failure, **when** it occurs, **then** it is logged and swallowed — the run is not failed | unit |

### 7.5 Prompts (engine & Inspector)

| # | Given / When / Then | Verified by |
|---|---|---|
| PR1 | **Given** a group, **when** composed, **then** output is two-tier (one family system prompt + concatenated directives) with shared context injected once | unit |
| PR2 | **Given** the same request, **when** previewed via `PreviewPrompt` and when run, **then** the composed prompts are identical (shared `BuildPlanAndPrompts` — no drift) | unit/integration |
| PR3 | **Given** a multi-step stack, **when** previewed, **then** the Inspector shows merge groups (fewer prompts than steps) + the output→input flow + an inference summary | FE + E2E |
| PR4 | **Given** a preview, **when** rendered, **then** `{{user_text}}` shows as a marked placeholder (or sample-injected for group 1) and contains no credentials | unit + FE |

### 7.6 Settings & persistence

| # | Given / When / Then | Verified by |
|---|---|---|
| C1 | **Given** any config-group change, **when** saved, **then** the corresponding KV keys upsert and reassemble into the typed struct on read | unit |
| C2 | **Given** an app restart, **when** settings are read, **then** providers, languages, and the four config groups persist | integration |
| C3 | **Given** a fresh install, **when** the DB opens, **then** it migrates and seeds; **given** factory reset, the state returns to fresh-seed | integration |

### 7.7 Error handling

| # | Given / When / Then | Verified by |
|---|---|---|
| ER1 | **Given** any classified `AppError`, **when** mapped at the boundary, **then** the wire payload carries only `code/title/message/details/retryable` and the log carries the full chain | unit |
| ER2 | **Given** an unclassified error, **when** mapped, **then** the wire code is `internal` and retryable | unit |
| ER3 | **Given** an error envelope on the FE, **when** unwrapped, **then** `notifyError` renders the exact copy for that code with `details` interpolated, routed toast-vs-inline | FE unit |
| ER4 | **Given** a partial chain envelope, **when** unwrapped, **then** the partial data is rendered **and** the error is surfaced | FE unit |

### 7.8 Logging

| # | Given / When / Then | Verified by |
|---|---|---|
| L1 | **Given** a configured level, **when** logging, **then** records below the level are suppressed and the level is runtime-settable | unit |
| L2 | **Given** a record containing a token/secret/header, **when** emitted, **then** the secret is redacted and only the env-var name appears | unit |
| L3 | **Given** an operation, **when** timed, **then** `duration_ms` and `component`/`op` are structured fields, not concatenated strings | unit |

### 7.9 Theming

| # | Given / When / Then | Verified by |
|---|---|---|
| T1 | **Given** mode `auto`, **when** resolved, **then** effective theme follows `matchMedia`; **when** the OS flips, the UI updates live | unit + E2E |
| T2 | **Given** mode `light`/`dark`, **when** applied, **then** the OS is ignored and the `.dark` root class reflects the choice | unit |
| T3 | **Given** a stored `ui.theme`, **when** the app loads, **then** the theme is applied before first paint (no FOUC) and persists across restart | integration + E2E |

### 7.9a Markdown rendering (see `16-markdown-rendering.md`)
| # | Given / When / Then | Verified by |
|---|---|---|
| M1 | **Given** Markdown output (GFM table, task list, fenced code, math, mermaid), **when** Preview, **then** all render correctly, styled with design tokens, identical in light and dark | unit (RTL) + E2E (Chromium) |
| M2 | **Given** output containing raw HTML / a `javascript:` link, **when** rendered, **then** HTML is inert (not executed) and the link does not navigate the app window; allowed links open in the OS browser | unit (RTL) |
| M3 | **Given** Plain output format, **when** Preview, **then** text is shown literally (no Markdown parsing); **Source** shows raw text; **Diff** shows the word diff | unit + E2E |
| M4 | **Given** an invalid `mermaid` block, **when** rendered, **then** an inline error is shown and the rest of the document still renders | unit (mermaid mocked) |
| M5 | **Given** the same content, **when** shown in the Output Preview and the About Guide, **then** both use the one `MarkdownView` and render identically | unit |

### 7.10 About·Info / Prompt Inspector

| # | Given / When / Then | Verified by |
|---|---|---|
| A1 | **Given** the About window, **when** opened, **then** Guide + Actions & Stacks render with dynamic paths/version from `AppSettingsMetadata` | FE + E2E |
| A2 | **Given** an action/stack, **when** clicked, **then** the Inspector dialog opens and calls `PreviewPrompt` (no LLM call) | FE |
| A3 | **Given** an item referencing a changed/removed action, **when** previewed, **then** the preview validates against the live catalog and flags missing actions | FE |

### 7.11 UI (interaction rules)

| # | Given / When / Then | Verified by |
|---|---|---|
| U1 | **Given** no armed action or empty input, **when** rendered, **then** Run is disabled; copy/clear are disabled when their target is empty; Save (stack) is disabled with 0 steps | component |
| U2 | **Given** any destructive action (factory reset, delete provider/stack, clear history), **when** invoked, **then** an AlertDialog confirms before the operation | component + a11y |
| U3 | **Given** a long async op, **when** running, **then** a spinner/progress shows; results/errors are typed; no raw stack trace appears | component + E2E |
| U4 | **Given** the toolbar and Settings, **when** provider/model/lang/format/layout/theme change in one, **then** both reflect the same state (single source of truth) | integration |

---

## 8. Accessibility testing

Accessibility is a first-class, automated obligation, leveraging Radix primitives (which supply ARIA
roles and focus management) plus explicit assertions.

### 8.1 Automated audits (`jest-axe`)

Every interactive view/component renders into a `jest-axe` `axe()` check that must report **zero
violations**, in both light and dark themes:

| Surface | Component(s) |
|---|---|
| Editors | Input pane, Output pane (Preview/Source/Diff), per-pane buttons |
| Toolbar | provider Select, model picker, language popover, format/view/layout segmented controls |
| Sidebar | actions list, My Stacks list, search |
| Run bar / builder | armed chip, family-group chips, live counter |
| History rail | entry cards, header, empty/disabled states |
| Overlays | Dialog (Save-stack, Prompt Inspector), Select (provider), Menu (stack context), Tabs (Settings, About), Toast region, AlertDialog |
| Settings | all seven sections incl. Appearance |
| Forms | TagInput, KvEditor, env-var field, steppers, switches |

### 8.2 Keyboard navigation (explicit)

| Surface | Keyboard requirement |
|---|---|
| **Dialog** (Save-stack, Prompt Inspector, ⌘K palette) | opens focused; focus is trapped inside; `Esc` closes and restores focus to the trigger; `Tab`/`Shift+Tab` cycle within |
| **Select** (provider) | opens with `Enter`/`Space`/arrows; arrow keys move options; `Enter` selects; `Esc` closes; type-ahead works |
| **Menu** (stack context, language row ⋮) | arrow keys move items; `Enter` activates; `Esc` closes; focus returns to trigger |
| **Tabs** (Settings vertical nav, About nav) | arrow keys move between tabs; `Home`/`End` jump; only the active tab panel is in the tab order |
| **Command palette ⌘K** | `↑`/`↓` navigate; `Enter` runs the action; `Shift+Enter` adds to stack; `Esc` closes |
| **TagInput** | `Enter` adds; `Backspace` on empty removes the last chip; chips reachable and removable by keyboard |
| **Focus order** | logical, visible focus indicators on every interactive element; no keyboard trap outside intended dialogs |

### 8.3 Other a11y assertions

- Icon-only buttons expose an accessible name (label/tooltip).
- Color is never the sole signal: the Diff view pairs color with strike-through / added markers;
  status chips pair color with text.
- Both light and dark token sets meet WCAG AA contrast (asserted on representative pairings).
- Toasts and inline validation are announced (appropriate ARIA live region / role).

---

## 9. Test conventions & invariants

1. **Hermetic.** No real network, no real provider, no real user config. Providers → `httptest`;
   DB → in-memory/temp SQLite + `goose.Up`; environment variables sandboxed and restored per test
   (as in the existing integration tests).
2. **Typed, not string.** Assert on `ErrorCode` / `WireError.code`, never on message substrings
   (FE copy is owned by `notifyError` and may change / be localized).
3. **Table-driven** where the input space is enumerable (provider kinds, status codes, error codes,
   canonical-order permutations).
4. **Deterministic.** No reliance on wall-clock ordering beyond `created_at DESC`; no sleeps except
   the controlled delay used to provoke timeouts.
5. **Shared path proven.** Inspector preview and real run are asserted identical (no drift).
6. **Race-clean.** The whole Go suite passes under `-race`.
7. **Generated code excluded** from coverage and not hand-edited; drift is caught by
   `sqlc generate --diff` and `wails generate module`.
8. **Source paths are repo-root-relative** throughout (`internal/…`, `frontend/src/…`).

---

## 10. Test inventory summary

| Area | Backend tests | Frontend tests |
|---|---|---|
| Errors | `apperr` mapping; classification per source | `unwrap`/`tryUnwrap`; `notifyError` copy; toast-vs-inline |
| Providers/inference | profiles, discovery, capabilities; status→code; chain run/cancel/partial; verification | model picker, refresh, run/progress UI |
| Stacks | Planner (order/dedupe/cap/merge); Composer (two-tier); orchestrator | builder mirror; Save dialog; My Stacks/Manage |
| Persistence | settings/stack/history repos; migrations Up/Down; seed/reset | settings forms; theme persistence |
| History | add+prune; ordering; clear; record gating | rail; restore; settings controls |
| Logging | level; redaction; structured fields | — |
| Prompts/Inspector | `BuildPlanAndPrompts` parity | Inspector dialog; copy; placeholders |
| Theming | (settings KV) | resolve/apply; auto OS-flip |
| Resilience | handler-boundary panic → `internal` | error boundary; global hooks |
| Accessibility | — | `jest-axe` zero-violations; keyboard nav (Dialog/Select/Menu/Tabs) |

---

## 11. Verification pipeline & mandatory workflow

Testing is not only a suite of files — it is a **gated pipeline every change runs through before it is
considered done**. The harness that makes the pipeline runnable (scripts, Playwright, the two dev
servers, the bridge mock, CI wiring) is built once in **task T00** (`14-implementation-plan.md`) and is
a prerequisite for all feature tasks.

### 11.1 The gated pipeline (run in order; each gate must pass)

| # | Gate | Command (indicative) | Fails when |
|---|---|---|---|
| 1 | **Format** | `npm run format` (FE) · `gofmt`/`goimports` (Go) | files are not formatted |
| 2 | **Lint / type-check** | `npm run lint` + `tsc --noEmit` (FE) · `go vet ./...` | a lint or type error exists |
| 3 | **Backend unit + integration** | `go test -race ./...` | any Go test fails or the race detector trips |
| 4 | **Frontend unit + a11y** | `npm test` (Jest + RTL + `jest-axe`, coverage) | a test fails or coverage drops below §1.4 |
| 5 | **Codegen drift** | `sqlc generate --diff`; `wails generate module` (tree clean) | generated `store`/bindings differ from source |
| 6 | **Build** | `go build ./...` and `cd frontend && npm run build` (and a `wails build` smoke before release) | either build fails |
| 7 | **UI verification — Target A** | start `npm run dev`, then `npm run verify:ui` (Playwright: routes × ≥3 widths × 2 themes + interaction smoke incl. Markdown) | overflow, console/page error, fallback-serif font, missing key element, or a smoke flow fails |
| 8 | **UI verification — Target B** | start `wails dev`, then `BASE_URL=http://localhost:34115 npm run verify:smoke` (bridge-dependent journeys) | a backend-connected journey fails |
| 9 | **CI guards** | `@mui`/`@emotion` absent · `govulncheck ./...` · `npm audit` · `wails doctor` | any guard reports a violation |
| 10 | **Clean tree** | `git status` | uncommitted generated/formatted files remain after the pipeline |

CI runs the same gates (gates 7–8 headless). A change merges only when the whole pipeline is green.

### 11.2 Per-task live verification (after every task)

Every implementation task ends by running the pipeline — **at minimum the gates relevant to the side it
touched, always including live UI verification (gate 7) for any frontend change.** A frontend task is
not "done" until the rendered app has been driven in Chromium against a running dev server and the UI
gates pass; a backend task is not "done" until `go test -race` and the affected handler/journey pass.
This per-task live-Chromium check is mandatory, not optional — it is the step that catches what unit
tests cannot (layout overflow, runtime console errors, theming regressions, broken bridge wiring).
Screenshots are written to a scratch directory (`frontend/.tmp/verify-screens/`) for review.

### 11.3 Verification rule — scope is the whole branch, not the diff

If a unit test, lint check, type check, or UI gate fails **anywhere on the branch**, it is in scope and
must be fixed (or logged as an explicit, tracked task) before the change is done. "Pre-existing" or
"not introduced by this change" is **not** a valid reason to ship a known-red gate. Acceptance
explicitly includes: the UI verification exits clean with **zero** overflow / console-error / font
failures across all routes at every width and both themes; a non-zero count fails the task regardless of
who introduced it.

### 11.4 Definition of done (per task)

A task is done only when: code builds; backend tests pass under `-race`; frontend unit + a11y tests pass
and coverage holds; the relevant Target-A UI gates and any Target-B journeys pass; codegen is in sync;
docs in the task's "Documentation updates" are applied; every acceptance criterion is demonstrably met;
and the working tree is clean. This is enforced by `15-ai-agent-execution-template.md`.
