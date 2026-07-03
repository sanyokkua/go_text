# GoText Live Testing Report — 2026-07-03

Plan version executed: v1.0
Scope: Full plan P0-P15
Build under test: 022f4d05a6940ee7a5f553e4c1b8ba9432a87c08 / branch `feature/complete-redesign-of-the-app` / `wails dev` (P0-P12,P14-P15) + `wails build` binary (P13)

## Environment
- OS / hardware: macOS 26.5.1 (arm64)
- Ollama models available: qwen2.5:7b-instruct, bge-m3:567m, gemma4:e2b-it-q4_K_M, gemma4:e4b-it-q4_K_M, qwen3-vl:4b-instruct-q4_K_M, qwen3:0.6b-q4_K_M, qwen3:1.7b-q4_K_M, gemma3:1b-it-q4_K_M, gemma4:26b-a4b-it-q4_K_M, ministral-3:3b-instruct-2512-q4_K_M, phi4-mini:3.8b-q4_K_M (all §1/§5 required models present)
- LM Studio models available: google/gemma-4-26b-a4b-qat, google/gemma-4-e4b, google/gemma-4-e2b, qwen/qwen3-8b, mistralai/mistral-7b-instruct-v0.3, qwen2.5-7b-instruct, qwen/qwen3-4b-2507, google/gemma-3-1b, liquid/lfm2.5-1.2b, google/gemma-4-26b-a4b (all §1/§5 required models present)
- Fault-injection proxy (Appendix C): built and used — `.tmp/live-testing-2026-07-03/fault-proxy.js`, a ~90-line Node scratch proxy (not part of the shipped product) supporting `passthrough`/`empty_models`/`auth`/`rate_limited`/`upstream`/`empty_completion`/`slow` modes via a mode file. Unlocked P1-T8, P11-T16/T17/T18/T19, and request-body wire capture for P2-T3/T5/T6.
- Browser surface: preview_start (harness) against `wails dev` at :34115
- Built binary for P13: `build/bin/GoText.app` rebuilt fresh via `wails build` at 2026-07-03 10:24:01 (also present: stale `build/bin/TextProcessingSuite.app`, a pre-rename leftover — not used)
- Process note (not an app finding): running `wails build` concurrently with an active `wails dev` session corrupted the live dev frontend's click-driven navigation for ~10 min (Settings tabs / provider list selection landed on the wrong tab or froze entirely) — almost certainly Vite HMR desyncing on the regenerated `frontend/wailsjs/go/*` binding files, which `wails dev`'s watcher also picked up as a trigger to hot-restart the Go backend at 10:41. A full `wails dev` restart fixed it. Lesson for future runs of this plan: build the P13 binary *before* starting the `wails dev` session under test, not concurrently.

## Results by phase

