# Tasks

Integration branch: `feature/improve-llm-text-quality`, created from `master` or from the
current `feature/general-improvements` if the user prefers. Each group is one task and one
vertical slice, planned in a fresh planning-mode session.

Every group's done criteria also include:
- gates green: `go test -race ./...`, `gofmt -l .`, `go vet ./...`, and, when frontend files
  changed, `cd frontend && npm run verify`;
- the `wails dev` check passed;
- affected docs updated;
- a Conventional Commit.

## 1. Honest provider request errors

**Goal.** HTTP 400/422 and other 4xx become non-retryable `invalid_request` errors that carry the
sanitized provider message and a settings hint. Only 5xx stays `upstream`.

- **Implements:**
  - llm-providers: "Request errors are reported as rejected requests", "Only server failures are
    reported as retryable provider errors", "Provider error text is extracted from common body
    shapes", "Provider error text is sanitized and capped", "Rejected parameters produce a
    settings hint";
  - chain-runs: "Rejected requests are not retried";
  - design D1.
- **Files:**
  - `internal/llms/http_errors.go` (+tests);
  - `internal/apperr/apperr.go` (+`apperr_test.go`);
  - `main.go` (`allErrorCodes`);
  - `frontend/wailsjs/` (regenerated);
  - `docs/architecture/02-backend-architecture.md` (error table).
- **Reuse:** the `isContextExceededBody` pattern, `ToWire` cause logging, and the
  `chatWithRetry` Retryable check (no change needed).

Steps:
- [ ] 1.1 Write failing table tests in `http_errors_test.go` using real body samples: OpenAI
      `unsupported_value` temperature, Azure `max_tokens` → `max_completion_tokens`, Anthropic
      `invalid_request_error`, Ollama `{"error":…}`, plain text, empty body, 405, 422, 503, a
      context-overflow 400, an echoed bearer key, and a 2,000-char body.
- [ ] 1.2 Add a failing retry test in `internal/llms/retry_test.go`: an `httptest` server always
      answers 400 with `maxRetries=3`, so expect exactly 1 request. 503 still makes 4.
- [ ] 1.3 Implement `CodeInvalidRequest` and `InvalidRequest(...)`, `parseProviderError`,
      `sanitizeExcerpt`, `hintForParam`, and the new `mapHTTPStatus` branches. `Upstream`
      details gain `providerMessage`. The sanitized body is passed as the cause. Verify with
      `go test -race ./internal/llms/ ./internal/apperr/`.
- [ ] 1.4 Add the code to `allErrorCodes`, run `wails generate module`, and confirm with
      `git diff frontend/wailsjs/` that only the enum is added.
- [ ] 1.5 `wails dev`: point a provider at a model that rejects temperature (or a local stub
      answering 400). Run an action. The app log shows one attempt, and the toast still renders
      using the existing fallback.

## 2. Completion metadata, truncation and marker detection

**Goal.** Chain steps keep the served model, finish reason, usage and endpoint. A truncation is
flagged, and edge-case markers fail the step.

- **Implements:**
  - chain-runs: "Edge-case markers are not returned as results", "Truncated answers are
    flagged";
  - design D2.
- **Files:**
  - `internal/llms/provider.go`, `openai_provider.go`, `ollama_native.go` and `service.go`, with
    their tests;
  - `internal/actions/service.go`;
  - `internal/actions/*_test.go` mocks.
- **Reuse:** the existing `ChatResponse.FinishReason`/`Usage`, the URL built by
  `buildCompletionURL`, and the `apperr.EmptyCompletion` constructor.

Steps:
- [ ] 2.1 Write failing tests:
      - provider integration tests assert that `ChatResponse.Model`, `RequestHost` and
        `RequestPath` are parsed and that the query is stripped;
      - an `actions` service test shows a `[NO_TEXT_PROVIDED]` output fails with
        `empty_completion`, and that a marker inside a sentence passes;
      - `finish_reason=length` still returns the text.
- [ ] 2.2 Introduce `llms.Completion` and change `GetCompletionResponse*` to return it. Update
      `runStep` and all mocks. Add the `isEdgeMarker` check and the truncation warning log.
      Verify with `go test -race ./internal/llms/ ./internal/actions/`.
- [ ] 2.3 `wails dev`: run a proofread action on local Ollama. The output is unchanged from
      before, and the app log shows no errors.

## 3. Task-log diagnostics fields

