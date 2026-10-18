# Design

## Context

`proposal.md` gives the motivation. `docs/analysis/2026-10-13-proofreading-quality-review.md` gives the evidence,
cited below as "doc §N". This is the current code the design builds on. Symbols are authoritative; line numbers are
hints only.

- **Error mapping.**
  - `llms/http_errors.go` `mapHTTPStatus`:
    - 401/403 → `Auth`;
    - 404 → `ModelNotFound`;
    - 429 → `RateLimited`;
    - 400 → `ContextWindow` when `isContextExceededBody` matches;
    - every other status, including 400, 408, 413 and 5xx → `Upstream`. `Upstream` is retryable, titled
      "Provider error", and gets a nil cause.
  - The body is read only in the 400 branch.
  - Callers: `openai_provider.go` (Chat and ListModels) and `ollama_native.go`.
  - The `<provider>` in messages is the provider's display name (`cfg.Config.Name`).
- **Errors on the wire.**
  - `apperr.ToWire` logs the cause once and returns `{code,title,message,details,retryable}`.
  - In a chain, `RunChain` (`actions/orchestrator.go`) wraps every step error in `apperr.StepFailed`. Its details carry
    only `inner`, `innerCode` and `innerTitle`.
- **Request data flow (three shapes).**
  1. `actions.newChatCompletionRequest` builds a wire `llms.ChatCompletionRequest` (`llms.go`, with `N`, `Options` and
     `Stream`). It sets temperature and the token limit from `ModelConfig`.
  2. `llms.chatRequestFrom(req, modelCfg)` (`llms/service.go`) converts that into the internal `llms.ChatRequest`
     (`provider.go`). It re-reads `UseLegacyMaxTokens` and `NumCtx` from `ModelConfig`.
  3. Each provider builds its own body. `openai_provider.go` `Chat` sends `stream:false, n:1`, temperature, and
     `max_tokens` or `max_completion_tokens`. `ollama_native.go` sends `options{temperature,num_ctx,num_predict}`.
  - Verification (`verification/service.go` `TestInference`) builds a `ChatRequest` by hand. It repeats the same
    `ModelConfig` logic and calls `p.Chat` once under `gate.TryAcquire`.
  - `TestConnection` only lists models and takes no gate.
- **Completion results.**
  - `GetCompletionResponse` and `GetCompletionResponseForProvider` return `(string, error)`.
  - `chatOnce` drops `ChatResponse.FinishReason` and `Usage`.
  - Callers are only in `actions/service.go`: the `GetCompletionResponse` wrapper, the ForProvider wrapper, and
    `runStep`.
  - The Ollama response struct does not parse `model`, although Ollama sends it.
- **Task log.**
  - `runStep` writes one `tasklog.TaskLogEntry` per inference group, with `SchemaVersion: 1` hard-coded and
    `Model = cfg.ModelConfig.Name`.
  - `tasklog` checks `EnableTaskLogging` itself and writes `tasks-<date>.jsonl`.
- **Prompts.**
  - `Composer.systemPrompt` switches on family: rewrite always gets `SysRewrite`, proofread included.
  - `singleStepUserPrompt` fills `{{input_language}}`/`{{output_language}}` (`composer.go` tokens) only in user prompts.
    `SysTranslate` uses the same tokens, so they reach the model unfilled. Language IDs are names ("English").
  - Planner: `maxSteps = 5`, `maxInferences = 3`. `mergeGroups` merges same-family Mergeable steps. All five proofread
    entries share `ExclProofread`.
  - Starter stacks are in `db/db.go` and are tested by `internal/stacks/starter_stacks_plan_test.go`.
- **Frontend.**
  - `notifications/slice.ts` `buildNotification` rebuilds text from `wire.code` and ignores `wire.title`.
    `NotificationContainer` never renders `details`.
  - `logic/adapter/envelope.ts` `unwrap` already toasts every error.
  - `settings/thunks.ts` `testProviderInference` rejects with `.message` only. The outcome lives in `VerificationPanel`
    local state.
  - `ModelConfigTab` edits a local form and saves through `updateModelConfig`. It has a "Token-limit parameter" radio.
  - No `Collapsible` primitive exists.
  - Jest maps `wailsjs` to `frontend/__mocks__/wailsModels.js`.
  - The bridge mock selects scenarios with `mockParam` URL flags. `verify:ui` runs only `e2e/verify-ui.spec.ts`.
