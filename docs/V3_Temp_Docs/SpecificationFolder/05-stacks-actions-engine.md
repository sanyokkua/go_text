# 05 — Stacks & Multi-Action Engine

GoText ("Text Processing Suite") — Go + Wails v2 backend, React 19 / TypeScript frontend.

This document specifies the multi-action **stacks** engine: the backend-authoritative composition layer that lets a user select several text actions, run them as an ordered pipeline, and persist named recipes. It defines the domain model, the family/directive taxonomy, the planning and merge algorithms, the backend orchestration, the shared models, persistence of saved stacks, the Wails event/cancellation surface, and edge cases.

A single action is treated as a **degenerate one-step chain**, so the engine has exactly one execution code path.

Related specifications:

- Product scope and the action catalogue at large — see `01-product-scope.md`.
- Functional requirements and UI flows — see `02-functional-requirements.md`.
- Overall application architecture and package layout — see `03-architecture.md`.
- Providers, model resolution, inference settings, and the provider error taxonomy — see `04-providers-inference.md`.
- The family system prompts and per-action directive fragments (prompt text) — see `09-prompts.md`.

---

## 1. Concepts & domain model

| Concept | Definition |
|---|---|
| **Action** | A user-selectable transform (~60 total). In the stacks engine an action is no longer a full prompt; it is an **atomic directive fragment plus metadata** (`ActionMeta`). |
| **Family** | The system-prompt bucket an action belongs to. The family governs guardrails and decides how the action merges with neighbours. |
| **Directive** | The action's one-line instruction fragment, injected into its family's system prompt. |
| **Stack** | An ordered set of actions executed as a pipeline (each step's output becomes the next step's input). A **saved stack** is a named, persisted recipe. |
| **Run** | One execution of a stack (or single action), identified by a `runId`. |
| **Inference (group)** | One LLM call. A run produces 1–3 inference groups after merging. |

### 1.1 Action metadata

Action metadata is the single source of truth for ordering, exclusivity, and merge behaviour. It is **compiled together with the prompts** in `internal/prompts` and exposed to the frontend through `GetActionCatalog()`, so the frontend and backend apply identical rules with no divergence. The backend remains authoritative and re-validates every run and save.

```go
// internal/prompts/meta.go
type Family string

const (
    FamilyRewrite   Family = "rewrite"
    FamilyStructure Family = "structure"
    FamilySummarize Family = "summarize"
    FamilyTranslate Family = "translate"
    FamilyPromptEng Family = "prompteng"
)

type ActionMeta struct {
    ID               string   `json:"id"`
    Name             string   `json:"name"`
    Category         string   `json:"category"`         // display grouping for the sidebar
    Family           Family   `json:"family"`           // merge-engine bucket
    Directive        string   `json:"directive"`        // atomic instruction fragment (two-tier)
    OrderRank        int      `json:"orderRank"`        // canonical sort key (see §3.1)
    ExclusivityGroup string   `json:"exclusivityGroup"` // at most one action per group per stack
    Mergeable        bool     `json:"mergeable"`        // may share one inference with same-family neighbours
    Terminal         bool     `json:"terminal"`         // pinned to the end (summarize / translate / prompteng)
    Requires         []string `json:"requires"`         // snake_case keys: "input_language","output_language","target_model","goal"
}
```

`GetActionCatalog()` returns `[]ActionMeta` grouped by `Category`. The frontend mirrors these rules to drive live builder UX (chip grouping, greyed-out exclusive duplicates, inference counts); the backend enforces them.

---

## 2. Family & directive taxonomy

The merge engine recognises five families. Each family has **one system prompt** that encodes its guardrails; individual actions are directive fragments under that prompt. The system-prompt text itself lives in `09-prompts.md`; this section fixes only the structure, coverage, and metadata the engine relies on.

### F1 · Rewrite — content-preserving · mergeable · non-terminal

Covers everything that changes *expression, not meaning*. One inference can carry an ordered set of these, **at most one per exclusivity group**.