**Goal.** Task-log lines record `servedModel`, `finishReason`, `promptTokens`,
`completionTokens`, `requestHost`, `requestPath` and `promptVersion`.

- **Implements:**
  - app-data: "Task log records the served model and finish reason", "Task log records token
    usage", "Task log records the request endpoint without secrets", "Task log records a prompt
    version".
- **Files:**
  - `internal/tasklog/service.go` (+test);
  - `internal/actions/service.go` (`runStep` entry building);
  - `docs/architecture/` (task log section).
- **Reuse:** `llms.Completion` from group 2, and the existing `TaskLogEntry` writer and
  `schemaVersion`. Bump `schemaVersion` by 1.

Steps:
- [ ] 3.1 Write failing tests. Write an entry to a temp dir and assert the new JSON keys. For
      `promptVersion`: same prompts with different input give an equal hash, and an edited
      directive gives a different hash (12 lowercase hex chars).
- [ ] 3.2 Implement the fields and the hash helper (SHA-256 over the system prompt plus directive
      texts). Verify with `go test -race ./internal/tasklog/ ./internal/actions/`.
- [ ] 3.3 `wails dev`: with task logging enabled, run an action. Check that
      `GoTextApp-Dev/logs/tasks-<date>.jsonl` holds the new fields and no query string.

## 4. Provider request hygiene

**Goal.** No `n` field is sent, Azure completions carry `api-version`, and a pinned path is
detectable.

- **Implements:**
  - llm-providers: "Completion requests omit the choice count", "Azure completion requests carry
    the API version", and the detection half of "Pinned completion path is flagged";
  - design D3.
- **Files:** `internal/llms/llms.go`, `openai_provider.go`, `provider_test.go`, and
  `provider_integration_test.go`.
- **Reuse:** the `api-version` logic in `buildModelsURL`.

Steps:
- [ ] 4.1 Write failing tests:
      - the request body has no `n`;
      - the completion URL has `?api-version=2024-10-21` when it is set, and none when it is
        empty;
      - `IsPinnedCompletionPath` table: azure pinned, azure `{deployment}`, openai pinned, an
        ollama path, and an empty path.
- [ ] 4.2 Implement and verify with `go test -race ./internal/llms/`.
- [ ] 4.3 `wails dev`: run an action on an OpenAI-compatible provider (LM Studio). It succeeds.

## 5. Reasoning mode setting

**Goal.** Add a `default|off|low` reasoning mode, applied to chains through one shared request
builder.

- **Implements:**
  - settings: "Reasoning mode setting", "Reasoning mode default sends nothing", "Reasoning mode
    off disables local thinking", "Reasoning mode low requests low effort";
  - design D4, and the `llms.ApplyModelConfig` extraction from D5.
- **Files:**
  - `internal/settings/settings.go`, `repository_sqlite.go` and `service.go` (+tests);
  - `internal/llms/llms.go`, `ollama_native.go`, and a new `request_options.go`
    (`ApplyModelConfig`, `ApplyReasoningMode`);
  - `internal/actions/service.go` (`newChatCompletionRequest` delegates);
  - `frontend/src/ui/widgets/views/settings/tabs/ModelConfigTab.tsx`, its CSS module and tests;
  - `frontend/wailsjs/`.
- **Reuse:**
  - the `getString`/`UpsertSetting` KV recipe (`GetUIPreferencesConfig`);
  - the existing model-config thunk and slice;
  - the existing Select primitive.

Steps:
- [ ] 5.1 Write failing Go tests:
      - the repository round-trips `model.reasoningMode`, and a missing or unknown value reads
        as `default`;
      - `ApplyModelConfig` table: for each kind × mode, assert `think` and `reasoning_effort`
        presence, plus the existing temperature, token and context behavior (moved from
        `chat_request_test.go`).
- [ ] 5.2 Implement the setting and `ApplyModelConfig`. Make `newChatCompletionRequest` call it.
      Verify with `go test -race ./internal/settings/ ./internal/llms/ ./internal/actions/`.
- [ ] 5.3 Run `wails generate module`. Add the controlled select to `ModelConfigTab` with options
      "Provider default", "Off" and "Low". Add a Jest test that changing it dispatches the
      update. Verify with `npm run verify`.
- [ ] 5.4 `wails dev`: set Off and run a proofread on an Ollama Gemma/gpt-oss model. The response
      arrives in seconds rather than tens of seconds, and the app log shows the request without
      thinking. Restart the app and the value persists.

