# GoText — Final Live Testing Plan

**This is the standing, reusable pre-release regression suite for GoText.** It is executed
against a real running instance of the app with real local LLM providers (Ollama, LM Studio)
— no mocks, no bridge stubs. It complements, and does not replace, the deterministic automated
gates already in `CLAUDE.md` (`go test -race ./...`, `npm run test`, `npm run verify:ui`) and
the mocked Playwright suite in `frontend/e2e/` (Target A). This plan is the manual/live
counterpart (Target B): the things that only show up when a real model answers, a real process
restarts, or a real error comes back over the wire.

Unlike a dated report, **this file does not accumulate run history.** Every time it is
executed, the results go into a new file under [`reports/`](reports/) following
[`reports/README.md`](reports/README.md)'s format. This file only changes when the app's
functional surface changes — new settings, new action families, new error paths, etc.

## Changelog

| Version | Date | Change |
|---|---|---|
| v1.0 | 2026-07-03 | Initial version. Supersedes `docs/V3_Temp_Docs/2026-06-30-comprehensive-live-testing.md` (broad smoke pass) and `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md` (context-window deep dive) as the canonical live-testing reference. Both are kept as historical prior art. |
| v1.1 | 2026-07-03 | §2 baseline corrected: `useTemperature` defaults **on** (`temperature=0.5`), not off — verified against `internal/db/db.go` seeder and `internal/settings/repository_sqlite.go` read-fallback, which agree with each other. Found live during a full P0-P15 execution (2026-07-03 report). |
| v1.2 | 2026-07-03 | §2 baseline corrected: inference defaults are `timeout=60`, `useMarkdownForOutput=false` (off), not `timeout=30`/"markdown on" — verified against `internal/db/db.go` seeder. Found live during the same P0-P15 run. |

