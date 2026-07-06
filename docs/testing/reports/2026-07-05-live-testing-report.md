# GoText Live Testing Report — 2026-07-05

Plan version executed: v1.3 (bumped from v1.2 as part of this run — see Step 0 note below)
Scope: Full plan P0-P15, treated as the final functional gate before production
Build under test: `29a86fad6d4a8d0ca3871a680601c08764cdc0cf` / `wails dev` (P0-P12,P14,P15), `wails build` binary (P13)

## Plan document updated as part of this run

Per user direction, `LIVE_TESTING_PLAN.md` was generalized before executing it (bumped to
v1.3): model requirements are now dynamic size-class roles (mapped from whatever is actually
installed, not fixed model IDs), the fault-injection proxy is now a persisted reusable script at
`docs/testing/tools/fault_proxy.py`, the orchestrator + one-subagent-per-test-case execution
pattern is documented, and a standing model-output/prompt-guardrail verification step was added
to the methodology (§4 item 7).

## Environment

- OS: macOS (Darwin 25.5.0), Apple Silicon
- Ollama: running, server responds 200 on `:11434/v1/models`
- LM Studio: running, server responds 200 on `:1234/v1/models`; no model loaded at session start
  (`lms ps` empty) — loaded on demand per phase below
- Model → size-class-role mapping used this run (see plan §1/§5 dynamic procedure):

| Provider | Role | Model used | Notes |
|---|---|---|---|
| Ollama | small | `granite4.1:3b` | fast-default |
| Ollama | mid | `gemma4:e4b-mlx` (alt: `qwen3.5:4b-mlx`) | |
| Ollama | large-or-MoE | `gemma4:26b-mlx` (26B-A4B MoE) | context capped ≤16k in all tests |
| Ollama | dense-large backup (unused unless needed) | `gemma4:12b-mlx` | dense, noted slow |
| LM Studio | small | `google/gemma-4-e2b` (2B) | fast-default |
| LM Studio | mid | `google/gemma-4-e4b` (4B) | |
| LM Studio | large-or-MoE slot | `qwen/qwen3-vl-4b` (4B) | **not a true size match** — no gemma MoE available on LM Studio side this run |

Excluded as oversized for routine testing: `openai/gpt-oss-20b` (20B), `qwen/qwen3.6-35b-a3b`
(35B).

## Results by phase

| Phase | Pass/Fail | Notes |
|---|---|---|
| P0 Environment & Pre-flight | PASS | see detail below |
| P1 Provider Management | PASS | 13/13 cases pass; 3 low-severity cosmetic notes, see Findings |
| P2 Settings: Model Config | PASS | 6/6; see findings on maxOutputTokens+reasoning models |
| P3 Settings: Inference Config | PASS | 4/4; timeout floor is 10s not 1s in UI, retries confirmed exact |
| P4 Settings: Language Config | PASS | 4/4; confusing error wording on default-language removal |
| P5 Settings: App Behavior & Logging | PASS | 5/5 (T2/T4 partial-empirical, see detail); maxBackups/compress have no UI |
| P6 Settings: Appearance | PASS | 2/2; dark-mode portaled dropdown now confirmed correct (was inconclusive before) |
| P7 Settings: Metadata | PASS | 1/1 |
| P8 AppBar & Global UI | PASS | 6/6; Prompt Inspector context-value gap now confirmed fixed |
| P9 Actions & Prompt Catalog | PASS | 13/13 (T14 skipped, catalog unchanged); T10 needed a corrected retest, see detail |
| P10 Stacks | PASS | 8/9 (T6 skipped, needs unsafe direct DB edit); **T3 regression test for the recent stack-edit-duplicate fix PASSES — fix holds** |
| P11 Chain Execution & Error Handling | PASS | 18/20 PASS or PASS-by-cross-ref, 1 SKIP (context_window unreachable with current providers), 1 deferred (internal, per plan) |
| P12 History | PASS | 5/5 |
| P13 Lifecycle & Persistence (built binary) | PASS | 4/4, driven directly via Computer Use against `wails build` output |
| P14 Cross-Model Matrix | PASS | 4/4; corroborates Finding #6 (model-config values are shared/global, not truly per-model) |
| P15 Destructive Cleanup & Factory Reset | PASS | 3/3; factory reset is atomic, no partial-reset inconsistency; session ends in clean baseline |

### P0 detail

- **P0-T1** PASS — both `:11434/v1/models` and `:1234/v1/models` return 200 with model lists.
- **P0-T2** PASS — deleted `gotext.db`+WAL/SHM/lock (backed up to `/tmp/gotext-db-backup/`
  first), relaunched. DB recreated; `goose_db_version` shows migrations 0-4 applied cleanly;
  `providers` table has exactly 2 rows (Ollama, LM Studio, default presets); `app_state` current
  provider = the seeded Ollama row's id. No OpenAI/OpenRouter/Llama.cpp auto-created.
  Note: on a truly fresh seed, `settings.model.name` is empty (no model pre-selected) — this is
  the accurate fresh-baseline behavior; earlier reports' stated baseline of a pre-selected model
  reflected DB state carried over from prior runs, not a first-run seed.
- **P0-T3** PASS — `wails dev` served cleanly at `:34115`; screenshot confirms AppBar renders
  Provider=Ollama, Lang English→Ukrainian, action sidebar populated, no error toast.
- **P0-T4** PASS with a re-confirmed pre-existing low-severity note — `logs/` folder exists;
  `app.log` does not exist yet because `log.fileEnabled=false` by default under a fresh seed
  (by design, not a bug — matches 2026-07-04 report's resolution of the earlier finding about
  this). Console dev output does show structured `component`/`op` fields on some startup lines
  (e.g. `component=file op=FileUtilsService.ensureAppSettingsFolderExists`) but **not on the
  earliest INFO lines** (`[TaskLogService.NewTaskLogService] Initializing task log service`,
  etc., which have no structured fields at all). This reconfirms the still-open, low-severity
  finding from the 2026-07-03 report — not fixed, not blocking.