- **Local probes (2026-10-18).**
  - Ollama accepts `think:false` on thinking and non-thinking models.
  - `think:"low"` on a non-thinking model (`qwen2.5:1.5b`) returns 400 `"<model>" does not support thinking`.
    gemma4 accepts `"low"`.
  - LM Studio accepts `reasoning_effort:"low"`.
  - Installed eval models: Ollama `gemma4:e4b-mlx`, `gemma4:26b-mlx`, `gpt-oss:20b`.

## Goals / Non-Goals

**Goals:**
- One place classifies provider HTTP errors, with sanitized provider text and hints. Chains and verification both get it.
- One place applies `ModelConfig` to a request, shared by chains and the inference test.
- A developer eval runs the production chain path and uses the same guards as the task log.

**Non-Goals:**
- No per-provider or per-model settings, and no learned capabilities (doc R7).
- No guard UI, diff default or auto-fix.
- No DB table or migration.
- No external eval tooling, and no re-implemented prompt assembly.

## Decisions

### D1. Error classification lives in `llms/http_errors.go`

- **Code and constructor.**
  - Add `apperr.CodeInvalidRequest = "invalid_request"` and register it in `main.go` `allErrorCodes`.
  - The constructor is `apperr.InvalidRequest(r ProviderRejection)`, where
    `ProviderRejection{Provider, Status, Message, Param, Hint string}`. A struct keeps it within the 3-parameter rule.
  - It sets title "Request rejected", `Retryable:false`, and Details `provider`, `statusCode`, `providerMessage`, plus
    `param` and `hint` when present.
- **Upstream.** `Upstream` changes to `Upstream(r ProviderRejection)`. Its only callers are in `mapHTTPStatus`. It adds
  `providerMessage` when `r.Message` is non-empty and keeps its current title, message and retryable flag. Both
  constructors use the sanitized excerpt as the cause.
- **Body parsing.** `mapHTTPStatus` reads the body once for every non-2xx status.
  - `parseProviderError(body) (msg, param string)` tries `{"error":{"message","param"}}`,
    `{"error":{"type","message"}}` and `{"error":"…"}`. Otherwise it uses plain text, and an empty body gives "no details".
  - `sanitizeExcerpt` redacts `Bearer …`, `sk-…`, key/token pairs and URL queries, then caps the text at 300 runes
    with "…".
  - `hintForParam(param, msg) (param, hint)` implements the spec table in "Rejected parameters produce a settings hint".
    It holds one ordered slice of `{param, match, hint}` rows; the first match wins.
- **Status mapping.**
  - 400 checks `isContextExceededBody` first.
  - 400, 422 and other unlisted 4xx (including 413) → `InvalidRequest`.
  - 408 → `Timeout`.
  - 5xx and anything else → `Upstream`.
- **Provider text in `Message`.** ErrorEnvelopeRules §8 forbids raw internal error strings in `Message`. The provider
  excerpt is different: it is external text the user needs, sanitized and capped. Putting it in `Message` is a deliberate
  exception. Internal Go errors still never reach `Message`.
- **Logging.** The sanitized excerpt is the `AppError` cause, so `ToWire` logs it once.
- **Retries.** `chatWithRetry` already skips non-retryable errors, so it needs no change.
- **Chain propagation.** `apperr.StepFailed` copies the inner error's `hint`, `param` and `providerMessage` details,
  if present, into its own details (spec "Failed steps keep the provider diagnosis").
- **Rejected:** reusing `Validation` for 400s. That code means the user's input is invalid and has its own toast text.

### D2. The completion result carries metadata

- **Type.** `GetCompletionResponse` and `GetCompletionResponseForProvider` return `llms.Completion{Content, ServedModel,
  FinishReason string; PromptTokens, CompletionTokens int; RequestHost, RequestPath string}`.
