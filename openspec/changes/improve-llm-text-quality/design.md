# Design

## Context

See `proposal.md` for the motivation and `docs/analysis/2026-10-13-proofreading-quality-review.md`
for the evidence (sections are cited below as "doc §N"). The current code that shapes this design:

- **Error mapping.** `internal/llms/http_errors.go` `mapHTTPStatus` (:39-60) turns every
  non-context 400, and every unmapped status, into `apperr.Upstream` (`apperr.go:195-207`:
  retryable, "server error", cause nil). The body is read only by `isContextExceededBody`.
- **Retries and wire format.** `llms/service.go` `chatWithRetry` (:224-246) retries every
  `Retryable` error. `chatOnce` (:251-260) returns only `resp.Content`, although `ChatResponse`
  (`provider.go:64`) already has `FinishReason` and `Usage`. `ToWire` (`apperr/wire.go:25`) logs
  the cause once and returns `{code,title,message,details,retryable}`.
- **Request building.** `openai_provider.go` `buildCompletionURL` (:36-44) substitutes
  `{deployment}` but never adds `api-version`. The body (:107-122) always sends `n:1`.
  `ollama_native.go` is used for every Ollama provider (`profile.NativeChatPath = "api/chat"`).
  Neither path sends any reasoning field.
- **Verification.** `verification/service.go` `TestInference` (:178-254) applies the saved global
  `ModelConfig` and calls `provider.Chat` once under the gate. `VerifyOutcome`
  (`apperr/results.go:153`) has no hint or warning fields.
- **Chain execution.** `actions/service.go` `newChatCompletionRequest` (:24-68) and `runStep`
  (:195) feed the only production caller of `GetCompletionResponse`. `runStep` writes the task
  log (`tasklog/service.go:18-35`) after a successful step.
- **Prompts.**
  - `Composer.systemPrompt` (`composer.go:51-80`) sends `SysRewrite` for all 45 rewrite actions.
  - `singleStepUserPrompt` (:137-147) fills tokens in user prompts only, so `SysTranslate`'s
    `{{input_language}}`/`{{output_language}}` reach the model verbatim.
  - The planner merges mergeable same-family steps (`planner.go:155`), with `maxInferences = 3`.
- **Frontend.**
  - `notifications/slice.ts` `buildNotification` (:12-151) rebuilds text from `wire.code` and
    never renders `details`.
  - `settings/thunks.ts` `testProviderInference` (:513) keeps only `.message`.
  - `ModelConfigTab` already disables temperature when discovery reports
    `supportsTemperature:false`.
- **Tests.** All existing tests are structural. Build tags exist only for `dev`/`!dev`. There is
  no testdata.

## Goals / Non-Goals

**Goals:**
- One place to classify provider HTTP errors, with sanitized provider text and hints. Every
  caller (chains, verification) gets it for free.
- A developer eval that runs the exact production path (planner → composer → orchestrator →
  LLM service → sanitizer). It uses the same guards the task log uses, so eval numbers and
  runtime flags mean the same thing.
- Prompt edits are judged against a recorded baseline on a small local model before they ship.

**Non-Goals:**
- No per-provider or per-model settings, and no learned capabilities (doc R7).
- No guard UI, diff default or auto-fix.
- No new DB table or migration.
- No promptfoo, Python or other external eval tooling. The eval must not re-implement prompt
  assembly.

## Decisions

### D1. Error classification lives in `llms/http_errors.go`
- **Code changes.**
  - Add `apperr.CodeInvalidRequest = "invalid_request"` and the constructor
    `apperr.InvalidRequest(provider string, status int, providerMsg, param, hint string)`.
  - The constructor sets title "Request rejected", `Retryable:false`, and Details `provider`,
    `statusCode`, `providerMessage` (sanitized excerpt), and `param` and `hint` when present.
  - Register the code in `main.go` `allErrorCodes` (EnumBind).
- **Body parsing.** `mapHTTPStatus` reads the body once. A new `parseProviderError(body) (msg,
  param string)` tries the three JSON shapes, then falls back to plain text. A new
  `sanitizeExcerpt(s string) string` uses regexes for `Bearer …`, `sk-…`, key/token pairs and
  `?…` queries, then caps the text at 300 runes.
  `hintForParam(param, msg) string` matches the known unsupported-parameter phrases (spec
  "Rejected parameters produce a settings hint").
- **Status mapping.** 400/422/other 4xx map to `InvalidRequest`. 5xx maps to `Upstream`, which
  now also stores the excerpt in `providerMessage`. The context overflow check
  (`isContextExceededBody`) still runs first for 400.