When you add a phase or test case for new functionality, add a row here describing what
changed and bump the version. See [How to Extend This Plan](#9-how-to-extend-this-plan).

---

## 1. Prerequisites / Environment Pre-flight

### Software
- Ollama installed and running (`ollama serve`), with these models pulled:
  - `gemma4:e2b-it-q4_K_M`
  - `gemma4:e4b-it-q4_K_M`
  - `phi4-mini:3.8b-q4_K_M`
- LM Studio installed and running as a local server, with these models downloaded:
  - `google/gemma-4-e2b` (2B)
  - `google/gemma-4-26b-a4b` (26B-A4B)
  - `qwen/qwen3-4b-2507` (4B)
- **Fast-default models** (used for all phases that don't specifically test model/provider
  variance — see [§5 Model Matrix](#5-model-matrix)): `phi4-mini:3.8b-q4_K_M` (Ollama),
  `qwen/qwen3-4b-2507` (LM Studio). Chosen for speed; swap freely if a smaller/faster instruct
  model becomes available — they are not magic values.
- GoText repo checked out on the branch under test, on `master`/HEAD, no uncommitted changes
  that would be lost.
- For **P0–P12 and P14** (bulk functional/UI/actions/stacks phases): `wails dev` running,
  serving at `http://localhost:34115`.
- For **P13** (lifecycle phase): a real production binary from `wails build` (`build/bin/`).
  This is not optional — a browser reload against `wails dev` cannot prove process-restart
  persistence, single-instance lock, `OnShutdown` cancellation, or prod (WARN-level) logging.
- A browser-automation tool with screenshot capability (Chrome DevTools MCP or Playwright MCP)
  for the computer-vision verification loop described in §4.
- `curl`, the `ollama` CLI, the `lms` CLI (LM Studio's CLI — `lms ps`, `lms load -c <ctx>`,
  `lms unload`, `lms ls`).
- A SQLite reader capable of opening a DB **read-only** (e.g. `sqlite3 "file:<path>?mode=ro"`
  or a GUI browser's read-only mode) — the app holds a single read-write connection
  (`MaxOpenConns=1`); a second RW handle can contend with it.

### Paths (macOS — adjust per-OS per `CLAUDE.md` if testing elsewhere)
| What | Path |
|---|---|
| Settings/App data root | `~/Library/Application Support/GoTextApp/` |
| SQLite database | `~/Library/Application Support/GoTextApp/gotext.db` |
| Logs folder | `~/Library/Application Support/GoTextApp/logs/` |
| Operational log | `~/Library/Application Support/GoTextApp/logs/app.log` (+ rotated `.log.gz` backups) |
| Task-log JSONL (if `enableTaskLogging` on) | same app-data root, see `internal/tasklog` |

> Note: the folder is `GoTextApp`, not `GoText` — this matches the actual code constant
> (`internal/file/constants.go`), not the friendlier name used in prose elsewhere.

### Provider endpoints (from `CLAUDE.md`)
```
Ollama:     GET  http://localhost:11434/v1/models
            POST http://localhost:11434/v1/chat/completions
            GET  http://localhost:11434/api/tags
LM Studio:  GET  http://localhost:1234/v1/models
            POST http://localhost:1234/v1/chat/completions
```

---

## 2. Baseline State Definition

Every phase either assumes this baseline or explicitly restores it before proceeding. This
matters because the suite is meant to be re-run repeatedly — a phase that leaves stray
providers, stacks, or history behind will silently corrupt the next phase's assumptions.

**Clean baseline =**
- Exactly the two auto-seeded providers exist: **Ollama** and **LM Studio** (default presets,
  no edits). No custom/OpenAI/Azure/Llama.cpp providers configured.
- Current provider = Ollama, current model = `phi4-mini:3.8b-q4_K_M`.
- Model config: `useTemperature` **on** by default (`temperature=0.5`); `useContextWindow`,
  `useMaxOutputTokens`, `useLegacyMaxTokens` off — per the seeder (`internal/db/db.go`) and the
  read-fallback defaults (`internal/settings/repository_sqlite.go`), which agree with each other.
- Inference config at defaults (`timeout=60`, `maxRetries=3`, `useMarkdownForOutput=false`) — per
  the seeder (`internal/db/db.go`), not the `timeout=30`/"markdown on" figures previously stated
  here.
- No custom languages beyond the shipped defaults.
- `historyEnabled=true`, history empty (cleared).
- `enableTaskLogging=false`.
- No saved stacks beyond the built-in suggested stacks.
- Theme = `auto`.

**To restore baseline:** use Settings → Metadata → "Reset to defaults" (P15's factory-reset
test case), or delete `gotext.db` and relaunch — the same procedure as P0-T2's first-run reseed
check, which also incidentally re-exercises P0-T3's clean-launch check.

**Sequencing rule:** phases that mutate global state in ways later phases must not see
(deleting the only providers, corrupting settings, factory reset) run **last** (P15). Phases
P1–P14 must leave the baseline intact or explicitly restore it in their own teardown step.

---

## 3. Automated coverage this plan does NOT duplicate

Before driving anything by hand, know what's already covered deterministically so this plan
stays focused on what only a live pass can catch:
- `frontend/e2e/*.spec.ts` (Target A, mocked bridge): `appbar`, `editor-interactions`,
  `history`, `settings-ui`, `smoke-tests`, `stacks-ui`, `text-selection`, `theme`,
  `theme-manual`, `verify-ui`, `capture-states` — UI wiring, layout, Redux state transitions
  against a fake backend.
- `frontend/e2e/live-llm.spec.ts` (Target B, `npm run verify:live`) — a narrow real-inference
  smoke check, requires `wails dev` + real Ollama/LM Studio with a small model loaded.
- `go test -race ./...`, especially `internal/llms` (uses `httptest` to mock providers) —
  covers request/response shape, retries-as-coded, error mapping unit-level.

This plan's job: real model responses, real timing, real process lifecycle, real error wire
formats, visual correctness, and DB/log ground truth — the things a mock can't produce.

---

## 4. Methodology / Assertion Protocol

1. **Assert on mechanism, not model content.** Never assert on the literal text an LLM
   returns. Assert on: non-empty output, correct status transitions (running → success/error),
   absence/presence of an error toast with the *correct error code*, a history row with the
   *correct* status/errorCode, a log line with the *correct* structured fields, a DB row
   existing/absent. Content spot-checks are a sanity glance, not a pass/fail criterion.
2. **Computer-vision loop for UI state a DOM query can't reliably prove:** take a screenshot
   (`take_screenshot` / MCP snapshot) → visually confirm what's actually rendered (toast text,
   disabled/greyed-out controls, diff-view highlighting, rendered Markdown, dark-mode contrast,
   Prompt Inspector content) → only then assert pass/fail. Don't rely solely on `getByRole`
   presence when the *visual* result is what's being tested (e.g. "does dark mode apply inside
   the portaled Select dropdown").
3. **Log verification:** tail/read `logs/app.log`. Confirm structured fields
   (`component`, `op`, `run_id`, `provider`, `duration_ms`) are present on the relevant log
   line for the action under test. To verify rotation, temporarily set `logMaxSizeMB` very low
   (e.g. `1`), generate enough log volume (several chain runs), and confirm a `.log.gz` backup
   appears; restore the setting afterward.
4. **DB verification:** open `gotext.db` **read-only** (`file:<path>?mode=ro`) alongside the
   running app. Query the relevant table (`settings`, `providers`, `app_state`, `languages`,
   `stacks`/`stack_steps`, `history`) to confirm a change actually persisted, not just that the
   UI shows it.
5. **Bug-found protocol:** the instant a test case fails unexpectedly (not a known/flagged
   pre-existing gap), stop, capture evidence (screenshot, log excerpt, DB row, exact repro
   steps), and record it as a `CONFIRMED` finding in the run's report (see
   `reports/README.md`). Per `CLAUDE.md`, every confirmed bug must get a new or adopted
   automated test case (Go table-driven test, Jest test, or Playwright spec) — cite that test's
   path in the finding. Don't silently patch and move on.
6. **Stale-finding discipline:** this plan may describe an issue that was true at authoring
   time (e.g. `maxRetries` having no consuming retry loop — see P3-T3). Always re-verify
   against **current source**, not this document's prose, before asserting pass/fail. Record
   the actual current behavior as the finding regardless of what a prior report said.

---

## 5. Model Matrix

| Phase | Model scope |
|---|---|
| P0, P1 (except model-discovery cases), P2 (except context-window cases), P4–P10, P12, P13, P15 | Fast-default only: `phi4-mini:3.8b-q4_K_M` (Ollama) / `qwen/qwen3-4b-2507` (LM Studio) |
| P2 context-window cases, P3, P11 (timeout/rate-limit/context_window cases), P14 | Full 6-model matrix (see below) |

This table gives each phase's overall default; where a phase's own header states a
per-test-case override (P2's context-window split, P3's "full matrix for T2–T3, fast-default
for T1, T4", P11's "fast-default except where noted"), the phase header wins.

**Full matrix:**

| # | Provider | Model | Size class |
|---|---|---|---|
| 1 | Ollama | `gemma4:e2b-it-q4_K_M` | small (~2B) |
| 2 | Ollama | `gemma4:e4b-it-q4_K_M` | mid (~4B) |
| 3 | Ollama | `phi4-mini:3.8b-q4_K_M` | mid (~4B) |
| 4 | LM Studio | `google/gemma-4-e2b` | small (2B) |
| 5 | LM Studio | `qwen/qwen3-4b-2507` | mid (4B) |
| 6 | LM Studio | `google/gemma-4-26b-a4b` | large (26B-A4B) |

Use `ollama ps` / `lms ps` to confirm which model is actually loaded before asserting
model-specific behavior (e.g. context window ceiling), since a stale loaded model gives false
results.

---

## 6. Phases

Each phase lists **Goal**, **Preconditions**, numbered test cases (`P{n}-T{m}`) with **Steps**
→ **Expected** → **Verify**, and a **Teardown** note. Check off `- [ ]` boxes as executed;
leave failed cases unchecked and file a finding per §4.

### P0 — Environment & Pre-flight

**Goal:** confirm the test environment itself is sound before testing app behavior on top of it.
**Preconditions:** none (this phase establishes the baseline).

- [ ] **P0-T1** Ollama and LM Studio both respond.
  Steps: `curl http://localhost:11434/v1/models`, `curl http://localhost:1234/v1/models`.
  Expected: both return 200 with a JSON model list including the models from §1.
- [ ] **P0-T2** First-run seed (fresh DB).
  Steps: quit the app, delete `gotext.db` (back it up first if it has data you need), relaunch.
  Expected: DB recreated, migrations run (check `goose` migration table / no errors in
  `app.log`), Ollama + LM Studio providers auto-seeded, no OpenAI/OpenRouter/Llama.cpp
  provider auto-created.
  Verify: read-only query on `providers` table shows exactly 2 rows.
- [ ] **P0-T3** App launches cleanly (`wails dev`).
  Steps: start `wails dev`, wait for `:34115` to serve.
  Expected: window opens, no error toast on load, AppBar renders with current provider/model.
- [ ] **P0-T4** Logs folder exists and is writable.
  Steps: check `~/Library/Application Support/GoTextApp/logs/app.log` exists after launch.
  Expected: file present, contains startup log lines with `component`/`op` fields.

**Teardown:** none — this phase produces the baseline for everything after it.

---

### P1 — Provider Management

**Goal:** exercise full CRUD across every provider kind, required/optional field validation,
and the three verification actions.
**Preconditions:** clean baseline (§2).

- [ ] **P1-T1** Create provider from each preset template: Ollama, LM Studio, Llama.cpp,
  OpenAI, OpenRouter.
  Steps: Settings → Providers → New → pick preset → observe pre-filled fields → Save (except
  don't actually need real credentials for OpenAI/OpenRouter — just verify the form structure
  and that Save is blocked without a valid env var name if auth ≠ none).
  Expected: each preset pre-fills kind, auth type, base URL, API-key env var name correctly per
  `internal/llms/factory.go` presets. OpenAI/OpenRouter require an env var name (not the key
  itself) before Save is enabled.
  Verify: read-only query on `providers` confirms row(s) created with correct `kind`/`base_url`.
- [ ] **P1-T2** Required-field validation — name.
  Steps: try to save a new provider with an empty name; try to save a duplicate name.
  Expected: `validation` error surfaced inline, Save blocked; no DB row created/duplicated.
- [ ] **P1-T3** Required-field validation — base URL format.
  Steps: enter a base URL missing `http(s)://`, then one not ending in `/`.
  Expected: both rejected with a validation message before Save is allowed.
- [ ] **P1-T4** Custom headers and custom models (optional fields).
  Steps: on a custom provider, enable "custom headers", add one header; enable "custom
  models", add a manual model tag not returned by model discovery.
  Expected: both persist; the custom model appears in the Model picker even though it wasn't
  discovered live.
- [ ] **P1-T5** Model discovery via `getModels`.
  Steps: on the Ollama provider, open the model picker, hit refresh.
  Expected: list matches `ollama.com` tags API output (cross-check `ollama list` /
  `curl :11434/api/tags`); includes all 3 pulled models.
- [ ] **P1-T6** TestConnection — success and `provider_unreachable`.
  Steps: run TestConnection on Ollama (should succeed). Then point a scratch provider's base
  URL at a dead port (e.g. `http://localhost:1/`) and TestConnection again.
  Expected: success case shows a pass indicator; dead-port case surfaces `provider_unreachable`
  specifically (check the error code shown in the Prompt Inspector / verification panel, not
  just "an error").
- [ ] **P1-T7** TestConnection — `missing_credential`.
  Steps: create a provider with auth=apiKey and an env var name that is not set in the OS
  environment (or is set to empty). Run TestConnection.
  Expected: `missing_credential`, not a generic `auth` failure — confirms the code
  distinguishes "no credential provided" from "credential rejected".
- [ ] **P1-T8** TestModels — `model_not_found` (zero models returned).
  Steps: point TestModels at a valid-but-empty endpoint if feasible, or a provider kind/base
  URL combination that returns an empty model list.
  Expected: `model_not_found` surfaced with a "0 models" style message, not a silent success.
- [ ] **P1-T9** TestInference — success against saved ModelConfig.
  Steps: save a provider+model, run TestInference.
  Expected: uses the *saved* ModelConfig params (temperature/context/tokens if enabled) — spot
  check via network capture or Prompt Inspector that the request body reflects current settings.
- [ ] **P1-T10** TestInference — `busy` (single-flight gate).
  Steps: start a real chain run in the editor, then immediately trigger TestInference from
  Settings while the chain is still in flight.
  Expected: TestInference returns `busy` immediately rather than queueing or racing.
- [ ] **P1-T11** Set-as-current and delete.
  Steps: set a second provider as current, confirm AppBar reflects it; delete a non-current
  provider (confirm dialog appears); attempt to delete the current provider.
  Expected: delete-with-confirm works for non-current providers; deleting the current provider
  either blocks with a message or reassigns current to another provider (record actual
  behavior — this is a branch to characterize, not assume).
- [ ] **P1-T12** Persistence across a page reload (not full restart — that's P13).
  Steps: create a provider, reload the `wails dev` browser view.
  Expected: provider still present, still selected if it was current.
- [ ] **P1-T13** Edit an existing provider.
  Steps: open an already-saved provider (not new-from-template), change its base URL and its
  selected model, Save.
  Expected: the change persists — confirm via read-only DB query on `providers` (updated
  `base_url` value) — and takes effect on the *next* run against that provider (e.g. the
  request goes to the new base URL, or the new model shows up in the request body / Prompt
  Inspector), not just in the UI form state.

**Teardown:** delete any scratch/dead-port providers created in T6–T8; restore baseline (only
Ollama + LM Studio providers remain, Ollama current).

---

### P2 — Settings: Model Config

**Goal:** verify model selection and all per-model optional overrides.
**Preconditions:** clean baseline.

- [ ] **P2-T1** Model select updates AppBar and is used on next run.
- [ ] **P2-T2** Temperature toggle — auto-clear for rejecting models.
  Steps: enable `useTemperature`, set a value, select a model known/observed to reject a
  temperature param; run inference.
  Expected: the app either omits temperature for that model automatically or surfaces a clear
  error — confirm which, and that it doesn't silently send a broken request.
- [ ] **P2-T3** Context window toggle — small vs oversized value (fast-default model).
  Steps: enable `useContextWindow`, set a small value (e.g. 512), run a short prompt; then set
  a value larger than the model's native context; run again.
  Expected: small value is honored (verify via request body / provider server logs — `lms
  server-logs` or Ollama stdout — that `num_ctx`/`max_context` reflects the setting); oversized
  value is clamped or produces a clear `context_window`-adjacent message, not a silent failure.
- [ ] **P2-T4** Context window across the full model matrix.
  Model scope: full matrix (§5).
  Steps: for each of the 6 models, set context window to a value near that model's native
  ceiling and confirm the actual provider-side behavior (does Ollama's OpenAI-compat endpoint
  honor `num_ctx`? does LM Studio need `lms load -c <ctx>` set ahead of time to take effect?).
  Expected: record actual per-provider behavior; this diverged from naive expectations in the
  2026-07-01 report (Ollama silently ignoring `num_ctx` via the OpenAI-compat endpoint was a
  confirmed finding there) — re-verify current behavior, don't assume it's still broken or
  still fixed.
- [ ] **P2-T5** Max output tokens toggle.
  Steps: enable, set a low value (e.g. 16 tokens), run a prompt that would naturally produce
  more.
  Expected: output truncated at roughly the configured ceiling.
- [ ] **P2-T6** Legacy `max_tokens` toggle.
  Steps: enable `useLegacyMaxTokens`, run inference, inspect the outgoing request body (network
  capture or Prompt Inspector).
  Expected: request uses `max_tokens` field instead of `max_completion_tokens`.

**Teardown:** disable all toggles, restore fast-default model.

---

### P3 — Settings: Inference Config

**Goal:** verify timeout and retry configuration, including clamping and *actual* runtime
behavior (not just that the setting saves).
**Preconditions:** clean baseline. Model scope: full matrix for T2–T3, fast-default for T1, T4.

- [ ] **P3-T1** Timeout field clamping.
  Steps: enter `0`, a negative number, and a non-numeric value into the timeout field; save.
  Expected: clamps to the documented default (30s) rather than saving an invalid value —
  confirm via DB read of the `settings` row, not just the UI display.
- [ ] **P3-T2** Timeout actually triggers.
  Steps: set timeout to 1 second, run inference against a model/prompt combination that will
  take longer than 1s to respond (a larger model from the matrix, or a long prompt).
  Expected: run fails with `timeout` specifically (check error code in the toast/history entry
  and in `app.log`), within roughly 1s, not the default 30s.
- [ ] **P3-T3** `maxRetries` — clamping and *actual attempt count* on transient failure.
  Steps: set `maxRetries` to a boundary value (0, 10, and an out-of-range value like 15 to
  confirm clamping); then, with `maxRetries=3`, trigger a transient failure (e.g. stop the
  provider mid-request, or use a fault-injecting reverse proxy — see Appendix C — that fails
  the first N attempts then succeeds).
  Expected: clamping matches the documented range (0–10, default 3 if out of range). For the
  attempt-count check: **before asserting pass/fail, check current source** for whether a
  retry loop actually consumes `maxRetries` (as of the last exploration, `validateMaxRetries`
  in `internal/llms/service.go` was unconsumed and providers called `SetRetryCount(0)`). Record
  the actual observed attempt count (via network capture or provider server logs) against the
  configured value as the finding — do not assume either "no retries happen" or "retries work"
  without re-checking.
- [ ] **P3-T4** Markdown output toggle.
  Steps: toggle `useMarkdownForOutput` off, run an action likely to produce Markdown-formatted
  output (e.g. a structure/format action); compare rendering with it on vs off.
  Expected: output pane renders raw text vs rendered Markdown accordingly (visual check via
  screenshot).

**Teardown:** restore timeout=30, maxRetries=3, markdown on.

---

### P4 — Settings: Language Config

**Goal:** verify language list management and default input/output selection.
**Preconditions:** clean baseline.

- [ ] **P4-T1** Add a new language, set it as default input, run a translate action to it.
- [ ] **P4-T2** Remove a non-default language.
- [ ] **P4-T3** Attempt to remove the currently-selected default language.
  Expected: blocked, or default reassigned — record actual behavior.
- [ ] **P4-T4** Language list persists (DB check on `languages` table).

**Teardown:** restore default languages.

---

### P5 — Settings: App Behavior & Logging

**Goal:** verify task logging, history limits, and every logging sub-setting against the real
log file.
**Preconditions:** clean baseline.

- [ ] **P5-T1** Enable task logging, run a chain, confirm a JSONL record is written.
  Verify: locate the task-log file under the app-data root (per `internal/tasklog`); confirm it
  contains the expected fields (action id/name/category, input/output text, prompts,
  provider/model, duration, languages, run id) for the run just executed.
- [ ] **P5-T2** `historyMaxEntries` pruning.
  Steps: set `historyMaxEntries` to 2, run 3 chains.
  Expected: only the 2 most recent entries remain in the History rail and in the DB `history`
  table.
- [ ] **P5-T3** Log level changes take effect live.
  Steps: set `logLevel` to `error`, run a normal (non-erroring) chain, check `app.log` for
  absence of info/debug lines for that run; set back to `debug`/`info`, run again, confirm
  those lines reappear. No app restart should be required.
- [ ] **P5-T4** Log rotation.
  Steps: temporarily set `logMaxSizeMB` to `1`, `logMaxBackups` to `2`, `logCompress` on;
  generate enough log volume (several chain runs, or lower the level to `trace`) to exceed 1MB.
  Expected: a `.log.gz` backup file appears in the logs folder; count never exceeds
  `logMaxBackups`.
- [ ] **P5-T5** `logFileEnabled` off.
  Steps: disable file logging, run a chain, confirm no new lines are appended to `app.log`
  (console/dev output may still show them under `wails dev`).

**Teardown:** restore all App Behavior settings to baseline defaults; clear history.

---

### P6 — Settings: Appearance

**Goal:** verify theme switching, including dark-mode inheritance into portaled Radix content.
**Preconditions:** clean baseline.

- [ ] **P6-T1** Switch theme light → dark → auto.
  Verify (screenshot): `.dark` class is present on `document.documentElement`, not an inner
  div — check via DOM inspection or by opening a portaled component (Select dropdown, Dialog,
  Toast) while dark mode is active and visually confirming it inherits dark styling rather than
  rendering with light-mode leftovers.
- [ ] **P6-T2** `auto` mode follows OS appearance.
  Steps: toggle the OS-level appearance setting while GoText is set to `auto`.
  Expected: app theme follows without requiring a restart.

**Teardown:** restore theme to `auto`.

---

### P7 — Settings: Metadata

**Goal:** verify the read-only diagnostic paths are accurate (destructive reset is tested in P15).
**Preconditions:** clean baseline.

- [ ] **P7-T1** App folder / logs folder / DB path shown match §1's actual paths; "copy" and
  "open" actions work (open reveals the folder in Finder/Explorer; copy puts the path on the
  clipboard — verify by pasting).

**Teardown:** none.

---

### P8 — AppBar & Global UI

**Goal:** exercise global chrome: pickers, layout modes, sidebar, command palette,
notifications, Prompt Inspector.
**Preconditions:** clean baseline.

- [ ] **P8-T1** Provider/Model/Language pickers all reflect and update current selection.
- [ ] **P8-T2** View/layout mode toggles (preview/source/diff on Output pane) render correctly
  (screenshot each mode after running an action that changes text).
- [ ] **P8-T3** Actions sidebar search/filter narrows the catalog correctly.
- [ ] **P8-T4** ⌘K command palette opens, searches actions, and running an action from it
  produces the same result as running it from the sidebar.
- [ ] **P8-T5** Toasts/notifications appear for success and error cases with the correct
  message and auto-dismiss behavior; verify visually, not just via DOM presence, that error
  toasts are visually distinct from success/info toasts.
- [ ] **P8-T6** Prompt Inspector shows the actually-composed system+user prompt for a selected
  action/stack before running, including current model-config values (temperature, context
  window value if enabled) — this was a confirmed gap in the 2026-07-01 report (context value
  omitted); re-verify current state.

**Teardown:** none (non-mutating phase).

---

### P9 — Actions & Prompt Catalog (representative sampling)

**Goal:** exercise real inference across a representative slice of the 91-action catalog,
covering every exclusivity group, every family, merge behavior, terminal-action ordering, and
`Requires`-field handling — without running all 91 actions every time.
**Preconditions:** clean baseline. Model scope: fast-default.

One action per exclusivity group, run individually on sample text. Expected for each: non-empty
output, correct history record with the right action id.
- [ ] **P9-T1** Proofread group — one action.
- [ ] **P9-T2** Rewrite-intent group — one action.
- [ ] **P9-T3** Tone group — one action.
- [ ] **P9-T4** Style group — one action.
- [ ] **P9-T5** Doc-structure group — one action.
- [ ] **P9-T6** Summarize group — one action.
- [ ] **P9-T7** Translate group — one action.
- [ ] **P9-T8** Prompteng group — one action.
- [ ] **P9-T9** `structure.format` composability.
  Steps: combine a `structure.format` action with an action from another exclusivity group in
  one run.
  Expected: both apply (format is composable, doesn't consume the group slot other actions need).
- [ ] **P9-T10** Merge-in-family behavior.
  Steps: select two mergeable, adjacent (in sort order), same-family, non-terminal actions.
  Expected: they collapse into a single inference group/call (verify via history entry's
  `inferences` count = 1, or via network capture showing one request) rather than two separate
  calls.
- [ ] **P9-T11** Terminal action ordering.
  Steps: select a terminal action (translate or any prompt-eng action) alongside a non-terminal
  action.
  Expected: terminal action sorts/runs last per `Planner.Plan`'s canonical sort; it never merges
  with the non-terminal group.
- [ ] **P9-T12** `Requires` field — translate.
  Steps: run a translate action without setting `input_language`/`output_language` first.
  Expected: blocked with a `validation`/`invalid_plan`-style message rather than a silent
  wrong-language run; then set both and confirm it runs.
- [ ] **P9-T13** `Requires` field — image/video prompt-eng.
  Steps: run an image-prompt-eng action without `target_model`+`goal` set; then a video-prompt-
  eng action without `target_model` set.
  Expected: both blocked until the required fields are supplied via the UI.
- [ ] **P9-T14 (optional, full-sweep mode)** All remaining actions not covered by T1–T13, one
  run each. Only required when `internal/prompts/v3/catalog.go` itself changed in the release
  under test (new/removed/re-categorized actions) — otherwise skip and note as skipped in the
  report.

**Teardown:** clear history generated by this phase unconditionally, so P12 always starts from
an empty history table regardless of execution order.

---

### P10 — Stacks

**Goal:** verify stack CRUD and the Planner validation it shares with ad-hoc chains.
**Preconditions:** clean baseline (only built-in suggested stacks present).

- [ ] **P10-T1** Create a stack from scratch: name (required, unique), ordered action list,
  optional default format/languages/icon.
- [ ] **P10-T2** Create from a suggested-stack template, then customize and save under a new name.
- [ ] **P10-T3** Edit an existing stack's step order; re-run; confirm new order takes effect.
- [ ] **P10-T4** Duplicate a stack.
  Expected: copies under a new name without re-validating steps (per `internal/stacks`) — this
  means a stack that was valid when saved but would now fail `Planner.Plan` (e.g. an action was
  removed from the catalog) can still be duplicated; confirm actual behavior when *running* the
  duplicate in that scenario (it should fail at run time, not at duplicate time).
- [ ] **P10-T5** Delete a stack (confirm dialog).
- [ ] **P10-T6** Stack with an unknown/removed action id (simulate via direct DB edit if
  needed, read-only-safe by using a scratch stack).
  Expected: `List`/`Get` drop the unknown id gracefully with a warning log line, not a crash.
- [ ] **P10-T7** Planner constraint — exclusivity conflict inside a stack.
  Steps: attempt to save/run a stack with two actions from the same exclusivity group.
  Expected: `invalid_plan`.
- [ ] **P10-T8** Planner constraint — more than 5 steps.
  Expected: `invalid_plan`.
- [ ] **P10-T9** Planner constraint — more than 3 inference groups after merging.
  Steps: construct a stack whose non-mergeable/cross-family actions exceed 3 groups.
  Expected: `invalid_plan`.

**Teardown:** delete all stacks created in this phase; confirm only built-in suggested stacks
remain.

---

### P11 — Chain Execution & Error Handling

**Goal:** exercise the orchestrator's execution model and produce every reachable
`apperr.ErrorCode` with a concrete, reproducible trigger.
**Preconditions:** clean baseline. Model scope: fast-default except where noted.

**Execution model:**
- [ ] **P11-T1** Single action run — success path, history record correct.
- [ ] **P11-T2** Multi-action merge within one family — single inference group (cross-ref P9-T10).
- [ ] **P11-T3** Multi-group chain (actions spanning ≥2 non-mergeable groups) — confirm groups
  run sequentially, not concurrently (check timestamps/log ordering).
- [ ] **P11-T4** Mid-chain step failure.
  Steps: force a failure on a later group (e.g. switch to an invalid model mid-plan if
  possible, or use the fault proxy) in a multi-group chain.
  Expected: `StepFailed` wraps the error with the failing step index/family; a **partial**
  result (from the successfully-completed earlier groups) is kept, not discarded; history
  entry status = `partial` with `failedIndex` set correctly.
- [ ] **P11-T5** Cancellation between groups.
  Steps: start a multi-group chain, cancel after the first group completes but before the
  second starts.
  Expected: `cancelled` with partial result kept; confirm (via source-code check per the
  stale-finding discipline in §4) whether cancellation can also interrupt mid-call — as of the
  last check, `runStep`'s ctx argument was ignored and cancellation was only checked between
  groups, meaning a genuinely slow single-group call cannot be cancelled until it finishes.
  Record current behavior.
- [ ] **P11-T6** Busy/single-flight gate.
  Steps: start a chain, immediately start a second chain run (or a TestInference — cross-ref
  P1-T10) while the first is in flight.
  Expected: second attempt gets `busy` immediately, doesn't queue silently or corrupt the first
  run's result.
- [ ] **P11-T7** Same-language translate short-circuit.
  Steps: run a translate action with input language = output language.
  Expected: no LLM call made (verify via network capture / absent log line for that step), text
  passed through, still recorded correctly in history.

**Error-code triggers** (each row: name a concrete repro; codes without a live-only trigger are
marked and deferred to Go integration tests):

- [ ] **P11-T8** `validation` — malformed provider base URL (cross-ref P1-T3) or malformed
  settings input generally.
- [ ] **P11-T9** `invalid_plan` — cross-ref P10-T7/T8/T9.
- [ ] **P11-T10** `busy` — cross-ref P11-T6.
- [ ] **P11-T11** `missing_credential` — cross-ref P1-T7.
- [ ] **P11-T12** `provider_unreachable` — cross-ref P1-T6, or stop Ollama mid-chain-run and
  observe the in-flight request fail this way.
- [ ] **P11-T13** `model_not_found` — request a model name that doesn't exist on the current
  provider.
- [ ] **P11-T14** `timeout` — cross-ref P3-T2.
- [ ] **P11-T15** `context_window` — cross-ref P2-T3/T4 with an oversized fixture.
- [ ] **P11-T16** `empty_completion` — find a model/prompt/param combination that returns blank
  (some small models under aggressive `max_output_tokens` or temperature=0 edge settings can
  trigger this), or use the fault proxy (Appendix C) to return `choices: []`.
- [ ] **P11-T17** `auth` — **needs the fault proxy or a cloud-style provider with a
  deliberately invalid key** (Ollama/LM Studio don't natively reject on auth). Mark as
  proxy-required; if the proxy isn't stood up for a given run, mark this row skipped and note
  it in the report rather than silently passing it.
- [ ] **P11-T18** `rate_limited` — **needs the fault proxy** returning HTTP 429 with a
  `Retry-After` header; confirm the UI surfaces the retry-after value if present. Proxy-required.
- [ ] **P11-T19** `upstream` — **needs the fault proxy** returning a 5xx. Proxy-required.
- [ ] **P11-T20** `internal` — provoke a panic path if one is known/reachable, otherwise defer
  entirely to Go unit tests that exercise panic-recovery in the handler boundary
  (`apperr.Internal`, `recover()` in handlers per `CLAUDE.md`'s handler pattern); do not force
  an artificial panic against a live user-facing build. Mark as deferred-to-unit-tests.

**Teardown:** tear down the fault proxy if used; restore provider base URLs; clear any
scratch/broken providers created for trigger scenarios.

---

### P12 — History

**Goal:** verify recording, pruning, restore, delete, and the disabled-history path.
**Preconditions:** baseline with history cleared and enabled.

- [ ] **P12-T1** Successful run recorded with correct kind (single/stack), applied actions,
  provider/model, languages, duration, inference count.
- [ ] **P12-T2** Partial/error runs recorded with correct status and `errorCode`/`failedIndex`
  (cross-ref P11-T4).
- [ ] **P12-T3** Restore — loading a history entry back into the input pane reproduces the
  original input text exactly.
- [ ] **P12-T4** Delete a single entry; Clear-all empties the rail and the DB table.
- [ ] **P12-T5** `historyEnabled=false` — run a chain, confirm `Record()` no-ops (no new DB row,
  cross-ref P5).

**Teardown:** clear history.

---

### P13 — Lifecycle & Persistence (built binary — real process restart)

**Goal:** prove everything that a `wails dev` browser reload cannot: real process
start/stop/restart, single-instance lock, shutdown cancellation, and production log level.
**Preconditions:** `wails build` completed; clean baseline established via the dev build first,
then confirm the built binary sees the same DB (same app-data path).

- [ ] **P13-T1** Launch the built binary, make a settings change (e.g. switch provider,
  create a stack), **fully quit the app** (not just close the window — confirm the process
  exits, e.g. via Activity Monitor / `ps`), relaunch.
  Expected: the change persisted (DB-backed, cross-ref §2); this is the one thing a dev-mode
  reload cannot actually prove. Also resize/move the window before quitting, and confirm window
  size/position is restored on relaunch — the `settings` table stores UI prefs including
  window size, so this is part of the same persistence contract, not a separate feature.
- [ ] **P13-T2** Single-instance lock.
  Steps: with the built app running, attempt to launch a second instance.
  Expected: second launch either focuses the existing window or is blocked — record actual
  behavior; confirm no second process/second DB-writer contention occurs.
- [ ] **P13-T3** `OnShutdown` cancels in-flight runs.
  Steps: start a chain run against a slower model (from the matrix) that will take several
  seconds, then quit the app while it's in flight.
  Expected: the app exits promptly rather than hanging on the in-flight request; on next
  launch, no orphaned "running" state is shown (history reflects `cancelled` or the run is
  simply absent, not stuck "in progress" forever).
- [ ] **P13-T4** Production log level.
  Steps: run a normal chain against the built binary; inspect `app.log`.
  Expected: only WARN-and-above lines appear (per `CLAUDE.md`: prod defaults to WarnLevel,
  file-only, no console multi-writer), in contrast to the DEBUG-level console+file output seen
  under `wails dev`.

**Teardown:** none required beyond normal app quit; DB state carries into P14/P15 as usual.

---

### P14 — Cross-Model Matrix (targeted)

**Goal:** confirm behaviors already covered functionally (P2 context window, P3 timeout,
P1 model discovery, P11 auth/credential errors) hold across all 6 models/providers, not just
the fast-default pair.
**Preconditions:** clean baseline. Model scope: full matrix.

- [ ] **P14-T1** Context window handling per model (cross-ref P2-T4) — run for all 6 models,
  table the results (provider, model, requested context, actual honored context per
  server-side evidence).
- [ ] **P14-T2** Timeout behavior per model — confirm timeout triggers consistently regardless
  of model size (a 26B model naturally takes longer; make sure the timeout setting isn't being
  silently extended or ignored for larger models).
- [ ] **P14-T3** Model discovery per provider (Ollama `api/tags` vs LM Studio `v1/models`) —
  confirm both list all locally-available models accurately.
- [ ] **P14-T4** Credential/auth error paths are consistent in error code/message shape
  regardless of which provider triggers them (cross-ref P11-T11/T17).

**Teardown:** restore fast-default model/provider as current.

---

### P15 — Destructive Cleanup & Factory Reset (run last)

**Goal:** verify the destructive reset path itself, and leave the environment in a clean,
known state for the next run of this plan.
**Preconditions:** all prior phases complete; this phase intentionally destroys state.

- [ ] **P15-T1** Delete a non-baseline provider created earlier in the run if any remain
  (should be none if teardown steps were followed — treat any leftovers as a process finding).
- [ ] **P15-T2** Settings → Metadata → "Reset to defaults" (confirm dialog required).
  Expected: DB tables wiped and reseeded in one transaction (per `SqliteGooseSqlcRules.md` —
  compound writes must be transactional; a partial reset would be a bug); resulting state
  matches clean baseline exactly (2 providers, no custom stacks, empty history, default
  settings).
- [ ] **P15-T3** Post-reset sanity — relaunch and confirm the reseeded state persists (cross-
  ref P13-T1's persistence check, cheaper single-shot version here).

**Teardown:** this phase's output *is* the clean baseline for the next execution of this plan.

---

## 7. Coverage Summary

| Phase | Area | Test count |
|---|---|---|
| P0 | Environment & Pre-flight | 4 |
| P1 | Provider Management | 13 |
| P2 | Settings — Model Config | 6 |
| P3 | Settings — Inference Config | 4 |
| P4 | Settings — Language Config | 4 |
| P5 | Settings — App Behavior & Logging | 5 |
| P6 | Settings — Appearance | 2 |
| P7 | Settings — Metadata | 1 |
| P8 | AppBar & Global UI | 6 |
| P9 | Actions & Prompt Catalog | 14 (13 required + 1 optional full-sweep) |
| P10 | Stacks | 9 |
| P11 | Chain Execution & Error Handling | 20 |
| P12 | History | 5 |
| P13 | Lifecycle & Persistence (built binary) | 4 |
| P14 | Cross-Model Matrix | 4 |
| P15 | Destructive Cleanup & Factory Reset | 3 |
| **Total** | | **~104** |

---

## 8. How the AI Agent Should Execute This Plan

1. Invoke `superpowers:subagent-driven-development` or `superpowers:executing-plans` to work
   through phases with review checkpoints, the same pattern used for the 2026-06-30 doc.
2. Confirm §1 prerequisites before starting — do not begin P0 until Ollama, LM Studio, and (for
   P13) a fresh `wails build` binary are all confirmed ready.
3. Execute phases **in order, P0 → P15**. Preconditions for each phase assume prior phases'
   teardown steps were completed — do not skip teardown even under time pressure, since it's
   what keeps the suite reusable.
4. For each test case: perform the steps, use the §4 methodology (mechanism-based assertions,
   screenshot-verify visual state, log/DB-verify persistence claims), and check the box only
   when Expected is actually confirmed — not when the steps merely ran without visible error.
5. The instant a test case fails unexpectedly, follow the §4 bug-found protocol: stop, capture
   evidence, keep going with the remaining test cases (don't let one failure block the whole
   phase) unless the failure corrupts the baseline for later phases — in that case, restore
   baseline manually before continuing.
6. At the end of the run, write a new dated report under `reports/` per `reports/README.md`'s
   format: a pass/fail table per phase, a Findings table for anything not `PASS`, an overall
   assessment, and any follow-up implementation tasks opened.
7. For every `CONFIRMED` finding, create or extend an automated test (Go table-driven test for
   backend logic, Jest for frontend logic/components, or a new Playwright spec for UI/E2E
   regressions) per `CLAUDE.md`'s rule, and reference that test's path in the finding row.
8. If a finding reveals this plan itself has a coverage gap (a functional area or error path
   this document doesn't test), update this file (bump the Changelog) as part of the same
   follow-up, not as a separate deferred task.

---

## 9. How to Extend This Plan

When new functionality ships (a new settings field, provider kind, action family, error code,
etc.), add coverage here rather than creating a new standalone document:

1. **New test case in an existing phase:** append it with the next available `T{m}` number in
   that phase (don't renumber existing cases — reports may reference them by ID).
2. **New phase:** append it after P15 as `P16`, `P17`, ... with the same Goal/Preconditions/
   Steps-Expected-Verify/Teardown structure as existing phases. Add its row to the Coverage
   Summary table and its model scope to §5 if relevant.
3. **New error code:** add a trigger row to P11's error-code list (or the closest analogous
   phase if it's not chain-execution-related), following the "name a concrete repro, mark
   proxy-required or deferred-to-unit-tests if no live trigger exists" pattern from §"Error-code
   triggers".
4. Always add a row to the **Changelog** table at the top describing what changed and why —
   this is what lets a future report distinguish "the plan changed" from "the app regressed".
5. Keep the representative-sampling philosophy for anything that scales (catalog actions,
   provider kinds, model matrix) rather than defaulting to exhaustive coverage — call out an
   explicit "optional full-sweep mode" trigger condition the way P9-T14 does, instead of
   silently growing every phase's runtime on every release.

---

## 10. Acceptance Criteria for a Release Gate

A release is considered live-testing-clean when:
- [ ] All phases P0–P15 executed with every test case either `PASS` or explicitly marked
  skipped-with-reason (e.g. proxy not stood up for this run) in the report.
- [ ] Zero unresolved `CONFIRMED` findings at `high`/`critical` severity (a `CONFIRMED` finding
  at `low`/`informational` severity may ship with a tracked follow-up task, at the team's
  discretion).
- [ ] The existing deterministic CI guards from `CLAUDE.md` are green on the same commit:
  - `go build ./...`
  - `go test -race ./...`
  - `wails generate module && git diff --exit-code frontend/wailsjs/`
  - `! grep -rq "@mui\|@emotion" frontend/src`
  - `npm run test` (Jest)
  - `npm run verify:ui` (Playwright Target A)
- [ ] Every `CONFIRMED` finding from this run has a corresponding automated test committed
  (per §"How the AI Agent Should Execute This Plan", item 7).

---

## 11. Appendices

### Appendix A — Ollama CLI cheat-sheet
```bash
ollama list                        # show pulled models
ollama ps                          # show currently loaded model(s) + context size
ollama serve                       # start the server (if not already running)
ollama pull <model>                 # pull a model
ollama stop <model>                 # unload a specific model
```

### Appendix B — LM Studio (`lms`) CLI cheat-sheet
```bash
lms ls                              # list downloaded models
lms ps                              # list currently loaded models
lms load <model> -c <context_len>   # load a model with a specific context length
lms unload <model>                  # unload a specific model
lms unload --all                    # unload everything
lms server-logs                     # tail LM Studio's request/response logs (useful for
                                     # confirming what a request actually contained)
```

### Appendix C — Fault-injection reverse proxy (for `rate_limited` / `upstream` / `auth` / `empty_completion`)
The 2026-07-01 report used a small reverse-logging HTTP proxy sitting in front of the real
provider endpoint to both capture wire-level requests and inject faults. For this plan, stand
up an equivalent local proxy (any lightweight HTTP server) that:
- Forwards to the real Ollama/LM Studio endpoint by default (pass-through, for wire capture).
- Can be toggled per-scenario to instead return a canned response: HTTP 429 with
  `Retry-After` header (`rate_limited`), HTTP 500/502 (`upstream`), HTTP 401 (`auth`), or a 200
  with `{"choices": []}` (`empty_completion`).
- Point a scratch GoText provider's base URL at the proxy instead of the real provider for
  these specific test cases; tear it down (delete the scratch provider) afterward.
This is infrastructure, not app code — it lives outside the repo (e.g. in a scratch/tooling
directory) and is not part of the shipped product. Before building one from scratch, check
whether the reverse-proxy script used for the 2026-07-01 report survives anywhere retrievable
(scratch directories are typically not committed, so it likely does not — in that case, a
~30-line Go or Node HTTP handler implementing the four canned responses above is sufficient;
don't over-build it). If no proxy is stood up for a given run, mark P11-T17/T18/T19 as
skipped-with-reason in that run's report rather than silently passing them.

### Appendix D — Log/DB path reference
See §1's tables. Reminder: open the SQLite DB **read-only** while the app is running
(`file:<path>?mode=ro`) — the app enforces a single writer connection
(`db.SetMaxOpenConns(1)`), and a second read-write handle can produce "database is locked"
noise unrelated to any real app bug.

### Appendix E — Prior art
- `docs/V3_Temp_Docs/2026-06-30-comprehensive-live-testing.md` — original broad smoke-pass
  checklist this plan supersedes; source of the `P{phase}-T{n}` ID convention and the
  mechanism-over-content assertion philosophy.
- `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md` — deep-dive precedent for the
  Findings-table format, the fault-injection proxy technique, and the "re-verify after fixes"
  addendum pattern now formalized in `reports/README.md`.
- `docs/V3_Temp_Docs/SpecificationFolder/14-implementation-plan.md` — the T00–T83+
  implementation task tracker; `CONFIRMED` findings from this plan that require code changes
  should reference or open a new `T{NN}` entry there.