- **Sources.**
  - `ChatResponse` gains `Model`, `RequestHost` and `RequestPath`.
  - The OpenAI provider fills them from the response `model` and the built URL, without the query.
  - The Ollama native provider adds `model` to its response struct.
  - `chatWithRetry` and `chatOnce` return the `Completion`.
- **Callers.** The two `actions/service.go` wrappers and `runStep` use `.Content`. In `runStep`, `FinishReason ==
  "length"` logs a zerolog warning with `component`, `op`, `run_id` and `provider`.
- **Markers.** `isEdgeMarker(output)` (exact match after trim) fails the step with `apperr.EmptyCompletion`.
- **Mocks.** The mocks in `actions` and `llms` tests change signature.
- **Rejected:** a metadata callback. It adds indirection with no second caller.

### D3. Provider request hygiene

- Remove `N` from `ChatCompletionRequest` and from the OpenAI body.
- `buildCompletionURL` adds `api-version` when `cfg.APIVersion != ""` and the path has no `api-version=` yet, using `&`
  when the path already has a `?`. Reuse `buildModelsURL`'s logic.
- `llms.IsPinnedCompletionPath(cfg *settings.ProviderConfig) bool` is true for kind `azure` or `openai` whose
  `CompletionPath` contains `deployments/` but not `{deployment}`. Every `openai` preset stores `v1/chat/completions`
  (`db.go` `defaultCompletionPath`), so a non-empty path alone is not a signal. `TestConnection` and `TestInference` append the spec's warning to
  `VerifyOutcome.Warnings`.

### D4. Reasoning mode and one shared model-config helper

- **Setting.** `ModelConfig.ReasoningMode string`, with values `default|off|low`, added to both `settings.ModelConfig`
  and the bound `apperr.ModelConfig` (`settings/handler.go` converts between them directly).
  `SettingsService.UpdateModelConfig` normalizes `""` and unknown values to `default`, because older callers and mocks
  send none.
  - It is stored under KV key `model.reasoningMode` through `getString` with fallback `default`. Unknown values read as
    `default`.
  - It follows the "Adding a Small Persisted Preference" recipe, next to the other `model.*` keys in
    `repository_sqlite.go`.
- **Shared helper.** `llms.ApplyModelConfig(req *ChatRequest, cfg *settings.ModelConfig)` (new
  `llms/request_options.go`) sets these on the **internal** `ChatRequest`:
  - Temperature when `UseTemperature`;
  - MaxTokens and `UseLegacyMaxTokens` when `UseMaxOutputTokens`;
  - NumCtx when `UseContextWindow`;
  - `ReasoningMode`.
  - Callers: `chatRequestFrom` (the chain path) and `TestInference`. `chatRequestFrom` copies only model, system and
    messages from the facade request, then calls `ApplyModelConfig` (a nil cfg applies nothing). `ModelConfig` is the
    only source of the optional fields. `ChatCompletionRequest` keeps `Temperature`/`MaxTokens`/`MaxCompletionTokens`
    and gains `ReasoningEffort`, because it is also the OpenAI wire body.
  - `newChatCompletionRequest` stops setting temperature and token fields; it builds only model and messages. The
    duplicated block in verification is deleted. The tests in `actions/chat_request_test.go` move to the helper.
- **Wire mapping per provider.** Each provider already owns its body, so no kind switch is needed.
  - **Ollama native:** `default` sends no `think`; `off` sends `think:false`; `low` sends `think:"low"`. The `Think` field
    is `any` with `omitempty`.
  - **OpenAI-compatible body** (all other kinds): `low` sends `reasoning_effort:"low"`; `default` and `off` send nothing.
- **Research behind it** (local probes above): `off` is safe on every Ollama model. `low` on a non-thinking model
  returns a 400. That 400 becomes `invalid_request` with the `reasoning` hint (D1), and the inference test names it (D5).
- **UI.** `ModelConfigTab` gets a "Reasoning" `Select` (existing primitive). The options are "Provider default",
  "Off" and "Low", held in the same local form and saved by the existing `updateModelConfig` thunk.

### D5. The inference test as a diagnosis