- **Logging.** The sanitized body is passed as the `AppError` cause, so `ToWire` logs it exactly
  once at the handler boundary (ErrorEnvelopeRules §8).
- **No retry change.** Because the error is not retryable, `chatWithRetry` needs no change. It
  already skips non-retryable errors.
- **Alternative rejected:** reusing `Validation` for 400s. That code means "the user's input is
  invalid" and has its own toast text.

### D2. The completion result carries metadata
- **The type.** `GetCompletionResponse` and `GetCompletionResponseForProvider` return
  `llms.Completion{Content, ServedModel, FinishReason string; PromptTokens, CompletionTokens int;
  RequestHost, RequestPath string}` instead of `string`.
- **Where values come from.** `ChatResponse` gains `Model`, `RequestHost` and `RequestPath`.
  The OpenAI and Ollama providers fill them from the parsed response and the built URL, with the
  query dropped.
- **Callers.** `runStep` uses `.Content` for output. A `FinishReason == "length"` gives a zerolog
  warning with `component`, `op`, `run_id` and `provider`.
- **Marker detection.** A new `actions.isEdgeMarker(output)` check (exact match after trim) fails
  the step with `apperr.EmptyCompletion`.
- **Mocks.** The mocks in `internal/actions/*_test.go` and `internal/llms/*_test.go` change
  signature.
- **Alternative rejected:** a separate metadata callback. It adds indirection with no second
  caller.

### D3. Provider request hygiene
- Remove `N` from the wire body.
- Append `?api-version=` in `buildCompletionURL` when `cfg.APIVersion != ""`, reusing the
  existing logic from `buildModelsURL`.
- Add `llms.IsPinnedCompletionPath(cfg *settings.ProviderConfig) bool`, which is true for kind
  `azure`/`openai` with a non-empty `CompletionPath` that lacks `{deployment}`.
  `TestConnection` and `TestInference` append the pinned-path warning (spec text) to the new
  `VerifyOutcome.Warnings`.

### D4. Reasoning mode
- **Setting.** `ModelConfig.ReasoningMode string` (values `default|off|low`), stored in the KV key
  `model.reasoningMode`, read through `getString` with default `default`. It follows the
  "Adding a Small Persisted Preference" recipe. Unknown stored values are treated as `default`.
- **Wire fields.** The request gains `Think any` (Ollama native: `false` or `"low"`, omitted when
  nil) and `ReasoningEffort string` (OpenAI-compatible, `omitempty`).
- **Mapping.** `newChatCompletionRequest` maps the mode by provider kind, per the spec. The
  verification service reuses the same mapping function, `llms.ApplyReasoningMode(req, kind,
  mode)`, so chains and the test cannot drift apart.
- **UI.** `ModelConfigTab` adds a controlled select bound to the existing model-config state and
  thunk. `ModelConfig` is already a bound type, so one `wails generate module` covers it.

### D5. The inference test as a diagnosis
- **Flow in `TestInference`.** The test holds the gate for the whole sequence.
  1. Send a bare request: `ChatRequest{Model, Messages:[user "Reply with OK."]}`, with no
     optional fields.
  2. If that succeeds and any optional setting is enabled, send a full request built by the same
     helper the chain uses.
  3. On an `invalid_request` from the full request, retry with one setting removed at a time:
     temperature → token limit → context window → reasoning.
- **Outcome.** `VerifyOutcome` gains `RejectedParam`, `Hint` and `Warnings []string`.
- **Shared request building.** `newChatCompletionRequest` is unexported in `actions`. To share it
  without an import cycle, the parameter-applying part moves to `llms` as
  `llms.ApplyModelConfig(req *ChatCompletionRequest, kind string, cfg *settings.ModelConfig)`,
  covering temperature, tokens, context and reasoning. `actions` and `verification` both call it.
  This removes today's duplicated logic in `verification/service.go:178-250`.

### D6. Frontend error display
- **Toasts.** `buildNotification` keeps its per-code defaults only as fallbacks. It prefers
  `wire.title`/`wire.message`, and adds `hint` and `providerMessage` from `details` to the
  notification model.
- **Notification view.** `NotificationContainer` renders the hint line and a Radix `Collapsible`
  "Provider said" block. Styling uses tokens only.
- **Inference test.** `testProviderInference` rejects with the whole `WireError`.
  `VerificationPanel` renders `outcome.hint`, `outcome.warnings`, and on failure `message` plus
  `details.hint`.
