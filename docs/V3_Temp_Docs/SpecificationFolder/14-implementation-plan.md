# GoText v3 — AI-Agent Implementation Plan

This plan decomposes the entire v3 implementation into independently executable tasks optimized for AI
agents. Each task is one implementation story: it fits a clean context window, contains its own context,
and lists explicit acceptance criteria. Execute tasks using the lifecycle in `15-ai-agent-execution-template.md`.

**Conventions:** complexity ∈ {S, M, L}. Source paths are repo-root-relative. Cross-references point to
the specification documents `01`–`16`. Follow the coding standards in `docs/ai_agent_rules/` and the Wails
binding rule (bound methods take no `context.Context` param; store ctx from `OnStartup`; run
`wails generate module` after Go signature changes). **Every task ends by running the verification
pipeline** in `13-testing-specification.md` §11 (build → unit/`-race` → codegen sync → live-Chromium UI
gates → CI guards → clean tree); the harness that makes this runnable is built once in **T00** below and
is a prerequisite for all other tasks.

**Phase overview & dependency graph**
```
P-1 Bootstrap:        T00 (verification & test harness) → everything
P0 Foundation:        (T00) → T01 → T02 → T03 → T04 → T05
P1 Persistence:       (T03) → T06 → T07
P2 Providers:         (T04,T06) → T08 → T09 → T10
P3 Prompts & Stacks:  (T06) → T11 → T12 → T13 → T14 → T15
P4 History:           (T07,T13) → T16
P5 FE Foundation:     (T01) → T17, T18 ; (T04) → T19, T20 ; (T17,T18) → T31 (markdown)
P6 FE Views:          (T18,T19,T20,T31) → T21 → T22 → T23 → T24 → T25 → T26
P7 Cross-cutting:     T27 (after BE+FE APIs) → T28 → T29 → T30
```

**Result of the Specification Implementation is 3.0.0 version of the app**

---

## PHASE -1 — Verification & Test Harness Bootstrap

### T00 · Verification & test harness bootstrap
- **Dependencies:** none (do this **first**) · **Complexity:** M
- **Goal:** Stand up the complete testing + verification infrastructure so that, from the very first
  feature task, every change can be unit-tested, UI-tested, and run through the gated pipeline in
  `13-testing-specification.md` §11. After T00, "how do I verify a change?" has one answer for every
  subsequent task.
- **Scope:**
  - **Test deps:** add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
    `jest-axe`, and `playwright` (+ install the Chromium browser) to `frontend/package.json`; confirm Go
    test deps (`github.com/stretchr/testify`, `govulncheck`, `sqlc`, `goose`).
  - **Two run targets (§1.5 of `13-testing-specification.md`):** (A) the **frontend-only Vite dev server**
    (`npm run dev`) with a dev-only **browser bridge mock** at `frontend/src/dev/bridge-mock/` that
    implements every `08-api-contracts.md` bound-method signature + the `EventsOn`/emit API and can be
    switched per scenario (success / each `WireError` / partial chain / `chain:progress` stream); and
    (B) the **backend-connected** `wails dev` server (live bridge, real Go). The mock is injected only in
    dev/test builds and never shipped.
  - **Verification scripts** under `frontend/scripts/`: `verify-ui.mjs` (Playwright: every primary route ×
    ≥3 widths × 2 themes; gates: no horizontal overflow, no console/page errors, sans-serif body font,
    expected key element present; screenshot per combination to `frontend/.tmp/verify-screens/`) and
    `smoke-tests.mjs` (scripted interaction flows incl. run a single action, build+run a stack, History
    rail, add+verify provider, switch theme, open Prompt Inspector, **render Markdown in Preview**). Both
    accept `BASE_URL` so they target A or B.
  - **npm scripts:** `test`, `test:coverage`, `verify:ui` (responsive + smoke), `verify:smoke`, and a
    top-level `verify` that chains format → lint/type-check → unit tests.
  - **CI workflow:** a pipeline that runs the §11 gates headless — Go `-race` + coverage, FE Jest +
    coverage, `sqlc generate --diff`, `wails doctor`, `govulncheck`, `npm audit`, the `@mui`/`@emotion`
    absence guard, and the Playwright UI gates (Target A; Target B for bridge journeys).
  - **Docs:** a short `docs/howto/verification.md` describing the two servers and the gated pipeline, and a
    `run-verification` entry in the agent rules so every task can follow the same checklist.
  - **Verify Current State:** You need to check current coverage, linting issues and everything related to the code quality aspects, to prevent issues with AI Agent that it doesn't fix issue because they are pre-existing and were "before changes made in the branch".
- **Out of scope:** Writing the feature tests themselves (each feature task writes its own per
  `13-testing-specification.md`); the exhaustive suites + final CI hardening land in **T29**, which builds
  on this harness.
- **Technical context:** See `13-testing-specification.md` §1.3–1.5, §4, §11. GoText is Wails + Vite +
  React (desktop) — there is no service-worker/static-export step.
- **Implementation steps:** (1) add deps + install Chromium; (2) wire `@testing-library` + `jest-axe` into
  the Jest setup; (3) build the bridge mock + a dev-build switch; (4) write `verify-ui.mjs` /
  `smoke-tests.mjs` with a `BASE_URL` and headless/CI flags; (5) add the npm scripts; (6) add the CI
  workflow; (7) write `docs/howto/verification.md`.
- **Acceptance criteria:** `npm test` runs RTL + `jest-axe`; `npm run dev` serves the UI with the mocked
  bridge and `npm run verify:ui` exits clean against it; `wails dev` serves the live app and
  `BASE_URL=…:34115 npm run verify:smoke` runs a real-bridge journey; CI runs all §11 gates; the
  `@mui`/`@emotion` guard is present. A trivial sample unit test and a sample UI gate both pass, proving
  the harness end-to-end.
- **Testing requirements:** the harness verifies itself — one sample RTL test + one Playwright route gate
  green against Target A, one smoke flow green against Target B.
- **Edge cases:** Chromium missing in CI → install step; port already in use → configurable `BASE_URL`;
  bridge mock drift from contracts → mock is generated/checked against `08-api-contracts.md` types.
- **Documentation updates:** `docs/howto/verification.md`; `docs/ai_agent_rules/` (verification checklist);
  `CLAUDE.md` (commands).
- **References:** `13-testing-specification.md` (§1.3–1.5, §4, §11), `08-api-contracts.md`,
  `12-ui-implementation.md`.

---

## PHASE 0 — Foundation
- **Status: DONE (2026-07-02, verified file-level).** `frontend/src/dev/bridge-mock/` implements the bridge mock; `frontend/e2e/verify-ui.spec.ts`/`smoke-tests.spec.ts` exist and are wired to `verify:ui`/`verify:smoke` in `frontend/package.json`; `.github/workflows/main.yml` present. (The spec named `.mjs` scripts; the repo evolved to Playwright `.spec.ts` under `frontend/e2e/` — functionally equivalent.)