| Exclusivity group | Directive examples | Notes |
|---|---|---|
| `proofread` | basic · enhanced · readability · consistency · clarification | surface and clarity, no meaning change |
| `rewrite-intent` | concise · simplify · paraphrase · humanize · professionalize | exactly one intent |
| `tone` | the tone set (formal, friendly, empathetic, assertive, diplomatic, …) | exactly one |
| `style` | the style/register set (formal, technical, persuasive, executive, journalistic, …) | exactly one |

Merging a Rewrite group means composing the selected directives in canonical sub-order into a single user prompt under the one Rewrite system prompt.

### F2 · Structure — structural · mergeable within family · non-terminal (after Rewrite)

Changes layout and shape while preserving content.

| Exclusivity group | Directive examples | Notes |
|---|---|---|
| `format` | bullets · headings · table · paragraphs · prose · numbered steps | presentation |
| `doc-structure` | FAQ · meeting-minutes · proposal · user-story · spec · report · README · changelog | artifact shape |

Structure is kept **separate from Rewrite** because its guardrails differ (it may add headings and reshape). **Only `format`-group actions are mergeable**: two or more `format` directives (for example "headings + table") compose into one inference. `doc-structure` actions are **non-mergeable and mutually exclusive** — at most one document type per run, and a `doc-structure` action always forms its own inference group. Structure actions never merge with a Rewrite group.

### F3 · Summarize — content-reducing · not mergeable · terminal-class (before Translate)

| Exclusivity group | Directives |
|---|---|
| `summarize` | summary · key-points · tl;dr · executive-summary · simple-explanation · hashtags |

Because it reduces content, a Summarize action is always its own inference and runs late in the pipeline.

### F4 · Translate — cross-language · not mergeable · terminal (last)

| Exclusivity group | Directives | Requires |
|---|---|---|
| `translate` | translate · localize · dictionary table (glossary) · example sentences | `input_language`, `output_language` |

Always runs last. **Same-language skip:** if the input language equals the output language the step is a no-op pass-through (the existing optimization, generalized to the chain). If translate is the only step and languages match, the output equals the input.

### F5 · Prompt Engineering — generation-prompt builders · terminal · exclusive · not mergeable · standalone

A different intent: the input is a *description or seed*, and the output is an **optimized generation prompt** — a text-LLM prompt, or a generation prompt for a chosen image or video target model. This is **one merge family** (`prompteng`) with **three exclusivity sub-groups**:

| Exclusivity group | Directives | Requires |
|---|---|---|
| `prompteng-text` | text-LLM prompt tools (improve · compress · expand) | — |
| `prompteng-image` | one parameterized image-prompt builder (per target model and goal) | `target_model`, `goal` |
| `prompteng-video` | one parameterized video-prompt builder (per target model) | `target_model` |

The family system prompt encodes the transferable technique (shot/lens/camera vocabulary, identity and layout locking, fidelity dial, "what not to change", and per-paradigm negative-prompt handling) and **branches by model paradigm** (positive-only / positive+negative / structured-command). This is a single-step, standalone action and is not chained with prose rewrites. Target models are referenced by **provider-agnostic categories**, not by vendor brand names.

> **Net families for the merge algorithm:** Rewrite (merge), Structure (merge within), Summarize (solo, terminal-class), Translate (solo, terminal-last), Prompt-Engineering (solo, terminal, standalone).

---

## 3. Algorithms

The Planner runs four ordered stages — canonical ordering, exclusivity dedupe, cap enforcement, and merge grouping — producing an execution plan. The Composer then builds each group's two-tier prompt.

### 3.1 Canonical ordering

Each action carries an `OrderRank`. The pipeline always executes in ascending canonical order, independent of click order:

```
Rewrite[ proofread(10) -> rewrite-intent(20) -> tone(30) -> style(40) ]
  -> Structure[ format(50) -> doc-structure(60) ]
  -> Summarize(80)        (terminal-class)
  -> Translate(90)        (always last)
PromptEng(100)            (standalone; never combined with the above)
```

`Terminal` actions (summarize, translate, prompt-engineering) are pinned after non-terminal ones; ties are broken by `OrderRank`, then by insertion order. As a result the UI never needs manual reordering.

### 3.2 Exclusivity dedupe

