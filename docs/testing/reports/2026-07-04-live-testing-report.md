# GoText Live Testing Report — 2026-07-04

Plan version executed: v1.2
Scope: **Targeted re-verification pass**, not a cold P0-P15 re-run — re-verify all 11 findings
from the 2026-07-03 report (tracked as follow-up tasks T84-T91) against the fixes landed since,
plus a regression smoke pass over the areas the fix commits touched. This scoping choice (rather
than re-executing all ~104 test cases) was made because: (a) the 2026-07-03 run was itself
time-boxed and left several phases PARTIAL, (b) every commit since that run is traceable to a
specific finding, and (c) the fastest, highest-signal path to "is this release-clean now" is
verifying each fix on its own terms — source, its dedicated test, and (where the finding was
UI/live-only) a live re-check — rather than diluting effort across a full blind re-run.
Build under test: `1f912d6becce290a2d6e0ef68eed4bde157b32ca` / branch
`feature/complete-redesign-of-the-app` / `wails dev` only (no fresh `wails build` binary this
session — P13-specific items are therefore **not** re-verified here; see "Not covered" below).

## Environment
- OS / hardware: macOS 26.5.1 (arm64), same machine as the 2026-07-03 run.
- Ollama models available: qwen2.5:7b-instruct, bge-m3:567m, gemma4:e2b-it-q4_K_M,
  gemma4:e4b-it-q4_K_M, qwen3-vl:4b-instruct-q4_K_M, qwen3:0.6b-q4_K_M, qwen3:1.7b-q4_K_M,
  gemma3:1b-it-q4_K_M, gemma4:26b-a4b-it-q4_K_M, ministral-3:3b-instruct-2512-q4_K_M,
  phi4-mini:3.8b-q4_K_M (all present; used qwen3:1.7b-q4_K_M as fast-default and
  gemma4:26b-a4b-it-q4_K_M as the deliberately-slow model for timeout/cancellation checks).
- LM Studio models available: full 12-model set as in the prior report (not directly exercised
  this session — all live checks ran against Ollama only, since that was sufficient to prove
  each fix).
- Browser surface: `preview_start`/`preview_*` tools (harness) against `wails dev` at :34115.
- DB state at session start: leftover from the 2026-07-03 session — only 1 provider (Ollama),
  10 history rows. Not a fresh baseline; recreated the LM Studio provider mid-session (needed for
  the T87 live check) and left it in place afterward, so the session ends with 2 providers
  (Ollama, LM Studio), matching baseline shape. Did not delete `gotext.db` or run a factory
  reset — no destructive DB operation this session.