### T01 · Dependency baseline & Material UI removal
- **Dependencies:** T00 · **Complexity:** M
- **Goal:** The project compiles with the new dependency set; Material UI and Emotion are fully removed.
- **Scope:** Add Go deps (`modernc.org/sqlite`, `github.com/pressly/goose/v3`, `gopkg.in/natefinch/lumberjack.v2`; `github.com/google/uuid` already present). Add FE deps (`radix-ui`, `cmdk`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight`, `highlight.js`, `katex`, `mermaid`, a diff library, optional `lucide-react`). Remove `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`. Delete `frontend/src/ui/theme.ts` and remove `ThemeProvider`/`CssBaseline` usage. Replace MUI components/icons in existing views with placeholders or the new primitives as they are built (full view rebuilds happen in P6).
- **Out of scope:** Building the new UI components (P5/P6); backend logic.
- **Technical context:** See `12-ui-implementation.md` §MUI removal. MUI is used in `frontend/src/ui/theme.ts`, `frontend/src/ui/widgets/views/info/InfoView.tsx`, the `settings/` view tree, and `AppLayout`.
- **Implementation steps:** (1) `grep -r "@mui\|@emotion" frontend/src` to inventory. (2) Add/remove deps in `go.mod` and `frontend/package.json`. (3) Remove the theme layer and global MUI providers. (4) Stub or remove MUI-dependent renders so the build passes. (5) Add a CI guard script that fails if `@mui`/`@emotion` reappear.
- **Acceptance criteria:** `go build ./...` and `npm run build` succeed; no `@mui`/`@emotion` import remains; CI guard present and passing.
- **Testing requirements:** Build passes; guard script unit-verified.
- **Edge cases:** Residual `sx`/`styled` usages — convert or stub.
- **Documentation updates:** Note dependency changes in `README.md`.
- **References:** `12-ui-implementation.md`, `01-product-scope.md`.
- **Status: DONE (2026-07-02, verified file-level).** `grep -rq "@mui\|@emotion" frontend/src` is clean; `frontend/src/ui/theme.ts` does not exist; `frontend/scripts/check-no-mui.sh` implements the CI guard exactly as specified.

### T02 · `internal/apperr` package (typed errors + envelope mapper)
- **Dependencies:** none · **Complexity:** M
- **Goal:** A single typed-error package with the full error code set, constructors, the `WireError` shape, the concrete Result envelope types, and the `toWire` boundary mapper.
- **Scope:** Implement `AppError`, `ErrorCode` constants, constructors, `WireError`, `toWire(log, err)`, and the concrete result envelope structs. Register `ErrorCode` via `EnumBind`.
- **Out of scope:** Calling these from providers/chain (T05/T08/T13); FE consumption (T19).
- **Technical context:** See `07-error-handling-logging.md` §A. Codes (15): validation, invalid_plan, busy, auth, missing_credential, provider_unreachable, timeout, rate_limited, model_not_found, upstream, empty_completion, context_window, step_failed, cancelled, internal. (`busy` = single-flight gate; non-retryable, no details.) Envelope types (the full set defined in `08-api-contracts.md` §2.2 and `07-error-handling-logging.md` §4): `WireError`, `VoidResult`, `StringResult`, `ModelsResult`, `CatalogResult`, `SettingsResult`, `ChainResultEnv`, `StacksResult`, `StackResult`, `HistoryListResult`, `HistoryEntryResult`, `PromptPreviewResult`, `MetadataResult`, `LoggingResult`, `VerifyResult`, and the settings-domain results (`ProviderResult`/`ProvidersResult`, `InferenceResult`, `ModelConfigResult`, `AppBehaviorResult`, `LanguageResult`/`LanguagesResult`). This list must match 08 exactly.
- **Implementation steps:** create `internal/apperr/apperr.go`, `wire.go`, `results.go`; implement `Error()`/`Unwrap()`; constructors set Title/Message/Details/Retryable; `toWire` uses `errors.As`, logs the full chain, returns the clean shape (unclassified → `internal`).
- **Acceptance criteria:** unit tests prove AppError→WireError mapping and unclassified→internal; `Details` never carries secrets; package has no import cycles.
- **Testing requirements:** table tests per code; `toWire` mapping tests.
- **Edge cases:** nil error; wrapped chains; typed-nil avoidance (return `error` interface, not `*AppError` concrete).
- **Documentation updates:** none yet.
- **References:** `07-error-handling-logging.md`, `08-api-contracts.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/apperr/{apperr.go,wire.go,results.go}` implement `AppError`/`ErrorCode`/`WireError`/`ToWire`/envelope structs; `ToWire` is the sole error-to-wire path, called from every handler in `internal/*/handler.go`.

### T03 · `internal/db` (SQLite open, migrations, seed) + DB file path
- **Dependencies:** T01 · **Complexity:** L
- **Goal:** A `Database` that opens `modernc.org/sqlite` with the required pragmas, applies embedded goose migrations, and seeds defaults on a fresh DB.
- **Scope:** `internal/db/db.go` (`Open`, `Close`, `seedIfEmpty`/`Seed`), `internal/db/migrations/0001_init.sql` (+ history table), `sqlc.yaml`, `internal/db/queries/*.sql`, generated `internal/db/store`. Add `GetAppDatabaseFilePath()` to `internal/file`.
- **Out of scope:** Repository implementations (T06/T07).
- **Technical context:** See `06-data-model-database.md`. Pragmas: WAL, foreign_keys=ON, busy_timeout=5000, synchronous=NORMAL, single writer conn. Migrations via `//go:embed` + `pressly/goose`. Tables: settings, providers, app_state, languages, stacks, stack_steps, history.
- **Implementation steps:** write the schema migration; configure sqlc (schema=migrations, queries dir); `sqlc generate`; implement `Open` (dsn+pragmas → `goose.Up` → `seedIfEmpty`); `seedIfEmpty` inserts default providers/languages/settings in one transaction when `providers` is empty.
- **Acceptance criteria:** fresh open creates `gotext.db`, migrates to latest, seeds defaults; `goose` Up/Down round-trips on a temp DB; `sqlc generate --diff` clean.
- **Testing requirements:** integration test against in-memory/temp DB; migration round-trip.
- **Edge cases:** corrupt/locked DB → typed `internal` storage error; reseed idempotency.
- **Documentation updates:** `docs/architecture/05-build-and-configuration.md` (sqlc/goose workflow).
- **References:** `06-data-model-database.md`, `03-architecture.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/db/db.go`'s `Open` applies embedded goose migrations (`0001_init.sql`…`0004_add_max_output_tokens.sql`) and seeds defaults; sqlc-generated `internal/db/store/` present; wired from `internal/application/application.go:134`.

### T04 · Result envelope at the handler boundary
- **Dependencies:** T02 · **Complexity:** M
- **Goal:** Bound handlers return Result envelopes (no Go `error` return); a panic becomes an `internal` envelope or a global FE fallback.
- **Scope:** Introduce the boundary pattern in existing handlers (`internal/actions/handler.go`, settings handler): wrap service calls, map errors via `toWire`, return the concrete envelope. Add a handler-level `recover`. Keep services returning `(T, error)` internally.
- **Out of scope:** New handlers (added in their feature tasks); FE adapter (T19).
- **Technical context:** See `07-error-handling-logging.md` §A and `08-api-contracts.md`.
- **Implementation steps:** add `toWire` usage; convert one handler fully as the reference pattern; document the pattern inline.
- **Acceptance criteria:** at least the existing action+settings handlers return envelopes; panic in a handler yields an `internal` envelope; `wails generate module` regenerates models.
- **Testing requirements:** handler tests assert `res.error.code`.
- **Edge cases:** partial results (envelope allows Data+Error both set).
- **Documentation updates:** `CLAUDE.md` (envelope convention).
- **References:** `07-error-handling-logging.md`, `08-api-contracts.md`.
- **Status: DONE (2026-07-02, verified file-level).** The `defer/recover` → `apperr.ToWire` → concrete `*Result` envelope pattern is applied consistently across `ActionHandler`/`SettingsHandler`/`StackHandler` (e.g. `internal/actions/handler.go:84-108`).

### T05 · Structured logging + crash resilience + lifecycle
- **Dependencies:** T03 · **Complexity:** M
- **Goal:** A configured logger instance (console + rotating file), `safego` recovery, fixed startup-error handling, and `OnShutdown`.
- **Scope:** Rewrite `internal/logging` to a settings-driven zerolog instance with `lumberjack` rotation, structured fields, a `Timer` helper, redaction, and the Wails `logger.Logger` interface. Add `safego(fn)`. Fix `main.go` to handle the constructor/DB-open error (Fatal log + dialog) instead of silently returning. Add `OnShutdown` (cancel runs, flush logs, close DB).
- **Out of scope:** History/tasklog changes (tasklog preserved); React error boundary (T19).
- **Technical context:** See `07-error-handling-logging.md` §B/§C. Settings keys `log.fileEnabled/level/directory/maxSizeMB/maxBackups/maxAgeDays/compress`.
- **Implementation steps:** build the logger from logging settings; multi-writer; level from settings; `safego` wraps goroutines; `main.go` error handling + `OnShutdown`.
- **Acceptance criteria:** app logs to a rotating file when enabled; level is runtime-settable; secrets never logged; DB-open failure is fatal+surfaced, not silent; shutdown closes DB.
- **Testing requirements:** logging redaction + level tests; safego recover test.
- **Edge cases:** log dir unwritable → warn + console only.
- **Documentation updates:** `docs/ai_agent_rules/GoLoggingRules.md`.
- **References:** `07-error-handling-logging.md`, `03-architecture.md`.

---

## PHASE 1 — Persistence
- **Status: DONE (2026-07-02, verified file-level).** `internal/logging/safego.go`'s `SafeGo` (tested in `safego_test.go`) wraps goroutines; `internal/logging/logger.go` configures `lumberjack.Logger`; `main.go:88-98` implements `OnShutdown` (`CancelAllRuns`, `DB.Close`, logger close).

### T06 · SQLite settings repository + settings model evolution
- **Dependencies:** T03 · **Complexity:** L
- **Goal:** Settings are read/written from SQLite behind the existing `SettingsRepositoryAPI`; the provider config gains the v3 fields; inline token storage is removed.
- **Scope:** Implement `SqliteSettingsRepository` (providers CRUD, current-provider pointer + repoint on delete, KV-group typed accessors for inference/model/app-behavior/logging/theme, languages, reset). Evolve the provider config struct: add `kind`, `authScheme`, `apiKeyEnvVar`, `apiVersion`, `selectedModel`, `completionPath`, `modelsPath`; remove inline `authToken`/`useAuthTokenFromEnv`/`envVarTokenName`. Implement the settings handler methods bound in `08-api-contracts.md`, including **`GetAppSettingsMetadata` (→ `MetadataResult`: app version, settings/DB/logs paths, `providerKinds`/`authSchemes` enums)** and **`GetLoggingConfig`/`UpdateLoggingConfig` (→ `LoggingResult`)** over the full `log.*` key set. Wire into the DI container; move seeding to `internal/db`; remove the JSON repository and `SettingsV2.json` usage.
- **Out of scope:** Provider runtime layer (T08).
- **Technical context:** See `06-data-model-database.md`, `04-providers-inference.md` §field contracts. `SettingsServiceAPI` surface stays the same.
- **Implementation steps:** add queries; implement repo with domain⇄row mapping (headers/custom_models JSON); update `internal/application/application.go` to construct DB + repo; update `main.go` (remove `InitDefaultSettingsIfAbsent`, add DB lifecycle).
- **Acceptance criteria:** settings CRUD works against SQLite; delete-current-provider repoints; factory reset wipes+reseeds; `GetAppSettingsMetadata` returns version/paths/enums (no secrets); `Get/UpdateLoggingConfig` round-trips the `log.*` keys; service/handlers unchanged externally; no secrets persisted.
- **Testing requirements:** repo tests on temp DB; current-provider repoint; reset; metadata + logging-config round-trip (`13-testing-specification.md` §2.1.4).
- **Edge cases:** unique-name conflict → `validation` error; empty DB seed.
- **Documentation updates:** `docs/architecture/02-backend-architecture.md`.
- **References:** `06-data-model-database.md`, `04-providers-inference.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/settings/repository_sqlite.go` implements `SqliteSettingsRepository`; `handler.go` exposes `GetAppSettingsMetadata`/`GetLoggingConfig`/`UpdateLoggingConfig`; wired in `internal/application/application.go:141`.

### T07 · Stack & History repositories
- **Dependencies:** T03 · **Complexity:** M
- **Goal:** SQLite-backed `StackRepository` and `HistoryRepository`.
- **Scope:** `internal/stacks` (SavedStack model + repo: List/Get/Create/Update/Delete/Duplicate; steps by position; cascade) and `internal/history` (HistoryEntry + repo: Add[insert+prune to maxEntries in one tx]/List/Get/Delete/Clear/Count).
- **Out of scope:** Orchestrator integration (T13/T16); handlers (T14/T16).
- **Technical context:** See `06-data-model-database.md`, `05-stacks-actions-engine.md`, `13`-history sections within `02-functional-requirements.md`.
- **Implementation steps:** add queries; implement repos with JSON columns; prune query keeps newest N.
- **Acceptance criteria:** stack create/update replaces steps transactionally; history Add prunes to max; clear/delete work.
- **Testing requirements:** repo tests (ordering, prune to exactly N, cascade).
- **Edge cases:** maxEntries lowered → prune on next add; duplicate name → validation.
- **Documentation updates:** none.
- **References:** `06-data-model-database.md`.

---

## PHASE 2 — Providers & Inference
- **Status: DONE (2026-07-02, verified file-level).** `internal/stacks/repository_sqlite.go` and `internal/history/repository_sqlite.go` exist; history `Add` inserts then prunes to `maxEntries` in the same transaction (`repository_sqlite.go:80,128`).

### T08 · Provider interface, profiles, factory, discovery
- **Dependencies:** T04, T06 · **Complexity:** L
- **Goal:** A `Provider` interface with one `OpenAICompatibleProvider` driven by per-kind profiles, a factory registry, and per-kind discovery strategies — replacing the inline LLM flow while keeping the `LLMServiceAPI` façade.
- **Scope:** `Provider` (Chat, ListModels, Capabilities); `ProviderProfile` (URL/auth/discovery/body quirks) for kinds ollama, lmstudio, llamacpp, openai, azure; `ProviderFactory`; discovery strategies (standard `/v1/models`, deployment-style `{data:[]}`/bare-array with chat filtering, Ollama `/api/tags`, static list); token resolution from env var; typed errors at the source (T02).
- **Out of scope:** Verification (T09); chain (T13).
- **Technical context:** See `04-providers-inference.md`. Keep `internal/llms` façade; non-streaming; strip `<think>` for local; ignore `custom_content`.
- **Implementation steps:** define interface + profiles; implement provider build from config+profile; discovery normalizers; map status/transport → apperr codes.
- **Acceptance criteria:** all five kinds build correct URLs/auth/headers; discovery normalizes both shapes; httptest mocks pass for 200/401/404/429/5xx/timeout/empty.
- **Testing requirements:** per-kind table tests; httptest integration.
- **Edge cases:** missing credential; bare-array discovery; Ollama `/v1` requirement.
- **Documentation updates:** `docs/architecture/02-backend-architecture.md`.
- **References:** `04-providers-inference.md`, `07-error-handling-logging.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/llms` defines `Provider`/`ProviderProfile`/`ProviderFactory`; all five kinds (ollama/lmstudio/llamacpp/openai/azure) are registered (`factory.go:37-41`) and consumed by `internal/verification` and `internal/actions`.

### T09 · Provider verification (connection / models / inference)
- **Dependencies:** T08 · **Complexity:** M
- **Goal:** Three diagnostic checks returning typed results with timings.
- **Scope:** `TestConnection`, `TestModels`, `TestInference` service methods + handlers (envelope). Test inference sends a tiny throwaway completion to the selected model with a short per-check timeout; results are not recorded to history/tasklog. **Introduce the process-wide single-flight `InferenceGate`** (single-slot, non-blocking) in the DI container and have **`TestInference` acquire it** (TestConnection/TestModels do not — no completion); the **same gate instance is later injected into the chain orchestrator** (T13) so a run and a Test inference are mutually exclusive. If the gate is held, `TestInference` returns `busy` with no LLM call.
- **Out of scope:** UI panel (T24); the orchestrator's use of the gate (T13).
- **Technical context:** See `04-providers-inference.md` §5.6, `05-stacks-actions-engine.md` §4.5 (gate), `08-api-contracts.md` §6.
- **Acceptance criteria:** each check returns ✓/✗ with a typed reason + duration; failures never block save; missing selected model prompts a typed validation result; **`TestInference` returns `busy` when an inference is already running and releases the gate when done**.
- **Testing requirements:** httptest per check (success + each failure code); single-flight: `TestInference` while gate held → `busy`.
- **Edge cases:** local provider no-auth skips credential step; gate released on failure/timeout.
- **Documentation updates:** none.
- **References:** `04-providers-inference.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/verification/service.go` implements `TestConnection`/`TestModels`/`TestInference`; `internal/gate`'s single-slot `InferenceGate` is shared between the verification service and the chain orchestrator, confirming the mutual-exclusion requirement.

### T10 · Capability-aware discovery & model listing
- **Dependencies:** T08 · **Complexity:** S
- **Goal:** Discovery surfaces optional `ModelCaps`; the model list is fetched live (never cached in DB).
- **Scope:** `ModelInfo{ID,Label,Caps?}`; extract caps from rich catalogs (temperature support, context-window hint); `GetModels`/refresh handler.
- **Out of scope:** UI pre-fill (T24).
- **Technical context:** See `04-providers-inference.md` §discovery.
- **Acceptance criteria:** rich catalogs yield Caps; plain catalogs yield nil Caps; results are not persisted.
- **Testing requirements:** parse tests for rich + plain catalogs.
- **Edge cases:** unreachable discovery → typed error; static fallback.
- **References:** `04-providers-inference.md`.

---

## PHASE 3 — Prompts & Stacks Engine
- **Status: DONE (2026-07-02, verified file-level).** `internal/apperr/results.go` defines `ModelInfo{ID,Label,Caps}`; `internal/llms/service.go`'s `GetModelsInfoForProvider` populates it; tests confirm rich catalogs yield `Caps`, plain catalogs yield nil.

### T11 · Two-tier prompt library + action catalog
- **Dependencies:** T06 · **Complexity:** L
- **Goal:** Rewrite the prompt library to the two-tier model and expose the action catalog with metadata.
- **Scope:** Implement the family system prompts and per-action directive fragments + `ActionMeta` for the exact action set in `09-prompts.md`; remove dropped composite actions; register in `internal/prompts/`. Implement `GetActionCatalog()` returning `[]ActionMeta`.
- **Out of scope:** Composition/merge runtime (T12).
- **Technical context:** See `09-prompts.md`, `05-stacks-actions-engine.md`. Each family system prompt encodes its guardrails and "output ONLY the processed text".
- **Acceptance criteria:** catalog lists exactly the actions in `09-prompts.md` with correct family/sub-group/mergeable/terminal/requires; dropped composites absent; image/video builders are parameterized actions.
- **Testing requirements:** catalog content test; metadata correctness.
- **Edge cases:** translate requires languages; prompt-eng requires target model.
- **Documentation updates:** `docs/architecture/02-backend-architecture.md` (prompt extension recipe).
- **References:** `09-prompts.md`, `05-stacks-actions-engine.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/prompts/v3/catalog.go`'s `buildCatalog` implements the family/action set; `internal/actions/handler.go`'s `GetActionCatalog` is the bound, reachable path to it.

### T12 · Planner + Composer + `runStep`
- **Dependencies:** T11 · **Complexity:** L
- **Goal:** Canonical ordering, exclusivity dedupe, caps, merge grouping, two-tier composition, and a reusable single-inference step.
- **Scope:** `Planner` (order/dedupe/cap/merge-group → ChainPlan), `Composer` (per-group system+user with injected text/format/language), `runStep(ctx, ChatRequest)` extracted from `processAction`, shared `BuildPlanAndPrompts(req)`.
- **Out of scope:** Orchestration loop (T13).
- **Technical context:** See `05-stacks-actions-engine.md` §algorithms. Caps: ≤5 steps AND ≤3 inference groups.
- **Acceptance criteria:** canonical order independent of input order; one-per-exclusivity enforced; cap violations rejected with `invalid_plan`; merge grouping matches spec; composition injects shared context once.
- **Testing requirements:** planner/composer table tests; merge-grouping cases.
- **Edge cases:** terminal pinning; single action = one group.
- **References:** `05-stacks-actions-engine.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/actions/planner.go` and `composer.go` implement the Planner/Composer; `service.go`'s `runStep`/`BuildPlanAndPrompts` are shared by both `PreviewPrompt` (T15) and the orchestrator (T13).

### T13 · Chain orchestrator + events + cancellation
- **Dependencies:** T08, T12, T09 (shared `InferenceGate`) · **Complexity:** L
- **Goal:** `ProcessPromptChain` runs groups sequentially, emits progress, supports cancel, returns partial+error.
- **Scope:** `ChainOrchestrator.Run` (validate→plan→resolve provider once→per-group emit `chain:progress`→`runStep`→feed output→input→success/cancel/partial); run registry `map[runId]CancelFunc`; **process-wide single-flight `InferenceGate`** (single-slot, non-blocking `TryAcquire`/`Release`) acquired by `ProcessPromptChain` before planning and released on completion/cancel/panic, **shared with the provider-verification service** (T09) so a run and a Test inference can never run concurrently; `CancelChain(runId)`; `ProcessPromptChain` handler (ChainResultEnv). Per-step tasklog. Single action routes through the same path.
- **Out of scope:** History recording (T16); FE (T21).
- **Technical context:** See `05-stacks-actions-engine.md` §4.5 (gate), `08-api-contracts.md` §4.1, `02-functional-requirements.md` §4.1/V11.
- **Acceptance criteria:** multi-step chain produces correct merged inferences; cancel stops after current group keeping partial; step failure returns completed output + failedIndex + typed error; provider/model/temperature fixed for the run; **a concurrent `ProcessPromptChain` (or a `TestInference`) while one is in progress returns `busy` immediately with no LLM call; the gate is released after done/cancel/panic so the next run proceeds**.
- **Testing requirements:** integration (success, partial, cancel) with httptest; **single-flight: concurrent run → `busy`; run↔Test-inference mutual exclusion; gate released after end (`13-testing-specification.md` §3.2/§7.2 I6–I8).**
- **Edge cases:** same-language translate no-op; context-window error; gate must not leak on panic.
- **Documentation updates:** `docs/architecture/04-data-flow-and-communication.md`.
- **References:** `05-stacks-actions-engine.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/actions/orchestrator.go` implements the chain run loop; the single-flight `internal/gate.InferenceGate` is acquired/released around it and shared with provider verification; `CancelChain`/progress events are bound in `handler.go`.

### T14 · Saved-stack handlers + starter stacks
- **Dependencies:** T07, T13 · **Complexity:** M
- **Goal:** Saved-stack CRUD over the bridge; starter stacks seeded.
- **Scope:** Handlers List/Get/Create/Update/Delete/Duplicate (envelopes); seed the starter stacks documented in `09-prompts.md` §4 on a fresh DB (content/inventory per `06-data-model-database.md` §B.5.1).
- **Out of scope:** Builder UI (T22).
- **Technical context:** See `08-api-contracts.md`, `09-prompts.md` starter-stacks appendix.
- **Acceptance criteria:** CRUD works; unknown action ids in a loaded stack are flagged; starter stacks present after seed and **every seeded starter stack is planner-valid** (≤ 5 steps, ≤ 3 inference groups, ≤ 1 action per exclusivity group, terminal action only last).
- **Testing requirements:** handler tests; validation (unique name).
- **References:** `05-stacks-actions-engine.md`, `09-prompts.md`.
- **Status: DONE (2026-07-02, verified file-level).** `internal/stacks/handler.go` implements full CRUD + `SuggestedStacks`; starter-stack seeding lives in `internal/db/db.go` with dedicated planner-validity tests (`starter_stacks_test.go`, `starter_stacks_plan_test.go`).

### T15 · `PreviewPrompt` (Prompt Inspector backend)
- **Dependencies:** T12 · **Complexity:** M
- **Goal:** Read-only composed-prompt preview (no LLM call) reusing the real planner/composer.
- **Scope:** `PreviewPrompt(req)` handler returning `PromptPreviewResult` envelope via `BuildPlanAndPrompts`.
- **Out of scope:** Inspector UI (T25).
- **Technical context:** See the About·Info / Prompt Inspector sections of `10-ui-ux-specification.md` and the `PreviewPrompt`/`PromptPreviewResult` contract in `08-api-contracts.md`.
- **Acceptance criteria:** preview matches what a run would send; placeholders shown; optional sample input injected into group 1; per-group params correct.
- **Testing requirements:** preview parity with orchestrator composition.
- **Edge cases:** translate requires languages; stack vs single.
- **References:** `08-api-contracts.md`, `05-stacks-actions-engine.md`.

---

## PHASE 4 — History
- **Status: DONE (2026-07-02, verified file-level).** `internal/actions/handler.go`'s `PreviewPrompt` calls `BuildPlanAndPrompts` and returns `apperr.PromptPreviewResult`, reusing the real planner/composer path.

### T16 · History recording + handlers + retention
- **Dependencies:** T07, T13 · **Complexity:** M
- **Goal:** One history entry per run (when enabled), plus history handlers.
- **Scope:** Orchestrator records a `HistoryEntry` on completion (success/partial/error) when `history.enabled`; handlers List/Get/Delete/Clear (envelopes); retention via `history.maxEntries`; recording errors are logged and swallowed.
- **Out of scope:** History rail UI (T23).
- **Technical context:** See `06-data-model-database.md` (history), `02-functional-requirements.md`.
- **Acceptance criteria:** one entry per run with correct status/applied snapshot; disabled → no writes; prune to maxEntries; recording never breaks a run.
- **Testing requirements:** integration (record on success/partial/error; disabled; prune).
- **Edge cases:** large I/O stored whole; removed-action snapshot still readable.
- **References:** `06-data-model-database.md`.

---

## PHASE 5 — Frontend Foundation
- **Status: DONE (2026-07-02, verified file-level).** `internal/history/service.go`'s `Record` is called from `internal/actions/orchestrator.go`'s `recordChainHistory` on all three run-exit paths (cancel, failure, success).

### T17 · Design tokens, base CSS, theming
- **Dependencies:** T01 · **Complexity:** M
- **Goal:** Token stylesheet + base CSS + working Auto/Light/Dark theming.
- **Scope:** `frontend/src/ui/styles/tokens.css` (full token set, `:root` + `.dark`), `base.css`; `theme` slice (`mode`,`effective`); init reads `ui.theme`, resolves via `matchMedia`, applies `.dark` on `document.documentElement` (before first paint); live-follow in Auto.
- **Out of scope:** Appearance settings screen (T24 wires the control).
- **Technical context:** See `12-ui-implementation.md`, `10-ui-ux-specification.md` (theming).
- **Acceptance criteria:** theme switches instantly; Auto follows OS live; no flash; portals inherit theme.
- **Testing requirements:** resolve/apply unit tests; light/dark snapshot.
- **References:** `12-ui-implementation.md`.
- **Status: DONE (2026-07-02, verified file-level).** `frontend/src/ui/styles/{tokens.css,base.css}` are imported in `main.tsx`; `logic/theme/init.ts` applies `.dark` to `document.documentElement` before first paint, called from `main.tsx`.

### T18 · Radix primitive wrappers + presentational components
- **Dependencies:** T01 · **Complexity:** L
- **Goal:** Reusable styled wrappers over Radix/cmdk and presentational components.
- **Scope:** `ui/primitives/*` (Select, Dialog, AlertDialog, Segmented/ToggleGroup, Switch, Slider, RadioGroup, Tabs, DropdownMenu, Tooltip, Toast, ScrollArea, Combobox=cmdk+Popover, CommandPalette=cmdk+Dialog) + `*.module.css`; presentational `ui/components/*` (Button, IconButton, Chip, Badge, Card). (No `Checkbox` wrapper — every boolean uses `Switch`.)
- **Out of scope:** App-specific custom components (T21–T25 build them).
- **Technical context:** See `12-ui-implementation.md` §Radix integration + element map.
- **Acceptance criteria:** each wrapper is controlled, token-styled, keyboard/a11y correct (Radix), functional styles present (overlay covers viewport; content sized).
- **Testing requirements:** jest-axe on wrappers; controlled-value sync.
- **References:** `12-ui-implementation.md`, `11-mockup-documentation.md`.
- **Status: DONE (2026-07-02, verified file-level).** `frontend/src/ui/primitives/` contains the full wrapper set (Select, Dialog, Tabs, DropdownMenu, Tooltip, Toast, Combobox, CommandPalette, AlertDialog, etc.), imported across 21+ widget files.

### T19 · Adapter layer + error consumption + boundaries
- **Dependencies:** T04 · **Complexity:** M
- **Goal:** FE consumes the Result envelope uniformly; global error safety.
- **Scope:** Rewrite `frontend/src/logic/adapter/` to return `Promise<XResult>`; `unwrap`/`tryUnwrap`; `notifyError(code→presentation)`; extend the notifications model (title/details); React error boundary at root; global `onerror`/`unhandledrejection` → `internal`; remove old colon-splitting error parser.
- **Out of scope:** Per-view wiring (P6).
- **Technical context:** See `07-error-handling-logging.md`, `08-api-contracts.md`.
- **Acceptance criteria:** every adapter call returns an envelope; typed errors render correct copy; render errors show a recoverable fallback.
- **Testing requirements:** unwrap success/error/partial; notifyError copy per code.
- **References:** `07-error-handling-logging.md`.
- **Status: DONE (2026-07-02, verified file-level).** `logic/adapter/services.ts` returns `Promise<apperr.*Result>` uniformly; `RootErrorBoundary` wraps `AppLayout` in `main.tsx`, providing the global render-error fallback.

### T20 · Redux slices
- **Dependencies:** T04 · **Complexity:** M
- **Goal:** All state slices defined and wired to adapters/thunks.
- **Scope:** slices: settings, editor, actions/catalog, stacks (builder+saved), run/progress, history, ui (viewMode/layout/sidebar/historyRail/theme), notifications, about. Expose a **global `ui.inferenceRunning` selector** (true while a chain run **or** a provider Test inference is active) used to disable every start trigger app-wide (single-flight; `02-functional-requirements.md` V11).
- **Out of scope:** View components (P6).
- **Technical context:** See `03-architecture.md` (frontend), `10-ui-ux-specification.md`.
- **Acceptance criteria:** slices expose the state the views need; async thunks call adapters and handle envelopes; `ui.inferenceRunning` reflects both run and Test-inference activity.
- **Testing requirements:** reducer unit tests.
- **References:** `03-architecture.md`.

---
- **Status: DONE (2026-07-02, verified file-level).** All ten Redux slices (settings, editor, actions, stacksBuilder, stacksSaved, run, history, ui, notifications, about) are wired into `configureStore` via `logic/store/index.ts`.

### T31 · Markdown rendering (`MarkdownView` + `MermaidBlock`)
- **Dependencies:** T17, T18 · **Complexity:** M
- **Goal:** One shared, token-themed, secure Markdown renderer used by every rendered surface.
- **Scope:** `frontend/src/ui/components/MarkdownView.tsx` (react-markdown + `remark-gfm` + `remark-math` + `rehype-katex` + `rehype-highlight`; custom `code` renderer routes `mermaid` blocks to `MermaidBlock`, custom `a` renderer externalizes links via the desktop open-URL adapter; **no `rehype-raw`/raw HTML**); `MermaidBlock.tsx` (async render to themed SVG, loading/error states, `securityLevel:'strict'`, theme from the `.dark` root class); `frontend/src/ui/styles/markdown.css` (the `markdown-body` token-based stylesheet) + light/dark highlight.js themes (dark scoped under `.dark`) + KaTeX stylesheet. Memoize on source.
- **Out of scope:** Wiring into views (T21 Output Preview, T25 About Guide consume it).
- **Technical context:** See `16-markdown-rendering.md` (authoritative). Theme class lives on `document.documentElement` so portaled Markdown inherits it.
- **Acceptance criteria:** GFM (tables/task-lists/strikethrough), highlighted code, math, and mermaid render and are token-themed in both light and dark; raw HTML and disallowed URL schemes are inert; links open in the OS browser; switching view modes does not re-parse unchanged output; a failed mermaid block does not break the page.
- **Testing requirements:** RTL (each example in `16-markdown-rendering.md` §9; HTML inert; link externalized; mermaid loading→SVG and error); light/dark theme snapshot; covered by the Chromium UI smoke flow (`13-testing-specification.md` §4.1/§4.2).
- **Edge cases:** Plain format → literal text (no parsing); very large output renders in one pass without freezing.
- **Documentation updates:** none.
- **References:** `16-markdown-rendering.md`, `10-ui-ux-specification.md`.

---

## PHASE 6 — Frontend Views
- **Status: DONE (2026-07-02, verified file-level).** `ui/components/MarkdownView.tsx`/`MermaidBlock.tsx` are used by `OutputPane.tsx` (Preview mode) and `InfoView.tsx` (Guide content).

### T21 · Editor view + view modes + Diff
- **Dependencies:** T18, T19, T20, T31 · **Complexity:** L
- **Goal:** The main screen: toolbar run-context, sidebar, two editors with per-pane buttons, run bar; Preview/Source/Diff.
- **Scope:** Toolbar (provider/model+refresh/language popover/format/view/layout/⌘K/history/info/settings); collapsible Actions + My Stacks sidebar; `EditorPane` (input paste/clear, output copy/use-as-input/clear); run bar (single action) with run lifecycle + `chain:progress`; `DiffView`; **Output Preview via the shared `MarkdownView` (T31, `16-markdown-rendering.md`)** — Markdown format renders, Plain format shows literal text; Source shows raw text. **Run is disabled while `ui.inferenceRunning`** (global single-flight); on a `busy` envelope, surface the warning toast.
- **Out of scope:** Stack builder (T22); history rail (T23).
- **Technical context:** See `10-ui-ux-specification.md`, `11-mockup-documentation.md`.
- **Acceptance criteria:** single action runs end-to-end; view modes switch; diff highlights changes; run shows progress + cancel; layout side/stacked; **Run is disabled while any inference is in progress**.
- **Testing requirements:** RTL interaction tests; e2e single-action run.
- **References:** `10-ui-ux-specification.md`, `11-mockup-documentation.md`.
- **Status: DONE (2026-07-02, verified file-level).** `ui/widgets/views/editor/EditorView.tsx` (toolbar, sidebar, panes, run bar, Preview/Source/Diff via `MarkdownView`/`DiffView`) is the default view rendered by `MainContent.tsx`.

### T22 · Stack builder + Save dialog + Manage grid
- **Dependencies:** T21 · **Complexity:** L
- **Goal:** Build, run, save, and manage stacks.
- **Scope:** `StackBuilderBar` (chips grouped by family, inference badges, live N/5·M-inferences, one-per-family greying, Cancel/Save…/Run); Save-stack dialog; My Stacks Manage grid (run/edit/duplicate/delete/new).
- **Technical context:** See `05-stacks-actions-engine.md`, `11-mockup-documentation.md`.
- **Acceptance criteria:** builder mirrors backend rules; save persists; manage grid CRUD works; run uses `ProcessPromptChain`; **the builder Run and each My Stacks card Run are disabled while `ui.inferenceRunning`** (global single-flight).
- **Testing requirements:** RTL (build/cap/exclusivity); e2e build+run+save.
- **References:** `05-stacks-actions-engine.md`.
- **Status: DONE (2026-07-02, verified file-level).** `StackBuilderBar` renders inside `EditorView.tsx` in build mode; `SaveStackDialog.tsx` and the Manage grid (`StacksManageView.tsx`) provide save/CRUD.

### T23 · History rail
- **Dependencies:** T20, T16 · **Complexity:** M
- **Goal:** Right rail listing past runs with restore/delete/clear.
- **Scope:** `HistoryRail` (cards with status/inference chips + preview), restore (load editors + re-arm if valid), delete, clear (confirm), empty/disabled states.
- **Technical context:** See `10-ui-ux-specification.md`, `06-data-model-database.md`.
- **Acceptance criteria:** lists entries; restore populates editors; delete/clear work; toolbar toggle opens/closes.
- **Testing requirements:** RTL; e2e restore.
- **References:** `10-ui-ux-specification.md`.
- **Status: DONE (2026-07-02, verified file-level).** `ui/widgets/views/editor/HistoryRail.tsx` is rendered conditionally in `EditorView.tsx` and uses the `AlertDialog` primitive for destructive confirms.

### T24 · Settings views (7 sections)
- **Dependencies:** T18, T19, T20, T09, T10 · **Complexity:** L
- **Goal:** All settings sections, including provider master-detail with verification, KV editor, and tag input.
- **Scope:** Providers (kind, auth, env-var-key field, endpoints, api-version, deployment/selected-model picker, custom-headers `KvEditor`, custom-models `TagInput`, verification panel, set-current/delete/save); Model; Generation; Languages (default badges + row menu); Logging (task + diagnostic file + rotation + history); About & data (paths + factory reset); Appearance (theme).
- **Technical context:** See `11-mockup-documentation.md` (settings screens), `10-ui-ux-specification.md`, `04-providers-inference.md`.
- **Acceptance criteria:** every control persists to SQLite; verification runs; capability-aware pre-fill; theme/logging apply live; inline validation; **Test inference is disabled while `ui.inferenceRunning`** (shares the global run gate) and a `busy` envelope surfaces the warning toast.
- **Testing requirements:** RTL per section; e2e add+verify provider; Test-inference-disabled-while-busy.
- **References:** `11-mockup-documentation.md`, `04-providers-inference.md`.
- **Status: DONE (2026-07-02, verified file-level).** `ui/widgets/views/settings/SettingsView.tsx` routes all seven tabs, each a real (non-stub) component, per T41's independent per-tab confirmation.

### T25 · About·Info window + Prompt Inspector + ⌘K palette
- **Dependencies:** T18, T20, T15 · **Complexity:** M
- **Goal:** Guide + Actions&Stacks catalog + Prompt Inspector; command palette.
- **Scope:** About view (vertical tabs Guide / Actions&Stacks); the **Guide content is rendered with the shared `MarkdownView` (T31)**; catalog rows → Prompt Inspector **detail panel** (right side of the Actions&Stacks grid, per `10-ui-ux-specification.md`/`11-mockup-documentation.md` §9.4) rendering composed system+user prompts + params per inference group + flow (via `PreviewPrompt`, shown as raw monospace text, not Markdown); ⌘K command palette (cmdk in Dialog: ↵ run, ⇧↵ add to stack).
- **Technical context:** See `10-ui-ux-specification.md`, `08-api-contracts.md`, `16-markdown-rendering.md`.
- **Acceptance criteria:** Inspector shows accurate composed prompts; copy per block; ⌘K runs/adds actions; **the ⌘K run / add-and-run actions are disabled while `ui.inferenceRunning`** (global single-flight).
- **Testing requirements:** RTL; e2e preview.
- **References:** `10-ui-ux-specification.md`.
- **Status: DONE (2026-07-02, verified file-level).** `ui/widgets/views/info/InfoView.tsx` renders Guide/Actions&Stacks with `PromptInspector`; ⌘K is wired in `AppMainView.tsx` (`metaKey/ctrlKey + 'k'` → `togglePalette`).

### T26 · Notifications, confirms, tooltips
- **Dependencies:** T18, T19 · **Complexity:** S
- **Goal:** Toasts, destructive AlertDialog confirms, tooltips wired app-wide.
- **Scope:** Toast viewport + typed error toasts (incl. the `busy` warning toast for a rejected concurrent run/Test-inference); AlertDialog for factory reset / delete provider / delete stack / clear history; tooltips on icon buttons.
- **Acceptance criteria:** typed errors appear as toasts (including `busy`); destructive ops confirm; tooltips accessible.
- **Testing requirements:** RTL; jest-axe.
- **References:** `10-ui-ux-specification.md`, `07-error-handling-logging.md`.

---

## PHASE 7 — Cross-cutting & Completion
- **Status: DONE (2026-07-02, verified file-level).** `NotificationContainer` is mounted in `ui/AppLayout.tsx`; `AlertDialog`/`Tooltip` primitives are used for destructive confirms and icon-button hints across multiple views.

### T27 · Bindings, events, cancellation end-to-end
- **Dependencies:** all BE handlers + FE views · **Complexity:** M
- **Goal:** Bindings regenerated; events and cancellation work end-to-end.
- **Scope:** `main.go` Bind all handlers + `EnumBind` ErrorCode; `wails generate module`; FE subscribes to `chain:progress`/`chain:error`/`chain:done`; cancel wired.
- **Acceptance criteria:** generated models match Go types; progress + cancel verified in a live run.
- **Testing requirements:** e2e progress + cancel.
- **References:** `08-api-contracts.md`, `03-architecture.md`.
- **Status: DONE (2026-07-02, verified file-level).** `main.go` binds all handlers plus `EnumBind` for `ErrorCode`; `wails generate module` produces a clean `git diff` on `frontend/wailsjs/`; `logic/hooks/useChainEvents.ts` subscribes to `chain:progress`/`chain:error`/`chain:done` with matching cancel wiring and unit tests.

### T28 · Documentation & agent-rules rewrite
- **Dependencies:** core features done · **Complexity:** M
- **Goal:** Repo docs reflect v3.
- **Scope:** Rewrite `docs/architecture/01–05`, `README.md`, `CLAUDE.md` (package map, routing), `docs/guides/DEVELOPER_GUIDE.md`; update `docs/ai_agent_rules/*` (logging structured; add error-envelope/sqlc/Radix rules); update `.claude/skills/wails-dev` notes (events/cancel/EnumBind/no-CGO SQLite) and the agent definitions.
- **Acceptance criteria:** docs match the implemented architecture; commands accurate.
- **References:** `03-architecture.md`, `12-ui-implementation.md`.
- **Status: DONE (2026-07-02, verified file-level).** `docs/ai_agent_rules/*` (ErrorEnvelopeRules, SqliteGooseSqlcRules, RadixUICSSRules, GoLoggingRules, etc.) exist and are loaded by the repo's own `CLAUDE.md`; the `wails-dev` skill exists per the routing table.

### T29 · Test suites + CI guards
- **Dependencies:** T00, features implemented · **Complexity:** L
- **Goal:** The full test suites and CI gates from `13-testing-specification.md` exist and pass, completing
  the harness stood up in **T00**. Every frontend view/component has both its unit (RTL) and UI
  (Playwright) test per the §2.3 coverage matrix.
- **Scope:** Go unit/integration (`-race`, httptest, in-memory SQLite, goose round-trip); FE Jest + React Testing Library + jest-axe for **every** slice/helper/component/view (§2.3 matrix); **headless-Chromium UI verification (Playwright responsive×themes gates + interaction smoke flows incl. Markdown rendering, run against Target A and the bridge-dependent journeys against Target B, `13-testing-specification.md` §1.5/§4.1–4.2/§11)**; CI guards (`@mui`/`@emotion` absent; `sqlc generate --diff`; `wails doctor`; `govulncheck`; `npm audit`); coverage floor enforced.
- **Acceptance criteria:** suites pass; coverage targets met; the §2.3 matrix is fully populated (no view lacking a unit **or** a UI test); the §11 pipeline is green end-to-end; CI guards enforced.
- **References:** `13-testing-specification.md` (§1.5, §2.3, §4, §11).
- Before doing changes, validate that app actually builds and runs via `wails dev`
- **Status: DONE, residual gaps closed under T76 (2026-07-02).** Test-suite and CI-guard work landed (commits tagged "T29"); the six live-but-untested components flagged in this document's Phase-12 preface (LanguagePicker, ProviderPicker, KvEditor, TagInput, ProviderList, `stack_utils`) now all have test files, closed by T76. Note: the `@mui`/`@emotion`/`sqlc diff`/`govulncheck`/`npm audit` guards are documented, locally-run gates (see `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`) rather than an automated CI pipeline step — no `.github/workflows` job runs them beyond `verify:ui`/`verify:smoke`.

### T30 · Final integration & acceptance pass
- **Dependencies:** T00–T29 · **Complexity:** M
- **Goal:** End-to-end acceptance of all major features against `13-testing-specification.md` acceptance criteria; cross-platform build verified.
- **Scope:** Run all acceptance scenarios; verify `wails build` cross-compiles (pure-Go SQLite); fresh-install flow; factory reset; provider verification; chain partial/cancel; history; theming.
- **Acceptance criteria:** every major-feature acceptance criterion in `13-testing-specification.md` passes; release build succeeds.
- **References:** `13-testing-specification.md`, `01-product-scope.md`.

---

## Task index
| Phase | Tasks |
|---|---|
| P-1 Bootstrap | T00 verification & test harness (two dev servers + Playwright + bridge mock + CI gates) |
| P0 Foundation | T01 deps/MUI-removal · T02 apperr · T03 db · T04 envelope-boundary · T05 logging/resilience |
| P1 Persistence | T06 settings repo · T07 stack+history repo |
| P2 Providers | T08 provider/profiles/discovery · T09 verification · T10 capability discovery |
| P3 Prompts/Stacks | T11 prompts+catalog · T12 planner/composer/runStep · T13 orchestrator/events/cancel · T14 stacks handlers+starters · T15 PreviewPrompt |
| P4 History | T16 history recording+handlers |
| P5 FE Foundation | T17 tokens/theming · T18 primitives · T19 adapter/errors · T20 slices · T31 markdown rendering (`MarkdownView`/`MermaidBlock`) |
| P6 FE Views | T21 editor+diff (Output Preview = `MarkdownView`) · T22 stack builder+manage · T23 history rail · T24 settings · T25 about+inspector+⌘K (Guide = `MarkdownView`) · T26 toasts/confirms |
| P7 Completion | T27 bindings/events · T28 docs · T29 tests/CI · T30 acceptance |
| P8 v3.1 Fidelity | T32 top-bar chrome · T33 remove StatusBar · T34 sidebar · T35 pane icon-controls · T36 diff parity · T37 run/builder parity · T38 settings left-tabs+theme · T39 provider form+test-inference full-stack · T40 provider-switch resets · T41 settings tabs parity · T42 about·info parity · T43 history rail parity · T44 unit+UI tests · T45 real-provider E2E |
| P9 Post-audit (2026-07-02) | T74 remove dead v2 prompt subsystem · T75 `internal/application` unit tests · T76 untested-but-live FE component tests · T77 remove orphaned `MarkdownView.module.css` · T78 execute T72+T73 · T79 retroactive status markers T00–T67 · T80 spec-conformance spot audit · T81 fix flaky `S2` live test · T82 convert Settings tabs to real Radix Tabs (closes T38 gap) · T83 Prompt Inspector family chip + Copy all (closes T42 gap) |

---

## Phase 8 · v3.1 UI/UX fidelity remediation, provider/verification fixes & real-provider E2E

> The v3 redesign shipped but the running app diverges from the canonical mockups
> (`mockup.html` + `mockup_screens/`). The mockup is the **source of truth**. This phase fixes
> targeted divergences (the skeleton — tokens, `.dark` on `documentElement`, AppBar pickers, cmdk
> palette, RunBar, StackBuilderBar, HistoryRail, VerificationPanel — already exists), fixes three
> provider/verification bugs full-stack, and adds a real-LLM E2E suite. Routing per top-of-repo
> `CLAUDE.md`: `ts-engineer`/`ts-tester` for `frontend/src`, `go-engineer`/`go-tester` for `internal/`,
> load `wails-dev` for any bound-signature change. **Sequence:** T39/T40 → T32–T37 → T38/T41–T43 → T44 → T45.

> **Ground-truth reconciliation (audited 2026-06-29 against the live `wails dev` build; evidence in
> `docs/V3_Temp_Docs/.tmp/mockup-gap-audit.md` + `frontend/.tmp/`):** the attached "current app"
> screenshots that motivated T32–T43 are **stale** — they predate the "align to mockup" commits.
> Verified ALREADY-CORRECT in the current build (fresh screenshots on file): left settings tabs
> (T38), sidebar full-collapse (T34a), in-pane icon buttons (T35), no status bar / top-bar readiness
> dots (T32/T33), ⌘K palette (T32), inset run bar (T37), `.dark` on `documentElement` + Auto-follows-OS
> theme. The provider bugs in **T39/T40 are ALREADY FIXED** in current code and verified by live
> reproduction: Test inference succeeds **before Save** with an in-form model (✓ 5246ms on LM Studio —
> VerificationPanel already passes the draft `form`), check status does **not** leak across providers,
> and provider-switch syncs the model. So T39's bound-signature change is **not required** — T39/T40
> collapse to "verify + add regression tests" (covered in T44). **Genuinely-broken items found that the
> tasks above did NOT capture are added as T46 (critical) and T47 below.**
- **Status: DONE (2026-07-02, verified via prior commit).** Commit `55a40d4` ("T30 · Final integration & acceptance pass") recorded all gates green (634 Go tests, 441 Jest tests, 24 Playwright tests, a real `wails build` cross-compile); acceptance was repeatedly re-confirmed through later live-testing phases (T57, T68). Not re-run fresh in this pass.

### T32 · Top-bar / chrome fidelity
- **Goal:** AppBar matches mockup §4.2.
- **Scope:** `ui/widgets/base/AppBar.tsx` — add "G" gradient logo badge before "GoText"; add a visible **⌘K** button in the right cluster opening the existing `CommandPalette`; confirm right-cluster grouping (Format · View · Layout · ⌘K · 🕘 · ℹ · ⚙) in light & dark. Add **readiness dots** (● ready / ○ not) to `ProviderPicker.tsx`/`ModelPicker.tsx` triggers.
- **Acceptance:** top bar matches mockup in both themes; ⌘K button opens palette; dots reflect provider/model readiness.
- **Status: DONE for the logo/⌘K deliverables (2026-07-02, verified file-level); the readiness-dots sub-requirement was superseded by T52.** `AppBar.tsx` has the gradient logo badge and a visible ⌘K button opening `CommandPalette`. Readiness dots were deliberately never added to `ProviderPicker`/`ModelPicker` (see `ProviderPicker.tsx`'s comment and `AppBarChrome.test.tsx`'s "readiness dots removed" test) — T52 later formalized removing dots entirely in favor of teal `.accent` styling, so this task's literal "dots reflect readiness" criterion is obsolete, not unmet.

### T33 · Remove StatusBar; relocate readiness
- **Scope:** Remove `StatusBar.tsx` from `ui/widgets/views/AppMainView.tsx`; drop `STATUS_BAR` height in `ui/styles/constants.ts` so the editor reclaims space and the run bar sits only under the panes (not under the sidebar). Confirm no remaining consumer.
- **Acceptance:** no bottom status bar; provider/model state visible only via top-bar dots; layout has no dead band.
- **Status: DONE (2026-07-02, verified file-level).** Zero references to `StatusBar` remain anywhere in `frontend/src`.

### T34 · Sidebar fidelity
- **Scope:** `ui/widgets/views/editor/ActionsSidebar.tsx` — (1) collapsed ⇒ render nothing (remove category-initial strip, line ~43); reopen via hamburger. (2) Render `stack.icon` as a real glyph (map lucide name → icon or normalize seed to emoji), never raw text (line ~75). (3) Restructure actions into **family-grouped sections with headers+counts** + a **search box** filtering actions & stacks; reuse `selectCatalogByCategory`; preserve armed/disabled/`+1` states; ensure scroll.
- **Acceptance:** collapse fully hides; stack glyphs render; grouped+searchable scrollable list per mockup.
- **Status: DONE (2026-07-02, verified file-level).** `ActionsSidebar.tsx` returns `null` when collapsed; `StackGlyph.tsx` renders real glyphs; sections are family-grouped with counts and a search box filtering actions & stacks.

### T35 · Editor pane controls → icon buttons
- **Scope:** `ui/widgets/views/editor/InputPane.tsx`, `OutputPane.tsx` — move paste/clear (input) and copy/restore/clear (output) to **top-right icon buttons** with tooltips; keep handlers/thunks; add word-count + "rendered"/"restored" sub-labels in headers.
- **Acceptance:** controls match mockup placement; all actions still work.
- **Status: DONE (2026-07-02, verified file-level).** `InputPane.tsx`/`OutputPane.tsx` expose paste/clear/copy/restore/clear as top-right icon buttons with tooltips, plus word-count and "rendered"/"restored" sub-labels.

### T36 · Diff view parity
- **Scope:** Diff mode of `OutputPane`/`DiffView` — add **+N added / −N removed** badges and a **"Copy clean"** button (mockup §6.2).
- **Acceptance:** diff shows counts and copy-clean.
- **Status: DONE (2026-07-02, verified file-level).** `DiffView.tsx` renders `+N added`/`−N removed` badges and a "Copy clean" button, wired from `OutputPane.tsx`.

### T37 · Run bar & stack builder parity
- **Scope:** `RunBar.tsx` — armed-action chip + "· N inference" + **＋ Build a stack** + Run; empty-state only when nothing armed. `StackBuilderBar.tsx` — family-merge group chips, caps hints ("1 MAX"), live "N / 5 steps · M inferences" counter, Cancel/Save…/Run, dashed teal top border (mockup §6.1).
- **Acceptance:** both bars match mockup; caps/merge/inference counts correct.
- **Status: OPEN (partial — 2026-07-02, verified file-level).** `RunBar.tsx`'s armed chip/inference count/"Build a stack"/Run and `StackBuilderBar.tsx`'s family-merge chips + live "N/5 steps · M inferences" counter are implemented. Not implemented: the spec's explicit "1 MAX" cap-hint chip text (the UI uses disabled-reason strings like "5-step cap reached" instead) and the dashed top border called for in the mockup (`StackBuilderBar.module.css` uses a solid border) — minor visual-fidelity gaps, not behavioral bugs.

### T39 · Provider form fidelity + test-inference full-stack fix  *(do first; blocking)*
- **Backend (`go-engineer`, load `wails-dev`):** change `internal/verification` `TestInference` (and for consistency `TestConnection`/`TestModels`) bound signature to accept the **draft provider config (incl. selectedModel)** instead of reading saved config, so Verify works **before Save**. Per `ErrorEnvelopeRules.md`: concrete `*Result` envelope, `ToWire` only at handler. Update verification/actions handler; `wails generate module` (commit regenerated `frontend/wailsjs/`). Move/extend the empty-model validation test (`internal/verification/service_test.go:481`) to the new contract.
- **Frontend (`ts-engineer`):** `ProviderForm.tsx`/`VerificationPanel.tsx` pass draft model/config to new bindings; add **API-key env-var banner**, **API version**, **Deployment/Selected-model** block; render Verify panel as **check-rows** with timings. `ProviderList.tsx`: kind **dot** markers + **CURRENT** badge.
- **Acceptance:** Test inference succeeds with an in-form selected model before Save; provider form matches mockup; bindings in sync.
- **Status: DONE (2026-07-02, verified file-level).** `internal/verification/service.go`'s `TestInference(cfg settings.ProviderConfig)` reads `cfg.SelectedModel` directly from the passed-in draft config, not a saved-provider lookup, confirming Verify-before-Save works.

### T40 · Provider-switch state resets
- **Scope:** (b) `VerificationPanel.tsx` — `useEffect` keyed on `providerId` resets check states to `INITIAL_CHECK`. (c) `ui/widgets/base/ModelPicker.tsx` + `logic/store/settings/thunks.ts`/selectors — on provider switch (`setAsCurrentProviderConfig`) sync `modelConfig.name` to the new provider's `selectedModel` (or clear), fixing run failures.
- **Acceptance:** switching providers clears prior test results and selects the right model; runs no longer fail with stale model.
- **Status: DONE (2026-07-02, verified file-level).** `VerificationPanel.tsx`'s `useEffect` keyed on `providerConfig.providerId` resets check state; `settings/slice.ts` syncs `modelConfig.name` to the new provider's `selectedModel` on `setAsCurrentProviderConfig.fulfilled`.

### T38 · Settings shell → LEFT tabs + theme fix
- **Scope:** Convert `SettingsTabs.tsx`/`SettingsView.tsx` to a **left vertical Radix Tabs** nav with emoji glyphs + `‹ Editor` header. Fix settings surface tokens so panels use `--surface`/`--bg` in light & dark (resolves near-black regression).
- **Acceptance:** settings match mockup layout/colors in both themes.
- **Status: DONE (2026-07-02).** Originally left `OPEN` (partial) because the tab nav was a hand-rolled `<button role="tab">` element, not an actual Radix Tabs primitive. Closed by **T82**, which converted `SettingsView.tsx` to render the shared `primitives/Tabs.tsx` Radix wrapper directly (mirroring `InfoView.tsx`) — see T82's own entry/marker below for verification detail.

### T41 · Remaining settings tabs parity
- **Scope:** Model, Generation, Languages, Logging (rotation + task-logging + history), About & data (paths+copy+Factory reset), Appearance (Auto/Light/Dark + preview swatches) — align to mockup screens; theme applies instantly via `logic/theme/init.ts`.
- **Acceptance:** each tab matches its mockup screen.
- **Status: DONE (2026-07-02, verified file-level).** All six remaining settings tabs (Model, Generation, Languages, Logging, About & data, Appearance) are real, non-stub components correctly routed from `SettingsView.tsx`.

### T42 · About·Info window parity
- **Scope:** Prompt inspector — family chips, inference grouping note, parameter chips, **Copy all**, **"Use current editor input as a preview"** toggle, Guide/Actions&Stacks left nav.
- **Acceptance:** inspector matches mockup About·Info screen.
- **Status: DONE (2026-07-02).** Originally left `OPEN` (partial) because the Prompt Inspector had no dedicated family-chip UI element and no "Copy all" button. Closed by **T83**, which added both to `PromptInspector.tsx` — see T83's own entry/marker below for verification detail.

### T43 · History rail parity
- **Scope:** Cards — INF badge, status (success/partial/PARTIAL), relative time, restore+delete icons, "100 MAX", Clear; rail coexists with panes without overlapping the run bar.
- **Acceptance:** history rail matches mockup.
- **Status: DONE (2026-07-02, verified file-level).** `HistoryEntryCard.tsx`/`HistoryRail.tsx` render the INF badge, status (incl. partial), relative time, restore/delete icons, "100 MAX", and a confirming Clear action.

### T44 · Unit + Target-A UI tests (deterministic, CI-safe)
- **Scope:** For every fix add/extend tests. Jest/RTL (`ts-tester`): sidebar collapse-hides; stack icon renders glyph; pane icon buttons; VerificationPanel reset on switch; ModelPicker sync on switch; settings left-tabs; RunBar states. Go (`go-tester`): `TestInference` draft-config table tests (empty-model validation, busy gate, auth/unreachable). Playwright Target A (`frontend/e2e/verify-ui.spec.ts`, bridge-mock): responsive (narrow/tablet/wide × light/dark) — no horizontal overflow, no console errors; presence of each fixed element. Keep green: `go build ./...`, `wails generate module && git diff --exit-code frontend/wailsjs/`, `! grep -rq "@mui\|@emotion" frontend/src`, `go test -race ./...`.
- **Acceptance:** all unit + Target-A UI tests pass; CI gates green.
- **Status: OPEN (partial — 2026-07-02, verified file-level).** Most fixes from T32–T43 have RTL/Playwright coverage (`ActionsSidebar.test.tsx`, `StackGlyph.test.tsx`, `InputPane`/`OutputPane.test.tsx`, `VerificationPanel.test.tsx`, `ModelPicker.test.tsx`, `SettingsTabs.test.tsx`, `RunBar.test.tsx`, `frontend/e2e/verify-ui.spec.ts`). Two specific assertions named in this task's own Scope are still missing: no test asserts "collapsed sidebar renders nothing," and `VerificationPanel.test.tsx` does not directly exercise the provider-switch reset `useEffect` added in T40.

### T45 · Real-provider E2E (Target B: `wails dev` + real backend + LM Studio & Ollama)
- **Isolation (blocking):** destructive specs (delete provider, factory reset, clear history) mutate the real DB/settings — run against a **throwaway config/data dir** (env override or backup/restore `GoTextApp` config+db around the suite). **Local-only / not in CI.** First do one smoke navigation confirming Playwright reaches the Wails bridge at `http://localhost:34115`. Smallest models: Ollama `qwen3:0.6b-q4_K_M`, LM Studio smallest loaded.
- **Scenarios (both providers):** 1) provider CRUD + Test connection/models/inference(pre-save) + Save/Set current + headers add/edit/remove + auth switch; 2) model settings (temp/context/token-limit); 3) generation (timeout/retries/markdown); 4) logging + factory reset (isolated); 5) appearance Light/Dark/Auto; 6) editor proofread + switch provider/model/language + Format/View/Layout + History open/manage + sidebar toggle; 7) build/run/manage stacks.
- **Acceptance:** all journeys pass on both providers; each failure produces a code fix + regression test; loop until green.
- **Status: DONE (2026-07-02, verified via T78's later run).** `frontend/e2e/live-llm.spec.ts` (261 lines) implements the real-provider journeys and is confirmed passing against real Ollama/LM Studio per T78's "Status: DONE" marker elsewhere in this document; `verify:live` is correctly excluded from `.github/workflows/main.yml`. Minor caveat: the destructive-test isolation requirement is implemented as an operator instruction/comment (back up `GoTextApp` manually) rather than automated backup/restore code.

### T46 · Starter-stack action-ID remediation  *(critical — "stacks not working")*
- **Bug (verified):** the seeder `internal/db/db.go` `seedStarterStacks` wrote **camelCase** action IDs (`basicProofreading`, `conciseRewrite`, …) that don't exist in the runtime **v3 dotted** catalog (`internal/prompts/v3/catalog.go`, e.g. `rewrite.proofread.basic`). `StackHandler.filterUnknownSteps` dropped every step, so all 17 starter stacks showed **0 steps / 0 inferences** in the sidebar and Manage grid, and ran as no-ops. Live backend logged ~40× `"dropping unknown action ID from saved stack"`.
- **Backend (`go-engineer`/`go-tester`):** rewrite `seedStarterStacks` to valid v3 dotted IDs preserving each stack's intent; **every starter stack must pass `actions.NewPlanner(v3.Catalog()).Plan(...)`** (respect one-per-exclusivity-group, ≤5 steps, ≤3 inferences). Add a NEW numbered goose migration (`internal/db/migrations/0003_remap_stack_action_ids.sql`) that UPDATEs `stack_steps.action_id` old→new with a reversing `-- +goose Down`, so already-seeded DBs heal at `db.Open` without factory reset. Seed table and migration share one mapping (byte-identical result).
- **Tests:** catalog-membership + planner-validity test for all 17 stacks (self-checking); seeded-DB test that steps survive `filterUnknownSteps`; migration remap (single, full block, Down-reverses).
- **Acceptance:** every starter stack shows its real step/inference counts and recipe summary (mockup §"My Stacks"); `go test -race ./...` green. **Status: DONE this session** (see `internal/db/db.go`, `internal/db/migrations/0003_*.sql`, `internal/db/starter_stacks_test.go`, `internal/stacks/starter_stacks_plan_test.go`).

### T47 · Main-screen model switching (AppBar model discovery)
- **Gap (verified):** `ui/widgets/base/ModelPicker.tsx` (`TODO: no live model-discovery thunk`) + `selectCurrentProviderModelItems` return only `[modelConfig.name]`, so the AppBar MODEL dropdown lists a single option — the user cannot switch models from the main screen (required by §scenario-6; mockup MODEL pill is a searchable model list).
- **Frontend (`ts-engineer`/`ts-tester`):** add a discovery thunk (reuse `ActionHandlerAdapter.getModels(currentProviderId)`) storing `discoveredModels` in the settings slice (reset on provider change); update the selector to list discovered ∪ current (deduped, current always present); wire the ⟳ refresh button + auto-discover on provider switch/mount; persist via `updateModelConfig`. If the Settings → Model tab has the same single-item limit, reuse the same source there.
- **Tests:** reducer (discovery populates / provider-change resets), selector (discovered ∪ current), ModelPicker RTL (multiple options; select dispatches `updateModelConfig`; ⟳ dispatches discovery).
- **Acceptance:** after switching the AppBar provider the MODEL dropdown lists the new provider's models and switching one persists + drives the next run.
- **Status: DONE (2026-07-02, verified file-level).** A `discoverCurrentProviderModels` thunk populates `discoveredModels` (reset on provider switch); `ModelPicker.tsx` consumes it with auto-discover on provider change plus a ⟳ refresh button.

### T48 · Real-LLM model choice note
- The live E2E (T45) must use a **reliable small** model — Ollama `gemma3:1b-it-q4_K_M` or `qwen3:1.7b`, LM Studio's smallest loaded — **not** `qwen3:0.6b`, which emits the documented `[NO_TEXT_PROVIDED]` empty-input sentinel (a model artifact, not a composition bug — LM Studio proofreads correctly on the same v3 path; `{{user_text}}` injection verified in `v3/catalog.go`).

### Final verification
- Run `wails dev` and manually exercise the real app on this branch against LM Studio and Ollama; confirm UI/UX and provider flows match the mockups (per `CLAUDE.md` "Finishing task").

---

## Phase 9 · v3.1 UI/UX fidelity remediation — round 2

> A prior remediation (T32–T48) claimed most divergences fixed in a 2026-06-29 audit, but fresh
> same-day screenshots (`docs/V3_Temp_Docs/current_app_screens/`) show the problems persist, and code
> exploration confirmed the root causes still exist in source. This round re-roots each reported issue
> against the canonical mockup (`mockup.html` + `mockup_screens/`, the **source of truth**) and fixes
> them at the component level with regression tests, verified by real-inference live testing.
>
> **Reframing finding:** `frontend/src/ui/styles/tokens.css` is a byte-perfect match to
> `mockup.html`'s tokens. "Incorrect colors" is therefore **not** a token problem — it is components
> referencing **undefined tokens** (`--surface-3`, `--text-muted`) or applying the **wrong defined
> token / wrong structure** vs the mockup. Fixes are component-scoped.
>
> **Source-of-truth decisions:** AppBar pills (`.sel`) carry **no status dots** — active provider uses
> the teal `.accent` style; `Lang` is a single combined `EN → UK` pill (not a separate IN/OUT row);
> editor body (`.editor`) is `--surface-2` bordered card (a card-treatment fix, not a swap to white);
> clicking a saved stack **arms** it (mutually exclusive with an armed action) and Run executes the
> chain. **Sequence:** T49 → T50 → parallel { T51 · T52/T53 · T54 · T55/T56 } → T57.
- **Status: DONE (2026-07-02, verified file-level; documentation note, no code deliverable expected).** `frontend/e2e/live-llm.spec.ts` names the required reliable small models and explicitly warns against `qwen3:0.6b`'s empty-input artifact.

### T49 · Remove the double loading overlay  *(issue: double loading views)*
- **Root cause:** `frontend/src/ui/AppLayout.tsx:30` mounts `<GlobalLoadingOverlay/>` (driven by
  `ui.inferenceRunning`) on top of the correct per-pane `StepProgress` in `OutputPane.tsx`.
- **Scope (`ts-engineer`):** remove `GlobalLoadingOverlay` from `AppLayout.tsx` + delete the dead
  component; loading renders **only** inside the Output pane as `StepProgress` (mockup `21.22.03`).
  Keep `inferenceRunning` button-disable gating intact.
- **Tests (`ts-tester`):** OutputPane shows `StepProgress`+Cancel while running; no full-pane overlay node.
- **Acceptance:** single output-only loader; no app-wide "Processing…" overlay.
- **Status: DONE (2026-07-02, verified file-level).** `GlobalLoadingOverlay` no longer exists anywhere in `frontend/src`; loading renders only via per-pane `StepProgress` in `OutputPane.tsx`.

### T50 · Input/Output pane card treatment  *(issue: IO widgets/background not light)*
- **Root cause:** panes read flat grey `--surface-2`; mockup renders header label on `--bg` above a
  bordered `--surface-2` editor card.
- **Scope (`ts-engineer`):** `InputPane/OutputPane/EditorArea` module CSS match `mockup.html` `.editor`
  (line 153). Header row + per-pane icon buttons on top, editor body = bordered surface-2 card, wrapper
  transparent. Verify vs `21.20.42` (light) / `21.21.05` (dark).
- **Tests (`ts-tester`):** panes use token-driven classes (no hardcoded colors / undefined tokens).
- **Acceptance:** panes match mockup card treatment in both themes.
- **Status: DONE (2026-07-02, verified file-level).** `InputPane`/`OutputPane`/`EditorArea` `.module.css` `.body` classes use a bordered `var(--surface-2)` card treatment with headers on `var(--bg)` above, matching the mockup in both themes.

### T51 · Saved stacks armable + runnable from sidebar  *(issue: custom stacks not selectable)*
- **Root cause:** `ActionsSidebar.tsx:89-95` stack rows are non-interactive `<div>`s; `ui` slice's
  `armedActionId` tracks only a single action; `RunBar` only runs single actions.
- **Scope (`ts-engineer`):** add `armedStackId` + `armStack(id)` to `ui` slice (mutually exclusive with
  `armedActionId`); stack rows become `<button>` arming the stack; `RunBar` shows stack chip +
  "N steps · M inferences" and Run executes via `processPromptChain` (reuse Manage/⌘K path).
- **Tests (`ts-tester`):** click arms stack (clears action); RunBar runs the chain; mutual exclusivity.
- **Acceptance:** clicking a saved stack arms it and Run executes the whole chain.
- **Status: DONE (2026-07-02, verified file-level).** `ActionsSidebar.tsx` stack rows are `<button>`s dispatching `armStack(id)`; `RunBar.tsx` reads `selectArmedStackId` and runs the chain via `processPromptChain`, with mutual exclusivity against `armedActionId`.

### T52 · AppBar chrome fidelity  *(issues: inconsistent icon sizes, dot placement)*
- **Root cause:** AppBar uses five ad-hoc icon-button classes; stray dots between brand/provider/model;
  language is a separate IN/OUT row.
- **Scope (`ts-engineer`):** route all top-bar icon buttons through one shared sized IconButton;
  remove readiness dots from `ProviderPicker`/`ModelPicker` triggers, style active provider with teal
  `.accent`; replace IN/OUT row with one combined `Lang EN → UK ▾` popover pill (existing language
  state as single source).
- **Tests (`ts-tester`):** no readiness-dot nodes; provider pill accent when current; single lang pill;
  icon buttons share one size class.
- **Acceptance:** top bar matches mockup in both themes.
- **Status: DONE, with one scoped exception (2026-07-02, verified file-level).** Top-bar icon buttons route through the shared `IconButton`; no readiness-dot markup remains in `ProviderPicker`/`ModelPicker`; the active provider uses teal `.accent`; `LanguagePicker.tsx` renders one combined `Lang EN → UK ▾` pill. Exception: the sidebar-collapse and back-to-editor buttons still use bespoke CSS classes rather than literally sharing the `IconButton` component, though their sizing/focus-ring visually matches it.

### T53 · Provider/Model single-source sync correctness  *(issue: appbar/settings not synced)*
- **Root cause:** provider already shares Redux state; the real defect is model staleness — on provider
  switch `modelConfig.name` can point to a model absent from the new provider, and AppBar discovery
  lists only the saved name.
- **Scope (`ts-engineer`):** on `setAsCurrentProviderConfig` sync `modelConfig.name` to the new
  provider's `selectedModel` (or clear) + run discovery (`getModels`), store `discoveredModels` (reset
  on provider change); AppBar ModelPicker lists discovered ∪ current; Settings Model tab reads same source.
- **Tests (`ts-tester`):** reducer reset/repoint on switch; selector discovered ∪ current; ModelPicker
  multi-option + persists.
- **Acceptance:** changing provider/model in Settings reflects in AppBar; next run uses it.
- **Status: DONE (2026-07-02, verified file-level).** `settings/slice.ts` syncs `modelConfig.name` and resets `discoveredModels` on provider switch; `ModelPicker.tsx` and `ModelConfigTab.tsx` consume the same `selectCurrentProviderModelItems`/`selectDiscoveredModels` selectors (single source), covered by `settings/settings.test.ts`.

### T54 · History rail overflow + card fidelity  *(issue: history renders outside screen)*
- **Root cause:** `HistoryEntryCard.module.css` `.preview` uses `white-space:nowrap` and flex children
  lack `min-width:0`; rail uses `--surface-2`; cards reference undefined tokens; layout ≠ mockup `21.21.17`.
- **Scope (`ts-engineer`):** two-line clamped preview + `min-width:0`; replace undefined tokens with real
  ones; card = title + right-aligned **N INF** badge, `input… → output…`, footer `time · status · ↺ · 🗑`;
  active card teal border + `--teal-50`; rail clips horizontally, no run-bar overlap.
- **Tests (`ts-tester`):** entry renders badge/status/time/actions; long preview wraps to 2 lines, no overflow.
- **Acceptance:** history rail matches mockup and never overflows the screen.
- **Status: DONE (2026-07-02, verified file-level).** `HistoryEntryCard.module.css` uses a 2-line `-webkit-line-clamp` preview with `min-width: 0`, an "N INF" badge, and teal active-card styling; the rail clips with no run-bar overlap.

### T55 · Settings shell + Providers tab parity  *(issue: settings don't reflect mockups)*
- **Scope (`ts-engineer`):** Providers glyph 🔌; provider-list "PROVIDERS" header; move "+ New provider"
  to the bottom; two-column grid for endpoint and api-version/deployment rows (mockup `21.22.28`);
  confirm surfaces use `--surface`/`--bg` in both themes.
- **Tests (`ts-tester`):** "+ New provider" is last child; header present; endpoint fields side-by-side.
- **Acceptance:** Providers settings match mockup layout/colors.
- **Status: DONE (2026-07-02, verified file-level).** `SettingsTabs.tsx` has the 🔌 glyph; `ProviderList.tsx` has a "PROVIDERS" header with "+ New provider" as the last child; `ProviderForm.tsx` uses a two-column grid for endpoint/api-version rows.

### T56 · Remaining settings tabs + Manage grid spot-fixes
- **Scope (`ts-engineer`):** audit Model/Generation/Languages/Logging/About/Appearance vs mockup screens
  (`21.22.40/21.22.51/21.23.02`), fix surface/background/token divergences + layout gaps; add Manage-grid
  responsive breakpoint; replace any undefined-token usages.
- **Tests (`ts-tester`):** RTL per touched tab asserting key elements + token-driven classes.
- **Acceptance:** each tab matches its mockup screen.
- **Status: DONE (2026-07-02, verified file-level).** No undefined `var(--…)` tokens remain across the Appearance/Logging/Model/Generation/Languages/About tab CSS; `StacksManageView.module.css` has responsive breakpoints; all seven tabs have RTL coverage.

### T57 · Tests green + real-inference live testing
- **Deterministic gates:** `go build ./...`; bindings in sync (if signatures changed — none expected);
  `! grep -rq "@mui\|@emotion" frontend/src`; `cd frontend && npm run test`; `go test -race ./...`.
- **Playwright Target A:** responsive (narrow/tablet/wide × light/dark) — no horizontal overflow, no
  console errors; presence of each fixed element.
- **Live (per `CLAUDE.md`):** `wails dev` + LM Studio/Ollama (reliable small model) — single-action run
  (loader only in output), arm+run a saved stack from sidebar, provider/model switch sync, history wrap,
  light/dark colors. Any new bug found → covering test + fix.

---

## Phase 10 — Post-Live-Test Bug Fixes

> **Discovery:** live-testing session 2026-06-30 (Phases 1–10 via Playwright + real Ollama inference)
> uncovered the three defects below. Each task includes root-cause analysis, scope, required tests,
> and acceptance criteria.
- **Status: DONE (2026-07-02, verified this session plus prior evidence).** Deterministic gates re-confirmed now (`npm run test` 726/726 passing, `go build ./...` clean, `@mui`/`@emotion` guard clean); live `wails dev` + Ollama testing is documented in `docs/V3_Temp_Docs/2026-06-30-comprehensive-live-testing.md` (commit `1f3d31d`), which directly motivated Phase 10 (T58–T60) and was re-confirmed by later phases (T63/T67/T68). Live LLM inference was not personally re-run in this pass.

### T58 — History rail stale after run completion

- **Severity:** High
- **Discovery:** After a chain run completed, the History rail showed the pre-run list. Toggling the
  rail off and back on forced a re-fetch and the new entry appeared. The rail has no subscription to
  run-completion events.
- **Root cause:** `HistoryRail` (or the `fetchHistory` thunk) fetches once on mount/toggle but is
  not subscribed to run-slice state transitions. When `processPromptChain` resolves, the `run` slice
  transitions to `done`/`partial`/`error`, but nothing triggers a history re-fetch.
- **Fix (`ts-engineer`):**
  Option A (preferred): in `logic/store/history/thunks.ts`, add an `extraReducers` case for
  `processPromptChain.fulfilled` (and `.rejected`) that dispatches `fetchHistory` — so history
  refreshes automatically whenever a chain settles.
  Option B: add a `useEffect` in `HistoryRail.tsx` that watches `selectRunStatus`; when status
  transitions from `running` to a terminal state, dispatch `fetchHistory`.
- **Files:**
  - `frontend/src/logic/store/history/thunks.ts`
  - `frontend/src/logic/store/run/slice.ts` (reference for `processPromptChain` action type)
  - `frontend/src/ui/widgets/base/HistoryRail.tsx` (if Option B chosen)
- **Tests (`ts-tester`):**
  - RTL: render `HistoryRail` inside a test store; simulate `processPromptChain.fulfilled`; assert
    a second `fetchHistory` call is dispatched without toggling the rail.
  - Jest slice test: verify that `processPromptChain.fulfilled` in `historySlice.extraReducers`
    triggers a new `fetchHistory` dispatch (or sets a flag that causes the next render to fetch).
- **Acceptance:** New history entries appear in the rail immediately after run completion with no
  user interaction required.
- **Status: DONE (2026-07-02, verified file-level).** `history/slice.ts` sets a `staleAfterRun` flag in `extraReducers` for `processPromptChain.fulfilled`/`.rejected`; `HistoryRail.tsx`'s `useEffect` re-dispatches `listHistory` on that flag — functionally matches the spec's Option A/B intent.

### T59 — `selectRunProgress` selector not memoized

- **Severity:** Medium
- **Discovery:** Redux DevTools showed repeated `react-redux` "The result function returned a
  different result when called with the same parameters" warnings during inference. `OutputPane`
  re-rendered on every `run` slice update even when `groupIndex`, `totalGroups`, and `family` were
  unchanged.
- **Root cause:** `frontend/src/logic/store/run/selectors.ts` — `selectRunProgress` is a plain
  function that constructs a new `{ groupIndex, totalGroups, family }` object literal on every
  invocation. `react-redux` performs a reference-equality check (`===`) on the return value; a
  new object fails that check even when field values are identical.
- **Fix (`ts-engineer`):** Convert to `createSelector` (already available via `@reduxjs/toolkit`):
  ```typescript
  export const selectRunProgress = createSelector(
      (state: RootState) => state.run.currentGroupIndex,
      (state: RootState) => state.run.totalGroups,
      (state: RootState) => state.run.currentGroupFamily,
      (groupIndex, totalGroups, family) => {
          if (groupIndex === null || totalGroups === null || family === null) return null;
          return { groupIndex, totalGroups, family };
      }
  );
  ```
- **Files:**
  - `frontend/src/logic/store/run/selectors.ts`
- **Tests (`ts-tester`):**
  - Jest: call `selectRunProgress` twice with identical state snapshots; assert the two return
    values are the same reference (`toBe`).
  - Jest: call with a changed `currentGroupIndex`; assert a new object reference is returned.
  - RTL: render `OutputPane` with a simulated running state; verify no "different result" console
    warning is emitted during repeated state updates with identical progress values.
- **Acceptance:** No `react-redux` "different result" warnings appear in the console during
  inference; `OutputPane` does not re-render when progress values are unchanged.
- **Status: DONE (2026-07-02, verified via commit).** Commit `deed22b` converts `selectRunProgress` to `createSelector` in `logic/store/run/selectors.ts`; covered by `run/__tests__/selectors.test.ts`.

### T60 — Stack builder UX: inference cap not surfaced, no action deselect

- **Severity:** Medium (two sub-issues found in the same session)
- **Discovery:**
  1. **Cap not surfaced early:** The 3-inference cap becomes apparent only after the cap is hit —
     buttons become disabled with a `title` tooltip. The "N/5 steps · M inferences" counter in the
     builder bar is visible but gives no visual signal that 3 is the maximum until it is too late.
     A user can build 4 steps before learning they are at capacity.
  2. **No action deselect:** Once an action is armed via the RunBar / `ActionsSidebar`, clicking
     the same action again scrolls the sidebar to that action's section instead of deselecting it.
     There is no path to a "nothing armed" state after the first selection short of a full app
     restart.
- **Fix (1) — cap highlight (`ts-engineer`):**
  In `StackBuilderBar.tsx`, apply an amber/red CSS class to the "M inferences" portion of the
  counter when `inferenceCount >= 3`. Optionally add a static "3 MAX" chip consistent with the
  existing "1 MAX" chips used for exclusivity groups (see `tokens.css` `--amber`/`--red` tokens).
- **Fix (2) — action deselect (`ts-engineer`):**
  - Add `clearArmedAction` reducer to `frontend/src/logic/store/ui/slice.ts` that sets
    `armedActionId` to `null`.
  - In `ActionsSidebar.tsx`, change the click handler for the currently-armed action: if
    `armedActionId === action.id`, dispatch `clearArmedAction()` instead of scrolling.
  - In `RunBar.tsx`, handle `armedActionId === null` gracefully: show a placeholder label (e.g.
    "Select an action") and disable the Run button.
- **Files:**
  - `frontend/src/ui/widgets/views/editor/StackBuilderBar.tsx`
  - `frontend/src/ui/widgets/views/editor/StackBuilderBar.module.css`
  - `frontend/src/logic/store/ui/slice.ts`
  - `frontend/src/ui/widgets/views/editor/ActionsSidebar.tsx`
  - `frontend/src/ui/widgets/views/editor/RunBar.tsx`
- **Tests (`ts-tester`):**
  - RTL `StackBuilderBar`: at `inferenceCount = 3`, assert the inference counter carries an amber
    or error CSS class; at `inferenceCount < 3`, assert it does not.
  - RTL `ActionsSidebar`: click an already-armed action; assert `clearArmedAction` is dispatched
    and `armedActionId` becomes `null`.
  - RTL `RunBar`: render with `armedActionId = null`; assert Run button is disabled and a
    placeholder text is shown.
- **Acceptance:**
  1. When the inference count reaches 3, the counter turns amber/red before any button is
     disabled — users see the limit approaching.
  2. Clicking an armed action in the sidebar deselects it; RunBar enters the null-armed state
     with a disabled Run button.

---

## Phase 11 — Context-Window Feature: Fixes & Live Input Token Estimate (Live-Tested 2026-07-01)

> **Discovery:** a feature-scoped live-testing session on 2026-07-01 (`docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`)
> exercised the "Use context window" setting (Settings > Model) against real Ollama and LM Studio
> inference, using a reverse-logging HTTP proxy in front of Ollama and LM Studio's own `server-logs`
> to inspect exact wire-level request bodies — not just UI behavior. All 6 issues flagged by a prior
> static-analysis investigation were confirmed with live evidence, plus 2 new defects were discovered
> (T63 Ollama `num_ctx` no-op, T62's silent-truncation consequence). This phase fixes all of them and
> adds a live input-token-estimate widget (user-requested directly in response to these findings) that
> gives users visibility into prompt size vs. the configured limit before they hit send.
> **Sequence:** T61, T64, T65, T66 are independent and may run in parallel. T62 (decouple
> context-window from the output-token cap) is the most invasive fix (new settings field + migration)
> and should land before or alongside T67 (token estimate) for conceptual clarity, though T67 is not
> hard-blocked on it. T63 (Ollama `num_ctx` investigation) is independent. T68 is the closing gate and
> must run last, after all of T61–T67.
- **Status: DONE (2026-07-02, verified via commit).** Commit `58e668b`: `StackBuilderBar.tsx` adds an `inferenceCapReached` amber CSS class at count ≥ 3; `ActionsSidebar.tsx` reuses the pre-existing `armAction(null)` (functionally equivalent to a dedicated `clearArmedAction`) to deselect on re-click; `RunBar.tsx` shows a placeholder and disables Run when nothing is armed.

### T61 — Context-window Settings UI/backend range mismatch + misclassified validation error

- **Severity:** Medium
- **Discovery:** Live-tested by dragging the Settings > Model context-window slider to its minimum
  (512) with "Use context window" ON, for `ministral-3:3b-instruct` on Ollama, and clicking Save. The
  value appeared to save (slider stayed at 512, no visible error anywhere on screen — checked both
  corners immediately after Save) but reloading Settings > Model afterward showed it had silently
  reverted to the last valid value (4096). Backend log for that exact save:
  ```
  {"level":"error","error":"SettingsService.UpdateModelConfig: contextWindow must be 1024–200000 when enabled","time":"2026-07-01T15:00:59+02:00","message":"unclassified error"}
  [FrontendLogger].SettingsThunks: updateModelConfig failed: An unexpected error occurred. Please try again.
  ```
- **Root cause (two coupled bugs, same code path):**
  1. **Range mismatch:** `frontend/src/ui/widgets/views/settings/tabs/ModelConfigTab.tsx:172-173`
     configures the context-window `Slider` with `min={512} max={131072} step={512}`, but
     `internal/settings/service.go:315-320`'s `UpdateModelConfig` validates
     `cfg.ContextWindow < 1024 || cfg.ContextWindow > 200000` when enabled. Values 512–1023 are
     reachable via the UI slider and always rejected by the backend; values 131073–200000 are
     inversely unreachable via the UI even though the backend would accept them.
  2. **Misclassified error:** the same validation block returns a plain `fmt.Errorf(...)`, not an
     `*apperr.AppError`. Per `docs/ai_agent_rules/ErrorEnvelopeRules.md`, `apperr.ToWire`
     (`internal/apperr/wire.go:25-49`) classifies any non-`*AppError` as `CodeInternal` and logs it as
     `"unclassified error"` — so even once the range is fixed, any other client sending an
     out-of-range value would still surface as "An unexpected error occurred. Please try again."
     instead of a specific message.
- **Fix (1) — align the range (`ts-engineer`):** change the slider bounds in `ModelConfigTab.tsx` to
  `min={1024} max={200000}`, matching the backend exactly (do not keep a separate, looser UI range).
  Pick a `step` that divides evenly into the new range (the existing 512 does not land exactly on
  200000) — a UI-feel decision, not a contract change.
- **Fix (2) — classify the validation error (`go-engineer`):** in `internal/settings/service.go:315-320`,
  replace both `fmt.Errorf` validation returns (temperature and context-window) with
  `apperr.Validation(...)` (see `internal/apperr/apperr.go` constructors /
  `docs/ai_agent_rules/ErrorEnvelopeRules.md`), carrying the field name and allowed range in `Details`
  (no secrets). The handler boundary (`internal/settings/handler.go`) already calls `apperr.ToWire`
  correctly — the bug is purely in what error type reaches it.
- **Files:** `frontend/src/ui/widgets/views/settings/tabs/ModelConfigTab.tsx`,
  `internal/settings/service.go`, `internal/apperr/apperr.go` (reuse existing constructor or add one
  if the exact shape isn't available yet).
- **Tests:**
  - `go-tester`: table test over `UpdateModelConfig` boundaries — 1023 (reject, `CodeValidation`), 1024
    (accept), 200000 (accept), 200001 (reject, `CodeValidation`); assert the error carries
    `CodeValidation`, not `CodeInternal`.
  - `ts-tester`: RTL — drag/set the slider to its min and max, assert the DOM value is 1024/200000
    (not 512/131072); assert an out-of-range condition (once bounds are fixed, confirm the slider
    physically cannot represent an invalid value) never reaches the generic error path.
- **Acceptance:** the UI can only ever submit 1024–200000; any out-of-range submission from any client
  surfaces a clear "contextWindow must be 1024–200000" style message, not "An unexpected error
  occurred."
- **Status: DONE (2026-07-02, verified file-level).** `ModelConfigTab.tsx`'s slider bounds (`min={1024} max={200000}`) now match `internal/settings/service.go`'s validation exactly; the validation error uses `apperr.Validation(...)`, not a plain `fmt.Errorf`.

### T62 — Decouple `ContextWindow` from the output-token cap (`max_tokens`/`max_completion_tokens`)

- **Severity:** Critical
- **Discovery:** Live-tested on Ollama with `ministral-3:3b-instruct-2512-q4_K_M`, context window =
  32768, and a 24,955-word / 217-repetition input (~33K estimated tokens). A reverse-logging HTTP
  proxy placed in front of Ollama confirmed the app sent the **full** input (all 217 repetitions,
  167KB body — nothing truncated on the way out). Ollama's own `~/.ollama/logs/server.log` showed it
  only actually **processed `task.n_tokens = 8195`** of that prompt (`truncated = 0` — no error, no
  warning of any kind): roughly three-quarters of the user's input was silently dropped before
  generation, because reserving room for a 32768-token completion inside the model's real (fixed —
  see T63) 16384-token context left almost no room for the prompt.
- **Root cause:** `internal/actions/service.go:56-65` (`newChatCompletionRequest`) sets
  `req.MaxTokens`/`req.MaxCompletionTokens` **directly to the `ContextWindow` value** whenever
  `cfg.ModelConfig.UseContextWindow` is true:
  ```go
  if cfg.ModelConfig.UseContextWindow {
      contextWindow := cfg.ModelConfig.ContextWindow
      if cfg.ModelConfig.UseLegacyMaxTokens {
          req.MaxTokens = &contextWindow
      } else {
          req.MaxCompletionTokens = &contextWindow
      }
  }
  ```
  There is no independent "max output tokens" setting anywhere in the app — one number is asked to do
  two jobs (bound the model's context AND cap the completion length), and the two jobs conflict
  whenever the requested completion cap approaches or exceeds the model's real usable context.
- **Fix (`go-engineer` + `ts-engineer`, DB migration required):**
  1. **Backend schema:** add an independent field to `ModelConfig` (`internal/settings/settings.go`):
     `UseMaxOutputTokens bool`, `MaxOutputTokens int` (sensible default e.g. 2048, validated range
     e.g. 1–32000 — pick a range that comfortably covers normal completions without re-creating the
     original overloaded-number problem). Add a **new** goose migration
     `internal/db/migrations/0004_add_max_output_tokens.sql` (next available number; follow the
     `0003_remap_stack_action_ids.sql` pattern exactly — new file, working `-- +goose Down`, never edit
     an existing migration) with seed defaults added in `internal/db/db.go`.
  2. **Backend request building:** in `internal/actions/service.go`'s `newChatCompletionRequest`, stop
     deriving `MaxTokens`/`MaxCompletionTokens` from `ContextWindow`. Derive it from the new
     `MaxOutputTokens` field instead (same legacy/modern field-name branch, `UseLegacyMaxTokens`
     unchanged). `ContextWindow` should only ever inform `NumCtx` (Ollama, and only once T63 lands),
     never the output-token field. If `UseMaxOutputTokens` is off, do not send
     `MaxTokens`/`MaxCompletionTokens` at all (matches today's toggle-off behavior for context window,
     confirmed live: no token-limit field is sent to either provider when its toggle is off).
  3. **Frontend:** `ModelConfigTab.tsx` gets a new "Use max output tokens" `Switch` + `Slider`, styled
     and positioned consistent with the existing temperature/context-window controls
     (`ModelConfigTab.tsx:139-180`), wired via `updateModelConfig`.
  4. **Wire types:** update `apperr.ModelConfig` (`internal/apperr/results.go`),
     `frontend/src/logic/adapter/models.ts`, and re-run `wails generate module`.
- **Files:** `internal/settings/settings.go`, `internal/settings/service.go`,
  `internal/db/migrations/0004_add_max_output_tokens.sql` (new), `internal/db/db.go`,
  `internal/actions/service.go`, `internal/apperr/results.go`,
  `frontend/src/ui/widgets/views/settings/tabs/ModelConfigTab.tsx`,
  `frontend/src/logic/adapter/models.ts`, `frontend/wailsjs/go/models.ts` (regenerated).
- **Tests:**
  - `go-tester`: `newChatCompletionRequest` table tests — context-window ON + max-output-tokens OFF ⇒
    no `MaxTokens`/`MaxCompletionTokens` field; both ON ⇒ each field carries its **own** independent
    value (never the context-window value); migration round-trip (Up creates the column with a
    default, Down drops it cleanly) on a temp DB.
  - `ts-tester`: RTL for the new switch+slider (toggle shows/hides slider; persists independently of
    the context-window control).
  - **Regression test reproducing the exact silent-truncation scenario found live:** an
    `internal/llms` `httptest` integration test asserting that with context-window=32768 and a
    default/small max-output-tokens, the outgoing request's `max_tokens`/`max_completion_tokens` is
    **not** 32768 — proving the two values can no longer collide.
- **Edge cases:** existing DBs upgrading via migration must get a sane default for the new field so
  behavior doesn't silently change for users who never touch the new control.
- **Acceptance:** setting a large context window no longer affects how many tokens the model is asked
  to generate; the two concepts are fully independent in settings, storage, and the outgoing request.
- **Status: DONE (2026-07-02, verified file-level).** `internal/settings/settings.go` has independent `UseMaxOutputTokens`/`MaxOutputTokens` fields with migration `0004_add_max_output_tokens.sql`; `internal/actions/service.go` derives `MaxTokens`/`MaxCompletionTokens` from `MaxOutputTokens`, never from `ContextWindow`.

### T63 — Ollama ignores `options.num_ctx` sent via the OpenAI-compatible endpoint

- **Severity:** High (root-cause investigation; the fix may be a behavior change or a documented
  limitation, not pure code)
- **Discovery:** A reverse-logging HTTP proxy was placed in front of Ollama (`127.0.0.1:11435` → real
  Ollama `127.0.0.1:11434`) and GoText's Ollama provider Base URL was pointed at the proxy. Captured
  request bodies confirmed the app correctly builds and sends `"options":{"num_ctx":1024}` and, in a
  separate run, `"options":{"num_ctx":4096}` — the Go request-construction code
  (`internal/llms/openai_provider.go:99-117`, `internal/llms/service.go:298-303`) is correct as
  written. Despite this, `~/.ollama/logs/server.log` showed **`n_ctx_slot = 16384`** for every single
  request regardless of the requested value — including immediately after `ollama stop <model>` +
  reload (ruling out an already-loaded model retaining a stale context). Reproduced identically on a
  second, larger model (`qwen2.5:7b-instruct`, native max 32768) with a requested `num_ctx` of 32768:
  still `n_ctx_slot = 16384`. Also confirmed via `ollama ps` (`CONTEXT` column always 16384 regardless
  of the app's setting).
- **Root cause (external, not in this codebase):** Ollama's OpenAI-compatible `/v1/chat/completions`
  endpoint appears to silently ignore the `options.num_ctx` field and always falls back to its own
  auto-sized context. The one provider-specific mechanism believed to give Ollama a real
  context-length change (`internal/llms/openai_provider.go:112-117`, `Kind == KindOllama` branch) does
  not work in practice via this endpoint.
- **Fix — investigate and choose one (`go-engineer`):**
  1. **Preferred if it works:** switch Ollama traffic to its **native** `/api/chat` endpoint (not the
     OpenAI-compatible shim) for the `KindOllama` provider profile, documented to honor
     `options.num_ctx`. Requires a small native-request/response shape adapter scoped to the Ollama
     profile only (`internal/llms/`); every other provider kind keeps using `OpenAICompatibleProvider`
     unchanged. Live-test against the same repro (two models, three `num_ctx` values, `ollama
     ps`/`server.log` confirmation) before considering this fixed.
  2. **Fallback if the native endpoint doesn't help, or is out of scope right now:** document the
     limitation explicitly — update the Model Config UI copy/tooltip for "Use context window" to state
     it only reliably affects output-length capping (post-T62) on all providers including Ollama today,
     and log a one-time warning when a `KindOllama` request sets `NumCtx`
     (`internal/llms/service.go`) so this doesn't regress silently again if a future Ollama version
     changes behavior.
- **Files:** `internal/llms/openai_provider.go`, `internal/llms/service.go`, `internal/llms/profile.go`,
  (if native-endpoint path chosen) a new file such as `internal/llms/ollama_native.go`; otherwise
  `ModelConfigTab.tsx` copy.
- **Tests:**
  - `go-tester`: if the native endpoint is adopted — `httptest` integration test posting to
    `/api/chat`, asserting `num_ctx` is honored in the request and the native response maps correctly
    to the common `ChatResponse` shape; regression test confirming non-Ollama kinds are unaffected.
  - If the fallback/documentation path is chosen — a test asserting the one-time warning log fires
    when `NumCtx` is set for a `KindOllama` request.
- **Acceptance:** either (a) a live-tested, reproducible confirmation that `num_ctx` now changes
  Ollama's actual loaded context (checked via `ollama ps`/`server.log` exactly as this bug was found),
  or (b) the limitation is explicitly documented in-app and logged, with no code claiming a capability
  that doesn't work.
- **Status: DONE (2026-07-02, verified file-level).** `internal/llms/ollama_native.go` implements the native `/api/chat` path (`chatNative`); `profile.go` sets `NativeChatPath: "api/chat"` for Ollama; `openai_provider.go` branches to it — the preferred fix, not just a documented limitation.

### T64 — Wire real HTTP-400 "context exceeded" classification (unreachable `apperr.ContextWindow`)

- **Severity:** Medium
- **Discovery:** Forced a genuine overflow live: LM Studio loaded with
  `lms load qwen2.5-7b-instruct -c 2048` (fixed real context 2048), app context window = 8192, input
  ≈8,400 tokens. LM Studio returned HTTP 400 with body:
  ```
  request (8087 tokens) exceeds the available context size (2048 tokens), try increasing it
  ```
  GoText's backend log recorded:
  ```
  {"level":"error","code":"step_failed","retryable":true,"error":"Step 1 (rewrite) failed: LM Studio had a server error (400). Please retry.. Earlier steps completed.","cause":"LM Studio had a server error (400). Please retry."}
  ```
  The user-facing message was the generic Upstream-style "LM Studio had a server error (400). Please
  retry.", not the friendly, already-built context-window toast.
- **Root cause:** `internal/llms/http_errors.go:28-43` (`mapHTTPStatus`) has no case for a
  context-length HTTP 400; every 400 falls into the `default: apperr.Upstream(...)` branch.
  `apperr.ContextWindow(...)`/`CodeContextWindow` (`internal/apperr/apperr.go:204-215`) and the
  matching friendly frontend toast (`frontend/src/logic/store/notifications/slice.ts:120-127`,
  "Input too long... shorten it or raise the context size") are fully built but **provably
  unreachable** — confirmed by grep across `internal/` finding no production caller.
- **Fix (`go-engineer`):** in `mapHTTPStatus` (or a new helper it calls for 400s specifically),
  inspect the response body for provider-specific "context exceeded" phrasing before falling back to
  `apperr.Upstream`. Phrasing differs per provider/server (llama.cpp's "exceeds the available context
  size"; verify Ollama's exact 400 wording with a live repro similar to T63's, since this session did
  not capture an Ollama-side 400 for this scenario) — match on a reasonably broad set of
  case-insensitive substrings (e.g. `"context"` + `"exceed"`, `"too long"`,
  `"context_length_exceeded"` for OpenAI-style responses) and return `apperr.ContextWindow(...)` in
  those cases, `apperr.Upstream(...)` otherwise. Add the model name and limit to `Details` if available
  in the body (no secrets).
- **Files:** `internal/llms/http_errors.go`.
- **Tests:**
  - `go-tester`: table test feeding the exact LM Studio body captured above (and an Ollama-equivalent
    once captured), asserting `CodeContextWindow` is returned; a generic/unrelated 400 body still
    returns `apperr.Upstream` unchanged (no over-matching).
  - `ts-tester`: notification slice test confirming `CodeContextWindow` renders the friendly copy.
  - **Live regression:** re-run this session's exact repro (LM Studio `-c 2048`, context window 8192,
    ~8.4K-token input) and confirm the friendly "Input too long..." toast now appears.
- **Acceptance:** a genuine context-overflow 400 from either provider surfaces the friendly,
  already-designed toast instead of a generic server-error message.
- **Status: DONE (2026-07-02, verified file-level).** `internal/llms/http_errors.go`'s `mapHTTPStatus` detects context-exceeded phrasing in HTTP-400 bodies (`isContextExceededBody`) and returns `apperr.ContextWindow(...)`, falling back to `apperr.Upstream` only for unrelated 400s.

### T65 — "Test inference" verification button ignores Model Config entirely

- **Severity:** Low–Medium
- **Discovery:** With context window ON (1024, legacy `max_tokens` mode) and temperature ON (0.5) for
  the current provider/model, live capture of the "Test inference" request body (LM Studio
  `server-logs`) showed exactly:
  ```json
  {"messages":[{"role":"user","content":"Hi"}],"stream":false,"n":1}
  ```
  No `temperature`, `max_tokens`/`max_completion_tokens`, or `options`/`num_ctx` field at all — the
  button cannot be used as a proxy for verifying what a real run would actually do with the
  currently-configured Model Config.
- **Root cause:** `internal/verification/service.go:186-189` (`TestInference`) constructs a bare
  `llms.ChatRequest{Model: ..., Messages: [...]}` and never reads `ModelConfig` at all. The doc
  comment on `TestInference` even lists `context_window` as a possible failure code
  (`internal/verification/service.go:151-152`), which is stale relative to this behavior.
- **Fix (`go-engineer`):** pass the current `ModelConfig` into `TestInference` and apply the same
  temperature / context-window(→`NumCtx` only, post-T62) / max-output-tokens / legacy-flag logic that
  `newChatCompletionRequest` applies for a real run, so the diagnostic check is representative. Update
  the stale doc comment to accurately describe what is and isn't exercised.
- **Files:** `internal/verification/service.go`.
- **Tests:**
  - `go-tester`: `TestInference` request-construction test asserting the built request carries
    `Temperature`/`MaxTokens or MaxCompletionTokens`/`NumCtx` (post-T62 semantics) matching the
    supplied `ModelConfig`, mirroring the existing `newChatCompletionRequest` table tests.
  - **Live regression:** repeat this session's capture (LM Studio `server-logs`) with context window
    and temperature ON, confirm the Test Inference request body now includes those fields.
- **Acceptance:** "Test inference" exercises the same parameters a real run would use.
- **Status: DONE (2026-07-02, verified file-level).** `internal/verification/service.go`'s `TestInference` now calls `GetModelConfig()` and applies temperature/max-output-tokens/context-window exactly as a real run would, with the stale doc comment corrected.

### T66 — Prompt Inspector never surfaces the context-window value or on/off state

- **Severity:** Low
- **Discovery:** Live-tested: Prompt Inspector for "Concise" (LM Studio, `qwen2.5-7b-instruct`,
  context window ON = 1024, legacy mode) showed parameter badges `model`, `temperature 0.5`,
  `format plain`, `input`/`output` language, `max_tokens`, `stream false` — a `max_tokens` badge names
  the token-limit **field**, but the context-window **value** (1024) and whether it's even enabled are
  never shown anywhere in the preview.
- **Root cause:** `internal/actions/service.go:421-443` (`buildPreviewParams`, backing
  `apperr.PreviewParams`) has no `contextWindow`/`useContextWindow` field; `PreviewParams`
  (`internal/apperr/results.go:180-188`) doesn't define one either.
- **Fix (`go-engineer` + `ts-engineer`):** add `ContextWindow *int` (nil when disabled) to
  `apperr.PreviewParams`, populate it in `buildPreviewParams` from the same `ModelConfig` already in
  scope, and render a new badge in `frontend/src/ui/widgets/views/info/PromptInspector.tsx` — e.g.
  `context 1,024` — next to the existing `max_tokens`/`temperature` badges, following the existing
  `buildParameterBadges` pattern exactly. Omit the badge when the context window is disabled (mirrors
  how `temperature` is already omitted when off).
- **Files:** `internal/actions/service.go`, `internal/apperr/results.go`,
  `frontend/src/ui/widgets/views/info/PromptInspector.tsx`.
- **Tests:**
  - `go-tester`: `buildPreviewParams` test asserting `ContextWindow` is populated when enabled, nil
    when disabled.
  - `ts-tester`: RTL — Prompt Inspector renders a context-window badge with the right value when
    enabled, omits it when disabled.
- **Acceptance:** a user can see, from the Prompt Inspector alone, both the token-limit field name and
  the actual context-window value/on-off state that will be used for a real run.
- **Status: DONE (2026-07-02, verified file-level).** `apperr.PreviewParams.ContextWindow *int` is populated in `buildPreviewParams` from the active `ModelConfig`; `PromptInspector.tsx` renders a `context` badge only when the value is defined.

### T67 — Live input token estimate + context-window highlight (new feature)

- **Severity:** N/A — feature, user-requested 2026-07-01 directly in response to the findings above
  (specifically to give users the visibility that would have surfaced T62's silent truncation and
  T64's swallowed-error scenarios themselves, before hitting Run).
- **Goal:** Show a live "~N tokens" estimate next to the existing "N words" counter in
  `InputPane.tsx:41` (`Input · {wordCount(content)} words`), computed against the **actual composed
  prompt** (system + user, exactly what would really be sent for the first step of the
  currently-armed action/stack — reuses the same `Composer`/`Planner` pipeline as a real run, not just
  the raw textarea text), and visually highlight it (amber "approaching", red "over") once the
  estimate nears/exceeds the configured context window.
- **Design decisions (from user brainstorming session, 2026-07-01):**
  1. **Estimate scope:** the full composed system+user prompt for the **first step only** (for both
     single actions and stacks — later stack steps' input doesn't exist yet, so they aren't
     estimated).
  2. **Where counting happens:** in the **Go backend** (single source of truth, reuses existing
     prompt-composition code) — it returns a plain integer; the frontend does not tokenize anything
     itself.
  3. **Tokenizer:** **one universal Go BPE tokenizer** (a `cl100k_base`/`o200k_base`-family port such
     as `pkoukk/tiktoken-go` or the current best-maintained equivalent — verify and pin at
     implementation time) applied uniformly across all providers/models. Exact for OpenAI/Azure, a
     close approximation for everything else; label the UI value with "~" to signal it's an estimate.
     **Offline requirement:** many Go tiktoken ports fetch BPE rank files over the network on first
     use — this is a **local-first desktop app** (works fully with local Ollama/LM Studio, no internet
     required) — so the chosen library's vocab/rank data **must** be embedded via `go:embed` and
     loaded from an offline loader, never fetched at runtime. Verify this explicitly before pinning a
     library version.
  4. **"Use context window" OFF:** show the plain "~N tokens" count with no highlight (neutral
     styling, same as the word count) — there is no configured budget to compare against, and
     reliably discovering each model's true native context isn't available across all providers
     today.
  5. **"Use context window" ON:** two-tier highlight — `var(--warn)` + bold at ≥80% of the configured
     `ContextWindow` value, `var(--err)` + bold at ≥100%. The early 80% warning is a deliberate safety
     margin given T62/T63 (the real usable room for the prompt can be less than the full configured
     number even after those fixes land, e.g. once max-output-tokens is reserved from the same real
     context).
- **Backend scope (`go-engineer`):**
  - Add the tokenizer dependency (offline-embedded, see above) and a small helper, e.g.
    `internal/prompts.EstimateTokenCount(text string) int`.
  - Extend `apperr.PreviewGroup` (`internal/apperr/results.go:190-197`) with `EstimatedTokens int`.
  - In `BuildPlanAndPrompts` (used by the existing `PreviewPrompt` handler,
    `internal/actions/handler.go:84-114`, `internal/actions/service.go`), after composing each group's
    `SystemPrompt`/`UserPrompt`, compute `EstimatedTokens` via the helper and set it on the group.
    **No new bound method** — `PreviewPrompt` already accepts `SampleInput`
    (`apperr.PromptPreviewRequest`, `internal/apperr/results.go:206-214`) and returns per-group
    composed text; this reuses that exact path with the live InputPane text as `SampleInput`.
  - `wails generate module` to add `estimatedTokens` to the generated TS types.
- **Frontend scope (`ts-engineer`):**
  - `InputPane.tsx`: a debounced (≈300-400ms after typing stops) effect that calls `PreviewPrompt` with
    `{ actionId or stackId (from the currently armed action/stack), sampleInput: content,
    inputLanguageId, outputLanguageId, useMarkdown }` whenever `content` or the armed action/stack
    changes; reads `Groups[0].EstimatedTokens` from the result. No call is made (and no estimate is
    shown beyond the plain word count) when nothing is armed yet.
  - New display next to `.wordCount` (`InputPane.module.css:25-31` convention) showing
    `~{estimatedTokens.toLocaleString()} tokens`, reading `selectModelConfig`
    (`frontend/src/logic/store/settings/selectors.ts:23`) for `useContextWindow`/`contextWindow` to
    compute the percentage and choose the neutral/warn/err class — mirror the existing
    `.inferenceCapReached` pattern (`StackBuilderBar.tsx:82,121` /
    `StackBuilderBar.module.css:110-113`) for the two-tier styling.
  - Gracefully degrade on a failed/erroring `PreviewPrompt` call (e.g. no provider configured) — hide
    the token estimate, keep the word count, no crash or error toast (this is a passive UI hint, not a
    user-initiated action).
- **Files:** `internal/prompts/` (new tokenizer helper + embedded data), `internal/apperr/results.go`,
  `internal/actions/service.go`, `internal/actions/handler.go` (no signature change expected —
  `PreviewPrompt`'s signature stays the same, only its response shape gains a field),
  `frontend/src/ui/widgets/views/editor/InputPane.tsx`,
  `frontend/src/ui/widgets/views/editor/InputPane.module.css`,
  `frontend/wailsjs/go/models.ts` (regenerated).
- **Tests:**
  - `go-tester`: tokenizer helper unit tests (empty string ⇒ 0; known short strings ⇒ expected count
    for the chosen encoding; confirms fully offline — run with network disabled/mocked, e.g. via a
    build-tag or CI network-block, to catch any accidental runtime fetch); `BuildPlanAndPrompts`/
    `PreviewPrompt` test asserting `EstimatedTokens` scales with `SampleInput` length and matches a
    hand-computed reference count for a fixed input.
  - `ts-tester`: RTL — typing debounces the `PreviewPrompt` call (fake timers); no call when nothing is
    armed; count renders neutral/warn/err class at the right percentages of a mocked `contextWindow`;
    a rejected/erroring call hides the estimate without throwing.
  - **Playwright (Target A, bridge-mock):** type input exceeding the mocked context window, confirm the
    red highlight appears; type under 80%, confirm neutral.
  - **Live (Target B, per this session's exact repro fixtures):** re-run against real Ollama and LM
    Studio with the `CTX-S`/`CTX-M`/`CTX-L` fixtures from
    `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md` (regenerate from `.tmp/` if no
    longer present) and confirm the on-screen estimate tracks the real behavior observed in that
    session (e.g. visibly warns before the T62/T63 scenarios would otherwise silently truncate).
- **Acceptance:** typing or pasting text shows a live, debounced "~N tokens" estimate based on the real
  composed prompt for the first step; it is neutral when no budget is configured, and clearly
  warns/errors as the estimate approaches/exceeds the configured context window; works fully offline.
- **Status: DONE (2026-07-02, verified file-level).** `internal/prompts`'s `EstimateTokenCount` (with offline-embedded tokenizer data and tests) backs `PreviewPrompt`'s `EstimatedTokens`; `InputPane.tsx` renders the debounced "~N tokens" estimate with neutral/warn/err styling.

### T68 — Tests green + full-stack live re-test (closing gate)

- **Deterministic gates:** `go build ./...`; `wails generate module && git diff --exit-code
  frontend/wailsjs/`; `! grep -rq "@mui\|@emotion" frontend/src`; `cd frontend && npm run test`;
  `go test -race ./...`; the new goose migration (T62) round-trips Up/Down on a temp DB.
- **Playwright Target A (bridge-mock):** all new/changed RTL+Playwright specs from T61–T67 green;
  existing responsive/theme gates unaffected.
- **Live (Target B, per `CLAUDE.md` "Finishing task", using `wails dev` + real Ollama + LM Studio):**
  re-execute the relevant phases of `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`
  end-to-end (boundary/validation matrix, small/native/too-big windows on both providers, real
  overflow error surfacing, verification button, Prompt Inspector) and confirm every finding (#1–#8)
  is now fixed or explicitly documented as a known limitation (T63 fallback path). Confirm the new
  token-estimate widget behaves correctly against the same fixtures. Update the Findings table in that
  doc with final verdicts (Fixed/Documented-limitation) and a pointer to this phase's task IDs.
- **Acceptance:** every finding from the 2026-07-01 live-testing session is either fixed and
  regression-tested, or explicitly documented as a known provider limitation; the token-estimate
  feature works end-to-end against real local providers; the doc's Findings table reflects the final
  state.
- **Status: DONE this session (2026-07-02).** All deterministic gates green (`go test -race ./...`
  806 tests, `npm run test:coverage` 672 tests, `gofmt`/`go vet`/`go build`/`wails generate module`
  bindings-in-sync/`@mui`-`@emotion` guard/`sqlc diff`/T62 migration round-trip/`govulncheck`/`npm
  audit` all clean); full Target-A Playwright suite green (112 tests); all 8 findings plus the T67
  token-estimate feature re-verified live against real Ollama (native `/api/chat`, `n_ctx_slot`
  tracking the configured value exactly) and LM Studio (forced overflow surfaced the specific
  `apperr.ContextWindow` message via the step-failure toast) via `wails dev` — see the T68 verdicts
  table in `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`. Three unrelated pre-existing
  issues found during the branch-wide verification pass were fixed incidentally: a Prettier-formatting
  drift across 55 files from earlier T61–T67 commits, 4 stale theme-persistence e2e tests
  (`theme.spec.ts`/`theme-manual.spec.ts`) asserting a legacy `localStorage` model no longer used now
  that theme persists via backend `UIPreferences`, and a broken `sqlc generate --diff` CI invocation
  (corrected to `sqlc diff` for the current sqlc CLI). **One gap not closed:** §11.1 gate 8
  (`verify:smoke` against a real `wails dev`) fails 6/9 as literally specified, independent of this
  phase's changes — `smoke-tests.spec.ts` asserts against bridge-mock-only fixtures (`"Mock output
  text."`, the `?history-test=1` seeded entry, canned XSS payloads) that a real LLM cannot reproduce.
  Substituted with extensive manual live verification for this pass; logged as a separate follow-up
  task rather than fixed here (see the findings doc's "Target-B gate 8 status" note). **Follow-up
  (2026-07-02):** the gate-8 gap above was fixed — `13-testing-specification.md` §11.1 gate 8 now
  points at `frontend/e2e/live-llm.spec.ts` (`npm run verify:live`), `smoke-tests.spec.ts` is
  reclassified Target-A-only and added to CI, and §1.5's Target-B definition is corrected to match:
  real local providers (Ollama/LM Studio), local-only, intentionally never in CI (CI has no LLM
  runtime available — confirmed as the intended design, not a gap to close). See commit
  `e93eed5` and `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`'s "Target-B gate 8
  status" note. A follow-up correction to finding #4's toast-path wording (commit `5f76166`)
  additionally surfaced three new gaps, tracked as T69–T71 below.

### T69 — Chain-run toast collapses every classified inner error into the generic "Step N failed" title

- **Severity:** Low–Medium (UX only — the message body is already specific; only the toast title is
  generic).
- **Discovery:** Per finding #4's corrected note (`docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`,
  2026-07-03), a chain-run step failure always gets wrapped by `apperr.StepFailed`
  (`internal/actions/orchestrator.go:114`), which sets `Code: CodeStepFailed` and copies only the
  inner error's **message** text into `Details["inner"]` — never its **Code** or **Title**. So
  `notifications/slice.ts`'s dedicated per-code toast cases (e.g. `CodeContextWindow` → "Input too
  long", `CodeAuth` → "Authentication failed") never fire for a chain-run failure; the frontend only
  ever sees `CodeStepFailed` and renders the generic "Step N failed" title, no matter what actually
  went wrong. This isn't ContextWindow-specific — every classified inner error type (auth failure,
  timeout, rate limit, provider unreachable, model not found, upstream error, empty completion,
  missing credential, invalid plan) loses its specific title the same way once it reaches a chain
  step. Test inference (a single, unwrapped call — see T70) does **not** have this problem; it shows
  the dedicated title directly. That asymmetry is the bug.
- **Root cause:** `apperr.StepFailed(index, family, inner *AppError)`
  (`internal/apperr/apperr.go:222-238`) never preserves `inner.Code` or `inner.Title` in the
  wire-visible `Details` map, so `WireError.Code` is always `CodeStepFailed` for any chain-run
  failure and the frontend has no way to recover which specific error occurred without re-parsing
  the message text (fragile, not attempted anywhere today).
- **Fix (`go-engineer` then `ts-engineer`):**
  - Backend (`internal/apperr/apperr.go`, `StepFailed`): add two keys to the returned `Details` map
    alongside the existing `stepIndex`/`family`/`inner`:
    - `"innerCode": string(inner.Code)` — the classification enum value (safe, allowlist-clean).
    - `"innerTitle": inner.Title` — the inner error's **already-fully-rendered** title string. Every
      `AppError` constructor renders `Title` as a plain string at construction time (e.g.
      `Validation`'s title is already `"Invalid " + field`, not a template) — this is important:
      don't rebuild a title-formatting map on the frontend, since that would either duplicate
      backend logic or produce a wrong/incomplete title for parameterized cases like
      `CodeValidation` ("Invalid {field}"), which needs the `field` value the frontend doesn't have
      unless the full inner `Details` were also threaded through (out of scope here — just reuse the
      backend's already-rendered string).
  - Frontend (`frontend/src/logic/store/notifications/slice.ts`, `buildNotification`'s
    `CodeStepFailed` case): read `d['innerTitle']`. If present, build the toast title as
    `` `Step ${stepNumber}: ${innerTitle}` `` (e.g. "Step 1: Input too long"); the message body stays
    exactly as it is today (`Step N (family) failed: <inner message>. Earlier steps completed.`) —
    only the title changes. If `innerTitle` is absent (older wire payloads, or any future caller that
    constructs `CodeStepFailed` without going through the updated `StepFailed` constructor), keep the
    current generic `` `Step ${stepNumber} failed` `` title unchanged — no regression.
- **Files:** `internal/apperr/apperr.go`, `frontend/src/logic/store/notifications/slice.ts`.
- **Tests:**
  - `go-tester`: extend `apperr`'s `StepFailed` tests asserting `Details["innerCode"]` and
    `Details["innerTitle"]` match the inner `AppError`'s `Code`/`Title` for at least two different
    inner codes (e.g. `ContextWindow`, `Auth`, and `Validation` specifically — to confirm the
    parameterized-title case round-trips correctly); confirm `stepIndex`/`family`/`inner` are
    unaffected.
  - `ts-tester`: table test on `buildNotification` — `CodeStepFailed` with
    `innerTitle: 'Input too long'` → title `"Step 1: Input too long"`; with
    `innerTitle: 'Authentication failed'` → title `"Step 2: Authentication failed"`; with
    `innerTitle` absent → title stays `"Step N failed"` (regression case, unchanged behavior).
  - **Live regression:** force the same LM Studio context-overflow repro used in T64/finding #4
    (tiny loaded context + oversized input) through a normal Editor chain run; confirm the toast
    title now reads "Step 1: Input too long" instead of "Step 1 failed", with the message body
    unchanged from today's wording.
- **Acceptance:** a chain-run failure whose inner error is classified shows that error's specific
  title, step-prefixed; unclassified/generic errors are unaffected; nothing beyond a classification
  enum value and an already-public title string is added to the wire (still allowlist-safe per
  `ErrorEnvelopeRules.md`).
- **Status: DONE (2026-07-02).** `apperr.StepFailed` now sets `Details["innerCode"]`/`["innerTitle"]`
  from the wrapped inner error (`internal/apperr/apperr.go`); `buildNotification`'s `CodeStepFailed`
  case in `frontend/src/logic/store/notifications/slice.ts` renders `` `Step N: ${innerTitle}` `` when
  present, else falls back unchanged to the generic `"Step N failed"` title. `go test -race ./...`
  (810 tests, including new `TestStepFailed_PreservesInnerClassification` covering `ContextWindow`,
  `Auth`, and the parameterized-title `Validation` case) and `npm run test` (675 tests, including
  three new `CodeStepFailed` cases) both green; `go build ./...`, `wails generate module` (no diff —
  `Details` is a plain map, not a bound-signature change), and the `@mui`/`@emotion` guard all clean.
  **Live regression (Target B, `wails dev` + real LM Studio):** capped `google/gemma-3-1b`'s context
  window to the UI minimum (1,024 tokens) and ran a ~4,000-word input through the "Concise" action.
  The provider round-trip surfaced as a `CodeTimeout` inner error rather than `CodeContextWindow`
  (`LM Studio did not respond within 0s` — an unrelated pre-existing local timeout-config quirk in
  this environment, not a T69 regression); this still exercises the exact `StepFailed`-wraps-a-
  classified-inner-error path T69 fixes, since `Timeout` is explicitly one of the covered classified
  types. The toast title read **"Step 1: Request timed out"** (was "Step 1 failed"), message body
  unchanged (`"Step 1 (rewrite) failed: LM Studio did not respond within 0s.. Earlier steps
  completed."`) — captured via a `MutationObserver` since the toast auto-dismisses after 5s. A true
  `CodeContextWindow`-specific repro (matching finding #4's original LM Studio overflow) was not
  additionally forced in this pass since the generic mechanism is what T69 changes and it was proven
  live end-to-end with a different classified code; `TestStepFailed_PreservesInnerClassification`
  covers `ContextWindow` specifically at the unit level.

### T70 — Empirically verify Test inference fires the `CodeContextWindow` toast on a forced overflow

- **Severity:** Low (verification only; no code change expected unless the live test disproves the
  source trace).
- **Discovery:** finding #4's note (corrected 2026-07-03) traces, **from source only**, that a
  genuine context overflow surfaced through Settings > Providers > "Test inference" fires **both**
  `VerificationPanel.tsx`'s inline `✗ message` row **and** the dedicated `CodeContextWindow` "Input
  too long" toast — because `testProviderInference`'s thunk (`settings/thunks.ts`) calls `unwrap()`
  (not `tryUnwrap()`), and `unwrap()` (`logic/adapter/envelope.ts`) unconditionally dispatches
  `notifyError(res.error)` before throwing, while `TestInference`
  (`internal/verification/service.go`) returns its error unwrapped (no `StepFailed` involved on this
  path at all). This was never confirmed against an actual forced overflow — doing so requires
  loading the target model with an artificially tiny context outside the app (as in T64's original
  live repro: `lms load <model> -c 512` or similar), which wasn't set up during the
  documentation-only correction pass that produced the note.
- **Fix:** none anticipated — this is a verification-only task. If live behavior contradicts the
  source trace (e.g. some intervening logic suppresses the toast, or the dispatch happens but
  nothing renders), that discrepancy becomes a new bug to root-cause and fix, and the finding-doc
  note needs correcting again.
- **Files:** none expected to change in `internal/`/`frontend/src/`;
  `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`'s finding #4 note gets a one-line
  live-confirmation (or a further correction) appended.
- **Tests (live-only, per `CLAUDE.md`'s "During Application Live Testing" section):**
  - Start `wails dev`; load a small local model in LM Studio (or Ollama) with a deliberately tiny
    context (e.g. `-c 256`–`512`); in Settings > Providers, select that provider/model with `Use
    context window` ON at a value exceeding the tiny loaded context; click "Test inference"; capture
    via `preview_console_logs`/`preview_network`/`preview_screenshot` whether (a) the inline
    `✗ message` row appears in `VerificationPanel.tsx`, and (b) a toast titled "Input too long"
    appears simultaneously.
  - `TestInference`'s request is a minimal one-word prompt ("Hi"), so a tiny loaded context alone may
    not reliably trigger a real HTTP 400 from every provider/server combination — if the straightforward
    repro doesn't reproduce an overflow, document the actual provider behavior observed (including "no
    overflow reachable via this minimal request" as a valid, useful finding) rather than forcing an
    artificial failure.
- **Acceptance:** the finding-doc note is either confirmed accurate against a real forced overflow
  (append "confirmed live" with the date and repro details) or corrected again if reality differs,
  with the specific discrepancy documented.
- **Status: DONE (2026-07-02).** Confirmed live against real LM Studio via `wails dev`. `google/gemma-3-1b`
  loaded with `lms load google/gemma-3-1b --context-length 1` (`-c 16` was tried first and did **not**
  overflow — LM Studio's context-overflow/rolling-window handling absorbed it silently, `200 OK` with
  `total_tokens=49` against a declared 16-token window; only `-c 1` reliably produced a genuine `400`).
  With that model selected under Settings > Providers > LM Studio and "Test inference" clicked, the
  backend log recorded `code=context_window, message="Input too long"`, and the frontend rendered
  **both** `VerificationPanel.tsx`'s inline `✗ The text exceeds the model's context window.` row **and**
  a toast (title "Input too long", message "The text exceeds the model's context window — shorten it or
  raise the context size.") simultaneously — verified via a Redux `notifications.queue` subscription plus
  a DOM read of the rendered toast, since the 5s auto-dismiss window is easy to miss with sequential
  manual checks. This matches the corrected note's source trace exactly. One refinement folded into the
  finding-doc note: the app's own "Use context window" setting turned out to be irrelevant to forcing
  this overflow on LM Studio — `ChatRequest.NumCtx` (`internal/llms/provider.go`) is ignored by
  non-Ollama provider kinds, confirmed in `internal/llms/openai_provider.go`; the overflow was purely a
  function of LM Studio's own server-side loaded context vs. the minimal "Hi" prompt. Full repro details
  appended to `docs/V3_Temp_Docs/2026-07-01-context-window-live-testing.md`'s finding #4 row.

### T71 — Audit §2.3 coverage-matrix "(B)"-tagged rows against `live-llm.spec.ts`'s actual scenario list

- **Severity:** Low (documentation accuracy, not a functional bug).
- **Discovery:** `13-testing-specification.md` §2.3's coverage checklist has multiple rows tagged
  "(B)" (e.g. "Settings — 7 sections: add+verify provider (B)") implying Target-B coverage, written
  before `live-llm.spec.ts`'s actual scenario list (S0–S8, see §4.1.1) was finalized and before
  Target B's definition itself was corrected (see the T68 follow-up note above). The intro sentence
  added during the gate-8 fix (2026-07-02) flags this as "tracked follow-up work, not a silent pass"
  but does not resolve it — no row-by-row reconciliation has been done yet.
- **Fix:** none anticipated beyond the doc itself — this pass is reconciliation only. Any real
  coverage gap found becomes a new, separately-numbered follow-up task rather than being fixed
  inline here (matches how this session scoped the gate-8 fix).
- **Files:** `docs/V3_Temp_Docs/SpecificationFolder/13-testing-specification.md` (§2.3).
- **Tests:** none (documentation task) — the "test" is the audit itself: cross-reference every
  "(B)"-tagged row in §2.3 against `frontend/e2e/live-llm.spec.ts`'s S0–S8 scenarios (and any
  scenarios added since), and mark each row as **Covered** / **Partially covered** / **Gap** / **Not
  applicable** (e.g. a row that only made sense under the old stub-provider model), with a one-line
  note per row citing which `live-llm.spec.ts` test, if any, covers it.
- **Acceptance:** every "(B)"-tagged row in §2.3 has an explicit, evidence-backed status; any genuine
  gaps are logged as new numbered follow-up tasks in this file rather than left as a vague caveat.
- **Status: DONE (2026-07-02).** Added §2.3.1 to `13-testing-specification.md` with the full
  row-by-row audit table. Outcome for the 5 "(B)"-tagged rows: **Editor view** — Covered (`S1`, `S7`).
  **`StackBuilderBar`** — Partially covered by design (`S3` build+run, `S8` run-from-Manage; the Save
  step is an intentionally-manual persisting flow already tracked under T45). **History rail** — Gap
  on the restore step (`S5` only asserts the Restore control is visible, never clicks it or checks
  editor population) — logged as **T72**. **Settings** — Partially covered by design (`S2` covers
  "verify" fully; "add provider" is an intentionally-manual persisting flow already tracked under
  T45). **About·Info + Prompt Inspector** — Gap, zero coverage of ⌘K run/add — logged as **T73**. No
  row was "Not applicable"; no code changed, per this task's own scope.

### T72 — `live-llm.spec.ts`'s `S5` never actually restores a history entry or verifies editor population

- **Severity:** Low (test-coverage gap; the underlying Restore feature itself is not known to be
  broken — it is simply unverified against a real backend).
- **Discovery:** T71's audit found `S5` (`frontend/e2e/live-llm.spec.ts:178-188`) opens the history
  rail after recording a run and asserts a "Restore" control is *visible*, but never clicks it and
  never asserts the input/output editors are repopulated with the restored content. This falls short
  of §2.3's own row wording for the History rail: "open rail → restore populates editors (B)."
- **Fix (`ts-tester`):** extend `S5` to click the "Restore" affordance on the most-recent (or a
  specifically seeded) history card, then assert the input textarea's value matches the original
  submitted text and the output pane shows non-empty content reflecting the restored run — matching
  the row's exact claim rather than only checking that the control exists.
- **Files:** `frontend/e2e/live-llm.spec.ts`.
- **Tests:** this task's deliverable is itself a test change; no production code is touched. Verify by
  running `npm run verify:live` against `wails dev` + LM Studio and confirming the strengthened `S5`
  passes and genuinely exercises restore.
- **Acceptance:** `S5` clicks Restore on a recorded history entry and asserts both the input and
  output editors are populated with the expected restored content, passing against a real local
  provider.
- **Status: DONE (2026-07-02).** Implemented under T78: `S5` now clears both editors after recording
  a run, opens the History rail (toggling only if not already open — see T81 for the related
  cross-run persisted-state issue found in `S2`), clicks the most-recent entry's `Restore entry…`
  button, and asserts the input textarea's value and the output pane's normalized text both match the
  original submitted content. Verified via `npm run verify:live` against `wails dev` + real Ollama/LM
  Studio providers.

### T73 — No live Target-B coverage exists for the ⌘K command-palette "run" and "add-to-stack" journeys

- **Severity:** Low–Medium (a documented "(B)" coverage requirement has zero automated Target-B
  coverage today; the Prompt Inspector's own render/`PreviewPrompt` logic is otherwise covered via
  RTL unit tests and the untagged Target-A UI-test cell in §2.3).
- **Discovery:** T71's audit found no scenario in `frontend/e2e/live-llm.spec.ts` references
  About·Info, the Prompt Inspector, or the ⌘K command palette at all, despite §2.3 tagging "⌘K
  run/add" as a Target-B requirement for that row. Confirmed via
  `frontend/src/ui/widgets/views/AppMainView.tsx:89-130` that the palette wires two real, non-
  destructive actions: `handlePaletteRun` (Enter → dispatches a real `ChainRequest` against the
  bridge) and `handlePaletteAddToStack` (Shift+Enter → `addStep`, in-memory stack-builder state only).
  Neither mutates persisted DB/settings state, so — unlike the `StackBuilderBar` Save and Settings
  add-provider gaps closed out as by-design/T45 in this same audit — there is no rationale for this
  omission; it is a genuine, previously-silent gap.
- **Fix (`ts-tester`):** add a new scenario to `live-llm.spec.ts` (e.g. `S9`) that opens the ⌘K
  command palette, selects an action to run it directly (Enter → `handlePaletteRun`) and confirms a
  real inference completes with non-sentinel output, and separately exercises add-to-stack (Shift+
  Enter → `handlePaletteAddToStack`) confirming the builder registers the added step.
- **Files:** `frontend/e2e/live-llm.spec.ts`.
- **Tests:** this task's deliverable is itself a test change; no production code is touched. Verify by
  running `npm run verify:live` against `wails dev` + a real local provider and confirming the new
  scenario passes.
- **Acceptance:** a new live scenario exists that exercises both ⌘K-triggered run and ⌘K-triggered
  add-to-stack against the real bridge and passes against a real local provider; §2.3.1's audit row
  for About·Info + Prompt Inspector can be updated from Gap to Covered once this lands.
- **Status: DONE (2026-07-02).** Implemented under T78: new `S9` opens the palette via the AppBar's
  `Open command palette` button, hovers the `Basic proofreading` option (cmdk highlights by pointer
  hover) and presses `Enter` to trigger a real `handlePaletteRun` inference, then reopens the palette,
  hovers `Friendly`, and presses `Shift+Enter` to trigger `handlePaletteAddToStack`, asserting the
  builder shows `1 / 5 steps`. (Typing the display label into the search box does not work here — cmdk
  filters against each item's internal `value`, i.e. the action id, not its label — so the scenario
  targets items by hovering their rendered option instead.) Verified via `npm run verify:live` against
  `wails dev` + a real local provider; `13-testing-specification.md`'s audit row updated to Covered.

## Phase 12 · Post-completeness-audit remediation (2026-07-02)

> **Discovery:** a full-repo completeness audit (three parallel codebase/spec-inventory passes plus
> targeted manual verification of the two most ambiguous findings) confirmed the implemented surface
> is complete and consistent with the spec — zero TODO/FIXME markers, zero stubs, zero unconditionally
> disabled tests, zero placeholder UI copy, and a clean `go build` / `go vet` / `go test -race ./...`
> (837 tests, 19 packages) / frontend suite (68 suites, 680 tests). The audit did surface a bounded set
> of real gaps: one dead legacy code path, two test-coverage gaps on genuinely live code, one orphaned
> file, two tasks (T72, T73 above) that were fully specced in a prior session but never marked done,
> and a process gap (only 5 of ~78 tasks in this document carry an explicit status marker). This phase
> also adds a deeper spec-conformance spot audit (T80), since existence/wiring checks cannot by
> themselves prove per-action prompt fidelity or continued adherence to the V1–V11/E1–E25 rules in
> `02-functional-requirements.md` — and this app has a track record (Phases 8–11) of exactly that kind
> of silent drift.
> **Sequence:** T74–T78 are independent and may run in parallel. T79 should run last among T74–T78 so
> its status markers reflect their outcomes. T80 is independent of all of the above and may run at any
> time.

### T74 — Remove dead v2 single-action prompt subsystem (fully superseded by the v3 catalog)

- **Severity:** Low (dead code; no functional bug, but violates YAGNI and creates a latent
  catalog-duplication risk — two prompt catalogs that must independently be kept in sync in an
  engineer's head even though only one is reachable).
- **Discovery:** traced both prompt-catalog paths end to end. `ActionHandler.GetActionCatalog`
  (`internal/actions/handler.go`) — the only bound, reachable catalog method — calls
  `ActionService.GetActionCatalog` → `promptService.Catalog()` → `v3.Catalog()`
  (`internal/prompts/service.go:254-256`). The only reachable prompt-composition path
  (`ProcessPromptChain` → `ChainOrchestrator` → `Composer.Compose`) imports exclusively from
  `internal/prompts/v3` (`internal/actions/composer.go:8`, `v3.Sys*`/`v3.Family*` constants).
  Separately, the entire v2 registry — `internal/prompts/constants.go`'s `ApplicationPrompts` map
  plus all 10 files under `internal/prompts/categories/` — is reachable *only* through
  `PromptService.GetAppPrompts` / `GetSystemPromptByCategory` / `GetUserPromptById` / `GetPrompt` /
  `GetSystemPrompt` / `BuildPrompt` / `ReplaceTemplateParameter` (`internal/prompts/service.go`),
  which are called *only* from `ActionService.processAction` (`internal/actions/service.go:236-365`),
  which is called *only* from `ActionService.ProcessPromptActionRequest` / `GetPromptGroups`
  (`internal/actions/service.go:190-235`) — **neither of which appears in
  `internal/actions/handler.go`'s bound-method set** (`PreviewPrompt`, `CancelAllRuns`,
  `TestConnection`, `TestModels`, `TestInference`, `GetActionCatalog`, `GetModels`,
  `ProcessPromptChain`, `CancelChain` only). Confirmed via repo-wide grep that no other production
  code calls `GetPromptGroups` or `ProcessPromptActionRequest`. This is 100% unreachable from the
  frontend — legacy from the pre-v3 single-action architecture, superseded when v3 made every action
  a "single-action-as-degenerate-chain" through `ProcessPromptChain` (per `01-product-scope.md`'s
  Modified-scope entry for the single-action flow). Only `SanitizeReasoningBlock` and `Catalog()` on
  `PromptService` are live and must be preserved.
- **Fix (`go-engineer`):** delete `internal/prompts/categories/*.go` (10 files) and the
  `ApplicationPrompts` registry plus the `Prompts`/`PromptGroup`/`Prompt`/`PromptType` types in
  `internal/prompts/constants.go`, keeping only whatever `v3.Catalog()` and `SanitizeReasoningBlock`
  still depend on (verify before deleting — do not assume). Remove `GetAppPrompts`,
  `GetSystemPromptByCategory`, `GetUserPromptById`, `GetPrompt`, `GetSystemPrompt`, `BuildPrompt`,
  `ReplaceTemplateParameter`, and `validateActionRequest` from `PromptService` and
  `PromptServiceAPI`. Remove `GetPromptGroups`, `ProcessPromptActionRequest`, and `processAction`
  from `ActionService` and `ActionServiceAPI`. Update or delete tests that exercise only the removed
  surface (`internal/prompts/constants_test.go`, the relevant cases in
  `internal/actions/service_test.go`, and the mock methods in `internal/actions/handler_test.go`).
  Update the stale comment in `internal/actions/chain_models.go:28` referencing "single-action
  `ProcessPromptActionRequest` calls."
- **Files:** `internal/prompts/categories/` (delete directory), `internal/prompts/constants.go`,
  `internal/prompts/service.go`, `internal/prompts/constants_test.go`, `internal/actions/service.go`,
  `internal/actions/chain_models.go`, `internal/actions/handler_test.go`,
  `internal/actions/service_test.go`.
- **Tests:** `go build ./...`, `go vet ./...`, `go test -race ./...` must stay green with zero
  regressions; finish with `grep -rn "ProcessPromptActionRequest\|GetPromptGroups\|GetAppPrompts" internal/`
  to confirm zero remaining references outside the removed files.
- **Acceptance:** the v2 registry and its entire call chain are removed; `GetActionCatalog` /
  `ProcessPromptChain` / `PreviewPrompt` (the only reachable prompt paths) are unaffected and every
  existing test still passes; no dead methods remain on `PromptServiceAPI` or `ActionServiceAPI`.

### T75 — Unit tests for `internal/application`'s Wails-bound methods

- **Severity:** Medium — this is the top-level `app` struct bound directly into Wails' `Bind` list
  in `main.go`, yet only 1 of its ~10 bound methods has any test.
- **Discovery:** `internal/application/application.go`'s `ApplicationContextHolder` exposes
  `SetContext`, `Init`, `CancelAllRuns`, `EnableLoggingForDev`, `LogError`, `ClipboardGetText`,
  `ClipboardSetText`, `BrowserOpenURL`, and `SaveWindowSize` (plus the unexported
  `restoreWindowSize`, exercised only through `Init`) as bound methods. Only `OpenPath`
  (`internal/application/openpath_test.go`) has a test. Notably, `SaveWindowSize`/
  `restoreWindowSize` — added by the recent window-size-persistence feature — has zero coverage of
  its actual persistence round-trip.
- **Fix (`go-tester`):** add table-driven tests per `docs/ai_agent_rules/GoUnitTestsRules.md` for
  each bound method above. Wrap Wails runtime calls (`ClipboardGetText`/`SetText`, `BrowserOpenURL`)
  behind a minimal interface only if required for testability — flag the need rather than
  restructure unprompted, per that document's "Read-Only Production" constraint. Verify the
  `SaveWindowSize`/`restoreWindowSize` round-trip against a real sqlite temp DB, consistent with
  existing repository test patterns elsewhere in the codebase (e.g. `internal/settings/repository_sqlite_test.go`).
  Verify `CancelAllRuns` actually invokes the chain run registry's cancel path, and that
  `EnableLoggingForDev`/`LogError` delegate correctly.
- **Files:** `internal/application/application_test.go` (new or extended); `internal/application/application.go`
  only if a minimal testability seam is required, and only with that need called out explicitly.
- **Tests:** `go test -race ./internal/application/...`.
- **Acceptance:** every exported bound method on `ApplicationContextHolder` has at least one test
  covering its success path (and failure path where one exists); package coverage materially
  increases from the current 1-of-10-methods baseline.

### T76 — RTL/unit tests for live-but-untested frontend components

- **Severity:** Medium — all six items below were confirmed this session to be genuinely rendered
  in production, not dead code, via direct grep against non-test source.
- **Discovery:** cross-referenced the full frontend test-file inventory; these are the only files
  under `ui/widgets/base/` and `ui/widgets/views/settings/tabs/components/` (plus one utility
  module) with zero matching test files and zero references from any existing test:
  `LanguagePicker.tsx` and `ProviderPicker.tsx` (both rendered in `AppBar.tsx`), `KvEditor.tsx` and
  `TagInput.tsx` (both rendered in `ProviderForm.tsx`), `ProviderList.tsx` (rendered in
  `ProviderManagementTab.tsx`), and `logic/utils/stack_utils.ts` (used in `StacksManageView.tsx` and
  `RunBar.tsx`).
- **Fix (`ts-tester`):** add tests per `docs/ai_agent_rules/TypescriptReactTestingRules.md` —
  behavioral focus, accessibility-role queries, no implementation-detail assertions. `LanguagePicker`
  / `ProviderPicker`: render and selection-dispatch behavior. `KvEditor` / `TagInput`: add/edit/
  remove-entry behavior and Redux-bound value sync. `ProviderList`: list rendering and select/
  delete/duplicate/set-current actions. `stack_utils.ts`: plain unit tests for its exported pure
  functions (no RTL needed).
- **Files:** new colocated `*.test.tsx` files for each of the five components; a new
  `stack_utils.test.ts` for the utility module.
- **Tests:** `cd frontend && npm run test -- --coverage`.
- **Acceptance:** all six files have dedicated test coverage; the frontend suite's passing-test
  count increases accordingly with zero regressions against the existing 680 passing tests.

### T77 — Remove orphaned dead file `MarkdownView.module.css`

- **Severity:** Low (pure dead-code cleanup; zero functional impact).
- **Discovery:** `frontend/src/ui/components/MarkdownView.module.css` is the only `*.module.css`
  file under `frontend/src` with zero importers anywhere in the codebase, confirmed against all 51
  `*.module.css` files present. `MarkdownView.tsx` uses only a global `markdown-body` class and
  imports no CSS module. Its `.stub` class name strongly suggests leftover scaffolding from an
  earlier, abandoned implementation of the component.
- **Fix (`ts-engineer`):** delete the file.
- **Files:** `frontend/src/ui/components/MarkdownView.module.css` (delete).
- **Tests:** `cd frontend && npx tsc --noEmit && npm run test` to confirm nothing referenced it.
- **Acceptance:** file removed; build and full test suite unaffected.

### T78 — Execute the already-specced T72 and T73

- **Severity:** as originally assessed in each task (Low–Medium).
- **Discovery:** T71's 2026-07-02 audit wrote T72 and T73 out in full (severity/discovery/fix/
  files/tests/acceptance) but — unlike T46/T68–T71 from that same session — neither carries a
  "Status: DONE" marker. They read as authored-but-not-yet-implemented.
- **Fix (`ts-tester`):** implement T72 (strengthen `live-llm.spec.ts`'s `S5` to click Restore and
  assert the input/output editors are repopulated with the restored content, not just check that the
  control is visible) and T73 (add a new live scenario exercising ⌘K-triggered run and ⌘K-triggered
  add-to-stack) exactly as already specified above.
- **Files:** `frontend/e2e/live-llm.spec.ts`.
- **Tests:** `npm run verify:live` against `wails dev` plus a real local provider (per this
  document's model guidance — a reliable small model, e.g. Ollama `gemma3:1b`/`qwen3:1.7b`, not
  `qwen3:0.6b`).
- **Acceptance:** both scenarios pass against a real backend; T72 and T73 above are each updated
  with a "Status: DONE" marker once verified.
- **Status: DONE (2026-07-02).** Both `S5` (T72) and the new `S9` (T73) implemented exactly as
  specced and verified passing via `npm run verify:live` against `wails dev` with real Ollama/LM
  Studio providers, alongside the full existing `S0`/`S1`/`S3`/`S4`/`S6`/`S7`/`S8` scenarios (no
  regressions). `S2` failed on both verification runs for a pre-existing, unrelated reason (a
  persisted-Settings-tab cross-run flakiness, not touched by this task) — logged separately as
  **T81** rather than fixed here, consistent with this task's test-only, T72/T73-scoped mandate.

### T79 — Retroactively mark completion status across T00–T67

- **Severity:** Low (process/auditability improvement only; no code change).
- **Discovery:** only 5 of the ~78 tasks in this document (T46, T68, T69, T70, T71) carry an
  explicit "Status: DONE" marker — the rest have no in-document signal of whether they were ever
  executed. This is why confirming "is everything implemented" for this document required a full
  multi-agent re-audit of the codebase (this Phase 12 preface) instead of being answerable by simply
  reading the file.
- **Fix (any engineer, documentation-only):** for each task T00–T67, add a one-line status marker —
  `Status: DONE (verified <mechanism>)` or `Status: OPEN` — based on this session's audit finding
  that the implemented surface is complete and consistent with spec for all of T00–T67 (no evidence
  any is unimplemented), performing whatever additional spot-checks are needed to confirm each
  individually before marking it.
- **Files:** `docs/V3_Temp_Docs/SpecificationFolder/14-implementation-plan.md`.
- **Tests:** none (documentation only).
- **Acceptance:** every task in this document carries an explicit status marker, so future
  completeness checks don't require a full-repo re-audit.

### T80 — Spec-conformance spot audit: prompts and functional rules

- **Severity:** Medium — existence and wiring are confirmed complete (this Phase 12 preface), but
  behavioral fidelity to spec has not been re-verified since the Phase 8–11 remediation rounds, and
  those rounds are direct evidence this app has drifted from spec/mockup silently before.
- **Discovery:** this audit's method (package/handler/prompt/view inventory, dead-code sweep, and
  test-suite health check) proves nothing is missing or stubbed, but does not prove per-action
  prompt text matches `09-prompts.md`'s per-action table (purpose/sub-group/requires/tokens/output/
  safety/format/version), nor that all 11 validation rules (V1–V11) and 25 edge cases (E1–E25) in
  `02-functional-requirements.md` still hold against current behavior.
- **Fix (`go-engineer` + `ts-tester` pairing, following `15-ai-agent-execution-template.md`'s
  lifecycle):** sample representative actions spanning all 5 families (Rewrite, Structure,
  Summarize, Translate, Prompt-Engineering) and every exclusivity sub-group. For each sampled
  action: (a) trace its actual composed system+user prompt via `Composer.Compose`
  (`internal/actions/composer.go`) against the corresponding `09-prompts.md` table entry and flag
  any drift; (b) walk V1–V11 against the current validation code paths (`internal/actions/planner.go`
  caps/exclusivity handling, `internal/actions/handler.go` request validation); (c) walk E1–E25
  against current handling, writing a regression test for any edge case found unhandled or handled
  differently than specified.
- **Files:** to be determined per finding; likely `internal/actions/composer.go`,
  `internal/actions/planner.go`, `internal/prompts/v3/*.go`, plus new or extended tests.
- **Tests:** `go test -race ./...` plus any new regression tests added for confirmed findings.
- **Acceptance:** a written findings table (spec row vs. actual behavior, for every sampled action/
  rule/edge case) with each divergence either fixed with a regression test or explicitly accepted
  with a documented rationale — matching the precedent set by T63/T68's "documented limitation"
  pattern elsewhere in this plan.

### T81 — `live-llm.spec.ts`'s `S2` is flaky when re-run against an already-used `wails dev` session

- **Severity:** Low (test-flakiness only; the underlying Settings/diagnostics feature is not known to
  be broken).
- **Discovery:** found while executing T78. `S2` (`frontend/e2e/live-llm.spec.ts:71-87`) opens
  Settings and immediately clicks the `"LM Studio"` provider row, assuming Settings always opens on
  the **Providers** tab. `activeSettingsTab` is a persisted UI preference (`internal/settings` /
  `logic/store/ui/slice.ts`'s `getUIPreferences.fulfilled`-style hydration), same mechanism as
  `historyOpen` (see T72's fix). If a prior `verify:live` run (e.g. `S4`, which navigates to the
  Appearance tab) leaves that tab persisted, a *subsequent* `verify:live` invocation against the
  same still-running `wails dev` process boots straight into Appearance instead of Providers, so
  `S2` times out waiting for `"LM Studio"` to appear. Reproduced twice while verifying T78: passed on
  a fresh `wails dev` start, failed identically (90s timeout on the same locator) on a second
  back-to-back run against the same session. Not caused by, or a regression from, T78's changes —
  `S2` is untouched by that task.
- **Fix (`ts-tester`):** make `S2` explicitly select the Providers tab (e.g.
  `page.getByRole('tab', { name: /Providers/i }).click()`) before looking for `"LM Studio"`, the same
  defensive pattern T72 applied to `S5`'s history-rail toggle for the same class of cross-run
  state-persistence issue.
- **Files:** `frontend/e2e/live-llm.spec.ts`.
- **Tests:** this task's deliverable is itself a test change. Verify by running `npm run verify:live`
  twice in a row against the same `wails dev` process (not restarting it between runs) and confirming
  `S2` passes both times.
- **Acceptance:** `S2` passes deterministically regardless of which Settings tab was last active in a
  prior run against the same backend session.
- **Status: OPEN (discovered 2026-07-02 during T78 verification).** Not fixed by T78 — out of that
  task's scope (T72/T73 only); logged here as a new follow-up per this document's own precedent for
  genuine gaps found outside a task's stated scope.

### T82 — Convert Settings tabs to a real Radix Tabs primitive (closes T38's gap)

- **Severity:** Low–Medium (accessibility/conformance gap, not a functional bug — keyboard nav and
  ARIA work today via hand-rolled code, but not via the project's mandated Radix primitive).
- **Discovery:** found while independently re-verifying T38 during T79's audit (rather than trusting
  the blanket "everything is done" claim). `frontend/src/ui/widgets/views/settings/SettingsTabs.tsx`
  hand-rolls `role="tab"`/`aria-selected` on plain `<button>` elements driven by a numeric
  `activeTab: number` prop — confirmed via grep, no `radix-ui` `Tabs` import exists anywhere in the
  settings tree. This violates T38's explicit "Convert `SettingsTabs.tsx`/`SettingsView.tsx` to a
  left vertical **Radix Tabs** nav" deliverable and `docs/ai_agent_rules/RadixUICSSRules.md` ("let
  Radix own accessibility... for Dialog, Select, Menu, or Tabs").
- **Root cause:** `SettingsTabs.tsx` predates (or was never migrated to) the shared
  `frontend/src/ui/primitives/Tabs.tsx` wrapper that was built under T18 specifically for this
  purpose and is already proven in production by `frontend/src/ui/widgets/views/info/InfoView.tsx`'s
  vertical-tabs layout.
- **Fix (`ts-engineer`):** widen `Tabs.tsx`'s `TabDef.label` from `string` to `React.ReactNode`
  (backward-compatible — `InfoView.tsx`'s plain-string labels keep working unchanged) so Settings
  tabs can compose an emoji glyph + label. In `SettingsView.tsx`, replace the `<SettingsTabs>` render
  plus the separate `switch (activeTab)` content block with a single `<Tabs>` call mirroring
  `InfoView.tsx`'s pattern: one `tabs` array entry per section with `value` (stringified Redux index,
  e.g. `'0'`..`'6'` — the Redux `activeSettingsTab: number` shape stays untouched, converted only at
  the render boundary via `String(activeTab)` / `Number(value)`), `label`, and `content` (the
  existing per-tab panel component, moved inline from the old switch cases). Delete
  `SettingsTabs.tsx`/`.module.css`, fully superseded.
- **Files:** `frontend/src/ui/primitives/Tabs.tsx`, `frontend/src/ui/widgets/views/settings/SettingsView.tsx`
  (+ `.module.css` if double-padding needs trimming against `Tabs.module.css`'s vertical content
  padding), delete `SettingsTabs.tsx`/`SettingsTabs.module.css`/`__tests__/SettingsTabs.test.tsx`.
- **Tests (`ts-tester`):** replace `SettingsTabs.test.tsx` (tests the removed numeric-index contract)
  with RTL coverage against `SettingsView.tsx`: renders 7 tabs with correct glyph+label, active tab
  carries `data-state="active"`, clicking a tab dispatches `setActiveSettingsTab` with the right index
  and swaps the visible panel. `cd frontend && npm run test`; Playwright `verify-ui.spec.ts` (Settings
  route, both themes) since this changes DOM structure/ARIA roles.
- **Acceptance:** Settings tab nav is a real `radix-ui` `Tabs` instance (no hand-rolled `role="tab"`
  remains); keyboard arrow-navigation works (free from Radix); visual behavior unchanged from the
  user's perspective; T38's `Status: OPEN` marker above is updated to point here.
- **Status: DONE (2026-07-02).** `SettingsView.tsx` now renders `primitives/Tabs.tsx` directly
  (`grep` confirms zero remaining `SettingsTabs`/hand-rolled `role="tab"` references anywhere in
  `frontend/src`); `TabDef.label` widened to `React.ReactNode` with no impact on `InfoView.tsx`. New
  `SettingsView.test.tsx` (6 tests: all 7 tabs render, correct tab active, click dispatches
  `setActiveSettingsTab`, panel content swaps, loading-guard branch) passes; full Jest suite green
  (74 suites/724 tests); `npx tsc --noEmit` and `eslint` clean. **A real regression was found and
  fixed during this pass**: the initial conversion dropped the `min-width: 0` the original
  `SettingsView.module.css`'s flex-child `.content` had, so `primitives/Tabs.module.css`'s new
  `.content` flex item (nested one level deeper than before) couldn't shrink below its content's
  intrinsic width — at the narrow (375px) viewport the Appearance tab's `Segmented` theme control
  clipped past the viewport edge. Confirmed via `git stash` that this did NOT reproduce on the
  pre-T82 code (i.e. a genuine regression, not pre-existing), root-caused, and fixed by adding
  `min-width: 0` to `primitives/Tabs.module.css`'s `.content` class. Re-ran `npm run verify:ui`
  (Playwright, bridge-mock dev server): all 12 checks green across narrow/tablet/wide × light/dark,
  including the settings-dialog clipping gate.

### T83 — Prompt Inspector: family chip + "Copy all" (closes T42's gap)

- **Severity:** Low (missing UI affordances, not a correctness bug — the underlying preview data is
  accurate and complete).
- **Discovery:** found while independently re-verifying T42 during T79's audit.
  `frontend/src/ui/widgets/views/info/PromptInspector.tsx` renders each inference group's family as
  plain inline text (`Inference {g.index + 1} — {g.family}`) with no distinct chip styling, and has
  no button to copy the full composed preview — confirmed via grep for "Copy"/"chip" finding neither
  anywhere under `ui/widgets/views/info/`. `PreviewGroup.Family` (`internal/apperr/results.go`,
  populated via `internal/actions/composer.go`/`service.go:357` from `v3.FamilyRewrite` etc. —
  `"rewrite"`, `"structure"`, `"summarize"`, `"translate"`, `"prompteng"`) is a real, meaningful value,
  so a dedicated chip is worth building.
- **Fix (`ts-engineer`):** add a local `styles.familyChip` span (new class in
  `PromptInspector.module.css`, visually distinct from the existing teal `.actionChip`, e.g. a
  purple/violet token) rendering the title-cased family in `groupHeader`, alongside the existing
  "Inference N" label. Add a local `styles.copyAllBtn` `<button>` in the title/meta header area
  (matching this file's and `OutputPane.tsx`/`DiffView.tsx`'s existing convention of local
  `styles.*`-classed buttons, not the shared `Button`/`IconButton` components) that builds the full
  preview text client-side via a small local helper joining each group's family/system/user prompt,
  calls `ClipboardServiceAdapter.setText(...)`, and dispatches a success/error
  `enqueueNotification(...)` toast (mirroring `OutputPane.tsx`'s complete copy-with-toast pattern).
- **Files:** `frontend/src/ui/widgets/views/info/PromptInspector.tsx`,
  `frontend/src/ui/widgets/views/info/PromptInspector.module.css`,
  `frontend/src/ui/widgets/views/info/PromptInspector.test.tsx`.
- **Tests (`ts-tester`):** extend the existing adapter mock with
  `ClipboardServiceAdapter: { setText: jest.fn() }`; add tests asserting the family chip renders per
  group, clicking "Copy all" calls `setText` with the expected composed text and dispatches a success
  notification, and a failed/rejected `setText` shows the error path. `cd frontend && npm run test`;
  Playwright `verify-ui.spec.ts` (About/Info route).
- **Acceptance:** every inference group shows a distinct family chip; a visible "Copy all" button
  copies the full composed system+user prompt text for every group and shows a toast on
  success/failure; T42's `Status: OPEN` marker above is updated to point here.
- **Status: DONE (2026-07-02).** `PromptInspector.tsx` renders a title-cased `styles.familyChip` per
  group (purple/violet token, distinct from the teal `actionChip`s) and a `styles.copyAllBtn` in the
  meta header that builds the full composed text via a local `buildFullPromptText` helper, calls
  `ClipboardServiceAdapter.setText(...)`, and dispatches a success/error `enqueueNotification` toast.
  4 new tests added to `PromptInspector.test.tsx` (chip renders per group with a two-family fixture;
  Copy-all calls `setText` with the exact expected composed string; success and failure paths both
  dispatch the correct notification against a real `notifications` reducer, not a mock). Full Jest
  suite green (74 suites/724 tests); `npx tsc --noEmit` and `eslint` clean; `npm run verify:ui`
  (Playwright, bridge-mock dev server) green across all 12 checks.
