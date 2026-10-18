# Tasks

Integration branch: `feature/improve-llm-text-quality`, created from `master`, or from `feature/general-improvements`
if the user prefers. Each group is one task and one vertical slice, planned in a fresh planning-mode session. Design
sections are in `design.md`; requirement headings are in `specs/<capability>/spec.md`.

**Done criteria for every task:**
- Gates green: `go test -race ./...`, `gofmt -l .`, `go vet ./...`. Add `cd frontend && npm run verify` when the frontend
  or bindings changed, and `go vet -tags eval ./internal/actions/` from task 10 on.
- The task's `wails dev` check passed.
- The listed docs are updated.
- A Conventional Commit.

## 1. Honest provider request errors

**Goal.** HTTP 400, 422 and other unlisted 4xx become non-retryable `invalid_request` errors with the sanitized provider
message and a settings hint. 408 becomes `timeout`. 5xx stays `upstream` and also carries the excerpt. A failed chain
step keeps the hint and excerpt.

- **Implements:**
  - llm-providers: "Request errors are reported as rejected requests", "Only server failures are reported as retryable
    provider errors", "Provider error text is extracted from common body shapes", "Provider error text is sanitized and
    capped", "Rejected parameters produce a settings hint";
  - chain-runs: "Rejected requests are not retried", "Failed steps keep the provider diagnosis";
  - design D1.
- **Files:**
  - `internal/llms/http_errors.go` and `http_errors_test.go`;
  - `internal/llms/retry_test.go`;
  - `internal/apperr/apperr.go` and `apperr_test.go`;
  - `main.go` (`allErrorCodes`);
  - `frontend/__mocks__/wailsModels.js` (add `CodeInvalidRequest`);
  - `docs/architecture/02-backend-architecture.md` §4.2 (constructor table).
- **Existing code:**
  - `mapHTTPStatus` and `isContextExceededBody`, called from `openai_provider.go` (`Chat`, `ListModels`) and
    `ollama_native.go`;
  - `apperr.Upstream`, `Timeout` and `StepFailed`;
  - `chatWithRetry` (`internal/llms/service.go`), which already skips non-retryable errors and needs no change;
  - the step-error wrapping in `RunChain` (`internal/actions/orchestrator.go`).

Steps:
- [ ] 1.1 Write failing table tests in `http_errors_test.go`, using every scenario in the llm-providers requirements
      above:
      - OpenAI `unsupported_value` temperature;
      - default-only temperature text;
      - `max_tokens` → `max_completion_tokens`;
      - `max_tokens: 64000 > 32000`;
      - Anthropic `invalid_request_error`;
      - Ollama `{"error":…}` including "does not support thinking";
      - plain text and an empty body;
      - 405, 408, 422, and 503 with a body;
      - a context-overflow 400;
      - an echoed bearer key and `api-key` query;
      - a 2,000-character body.
- [ ] 1.2 Write failing tests:
      - `retry_test.go`: an `httptest` server that always answers 400 with `maxRetries=3` gets exactly 1 request, and a
        503 gets 4;
      - `apperr_test.go`: `StepFailed` copies `hint`, `param` and `providerMessage` from the inner error.
- [ ] 1.3 Implement per D1:
      - `CodeInvalidRequest`, `ProviderRejection` and `InvalidRequest`;
      - the `Upstream(ProviderRejection)` signature;
      - `parseProviderError`, `sanitizeExcerpt` and `hintForParam` (the spec table);
      - the new `mapHTTPStatus` branches;
      - the `StepFailed` detail copy.
      Verify with `go test -race ./internal/llms/ ./internal/apperr/ ./internal/actions/`.
- [ ] 1.4 Add the code to `allErrorCodes`, run `wails generate module` (the output is git-ignored), and check that the
      generated `frontend/wailsjs/go/models.ts` contains `CodeInvalidRequest`. Add it to
      `frontend/__mocks__/wailsModels.js`, then run `cd frontend && npm run verify`.
- [ ] 1.5 `wails dev`: point a provider at a model that rejects temperature, or at a local stub answering 400, and run
      an action. The app log shows one attempt, and a toast appears (still with today's frontend text; task 7 changes
      that).