## 6. Bare inference test with parameter diagnosis

**Goal.** The Settings inference test separates "model works" from "a saved setting is rejected"
and reports the pinned-path warning.

- **Implements:**
  - llm-providers: "Inference test sends a bare request first", "Inference test diagnoses a
    rejected model setting", "Pinned completion path is flagged";
  - design D3 and D5.
- **Files:**
  - `internal/verification/service.go` (+`service_test.go`);
  - `internal/apperr/results.go` (`VerifyOutcome.RejectedParam`, `Hint`, `Warnings`);
  - `frontend/wailsjs/`.
- **Reuse:** `llms.ApplyModelConfig` (group 5), `IsPinnedCompletionPath` (group 4), and the
  `invalid_request` code (group 1).

Steps:
- [ ] 6.1 Write failing tests with an `httptest` server:
      - the bare body has only `model`, `messages` and `stream`;
      - the server rejects `temperature` → the outcome is ok with
        `RejectedParam="temperature"` and the spec hint;
      - every setting is accepted → no hint;
      - all settings off → 1 request;
      - no single removal helps → the combined-settings hint;
      - a bare 404 → `model_not_found` with no further calls;
      - pinned azure path → warning, in both `TestConnection` and `TestInference`.
- [ ] 6.2 Implement and verify with `go test -race ./internal/verification/`. Run
      `wails generate module`.
- [ ] 6.3 `wails dev`: enable temperature on a model or stub that rejects it, then run the
      inference test. The handler result carries the hint (checked via the Redux DevTools
      payload; the UI renders it in group 7).

## 7. Frontend error and diagnosis display

**Goal.** Toasts and the verification panel show the backend title and message, the hint, and a
collapsible "Provider said".

- **Implements:**
  - app-shell: "Error notifications show the backend message", "Error notifications show the
    settings hint", "Error notifications offer the provider excerpt", "Verification panel shows
    diagnosis results";
  - design D6.
- **Files:**
  - `frontend/src/logic/store/notifications/slice.ts` (+test);
  - `frontend/src/ui/widgets/base/NotificationContainer.tsx` and its CSS module;
  - `frontend/src/logic/store/settings/thunks.ts`;
  - `frontend/src/ui/widgets/views/settings/tabs/components/VerificationPanel.tsx` (+test);
  - `frontend/src/dev/bridge-mock/` (an `invalid_request` sample);
  - a Playwright spec under `frontend/` (`verify:ui`).
- **Reuse:**
  - the `parseError` util and the `unwrap`/`tryUnwrap` envelope helpers;
  - the Radix `Collapsible` from the unified `radix-ui` package;
  - tokens from `tokens.css`.

Steps:
- [ ] 7.1 Write failing Jest tests:
      - `buildNotification` prefers `wire.title`/`wire.message` and carries `hint` and
        `providerMessage`, falling back to the code defaults when they are empty;
      - `VerificationPanel` renders the hint and the warnings;
      - `testProviderInference` rejects with the full `WireError`.
- [ ] 7.2 Implement the slice, container, thunk and panel changes. Verify with
      `cd frontend && npm run verify`.
- [ ] 7.3 Add a bridge-mock 400 sample and a Playwright case: trigger a run, see the "Request
      rejected" toast, expand "Provider said". Verify with `npm run verify:ui`.
- [ ] 7.4 `wails dev`: reproduce the group 6 scenario. The panel shows the temperature hint. A
      chain run against the rejecting model shows the toast with the hint and the excerpt.

## 8. `internal/textguard` package

**Goal.** Pure, deterministic input/output comparison guards with the spec's flag names, shared
by the task log and the eval.

- **Implements:**
  - the flag definitions behind app-data "Task log records output guard flags";
  - the metrics behind text-actions "Prompt changes pass the faithfulness eval";
  - design D7.
- **Files:** a new `internal/textguard/textguard.go`, `lexicon.go` and `textguard_test.go`.
- **Reuse:** the standard library and `golang.org/x/text/unicode/norm` if it is already in
  `go.mod`; otherwise implement case-folding without NFKC and note it.