- **Flow in `TestInference`.** The test holds the gate for the whole sequence. Each call gets its own
  `timeoutSeconds` context, so a cold model load on the bare call cannot use up the budget for later calls.
  1. Send a bare `ChatRequest{Model, Messages:[user "Reply with OK."]}`. If it fails, return that error.
  2. If any optional setting is on, send the full request built with `ApplyModelConfig`.
  3. If the full request fails with `CodeInvalidRequest`, clone it and remove one field per try: Temperature →
     MaxTokens → NumCtx → ReasoningMode. Report the first removal that succeeds, using the spec hint template.
     - The rejected parameter is `temperature`, `max_output_tokens`, `context_window` or `reasoning`. For the token
       limit, use the rejection's `param` instead when it is `max_tokens` or `max_completion_tokens`.
     - The settings hint is the rejection's `hint` detail when present. Otherwise use the exported
       `llms.SettingHint(param)`, which reads the same table as D1's `hintForParam`.
  4. If no single removal succeeds, report the combined-settings hint.
  - Any other error code from step 2 fails the test with that error.
- **Outcome.** `VerifyOutcome` gains `RejectedParam`, `Hint` and `Warnings []string`.

### D6. Frontend error display

- **Toasts, for all codes.** `buildNotification` uses `wire.title` and `wire.message` when they are non-empty. The
  existing per-code text becomes the fallback. `hint` and `providerMessage` are copied from `details` into the
  notification model.
  - Existing slice and `NotificationContainer` tests that assert per-code text are updated.
  - The backend `Message` texts in `apperr.go` are reviewed for user-facing wording. Only wording changes, no code
    changes.
- **Rendering.** `NotificationContainer` renders the hint line and a new `ui/primitives/Collapsible.tsx` (a thin
  `radix-ui` Collapsible wrapper with a CSS module, using tokens only) titled "Provider said".
- **Inference test.** `testProviderInference` rejects with the whole `WireError`. `VerificationPanel` renders
  `outcome.hint`, `outcome.warnings`, and on failure `message` plus `details.hint`.
- **Test fixtures.**
  - `frontend/__mocks__/wailsModels.js` gains `CodeInvalidRequest`.
  - The bridge mock `ActionHandler.ProcessPromptChain` returns a `step_failed` envelope (innerCode `invalid_request`,
    `hint`, `providerMessage`) when `mockParam('run-error')` is set.
  - `e2e/verify-ui.spec.ts` covers that toast.

### D7. `internal/textguard`: deterministic guards

- **Why a new package.** It has two callers, the task-log write path and the eval. It is pure functions with one
  responsibility.
- **API.**
  - `Check(input, output string) Result`.
  - `Result.Flags []string` uses the spec's flag names.
  - `Result.Metrics` holds counts: sentences, lines, politeness, hedges, protected tokens, tells, and the edit ratio.
- **Guards.**
  - Lines are non-empty lines only.
  - Sentences do not split on URLs, versions, decimals or "…".
  - Politeness covers please, could/can you, thanks and acknowledgements ("Ok, got it").
  - Hedges are counted per family:
    - maybe/perhaps/might/probably;
    - I think/believe/suppose/guess;
    - seems/looks like/appears;
    - would;
    - try to.

    Contractions are expanded first. A swap inside a family is not a loss; "would" → "will" is.
  - Protected tokens are URLs, `@mentions`, `[A-Z]+-\d+` IDs, numbers and inline code.
  - Tier-1 tells come from doc §9.3. They are normalized with `golang.org/x/text/unicode/norm` NFKC and case-folded.
    `x/text` is already a module dependency; it becomes direct. A tell counts only when the output has more of it than
    the input.
  - The edit ratio is word-level LCS similarity.
  - The calibration cases are in `docs/analysis/2026-10-17-eval-case-ideas.md` §4.
- **Lexicon.** Kept in one file, `lexicon.go`.
- **Runtime use.** `TaskLogService.LogTaskExecution` calls `textguard.Check(entry.InputText, entry.OutputText)` after its
  `EnableTaskLogging` check and stores `GuardFlags`. `actions` has no guard code, and disabled logging does no guard work.

### D8. Eval harness

- **Location.** `internal/actions/eval_test.go` with `//go:build eval`. It is package `actions`, so it reuses the stubs
  in `orchestrator_test.go` (`noopHistoryService`, `noopTaskLog`, and a settings stub like `orchestratorSettings`)
  without copying them.