## 2. Completion metadata, truncation warning and marker detection

**Goal.** Each inference keeps the served model, finish reason, usage and endpoint. A truncation logs an app-log
warning, and an edge-case marker fails the step.

- **Implements:**
  - chain-runs: "Edge-case markers are not returned as results";
  - chain-runs: "Truncated answers are flagged" (the application-log half; the task-log half is task 3);
  - design D2.
- **Files:**
  - `internal/llms/provider.go`, `openai_provider.go`, `ollama_native.go` and `service.go`, with their tests;
  - `internal/actions/service.go`;
  - the mocks in `internal/actions/*_test.go` and `internal/llms/*_test.go`.
- **Existing code:**
  - `ChatResponse.FinishReason` and `Usage` (dropped today by `chatOnce`);
  - the URL from `buildCompletionURL` / `buildNativeChatURL`;
  - the Ollama native response struct (add `model`);
  - `apperr.EmptyCompletion`;
  - the callers of `GetCompletionResponse*`: the two wrappers and `runStep` in `actions/service.go`.

Steps:
- [ ] 2.1 Write failing tests:
      - provider integration tests (`httptest`) assert that `ChatResponse.Model`, `RequestHost` and `RequestPath` are
        filled for both the OpenAI and Ollama native paths, with the query stripped;
      - an `actions` test shows a `[NO_TEXT_PROVIDED]` output fails the run with `step_failed` / innerCode
        `empty_completion`, while a marker inside a sentence passes;
      - `finish_reason=length` still returns the text.
- [ ] 2.2 Introduce `llms.Completion`, change `GetCompletionResponse*`, `chatWithRetry` and `chatOnce` to return it, and
      update the callers and mocks. Add `isEdgeMarker` and the truncation warning log. Verify with
      `go test -race ./internal/llms/ ./internal/actions/`.
- [ ] 2.3 `wails dev`: run a proofread on local Ollama. The output is unchanged from before, and the app log shows no
      errors.

## 3. Task-log diagnostics fields

**Goal.** Task-log entries record `servedModel`, `finishReason`, `promptTokens`, `completionTokens`, `requestHost`,
`requestPath` and `promptVersion`.

- **Implements:**
  - app-data: "Task log records the served model and finish reason", "Task log records token usage", "Task log records
    the request endpoint without secrets", "Task log records a prompt version";
  - chain-runs: "Truncated answers are flagged" (the task-log half).
- **Files:**
  - `internal/tasklog/service.go` (`TaskLogEntry`, a new `SchemaVersion = 2` constant) and its test;
  - `internal/actions/service.go` (`runStep` entry building; replace the hard-coded `SchemaVersion: 1`);
  - `docs/architecture/02-backend-architecture.md` (the `runStep` / task-log description).
- **Existing code:**
  - `llms.Completion` (task 2);
  - `TaskLogService.LogTaskExecution`, which writes one entry per inference group.

Steps:
- [ ] 3.1 Write failing tests:
      - write an entry to a temp dir and assert the new JSON keys and `schemaVersion` 2;
      - in `actions`, a `finish_reason=length` run records `finishReason` = `length`;
      - `promptVersion`: same prompts with different input give an equal 12-lowercase-hex hash, and a changed directive
        gives a different one.
- [ ] 3.2 Implement the fields and the hash helper: SHA-256 over the system prompt as sent plus the directive texts.
      Verify with `go test -race ./internal/tasklog/ ./internal/actions/`.
- [ ] 3.3 `wails dev`: with task logging enabled, run an action. `GoTextApp-Dev/logs/tasks-<date>.jsonl` holds the new
      fields, and `requestPath` has no query string.

## 4. Provider request hygiene

**Goal.** No `n` is sent, Azure completions carry `api-version`, and a pinned path is detectable.

- **Implements:**
  - llm-providers: "Completion requests omit the choice count", "Azure completion requests carry the API version";
  - the detection half of "Pinned completion path is flagged" (reporting it is task 6);
  - design D3.