- **Bridge mock.** It gains an `invalid_request` sample so Playwright covers the toast.

### D7. `internal/textguard`: deterministic guards
- **Why a new package:** two current callers, `actions.runStep` (task log) and the eval harness.
  It is a pure-function package with one responsibility, and it keeps the already-large
  `actions` package from growing.
- **API.**
  - `Check(input, output string) Result`, where `Result.Flags []string` holds the spec's flag
    names.
  - `Result.Metrics` holds counts: sentences, lines, politeness, hedges, protected tokens, tells,
    and the edit ratio.
- **How each guard works.**
  - Sentence and line counts use the doc §2 heuristics, adjusted as follows:
    - lines are non-empty lines only, so collapsing blank lines is not a loss;
    - sentences do not split on URLs, versions, decimals or "…".
  - Politeness covers please, could/can you, thanks and acknowledgements ("Ok, got it").
  - Hedges are counted per family:
    - maybe/perhaps/might/probably;
    - I think/believe/suppose/guess;
    - seems/looks like/appears;
    - would;
    - try to.

    Contractions are expanded first (`'d` → would, `'ll` → will). A swap inside a family is not
    a loss; "would" → "will" is.
  - The calibration cases are in `docs/analysis/2026-10-17-eval-case-ideas.md` §4.
  - Protected tokens are URLs, `@mentions`, ticket-like IDs (`[A-Z]+-\d+`), numbers and inline
    code.
  - Tier-1 tells come from doc §9.3, NFKC-normalized and case-folded. A tell counts only when
    the output has more of it than the input.
  - The edit ratio is word-level LCS similarity, using no external dependency.
- **Lexicon.** Kept small and in one Go file (`lexicon.go`), so model drift is a one-file edit.

### D8. Eval harness
- **Location.** `internal/actions/eval_test.go` with `//go:build eval`, so it never runs in CI
  or in `go test ./...`. It is in package `actions` so it can build the real
  `ActionService`/`ChainOrchestrator` with the same constructors `application.go` uses:
  - `NewPlanner(v3.Catalog())`, `NewComposer`, `prompts.NewPromptService`;
  - `llms.NewProviderFactory(resty.New())`, `llms.NewLLMApiService`;
  - `gate.New()`;
  - a settings stub, and no-op history/tasklog stubs copied from `service_test.go`.
- **Configuration (env).**
  - `GOTEXT_EVAL_TARGETS`, for example
    `ollama|http://localhost:11434|gemma4:e4b;lmstudio|http://localhost:1234|<model>;openai|https://host|gpt-x|ENV_VAR_NAME`.
    A secret is read only through the env-var name.
  - `GOTEXT_EVAL_ACTIONS`, default `rewrite.proofread.basic,rewrite.proofread.enhanced`.
  - `GOTEXT_EVAL_TEMPERATURE` (default 0.2).
  - `GOTEXT_EVAL_REASONING` (default `off`).
  - `GOTEXT_EVAL_BASELINE`, an optional earlier report JSON.
  - `GOTEXT_EVAL_OUT`, default `.tmp/eval/reports`.
  - With no targets set, the test calls `t.Skip`.
- **Cases.** `internal/actions/testdata/eval/cases.jsonl` holds 40–60 synthetic or scrubbed cases
  with these fields:
  - `id`;
  - `kind`: `failure`, `clean` or `seeded`;
  - `actions` (optional);
  - `input`;
  - `keep` (optional): substrings that must survive, with `|`-separated alternatives;
  - `forbid` (optional): substrings that must not appear;
  - `fixes` (optional): `[{wrong, right: [alternatives]}]`;
  - `note`.

  The seed catalog and the anonymization rules are in
  `docs/analysis/2026-10-17-eval-case-ideas.md`. Raw cases from logs stay in git-ignored
  `.tmp/eval/cases/*.jsonl`, which the harness also loads when present.
- **Keep and forbid scoring.** Per-case `keep` and `forbid` hits are reported next to the
  metrics. A failed `keep` or `forbid` counts against the retention metric for that case
  family.
- **Metrics.** The doc §12.6 metrics are computed with `textguard.Check`:
  - clean no-op rate: output equals input after whitespace normalization;
  - seeded recall: output contains `right` and not `wrong`;
  - latency.
- **Report.** Each target × action gets `report.json` plus `report.md`, showing target,
  baseline, value and pass/fail per metric, and the failing cases with diffs.
- **Commands.**
  - `go test -tags eval -run TestPromptEval -timeout 90m -v ./internal/actions/`
  - `go vet -tags eval ./internal/actions/` keeps the file compiling.