- **Wiring.** It builds the real service exactly as `application.go` does:
  - `llms.NewProviderFactory(resty.New())`;
  - `llms.NewLLMApiService(logger, factory, settingsStub)`;
  - `prompts.NewPromptService(logger)`;
  - `actions.NewActionService(logger, promptService, llmService, settingsStub, noopTaskLog, noopHistoryService)`.
  - It then calls `RunChain`. The planner and composer are built inside `NewActionService`. The settings stub returns
    one provider and `ModelConfig` per target.
- **Configuration (env).**
  - `GOTEXT_EVAL_TARGETS`: `kind|baseURL|model[|ENV_VAR_NAME]` entries separated by `;`, for example
    `ollama|http://localhost:11434|gemma4:e4b-mlx`. A secret is read only through its env-var name.
  - `GOTEXT_EVAL_ACTIONS`: default `rewrite.proofread.basic,rewrite.proofread.enhanced`.
  - `GOTEXT_EVAL_TEMPERATURE`: default 0.2.
  - `GOTEXT_EVAL_REASONING`: default `off`.
  - `GOTEXT_EVAL_BASELINE`: an optional earlier `report.json`.
  - `GOTEXT_EVAL_OUT`: default `.tmp/eval/reports` (git-ignored).
  - `GOTEXT_EVAL_TIMEOUT`: per-call seconds, default 300. Retries are 0.
  - Relative paths resolve against the module root (the directory with `go.mod`), not the package directory that
    `go test` uses.
  - With no targets set, the test calls `t.Skip`.
- **Cases.** `internal/actions/testdata/eval/cases.jsonl` holds 40–60 synthetic cases.
  - Fields:
    - `id`;
    - `kind` (`failure`, `clean` or `seeded`);
    - `actions` (optional);
    - `input`;
    - `keep` (optional; substrings that must survive, with `|` alternatives);
    - `forbid` (optional);
    - `fixes` (optional; `[{wrong, right:[…]}]`);
    - `note`;
    - `inputLanguage`/`outputLanguage` (optional; translate needs them, and the harness defaults to English →
      Ukrainian).
  - The seed catalog and the anonymization rules are in `docs/analysis/2026-10-17-eval-case-ideas.md` §5–6.
  - The harness also loads git-ignored `.tmp/eval/cases/*.jsonl` when present.
- **Metrics.** Each metric is computed per action over the runs where it applies. An errored run (timeout,
  `empty_completion`, `invalid_request`, …) counts as a failure for every metric that applies to it, and the report
  lists it.

  | Metric | Definition | Target |
  |---|---|---|
  | Greeting/sign-off retention | runs without `greeting_dropped`/`signoff_dropped` ÷ runs whose input has one | 100% |
  | Politeness retention | runs without `politeness_lost` ÷ runs whose input has politeness | ≥ 98% |
  | Hedge retention | runs without `hedge_lost` ÷ runs whose input has a hedge | ≥ 95% |
  | Sentences kept | runs without `fewer_sentences` | ≥ 95% |
  | Line breaks kept | runs without `fewer_lines` | ≥ 95% |
  | Protected tokens | runs without `protected_token_lost`, plus every `keep` hit | 100% |
  | Tells introduced | runs with `tell_introduced` or a `forbid` hit | ≤ 2% |
  | Clean no-op | `clean` cases whose output equals the input after whitespace normalization | ≥ 80% |
  | Seeded recall | `fixes` where the output contains a `right` and not `wrong` ÷ all `fixes` | ≥ 85% |
  | Edit ratio, latency | reported only | none |

  | Action group | Metrics gated |
  |---|---|
  | `rewrite.proofread.*` | all |
  | `rewrite.intent.humanize`, `rewrite.tone.*` | retention rows, protected tokens, tells |
  | `summarize.*`, `translate.*`, `structure.*` | protected tokens, tells |

- **Report.** Each target × action gets `report.json` and `report.md`. They show metric, target, baseline, value and
  pass/fail, plus the failing cases with diffs.
- **Commands.**
  - `go test -tags eval -run TestPromptEval -timeout 90m -v ./internal/actions/`
  - `go vet -tags eval ./internal/actions/` keeps the file compiling.