- **Files:** `internal/llms/llms.go` (drop `N`), `openai_provider.go`, `provider_test.go`,
  `provider_integration_test.go`, and `internal/actions/service.go` (stop setting `N`).
- **Existing code:** the `api-version` logic in `buildModelsURL`, and `ProviderConfig.CompletionPath` / `APIVersion`
  (`internal/settings/settings.go`).

Steps:
- [ ] 4.1 Write failing tests:
      - the chain request body has no `n`;
      - the completion URL ends with `?api-version=2024-10-21` when it is set, has no query when it is empty, and is not
        given a second `api-version` when the path already has one;
      - `IsPinnedCompletionPath` table: azure pinned (`openai/deployments/haiku-small/chat/completions`), azure
        `{deployment}`, openai `v1/chat/completions` (not pinned), ollama with a path, and an empty path.
- [ ] 4.2 Implement, and verify with `go test -race ./internal/llms/ ./internal/actions/`.
- [ ] 4.3 `wails dev`: run an action on LM Studio (OpenAI-compatible). It succeeds.

## 5. Reasoning mode and the shared model-config helper

**Goal.** A `default|off|low` reasoning mode, applied through one `llms.ApplyModelConfig` used by the chain path. Each
provider maps the mode to its own wire field.

- **Implements:**
  - settings: "Reasoning mode setting", "Reasoning mode default sends nothing", "Reasoning mode off disables local
    thinking", "Reasoning mode low requests low effort";
  - design D4.
- **Files:**
  - `internal/settings/settings.go`, `repository_sqlite.go` (`model.reasoningMode` in `GetModelConfig` /
    `UpdateModelConfig`) and `service.go` (normalize `""`/unknown to `default`), with tests;
  - `internal/apperr/results.go` (`ModelConfig.ReasoningMode`, the bound type converted in `settings/handler.go`);
  - `internal/llms/provider.go` (`ChatRequest.ReasoningMode`) and a new `request_options.go` (`ApplyModelConfig`);
  - `service.go` (`chatRequestFrom` copies model, system and messages, then calls `ApplyModelConfig`), `llms.go`
    (`ReasoningEffort` on the wire struct), `openai_provider.go` (`reasoning_effort`) and `ollama_native.go` (`think`),
    with tests;
  - `internal/llms/service_integration_test.go`: rewrite
    `TestLLMServiceAPI_GetCompletionResponse_ContextWindowDecoupledFromMaxTokens` to set the token limit through
    `ModelConfig`;
  - `internal/actions/service.go` (`newChatCompletionRequest` keeps only model and messages);
  - move the parameter cases from `internal/actions/chat_request_test.go` to `internal/llms/request_options_test.go`;
  - `frontend/src/ui/widgets/views/settings/tabs/ModelConfigTab.tsx` and its test;
  - the bridge mock's model config, if it lists fields.
- **Existing code:**
  - the KV recipe: `getString` / `UpsertSetting`, as in `GetUIPreferencesConfig`;
  - the `Select` primitive (`frontend/src/ui/primitives/Select.tsx`);
  - `ModelConfigTab`'s local form and its `updateModelConfig` save.

Steps:
- [ ] 5.1 Write failing Go tests:
      - the repository round-trips `model.reasoningMode`, and a missing or unknown value reads as `default`;
      - an `ApplyModelConfig` table covers temperature, the token limit with and without the legacy flag, the context
        window, and the reasoning mode;
      - provider body tests for every mode: Ollama `think` absent / `false` / `"low"`; OpenAI-compatible
        `reasoning_effort` absent / absent / `"low"`.
- [ ] 5.2 Implement the setting, `ApplyModelConfig`, the provider mappings and the slimmer `newChatCompletionRequest`.
      Verify with `go test -race ./internal/settings/ ./internal/llms/ ./internal/actions/`.
- [ ] 5.3 Run `wails generate module`. Add the "Reasoning" select ("Provider default", "Off", "Low") to the
      `ModelConfigTab` form. Add a Jest test that saving sends `reasoningMode`. Verify with
      `cd frontend && npm run verify`.