At most one action per `ExclusivityGroup` may appear in a stack. Adding a second action in an occupied group (for example a second tone) is either greyed-out / replaced in the UI or, if it reaches the backend, **rejected** with `ErrInvalidPlan`.

### 3.3 Caps (backend-enforced)

- **At most 5 selectable steps** per stack.
- **At most 3 inference groups** after merge.

A combination that would yield 4 or more groups (for example Rewrite + Structure + Summarize + Translate simultaneously) is invalid: blocked in the UI and rejected by the backend. Both caps are enforced server-side regardless of any frontend state.

### 3.4 Merge grouping (produces the execution plan)

Input is the already canonically ordered and deduped step list.

```
groups = []
for step in steps:
    if groups.last exists
       AND groups.last.family == step.family
       AND step.Mergeable AND groups.last.Mergeable
       AND not step.Terminal:
        groups.last.append(step)        # extend the current same-family group
    else:
        groups.push(newGroup(step))     # start a new inference group
inferences = len(groups)
reject if inferences > 3 OR len(steps) > 5
```

Every non-mergeable or terminal action always starts its own group. A single action produces one group and therefore one inference — the degenerate chain.

### 3.5 Merge-flow diagram

```
 selected actions (any click order)
            |
            v
 +------------------------+
 | 1. Canonical ordering  |   sort by Terminal, then OrderRank, then insertion
 +------------------------+
            |
            v
 +------------------------+
 | 2. Exclusivity dedupe  |   <= 1 per ExclusivityGroup  --> ErrInvalidPlan
 +------------------------+
            |
            v
 +------------------------+
 | 3. Caps                |   <= 5 steps                 --> ErrInvalidPlan
 +------------------------+
            |
            v
 +------------------------+
 | 4. Merge grouping      |
 +------------------------+
            |
   for each ordered step:
            |
   same family as last group? --no--> [ start NEW group ]
            | yes
   both mergeable & not terminal? --no--> [ start NEW group ]
            | yes
   [ extend LAST group ]
            |
            v
   inferences = len(groups)   <= 3 ? --no--> ErrInvalidPlan
            |
            v
 +----------------------------------------------+
 |  Example: proofread + tone + table + summary |
 |                                              |
 |  [Rewrite: proofread,tone] [Structure:table] [Summarize:summary]
 |        group 1                  group 2            group 3
 |        1 inference              1 inference        1 inference
 |  ----> 3 inference groups, output -> input -> input
 +----------------------------------------------+
```

### 3.6 Two-tier prompt composition (per group)

For each group the Composer:

1. Picks the **family system prompt** (one per family).
2. Concatenates the group's **directive fragments** in canonical sub-order into one user-prompt section (for example an ordered "apply these in order: 1) fix grammar 2) make professional 3) make concise").
3. Injects shared run context **once at the family/orchestration layer**, not per fragment: `{{user_text}}` (current input), `{{user_format}}` (`PlainText` or `Markdown`), and for Translate `{{input_language}}` / `{{output_language}}`. These are the existing template tokens; injecting them once removes the per-action duplication and guardrail conflict present in single-tier prompts.
4. Produces one `system + user` message pair, runs it through `runStep`, and the sanitized output becomes the next group's input.

### 3.7 Inference-count display

`inferences = len(groups)`. A merged group displays as "1 inference"; adding an action in a new family adds "+1 inference". The UI shows totals such as "3 / 5 steps · 2 inferences". No time estimates are shown, since they are model- and hardware-dependent.

---

## 4. Backend design

The engine lives under `internal/actions` and `internal/prompts`. The existing single-action path in `internal/actions/service.go` (`processAction`) is refactored so its LLM-call core becomes the reusable `runStep`.

### 4.1 Packages & responsibilities