### D9. Prompts

- **Proofread prompt and inference.**
  - Add `SysProofread` (doc §12.1 draft, without dashes) to `system.go`.
  - `Composer.systemPrompt` returns it when the group's first step has `Category == CatProofread`.
  - The five proofread entries become `Mergeable:false`, and `maxInferences` goes to 4. Only one proofread step fits
    per stack (`ExclProofread`), so no valid saved stack can break.
  - The proofread group's user prompt ends with "Return only the corrected text, keeping every sentence."
- **House style.**
  - A shared `houseStyle` constant (doc §12.4, at most 5 "do not add" items) is concatenated into every family's
    system prompt.
  - Two variants: `houseStyleTranslate` (dashes follow the target language) and `houseStylePromptEng` (only "no preface
    or offer").
  - Family notes from doc §9.4 go into the existing rules.
  - The `SysRewrite` licences are tightened as doc §12.4 describes.
- **Directives.**
  - New texts for basic, enhanced and humanize (doc §12.2–12.3).
  - `— A, B, and C —` patterns become "X: A, B and C" (doc §12.5) in `catalog.go` (62 em dashes) and `system.go` (36).
  - A catalog test scans every directive and system prompt for U+2014.
- **Translate tokens.** `Composer.Compose` applies the existing token replacer to the system prompt too.
- **Seeds.** The temperature seed in `db.seedSettings` and the fallback in `repository_sqlite.go` `GetModelConfig`
  become 0.2. Existing rows are untouched.
- **Reasoning default.** It stays `default`. The eval may recommend `off` in docs.

## Risks / Trade-offs

- **Under-correction.** A preserving prompt can leave real errors. → Seeded recall ≥ 85% is a release gate.
- **Sanitizer misses a secret shape.** → Redact the known shapes, cap at 300 characters, test with echoed keys, and
  never put the excerpt in URLs.
- **Diagnosis costs up to 5 extra calls,** in the Settings test only and under the gate.
- **The proofread split adds a call to proofread+X stacks.** → Accepted (doc §10 B4-lite). Reasoning `off` offsets it.
- **Guard false positives.** → Guards only flag. Thresholds live in the eval.
- **`think:"low"` on non-thinking Ollama models returns 400.** → `invalid_request` with the reasoning hint, and the
  test names it.
- **Vendors suggest temperature 1.0 for Gemma 4 and gpt-oss.** → The eval decides. The seed affects new installs only.

## Migration Plan

- No DB migration. `model.reasoningMode` falls back to `default`. The seed change affects new installs and "Reset to
  defaults" only.
- Bindings: run `wails generate module` in each task that changes a bound type (tasks 1, 5 and 6). `frontend/wailsjs` is
  generated and git-ignored; check the generated `models.ts`, and keep the Jest mock `frontend/__mocks__/wailsModels.js`
  in sync.
- Rollback is a plain revert. Older builds ignore the stored `model.reasoningMode`.

## Verification

- **Gates per task.** `go test -race ./...`, `gofmt -l .`, `go vet ./...`, `cd frontend && npm run verify` when the
  frontend changed, and `go vet -tags eval ./internal/actions/` once the eval exists.
- **Release gate for prompt changes.** This is a development rule, not app behavior.
  - Tasks 11 and 12 run the D8 eval on Ollama `gemma4:e4b-mlx` at temperature 0.2. They use the D8 metric table for the
    actions they change and set `GOTEXT_EVAL_BASELINE` to the task 10 report.
  - A metric whose baseline already misses its target must not regress.
  - After 3 prompt iterations that still miss a target, stop and ask the user.
  - Commit the summaries to `docs/analysis/evals/`.
- **`wails dev` scenarios** (local Ollama or LM Studio):
  - The inference test with a rejected setting shows the bare check passing and the hint.
  - A chain run against a 400 shows one attempt in the log and a "Step 1 failed" toast with the hint and "Provider said".
  - A pinned azure path shows the warning.
  - A proofread+humanize stack runs 2 inferences in the prompt inspector.
  - Task-log lines show `servedModel`, `promptVersion` and `guardFlags`.