- [ ] 5.4 `wails dev`:
      - set Off and run a proofread on Ollama `gemma4:e4b-mlx`; the app log shows `think:false`;
      - restart, and the value persists;
      - set Low on `qwen2.5:1.5b`; the run fails with the reasoning hint in the app log.

## 6. Bare inference test with parameter diagnosis

**Goal.** The Settings inference test separates "the model works" from "a saved setting is rejected", and both tests
report the pinned-path warning.

- **Implements:**
  - llm-providers: "Inference test sends a bare request first", "Inference test diagnoses a rejected model setting",
    "Inference test diagnosis message", "Pinned completion path is flagged";
  - design D3 and D5.
- **Files:**
  - `internal/verification/service.go` (`TestInference`, `TestConnection`) and `service_test.go`;
  - `internal/apperr/results.go` (`VerifyOutcome.RejectedParam`, `Hint`, `Warnings`);
  - `internal/llms/http_errors.go` (export `SettingHint(param)` over the task 1 table).
- **Existing code:**
  - `llms.ApplyModelConfig` (task 5);
  - `llms.IsPinnedCompletionPath` (task 4);
  - `CodeInvalidRequest` and the hint table (task 1);
  - the `gate.TryAcquire` pattern already in `TestInference`, which today shares one `context.WithTimeout` across the
    function (D5 needs one per call).

Steps:
- [ ] 6.1 Write failing tests with an `httptest` server:
      - the bare body has only `model`, `messages` and `stream`;
      - temperature is rejected → ok, with `RejectedParam="temperature"` and the spec hint;
      - the token limit is rejected → the "rejects the token limit" message;
      - `low` reasoning is rejected → ok, with `RejectedParam="reasoning"`;
      - every setting is accepted → no hint;
      - all settings off → 1 request;
      - no single removal helps → the combined-settings hint;
      - the full request gets a 429 → the test fails with `rate_limited` and no removals;
      - a bare 404 → `model_not_found` with no further calls;
      - a slow bare call does not shorten the timeout of later calls;
      - a pinned azure path → the warning, in both `TestConnection` and `TestInference`.
- [ ] 6.2 Implement per D5. Verify with `go test -race ./internal/verification/`. Run `wails generate module`, then
      `cd frontend && npm run verify`.
- [ ] 6.3 `wails dev`: enable temperature on a model or stub that rejects it, then run the inference test. The
      `testProviderInference/fulfilled` action payload in Redux DevTools carries the hint (task 7 renders it).

## 7. Frontend error and diagnosis display

**Goal.** Toasts for every error code prefer the backend title and message and show the hint and a collapsible
"Provider said". The verification panel shows the diagnosis.

- **Implements:**
  - app-shell: "Error notifications show the backend message", "Error notifications show the settings hint", "Error
    notifications offer the provider excerpt", "Verification panel shows diagnosis results";
  - design D6.
- **Files:**
  - `frontend/src/logic/store/notifications/slice.ts`, `types.ts` and the slice tests;
  - `frontend/src/ui/widgets/base/NotificationContainer.tsx`, its CSS module and its test;
  - a new `frontend/src/ui/primitives/Collapsible.tsx` with a CSS module;
  - `frontend/src/logic/store/settings/thunks.ts` (`testProviderInference` rejects with the `WireError`);
  - `frontend/src/ui/widgets/views/settings/tabs/components/VerificationPanel.tsx` and its test in `tabs/__tests__/`;
  - `frontend/src/dev/bridge-mock/go/main/ActionHandler.ts` (a `run-error` flag);
  - `frontend/e2e/verify-ui.spec.ts`;
  - `internal/apperr/apperr.go` (message wording only, where a backend message reads badly as toast text).
- **Existing code:**
  - `unwrap` / `tryUnwrap` (`logic/adapter/envelope.ts`), which already toast;
  - `parseError` (`logic/utils/error_utils.ts`);
  - the Toast primitive;
  - the `mockParam` flag pattern and its `fail(...)` helper (`dev/bridge-mock/types.ts`);
  - tokens from `tokens.css`.