- **`internal/prompts`** — adds `ActionMeta`, the five family system prompts, and the directive-fragment library. `Prompt` / `PromptGroup` evolve to carry metadata, and a `Catalog()` accessor exposes actions plus metadata. The existing template tokens (`{{user_text}}`, `{{user_format}}`, `{{input_language}}`, `{{output_language}}`) and `SanitizeReasoningBlock` are reused.
- **`internal/actions`**
  - `runStep(ctx, ChatStepRequest) (string, error)` — extracted from today's `processAction`: build the chat-completion request, call the provider, run `SanitizeReasoningBlock`, write one tasklog entry. Non-streaming.
  - `Planner` — canonical ordering, dedupe, caps, and merge grouping (§3.1–§3.4) producing a `ChainPlan`.
  - `Composer` — builds each group's `system + user` prompt (§3.6).
  - `ChainOrchestrator.Run(ctx, ChainRequest) (ChainResult, error)` — iterates the plan's groups, feeds output to input, emits progress, honours cancellation, and collects partial results.
- **`internal/actions` Wails-bound handler** — exposes `ProcessPromptChain`, `CancelChain`, `GetActionCatalog`, the Prompt Inspector method `PreviewPrompt`, and saved-stack CRUD (`CreateStack`/`UpdateStack`/…). It holds the **run registry** `map[runId]context.CancelFunc` and the stored application `ctx`. `BuildPlanAndPrompts` is the **internal shared helper** (not bound) that both `ProcessPromptChain` and `PreviewPrompt` call, so the preview can never drift from a real run (§4.7).

### 4.2 Wails API surface

| Method / event | Shape | Purpose |
|---|---|---|
| `GetActionCatalog()` | `[]ActionMeta` (grouped by category) | drive the sidebar and frontend rule mirroring |
| `ProcessPromptChain(req)` | `ChainRequest → ChainResult` | run a stack (or single action) |
| `CancelChain(runId)` | `runId → void` | cooperative cancellation |
| `PreviewPrompt(req)` | `PromptPreviewRequest → PromptPreviewResult` | Prompt Inspector preview (no LLM call); payload is `PromptPreview` |
| `ListStacks()` / `CreateStack()` / `UpdateStack()` / `DeleteStack()` / `DuplicateStack()` | `SavedStack` CRUD | My Stacks |
| **event** `chain:progress` | `StepProgress` | per-group running / done / failed |

Wails binding rules: bound methods take **no `ctx`** parameter. The orchestrator derives a per-run `ctx` (with cancel) from the stored application `ctx`; `CancelChain(runId)` looks up and calls that run's cancel function from the registry. Run `wails generate module` after changing exported types so the frontend bindings regenerate.

### 4.3 Models

```go
// internal/actions/models.go

// A single planned step. targetModel / goal are used only by the prompteng family.
type ChainStep struct {
    ActionID    string `json:"actionId"`
    TargetModel string `json:"targetModel,omitempty"`
    Goal        string `json:"goal,omitempty"`
}

type ChainRequest struct {
    RunID           string      `json:"runId"`
    InputText       string      `json:"inputText"`
    Steps           []ChainStep `json:"steps"`
    InputLanguageID  string     `json:"inputLanguageId,omitempty"`
    OutputLanguageID string     `json:"outputLanguageId,omitempty"`
    UseMarkdown     bool        `json:"useMarkdown"`
}

type StepProgress struct {
    RunID       string `json:"runId"`
    GroupIndex  int    `json:"groupIndex"`
    TotalGroups int    `json:"totalGroups"`
    Family      string `json:"family"`
    Status      string `json:"status"` // "running" | "done" | "failed"
}

type ChainResult struct {
    FinalText   string `json:"finalText"`             // last good output
    Completed   int    `json:"completed"`             // number of groups completed
    FailedIndex *int   `json:"failedIndex,omitempty"` // nil on success/cancel; set on step failure
    Error       string `json:"error,omitempty"`       // typed error string; "" on success
}
```

The Planner's internal `ChainPlan` holds the ordered `[]Group`, each `Group` holding its `Family` and ordered member steps, plus the resolved inference count. `PromptPreview` is the serializable payload returned (wrapped in `PromptPreviewResult`) by the bound `PreviewPrompt` method — built from the internal `BuildPlanAndPrompts` helper — carrying the groups, per-group composed system+user prompts, and inference count for the Prompt Inspector (see `08-api-contracts.md`).

### 4.4 Execution flow (orchestrator)

`ChainOrchestrator.Run` performs, in order:

1. **Validate** the request: non-empty input; per-family `Requires` satisfied (languages for translate, target model for prompt-engineering). Pre-flight and non-retryable on failure.
2. **Plan** via the `Planner`: canonical order, dedupe, caps, merge grouping → `ChainPlan`. Reject on any cap or exclusivity violation (`ErrInvalidPlan`).
3. **Resolve provider, model, temperature once** through the provider layer (see `04-providers-inference.md`). These are fixed for the entire chain so every group runs against the same configuration.
4. **Per group** `g`: emit `chain:progress{g, running}`. For a Translate group, the **orchestrator first performs the same-language short-circuit**: if `InputLanguageID == OutputLanguageID` it sets the group output equal to its input (`output = input`) with **no Composer call and no `runStep`/LLM call**, then continues. Otherwise → `Composer` builds `system + user` → `runStep(ctx, …)` → sanitize → feed the output forward as the next group's input → emit `chain:progress{g, done}`; write one tasklog entry per group (the skipped translate group is logged as a pass-through).
5. **On success:** return `ChainResult{FinalText, Completed = N, FailedIndex = nil, Error = ""}`.
6. **On cancellation** (`ctx` cancelled mid-run): stop after the current group, return the partial result — `FinalText` = last good output, `FailedIndex = nil`, `Error = "cancelled"`.
7. **On step failure** at group `k`: stop, return `ChainResult{FinalText = last good output, Completed = k, FailedIndex = k, Error = typed}`. Prior work is never discarded.

```go
func (o *ChainOrchestrator) Run(ctx context.Context, req ChainRequest) (ChainResult, error) {
    if err := o.validate(req); err != nil {
        return ChainResult{Error: err.Error()}, err
    }
    plan, err := o.planner.Plan(req)
    if err != nil { // cap / exclusivity violation
        return ChainResult{Error: err.Error()}, err
    }
    cfg, err := o.resolveProviderOnce() // fixed provider/model/temperature for the chain
    if err != nil {
        return ChainResult{Error: err.Error()}, err
    }

    input := req.InputText
    completed := 0
    for i, group := range plan.Groups {
        select {
        case <-ctx.Done(): // cooperative cancel
            return ChainResult{FinalText: input, Completed: completed, Error: ErrChainCancelled.Error()}, nil
        default:
        }
        o.emit(StepProgress{req.RunID, i, len(plan.Groups), string(group.Family), "running"})

        // Orchestrator-level same-language translate short-circuit: no Composer, no runStep, no LLM call.
        if group.Family == FamilyTranslate && req.InputLanguageID == req.OutputLanguageID {
            completed++
            o.emit(StepProgress{req.RunID, i, len(plan.Groups), string(group.Family), "done"})
            continue // output == input, already held in `input`
        }

        sysPrompt, userPrompt := o.composer.Compose(group, input, req, cfg.UseMarkdown)
        out, err := o.runStep(ctx, cfg, ChatStepRequest{System: sysPrompt, User: userPrompt})
        if err != nil {
            idx := i
            o.emit(StepProgress{req.RunID, i, len(plan.Groups), string(group.Family), "failed"})
            return ChainResult{FinalText: input, Completed: completed, FailedIndex: &idx, Error: classify(err).Error()}, err
        }

        input = out // output -> next input
        completed++
        o.emit(StepProgress{req.RunID, i, len(plan.Groups), string(group.Family), "done"})
    }
    return ChainResult{FinalText: input, Completed: completed}, nil
}
```

`runStep` is the extracted core of the former `processAction`: it builds the chat-completion request (non-streaming, `N: 1`, temperature applied per provider settings), calls the provider, applies `SanitizeReasoningBlock`, and writes a tasklog entry. The same-language translate skip is **the orchestrator's responsibility, not `runStep`'s**: the orchestrator short-circuits a Translate group whose `InputLanguageID` equals `OutputLanguageID` to `output = input` before it would call `runStep`, so no LLM request is ever built for that group.

### 4.5 Run registry, single-flight gate & cancellation

The bound handler owns a registry guarded by a mutex **and a process-wide single-flight `InferenceGate`**
that permits **at most one inference in progress at a time** across the whole app. The same gate instance
is shared with the provider-verification service so that a chain run and a `TestInference` can never run
concurrently (see `04-providers-inference.md §5.6`).