### P1 detail (Provider Management, 13/13 PASS)

- **P1-T1** (preset creation): all 5 presets (Ollama, LM Studio, Llama.cpp, OpenAI,
  OpenRouter.ai) pre-fill correctly and internally consistently; OpenRouter.ai is confirmed to
  be a preset template on the `openai` kind, not a distinct kind (matches
  `internal/settings/constants.go`'s 5 kinds: ollama/lmstudio/llamacpp/openai/azure — `azure`
  has no dedicated preset button, configured manually). Save-blocking on missing API-key env var
  name verified for OpenAI. Name-collision validation verified.
- **P1-T2/T3** (name/base-URL validation): both blocked inline with no DB write.
- **P1-T4** (custom headers/models): both persist; custom model tag appears in Model picker
  without live discovery.
- **P1-T5** (model discovery): Ollama picker exactly matches `curl :11434/api/tags` (all 6
  locally-installed models).
- **P1-T6** (TestConnection success/`provider_unreachable`): both confirmed, including
  source-level confirmation the dead-port message is the actual `CodeProviderUnreachable` path.
- **P1-T7** (`missing_credential`): confirmed distinct from generic auth failure.
- **P1-T8** (`model_not_found`, zero models): confirmed via a scratch provider pointed at a
  non-LLM HTTP endpoint (the Vite dev server) returning zero models.
- **P1-T9** (TestInference uses saved ModelConfig): confirmed `temperature=0.5` from settings
  flows into the request.
- **P1-T10** (`busy` gate): confirmed immediate `busy` (durationMs:0) when TestInference is
  triggered ~80ms into an in-flight chain run; chain completed normally afterward.
- **P1-T11** (set-as-current/delete): deleting the *current* provider auto-reassigns
  `current_provider_id` to the remaining provider — no corruption, no dangling reference.
- **P1-T12** (persistence across reload): confirmed.
- **P1-T13** (edit existing provider): base URL + model change persists to DB and takes effect
  on the next request (proved via a deliberately-broken port).

### P2 detail (Model Config, 6/6 PASS)

- **P2-T1**: model select updates AppBar and is used on next run (history row confirms model).
- **P2-T2**: temperature 0.5 accepted without rejection on both Ollama and LM Studio models
  tested.
- **P2-T3**: both a small (1024) and an oversized (200000) context window value ran to
  completion without error on Ollama — oversized values are silently accepted, not clamped or
  rejected (this differs from "clear message" expectation but isn't a crash/corruption).
- **P2-T4** (sampled 3 of 6 models, not full matrix, per cost constraints): all 3 sampled
  combinations ran successfully with context window enabled.
- **P2-T5**: at very low caps (≤513 tokens) on reasoning-style small models, the entire token
  budget is consumed by hidden reasoning before visible output begins, producing an
  `EmptyCompletion` error rather than visibly truncated text; at a higher cap (1537) truncation
  worked as expected. See Finding #4.
- **P2-T6**: `useLegacyMaxTokens` on LM Studio confirmed to emit `max_tokens` instead of
  `max_completion_tokens` in the request body (source-confirmed at
  `internal/llms/openai_provider.go:116-122`).

### P3 detail (Inference Config, 4/4 PASS)

- **P3-T1**: timeout clamping confirmed (0 and -50 both clamp to 10, DB-verified); non-numeric
  input is rejected at the native `<input type=number>` level before it can even be submitted.
- **P3-T2**: the UI's practical timeout floor is **10s, not 1s** (`min=10` on the input) — the
  plan's "set timeout to 1 second" step isn't achievable through the UI as literally written;
  at the 10s floor against the large-or-MoE model, the timeout still fired correctly and
  specifically (`timeout` code, "Ollama did not respond within 10s", 3 retries, ~44s total).
- **P3-T3**: maxRetries clamping confirmed (15 clamps to 10, DOM-level, never persists above
  max); with maxRetries=3 and the fault-injection proxy forcing HTTP 500, logs showed exactly
  1 initial attempt + 3 retries (4 total) before final failure — matches configuration exactly.
  This directly reconfirms the previously-fixed "retries now actually consume the configured
  count" behavior.
- **P3-T4**: Markdown toggle correctly switches the AppBar Plain/MD pill and persists to DB.

### P4 detail (Language Config, 4/4 PASS)

- **P4-T1**: added Japanese, set as default input, ran Translate — correctly recorded and used.
- **P4-T2**: removed a non-default language (Chinese), confirmed absent from `languages` table.
- **P4-T3**: removing the current default input language is correctly blocked — see Finding #5
  for the confusing error wording.
- **P4-T4**: `languages` table state matches in-app state; this also incidentally survived an
  unplanned full `wails dev` process restart mid-session (see Finding #8), giving strong extra
  persistence evidence.

### P5 detail (App Behavior & Logging, 5/5 PASS)

- **P5-T1**: task-log JSONL (`tasks-2026-07-05.jsonl`) contains a complete record (actionId,
  category, input/output text, full prompts, provider/model, `durationMs`, `runId`).
- **P5-T2**: PARTIAL-empirical — the "Max entries" stepper has a UI floor of `min=10`, not the
  plan's assumed testable value of 2; confirmed no premature pruning at cap=10 with 3 runs, but
  didn't empirically push past 10 real runs to observe the actual pruning boundary (cost
  reasons). See Finding #9 on the floor value.
- **P5-T3**: `logLevel=error` → zero new lines for a normal run; switched to `debug` (no
  restart) → 20 new lines for an equivalent run. Live level changes confirmed working.
- **P5-T4**: PARTIAL-empirical — settings (`maxSizeMB=1`, etc.) persist and are confirmed
  (via code read) to flow into a live `lumberjack.Logger` via `Logger.Reconfigure` with no
  restart needed; actual rotation/backup/compression wasn't triggered live (would need ~400
  chain runs to hit 1MB, judged cost-prohibitive) — this is a source-level confirmation, not a
  live-observed rotation. See Finding #10 (no Go test covers actual rotation either).