Steps:
- [ ] 7.1 Write failing Jest tests:
      - `buildNotification` uses `wire.title`/`wire.message` for several codes (`invalid_request`, `step_failed`,
        `auth`) and falls back to per-code text when they are empty;
      - it carries `hint` and `providerMessage`;
      - `NotificationContainer` shows the hint line and a collapsed "Provider said" that expands;
      - `VerificationPanel` renders the hint and the warnings;
      - `testProviderInference` rejects with the full `WireError`.
      Update the existing tests that assert per-code text.
- [ ] 7.2 Implement the slice, primitive, container, thunk and panel changes. Review the backend messages for toast
      wording. Verify with `cd frontend && npm run verify` and `go test -race ./internal/apperr/`.
- [ ] 7.3 Add the bridge-mock `?run-error=invalid_request` branch, which returns a `step_failed` envelope with
      `innerCode`, `hint` and `providerMessage`. Add a case to `e2e/verify-ui.spec.ts`: trigger a run, see the
      "Step 1 failed" toast with the hint, and expand "Provider said". Verify with `npm run verify:ui`.
- [ ] 7.4 `wails dev`: reproduce the task 6 scenario; the panel shows the temperature hint. A chain run against the
      rejecting model shows the toast with the hint and the excerpt.

## 8. `internal/textguard` package

**Goal.** Pure, deterministic input/output guards with the spec's flag names, shared by the task log and the eval.

- **Implements:**
  - the flag definitions behind app-data "Task log records output guard flags";
  - the metrics behind the design D8 release gate;
  - design D7.
- **Files:** new `internal/textguard/textguard.go`, `lexicon.go` and `textguard_test.go`; `go.mod`
  (`golang.org/x/text` becomes a direct dependency via `go mod tidy`).
- **Existing code:** the standard library and `golang.org/x/text/unicode/norm`.

Steps:
- [ ] 8.1 Write failing table tests: one row per flag, using the app-data scenarios (greeting and please dropped, em dash
      introduced, faithful correction → no flags), plus:
      - sign-off dropped, fewer lines, and hedge lost (maybe, I think, would → will);
      - protected token lost (URL, `@name`, `ABC-123`, a number);
      - a Tier-1 phrase introduced ("I hope this helps");
      - a tell already in the input is not flagged;
      - the edit ratio on identical, empty and fully different texts;
      - every calibration note in `docs/analysis/2026-10-17-eval-case-ideas.md` §4, with one row where it fires and one
        where it does not ("I would like" → "I'd like" is no loss; collapsed blank lines are no line loss).
- [ ] 8.2 Implement `Check(input, output) Result`. Verify with `go test -race -cover ./internal/textguard/` at ≥ 90%
      coverage. `wails dev`: N/A, no runtime change.

## 9. Guard flags in the task log

**Goal.** Each task-log entry records `guardFlags`, computed only while task logging is enabled, without affecting the
run.

- **Implements:** app-data "Task log records output guard flags"; design D7 "Runtime use".
- **Files:** `internal/tasklog/service.go` (`GuardFlags` field; `LogTaskExecution` calls `textguard.Check` after the
  enabled check) and its test.
- **Existing code:** `textguard.Check` (task 8); the `EnableTaskLogging` check in `LogTaskExecution`; the entry from
  task 3, which already holds `InputText` and `OutputText`.

Steps:
- [ ] 9.1 Write failing tests:
      - an entry whose output drops "Hello." is written with `greeting_dropped` in `guardFlags`;
      - with logging disabled, no file is written;
      - the `actions` run result is unchanged (an existing `captureTaskLog` test in `orchestrator_test.go` still passes).
- [ ] 9.2 Implement. Verify with `go test -race ./internal/tasklog/ ./internal/actions/`.
- [ ] 9.3 `wails dev`: with task logging on, run a proofread. The JSONL line has a `guardFlags` array.

## 10. Eval harness, dataset and baseline

**Goal.** A developer-only Go eval runs the production chain path against real models, scores the outputs with
`textguard`, and records the baseline for the current prompts.

