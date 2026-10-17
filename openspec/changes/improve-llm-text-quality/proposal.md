# Proposal

## Why

A review of 645 logged runs (`docs/analysis/2026-10-13-proofreading-quality-review.md`) found
four reasons proofreading got worse.

1. **The provider path was pinned.** A completion path without `{deployment}` silently ignored
   the model picker.
2. **Error messages pointed the wrong way.** The Settings inference test sent the saved optional
   parameters, and every HTTP 400 was reported as a retryable "server error". That led the owner
   to pin the path.
3. **The prompts licence damage.** Humanize, enhanced proofread and the shared rewrite system
   prompt let weaker models delete greetings, politeness and hedges. They also add AI tells:
   em dashes, contractions and "However".
4. **Nothing measures the result.** There are no evals, the app does not log which model
   actually answered, and no output is checked against its input.

The routing is fixed now, but any weaker model, proxy or local model (Gemma 4 E4B) will expose
causes 2–4 again.

## What Changes

**Honest request errors**
- HTTP 400 and 422 become a new non-retryable `invalid_request` error. It carries the provider's
  own message, sanitized and capped, and a hint naming the setting to change.
- Only 5xx stays a retryable "server error".

**Inference test and request settings**
- The Settings inference test sends a bare request first. If that succeeds, it checks the saved
  model settings and names the one optional parameter the model rejects.
- A pinned completion path produces a warning; it does not block the test.
- Azure completion URLs carry `api-version`.
- The fixed `n: 1` is no longer sent.
- A new reasoning-mode model setting (`default` / `off` / `low`) controls hidden thinking on
  local models and `reasoning_effort` on OpenAI-compatible APIs.

**Chain runs**
- Chain runs keep the served model, finish reason and token usage.
- A truncated answer (`finish_reason=length`) is logged as a warning.
- Prompt edge-case markers returned as output fail the step as `empty_completion`.

**Task log**
- The diagnostic task log records the served model, finish reason, usage, request host and path,
  a prompt-version hash and guard flags.
- Guard flags come from deterministic checks: greeting dropped, fewer sentences or lines,
  politeness or hedge lost, protected token lost, AI tell introduced. They never block a run.

**Prompts**
- Proofreading gets its own short system prompt and its own inference. Its system prompt says
  what to fix, what to keep, and to change nothing in already-correct text.
- Every family's system prompt carries a short "house style": add no new AI tells and keep the
  author's voice. No separate humanize step is needed.
- `rewrite.intent.humanize` stays, with the same ID, but is narrowed to replacing
  machine-sounding wording only.
- Em dashes and "— A, B, and C —" triplets are removed from all prompt texts.
- The translate system prompt's language placeholders are filled.
- The chain inference cap rises from 3 to 4, so no saved stack breaks when proofreading becomes
  its own inference.

**Defaults**
- The seed temperature for new installs becomes 0.2.

**UI**
- Error toasts and the Settings verification panel show the error's title and message, the hint,
  and a collapsible "Provider said" excerpt.
- Model settings get a reasoning-mode select.

**Evals**
- A developer-only Go eval harness runs the app's real planner, composer and LLM service against
  local and optional cloud models. It scores outputs with the same guards and gates prompt
  changes against a recorded baseline.

**Scope note.** This is one change with about 12 task groups, above the project's 10-task
guideline. The owner chose this deliberately to keep the diagnostics, the eval baseline and the
prompt rewrite in one plan.

**Out of scope**
- Learned per-model capabilities and a per-provider model config.
- Guard warnings in the UI, diff view as the default, and a "Use original" button.
- Edit-list JSON output, a runtime LLM judge, k-sample voting and chunking.
- Per-model prompt variants and automatic output fixes.

## Capabilities

### New Capabilities
- `llm-providers`: request error classification and messages, the Settings inference test with
  parameter diagnosis, pinned-path warning, and completion request shape.
- `chain-runs`: retry policy for request errors, detection of marker and truncated outputs, and
  the inference cap.
- `text-actions`: faithful proofreading, the shared house style for all families, narrowed
  humanize, and filled translate languages.
- `settings`: reasoning mode and the seed temperature.
- `app-data`: diagnostic task-log fields, including served model and guard flags.
- `app-shell`: error notifications that show the provider's message and a hint.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact

- **Backend:**
  - `internal/llms/` (http_errors, service, openai_provider, ollama_native, llms types);
  - `internal/apperr/` (new code and constructor, `VerifyOutcome` fields);
  - `internal/verification/`;
  - `internal/actions/` (service, composer, planner, eval harness, testdata);
  - new `internal/textguard/`;
  - `internal/prompts/v3/` (system.go, catalog.go);
  - `internal/settings/`, `internal/tasklog/`, and `internal/db/db.go` (seed);
  - `main.go` (EnumBind).
- **Bindings:** `wails generate module`, for the new `ErrorCode` value, the `VerifyOutcome`
  fields and the `ModelConfig` reasoning field. No DB migration; the new setting uses the
  existing KV table.
- **Frontend:**
  - `logic/store/notifications`;
  - `logic/store/settings/thunks.ts`;
  - `VerificationPanel`;
  - `ModelConfigTab`;
  - the bridge mock.
- **Docs:**
  - `docs/howto/verification.md` (eval command);
  - `docs/architecture/` (errors, LLM layer);
  - `docs/analysis/evals/` (baseline and comparison).