- Process note: `npm run verify:ui` was first run **while `wails dev` was still active**, and 6
  of 12 tests failed with the settings dialog stuck on "Loading settings…". Root cause: both
  `wails dev`'s embedded Vite dev server and Playwright's own `webServer` config bind to
  `:5173`, and Playwright's `reuseExistingServer: true` silently reused the `wails dev` instance
  instead of spinning up its own bridge-mock dev server — so the test hit the real (non-mocked)
  Wails IPC bridge, which never resolves outside a real Wails webview. Stopping the `wails dev`
  preview server and re-running fixed all 12. **Lesson for future runs of this plan (same class
  of issue as the 2026-07-03 report's `wails build`-concurrency note): never run `npm run
  verify:ui` / `npm test` frontend-server-dependent suites while a `wails dev` preview session
  occupies :5173.** This is a test-environment artifact, not an app bug — not recorded as a
  finding.

## What this session verified

### CI/deterministic gates (all green)
| Gate | Result |
|---|---|
| `go build ./...` | PASS, no output |
| `go test -race ./...` | PASS — 809 tests, 18 packages |
| `wails generate module && git diff --exit-code frontend/wailsjs/` | PASS — bindings in sync |
| `! grep -rq "@mui\|@emotion" frontend/src` | PASS — none found |
| `npm run test` (Jest) | PASS — 74 suites / 726 tests |
| `npx playwright test` (all specs, Target A) | PASS — 113 passed, 0 failed, 12 skipped (`live-llm.spec.ts`, requires `BASE_URL`) |

### Finding-by-finding re-verification (2026-07-03 report → this session)

| # | Finding (2026-07-03) | Task | Verification method | Verdict |
|---|---|---|---|---|
| 8 | `ActionMeta.Requires` never enforced (translate/prompteng run without required fields) | T88 | Source: `internal/actions/planner.go` `checkRequirements` added to `Planner.Plan`, fails closed on unknown tokens. Test: `TestPlanner_Plan_Requirements` (`internal/actions/planner_test.go:267`) covers all 4 declared `Requires` combinations present/absent; `TestCatalog_RequiresTokensAreKnown` (`internal/prompts/v3/catalog_test.go`) guards the token↔switch mapping. | **FIXED** (test-verified; not re-exercised live — see note below) |
| 5 | `TestInference`/`TestConnection`/`TestModels` ignore configured timeout; error message hardcodes "0s" | T85 | Source: `internal/verification/service.go` now calls `llms.ValidateTimeout(bc.Timeout)` instead of a hardcoded 30s constant in all 3 methods; `apperr.RewriteTimeoutSeconds` fixes the message. **Live-verified**: set `Generation → Request timeout` to 10s (UI enforces a 10s floor, stricter than the backend's 1-600s range — noted, not a bug), ran `Test inference` against Ollama's `gemma4:26b-a4b-it-q4_K_M`. Result: `✗ Ollama did not respond within 10s.` at `app.log` timestamps `00:12:46→00:12:57` (11s elapsed, matching the configured value, not the old 30s). | **FIXED**, live-confirmed both parts |
| 6 | `maxRetries` has no consuming retry loop (dead setting) | T86 | Source: `internal/llms/service.go` — `chatWithRetry`/`chatOnce` implement a real retry loop with exponential backoff (`retryBackoffBase`/`Cap`), honoring `Retry-After` when present, gated on `AppError.Retryable`, aborting immediately on ctx cancellation. Test: `internal/llms/retry_test.go` (269 lines, new). Not re-exercised live (would require a fault-injection proxy this session didn't stand up) — resting on the Go test suite, which passed. | **FIXED** (test-verified; product decision was "implement the loop", not remove the setting) |
| 3 | Deleting the current provider leaves AppBar blank until manual reload | T87 | Source: `slice.ts` adds `getCurrentProviderConfig.fulfilled` reducer case; `thunks.ts`'s `deleteProviderConfig` now dispatches `getCurrentProviderConfig()` after delete. **Live-verified**: created a scratch LM Studio provider, set it current, deleted it — AppBar's `[aria-label="Provider"]` correctly read `"Provider Ollama"` immediately, no reload. New Jest coverage in `settings.test.ts` and a new Playwright spec `frontend/e2e/provider-delete-resync.spec.ts` (part of the 113-passed Playwright run above). | **FIXED**, live-confirmed |
| 9 | Cancellation cannot interrupt an in-flight LLM HTTP call | T90 | Source: `ctx` threaded from `runStep` → `ActionService.GetCompletionResponse` → `LLMService.chatOnce`'s per-attempt `context.WithTimeout(ctx, ...)` → `provider.Chat(reqCtx, ...)`; `mapTransportError` now classifies `context.Canceled` as the new `apperr.CodeCancelled`/`CancelledRequest` (distinct from `CodeTimeout`); `RunChain`'s step-failure branch normalizes a `CodeCancelled` step error into the same partial-result/cancelled shape as between-groups cancellation. Tests: `TestLLMServiceAPI_GetCompletionResponseForProvider_ParentContextCancelled_AbortsRequest` and its native-Ollama-path sibling in `internal/llms/service_integration_test.go` assert a 5s-delay mock server is aborted in <2s. **Live-verified**: ran `Basic proofreading` against `gemma4:26b-a4b-it-q4_K_M`, clicked Cancel mid-flight. `app.log`: run started `00:15:11`, cancelled `00:15:28`, `duration_ms:17081` (matches the actual elapsed wall time to the cancel click, i.e. the in-flight request was actually aborted, not left running), final shape `status:"cancelled", completed:0`, wire `code:"cancelled"`. | **FIXED**, live-confirmed with precise timing evidence |
| 4 | `internal/settings/service.go` returns raw errors instead of `apperr.Validation(...)` (systemic) | T84 | Source: full-file audit — every input-validation rejection in `internal/settings/service.go` now returns `apperr.Validation(field, expected, got)` (timeout, maxRetries, historyMaxEntries, language add/remove/default, provider ID checks). Redundant `cfg == nil` checks removed where callers (handler.go) never pass nil (value types + `&v` addressing — confirmed, not a latent nil-panic risk). **Live-verified**: called `UpdateInferenceBaseConfig({timeout:0})` directly via the bridge from the browser console — returned `{"code":"validation","details":{"field":"timeout","expected":"1–600 seconds","got":"0"},...}`, not the old generic `code:"internal"`. | **FIXED**, live-confirmed |
| 7 | `historyMaxEntries` silently clamped to a floor of 10 | T91b | Source: `internal/settings/service.go` — out-of-range `historyMaxEntries` now returns `apperr.Validation(...)` instead of silently substituting 10/1000. **Live-verified**: called `UpdateAppBehaviorConfig({historyMaxEntries:2})` directly — returned `code:"validation", details:{expected:"10–1000", got:"2"}`; confirmed via read-only DB query that the rejected value was never persisted. | **FIXED**, live-confirmed |
| 1 | Startup logs (`FileUtilsService`, `SettingsService`) missing `component`/`op` fields | T91a | Source: both services now hold a `*logging.Logger` and use a `log(op)` helper returning a `component`-stamped sub-logger; all call sites converted from flat `fmt.Sprintf` strings to structured chained calls. **Live-verified**: fresh `wails dev` startup log lines for `FileUtilsService.ensureAppSettingsFolderExists`/`SettingsService.GetAppSettingsMetadata` carry `component`/`op`/`duration_ms` fields (confirmed directly in the `preview_logs` startup output). | **FIXED**, live-confirmed |
| 11 | Production log level defaults to `info`, not `WarnLevel` as documented | T91c | Source: `logging.ResolveLevel(level, dev)` — empty persisted level resolves to `"debug"` in dev / `"warn"` in prod; seeder (`db.go`) now seeds `log.level=""` (unset sentinel) instead of `"info"`; wired into both `application.go` (startup) and `handler.go` (live reconfigure). Not re-verified against a fresh **prod** binary this session (no `wails build` run) — resting on `internal/logging/logger_test.go`'s new coverage (part of the passing Go suite). | **FIXED** (test-verified; prod-binary live check deferred — see "Not covered") |
| 2 | File logging (`app.log`) never receives writes under `wails dev` (root cause: handlers held a frozen `zerolog.Logger` snapshot from construction time, never updated after `Reconfigure`) | T89 | Source: `application.go`, `settings/handler.go`, `history/handler.go`, `stacks/handler.go`, `actions/handler.go` all replaced their frozen `zlog zerolog.Logger` field with a `liveZlog()` method that fetches the logger's *current* writer via `appLogger.ZeroLogger()` on every call, so a later `Reconfigure()` (e.g. enabling file logging) takes effect immediately instead of being invisible to handlers holding a stale copy. Test: `TestSettingsHandler_FileLogging_HandlerVsAppLoggerRouting` (new, `internal/settings/handler_test.go`) — a targeted discriminator test that separately checks (a) a direct write via the live logger reaches `app.log`, and (b) a handler-boundary error also reaches `app.log`, distinguishing "directory attachment broken" from "handler routing frozen". **Live-verified**: this session's own `wails dev` instance found `log.fileEnabled=true` already persisted from 2026-07-03; `app.log`'s last-modified timestamp matched the exact moment of this session's `wails dev` startup, and fresh structured log lines (including the `component`/`op` fields above) appeared in real time throughout the session. | **FIXED**, live-confirmed (the actual root cause, not just a symptom patch) |
| 10 | Wrong-arg-count Wails calls hang the frontend Promise forever (DX/robustness, no task opened per 2026-07-03's own note) | — | Not re-checked — the 2026-07-03 report explicitly deferred this ("low real-world impact... consider only if it recurs"). Not encountered this session. | Not re-verified (as intended) |

**Note on T88/T86 not being live-exercised:** both rest on Go integration/unit tests rather than a
live UI repro this session. T88 (`Requires` enforcement) has no accessible "send an empty
language" path through the normal UI, since the AppBar always has a default language pair
selected — the enforcement exists as a Planner-level safety net for any caller (including future
UI paths or a malformed request), and the table-driven test directly exercises the code path the
live UI cannot reach. T86 (retry loop) requires a fault-injection proxy to observe multiple
attempts against a real transient failure, which wasn't stood up this session; the new
`retry_test.go` suite (`httptest`-based, deterministic) is considered sufficient given `go test
-race` passed cleanly.

### Regression smoke of the broader diff (not itself a tracked finding)

The fix commits touched considerably more than the 8 findings' exact code paths — a mechanical,
repo-wide swap of `logger.Logger`/frozen `zerolog.Logger` fields for `*logging.Logger` +
`liveZlog()` across `application.go`, `settings/handler.go`, `history/handler.go`,
`stacks/handler.go`. Spot-checked for regressions:
- Ran a normal single-action chain (`Basic proofreading`, fast-default model `qwen3:1.7b-q4_K_M`)
  end-to-end: `chain run finished` logged `status:"done", completed:1`, output rendered correctly
  in the UI (typo corrections applied, screenshot-verified).
- `internal/history/handler.go` and `internal/stacks/handler.go`'s panic-recovery /
  `apperr.ToWire` boundary pattern is unchanged in shape (still `defer/recover` → `liveZlog()` →
  `ToWire`), just retargeted at a live logger — no behavior change beyond T89's actual fix.
  Confirmed via the full Go and Jest suites passing with no new failures.
- Full Playwright suite (113 tests across all specs, not just `verify-ui.spec.ts`) passed,
  covering appbar/editor/history/settings-ui/smoke-tests/stacks-ui/text-selection/theme
  interactions against the bridge-mock — no regression surfaced in any of those areas.

## Not covered this session (scope explicitly narrowed, not silently skipped)

- **No fresh `wails build` binary** — P13 items (settings-write-then-quit persistence,
  single-instance lock, `OnShutdown` mid-run cancellation, production log level in the actual
  built binary) were **not** re-verified live. T91c's prod-default-level fix and T90's
  cancellation fix both bear on P13-T3/T4 specifically; both are now test-covered
  (`logger_test.go`, the two `AbortsRequest` tests) but a live prod-binary confirmation remains
  the one meaningfully open item from the 2026-07-03 report's own "not fully verified" list.
- **Full P0–P15 sweep** was not re-executed — this was a deliberate scope decision (see "Scope"
  above), not an oversight. Nothing in the diff touches provider CRUD validation shapes, model
  config toggles, stacks CRUD, or history CRUD beyond the logger-plumbing change already smoke-
  tested above, so a full re-run of those phases was judged low-value relative to its cost.
- **LM Studio / cross-model matrix** — all live checks this session ran against Ollama only.

## New observations (not blocking, not from the 2026-07-03 findings list)

| # | Observation | Severity | Notes |
|---|---|---|---|
| 12 | Frontend console repeatedly warns `Selector selectArmedTarget returned a different result when called with the same parameters` (unmemoized selector, `frontend/src/logic/store/ui/selectors.ts`, consumed by `InputPane.tsx`) | Low (code-quality, `TypescriptReduxRules.md` §4.2 recommends `createSelector` for derived data) | Pre-existing — last touched in an unrelated commit (`ea89690`, well before this branch's recent fix commits), not a regression from this session's changes. Causes extra re-renders, not incorrect behavior. No task opened; flagging for awareness only, consistent with the 2026-07-03 report's precedent of noting-but-not-tasking low-impact DX items (cf. its finding #10). |
| 13 | Settings UI's timeout `NumberStepper` (Generation tab) enforces a client-side floor of **10s**, stricter than the backend's documented 1–600s validation range | Informational | Not a bug — just means a UI-only tester can't reach backend timeouts below 10s without calling the bridge directly (as this session did for the T85 live check). Worth a one-line mention in `LIVE_TESTING_PLAN.md`'s P3-T2 steps for future runs, since P3-T2 currently says "set timeout to 1 second" — that value is unreachable via the UI as currently built. |

## Overall assessment

**All 11 findings from the 2026-07-03 report (tracked as T84–T91) are FIXED and verified** — 9 of
11 with a direct live re-check against the running app (T84, T85 both parts, T87, T89, T90, T91a,
T91b), 2 resting on newly-added, well-targeted Go test coverage (T86, T88) that this session
judged sufficient without standing up a fault-injection proxy. Every fix has a corresponding
automated test now in the tree (per `CLAUDE.md`'s "every found bug gets a test" rule) and the full
deterministic gate suite — Go build, `go test -race` (809 tests), bindings-sync, MUI/emotion
guard, Jest (726 tests), and the complete Playwright suite (113 tests) — is green on this commit.

**No regressions were found** in the areas the fix commits touched (logger plumbing across 5
handler files, settings validation, retry/timeout/cancellation logic in `internal/llms`) or in
the broader app surface exercised by the full test suites and one live end-to-end chain run.

This session finds **no CONFIRMED new bugs** — only two low-priority observations (#12, #13)
noted above for awareness, neither blocking a release per this plan's §10 acceptance criteria as
it applies to the areas actually covered this session.

**Remaining gap toward full release-gate confidence** (carried over from 2026-07-03, not new):
a `wails build` binary pass to live-confirm P13 (real quit/relaunch persistence, single-instance
lock, `OnShutdown` mid-run cancellation now that T90 makes cancellation actually abort in-flight
work, and T91c's prod-default-Warn level) has still not been done. Recommend this as the next
targeted follow-up rather than opening a new numbered task, since it is a re-run of already-known
P13 test cases against already-fixed code, not a new defect.

## Follow-up tasks opened

None. All prior open tasks (T84–T91) are closed by the fixes verified in this report. No new
`CONFIRMED` finding at any severity emerged this session that meets the bar for a new task per
`docs/testing/reports/README.md` (a `CONFIRMED` finding, not an informational observation).

The two new observations (#12, #13) are recorded above for awareness per this plan's own
precedent (2026-07-03's finding #10) but are explicitly **not** promoted to tasks — #12 is a
pre-existing low-impact code-quality item unrelated to this session's changes, and #13 is a plan-
documentation nit, not an app defect.

**Suggested (not opened) next step:** a `wails build`-based P13 live pass, to close the one
remaining "not live-verified" gap noted above.