- **Implements:** design D8 and the Verification "Release gate for prompt changes" (measurement and baseline).
- **Files:**
  - new `internal/actions/eval_test.go` (`//go:build eval`);
  - new `internal/actions/eval_cases_test.go` (no tag: the dataset check);
  - new `internal/actions/testdata/eval/cases.jsonl`;
  - `docs/howto/verification.md` (an eval section);
  - new `docs/analysis/evals/<date>-baseline.md` (the directory does not exist yet).
- **Existing code:**
  - `actions.NewActionService` and `RunChain`;
  - `llms.NewProviderFactory`, `llms.NewLLMApiService` and `prompts.NewPromptService`, wired as in
    `internal/application/application.go`;
  - `noopHistoryService`, `noopTaskLog` and `orchestratorSettings` in `internal/actions/orchestrator_test.go`, reused in
    place;
  - `textguard.Check`.

Steps:
- [ ] 10.1 Write `cases.jsonl` with 40–60 synthetic cases. Start from `docs/analysis/2026-10-17-eval-case-ideas.md` §5,
      extend it with the §6 mutation recipe, and follow its anonymization rules. It covers:
      - failure patterns: greetings, acknowledgements, please and could you, hedge → decision, inversions, multi-line
        chat, " - " joins;
      - at least 10 `clean` cases;
      - at least 10 `seeded` cases with `fixes`;
      - the tone, professionalize, humanize, email, summarize and translate cases.

      Translate cases set `inputLanguage`/`outputLanguage`. Never commit raw log text. The dataset test (no build tag)
      parses the file and checks the required fields, unique ids, known action IDs, and languages on translate cases.
- [ ] 10.2 Implement `TestPromptEval` per D8:
      - env parsing (including `GOTEXT_EVAL_TIMEOUT`), skipping when no targets are set;
      - paths resolved against the module root;
      - errored runs counted as failures and listed;
      - the real `NewActionService` / `RunChain`;
      - the D8 metric table and the action applicability;
      - `report.json` and `report.md`.
      Verify that `go vet -tags eval ./internal/actions/` passes and that `go test ./...` does not compile the file.
- [ ] 10.3 Run the baseline:
      ```
      GOTEXT_EVAL_TARGETS='ollama|http://localhost:11434|gemma4:e4b-mlx' go test -tags eval -run TestPromptEval -timeout 90m -v ./internal/actions/
      ```
      - Run `gemma4:e4b-mlx` at reasoning `off` and `default`.
      - Also run `gemma4:26b-mlx` and `gpt-oss:20b` at `off` if they are installed.
      - Use the actions from tasks 11–12: proofread basic and enhanced, `rewrite.intent.humanize`,
        `rewrite.tone.professional` and `translate.text`.
      - Commit the summary to `docs/analysis/evals/<date>-baseline.md`, and keep the raw reports in `.tmp/eval/`.
- [ ] 10.4 Document the eval command, the env vars and the release-gate rule in `docs/howto/verification.md`.
      `wails dev`: N/A, no runtime change.

## 11. Proofreading prompt and proofread inference split

**Goal.** Proofread actions get their own system prompt, their own inference and faithful directives, and the seed
temperature becomes 0.2. The result passes the release gate against the baseline.

- **Implements:**
  - text-actions: "Proofreading runs as its own inference", "Proofreading prompt lists what to fix and what to keep",
    "Proofreading directives forbid restructuring";
  - chain-runs: "Chains may use up to four inferences";
  - settings: "Faithfulness-oriented default temperature";
  - design D9 and the Verification release gate.
- **Files:**
  - `internal/prompts/v3/system.go` (`SysProofread`);
  - `catalog.go` (5 proofread entries become `Mergeable:false`; new basic and enhanced directives) and
    `catalog_test.go`;
  - `internal/actions/composer.go` (proofread system prompt and user-prompt suffix) and `composer_test.go`;
  - `planner.go` (`maxInferences = 4`) and `planner_test.go`;
  - `build_plan_prompts_test.go`;
  - `internal/stacks/starter_stacks_plan_test.go` (update `TestStarterStacks_EscalationAtInferenceCap`, which pins the
    old cap of 3);
  - `internal/db/db.go` (`seedSettings`) and `internal/settings/repository_sqlite.go` (`GetModelConfig` fallback),
    both 0.2;
  - `docs/analysis/evals/<date>-proofread.md`.