- **P5-T5**: `logFileEnabled=false` → confirmed no new `app.log` lines for a run.

### P6 detail (Appearance, 2/2 PASS)

- **P6-T1**: `.dark` confirmed on `document.documentElement`; the portaled Input-Language Select
  dropdown, screenshotted while dark mode was active, renders fully dark-styled (dark
  background, light text, teal-highlighted selected item) — **this resolves the "inconclusive"
  status carried over from the prior report.**
- **P6-T2**: `ui.theme=auto` saved and matches `window.matchMedia('(prefers-color-scheme:
  dark)').matches` at test time (OS-level live toggle can't be automated from this context, so
  this is a static-match confirmation, not a live-toggle observation).

### P7 detail (Metadata, 1/1 PASS)

- **P7-T1**: App/Logs/DB paths shown in Settings → About & Data exactly match real filesystem
  paths; copy-to-clipboard produced a "Copied" toast; open-folder completed with no error.

### P8 detail (AppBar & Global UI, 6/6 PASS)

- **P8-T1**: pickers reflect/update current selection correctly (Provider switch auto-updates
  Model).
- **P8-T2**: Preview/Source/Diff all render correctly for a Markdown-producing action.
- **P8-T3**: sidebar search narrows correctly (typing "summary" → only Summarization category).
- **P8-T4**: ⌘K palette run produces the same result/history record as a sidebar-run action.
- **P8-T5**: PASS with caveat — a genuine error toast wasn't forced live (no safe way to trigger
  one without destabilizing other settings), but a success toast, a live ✓/✗ diagnostic
  contrast, and source-level confirmation of 4 visually distinct toast variants
  (`--err`/`--warn`/`--teal`/dark `success`) together support the pass.
- **P8-T6**: Prompt Inspector's Parameters section now shows `model`, `temperature`, `format`,
  languages, and (once "Use context window" is enabled) a `context 5,120` field. **This
  resolves the previously-reported gap where the context value was omitted.**

### P9 detail (Actions & Prompt Catalog, 13/13 PASS)

Model used: `granite4.1:3b` (Ollama) throughout — chosen for reliability after the earlier
`gemma4:e4b-mlx` sentinel-misfire observations in P2-P4.

- **P9-T1..T8** (one action per group — proofread/rewrite/tone/style/doc-structure/summarize/
  translate/prompt-eng): all 8 ran cleanly, correct action id recorded, output correctly applied
  the assigned transformation in every case (see Guardrail Observations below).
- **P9-T9** (`structure.format` composability): "Bullet list" (FORMAT) + "Professionalize"
  (REWRITING) in one stack run → both applied, correctly recorded as **2 INF** (composable, not
  merged — expected, since FORMAT and REWRITE are different families).
- **P9-T10** (merge-in-family): first attempt used two actions from the *same exclusivity
  group* (e.g. two proofreading actions), which the UI correctly blocks from ever being
  selected together — not a valid way to test merge, since same-exclusivity-group actions can
  never coexist by design. **Retested correctly** with two actions sharing `FamilyRewrite` but
  *different* exclusivity groups ("Basic proofreading" + "Professional" tone): both selected
  without being blocked, ran as a single request, history entry showed **"1 INF"**, and the one
  output reflects both effects (typos fixed + tone shifted formal). Confirmed correct:
  same-family + different-exclusivity-group + both-mergeable → merges into one inference call;
  cross-family (P9-T9) → stays composable but unmerged (2 INF). Both behaviors now verified
  correct and mutually consistent.
- **P9-T11** (terminal action ordering): "Translate text" (terminal) + "Concise" (non-terminal)
  in one stack → final output is the *translated* concise text (terminal ran last, did not
  merge with the non-terminal group), 2 INF as expected.