Steps:
- [ ] 8.1 Write failing table tests, one row per flag with the spec scenarios (greeting and
      please dropped, em dash introduced, faithful correction → no flags), plus:
      - sign-off dropped, fewer lines, hedge lost (maybe, I think, would → will);
      - protected token lost (URL, `@name`, `ABC-123`, number);
      - Tier-1 phrase introduced ("I hope this helps");
      - a tell already in the input is not flagged;
      - edit ratio on identical, empty and fully different texts;
      - every calibration note in `docs/analysis/2026-10-17-eval-case-ideas.md` §4, with one
        row where it does not fire and one where it does. Examples: "I would like" → "I'd like"
        has no hedge loss; "Maybe X can" → "X might" has no loss; collapsed blank lines are
        no line loss; "would" → "will" is flagged.
- [ ] 8.2 Implement `Check(input, output) Result`. Verify with
      `go test -race -cover ./internal/textguard/`, at ≥ 90% coverage.

## 9. Guard flags in the task log

**Goal.** Each task-log step entry records `guardFlags` without affecting the run.

- **Implements:** app-data "Task log records output guard flags".
- **Files:** `internal/tasklog/service.go`, `internal/actions/service.go` (+tests).
- **Reuse:** `textguard.Check` (group 8) and the group 3 entry building.

Steps:
- [ ] 9.1 Write failing tests: a step whose mock output drops "Hello." records
      `greeting_dropped` in the entry and returns the output unchanged; with logging disabled,
      no guard work is done and no file is written.
- [ ] 9.2 Implement, computing guards only when task logging is enabled. Verify with
      `go test -race ./internal/actions/ ./internal/tasklog/`.
- [ ] 9.3 `wails dev`: with task logging on, run a proofread. The JSONL line has a `guardFlags`
      array.

## 10. Eval harness, dataset and baseline

**Goal.** A developer-only Go eval runs the production chain path against real models, scores
outputs with `textguard`, and records the baseline for the current prompts.

- **Implements:** text-actions "Prompt changes pass the faithfulness eval" (the measurement and
  the baseline); design D8.
- **Files:**
  - a new `internal/actions/eval_test.go` (`//go:build eval`);
  - a new `internal/actions/testdata/eval/cases.jsonl`;
  - `.gitignore` (`.tmp/eval/` is already covered by `.tmp`; confirm);
  - `docs/howto/verification.md` (eval section);
  - a new `docs/analysis/evals/<date>-baseline.md`.
- **Reuse:**
  - the same constructors as `internal/application/application.go`;
  - the settings, history and tasklog stubs in `internal/actions/service_test.go`;
  - `gate.New()` and `textguard.Check`.

Steps:
- [ ] 10.1 Write `cases.jsonl` with 40–60 synthetic cases. Start from the seed catalog in
      `docs/analysis/2026-10-17-eval-case-ideas.md` §5, extend it with the §6 mutation recipe,
      and follow that document's anonymization rules. It covers:
      - failure patterns: greetings, acknowledgements, please and could you, hedge → decision,
        inversions, multi-line chat, " - " joins;
      - at least 10 clean controls;
      - at least 10 seeded-error cases with `fixes`;
      - the other-action cases (tone, professionalize, humanize, email, summarize, translate).

      Never commit raw log text. Add a unit test (no build tag) that parses `cases.jsonl` and
      checks the required fields, unique ids and known action IDs.
- [ ] 10.2 Implement `TestPromptEval`:
      - env parsing (targets, actions, temperature, reasoning, baseline, out), skipping when no
        targets are set;
      - running cases through the real `ChainOrchestrator`;
      - computing the doc §12.6 metrics;
      - writing `report.json` and `report.md` with target, baseline and pass/fail columns.
      Verify that `go vet -tags eval ./internal/actions/` passes and that `go test ./...` does not
      compile the file.
- [ ] 10.3 Run the baseline:
      ```
      GOTEXT_EVAL_TARGETS='ollama|http://localhost:11434|gemma4:e4b;...' go test -tags eval -run TestPromptEval -timeout 90m -v ./internal/actions/
      ```
      Use each available local model (gemma4:e4b required; gemma4:26b and gpt-oss:20b if
      present) at reasoning `off` and `default` for e4b. Commit the summary to
      `docs/analysis/evals/<date>-baseline.md`, and keep the raw reports in `.tmp/eval/`.
- [ ] 10.4 Document the eval command, the env vars and the release-gate rule in
      `docs/howto/verification.md`. `wails dev`: N/A, no runtime change.

## 11. Proofreading prompt and proofread inference split

**Goal.** Proofread actions get their own system prompt and inference, faithful directives, and
a 0.2 seed temperature. The result is measured against the baseline.