- **Existing code:** the `Composer.systemPrompt` family switch and `CatProofread`; `ExclProofread`;
  `TestStarterStacks_AllValidPlans`; the task 10 eval.

Steps:
- [ ] 11.1 Write failing tests:
      - proofread+humanize gives 2 inferences, with `SysProofread` and the user-prompt suffix on the first;
      - tone+style still gives 1;
      - the chain-runs 4-inference scenario is accepted, and 5 inferences give `invalid_plan`;
      - the catalog metadata shows Mergeable false for the proofread entries;
      - the enhanced directive has "Do not merge, split or remove sentences" and no "redundancy" or "ambiguous
        references";
      - the seed and fallback temperature are 0.2.
- [ ] 11.2 Implement the prompt, directive, composer, planner and seed changes. Verify with
      `go test -race ./internal/prompts/... ./internal/actions/ ./internal/stacks/ ./internal/db/ ./internal/settings/`.
- [ ] 11.3 Run the eval for the proofread actions on `gemma4:e4b-mlx` with `GOTEXT_EVAL_BASELINE` set to the task 10
      report. Every gated metric meets its target, or does not regress where the baseline already missed it. After 3
      prompt iterations that still miss, stop and ask the user. Commit the comparison summary.
- [ ] 11.4 `wails dev`: the prompt inspector (`views/info/PromptInspector.tsx`) for proofread+humanize shows 2
      inferences and the new system prompt. Proofreading a "Hello. … could you please …" message keeps both.

## 12. House style across all families, narrowed humanize and translate tokens

**Goal.** Every family's prompt carries the house style, no em dashes remain in the prompts, humanize is narrowed, and
the translate languages are filled.

- **Implements:**
  - text-actions: "Every family carries the house style", "Prompt texts contain no em dashes", "Humanize replaces
    machine wording only", "Translate system prompt names the languages";
  - design D9 and the Verification release gate.
- **Files:**
  - `internal/prompts/v3/system.go` (the `houseStyle` variants and the tightened `SysRewrite` licences; 36 em dashes
    today);
  - `catalog.go` (every `— A, B, and C —` directive and the humanize text; 62 em dashes today);
  - `catalog_test.go` (the U+2014 scan and house-style presence);
  - `internal/actions/composer.go` (system-prompt token fill) and its test;
  - `docs/analysis/evals/<date>-house-style.md`;
  - `docs/architecture/` (prompt notes).
- **Existing code:** the `singleStepUserPrompt` token replacer (`composer.go`); the task 10 eval.

Steps:
- [ ] 12.1 Write failing tests:
      - no system prompt or directive contains U+2014 outside a quoted example;
      - every family's system prompt contains the house-style block, with the translate variant for translate;
      - the humanize directive has no "vary", "active voice" or "filler" and has "Keep every sentence";
      - the `rewrite.tone.professional` directive contains "Adjust the tone to be professional: calm, competent and
        courteous";
      - the translate system prompt for English → Ukrainian contains both names and no "{{".
- [ ] 12.2 Rewrite the texts per D9 and doc §9.4 / §12.3–12.5, and fill the system-prompt tokens. Verify with
      `go test -race ./internal/prompts/... ./internal/actions/`.
- [ ] 12.3 Run the eval on `gemma4:e4b-mlx` for the proofread actions, `rewrite.intent.humanize`,
      `rewrite.tone.professional` and `translate.text` against the baseline, gating each action by the D8 applicability
      table. Apply the same 3-iteration stop rule. Commit the summary, and record whether the reasoning `off` result
      justifies a docs recommendation.
- [ ] 12.4 `wails dev`:
      - run `rewrite.tone.professional` on a casual message: no em dash;
      - run `translate.text` English → Ukrainian: the prompt inspector's system prompt names both languages;
      - a saved stack with humanize runs.