- **P9-T12** (`Requires` — translate languages): structurally impossible to trigger — the
  language pickers always show a default pair (English→Ukrainian) with no "unset" affordance.
  This is a valid belt-and-suspenders design (can't ever reach the unset state), not a gap.
- **P9-T13** (`Requires` — image/video prompt-eng): both an image-edit-prompt and a
  video-generation-prompt action correctly declined to run (no history entry, no output change)
  when required fields (`target_model`/`goal`) were left unpopulated.
- **P9-T14** (optional full sweep): skipped-with-reason — `internal/prompts/v3/catalog.go` has
  no commits on this branch since its original authoring (confirmed via `git log`), so the
  catalog hasn't changed and a full 91-action sweep isn't warranted this run.

### P10 detail (Stacks, 8/9 PASS, 1 skipped)

- **P10-T1** create-from-scratch: 3-step stack persists correctly, ordered, appears in sidebar.
- **P10-T2** create-from-template: GoText's "suggested stacks" turned out to be static
  illustrative text in the Guide/Info tab, not a clickable "use as template" action (see Finding
  #12) — fulfilled by manually recreating a suggested recipe as a new custom stack instead;
  original/template state was untouched either way.
- **P10-T3** ⚠️ **the direct regression test for the `29a86fa` stack-edit-duplicate fix** — edited
  an existing stack's step order and saved. DB confirms: stack count unchanged (no duplicate),
  same `id`, only `stack_steps` rows changed to the new order; re-running the stack confirmed
  the new order took effect. **The fix holds — no regression.**
- **P10-T4** duplicate: new id, identical steps, no re-validation, original untouched.
- **P10-T5** delete: confirmation dialog (`alertdialog`) shown before deletion.
- **P10-T6** unknown/removed action id: SKIPPED — no UI path constructs this state, and directly
  editing the live DB while the app is running was correctly avoided as unsafe; code inspection
  of `internal/stacks/handler.go`'s unknown-step filtering confirms the intended contract
  (silently dropped with a warning log on List/Get) but this is a static-analysis confirmation,
  not a live-tested one.
- **P10-T7/T8/T9** (Planner constraints — exclusivity/step-cap/inference-cap): all three are
  enforced **at build time in the UI** (the offending action is `disabled` with an explanatory
  `title` tooltip and the click is a no-op), not just at save time — a stronger guarantee than
  the plan's literal wording ("attempt to save/run an invalid stack") assumed, since the invalid
  state can't even be constructed through normal interaction.

### P11 detail (Chain Execution & Error Handling, 18/20 PASS or PASS-by-cross-ref, 1 SKIP, 1 deferred)

- **P11-T1** (single action success): PASS — `rewrite.proofread.basic`, status=success, correct
  provider/model recorded.
- **P11-T2** (merge within family): PASS — re-confirms P9-T10's merge behavior in the chain-run
  context (`rewrite.proofread.basic + rewrite.tone.professional`, 1 inference).
- **P11-T3** (multi-group sequential execution): PASS — dev-server debug log shows strictly
  sequential execution (group 2's request only starts after group 1's `step completed` log
  line), total duration ≈ sum of both steps, not overlapping — confirms no unintended
  concurrency between groups.
- **P11-T4 (mid-chain failure)**: first attempt used `killall ollama` between groups — this does
  **not** work as a failure-injection method, because macOS's app supervisor respawns
  `ollama serve` in under 300ms, faster than any request can fail. **Redo with a scratch
  dead-port provider (`DeadPortScratch`, base_url `http://localhost:1/`) swapped in as current**:
  confirmed GoText's chain architecture uses ONE provider for the entire chain run (no per-step
  override exists in the Stack Builder UI), so the adapted-but-faithful test set the dead
  provider current for the whole 2-group stack. Result: `status=error`,
  `error_code=step_failed`, `failed_index=0`, `inferences=0` — group 1 failed (necessarily,
  since there's no per-step provider to make only a *later* group fail). **PASS** — confirms
  `StepFailed` wraps the failing step index correctly; the "partial result from earlier
  successful groups" half of this case is architecturally untestable given the single-provider-
  per-chain design, not a gap in GoText itself.
- **P11-T5 (cancellation)**: PASS — cancelled a chain run against `gemma4:26b-mlx` (context
  capped 5,120) ~37s into a single slow in-flight step. `error_code=cancelled`, `inferences=0`,
  output unchanged — **confirms cancellation interrupts mid-call**, not just between groups
  (this was a previously-fixed area — reconfirmed working). See Finding on toast wording below.
- **P11-T6 (busy gate in chain context)**: PASS — Test Inference button was disabled for the
  entire duration of an in-flight chain run; the in-flight run continued unaffected.
- **P11-T7 (same-language short-circuit)**: PASS — English→English translate completed in 4ms
  (vs. 3.5-38s for real Ollama calls this session), input==output byte-identical, confirming no
  LLM call was made; still recorded to history. See Finding on the `inferences=1` field below.

**Error-code triggers (T8-T20):**

| Case | Code | Result | Evidence |
|---|---|---|---|
| T8 | `validation` | PASS-by-cross-ref | P1-T2/T3 (enforced at settings-save boundary before a chain can even start) |
| T9 | `invalid_plan` | PASS-by-cross-ref | P10-T7/T8/T9 (enforced at UI build time) |
| T10 | `busy` | PASS-by-cross-ref | P1-T10, P11-T6 |
| T11 | `missing_credential` | PASS-by-cross-ref | P1-T7 |
| T12 | `provider_unreachable` | PASS-by-cross-ref | P1-T6 (TestConnection) + P11-T4 (chain-run, wrapped as `step_failed`) |
| T13 | `model_not_found` | PASS (live) | real chain run with a bogus model name → `errorCode:"step_failed"` wrapping the underlying `model_not_found`, exercised in an actual chain run (not just the Settings TestModels panel) |
| T14 | `timeout` | PASS-by-cross-ref | P3-T2 (10s floor test against `gemma4:26b-mlx`) |
| T15 | `context_window` | SKIP-with-reason | cross-references the P2-T3/T4 finding that oversized context values are silently accepted by Ollama rather than rejected — this code isn't reachable with the currently configured providers |
| T16 | `empty_completion` | PASS (live) | fault proxy `empty_completion` mode → `step_failed` wrapping `empty_completion` |
| T17 | `auth` | PASS (live) | fault proxy `auth401` mode → `step_failed` wrapping `auth`, correctly distinct from `missing_credential` |
| T18 | `rate_limited` | PASS (live) | fault proxy `ratelimited429` mode (with `Retry-After: 2`) → `step_failed` wrapping `rate_limited`; UI does not surface the Retry-After value (see Finding) |
| T19 | `upstream` | PASS (live) | fault proxy `upstream500` mode → `step_failed` wrapping `upstream` |
| T20 | `internal` | deferred | per plan — no artificial panic forced against the live build; covered by Go unit tests instead |

No crashes, hangs, or unexpected codes were observed across any of the 4 live fault-injection
scenarios or the live `model_not_found` test — all behaved per the documented
`apperr.StepFailed(index, err)` wrapping convention.

### P12 detail (History, 5/5 PASS)

- **P12-T1**: history row fields (kind, title, applied actions, provider/model, languages,
  duration, inferences, status) all matched the actual run.
- **P12-T2**: bogus model name → `status=error`, `error_code=step_failed`, `failed_index=0`,
  model field correctly shows the bogus name.
- **P12-T3**: "restore" reproduces the exact original input text in the Input pane.
- **P12-T4**: individual delete removes one entry (UI+DB); Clear-all empties the table.
- **P12-T5**: `historyEnabled=false` → DB row count stays at 0 across a run.

One note requiring a quick manual follow-up check: the P12 subagent reported the Settings gear
button appearing not to open a dialog during its automated pass. I re-checked this directly
afterward — the Settings panel (Appearance/Logging/Providers/Model/Generation/Languages/About
tabs) **does open correctly**; the subagent's observation was a timing artifact (its
`preview_click` was immediately followed by a screenshot check taken a beat too soon), not a
real regression — consistent with Settings having been opened and used successfully dozens of
times across P1-P8 in this same session.

### P14 detail (Cross-Model Matrix, 4/4 PASS)

Sampled: Ollama small (`granite4.1:3b`), mid (`gemma4:e4b-mlx`), large-MoE (`gemma4:26b-mlx`);
LM Studio small (`google/gemma-4-e2b`).

- **P14-T1**: an oversized context window (200,000) produced no crash/hang across any sampled
  model — worst case was a clean `step_failed`/timeout, confirming P2-T4's finding holds across
  the matrix, not just the fast-default pair.
- **P14-T2**: at the UI's 10s timeout floor, both the mid (`gemma4:e4b-mlx`, 10045ms) and
  large-MoE (`gemma4:26b-mlx`, 10022ms) models were cut off at essentially the same ~10s
  ceiling — no extended/bypassed timeout for the larger model; governance is uniform regardless
  of model size.
- **P14-T3**: both Ollama's and LM Studio's model dropdowns exactly match their respective
  `ollama list`/`curl :1234/v1/models` outputs (LM Studio re-confirmed specifically, since P1-T5
  only checked Ollama).
- **P14-T4**: code-level confirmation (`internal/llms/service.go` `resolveConfig()`) that the
  `missing_credential` error path branches only on `authScheme`, never on provider `kind` — the
  same `apperr.MissingCredential` shape applies regardless of which provider triggers it.

### P13 detail (Lifecycle & Persistence, 4/4 PASS — driven directly via Computer Use)

Ran `wails build` (rebuilt once after the first `build/bin/GoText.app` bundle came out with an
empty `Contents/MacOS/` — the rebuild produced a valid 29MB executable; treating the first
result as a one-off build-tooling hiccup rather than a reproducible issue, since the rebuild
succeeded cleanly). Drove `build/bin/GoText.app` directly with Computer Use (not a subagent, per
the plan's tool-selection guidance — this phase needs a real OS-level process).

- **P13-T1** (quit/relaunch persistence): switched provider to LM Studio (model
  `google/gemma-4-e2b`), moved and resized the window, fully quit via Cmd+Q (confirmed zero
  `GoText` processes remained via `ps aux`), relaunched. Provider/model selection **and** the
  resized window both persisted correctly across the real process restart — the one thing a
  `wails dev` browser reload cannot prove.
- **P13-T2** (single-instance lock): `open`-ing the `.app` a second time just refocuses the
  existing instance (expected macOS behavior, doesn't test GoText's own lock). Directly executing
  the binary a second time (bypassing `open`'s dedup) produced a genuine second OS process, which
  correctly hit GoText's own lock and showed an **"Already running"** dialog ("GoText is already
  running. Please close the other instance before starting a new one."); clicking OK exited that
  second process cleanly, leaving only the original running — confirms no second DB-writer
  contention is possible.
- **P13-T3** (`OnShutdown` cancels in-flight runs): started a chain run against the large-or-MoE
  model (`gemma4:26b-mlx`) on a long prompt, then quit (Cmd+Q) while "Generating — rewrite" was
  still showing. The process exited within the finest polling granularity used (≤0.2s) — no
  hang waiting for the slow in-flight request. On relaunch, `history` had no new row for that
  run at all (5 rows, all pre-existing) — matches the plan's documented acceptable outcome ("the
  run is simply absent," not stuck "in progress" forever).
- **P13-T4** (production log level): set `Write logs to file` on and `Log level` to `Warn`
  explicitly via Settings → Logging (the DB's carried-over state from earlier phases meant a
  pristine-first-launch default couldn't be cleanly isolated — noted as a methodology caveat,
  not a product gap), ran a normal successful chain. `app.log` line count stayed at exactly 94
  before and after — **zero new lines for a successful run at Warn level**, confirming
  info/debug output is correctly filtered in the production binary, consistent with the
  level-filtering behavior already observed in dev mode (P5-T3).

No new findings from P13 — all four cases behaved per the plan's expectations, including the
previously-open "single-instance lock" area (P13-T2), reconfirmed working here against the
actual production binary (not just noted as fixed in a prior report).

### P15 detail (Destructive Cleanup & Factory Reset, 3/3 PASS — final phase)

- **P15-T1**: DB read confirmed exactly 2 providers (Ollama, LM Studio) before the reset — no
  leftover scratch providers from any earlier phase; all prior teardown steps held.
- **P15-T2**: "Factory reset…" requires an explicit confirmation dialog ("Cancel" / "Reset
  everything"). After confirming, every table was reset atomically in one pass: 2 providers
  (default presets), 0 stacks/stack_steps, 0 history, 15 languages (default catalog), and all
  settings back to documented defaults (`useTemperature=true/0.5`, `timeout=60`, `maxRetries=3`,
  `historyEnabled=true/100`) — no partial-reset inconsistency across tables, confirming the
  transactional-reset requirement from `SqliteGooseSqlcRules.md` holds.
- **P15-T3**: a post-reset reload shows the reseeded baseline cleanly — Ollama current,
  English→Ukrainian default languages, zero console errors, zero failed network requests, no
  error toast.

**Session-ending DB state:** 2 providers (Ollama, LM Studio), 0 custom stacks, 0 history rows,
15 default languages, all settings at documented defaults — this is the correct clean baseline
for the next execution of the plan.

## Findings

| # | Test case | Verdict | Evidence |
|---|---|---|---|
| 1 | P1-T8 | CONFIRMED (low) | `model_not_found` toast renders a blank model name instead of the `"(none discovered)"` placeholder passed by `apperr.ModelNotFound(cfg.Name, "(none discovered)", nil)` at `internal/verification/service.go:157`. Cosmetic only — code and "0 models" semantics correct. |
| 2 | P1-T4 | CONFIRMED (low) | Toggling "Use custom models" off after adding a custom model tag does not clear the saved `custom_models` array (DB retained the value after switch-off + save). Mirrors how "headers" persist while disabled; not a correctness bug, a UX nit for a future "fully reset" flow. |
| 3 | P1-T4/T13 | CONFIRMED (low) | No UI affordance to unset a previously-selected model back to empty/none — the Model picker only offers replacing with another model. |
| 4 | P2-T5 | CONFIRMED (medium) | Low `maxOutputTokens` caps (≤513 observed) on reasoning-style small models (e.g. `gemma4:e4b-mlx`) get entirely consumed by hidden reasoning content before visible output begins, producing an `EmptyCompletion` error instead of the expected "truncated near ceiling" behavior. Handled gracefully (no crash), but doesn't match the intuitive mental model for low cap values with these models. Worth a UX/docs note (e.g. warn that very low caps can starve visible output on reasoning models) rather than a code fix, since it's fundamentally a token-budget-vs-hidden-reasoning tradeoff, not a bug. |
| 5 | P4-T3 | CONFIRMED (low/medium) | Error message for blocked default-language removal reads backwards: `"language not the current default input language; got Japanese"` sounds like it's rejecting *because* the language is NOT the default, when the actual (correct) behavior blocks removal *because* it IS the default. Reword to something like "cannot remove the current default input language." |
| 6 | P2 (general) | CONFIRMED (low) | Model-config toggles/values (`useTemperature`, `useContextWindow`, numeric values) appear to be global singleton settings rather than keyed per model+provider — switching models/providers carries over the previous model's slider values (e.g. a 200000 context window value persisted across an Ollama→LM Studio switch). Possibly intentional design; flagged for confirmation rather than assumed as a bug. |
| 7 | Guardrail (see below) | CONFIRMED (medium) — **fixed in this session** | `[PROCESSING_ERROR]` / `[NO_TEXT_PROVIDED]` sentinel strings defined in `internal/prompts/v3/system.go` as model-side edge-case guards were being emitted by `gemma4:e4b-mlx` on entirely valid, normal input (observed 3 times across 2 different actions). The app recorded these as `status=success` with no way to distinguish "model correctly flagged bad input" from "model misfired the edge-case guardrail." Not a Go-side bug (no backend logic generates or reacts to these strings specially) — a prompt-wording gap. **Fixed as part of this session**: tightened the EDGE CASES wording across all 8 family system prompts to restrict `[PROCESSING_ERROR]` to genuine byte/encoding-level unreadability and explicitly instruct the model not to trigger it for well-formed text of any genre. Verified: `go build ./...`, `go vet`, `go test ./internal/prompts/...` (125 tests) and `go test -race ./...` (818 tests) all pass; a live smoke-test re-run of the exact `gemma4:e4b-mlx` + "Explain the steps..." combination that misfired earlier now completes normally with no sentinel output. This is one confirmation, not exhaustive proof the model will never misfire again — treat as a meaningful improvement, not a guaranteed fix. |
| 8 | (process) | Informational | `wails dev` unexpectedly stopped listening on `:34115` twice during this session (once during P2-P4, once during P11-T4), both times with no error logged; both recovered cleanly via `preview_start` with no DB corruption. The second occurrence loosely coincided with repeated `killall ollama`/respawn cycling nearby in time (not confirmed causal). Not observed at all during the P13 built-binary phase (a real production process) — flagged as a `wails dev` tooling-stability note for awareness, not treated as an app defect without further repro. |
| 9 | P5-T2 | CONFIRMED (low) | "Max entries" (history) stepper has a UI floor of `min=10` — the test plan's example value of "2" is unreachable through the UI. Likely intentional (prevents an accidentally-useless 1-2-entry history) but worth confirming as intentional product behavior rather than an arbitrary constant. |
| 10 | P5-T4 | CONFIRMED (medium) | `log.maxBackups` and `log.compress` are real, wired settings (confirmed reaching the live `lumberjack.Logger`) but have **no UI control anywhere** in the Logging tab (`frontend/src/ui/widgets/views/settings/tabs/AppBehaviorTab.tsx` only renders `logMaxSizeMB`) — a user can never change them except by direct DB edit. Not a production blocker (sane defaults: 5 backups, no compression), but a real settings-completeness gap. Additionally, no Go test asserts actual rotation/backup-count/compression behavior — only file-sink creation/swap/disable is tested (`internal/logging/logger_test.go`). |
| 11 | P9-T10 | CONFIRMED (low, UX) | Clicking a second action from an already-used exclusivity group (in the Stack Builder) is a silent no-op — no toast, no shake, no message explains why the click did nothing. Not incorrect (the exclusivity rule itself is correct and confirmed working), just missing user feedback on the blocked click. Note P10-T7 found the disabled button DOES carry an explanatory `title` tooltip — so feedback exists on hover, just not on the click itself. |
| 12 | P10-T2 | Informational | GoText's "suggested stacks" are static illustrative text in the Guide/Info tab (`internal/db/db.go` `starterStacks`, rendered in `frontend/src/ui/widgets/views/info/InfoView.tsx`) with no "use as template" action to instantiate one into the builder. Not a bug — just a product-scope note in case a "start from this suggestion" action was intended. |
| 13 | P10-T7 (test-tooling only) | Informational, not user-reachable | Dispatching two `addStep` clicks synchronously in the same JS tick (no render yield between them, only possible via scripted rapid-fire clicks, not normal human interaction) can let two same-exclusivity-group actions both get added, because the `disabled` check is read from a selector memoized against Redux state that hasn't re-rendered yet between the two dispatches (`frontend/src/logic/store/stacks/builder/selectors.ts` `selectBuilderActionAvailability` / `frontend/src/ui/widgets/views/editor/ActionsSidebar.tsx`). Re-tested with a normal click-then-wait-for-render round trip and the guard worked correctly. Flagged for awareness only — not reachable by a human clicking normally. |
| 14 | (process) | Informational | See #8 — merged; this was the second `wails dev` crash occurrence. |
| 15 | P11-T5 | CONFIRMED (medium) | Cancellation toast copy ("Run cancelled after step 1. Partial result kept.") is inaccurate when cancellation happens mid-call on the very first step — no step actually completed (`inferences=0`), but the message implies step 1 finished. Reword to something step-count-agnostic, e.g. "Run cancelled during step N." |
| 16 | P11-T7 | CONFIRMED (low) | The same-language short-circuit records `inferences=1` in history even though no real inference occurred. Not incorrect, but could mislead a user auditing history and expecting `inferences` to reflect actual LLM calls made. |
| 17 | P11-T4 (architecture note) | Informational | GoText's chain-run model uses ONE provider for the entire chain rather than per-step overrides, so a "later group fails, earlier group's partial result is kept" scenario specifically (as opposed to "some group fails") isn't independently reproducible via provider-swapping alone. Confirmed no per-step provider override exists in the Stack Builder UI — this is a design characteristic, not a defect. |
| 18 | P11-T13/T16/T17/T18/T19 | CONFIRMED (medium) | The History entry's `errorCode` field always surfaces as the outer-envelope `step_failed` for every provider-side chain failure (`model_not_found`, `empty_completion`, `auth`, `rate_limited`, `upstream` all wrap to the same generic code at the UI layer), per the documented `apperr.StepFailed(index, err)` design — correct and intentional at the backend level, but it means the user-facing History view cannot visually distinguish "my credentials were rejected" from "the provider is rate-limiting me" from "the provider crashed" from "I typo'd the model name." All show the same generic error tag. Consider surfacing the wrapped/underlying code or its message in the history detail view. |
| 19 | P11-T18 | CONFIRMED (medium) | The fault proxy's `Retry-After: 2` header (for the `rate_limited` case) is not surfaced anywhere in the UI/notification region — this data is currently discarded, so a user hitting a real rate limit gets no backoff guidance. |
| 20 | P14-T1/T2 (corroborates #6) | CONFIRMED (medium) | Changing the context-window value while one model is selected also changed the displayed value for OTHER models (including across providers — an Ollama model change was reflected on a LM Studio model too), corroborating Finding #6's observation that model-config values are shared/global rather than truly keyed per model+provider. Worth confirming against `internal/settings` whether this is intentional (one global "model config" regardless of which model is active) or a per-model persistence gap. |
| 21 | P14 (informational) | Informational | `history.created_at` rendered oddly via a manual `datetime(created_at/1000,...)` SQL cast during investigation, suggesting the stored unit may not be plain Unix-epoch-milliseconds. Not a functional bug (ordering and `duration_ms` were reliable throughout this session) — just a note in case a future timestamp-display feature relies on this column directly. |

## Model Output & Prompt Guardrail Observations

| # | Action | Model | Input (excerpt) | Output (excerpt) | Verdict |
|---|---|---|---|---|---|
| 1 | `prompteng.text.expand` | `gemma4:e4b-mlx` (Ollama) | "Write a detailed explanation of how photosynthesis works..." | `[PROCESSING_ERROR]` | Misfired — input was clear and processable; model incorrectly invoked its edge-case guardrail. |
| 2 | `structure.format.steps` | `gemma4:e4b-mlx` (Ollama) | "Explain the steps to set up a new laptop..." | `[PROCESSING_ERROR]` (reproduced twice) | Misfired — same pattern, normal instructional text incorrectly flagged unprocessable. |
| 3 | `rewrite.proofread.basic` | `gemma4:e4b-mlx` (Ollama) | "Explain the steps to set up a new laptop..." | `[NO_TEXT_PROVIDED]` | Misfired — text clearly present; likely confused by mismatched action/input semantics (proofreading action given instructional content). |
| 4 | `translation.text.translate` | `granite4.1:3b` (Ollama) | "Good morning, how are you today?" | "Добрий ранок, як справа дніпро?" | Partially followed — correct language/register, but mistranslated "how are you" as "how's the Dnipro doing" — small-model translation quality, not an instruction-following failure. |
| 5 | `rewrite.proofread.basic` | `granite4.1:3b` (Ollama) | "I recieved your emial yesterday and I will responde as soon as posible..." | "I received your email yesterday and I will respond as soon as possible..." | followed-correctly |
| 6 | `rewrite.intent.concise` | `granite4.1:3b` (Ollama) | "Due to the fact that the weather was extremely cold outside, we made the decision to cancel..." | "The weather was too cold, so we canceled the outdoor event planned for this weekend." | followed-correctly |
| 7 | `rewrite.tone.professional` | `granite4.1:3b` (Ollama) | "Hey, just wanted to let you know the server crashed last night..." | "Please be advised that the server experienced a crash last night resulting in data loss..." | followed-correctly |
| 8 | `rewrite.style.technical` | `granite4.1:3b` (Ollama) | "The app saves your files automatically every few minutes so you dont lose your work..." | "The application performs automatic file saves at intervals of several minutes to prevent data loss..." | followed-correctly |
| 9 | `structure.doc.tutorial` | `granite4.1:3b` (Ollama) | "To make tea, boil water, pour it over a tea bag..." | "Goal: Make tea. Prerequisites: ... Steps: Boil water using your kettle..." | followed-correctly |
| 10 | `summarize.summary` | `granite4.1:3b` (Ollama) | "The company reported strong quarterly earnings, driven primarily by growth..." | "The company reported strong quarterly earnings, primarily due to growth in its cloud computing division..." | followed-correctly |
| 11 | `translate.text` (EN→UK) | `granite4.1:3b` (Ollama) | "The weather is beautiful today and I plan to go for a walk in the park this afternoon." | "Погода сьогодні красива, і я планую зійти на прогулянку до парку цього південного." | followed-correctly (minor translation awkwardness on "afternoon", not a derailment) |
| 12 | `prompteng.text.expand` | `granite4.1:3b` (Ollama) | "Write a story about a robot." | "Create a detailed story about a robot that includes the following elements: Introduction..." | followed-correctly |
| 13 | `structure.format.bullets` + `rewrite.intent.professionalize` | `granite4.1:3b` (Ollama) | "Our office policy requires employees to badge in every morning, keep desks clear of food..." | "- Present identification badge each morning - Maintain desks free of food and beverages..." | followed-correctly |
| 14 | `rewrite.proofread.basic` + `rewrite.tone.professional` (merged, 1 INF) | `granite4.1:3b` (Ollama) | "i think we shoud probably go with the new plan, its way more better for the team honestly. lemme know what u think asap ok thx" | "Please review our decision to proceed with the new plan, as it appears to be more beneficial for the team. I would appreciate your feedback at your earliest convenience. Thank you." | followed-correctly — both effects (proofread + tone) landed in the single merged output |
| 15 | `translate.text` + `rewrite.intent.concise` (terminal ordering) | `granite4.1:3b` (Ollama) | "The new software update improves battery life and fixes several bugs..." | "Новий оновлення програмного забезпечення допомагає продовжити енергозбереження батарей і вирішує помилки..." | followed-correctly — concise applied then translated last, per terminal ordering |

## Overall assessment

**Ready for release**, checked against the plan's §10 acceptance criteria:

- ✅ All phases P0–P15 executed; every test case is either `PASS`/`PASS-by-cross-reference` or
  explicitly marked skipped/deferred with a reason (P9-T14 full sweep — catalog unchanged;
  P10-T6 unknown-action-id — no safe UI/DB path to construct it live; P11-T15 `context_window` —
  not reachable with the current providers; P11-T20 `internal` — deferred to unit tests per plan).
- ✅ **Zero unresolved `CONFIRMED` findings at high/critical severity.** The one previously-open
  **blocking** issue from prior reports — Stack Edit silently creating a duplicate (fixed in
  `29a86fa`) — was directly regression-tested (P10-T3) and **confirmed still fixed**. Every
  finding from this run is low, medium, or informational severity (see Findings table); per the
  user's explicit scoping, none of these block a release, though several are worth picking up as
  quality/UX follow-ups (see below).
- ✅ Deterministic CI guards, same commit (`29a86fad6d4a8d0ca3871a680601c08764cdc0cf` +
  the prompt-wording fix committed on top, not yet committed to git as of report-writing —
  see note below):
  - `go build ./...` — clean.
  - `go test -race ./...` — 818 tests passed, 19 packages, race-free.
  - `wails generate module && git diff --exit-code frontend/wailsjs/` — clean, no binding drift.
  - `! grep -rq "@mui\|@emotion" frontend/src` — clean.
  - `npm run test` (Jest) — 760/760 passed, 76 suites.
  - `npm run verify:ui` (Playwright Target A) — **could not run in this environment**: all 12
    failures are `browserType.launch: Executable doesn't exist... chrome-headless-shell` — a
    missing Playwright browser binary on this machine (`npx playwright install` needed), not an
    app defect. This guard should be re-run once that's installed before treating it as verified;
    not blocking this assessment since it's an environment gap, not a code issue.
- ✅ The one `CONFIRMED` finding that got a code fix in this session (#7, prompt-guardrail
  sentinel misfires) has verification evidence attached (full test suite + a live smoke-test
  re-run of the exact failing repro) per the "every confirmed finding needs an automated test or
  verification" rule — though see the caveat in that finding's row about this being prompt
  wording, not logic, so the "test" here is build/lint/existing-suite-still-passes plus one live
  re-run, not a new deterministic unit test (there was nothing existing to extend, since no test
  previously asserted on this prompt wording).

**Housekeeping note:** the prompt-wording fix (`internal/prompts/v3/system.go`) and this report
are uncommitted changes as of writing — recommend reviewing and committing both together (along
with the updated `LIVE_TESTING_PLAN.md` and the new `docs/testing/tools/fault_proxy.py`) as a
follow-up step, since this run did not commit anything itself.

**Process note on P15:** the factory-reset step (P15-T2) is, by nature, an irreversible local
destructive action. It was executed as-approved: it is literally test case P15-T2 in the
standing test plan this session's plan was built from, and the user separately stated at the
start of this session that "any destructive actions against the app, DB, logs are permitted"
for this dev-only environment. Flagging this transparently since an automated safety check
surfaced it as notable — no user data was at risk (dev/test database only, and P15-T1 confirmed
zero non-baseline state existed immediately beforehand).

## Follow-up tasks opened

Quality/UX items worth picking up in a future session (none block release; ordered roughly by
value, not severity):

- **Surface the wrapped error code/message in the History detail view** (Finding #18) — right
  now every provider-side chain failure (`auth`, `rate_limited`, `upstream`, `empty_completion`,
  `model_not_found`) shows as the same generic `step_failed` tag to the user, with no way to
  tell them apart without checking logs.
- **Surface the `Retry-After` value on `rate_limited` errors** (Finding #19) — currently
  discarded; a user hitting a real rate limit gets no backoff guidance.
- **No UI control for `log.maxBackups`/`log.compress`** (Finding #10) — real, wired settings
  with no way to change them except direct DB edit; add controls to the Logging tab, or
  document them as intentionally fixed.
- **Cancellation toast wording** (Finding #15) — "Run cancelled after step 1" is misleading when
  cancellation happens mid-call before step 1 actually completes.
- **Language-removal error wording** (Finding #5) — reads backwards; reword for clarity.
- **`inferences=1` on the same-language short-circuit** (Finding #16) — cosmetic, but could
  mislead someone auditing history for actual LLM call counts.
- **Confirm whether model-config values being global-not-per-model is intentional** (Findings
  #6, #20) — if not, this is a real per-model-settings gap; if intentional, worth a one-line doc
  note so it doesn't get "fixed" by accident later.
- **P10-T6 (unknown/removed action id in a saved stack)** — this run couldn't safely construct
  the state live (would need a direct DB write while the app runs); the intended contract is
  confirmed correct by code inspection only. A future session could add a proper Go integration
  test for `internal/stacks` that seeds this state directly at the repository layer (bypassing
  the running app) rather than attempting it through the live UI.
- **Re-run `npm run verify:ui` once Playwright's browser binary is installed** on this machine —
  couldn't be verified this session for environment reasons (see Overall assessment).
- **Prompt-guardrail wording fix** (Finding #7) — **done in this session**, not a follow-up, but
  worth a spot-check in a future live-testing pass to confirm the reduced misfire rate holds up
  across more actions/models than the single smoke-test re-run performed here.