- **Implements:**
  - text-actions: "Proofreading runs as its own inference", "Proofreading prompt lists what to
    fix and what to keep", "Proofreading directives forbid restructuring", "Prompt changes pass
    the faithfulness eval";
  - chain-runs: "Chains may use up to four inferences";
  - settings: "Faithfulness-oriented default temperature";
  - design D9.
- **Files:**
  - `internal/prompts/v3/system.go` (`SysProofread`), `catalog.go` (5 proofread entries
    `Mergeable:false`, new basic/enhanced directives), `catalog_test.go`;
  - `internal/actions/composer.go` (+`composer_test.go`), `planner.go` (`maxInferences = 4`,
    +`planner_test.go`), `build_plan_prompts_test.go`;
  - `internal/db/db.go` and `internal/settings/repository_sqlite.go` (0.2);
  - `docs/analysis/evals/<date>-proofread.md`.
- **Reuse:** the `Composer.systemPrompt` switch, the existing `TestStarterStacks_AllValidPlans`,
  and the eval from group 10.

Steps:
- [ ] 11.1 Write failing tests:
      - proofread+humanize gives 2 inferences, with `SysProofread` on the first;
      - tone+style still gives 1;
      - a 4-inference chain is accepted and 5 is rejected with `invalid_plan`;
      - the catalog metadata table changes Mergeable for the proofread entries;
      - the enhanced directive has no "redundancy" or "ambiguous references" and has "Do not
        merge, split or remove sentences";
      - the seed and fallback temperature are 0.2.
- [ ] 11.2 Implement the prompt, directive, planner and seed changes. Verify with
      `go test -race ./internal/prompts/... ./internal/actions/ ./internal/db/ ./internal/settings/`.
- [ ] 11.3 Run the eval with `GOTEXT_EVAL_BASELINE` set to the group 10 report. Every target in
      the spec is met on gemma4:e4b; otherwise iterate on the prompt text. Commit the comparison
      summary.
- [ ] 11.4 `wails dev`: the prompt inspector for proofread+humanize shows 2 inferences and the
      new system prompt. Proofreading a "Hello. … could you please …" message keeps both.

## 12. House style across all families, narrowed humanize and translate tokens

**Goal.** Every family's prompt adds no AI tells and keeps the author's voice. No em dashes
remain in prompts, humanize is narrowed, and translate languages are filled.

- **Implements:**
  - text-actions: "Every family carries the house style", "Prompt texts contain no em dashes",
    "Humanize replaces machine wording only", "Translate system prompt names the languages",
    "Prompt changes pass the faithfulness eval";
  - design D9.
- **Files:**
  - `internal/prompts/v3/system.go` (`houseStyle` variants, `SysRewrite` licence tightening);
  - `catalog.go` (all `— A, B, and C —` directives, humanize text);
  - `catalog_test.go` (U+2014 scan and house-style presence);
  - `internal/actions/composer.go` (system-prompt token fill, +test);
  - `docs/analysis/evals/<date>-house-style.md`;
  - `docs/architecture/` (prompt notes).
- **Reuse:** the existing `singleStepUserPrompt` token replacer and the group 10 eval.

Steps:
- [ ] 12.1 Write failing tests:
      - no system prompt or directive contains U+2014 outside a quoted example;
      - every family's system prompt contains the house-style block, with the translate variant
        for translate;
      - the humanize directive has no "vary", "active voice" or "filler" and has "Keep every
        sentence";
      - the translate system prompt for English → Ukrainian contains both names and no "{{".
- [ ] 12.2 Rewrite the texts per design D9 and doc §9.4/§12.3–12.5, and fill the system-prompt
      tokens. Verify with `go test -race ./internal/prompts/... ./internal/actions/`.
- [ ] 12.3 Run the eval for proofread plus `rewrite.intent.humanize`, `rewrite.tone.professional`
      and `translate.text` against the baseline. The proofread targets still hold, and tells
      introduced stay ≤ 2% for the tone and humanize actions. Commit the summary, and record
      whether the reasoning `off` result justifies a docs recommendation.
- [ ] 12.4 `wails dev`:
      - run `rewrite.tone.professional` on a casual message: no em dash or corporate vocabulary;
      - run `translate.text` EN → UK: the language names appear in the prompt inspector's system
        prompt;
      - a saved stack with humanize runs.

## Workflow follow-up

- Run the full CI `test` job gate set on the change branch, then archive with `/opsx:archive`.
  Update `docs/index.md`, `docs/architecture/`, `README.md` and `CLAUDE.md` where facts changed.