```go
// InferenceGate is a single-slot, non-blocking gate. TryAcquire returns false
// immediately when an inference is already running (no queueing — callers fail fast).
type InferenceGate struct{ slot chan struct{} } // cap 1

func NewInferenceGate() *InferenceGate { return &InferenceGate{slot: make(chan struct{}, 1)} }
func (g *InferenceGate) TryAcquire() bool { select { case g.slot <- struct{}{}: return true; default: return false } }
func (g *InferenceGate) Release()         { select { case <-g.slot: default: } }

type ActionHandler struct {
    appCtx context.Context
    runs   map[string]context.CancelFunc
    mu     sync.Mutex
    gate   *InferenceGate // shared with the provider-verification service
    // ... services
}

func (h *ActionHandler) ProcessPromptChain(req ChainRequest) (ChainResult, error) {
    // Single-flight: reject immediately if any inference is already running.
    if !h.gate.TryAcquire() {
        err := apperr.Busy() // code "busy"
        return ChainResult{Error: err.Error()}, err
    }
    defer h.gate.Release()

    ctx, cancel := context.WithCancel(h.appCtx)
    h.mu.Lock(); h.runs[req.RunID] = cancel; h.mu.Unlock()
    defer func() { h.mu.Lock(); delete(h.runs, req.RunID); cancel(); h.mu.Unlock() }()
    return h.orchestrator.Run(ctx, req)
}

func (h *ActionHandler) CancelChain(runID string) {
    h.mu.Lock(); defer h.mu.Unlock()
    if cancel, ok := h.runs[runID]; ok {
        cancel()
    }
}
```

`CancelChain` is idempotent: an unknown or already-finished `runId` is a no-op. The **single-flight gate**
is acquired before any planning/provider resolution and released (via `defer`) on success, partial
failure, step error, cancel, or panic — so a failed or cancelled run never leaves the gate stuck. While
the gate is held, a second `ProcessPromptChain` **or** a `TestInference` returns immediately with the
typed `busy` error (no plan, no provider resolution, no LLM call, no history/tasklog write). The frontend
mirrors this by disabling every run/Test-inference trigger while an inference is in progress
(`10-ui-ux-specification.md`); the gate is the authoritative backend enforcement. The `runId` additionally
guards against stale progress events from a superseded run. (Within a single run, groups already execute
strictly sequentially — at most one in-flight inference — so the gate governs only cross-run/verification
concurrency.)

### 4.6 Models — saved stacks & persistence

```go
type SavedStack struct {
    ID            string   `json:"id"`
    Name          string   `json:"name"`
    Icon          string   `json:"icon"`
    Steps         []string `json:"steps"`         // ordered action IDs
    DefaultFormat string   `json:"defaultFormat"` // "PlainText" | "Markdown"
    DefaultInLang  string  `json:"defaultInLang,omitempty"`
    DefaultOutLang string  `json:"defaultOutLang,omitempty"`
    CreatedAt     int64    `json:"createdAt"`
    UpdatedAt     int64    `json:"updatedAt"`
}
```

Saved stacks are persisted behind a `StackRepository` interface (CRUD + list) backed by **SQLite** using two tables: a parent `stacks` table (id, name, icon, defaults, timestamps) and a child `stack_steps` table holding the ordered action IDs (`stack_id` FK with `ON DELETE CASCADE`, ordered by `position`). The schema is locked to these tables — see `06-data-model-database.md`. **No secrets** are stored — saved stacks reference action IDs and defaults only.

```go
type StackRepository interface {
    List() ([]SavedStack, error)
    Get(id string) (SavedStack, error)
    Create(s SavedStack) (SavedStack, error)
    Update(s SavedStack) (SavedStack, error)
    Delete(id string) error
}
```

On load, a stack whose `Steps` reference an unknown or removed action ID is handled gracefully: the missing step is dropped and the user is warned, rather than failing the whole stack.

### 4.7 Prompt Inspector preview

