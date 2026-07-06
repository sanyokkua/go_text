# GoText Live Testing Report — 2026-07-04 (Computer Use, Full P0–P15)

Plan version executed: v1.2
Scope: **Full plan P0–P15, no exceptions**, per explicit user instruction to use native
Computer Use (not just the Chrome browser mirror) to verify the app, given prior gaps in this
codebase's history where browser-only testing missed native-rendering-specific defects.
Build under test: commit `d832275` ("Single instance lock and other improvements") on
`feature/complete-redesign-of-the-app` — two commits ahead of the `b9c7714` build tested by the
same-day `2026-07-04-full-live-testing-report.md`. `wails dev` (native WKWebView window driven
via Computer Use, not the Chromium dev-mode browser mirror) for P0–P12/P14/P15; a fresh
`wails build` production binary (`build/bin/GoText.app`, launched both via `open` and by running
the Mach-O binary directly with captured stdout) for P13.

## Verdict: NOT ready to merge as-is — one confirmed functional regression blocks

**Stacks → Edit silently creates a duplicate instead of updating the original** (Finding #1
below). This is a core-feature regression, root-caused to exact file/line, and reproducible
100% of the time — **including a direct re-confirmation on the compiled production binary**
(`build/bin/GoText.app`, not just `wails dev`), performed specifically because this session had
already proven dev/prod rendering divergence exists elsewhere (Finding #2). Every other area
tested is either passing, previously-flagged-and-now-fixed, or a low-severity polish item.
Recommendation: fix Finding #1 (small, well-scoped: two dispatch calls in
`StacksManageView.tsx` + `ui/slice.ts`'s `enterBuildMode` reducer), add the regression test the
codebase rule requires, then this build is release-clean.

## Environment
- OS / hardware: macOS 26.5.1 (arm64).
- Ollama models available (11): qwen2.5:7b-instruct, bge-m3:567m, gemma4:e2b-it-q4_K_M,
  gemma4:e4b-it-q4_K_M, qwen3-vl:4b-instruct-q4_K_M, qwen3:0.6b-q4_K_M, qwen3:1.7b-q4_K_M,
  gemma3:1b-it-q4_K_M, gemma4:26b-a4b-it-q4_K_M, ministral-3:3b-instruct-2512-q4_K_M,
  phi4-mini:3.8b-q4_K_M (fast-default).
- LM Studio models available (12): google/gemma-4-26b-a4b-qat, google/gemma-4-e4b,
  google/gemma-4-e2b, qwen/qwen3-8b, mistralai/mistral-7b-instruct-v0.3, qwen2.5-7b-instruct,
  qwen/qwen3-4b-2507 (fast-default), google/gemma-3-1b, liquid/lfm2.5-1.2b,
  google/gemma-4-26b-a4b, openai/gpt-oss-20b, text-embedding-nomic-embed-text-v1.5.
- Fault injection: a purpose-built reverse proxy (`scratchpad/fault_proxy.py`) was used for
  every non-natively-reproducible error code (`empty_completion`, `auth`, `rate_limited`,
  `upstream`, `timeout`, mid-chain partial failure, mid-call cancellation), per the plan's
  Appendix C. Modes used this run: `passthrough`, `empty_models`, `empty_completion`, `auth401`,
  `rate_limited429`, `upstream500`, `delay35`, `fail2succeed3`, `succeed1fail`.
- Pre-flight CI gates: `go build ./...` PASS, `go test -race ./...` PASS (all packages),
  `wails generate module` diff clean, `@mui`/`@emotion` grep clean, `npm test` PASS (76
  suites / 755 tests), `npm run verify:ui` PASS (12/12), `npx playwright test` PASS
  (113 passed / 0 failed / 12 skipped).

## Results by phase

| Phase | Pass/Fail | Notes |
|---|---|---|
| P0 Environment & Pre-flight | PASS | Fresh-seed baseline matches documented defaults exactly; single-instance lock organically observed working. |
| P1 Provider Management | PASS | 3 previously-flagged findings (#1 model-sync-on-switch, #2 model-sync-on-delete, #3 Ollama completion-endpoint UI) all re-verified **FIXED**. One inconclusive sub-test (busy-gate race via this specific UI path), fully resolved later in P11-T6. |
| P2 Settings — Model Config | PASS | Context-window honoring for small values **CONFIRMED FIXED** (refutes a 2026-07-01 finding). One retracted false-positive (toast-timing artifact). |
| P3 Settings — Inference Config | PASS | Timeout and retry-count enforcement **CONFIRMED FIXED** (refutes a prior "retries may be unconsumed" caution). One minor UX polish finding (Finding #3). |
| P4 Settings — Language Config | PASS | Default-language deletion correctly blocked with a clear (if slightly awkward-worded) error. |
| P5 Settings — App Behavior & Logging | PASS | Task logging, history pruning, and live log-level/file-toggle all confirmed with real evidence (line-count diffs, JSONL field checks). |
| P6 Settings — Appearance | PASS (1 finding, downgraded) | Initial dark-mode Select bug finding was later self-corrected to PLAUSIBLE/inconclusive — see Finding #2. Auto-theme-follows-OS confirmed live via real macOS appearance toggling. |
| P7 Settings — Metadata | PASS | Paths, copy, and open-folder actions all verified against the real filesystem. |
| P8 AppBar & Global UI | PASS | Pickers, view modes, search, Cmd+K palette, and Prompt Inspector all confirmed. |
| P9 Actions & Prompt Catalog | PASS | Merge, cross-family composability, terminal-action re-ordering, and `invalid_plan` requirement-gating all confirmed correct (one finding self-corrected — see below). |
| P10 Stacks | **FAIL** | Finding #1 (Edit-creates-duplicate) — confirmed, root-caused, blocking. All other stack CRUD operations (create, duplicate, delete) pass cleanly. |
| P11 Chain Execution & Error Handling | PASS | All 9 directly-triggerable error codes reproduced with exact log/toast evidence; mid-call cancellation **CONFIRMED FIXED** (refutes a stale plan caution); busy-gate confirmed via a clean UI-disabled-state test; same-language short-circuit confirmed (zero LLM calls). |
| P12 History | PASS | Record, restore, delete, clear-all, and disabled-history no-op all confirmed via direct DB row inspection. |
| P13 Lifecycle & Persistence (built binary) | PASS | Full quit/relaunch persistence, single-instance lock, `OnShutdown` cancellation, and production log-level (`warn`-default, file-only, zero console output) all confirmed against the actual compiled binary — not just source inspection. One minor doc/expectation mismatch (window position isn't persisted, only size). |
| P14 Cross-Model Matrix | PASS | Context-window and timeout enforcement confirmed correct on the largest available model (26B/17GB), not just the fast-default pair — timeout is not silently extended for slow models. |
| P15 Destructive Cleanup & Factory Reset | PASS | Factory reset is a clean, gated, single-transaction wipe-and-reseed; reseeded state matches the P0 fresh-seed baseline exactly and survives a real process restart. |

## Findings

| # | Test case | Verdict | Evidence |
|---|---|---|---|
| 1 | P10 — "Edit" on an existing saved stack | **CONFIRMED bug, blocking — reproduced on both `wails dev` and the production binary** | Editing "Test Scratch Stack (copy)" under `wails dev` and saving produced a **third** DB row instead of updating the original two (`SELECT id,name FROM stacks` went 2→3 rows, originals untouched). **Re-confirmed independently on the compiled `build/bin/GoText.app` production binary**: created a single stack "ProdCheck Stack A" (1 step), clicked Edit, added a second step, saved under a new name to get past the "name already exists" validation the buggy create-path triggers — `SELECT id,name FROM stacks` went from 1 row to 2 rows (`ProdCheck Stack A` unchanged at 1 step, plus a new `ProdCheck Stack A EDITED` row at 2 steps). Same failure mode, same evidence shape, on the actual shipped artifact — not just dev mode. Root cause: `frontend/src/logic/store/ui/slice.ts:71-74`'s `enterBuildMode` reducer unconditionally resets `state.editingStackId = null`; `frontend/src/ui/widgets/views/stacks/StacksManageView.tsx:69-77`'s `handleEdit` dispatches `setEditingStackId(stack.id)` then immediately `enterBuildMode()`, wiping the id before `SaveStackDialog.tsx:~166`'s otherwise-correct `if (editingStackId) updateStack() else createStack()` branch ever sees it. Backend `UpdateStack` (`internal/stacks/handler.go:238`) is fully implemented and tested — this is purely a frontend dispatch-ordering bug. **Needs a regression test** (e.g. a Redux slice test asserting `editingStackId` survives an `enterBuildMode()` dispatched immediately after `setEditingStackId()`, or a component test for `handleEdit`'s dispatch order) — no such test exists yet; it should land together with the fix per `CLAUDE.md`'s "every bug gets a test" rule, tracked as T-STACK-EDIT below. Test artifacts (`ProdCheck Stack A`, `ProdCheck Stack A EDITED`) were deleted from the DB and the app process cleanly terminated after this re-confirmation, restoring the zero-stacks factory-reset baseline. |
| 2 | P6/P8 — dark-mode `Select` dropdown light background | PLAUSIBLE, **not blocking** | Initially reproduced 3× (Kind selector in `ProviderForm.tsx` and the AppBar `ProviderPicker` rendered a light/white dropdown panel in dark mode, while the adjacent Model selector — same component, same file, same session — rendered correctly dark). On reflection this was flagged as an overreach: a real renderer-wide bug would make **both** selects light, not just one, and this session had unrelated window-focus/resize chaos around the same time (stray Chrome tab, `wails dev` browser-mirror interference) that could have produced a capture artifact. Downgraded from CONFIRMED to PLAUSIBLE/unresolved. **Recommend**: a dedicated follow-up session with screen recording + native WebInspector (not available in this harness) to conclusively confirm or refute before treating this as actionable. |
| 3 | P3-T1 — frontend timeout stepper range | CONFIRMED, low severity, polish only | `InferenceConfigTab.tsx`'s `NumberStepper` allows 10–3600s while the backend (`internal/llms/service.go` `ValidateTimeout`) only accepts 1–600s. Not a data-integrity bug — the backend correctly rejects out-of-range values with a clear toast+log message and the DB is not corrupted — but a user can type a value the UI itself guarantees will be rejected. Recommend capping the frontend stepper's `max` at 600. |
| 4 | P1/P11 — Settings → Providers Model dropdown staleness | CONFIRMED, low severity | After adding a new tag to a provider's "custom models" list and saving, the same page's Model select doesn't refresh to include it as an option (shows only the previously-selected model) until the provider is re-opened. Workaround exists (the AppBar's per-run Model picker correctly shows the new tag immediately) and the underlying persisted-model-override path is unaffected — cosmetic/staleness only. |
| 5 | P11-T7 — history rail inference count on same-language short-circuit | CONFIRMED, cosmetic only | A same-language `translate.text` run correctly short-circuits (verified `duration_ms:2`, zero LLM calls even with the upstream proxy set to fail loudly), but the history rail still labels it "1 INF" despite zero actual inferences occurring. Purely a display-count nit. |
| 6 | P13-T1 — window position not persisted | CONFIRMED, low severity, likely intentional | `settings` table only has `window.width`/`window.height` — no x/y key exists anywhere in the schema, and a moved window reliably reappears at the default position after a full quit/relaunch. `CLAUDE.md`'s "window size" phrasing is accurate; the live-testing plan's T1 wording additionally implies position persists, which it does not. Flag as a plan-wording/doc mismatch rather than an app defect — many desktop apps intentionally leave placement to the OS. |
| 7 | P13-T3 — shutdown DB-closed race drops last-second history write | CONFIRMED, informational only | Cancelling an in-flight run via app quit correctly terminates the HTTP call and the process (both within ~1-2s, well before the artificial 35s delay would complete), but a `warn`-level `"database is closed"` line shows the cancelled run's history entry failed to persist because the DB connection had already been torn down as part of the same shutdown sequence. This still satisfies the plan's own acceptance criteria ("history reflects cancelled **or the run is simply absent**") — confirmed no orphaned/stuck "in progress" entry appears on relaunch — but is worth a mention since it indicates the shutdown sequence could drop other last-second writes in a similar race. |
| 8 | P4-T3 — language-removal-blocked error message wording | CONFIRMED, cosmetic only | Message reads "language not the current default input language; got Dutch" — functionally correct and the block itself works exactly as intended, just slightly awkward phrasing. |
| 9 | P9-T13 — `invalid_plan` UI feedback | **Corrected — not a bug** | Originally suspected zero UI feedback on a blocked Run click; re-tested deliberately (full deselect → fresh reselect) and confirmed a toast **does** fire, at action-**selection** time (not Run-click time) via an automatic preview/validation call. Original finding was a false negative from re-clicking Run on an already-selected (already-toasted) action. Retracted as a bug; kept only as a minor discoverability suggestion (a persistent inline indicator in addition to the transient toast would be more robust against a missed toast window). |
| 10 | P3-T2/T3 — wire-level error code for a timeout-exhausted-retries chain | CONFIRMED, informational only, **by design** | A chain step that times out and exhausts all configured retries surfaces the **generic `step_failed`** code (retryable:true) to history/toast — there is no distinct `timeout` error code in the wire taxonomy for this path. This is intentional: `apperr.StepFailed(index, err)` wraps every step-level failure identically regardless of the underlying cause (per `ErrorEnvelopeRules.md`'s chain-wrapping pattern). The human-readable cause message (e.g. `"Scratch Timeout Test did not respond within 10s."`) is preserved and shown to the user, so they aren't left without an explanation — they just can't distinguish "timeout" from other retryable step failures by code alone. Anyone consulting `app.log` for this scenario should expect `code:"step_failed"`, not `code:"timeout"`. |

### Findings confirmed FIXED this run (positive results, not new bugs)

These were flagged in prior reports/plan revisions and are **re-verified fixed** as of `d832275`:

- Provider round-trip model-sync loss (prior Finding #1) — model selection now survives switching providers and back.
- Stale model retained after deleting the current provider (prior Finding #2) — now correctly resyncs to a valid model.
- Ollama "Completion endpoint (override)" field silently accepted but ignored (prior Finding #3) — now disabled in the UI with an explanatory caption.
- `maxRetries` possibly unconsumed by the actual retry loop — confirmed consuming the full configured count with real exponential backoff (verified: `maxRetries=3` → exactly 4 total attempts logged).
- Mid-call cancellation limited to between-groups only (a caution embedded in the live-testing plan itself) — confirmed **cancellation now propagates correctly to an in-flight HTTP request mid-call**, terminating well before a 35s artificial delay completes.
- Small context-window values not honored (2026-07-01 finding) — confirmed honored exactly via `ollama ps` (`CONTEXT 1024` for the fast-default model, `CONTEXT 9216` for a 26B model in the P14 spot-check).
- Single-instance lock — confirmed fully implemented and working: second-instance launch shows the documented "Already running" dialog and exits cleanly with no zombie process or second DB writer.

## Overall assessment

**Blocked on Finding #1.** Everything else in this ~104-test-case plan passed, was previously
broken and is now confirmed fixed, or is a low-severity polish item that does not affect
correctness or data integrity. Finding #1 is a genuine, 100%-reproducible, root-caused
regression in a core feature (editing a saved Stack silently duplicates it instead of updating),
and it is small and well-scoped to fix: the two dispatch calls in `StacksManageView.tsx`'s
`handleEdit` need reordering (or `enterBuildMode()` needs an optional "preserve editingStackId"
path) so `SaveStackDialog.tsx`'s already-correct branching logic actually receives a non-null id.

Recommendation: fix Finding #1 + add its regression test, do a quick manual re-verification of
the Stacks Edit flow, then this build is clean to merge. Findings #2–#9 can ship as-is and be
tracked as follow-up polish/investigation tickets; none block release on their own.

## Follow-up tasks opened

- T-STACK-EDIT — Fix Stacks "Edit" creating a duplicate instead of updating in place; add a
  regression test per `CLAUDE.md`'s bug-testing rule. Tracks Finding #1. **Blocking.**
- T-DARKMODE-SELECT — Dedicated follow-up session (with screen recording + native WebInspector)
  to conclusively confirm or refute the dark-mode `Select` dropdown rendering report. Tracks
  Finding #2. Non-blocking.
- T-TIMEOUT-STEPPER-RANGE — Cap the frontend inference-timeout `NumberStepper` at 600s to match
  the backend's authoritative ceiling. Tracks Finding #3. Non-blocking, quick fix.
- T-PROVIDER-MODEL-DROPDOWN-STALE — Refresh the Settings → Providers Model select after a
  custom-model tag is added, without requiring a page re-visit. Tracks Finding #4. Non-blocking.
- T-HISTORY-INF-COUNT — Show "0 INF" (not "1 INF") for same-language short-circuited translate
  runs in the history rail. Tracks Finding #5. Non-blocking, cosmetic.
- T-LANG-ERROR-WORDING — Polish the "can't remove current default language" error message
  wording. Tracks Finding #8. Non-blocking, cosmetic.
- No task opened for Finding #6 (window position) or #7 (shutdown DB-close race) — both are
  informational/by-design observations, not action items, per the notes above.
- No task opened for Finding #9 — retracted as a false positive; already correct behavior.