### D9. Prompts
- **Proofread system prompt.**
  - `SysProofread` (doc §12.1 draft, without dashes) is added to `system.go`.
  - `Composer.systemPrompt` returns it when the group's first step has
    `Category == CatProofread`.
  - The five proofread entries become `Mergeable:false`, and `maxInferences` goes to 4. That way
    a valid saved stack can never exceed the cap, because only one proofread step is allowed per
    stack (exclusivity group).
  - The user prompt for a proofread group appends "Return only the corrected text, keeping every
    sentence."
- **House style.**
  - A shared `houseStyle` constant (doc §12.4, positive phrasing, at most 5 named items) is
    concatenated into every family's system prompt at const level.
  - Two families get a variant: `houseStyleTranslate` (dashes follow the target language) and
    `houseStylePromptEng` (no preface or offer only).
  - Family notes from doc §9.4 go into each prompt's existing rules.
  - The `SysRewrite` licences are tightened:
    - rule 6 and the "length close to source" line no longer let a directive override
      structure;
    - a keep line is added for greetings, politeness and hedges;
    - contractions and formality follow the target tone, not a blanket "natural".
- **Directives.**
  - New texts for basic, enhanced and humanize (doc §12.2–12.3).
  - All `— A, B, and C —` patterns become "X: A, B and C" (doc §12.5) across catalog.go and
    system.go.
  - A catalog test scans every directive and system prompt for U+2014.
- **Translate tokens.** `Composer.Compose` applies the existing token replacer to the system
  prompt too, so translate languages are filled. One function now serves both prompts.
- **Seeds.** The temperature seed in `db/db.go:366` and the repository fallback
  (`repository_sqlite.go:335`) both become 0.2. Existing rows are untouched.
- **Reasoning default.** It stays `default`. The eval may justify recommending `off` in docs, but
  the default changes only if the eval shows no recall loss.

## Risks / Trade-offs

- **Under-correction.** A preserving prompt can leave real errors. → The seeded-error recall
  target (≥ 85%) is a release gate, and the prompt keeps an explicit fix list.
- **Sanitizer misses a secret shape.** → Allowlist-style redaction for the known shapes, a
  300-char cap, tests with echoed keys, and the excerpt is never put in URLs.
- **Diagnosis costs up to 5 extra calls** in the Settings test only, under the gate. → It never
  runs in chain runs.
- **Proofread as its own inference adds latency** to proofread+X stacks. → This is accepted
  because it is the strongest faithfulness lever (doc §10 B4-lite). Reasoning `off` offsets it on
  local models.
- **Guard false positives**, for example a legitimate sentence split. → Guards only flag. The
  thresholds live in the eval, not in runtime behavior.
- **Thinking off may lower recall on small models.** → The eval measures both modes; the default
  stays `default`.
- **`think:"low"` on non-gpt-oss Ollama models** may be rejected or treated as true. → The new
  `invalid_request` message and inference-test diagnosis name it, and `off` exists.
- **Vendor guidance favours temperature 1.0 for Gemma 4 and gpt-oss.** → The eval decides. The
  seed affects new installs only.

## Migration Plan

- There is no DB migration. The new KV key falls back to `default`, and the seed change affects
  only new installs and "Reset to defaults".
- Bindings: one `wails generate module` after D1, D4 and D5. `ErrorCode` gains a value; existing
  TS switch statements fall through to defaults.
- Rollback is a plain revert. Stored `model.reasoningMode` rows are ignored by older builds.

## Verification

- **Gates.** `go test -race ./...`, `gofmt -l .`, `go vet ./...`,
  `go vet -tags eval ./internal/actions/`, `cd frontend && npm run verify`, and the bindings
  diff after `wails generate module`.
- **Eval.** Record a baseline before any prompt edit. After each prompt task, run the same
  command with `GOTEXT_EVAL_BASELINE` set. Commit the summaries to `docs/analysis/evals/`.
- **`wails dev` scenarios** (against local Ollama/LM Studio, or an `httptest`-style stub):
  - The inference test on a model with temperature enabled shows the bare check passing and the
    temperature hint when it is rejected.
  - A chain run against a 400 shows a single attempt in the log and the "Request rejected" toast
    with "Provider said".
  - A pinned azure path shows the warning.
  - A proofread+humanize stack runs 2 inferences, visible in the prompt inspector.
  - Task-log lines show `servedModel`, `promptVersion` and `guardFlags`.