The bound method `PreviewPrompt(PromptPreviewRequest) → PromptPreviewResult` runs steps 1–2 of the orchestrator flow (validate + plan + compose) **without resolving a provider or calling the LLM**, returning a `PromptPreview` payload (the composed per-group system and user prompts and the inference count). Internally it calls the shared `BuildPlanAndPrompts` helper — the same helper `ProcessPromptChain` uses — so the Prompt Inspector shows exactly what would run. `BuildPlanAndPrompts` itself is not Wails-bound.

### 4.8 Error handling

The chain reuses the provider error taxonomy from `04-providers-inference.md` (authentication, provider-unreachable, rate-limited, upstream, model-or-deployment-not-found, missing-credential, with that document's retry policy) and adds chain-level errors:

- `ErrChainCancelled` — cooperative cancellation; partial result returned.
- `ErrStepFailed{index}` — a group failed; partial result returned with `FailedIndex` set.
- `ErrInvalidPlan` — cap or exclusivity violation detected during planning.
- `ErrContextWindowExceeded` — input too large for the resolved model.

A partial result is always returned wherever work was completed; prior groups' output is never discarded on a later failure or on cancellation.

---

## 5. Events, cancellation & partial handling (summary)

- **Progress:** the orchestrator emits `chain:progress` (`StepProgress`) for each group as it transitions running → done, or running → failed. The frontend subscribes via `EventsOn("chain:progress", …)` and unsubscribes on unmount. Intermediate group output is never emitted to the UI and never rendered; it is available only to the tasklog for debugging.
- **Completion:** `ProcessPromptChain` returns the final `ChainResult` (no separate completion event is required). The frontend renders the final text once.
- **Cancellation:** the user triggers `CancelChain(runId)`; the orchestrator stops after the current group and returns the partial result with `Error = "cancelled"`. The UI keeps the partial output and shows "Cancelled after step k".
- **Partial failure:** group `k` fails (for example a provider rate-limit after retries); the UI shows the output of groups 1..k-1 and reports "Step k failed: <reason>". The user can retry or adjust.

---

## 6. Edge cases & invariants

- **Empty input** → blocked pre-flight; no run is started.
- **Same-language translate** → no-op pass-through. If translate is the only step and languages match, the output equals the input.
- **Exclusivity violation** (e.g. two tones) → UI greys out or replaces; the backend rejects with `ErrInvalidPlan`.
- **Cap violation** (more than 5 steps or more than 3 inference groups) → blocked in the UI and rejected by the backend.
- **Terminal ordering** → summarize, translate, and prompt-engineering are forced to the end regardless of click order.
- **Prompt-Engineering in a multi-step stack** → only permitted as the sole step; it is standalone and never merges or chains with prose rewrites.
- **Context window** on long inputs (merged long prompts or many passes) → detected and surfaced as `ErrContextWindowExceeded`.
- **Provider / model / temperature** are resolved once and fixed for the whole chain, guaranteeing consistency across groups.
- **Saved stack references a removed action** → that step is dropped with a warning on load.
- **Reasoning models** → provider-native thinking content is ignored by the provider layer; inline `<think>…</think>` blocks are stripped by `SanitizeReasoningBlock` inside `runStep` (see `04-providers-inference.md`).
- **Concurrency** → one chain at a time per window (single-user desktop); the `runId` guards against stale progress events.
- **Single action = degenerate one-step chain** → one group, one inference, one execution code path; there is no separate single-action runner.

---

## 7. Key invariants

1. One code path: a single action is a one-step chain.
2. Action metadata is the single source of truth for ordering, exclusivity, and merge. The backend validates; the frontend mirrors.
3. Two-tier prompts (family system prompt + ordered directive fragments) make merging first-class and remove contradictory guardrails; run context is injected once at the family/orchestration layer.
4. At most 5 steps, at most 3 inference groups, canonical order, one action per exclusivity group — all enforced server-side.
5. Inference counts are shown; time estimates are not. Inference is non-streaming, and the final text is rendered once.
6. Cancel = stop after the current group plus return partial; failure = partial plus failed index; the provider error taxonomy is reused.
7. Saved stacks live in SQLite behind a repository interface; no secrets are persisted.