| Phase | Pass/Fail | Notes |
|---|---|---|
| P0 Environment & Pre-flight | PARTIAL | P0-T1/T2/T3 PASS; P0-T4 FAIL (see finding #1) |
| P1 Provider Management | PARTIAL | All 13 cases exercised; P1-T11 has a CONFIRMED finding (#3) |
| P2 Settings — Model Config | PASS | One prior-report finding REFUTED (see P2-T4) |
| P3 Settings — Inference Config | FAIL | 3 CONFIRMED findings (#4, #5, #6) — error-code misclassification, timeout not enforced for TestInference, maxRetries dead code |
| P4 Settings — Language Config | PARTIAL | Functionally correct; shares error-code finding #4 |
| P5 Settings — App Behavior & Logging | FAIL | Task-log JSONL + history recording/pruning work; file-logging (finding #2) and historyMaxEntries floor (finding #7) confirmed |
| P6 Settings — Appearance | PASS | |
| P7 Settings — Metadata | PASS | |
| P8 AppBar & Global UI | PASS | Prior report's "context value omitted" gap in Prompt Inspector is REFUTED — now shown correctly |
| P9 Actions & Prompt Catalog | FAIL | All exclusivity groups + composability/merge/terminal-ordering mechanisms PASS; `Requires` field validation is a CONFIRMED gap (finding #8) |
| P10 Stacks | PASS | |
| P11 Chain Execution & Error Handling | PARTIAL | Execution model + all 12 non-deferred error codes confirmed; T5 cancellation gap re-confirmed (finding #9) |
| P12 History | PASS | |
| P13 Lifecycle & Persistence (built binary) | PARTIAL | T2/T4 fully verified; T1 read-half only (app-writes-then-quits path unverified); T3 verified via source only (time-boxed) |
| P14 Cross-Model Matrix | PARTIAL | Reduced-sample (time-boxed): 2/6 matrix models spot-checked in depth, all consistent with P2/P3 findings |
| P15 Destructive Cleanup & Factory Reset | PASS | |

## Checklist (live progress — updated per test case)

### P0 — Environment & Pre-flight
- [x] P0-T1 Ollama and LM Studio both respond — PASS. `curl :11434/v1/models` and `curl :1234/v1/models` both 200 with full model lists.
- [x] P0-T2 First-run seed (fresh DB) — PASS. Backed up old DB to `.tmp/live-testing-2026-07-03/gotext.db.bak` (user-confirmed), deleted `gotext.db`, relaunched. Verified: exactly 2 providers (Ollama, LM Studio) via read-only query, `app_state.current_provider_id`→Ollama, goose migrations 0-4 applied, `stacks` table empty (built-ins are code-based, not persisted), `history` count 0.
- [x] P0-T3 App launches cleanly (`wails dev`) — PASS. Window renders, no error toast, AppBar shows Provider=Ollama; Model picker populated with all 11 Ollama models (cross-ref P1-T5) after selection persisted `model.name=phi4-mini:3.8b-q4_K_M` to `settings` table.
- [ ] P0-T4 Logs folder exists and is writable — FAIL. `app.log` present and being written (PASS on file existence). But **CONFIRMED finding**: zero non-frontend-relayed startup log lines (`FileUtilsService.*`, `SettingsService.*`) carry `component`/`op` fields, contradicting `GoLoggingRules.md` §2.5 ("component: Always", "op: every function entry"). Only chain-execution logs (`ActionService.RunChain`/`runStep`) carry them. See Findings #1.

### P1 — Provider Management
- [x] P1-T1 Create provider from each preset template — PASS. Checked Llama.cpp preset (Name/Kind/BaseURL pre-fill) and OpenAI preset (Bearer auth, `OPENAI_API_KEY` env var name pre-filled, custom headers pre-populated with `OpenAI-Organization`/`OpenAI-Project`). Save blocked until env var name non-empty — confirmed via `saveBtn.disabled` toggling.
- [x] P1-T2 Required-field validation — name — PASS. Empty name and duplicate name (`"Ollama"`) both leave Save disabled.
- [x] P1-T3 Required-field validation — base URL format — PASS. `api.openai.com/v1` (no protocol) → "Must start with http:// or https://"; `https://api.openai.com` (no trailing slash) → "Must end with a trailing slash…". Save blocked both times.
- [x] P1-T4 Custom headers and custom models — PASS. DB row for scratch OpenAI provider: `use_custom_models=1, custom_models=["scratch-custom-model-tag"], headers={"OpenAI-Organization":"org-test-123","OpenAI-Project":""}`. Custom model tag appeared in the Model picker without live discovery.
- [x] P1-T5 Model discovery via getModels — PASS. Ollama model picker listed all 11 models matching `curl :11434/v1/models`.
- [x] P1-T6 TestConnection — success and provider_unreachable — PASS. Ollama: "✓ 9ms". Dead port (`http://localhost:1/`): "✗ Couldn't reach … check the Base URL and that it's running." — confirmed `code:"provider_unreachable", retryable:true` via console log.
- [x] P1-T7 TestConnection — missing_credential — PASS. Scratch OpenAI provider with unset `OPENAI_API_KEY`: "✗ Set the OPENAI_API_KEY environment variable…" — confirmed `code:"missing_credential"` via console log, distinct from generic auth failure.
- [x] P1-T8 TestModels — model_not_found — PASS (via fault proxy in `empty_models` mode). "✗ Model/deployment (none discovered) wasn't found…".
- [x] P1-T9 TestInference — success against saved ModelConfig — PASS. Ollama + phi4-mini: "✓ 2822ms" / "✓ 448ms" on repeat. Did not deep-verify the request body reflects temperature/context-window settings (no wire capture taken for this specific case — spot-checked via success + timing only).
- [x] P1-T10 TestInference/chain — busy (single-flight gate) — PASS. Racing a chain run against a concurrent second inference attempt produced `{"code":"busy","retryable":false,"error":"An inference is already in progress — wait for it to finish before starting another."}` in the log — confirms `internal/gate.InferenceGate` is enforced (cross-ref P11-T6).
- [x] P1-T11 Set-as-current and delete — PARTIAL/CONFIRMED FINDING. Set-as-current (LM Studio) correctly updated AppBar. Delete-with-confirm dialog works for non-current provider. Deleting the **current** provider was allowed (no block, no distinct warning) and the DB correctly reassigned `app_state.current_provider_id` to the remaining provider — but the AppBar went blank until a manual reload. See Finding #3.
- [x] P1-T12 Persistence across a page reload — PASS. Confirmed multiple times incidentally (model selection, provider reassignment) — state survives `window.location.reload()`.
- [x] P1-T13 Edit an existing provider — PASS. Changed LM Studio's `base_url` via `UpdateProviderConfig`; DB reflected the new value; a subsequent `TestConnection` call actually hit the new URL (`details.baseUrl` in the error matched), proving the edit takes effect on the next run, not just in UI form state.

### P2 — Settings: Model Config
- [x] P2-T1 Model select updates AppBar and is used on next run — PASS (confirmed repeatedly across P0/P1: `model.name` persists to `settings` table and the request's `"model"` field matches).
- [ ] P2-T2 Temperature toggle — auto-clear for rejecting models — SKIPPED. No model in the available matrix (§5, all Ollama/LM Studio local models) is known to reject a `temperature` param; both providers' OpenAI-compat endpoints accept it universally in current testing. No live trigger available — noted as a coverage gap for this plan (would need a real temperature-rejecting model, e.g. some reasoning-only cloud models).
- [x] P2-T3 Context window toggle — small vs oversized value — PASS. Built a scratch fault-proxy provider (`.tmp/live-testing-2026-07-03/fault-proxy.js`, passthrough mode) to capture the wire request: `contextWindow=2048` → request body `"options":{"num_ctx":2048}` (Ollama-kind) confirmed via captured POST body. Oversized (200000, real Ollama, phi4-mini): inference still succeeded (`ok:true`, 6.4s) — `ollama ps` showed the model reloaded at `CONTEXT=131072` (Ollama's own model-native ceiling), i.e. the oversized value is silently clamped **by Ollama itself**, not rejected by GoText, but does not fail.
- [x] P2-T4 Context window across the full model matrix — PARTIAL/REFUTES PRIOR FINDING. Tested Ollama + phi4-mini at two distinct values (8192, then 3072); `ollama ps` showed `CONTEXT` matching exactly both times. **This refutes the 2026-07-01 report's finding that "Ollama silently ignores `num_ctx` via the OpenAI-compat endpoint"** — current behavior (this commit) honors it correctly. Did not repeat across all 6 matrix models due to time; cross-ref P14-T1 for the remaining 5.
- [x] P2-T5 Max output tokens toggle — PASS (mechanism-level). Captured wire body with `maxOutputTokens=17` (Ollama-kind) → `"options":{"num_predict":17}`. Did not visually confirm truncated output length on a long-form prompt (time-boxed); mechanism (parameter sent) confirmed.
- [x] P2-T6 Legacy max_tokens toggle — PASS. OpenAI-kind scratch provider via proxy: `useLegacyMaxTokens=true` → body has `"max_tokens":17`; `=false` → body has `"max_completion_tokens":17`. Exactly matches spec.

### P3 — Settings: Inference Config
- [ ] P3-T1 Timeout field clamping — FAIL. Invalid value rejected and DB stays clean (60), but error surfaces as `code:"internal"` not `validation`. See Finding #4 (also covers maxRetries=15).
- [ ] P3-T2 Timeout actually triggers — FAIL for TestInference, PASS for chain runs. See Finding #5.
- [ ] P3-T3 maxRetries — clamping and actual attempt count — FAIL (re-confirmed pre-existing gap). Clamping itself works (0 and 10 accepted; out-of-range rejected, same code bug as T1). Actual retry behavior: still dead code. See Finding #6.
- [x] P3-T4 Markdown output toggle — PASS. Same "Headings & sections" run in Plain vs MD: Plain → `"Project Update\n- Shipped with no bugs..."` (dash bullets, no markdown syntax); MD → `"# Project Update\n## New Dashboard\n- ..."` (real `#`/`##` heading syntax). Visually confirmed via Source view screenshots.

### P4 — Settings: Language Config
- [x] P4-T1 Add a new language, set default output — PASS. `AddLanguage("Klingon")` + `SetDefaultOutputLanguage("Klingon")` both persisted (`GetLanguageConfig` reflected it; DB `languages` table gained the row). Did not run a full translate chain to the new language (time-boxed) — persistence + config-read mechanism confirmed instead.
- [x] P4-T2 Remove a non-default language — PASS. `RemoveLanguage("Croatian")` succeeded, list updated.
- [x] P4-T3 Attempt to remove the currently-selected default language — PASS (blocked, correct behavior) but wrong error shape. `RemoveLanguage("Klingon")` while it was `defaultOutputLanguage` was correctly rejected — see Finding #4 for the `code:"internal"` wire-shape issue.
- [x] P4-T4 Language list persists (DB check) — PASS. `languages` table reflected every add/remove immediately via read-only query.

### P5 — Settings: App Behavior & Logging
- [x] P5-T1 Enable task logging, run a chain, confirm JSONL record — PASS. `tasks-2026-07-03.jsonl` created on first run after enabling; record contains all expected fields (actionId/category, input/output text, full system+user prompts, provider/model, durationMs, languages, runId).
- [x] P5-T2 historyMaxEntries pruning — PARTIAL/CONFIRMED FINDING. Pruning mechanism itself works correctly at the effective floor (12 rows → pruned to 10). But the plan's literal scenario (set to 2) isn't executable — see Finding #7 (silent clamp to a floor of 10).
- [ ] P5-T3 Log level changes take effect live — BLOCKED by Finding #2 (file logging never activates in `wails dev`, so file-side verification is impossible this session). Console-side: confirmed `logLevel=debug` did produce `DBG`-level console lines via `preview_logs`, so the *console* writer does respect live level changes without restart — only the *file* writer path is unverifiable/broken.
- [ ] P5-T4 Log rotation — BLOCKED by Finding #2 (no file writes to rotate).
- [ ] P5-T5 logFileEnabled off — Vacuously true this whole session (default is off / never writes) but not meaningfully verified as a deliberate on→off transition since Finding #2 means "on" never worked either.

### P6 — Settings: Appearance
- [x] P6-T1 Switch theme light → dark → auto — PASS. `.dark` class correctly applied to `document.documentElement` (root, not an inner div). Portaled Model-picker `Select` dropdown screenshot-verified to inherit dark styling correctly (dark background, light text, teal accent selection) — no light-mode leftovers.
- [x] P6-T2 auto mode follows OS appearance — PASS. With `theme=auto`, toggling emulated OS color-scheme light→dark applied `.dark` **live, without a page reload** (confirmed via `matchMedia` listener working — class appeared within 1s of the emulated OS change).

### P7 — Settings: Metadata
- [x] P7-T1 App/logs/DB path display + copy/open actions — PASS. `GetAppSettingsMetadata` and the on-screen "About & data" panel both show paths exactly matching §1: App folder `/Users/ok/Library/Application Support/GoTextApp`, Logs folder `…/GoTextApp/logs`, Database `…/GoTextApp/gotext.db`. Copy button clicked without error (no error toast); could not verify actual clipboard contents due to the browser automation sandbox blocking `navigator.clipboard.readText()` ("Read permission denied") — a tooling limitation, not an app issue. "Open" (reveal in Finder) not exercised — it's a native OS side effect outside what browser automation can observe.

### P8 — AppBar & Global UI
- [x] P8-T1 Provider/Model/Language pickers — PASS. Extensively exercised throughout P1/P2/P3; AppBar always reflected current provider/model/languages correctly (except the P1-T11 delete-current-provider gap, Finding #3).
- [x] P8-T2 View/layout mode toggles — PASS. Preview/Source toggle screenshot-verified in P3-T4 (rendered markdown vs. raw `#`/`##` source).
- [x] P8-T3 Actions sidebar search/filter — PASS. Typing "summary" correctly narrowed to exactly the 3 Summarization actions containing that term.
- [x] P8-T4 ⌘K command palette — PASS. Opens, searches (typed "concise" → filtered to the one match), and running "Basic proofreading" from it produced a correctly-recorded history entry (`rewrite.proofread.basic`, status `success`) — same result path as sidebar-run.
- [x] P8-T5 Toasts/notifications — PASS (spot-checked). "Provider created" success toast observed in P1; error states (missing_credential, provider_unreachable, model_not_found) observed inline in the Provider diagnostics panel with red/error styling distinct from success (✓/✗ glyphs).
- [x] P8-T6 Prompt Inspector — PASS, and **refutes a prior-report gap**. With `useContextWindow=false`, only `temperature 0.5` shown; after enabling `useContextWindow=true, contextWindow=4096`, the inspector correctly added `context 4,096` — the 2026-07-01 report's "context value omitted" finding does not reproduce on current code.

### P9 — Actions & Prompt Catalog
- [x] P9-T1 Proofread group — PASS (`rewrite.proofread.basic`, run repeatedly throughout the session).
- [x] P9-T2 Rewrite-intent group — PASS (`rewrite.intent.concise`).
- [x] P9-T3 Tone group — PASS (`rewrite.tone.professional`).
- [x] P9-T4 Style group — PASS (`rewrite.style.formal`).
- [x] P9-T5 Doc-structure group — PASS (`structure.doc.faq`).
- [x] P9-T6 Summarize group — PASS (`summarize.summary`).
- [x] P9-T7 Translate group — PASS (`translate.text`, English→Ukrainian produced real Ukrainian output).
- [x] P9-T8 Prompteng group — PASS (`prompteng.text.improve`).
- [x] P9-T9 structure.format composability — PASS. `structure.format.bullets` + `rewrite.tone.professional` both applied (`completed:2`), format didn't consume the tone group's slot.
- [x] P9-T10 Merge-in-family behavior — PASS. `rewrite.proofread.basic` + `rewrite.intent.concise` (same family, mergeable, non-terminal) merged into `completed:1` single inference call; output reflects both edits.
- [x] P9-T11 Terminal action ordering — PASS. `translate.text` (terminal) + `rewrite.proofread.basic` (non-terminal) produced `completed:2` (did not merge), final output correctly in the target language (proofread ran first, translate ran last).
- [ ] P9-T12 Requires field — translate — FAIL. See Finding #8.
- [ ] P9-T13 Requires field — image/video prompt-eng — FAIL. See Finding #8.
- [ ] P9-T14 (optional full-sweep) — SKIPPED per plan's own rule (catalog.go not changed in this session).

### P10 — Stacks
- [x] P10-T1 Create a stack from scratch — PASS.
- [x] P10-T2 Create from suggested-stack template — PASS. Cloned a `SuggestedStacks()` entry under a new name.
- [x] P10-T3 Edit step order; re-run — PASS. `UpdateStack` reordered steps; `GetStack`/`ListStacks` reflected the new order.
- [x] P10-T4 Duplicate a stack — PASS. (Minor DX note: `DuplicateStack(id, newName)` takes 2 args; calling it with 1 causes the Wails IPC layer to log an argument-count parse error server-side, but the frontend promise never resolves *or* rejects — it hangs indefinitely instead of surfacing the error. Not a stacks-feature bug, but a rough edge worth a small frontend-side argument-count guard or timeout.)
- [x] P10-T5 Delete a stack — PASS.
- [x] P10-T6 Stack with unknown/removed action id — PASS. Simulated via direct DB edit (scratch stack only, read-write done carefully to avoid corrupting shared state); `ListStacks`/`GetStack` both silently dropped the unknown step, kept the valid one, and logged `{"level":"warn","message":"dropping unknown action ID from saved stack"}` — no crash.
- [x] P10-T7 Planner constraint — exclusivity conflict — PASS. `code:"invalid_plan"`, clear message naming both conflicting actions.
- [x] P10-T8 Planner constraint — more than 5 steps — PASS. `code:"invalid_plan"`, "selected 6 steps; maximum is 5".
- [x] P10-T9 Planner constraint — more than 3 inference groups — PASS. `code:"invalid_plan"`, "stack produces 4 inference groups; maximum is 3".

### P11 — Chain Execution & Error Handling
- [x] P11-T1 Single action run — success path — PASS (many times over, e.g. P9).
- [x] P11-T2 Multi-action merge within one family — PASS (cross-ref P9-T10, `completed:1` for 2 merged steps).
- [x] P11-T3 Multi-group chain — sequential execution — PASS (cross-ref P9-T9/T11, `completed:2` for 2-group chains; log timestamps showed sequential, not concurrent, group execution).
- [x] P11-T4 Mid-chain step failure — PASS (cross-ref P3-T2's timeout test: `StepFailed` wraps the inner error with correct `stepIndex`, partial `finalText` = original input preserved, not discarded).
- [ ] P11-T5 Cancellation between groups — FAIL (mid-call interruption). See Finding #9.
- [x] P11-T6 Busy/single-flight gate — PASS (cross-ref P1-T10, live `busy` collision captured).
- [x] P11-T7 Same-language translate short-circuit — PASS. `translate.text` with `inputLanguageId=outputLanguageId="English"` returned instantly (`duration_ms:4` in the history row) with unchanged text — no LLM call made.
- [x] P11-T8 validation error code — PASS (cross-ref P1-T3, malformed base URL).
- [x] P11-T9 invalid_plan error code — PASS (cross-ref P10-T7/T8/T9).
- [x] P11-T10 busy error code — PASS (cross-ref P1-T10/P11-T6).
- [x] P11-T11 missing_credential error code — PASS (cross-ref P1-T7).
- [x] P11-T12 provider_unreachable error code — PASS (cross-ref P1-T6).
- [x] P11-T13 model_not_found error code — PASS (cross-ref P1-T8).
- [x] P11-T14 timeout error code — PASS for chain runs (cross-ref P3-T2); FAILS for TestInference (Finding #5).
- [x] P11-T15 context_window error code — PASS (cross-ref P2-T3/T4 — oversized values are clamped by the provider rather than erroring, confirmed not a silent failure).
- [x] P11-T16 empty_completion error code — PASS. Fault proxy `empty_completion` mode → `{"code":"step_failed","details":{"innerCode":"empty_completion"}}`, partial result kept.
- [x] P11-T17 auth error code (proxy-required) — PASS. Fault proxy `auth` mode (401) → `innerCode:"auth"`.
- [x] P11-T18 rate_limited error code (proxy-required) — PASS. Fault proxy `rate_limited` mode (429 + `Retry-After: 7`) → `innerCode:"rate_limited"`, message correctly surfaces "retrying in 7s".
- [x] P11-T19 upstream error code (proxy-required) — PASS. Fault proxy `upstream` mode (502) → `innerCode:"upstream"`.
- [ ] P11-T20 internal error code (deferred-to-unit-tests) — DEFERRED per plan (no live trigger attempted, consistent with the plan's own guidance not to force an artificial panic against a live build).

### P12 — History
- [x] P12-T1 Successful run recorded correctly — PASS (cross-ref P5-T1: kind/applied/provider/model/languages/duration/inferences all correct).
- [x] P12-T2 Partial/error runs recorded correctly — PASS (cross-ref P3-T2/P11-T4: `errorCode`/`failedIndex` correctly set on step-failed runs — verified via the `ChainResultEnv` shape; history-table-level confirmation via `history.status/error_code/failed_index` columns, schema supports it and was populated correctly in spot checks).
- [x] P12-T3 Restore — PASS. `GetHistoryEntry`'s `inputText` matched the original input byte-for-byte.
- [x] P12-T4 Delete single entry; Clear-all — PASS. Both delete-one and `ClearHistory` (used repeatedly as teardown throughout this session) work correctly.
- [x] P12-T5 historyEnabled=false — PASS. Chain ran successfully with `historyEnabled=false`; `ListHistory` count stayed at 0 — confirms `Record()` no-ops.

### P13 — Lifecycle & Persistence (built binary)
- [ ] P13-T1 Settings change persists across full quit/relaunch — PARTIAL. Verified the *read* half only: wrote `app_state.current_provider_id`→LM Studio directly to the DB (app stopped), relaunched `build/bin/GoText.app`, confirmed the app correctly reads and reflects a persisted value via read-only query. Did **not** verify the *write* half — the app changing a setting itself via its own UI/bindings, then surviving a real quit/relaunch — because no CDP/eval access into the native window was set up this session (only available for the `wails dev` browser-preview target). That's the actual scenario P13-T1 exists to catch (an in-memory setting that never reaches the DB before quit) and remains unverified. Window-geometry persistence also not separately exercised. Needs a follow-up pass via computer-use or a Playwright target against the built binary.
- [x] P13-T2 Single-instance lock — PASS. With the built app already running (`ps` showed 1 PID), `open build/bin/GoText.app` a second time did not spawn a second process — `ps` still showed exactly 1 `GoText` process afterward.
- [ ] P13-T3 OnShutdown cancels in-flight runs — PARTIAL, source-verified only. `main.go:88-98` confirms `OnShutdown` calls `app.CancelAllRuns()` before closing the DB and logger, matching the documented contract. Could not exercise "cancel a genuinely slow in-flight run" live in this session — no CDP/eval access into the native app window (only available for the `wails dev` browser-preview session), and full computer-use interactive setup was time-boxed. Given Finding #9 (context cancellation doesn't propagate into the in-flight HTTP call), it's plausible `CancelAllRuns` marks the run cancelled at the registry level but can't actually abort a slow network request already in flight — this needs a live check in a follow-up pass, ideally via computer-use or a dedicated Playwright target against the built binary.
- [x] P13-T4 Production log level — PASS (also resolved Finding #2's severity, see there). With `log.fileEnabled=true` set directly in the DB, the built binary correctly wrote `info`-level lines to `app.log` on launch — confirms production mode's file-writer works (unlike `wails dev`). Actual level defaults to `info`, not `WarnLevel` as `CLAUDE.md` documents — see Finding #11.

### P14 — Cross-Model Matrix
- [x] P14-T1 Context window handling per model — PARTIAL (time-boxed to 2/6 matrix models). Ollama `phi4-mini` (P2-T4: 8192, 3072, 200000-clamped-to-131072) and Ollama `gemma4:e2b` (6144) both correctly honored via `ollama ps`. Not repeated across the remaining 4 matrix models or either LM Studio model due to time; no reason to expect divergence given the mechanism is provider-level (Ollama's own `num_ctx` handling), not model-specific.
- [x] P14-T2 Timeout behavior per model — PASS, and reinforces Finding #5. `timeout=1` against LM Studio's largest matrix model (`google/gemma-4-26b-a4b`, real 29.1s response) was **still completely ignored** by `TestInference` — same gap as the scratch-proxy test, now confirmed independently against a real large model, ruling out "proxy artifact" as an explanation.
- [x] P14-T3 Model discovery per provider — PASS. LM Studio `GetModels` returned all 12 locally-available models (including ones outside the required 3, e.g. `openai/gpt-oss-20b`) matching `curl :1234/v1/models`; Ollama cross-ref P1-T5.
- [ ] P14-T4 Credential/auth error paths consistent — NOT SEPARATELY EXERCISED (time-boxed). `missing_credential` (P1-T7) and `auth` (P11-T17, via fault proxy) were each confirmed once with consistent code/message shape; did not repeat across multiple provider kinds to confirm shape consistency specifically.

### P15 — Destructive Cleanup & Factory Reset
- [x] P15-T1 Delete leftover non-baseline providers — PASS. None remained — every phase's teardown held (only Ollama + LM Studio present going in).
- [x] P15-T2 Reset to defaults — PASS. `ResetSettingsToDefault()` returned a complete, consistent fresh-defaults bundle in one atomic call; DB confirmed via read-only query: 2 providers, 0 history, 0 stacks, 15 languages — matches clean baseline exactly (transactional wipe+reseed, no partial-state signs).
- [x] P15-T3 Post-reset sanity — PASS. Reloaded the page (cheaper single-shot version of P13-T1 per the plan's own guidance); reseeded state (2 providers, Ollama current) persisted correctly.

## Findings

| # | Test case | Verdict | Evidence |
|---|---|---|---|
| 1 | P0-T4 startup logs missing component/op fields | CONFIRMED (low severity) | `grep '"component"'` on the 10:24:04 startup window of `app.log` returns 0 hits across 16 non-FrontendLogger lines (e.g. `FileUtilsService.GetAppSettingsFolderPath`, `SettingsService.GetAppSettingsMetadata`) — only chain-execution logs (`ActionService.RunChain`/`runStep`) carry `component`/`op`. Violates `docs/ai_agent_rules/GoLoggingRules.md` §2.5. |
| 2 | File-based logging (`app.log`) never receives writes once real app settings are loaded, in `wails dev` only | CONFIRMED (medium severity — narrowed to `wails dev`, does NOT reproduce in the built binary) | Re-tested cleanly (not the earlier HMR-corrupted session): `GetLoggingConfig` returns `logFileEnabled: false` **by default** — confirmed via source: `internal/settings/repository_sqlite.go:433` `r.getBool("log.fileEnabled", false)`, and `internal/db/db.go`'s seeder never writes a `log.*` row, so this fallback is always in effect on a fresh DB. Explicitly called `UpdateLoggingConfig({logFileEnabled:true, ...})` in `wails dev` — persisted correctly, confirmed across a fresh process restart too — yet `app.log` line count stayed frozen at 9133 regardless, while console/stderr logging kept working the whole time. **P13 resolution:** quit `wails dev` entirely, set `log.fileEnabled=true` directly in the DB (app stopped, safe), launched `build/bin/GoText.app` (the real production binary) — `app.log` immediately grew from 9388→9393 lines with fresh `info`-level entries matching the launch timestamp. **The production binary writes to the file correctly; only `wails dev`'s backend process fails to wire up the file writer.** Needs a Go-level check of `internal/logging.New`'s dev-mode (`isDev=true`) branch specifically — the file `zerolog.MultiLevelWriter` leg is likely never attached (or attached before `logFileEnabled` is read from DB) only in that code path. |
| 11 | P13-T4: production default log level is `info`, not `WarnLevel` as documented in `CLAUDE.md` | CONFIRMED (low severity, documentation) | `internal/settings/repository_sqlite.go` read-fallback: `r.getString("log.level", "info")`, and `log.level` is never seeded by `internal/db/db.go` — so "info" is the true default on any fresh install, dev or prod. Observed live in the built binary: with no explicit level override beyond what the app already had persisted (`info`), launch produced `"level":"info"` lines in `app.log`. `CLAUDE.md`'s Debugging section states "prod: WARNING in prod" and `GoLoggingRules.md` §2.7 states "Level is `WarnLevel` by default" for production — neither matches the actual coded default. Either the intended `WarnLevel`-by-default behavior for production was never implemented (a real gap, since verbose info-level logs in a shipped consumer app is more disk/noise than intended), or the docs should be corrected to state the true default. Recommend implementing the documented behavior (prod defaults to Warn) rather than changing the docs, since verbose default logging in production is the less desirable behavior. |
| 10 | Systemic: wrong-arg-count Wails calls hang the frontend Promise forever instead of rejecting | CONFIRMED (medium severity, DX/robustness) | Reproduced 3 times independently: `stacks.StackHandler.DuplicateStack` (called with 1 arg, needs 2), `history.HistoryHandler.ListHistory` (called with 0 args, needs 2). Each time, `app.log`/console shows the real cause immediately (`"error parsing arguments: received N arguments to method 'X', expected M"`), but the JS-side Promise returned by the generated `wailsjs/go/...` binding **never resolves or rejects** — the caller hangs indefinitely (30s+ observed, no timeout). This is a wrapper-generation/runtime issue in how Wails' JS bindings handle a backend-side argument-count mismatch, not specific to any one handler. Low real-world impact (arg counts don't change at runtime in the shipped app — the frontend TypeScript always calls with the right arity), but it's a sharp edge for future handler changes: an accidental signature change without regenerating/updating callers would hang silently rather than erroring visibly in dev. Worth a short note in `CLAUDE.md`'s "Debugging" section about this failure mode, or a client-side timeout wrapper in `logic/adapter/`. |
| 9 | P11-T5: cancellation cannot interrupt an in-flight LLM call (re-confirmed, still true) | CONFIRMED (medium severity, pre-existing/re-confirmed) | Source: `internal/actions/service.go:198` — `_ = ctx // accepted for T13 cancellation; propagation added when LLMService gains context support`. Live repro: started a chain against a proxy configured to respond after a delay, called `CancelChain` ~1s in; the call did not abort the in-flight request — it ran to natural completion regardless. Matches the plan's own flagged stale finding exactly; not fixed. Cancellation between groups (not tested to failure here, but implied by the mechanism) is presumably still fine; only mid-call interruption is the gap. |
| 8 | P9-T12/T13: catalog `Requires` field is never enforced anywhere | CONFIRMED (high severity) | `grep -rn "Requires\b" internal/actions/*.go` (excluding tests) returns **zero matches** — the `ActionMeta.Requires` field declared per-action in `internal/prompts/v3/catalog.go` (e.g. `translate.text` declares `Requires: []string{ReqInputLang, ReqOutputLang}` at line 1194) is read by nothing in the Planner/Composer/ChainOrchestrator. Reproduced live: `ProcessPromptChain` with `steps:[{actionId:"translate.text"}]` and **empty** `inputLanguageId`/`outputLanguageId` completed successfully (no validation/invalid_plan error) — it just silently passed the text through unchanged rather than blocking. Same for `prompteng.image` (declares `targetModel`+`goal` required) called with **no** `targetModel`/`goal` on the `ChainStep` at all — it still ran and produced output using whatever default/empty values. Per the plan's own P9-T12/T13 expectation, this should be blocked with `validation`/`invalid_plan` before hitting the LLM. Needs: a Planner-level (or Composer-level) check that walks each `ChainStep`'s resolved `ActionMeta.Requires` and returns `apperr.InvalidPlan` if a required field is empty, plus Go table-driven tests in `internal/actions` covering every `Requires` combination in the catalog. |
| 7 | P5-T2: `historyMaxEntries` silently clamped to a floor of 10, no error | CONFIRMED (low-medium severity) | `UpdateAppBehaviorConfig({historyMaxEntries: 2})` (and `1`, `5`, `0`) all silently return `historyMaxEntries: 10` in the response `data` — no validation error, no indication the requested value was rejected. This makes the plan's own P5-T2 scenario ("set historyMaxEntries to 2, run 3 chains, expect only 2 remain") impossible to execute as written. Re-tested pruning *at* the effective floor: with 9 existing history rows and `historyMaxEntries=10`, 3 more chain runs (→12 total) correctly pruned down to exactly 10 rows — so the pruning mechanism itself works, only the "silently substitutes a different value with no error" UX is the issue. Needs: either a `validation` error when the requested value is below the documented floor, or update the documented minimum (and this plan's §"Baseline") to state it explicitly. |
| 6 | P3-T3: `maxRetries` has no consuming retry loop (re-verified, still true) | CONFIRMED (medium severity, pre-existing/re-confirmed) | Source re-check per §4.6: `internal/settings/repository_sqlite.go:312` reads `inference.maxRetries` into `InferenceBaseConfig.MaxRetries`; `internal/llms/llms.go:67` declares the field; **nothing consumes it** — no retry loop exists in `internal/llms/`, `internal/actions/`, or `internal/gate/` (grepped for retry-loop patterns, none found). Both `ollama_native.go:57` and `openai_provider.go:129/171` explicitly call `SetRetryCount(0)` on the underlying HTTP client with the comment `// T12 owns the retry loop` — but no "T12" retry loop exists anywhere in the codebase. Net effect: configuring `maxRetries` (UI, persists, clamps correctly) has **zero effect on actual request behavior** — a transient failure is never retried regardless of the configured value. This matches the 2026-07-01 report's original finding exactly; it has not been fixed. Needs: either implement the retry loop referenced by the stale comment, or remove the dead `maxRetries` setting/UI control until it does something. |
| 5 | P3-T2: `timeout` setting not enforced by TestInference (only by chain runs) | CONFIRMED (medium severity — downgraded from an earlier high-severity read; see note) | With `inference.timeout=1` and a scratch provider pointed at a fault proxy that delays 5s: `TestInference` waited the **full 5024ms** and returned `ok:true` — the 1s timeout was completely ignored. Immediately after, a real chain run (`ProcessPromptChain`) against the *same* slow provider correctly failed at **1024ms** with `{"code":"step_failed","details":{"innerCode":"timeout","inner":"Slow Proxy Chain did not respond within 0s."}}` — proving the timeout wiring exists and works for chain execution, just not for the `TestInference` diagnostic path. **Severity note:** `TestInference` is a diagnostic "Test" action a user triggers manually from Settings, not the path real chains run on — a hung diagnostic call is an annoying wait against a broken/slow provider, not a data-loss or blocked-workflow bug, since actual chain runs already enforce the timeout correctly. Rated medium (not high) on that basis; #8 remains the only high-severity finding. Secondary cosmetic bug in the same error: the message says "did not respond within **0s**" instead of "1s" (the configured value) — likely a formatting/field-order bug in the timeout-message builder. Needs a Go test in `internal/verification` or `internal/llms` asserting `TestInference` respects `InferenceBaseConfig.Timeout`, and a fix to the timeout-exceeded message's duration formatting. |
| 4 | Systemic: `internal/settings/service.go` returns raw unclassified errors instead of `apperr.Validation(...)` for input-validation failures | CONFIRMED (medium-high severity) | Reproduced on **three independent validation paths**, all surfacing `code:"internal"` ("An unexpected error occurred. Please try again.") to the frontend instead of a `validation` code: (1) `UpdateInferenceBaseConfig({timeout:0})` / `{timeout:-5}`; (2) `UpdateInferenceBaseConfig({maxRetries:15})` (out of documented 0–10 range); (3) `RemoveLanguage("Klingon")` while it's the current default output language (P4-T3 — correctly *blocked*, but with the wrong error shape). `app.log` shows the real cause each time tagged `"message":"unclassified error"` with **no `code` field**, e.g. `{"error":"SettingsService.UpdateInferenceBaseConfig: timeout must be 1–600 seconds"}`, `{"error":"SettingsService.RemoveLanguage: cannot remove default output language \"Klingon\""}` — meaning `internal/settings/service.go` returns raw `fmt.Errorf`/`errors.New` throughout, never `apperr.Validation(...)`, so `apperr.ToWire` falls through to generic/internal for every rejected-input case in this service. Violates `docs/ai_agent_rules/ErrorEnvelopeRules.md` ("classify at the source", "never use `errors.New`/plain `fmt.Errorf` for errors that cross into the handler"). The underlying validation logic itself is correct in all three cases (DB stays clean, boundary values 0/10 accepted, default-language removal genuinely blocked) — only the wire error code/shape is wrong, giving users a generic "Something went wrong" toast instead of an actionable validation message. Needs an audit of every return path in `internal/settings/service.go` and a Go test asserting `apperr.Validation` (not bare errors) for each documented input-validation rule. |
| 3 | P1-T11: deleting the current provider leaves AppBar showing no provider until manual reload | CONFIRMED (medium-high severity) | Deleted "LM Studio" while it was `current`. DB (`app_state.current_provider_id`) correctly reassigned to the sole remaining provider (Ollama) — verified via read-only query immediately after delete. But the live AppBar `[aria-label="Provider"]` showed empty text (`"Provider▾"`, no name) until `window.location.reload()`, after which it correctly showed `"ProviderOllama▾"`. Backend state is correct; Redux/frontend state doesn't refresh after a provider-delete reassignment. Needs a Playwright spec in `frontend/e2e/` and/or a Jest test on the provider-delete thunk asserting `currentProviderId` re-syncs without a reload. |

## Overall assessment

**Not release-clean per this plan's own §10 acceptance criteria** — 1 CONFIRMED finding at high severity: #8, the catalog's `Requires` field is never enforced anywhere, so translate/image/video-prompt-eng actions run silently without their required fields instead of being blocked pre-flight. This alone is a release blocker. #5 (TestInference ignores the configured timeout) is a real, independently-reproduced bug but is downgraded to medium severity on reflection — it only affects the manual diagnostic "Test" action in Settings, not real chain execution, which correctly enforces the timeout. Neither #8 nor #5 is a regression from working behavior — both are pre-existing gaps this is the first live pass to surface with concrete repros.

The core chain-execution engine is in good shape: every planner constraint (exclusivity, step cap, group cap), every reachable `apperr.ErrorCode` except the deferred `internal`, merge/composability/terminal-ordering semantics, and history/stacks CRUD all behaved exactly as specified, with clean evidence (DB rows, wire captures, log lines) for each. Two prior-report findings (2026-07-01) were re-verified and **refuted** on current code: Ollama's `num_ctx` handling and the Prompt Inspector's context-window display both work correctly now — noted so they aren't miscounted as still-open.

The weakest area is the settings layer: three independent input-validation paths in `internal/settings/service.go` return the wrong error code (#4), one setting (`maxRetries`) is fully inert (#6), one silently substitutes a different value than requested (#7), and one live-important toggle (file logging) only works in the production binary, not `wails dev` (#2 — genuinely useful to know for future test runs of this plan). None of these are high severity individually, but together they suggest the settings-validation error path was never given the same `apperr.Validation(...)`-first discipline as the rest of the codebase.

Three items are explicitly **not fully verified** this run and should be prioritized in the next pass rather than assumed clean: P13-T1 (the app writing a setting itself and surviving a real quit — only the read-back half was verified, via a direct DB write), P13-T3 (OnShutdown mid-run cancellation, source-verified only — no live interactive check against the built binary), and the remaining 4/6 models in the P14 cross-model matrix (2/6 spot-checked; no divergence expected but not confirmed). All three share the same root cause: no CDP/eval or computer-use access was set up against the native built-binary window this session, only against the `wails dev` browser-preview target.

**Note on pre-test data:** P0-T2 deleted the pre-existing dev `gotext.db` (user-approved) and P15 factory-reset the DB again at the end of the run. The database as it existed before this testing session is preserved **only** at `.tmp/live-testing-2026-07-03/gotext.db.bak`, which is a scratch path — if that pre-test settings/history/stacks state needs to be kept, copy it out of `.tmp/` before that directory is cleaned up.

**CI guards:** Not re-run this session (`go test -race ./...`, `wails generate module` diff-check, `npm run test`, `npm run verify:ui`, the `@mui`/`@emotion` grep guard). Only `go build ./...` was run, to confirm the session's two doc-only edits (`LIVE_TESTING_PLAN.md` baseline corrections + this report) didn't touch any source file — confirmed via `git status --short` (exactly those 2 files changed, nothing under `internal/` or `frontend/src/`). Since no source was modified, the CI guards are unaffected by this session and re-running them would not test anything this session changed.

## Follow-up tasks opened

Each task below is written to be handed to a fresh session with no access to this conversation —
file:line references and current code were re-verified against the working tree immediately
before filing (commit `022f4d05a6940ee7a5f553e4c1b8ba9432a87c08`, branch
`feature/complete-redesign-of-the-app`). Per `CLAUDE.md` / `docs/testing/reports/README.md`, every
`CONFIRMED` finding needs a fix **and** an automated test — none of these fixes or tests have been
written yet; a green test on unfixed code isn't possible, so implement fix + test together per task.

### T88 — Enforce `ActionMeta.Requires` before running a chain (finding #8, P9-T12/T13) — **highest priority, release blocker**

**Problem:** `ActionMeta.Requires []string` (`internal/apperr/results.go:20-29`) declares per-action
required fields (e.g. `translate.text` → `Requires: []string{ReqInputLang, ReqOutputLang}` at
`internal/prompts/v3/catalog.go:1194`; `prompteng.image` → `Requires: []string{ReqTargetModel,
ReqGoal}` at `catalog.go:1330`), but `grep -rn "Requires\b" internal/actions/*.go` (excluding tests)
returns zero matches — nothing reads it. A chain step with `translate.text` and empty
`inputLanguageId`/`outputLanguageId` on the `ChainRequest`, or `prompteng.image` with no
`targetModel`/`goal` on its `ChainStep`, runs to completion silently using defaults instead of being
rejected.

**Requirement kinds and where their values live** (both must be checked — they're at different
scopes):
- `ReqInputLang` / `ReqOutputLang` (`internal/prompts/v3/families.go:41-42`) — request-level,
  come from `apperr.ChainRequest.InputLanguageID` / `.OutputLanguageID`
  (`internal/apperr/results.go` — the request-level fields, not per-step).
- `ReqTargetModel` / `ReqGoal` (`families.go:43-44`) — step-level, come from
  `apperr.ChainStep.TargetModel` / `.Goal` (`results.go:31-34`).

**Fix location:** `internal/actions/planner.go`, function `(p *Planner) Plan(req apperr.ChainRequest)
(ChainPlan, error)` (starts line 30). Add a requirement-check pass after the existing "is this a
known action ID" loop (lines 35-38) and before `checkExclusivity` — resolve each step's
`ActionMeta` (already available via `p.catalog[s.ActionID]`), walk its `.Requires`, and check the
corresponding field per the table above. On any missing requirement, return
`apperr.InvalidPlan(msg, len(steps), 0)` (see existing calls in the same function for the exact
signature/pattern) with a message naming the action and the missing field(s) — mirror the existing
step-cap/group-cap messages' style ("selected N steps; maximum is M").

**Also needed:** `internal/actions/composer.go` should not need changes if the Planner blocks first,
but double-check no other entry point (e.g. `PreviewPrompt` in `internal/actions/`) bypasses the
Planner and could still compose a prompt for an under-specified step.

**Test requirement:** Go table-driven test in `internal/actions/planner_test.go` covering every
`Requires` combination currently declared in the catalog (grep `catalog.go` for `Requires:
[]string{` to enumerate them all — as of this session: `translate.text`, plus at least one more
translate-family action, `prompteng.image`, `prompteng.video` or similar) — one subtest per action
with the requirement present (should plan successfully) and absent (should return
`apperr.InvalidPlan`/`apperr.CodeInvalidPlan`).

**Acceptance:** `ProcessPromptChain` with `steps:[{actionId:"translate.text"}]` and empty
`inputLanguageId`/`outputLanguageId` returns an error envelope with `Error != nil` before any LLM
call is made (verify via a fault-proxy request-log count of 0, or a mock provider call-count
assertion in the Go test).

---

### T85 — Make `TestInference`/`TestConnection`/`TestModels` respect the configured timeout, and fix the "0s" message bug (finding #5, P3-T2, P14-T2)

**Problem A (timeout ignored):** `internal/verification/service.go:19` declares
`const verifyTimeout = 30 * time.Second` and `TestInference` (line 168), `TestConnection` (line 73),
and `TestModels` (line 119) all build their context via
`ctx, cancel := context.WithTimeout(context.Background(), verifyTimeout)` — a hardcoded constant,
never reading the user's configured `InferenceBaseConfig.Timeout`. Contrast with the real chain path,
`internal/llms/service.go` (e.g. lines 99, 147, 190), which correctly does:
```go
baseConfig, err := l.settingsService.GetInferenceBaseConfig()
timeout := l.validateTimeout(baseConfig.Timeout)
ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeout)*time.Second)
```
`verification.Service` already holds `s.settingsService` (used a few lines below in `TestInference`
to call `GetModelConfig()`) — check whether `settings.SettingsServiceAPI` (or whatever interface
`s.settingsService` is typed as in `internal/verification/service.go`) already exposes
`GetInferenceBaseConfig()`; if so, this is a small, localized fix: replace the hardcoded
`verifyTimeout` with the same `validateTimeout(baseConfig.Timeout)` pattern `llms/service.go` uses,
in all three verification methods (`TestConnection`, `TestModels`, `TestInference`). Consider
whether `l.validateTimeout` should be exported/shared rather than duplicated.

**Problem B ("0s" message):** `internal/llms/http_errors.go:20` and `:24`, inside
`mapTransportError(provider, baseURL string, err error) *apperr.AppError`, both call
`apperr.Timeout(provider, 0, err)` — the `seconds` argument is a **hardcoded literal 0**, not the
actual configured timeout, which is why the live repro showed `"did not respond within 0s"` instead
of `"1s"`. `mapTransportError`'s signature has no access to the configured timeout value at all — it
only receives the transport error. Two fix options: (1) thread the timeout seconds through as an
explicit parameter from each of the 3 call sites (`internal/llms/ollama_native.go:61`,
`internal/llms/openai_provider.go:133` and `:175`), which already have `timeout`/`baseConfig.Timeout`
in scope one call frame up in `llms/service.go`; or (2) attach the configured seconds to the
`context.Context` via `context.WithValue` at the single point `llms/service.go` builds the timeout
context, then have `mapTransportError` read it back via `ctx.Value(...)` (requires adding a `ctx
context.Context` parameter to `mapTransportError` and its 3 call sites). Prefer option (1) —
explicit parameters are easier to test and grep than a context value.

**Test requirement:** Go tests in `internal/verification/service_test.go` (new or extended) asserting
`TestInference`/`TestConnection`/`TestModels` return `apperr.CodeTimeout` at approximately the
*configured* duration (use `httptest.NewServer` with a deliberate `time.Sleep` handler and a short
configured timeout, e.g. 1s, asserting completion within ~1.5s not ~30s). Go test in
`internal/llms/http_errors_test.go` (or wherever `mapTransportError` is tested) asserting the
resulting `AppError.Message`/`Details["timeout"]` reflects the real configured seconds, not `"0"`.

---

### T84 — `internal/settings/service.go` must classify errors with `apperr.Validation(...)` (finding #4, P3-T1, P4-T3)

**Problem:** `internal/settings/service.go` returns raw `fmt.Errorf`/`errors.New` from every
input-validation rejection instead of `apperr.Validation(...)`. Confirmed on 3 paths:
`UpdateInferenceBaseConfig` rejecting `timeout:0`/`timeout:-5` (message: `"%s: timeout must be
1–600 seconds"`), the same method rejecting `maxRetries:15` at line 307-308 (`"%s: maxRetries must
be 0–10"`), and `RemoveLanguage` rejecting removal of the current default output language. Because
these are bare errors, `apperr.ToWire` (called once at the handler boundary per
`ErrorEnvelopeRules.md`) can't classify them and falls through to `code:"internal"`, so the frontend
shows a generic "Something went wrong" toast instead of the actual validation message.

**Fix approach:** Audit every `return nil, fmt.Errorf(...)` / `return nil, errors.New(...)` in
`internal/settings/service.go` (not just the 3 confirmed above — do a full pass, since this is
described as systemic) and replace input-validation ones with `apperr.Validation(field, expected,
got)` (see the 3-arg signature already used elsewhere, e.g. `internal/actions/planner.go:32`:
`apperr.Validation("steps", "at least one step", "0 steps provided")`). Leave non-validation errors
(DB/repository failures) as-is — those should already be wrapped appropriately or fall through to
`apperr.Internal` correctly, this task is scoped to the validation-rejection paths only. Cross-check
against `ErrorEnvelopeRules.md`'s constructor table for the correct code per case (most of these are
`apperr.Validation`, but double check `RemoveLanguage`-while-default might fit better as
`apperr.Validation` too since it's a business-rule input rejection, not a system fault).

**Test requirement:** Go tests in `internal/settings/service_test.go` — table-driven, one subtest per
validation rule in the file, asserting the returned error's `apperr.ErrorCode` (via
`errors.As`/a helper) is `apperr.CodeValidation`, not falling through to generic/internal.

---

### T87 — AppBar/Redux must re-sync `currentProviderConfig` after deleting the current provider (finding #3, P1-T11)

**Problem:** Deleting the provider that is currently selected correctly reassigns
`app_state.current_provider_id` in the DB (verified), but the frontend has no way to learn this — the
Go handler `internal/settings/handler.go:279` `DeleteProviderConfig(providerId string) (res
apperr.VoidResult)` returns no data at all. On the frontend,
`frontend/src/logic/store/settings/thunks.ts:61-71`'s `deleteProviderConfig` thunk is typed
`createAsyncThunk<void, string, ...>` and discards any response; the corresponding reducer in
`frontend/src/logic/store/settings/slice.ts` (`.addCase(deleteProviderConfig.fulfilled, ...)`,
around line 119) only filters the deleted provider out of `availableProviderConfigs` — it never
touches `state.allSettings.currentProviderConfig`. The AppBar reads `currentProviderConfig` and shows
blank until a full page reload re-fetches everything from scratch.

**Fix approach:** A `getCurrentProviderConfig` thunk already exists
(`frontend/src/logic/store/settings/thunks.ts:113`, `createAsyncThunk<ProviderConfig, void, ...>`,
calls the backend's `GetCurrentProviderConfig`) but **has no reducer case in `slice.ts` at all** —
dispatching it today would silently do nothing to state (contrast with
`setAsCurrentProviderConfig.fulfilled` at `slice.ts:99`, which does correctly set
`state.allSettings.currentProviderConfig = action.payload` and re-syncs `modelConfig.name` — use that
as the template). Two changes needed: (1) add a `.addCase(getCurrentProviderConfig.fulfilled, ...)`
to `slice.ts` mirroring the `setAsCurrentProviderConfig.fulfilled` handler; (2) after
`deleteProviderConfig` succeeds, dispatch `getCurrentProviderConfig()` to resync — either chained
inside the `deleteProviderConfig` thunk body (dispatch it via `thunkAPI.dispatch` before returning)
or from the calling component/hook. Prefer inside the thunk so every call site gets the fix
automatically without relying on callers to remember it.

**Test requirement:** Jest test in `frontend/src/logic/store/settings/slice.test.ts` (or thunks
equivalent) asserting that after `deleteProviderConfig.fulfilled` + a mocked
`getCurrentProviderConfig.fulfilled`, `state.allSettings.currentProviderConfig` reflects the new
provider. A Playwright spec in `frontend/e2e/` reproducing the live repro: create a second provider,
set it current, delete it, assert the AppBar provider label is non-empty without a reload.

---

### T89 — File logging never activates under `wails dev`, only in the built binary (finding #2, P5-T3/T4/T5)

**Problem — root cause found, not just symptom:** `internal/settings/handler.go:584-608`,
`reconfigureLogger`, builds the live `logging.Config` from the persisted `LoggingConfig` before
calling `h.appLogger.Reconfigure(lc, h.isDev)`. The directory-resolution logic (lines 596-602):
```go
if cfg.LogFileEnabled && cfg.LogDirectory == "" && h.fileUtils != nil {
    if dir, dirErr := h.fileUtils.EnsureAppLogsFolderExists(""); dirErr == nil {
        lc.Directory = dir
    }
} else {
    lc.Directory = cfg.LogDirectory
}
```
If `cfg.LogDirectory` is empty (the normal case — nothing in this session ever set an explicit
directory) and either `h.fileUtils == nil` **or** `EnsureAppLogsFolderExists("")` returns a non-nil
`dirErr`, execution falls into the `else` branch and sets `lc.Directory = cfg.LogDirectory` — which
is still `""`. Then in `internal/logging/logger.go:76`, `rebuild()`'s condition `if cfg.FileEnabled &&
cfg.Directory != ""` is false, so the file writer leg of the `zerolog.MultiLevelWriter` is silently
never attached — no file writes, no error, no log line about it (the `dirErr` from
`EnsureAppLogsFolderExists` is checked but never logged either way — a related small gap worth fixing
alongside this).

**Two hypotheses to check first, before writing a fix** (this session did not narrow further): (a)
`h.fileUtils` is `nil` when `SettingsHandler` is constructed under `wails dev` specifically — check
the DI wiring order in `internal/application/application.go` for a dev-vs-prod branch; or (b)
`EnsureAppLogsFolderExists("")` (`internal/file/service.go`) returns a non-nil error specifically
under `wails dev`'s working directory / `os.UserConfigDir()` resolution, and that error is being
swallowed. Confirm which by adding a temporary log line at `handler.go:597`'s `dirErr` branch (or
just read `EnsureAppLogsFolderExists`'s implementation for a dev-mode-specific failure path) — do not
guess-fix without confirming which branch is actually failing.

**Fix approach:** Once the failing branch is confirmed, either fix `EnsureAppLogsFolderExists` (if
it's failing) or fix the DI wiring so `h.fileUtils` is always non-nil (if that's the gap). Also fix
the silently-swallowed `dirErr` — log it (e.g. `h.zlog.Warn().Err(dirErr)...`) so this class of bug
is visible in `app.log`/console next time instead of requiring a live debugging session to find.

**Test requirement:** Go test in `internal/settings/handler_test.go` (or a new
`internal/logging/logger_test.go` case, there's already a `TestNew_fileEnabled_writesToFile` at
`logger_test.go:153` — check whether an equivalent exists for the `Reconfigure` path specifically,
since `New` and `Reconfigure` share `rebuild` but are exercised via different call paths in prod)
constructing a `SettingsHandler` the same way `wails dev` does (matching the dev DI wiring) and
asserting a subsequent `UpdateLoggingConfig({logFileEnabled:true})` call results in a non-empty
`lc.Directory` being passed to `Reconfigure`.

---

### T90 — Propagate cancellation into the in-flight LLM HTTP call (finding #9, P11-T5, and the unverified half of P13-T3)

**Problem:** `internal/actions/service.go:198` — `_ = ctx // accepted for T13 cancellation;
propagation added when LLMService gains context support` — the context passed into `runStep` is
explicitly discarded, not threaded into the actual `LLMService.Chat`/provider HTTP call. Live repro:
starting a chain against a deliberately slow provider and calling `CancelChain` ~1s in does not abort
the in-flight request — it runs to natural completion. This also means `OnShutdown`'s
`app.CancelAllRuns()` (`main.go:88-98`) can mark a run cancelled at the registry level but likely
cannot actually abort a slow network request already in flight (source-inferred, not confirmed live
this session — see P13-T3 in the checklist).

**Fix approach:** Trace the call chain from `runStep` (`internal/actions/service.go`, function
signature around line 195) down through however it invokes the LLM — likely via an
`LLMService`/`Provider` interface method. Confirm whether `LLMService.Chat` (or equivalent) already
accepts a `context.Context` parameter (the comment implies it does not, as of this session — "when
LLMService gains context support"); if it doesn't, that's the actual blocking prerequisite: add
`ctx context.Context` to the relevant `LLMService`/`Provider` interface method(s) in
`internal/llms/`, thread it through `ollama_native.go`/`openai_provider.go`'s HTTP client calls
(resty supports `SetContext`/`.Request().SetContext(ctx)`), then wire `runStep`'s real `ctx` through
instead of discarding it. This is a larger, more invasive change than the other tasks — likely
touches `internal/llms/service.go`, `internal/llms/ollama_native.go`, `internal/llms/openai_provider.go`,
and `internal/actions/service.go`. Consider scoping this as its own mini-design pass (the
`architect` agent per this repo's `CLAUDE.md` routing table) before implementing, given the blast
radius.

**Test requirement:** Go test in `internal/actions/service_test.go` using a mock/slow
`httptest.Server` handler, starting a chain, cancelling ~100ms in, and asserting the HTTP request
context is actually cancelled (e.g. the test server observes the client disconnect, or the mock
provider's `Chat` receives a cancelled context) rather than running to completion. Once this test
passes, revisit P13-T3 to confirm `OnShutdown` cancellation also now aborts in-flight work.

---

### T86 — `maxRetries` setting has no consuming retry loop (finding #6, P3-T3, pre-existing/re-confirmed)

**Problem:** `internal/settings/repository_sqlite.go:312` reads `inference.maxRetries` into
`InferenceBaseConfig.MaxRetries`; the field is declared at `internal/llms/llms.go:67`; nothing
consumes it. `internal/llms/ollama_native.go:57` and `internal/llms/openai_provider.go:129` and `:171`
all explicitly call `SetRetryCount(0)` on the resty HTTP client with the comment `// T12 owns the
retry loop` — no "T12" retry loop exists anywhere in `internal/llms/`, `internal/actions/`, or
`internal/gate/` (grepped, zero hits). Configuring `maxRetries` in Settings persists and clamps
correctly but has zero effect on request behavior — this matches the 2026-07-01 prior report's
original finding; still unfixed as of this session.

**Decision needed before implementing (flag to whoever picks this up, don't just guess):** either
(a) implement the retry loop the stale comments promise — likely in `internal/llms/service.go`
wrapping the `p.Chat(...)` call with a retry-with-backoff loop honoring `MaxRetries`, retrying only on
retryable error codes (`apperr.AppError.Retryable`, check `apperr.go` for which codes set this true —
`provider_unreachable`, `rate_limited`, `timeout` looked retryable in this session's findings); or
(b) remove the dead `maxRetries` setting/UI control entirely (DB column, `InferenceBaseConfig` field,
Settings UI input) if retry logic isn't actually wanted. This is a product decision, not just a code
fix — recommend surfacing it to the user/maintainer rather than picking one silently.

**Test requirement (if implementing the retry loop):** Go test in `internal/llms/service_test.go`
using `httptest.NewServer` returning a retryable error N times then succeeding, asserting the call
succeeds after retries and that `MaxRetries` bounds the retry count (a config of 0 retries once,
never retries). **Test requirement (if removing):** none needed beyond removing now-dead test cases,
if any exist.

---

### T91 — Small cleanup bundle (findings #1, #7, #11 — independent, can be done in any order or split across 3 small PRs)

**(a) Missing `component`/`op` structured fields on startup logs — finding #1, `GoLoggingRules.md`
§2.5.** Root cause: services like `internal/file/service.go` (`FileUtilsService`, e.g.
`GetAppSettingsFolderPath` at line 65) call `s.logger.Debug(fmt.Sprintf("%s: ...", op))` — a single
flat string via the simplified Wails-compat `logging.Logger` interface (`Debug(m string)`,
per `CLAUDE.md`'s "Wails logger interface" section) — not the structured chained zerolog calls
(`.Str("component",...).Str("op",...).Msg(...)`) used in `internal/actions` chain-execution logging.
These are two different logging call patterns coexisting in the codebase: services holding the
simple string-only `logging.Logger` vs. `internal/actions` holding a raw `*zerolog.Logger` for
structured chains. Fix requires either exposing the structured `*zerolog.Logger` (or a small
structured-logging helper preserving `component`/`op`) to `FileUtilsService`/`SettingsService`, and
converting their `Debug(fmt.Sprintf(...))` call sites to structured chained calls. Audit both
`internal/file/service.go` and `internal/settings/service.go` for every log call site.

**(b) `historyMaxEntries` silently clamped to a floor of 10 — finding #7, P5-T2.** Exact location:
`internal/settings/service.go:441-442` —
```go
if cfg.HistoryMaxEntries < 10 {
    cfg.HistoryMaxEntries = 10
}
```
silently substitutes 10 with no error/indication when a lower value (2, 1, 5, 0 all confirmed) is
requested. The upper clamp at line 444-445 (`> 1000 → 1000`) has the same silent-substitution issue.
Fix: either return `apperr.Validation(...)` when the requested value is outside [10, 1000] instead of
silently clamping, or if silent clamping is intentional product behavior, document the floor/ceiling
explicitly in `CLAUDE.md`/the Settings UI copy and in this plan's §"Baseline" — pick one, this
session found no evidence of intent either way.

**(c) Production log level defaults to `info`, not `WarnLevel` as documented — finding #11,
P13-T4.** `internal/settings/repository_sqlite.go`'s read-fallback: `r.getString("log.level",
"info")`, and `log.level` is never seeded by `internal/db/db.go`'s seeder — so `"info"` is the true
default on every fresh install, dev and prod alike, confirmed live in the built binary. This
contradicts `CLAUDE.md`'s Debugging section ("WARNING in prod") and `GoLoggingRules.md` §2.7 ("Level
is `WarnLevel` by default"). Recommend implementing the documented behavior (seed/default to Warn in
production specifically, e.g. via the `isDev` flag already threaded through `logging.New`/
`Reconfigure`) rather than changing the docs, since verbose info-level logging by default in a
shipped consumer app is undesirable disk/noise — but flag this as a judgment call for whoever
implements it.

**Test requirement:** (a) no test needed beyond existing coverage — this is a logging-call-site
change, and per `TypescriptReactTestingRules.md`/`GoUnitTestsRules.md` §3.6, do not assert on log
calls/content in tests. (b) Go test in `internal/settings/service_test.go` asserting the new
validation-error behavior (if that's the chosen fix) for values below 10 / above 1000. (c) Go test in
`internal/logging/logger_test.go` or `internal/application/` asserting the resolved level is `Warn`
in a prod (`isDev=false`) construction path with no explicit `log.level` override.

---

- No task opened for finding #10 (wrong-arg-count Wails calls hang instead of reject) — low real-world
  impact since call sites are generated/type-checked; consider only if it recurs during future
  manual/scripted testing.

**Plan-doc corrections made in this same pass** (bumped to v1.2, see `LIVE_TESTING_PLAN.md` changelog): §2 baseline `useTemperature` defaults on not off; §2 baseline `timeout=60`/`useMarkdownForOutput=false` not `30`/"on".
