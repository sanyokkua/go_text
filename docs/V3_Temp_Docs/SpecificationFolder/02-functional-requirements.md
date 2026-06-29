# GoText — Functional Requirements

> **Document:** Functional Requirements
> **Product:** GoText ("GoText") — a single-user desktop application for LLM-assisted
> text processing.
> **Technology baseline:** Go backend, Wails v2 desktop shell, React 19 + TypeScript + Redux frontend.
> **Scope of this document:** the confirmed functional behavior of the application — user flows,
> business (orchestration) flows, state transitions, per-surface interactions, validation rules,
> permissions, configuration behavior, error handling, and edge cases.

Cross-references in this document point to companion specification documents by filename only:
`04-providers-inference.md`, `05-stacks-actions-engine.md`, `07-error-handling-logging.md`,
`06-data-model-database.md`, `10-ui-ux-specification.md`, `12-ui-implementation.md`.
Where a behavior is fully specified elsewhere, this document states the functional requirement and
cross-references the owning document.

---

## 1. Product summary & core concepts

GoText lets a single user transform text with a Large Language Model. The user pastes or types text
into an **input editor**, selects one or more **actions**, runs them, and reads the result in an
**output editor**. Actions can be run individually or composed into ordered pipelines called
**stacks**.

### 1.1 Domain vocabulary

| Term | Definition |
|---|---|
| **Action** | A user-selectable text transform (approximately 60 built in). Internally an action is an atomic directive fragment plus metadata, not a full prompt. |
| **Family** | The system-prompt bucket an action belongs to. It governs the action's guardrails and how the action merges with neighbours. Families: Rewrite, Structure, Summarize, Translate, Prompt-Engineering. |
| **Directive** | The action's one-line instruction injected into its family's system prompt. |
| **Exclusivity group** | A label (for example `tone`, `style`, `translate`) of which **at most one** action may appear in a single stack. |
| **Stack** | An ordered set of actions run as a pipeline (each step's output feeds the next step's input). A **saved stack** is a named, persisted recipe. |
| **Run** | One execution of a stack or single action, identified by a `runId`. |
| **Inference (group)** | One LLM call. After same-family merging, a run produces 1–3 inference groups. |
| **Provider** | A configured LLM endpoint (one of five supported kinds). Exactly one provider is **current** at a time. |
| **Action catalog** | The backend-authoritative list of actions plus their metadata, exposed to the frontend so both layers apply identical ordering, exclusivity, and merge rules. |

### 1.2 Action metadata fields

Each action carries metadata that drives all composition rules. The metadata is compiled together with
the prompts and exposed to the frontend through the action catalog.

| Field | Purpose |
|---|---|
| `ID`, `Name`, `Category` | Identity and display grouping. |
| `Family` | One of: rewrite, structure, summarize, translate, prompteng. |
| `Directive` | The atomic instruction fragment injected into the family system prompt. |
| `OrderRank` | Canonical sort key for pipeline ordering (independent of click order). |
| `ExclusivityGroup` | At most one action per group per stack. |
| `Mergeable` | Whether the action may share one inference with same-family neighbours. |
| `Terminal` | Whether the action is forced to the end of the pipeline. |
| `Requires` | Inputs the action needs for validation (for example `input_language`, `output_language`, `target_model`, `goal`). |

The backend is the source of truth for these rules and re-validates on every run and save; the frontend
mirrors the same rules from catalog metadata for live UX feedback.

---

## 2. User flows

Each flow is numbered. Steps describe confirmed, required behavior.

### 2.1 Run a single action

1. The user enters or pastes text into the **input editor**.
2. The user selects one action from the left sidebar (or via the command palette, `Cmd/Ctrl-K`). The
   action is **armed** and shown in the run bar with a "1 inference" indicator.
3. The user presses **Run**.
4. The run executes as a degenerate one-step chain: one inference group, one LLM call.
5. The final output is rendered **once** in the output editor (intermediate text is never shown because
   a single action has none).
6. On completion the run is recorded to history (if history is enabled) and the result remains
   available for **Copy**, **Use as input**, and view-mode switching (Preview / Source / Diff).

**Preconditions / blocks:** Run is disabled when no action is armed or the input is empty. See §6.

### 2.2 Build and run a stack

1. From the single-action run bar the user selects **Build a stack** (or begins clicking multiple
   sidebar actions), entering **build mode**.
2. Each clicked action is appended as a step. The builder immediately applies canonical ordering,
   exclusivity dedupe, the step cap, and same-family merging locally (mirroring the backend) and
   updates the chip bar, group labels, and the live counter "N / 5 steps · M inferences".
3. Actions that violate exclusivity (for example a second tone) are greyed/replaced; actions that would
   exceed the caps are blocked.
4. The user presses **Run** to execute the unsaved stack. The backend re-validates the plan, resolves
   provider/model/temperature once, and runs the inference groups sequentially, feeding each group's
   output into the next.
5. Per-group progress is shown ("Step *i* of *N*", group family, spinner). Intermediate text is never
   displayed; the final result is rendered once.
6. On completion the run is recorded to history (if enabled).

### 2.3 Save and manage stacks

**Save a stack**

1. In build mode the user selects **Save…** (disabled when zero steps).
2. The Save dialog is the only place naming occurs. It captures a **name** (must be unique) and an
   **icon**, auto-suggests a name from the steps, and shows the resolved canonical order and inference
   count.
3. On confirm the stack is persisted and appears in **My Stacks**.

**Manage stacks**

1. The user opens **My Stacks** in the sidebar (or the **Manage** grid).
2. Each saved stack is shown as a self-describing card: name + icon, ordered steps, and inference count.
3. Per stack the user can **Run**, **Edit steps** (loads into the builder), **Duplicate**, or
   **Delete** (delete confirms via a destructive dialog).

**Run a saved stack**

1. The user selects a saved stack from My Stacks or the Manage grid.
2. The stack's steps and default format/languages are loaded.
3. The user presses **Run**; execution proceeds as in §2.2 steps 4–6.

### 2.4 Review and restore history

1. The user toggles the right **history rail** from the toolbar (disabled when history is turned off).
2. The rail lists past runs, newest first, paginated. Each row shows the title, relative time, a
   status/inference chip, and a short input/output preview.
3. The user selects an entry to view its detail: full input, full output, applied-action chips,
   provider/model, languages, and status.
4. The user selects **Restore** on an entry: the entry's input loads into the input editor and its
   output loads into the output editor. If the applied action(s) or stack still exist in the catalog
   they are re-armed in the builder; if an action was removed, the text is still restored and a small
   "actions changed" note is shown. Restore never fails on text.
5. The user may **Delete** a single entry or **Clear** all history (Clear confirms via a destructive
   dialog).

History behavior, retention, and storage are specified in `06-data-model-database.md`.

### 2.5 Configure and verify a provider

1. The user opens **Settings → Providers** (master-detail).
2. The user selects an existing provider to edit or **New provider** to create one.
3. The user picks the **kind** (one of five — see §7), which drives the visible fields and the
   derived profile (completion URL, discovery endpoint, auth scheme, body quirks).
4. The user fills required fields for the kind: name (unique), base URL, auth scheme, the **environment
   variable name** holding the credential (when auth is not "none"), and the selected model/deployment.
   Optional fields include custom headers, custom models, path overrides, and (Azure) api-version.
5. The user may refresh the model list, which re-runs discovery for that provider.
6. The user verifies the provider with three independent, on-demand checks:
   - **Test connection** — resolve the credential and confirm host reachability and accepted auth.
   - **Test models** — run discovery and report the model count plus a small sample.
   - **Test inference** — send a tiny throwaway completion to the selected model with a short timeout.
   Each check shows ✓/✗ with a typed reason and a duration. Verification runs are diagnostic only and
   are **never** recorded to history. None of them block saving or setting the provider as current.
7. The user **Saves** the provider and optionally **Sets it as current**.

Provider behavior, kinds, discovery, and verification are specified in `04-providers-inference.md`.

### 2.6 Preview a prompt

1. The user opens the **About · Info** window (ℹ in the toolbar) and the **Actions & Stacks** catalog,
   or selects a saved stack.
2. The user clicks any action or stack to open the **Prompt Inspector**.
3. The Inspector shows the exact, fully composed prompt(s) that a run would send: the resolved system
   prompt, user prompt, and parameters (model, temperature when enabled, format, languages when
   relevant, token-limit parameter, `stream=false`). For a stack it shows the resolved plan as merge
   groups, the composed system + user prompt per inference group, and the output→input flow, plus a
   one-line summary (for example "This stack runs as 2 inferences: Rewrite → Translate").
4. The `{{user_text}}` placeholder is shown as a highlighted marker; later stack groups show
   `‹output of previous step›`. An optional **Use current input** toggle injects the current editor
   text into the first group's prompt.
5. The user may **Copy** any prompt block. The Inspector is read-only and makes no LLM call.

The Inspector reuses the same planning and composition logic the orchestrator uses, so the preview can
never drift from a real run. Full behavior is specified in `10-ui-ux-specification.md`.

### 2.7 Change theme

1. The user opens **Settings → Appearance**.
2. The user selects a theme mode with a segmented control: **Auto** (default), **Light**, or **Dark**.
3. The choice applies instantly with no restart, persists across sessions, and is the only place the
   theme is set (there is no theme toggle in the main toolbar).
4. In **Auto** the application follows the operating-system color scheme and live-updates when the OS
   flips between light and dark.

Theming is specified in `12-ui-implementation.md`.

### 2.8 Change settings

1. The user opens **Settings** (⚙ in the toolbar) and navigates the seven sections via the vertical
   nav: **Providers**, **Model**, **Generation**, **Languages**, **Logging**, **About & data**,
   **Appearance**.
2. The user adjusts controls in the chosen section (see §9 for per-control behavior).
3. Changes are validated, persisted, and — for live-applied settings (theme, logging level/file,
   history toggle) — take effect immediately without a restart.
4. Destructive operations (delete provider, clear history, factory reset) require confirmation via a
   destructive dialog.

---

## 3. Business flows — chain orchestration

The orchestration logic below is enforced by the backend and mirrored by the frontend for live UX.
The complete algorithmic specification lives in `05-stacks-actions-engine.md`; this section states
the confirmed functional rules.

### 3.1 Canonical ordering

Regardless of the order in which the user clicks actions, the pipeline is sorted into canonical order by
each action's `OrderRank`:

```
Rewrite[ proofread(10) → rewrite-intent(20) → tone(30) → style(40) ]
  → Structure[ format(50) → doc-structure(60) ]
  → Summarize(80)      (content-reducing, terminal-class)
  → Translate(90)      (always last)
PromptEng(100)         (standalone; not combined with the above)
```

Terminal actions (Summarize, Translate, Prompt-Engineering) are pinned after non-terminal
actions. Ties are broken by `OrderRank`, then by insertion order. The user never needs to reorder steps
manually.

### 3.2 Same-family merge into inference groups

Adjacent steps that belong to the **same family**, are both **mergeable**, and are **not terminal** are
merged into a single inference group (one LLM call). The merge composes the group's directive fragments
in canonical sub-order under one family system prompt. Each non-mergeable or terminal action always
starts its own group.

- **Rewrite** actions merge with each other.
- **Structure** actions merge with each other (within the Structure family).
- **Summarize**, **Translate**, and **Prompt-Engineering** are never mergeable; each is its
  own inference group.

A single action is one group → one inference (the degenerate chain).

### 3.3 Caps and exclusivity

| Rule | Limit |
|---|---|
| Maximum selectable steps per stack | **≤ 5** |
| Maximum inference groups after merge | **≤ 3** |
| Actions per exclusivity group per stack | **exactly one** |

A combination that would yield four or more inference groups (for example Rewrite + Structure +
Summarize + Translate simultaneously) is **invalid**: blocked in the UI and rejected by the backend.
Adding a second action in an exclusivity group (for example a second tone) either replaces the first or
is blocked in the UI and rejected by the backend if it slips through.

### 3.4 Output → input feed and fixed run context

- Inference groups run **sequentially**. Each group's sanitized output becomes the next group's input.
- Runs are **non-streaming** (`stream=false`). Only the final result is rendered; intermediate group
  outputs are never displayed (they are available only to diagnostic logging).
- The **provider, model, and temperature are fixed for the entire chain**. They are resolved once at
  chain start and do not change between groups, ensuring consistency.

### 3.5 Translate special cases

- Translate requires both an input language and an output language.
- **Same-language translate** is a no-op pass-through: when the input language equals the output
  language, the step returns its input unchanged. If Translate is the only step, the output equals the
  input.

### 3.6 Prompt-Engineering family

Prompt-Engineering actions take a description/seed as input and produce an optimized generation prompt
for a chosen target model. They are terminal, exclusive, not mergeable, and run standalone — a
Prompt-Engineering action is the sole step in its run and is not combined with prose-rewrite actions.
It requires `target_model` (and `goal`) via its `Requires` metadata.

### 3.7 Inference-count display

The number of inference groups is shown to the user. A merged group shows "1 inference"; adding an
action in a new family shows "+1 inference". The UI shows totals such as "3 / 5 steps · 2 inferences".
**No time estimates are shown** (timing depends on model and hardware).

---

## 4. State transitions

### 4.1 Run lifecycle

A run (single action or stack) moves through this lifecycle:

```
        ┌─────────┐   arm action / build valid stack
        │  idle   │ ───────────────────────────────────┐
        └─────────┘                                     │
             ▲                                          ▼
   reset /   │                                    ┌───────────┐
   new run   │                                    │  running  │
             │                                    └───────────┘
             │            ┌──────────────┬─────────────┼──────────────┐
             │            ▼              ▼             ▼               ▼
        ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
        │  done   │  │ partial  │  │  error   │  │cancelled │  │ (back to idle│
        └─────────┘  └──────────┘  └──────────┘  └──────────┘  │  on reset)   │
                                                                └──────────────┘
```

| State | Meaning | Output behavior |
|---|---|---|
| `idle` | No run in progress; ready to arm/build. | Output editor shows previous result or empty prompt. |
| `running` | Groups executing sequentially; step-progress indicator + Cancel shown. | Intermediate text never shown. |
| `done` | All groups completed successfully. | Final output rendered once. |
| `partial` | A group failed after retries, but earlier groups completed. | Output shows the last good result; the failed step is reported. |
| `error` | The run failed with no usable output. | No output; typed error surfaced. |
| `cancelled` | The user cancelled mid-run. | Last good group output is kept as partial output. |

Transitions and invariants:

- `idle → running` requires a non-empty input and at least one armed/valid step.
- `running → done` when the final group succeeds.
- `running → partial` when group *k* fails after retries are exhausted; the result carries the failed
  index and the partial output. Prior work is never discarded.
- `running → error` when the run fails before any usable output exists (for example a pre-flight
  validation failure surfaced at run, or the first group fails).
- `running → cancelled` when the user cancels: the orchestrator stops **after the current group**, and
  the last good output is returned as partial (`error = "cancelled"`).
- Any terminal state returns to `idle` on a new run or reset.
- **Single concurrent inference (global single-flight).** At most **one inference runs at a time across the
  entire app**. While a run is `running` — or while a provider **Test inference** is in flight — no new run
  and no new Test inference may start. The UI disables every run/Test-inference trigger globally (see §5);
  the backend enforces it with a process-wide gate that rejects any concurrent `ProcessPromptChain` /
  `TestInference` immediately with the typed `busy` error (no plan, no provider resolution, no LLM call, no
  history/tasklog write). The gate is released on `done` / `partial` / `error` / `cancelled` (and on panic).
  The `runId` additionally guards against stale progress events from a superseded run.

### 4.2 Provider state — current / not-current

The provider repository holds N provider configurations and exactly **one current** provider.

```
   not-current ──(Set as current)──▶ current
       ▲                                │
       └──(another provider set current,│
           or this provider deleted)────┘
```

- Setting a provider current makes the previously current provider not-current.
- A run always resolves the **current** provider as the active provider, and its `selectedModel` as the
  active model.
- Deleting the current provider repoints "current" to another provider (see §10, factory/delete edge
  cases).

### 4.3 Build-mode validity — valid / invalid

```
   (empty builder) ──add step──▶ valid ──add violating step──▶ invalid
        ▲                          │ ▲                            │
        │                          │ └────remove violating step───┘
        └──────remove all steps────┘
```

- The builder is **valid** when: ≤ 5 steps, ≤ 3 inference groups, at most one action per exclusivity
  group, and (for steps that require it) all required inputs (such as translate languages) are
  satisfiable.
- The builder is **invalid** when any cap or exclusivity rule is violated; Run is blocked while invalid.
- The live counter reflects validity; invalid combinations are surfaced inline and prevented from being
  added where possible.

---

## 5. User interactions per surface

### 5.1 Top toolbar (run context)

The toolbar is the single home for run context.

| Control | Interaction |
|---|---|
| Sidebar toggle | Show/hide the left sidebar (expanded ↔ collapsed icon strip). |
| Provider select | Open the provider list; pick the current provider; "Manage providers…" opens Settings · Providers. |
| Model select + refresh | Searchable model picker; pick the selected model; refresh re-runs discovery. |
| Language popover | Set input and output languages; **swap** them. |
| Format segment (Plain / Markdown) | Choose the output format (injected into prompts). |
| View segment (Preview / Source / Diff) | Switch output rendering. Diff requires existing output. |
| Layout segment (side / stacked) | Arrange the two editors. No automatic switching. |
| Command palette (`Cmd/Ctrl-K`) | Open the action search palette. |
| History toggle | Show/hide the right history rail. Disabled when history is off. |
| Info (ℹ) | Open the About · Info window. |
| Settings (⚙) | Open the Settings window. |

### 5.2 Left sidebar — Actions + My Stacks

| Control | Interaction |
|---|---|
| Search box | Live filter over actions and stacks. |
| My Stacks header + Manage | Open the Manage grid. |
| Saved-stack row | Click to arm the stack into the builder; context menu for run/edit/duplicate/delete. |
| Category header | Group label with count; shows a "1 max" hint for exclusivity groups while building. |
| Action row | Click to arm a single action (run-bar mode) or append a step (build mode). Greyed/disabled when its exclusivity group is already used, or when terminal/cap limits are reached. |

### 5.3 Editors — Input / Output

| Control | Interaction |
|---|---|
| Input editor | Type or edit text; shows word count. |
| Input · Paste | Paste clipboard contents into the input. |
| Input · Clear | Clear the input (disabled when empty). |
| Output editor | Shows the result in Preview / Source / Diff; shows a spinner while running; shows "Run to preview" when empty. |
| Output · Copy | Copy the output to the clipboard (disabled when empty); shows a success toast. |
| Output · Use as input | Move the output into the input editor for manual chaining (disabled when empty). |
| Output · Clear | Clear the output (disabled when empty). |
| Pane splitter | Divides the panes in side layout. |

### 5.4 Run bar and stack builder

**Single-action run bar:** the armed action chip with "1 inference", a quiet "Build a stack" affordance,
and **Run**. Run becomes Cancel + step progress while running; Run is disabled with no action or empty
input.

**Stack builder (build mode):** same-family chips grouped with an inference badge (for example
"Rewrite · 1 inference"); a remove control per chip; a live "N / 5 steps · M inferences" counter that
shows valid/invalid; **Cancel** (discard the build), **Save…** (disabled at 0 steps), and **Run**.

**While running (shared):** a step-progress indicator ("Step *i* of *N*", group family, spinner) and a
**Cancel** control; intermediate text is never shown; the final output is rendered once.

### 5.5 Output view modes

| Mode | Behavior |
|---|---|
| Preview | Rendered Markdown (or plain text). |
| Source | Raw output text. |
| Diff | Changed-word highlighting (additions and removals) with counts and a "Copy clean" affordance; requires both input and output. |

### 5.6 History rail (right)

| Control | Interaction |
|---|---|
| Header (with max badge + Clear) | Clear wipes all history after a destructive confirm. |
| Entry card | Click to view detail; shows title, time, status/inference chip, and preview. |
| Restore | Load input→input and output→output editors; re-arm action/stack when still valid. |
| Delete | Remove a single entry. |
| Empty state | "No runs yet" when there are zero entries, or "history disabled" when history is off. |

### 5.7 Overlays

| Surface | Interaction |
|---|---|
| Provider select | Choose the current provider; per-item local/cloud badge; "Manage providers…". |
| Model picker | Search/filter models; pick; refresh; "N of M models". |
| Language popover | Set input and output language; **swap**. |
| Command palette (`Cmd/Ctrl-K`) | Search actions; Enter runs the action; Shift+Enter adds it to the stack; arrows navigate; Esc closes. |
| Save-stack dialog | Name (unique; duplicate flagged inline), icon pick, resolved order/inference summary; Cancel / Save. |
| Stack context menu | Run · Edit steps · Duplicate · Delete (delete confirms). |
| Toasts | Success/info/error; typed error messages; progress with cancel; dismiss + auto-timeout. |
| Destructive confirm dialog | Confirm factory reset / delete provider / delete stack / clear history. |
| Tooltips | Labels for icon buttons on hover/focus. |

### 5.8 Settings sections

The seven settings sections and their controls are detailed in §9.

### 5.9 About · Info window

| Surface | Interaction |
|---|---|
| Guide sections | Read plain-language how-it-works; collapsible; shows dynamic paths/version. |
| Catalog search | Filter actions/stacks. |
| Action / Stack rows | Show name/description/badges or steps/inferences; click opens the Prompt Inspector. |
| Prompt Inspector | Show composed System + User prompt(s) and parameters per inference group, the output→input flow, a summary line, a Copy control per block, and a "Use current input" toggle. Read-only; no LLM call. |

---

## 6. Validation rules

| # | Rule | Where enforced | On failure |
|---|---|---|---|
| V1 | **Empty input is blocked.** A run cannot start with empty input. | Pre-flight (backend) + UI (Run disabled). | Run disabled; no LLM call. |
| V2 | **Step cap.** A stack has at most 5 selectable steps. | Backend planner + UI mirror. | Blocked in UI; rejected by backend as an invalid plan. |
| V3 | **Inference cap.** A stack yields at most 3 inference groups after merge. | Backend planner + UI mirror. | Blocked in UI; rejected by backend as an invalid plan. |
| V4 | **Exclusivity.** At most one action per exclusivity group per stack. | Backend planner + UI mirror. | Second action greyed/replaced in UI; rejected by backend if it slips through. |
| V5 | **Provider fields.** Base URL present and well-formed; selected model set; for Azure the deployment (selected model) present. | Provider pre-flight (backend) + Settings inline. | Typed validation error; no HTTP call. |
| V6 | **Credential resolution.** If the auth scheme is not "none", the credential environment-variable name must be set and must resolve at request time to a non-empty value. Secrets are read from the environment, never stored. | Token resolution (backend) at request time. | Typed missing-credential error; not retryable. |
| V7 | **Language required for translate.** Translate actions require both input and output languages. | Per-family `Requires` validation (backend) + UI. | Validation error; blocked until languages provided. |
| V8 | **Same-language translate = no-op.** When input language equals output language, the translate step passes the text through unchanged. | Orchestrator. | No LLM call for that step; input returned as output. |
| V9 | **Settings bounds.** Numeric settings (temperature 0–2, timeout, retries, history max-entries, log rotation) are validated against their bounds. | Settings validation (backend) + Settings inline. | Inline validation error on the offending field. |
| V10 | **Stack name uniqueness.** A saved stack name must be unique. | Stack save (backend) + Save dialog inline. | Duplicate flagged inline; save blocked. |
| V11 | **Single concurrent inference.** At most one inference (a chain run or a provider Test inference) may be in progress app-wide; a new one cannot start while another is running. | Process-wide single-flight gate (backend) + UI mirror (all run/Test-inference triggers disabled while busy). | UI disables the triggers; a concurrent backend call is rejected immediately with the typed `busy` error (no LLM call). |

Validation failures are non-retryable and are surfaced as typed errors — inline for field-level
validation, toast for run-level failures (see §8).

---

## 7. Permissions and trust model

- GoText is a **single-user local desktop application**. There is **no authentication, no user
  accounts, and no roles**. All functionality is available to the single local user.
- There is no multi-tenant or networked-user concept; the app operates entirely on the local machine.
- **Secrets are supplied only via environment variables.** A provider configuration stores the **name**
  of an environment variable, never the secret itself. The secret is read from the environment at
  request time and is never persisted, never logged, and never placed into prompt text or error
  details.
- All persisted data (settings, providers, saved stacks, history) is local and contains no credentials.

### 7.1 Supported provider kinds

Exactly five provider kinds are supported. All share one OpenAI-compatible chat wire format and differ
only in completion URL, auth scheme, discovery endpoint/shape, and minor body quirks (captured by a
per-kind profile). Provider categories are referenced generically.

| Kind | Category | Default auth | Notes |
|---|---|---|---|
| `ollama` | Ollama (local) | none (optional bearer) | OpenAI-compatible `/v1` surface; native discovery at `/api/tags`. |
| `lmstudio` | LM Studio (local) | none (optional bearer) | OpenAI-compatible `/v1` surface; optional rich discovery for capabilities. |
| `llamacpp` | llama.cpp-compatible (local) | none (optional bearer) | OpenAI-compatible `/v1` surface; often serves a single model. |
| `openai` | OpenAI-compatible | bearer | OpenAI-compatible endpoints; custom headers supported. |
| `azure` | Azure-compatible | api-key | Deployment-style API; absorbs the deployment-proxy case (api-version optional). |

All three local kinds may be secured with an optional bearer token sourced from an environment variable.
Provider field contracts, discovery strategies, and verification are specified in
`04-providers-inference.md`. Anthropic-compatible and Google-compatible native vendors are
future provider implementations behind the same interface and are out of scope for the five kinds above.

---

## 8. Error handling

Errors are classified once at their source into a single typed error model and presented once on the
frontend, keyed by an error code plus safe details. The full error specification is in
`07-error-handling-logging.md`; this section states the confirmed functional behavior.

### 8.1 Typed error codes

| Code | Meaning | Retryable | Surfaced as |
|---|---|---|---|
| `validation` | Bad/missing field value (pre-flight). | No | Inline on the field. |
| `invalid_plan` | Stack cap/exclusivity violation. | No | Toast. |
| `busy` | An inference is already running (single-flight); a concurrent run/Test-inference was rejected. | No | Toast (warning). |
| `auth` | Authentication rejected (401/403). | No | Toast. |
| `missing_credential` | Credential environment variable unset/empty. | No | Toast. |
| `provider_unreachable` | Dial/connection failure. | Yes | Toast. |
| `timeout` | Request deadline exceeded. | Yes | Toast. |
| `rate_limited` | Provider rate-limiting (429). | Yes | Toast (warning). |
| `model_not_found` | Model/deployment not found (404). | No | Toast. |
| `upstream` | Provider server error (5xx). | Yes | Toast. |
| `empty_completion` | Empty content on a successful response. | No (policy) | Toast (warning). |
| `context_window` | Input exceeds the model's context window. | No | Toast. |
| `step_failed` | A chain step failed; earlier steps completed. | (inner) | Toast. |
| `cancelled` | Run cancelled by the user. | No | Info toast. |
| `internal` | Unexpected/unclassified failure. | Yes | Toast with Retry. |

### 8.2 Presentation and routing rules

- **Field-level validation** errors are shown **inline** on the offending field.
- **Run and provider** errors are shown as **toasts** with a clear, typed message that includes the
  provider, model, environment-variable name, timeout, or reason as appropriate — never an internal
  code path, file path, stack trace, or secret.
- **Retryable** codes may offer a **Retry** affordance for the final surfaced error; automatic
  backoff/retry has already happened below the boundary, so the user only sees an error after retries
  are exhausted.

### 8.3 Retry policy

- Only transient error classes are retried: `provider_unreachable`, `timeout`, `rate_limited`,
  `upstream`. Non-transient classes (`auth`, `model_not_found`, `missing_credential`, `validation`,
  `invalid_plan`) are **never** retried.
- Retries use exponential backoff with jitter; on rate-limiting the provider's `Retry-After` is honored
  when present.
- Retries occur **below the boundary**, per inference step. A mid-chain retry does **not** restart the
  chain from the beginning.
- Retry counts and timeouts come from generation settings (default 3 retries, default 60-second
  timeout, both bounded).

### 8.4 Partial results and cancel

- **Partial chain results are always kept.** If group *k* fails after retries are exhausted, the run
  returns the completed output (groups 1…*k*−1), the failed step index, and the typed error in a single
  result. The output is rendered and the failure is reported.
- **Cancel keeps partial output.** Cancelling stops the orchestrator after the current group and returns
  the last good output as partial, with a "cancelled" outcome. An informational toast notes the step
  after which the run was cancelled.

---

## 9. Configuration behavior

### 9.1 Persistence and seeding

- Settings, provider configurations, saved stacks, and history are persisted in **SQLite**. Persistence
  details and schema are specified in `06-data-model-database.md`.
- On a **fresh database** the application seeds default settings on first launch (for example default
  theme `auto`, history enabled with 100 max entries, default generation timeout/retries, default
  language configuration). No credentials are ever seeded.
- All persistence sits behind repository abstractions (provider, stack, history, settings), so the
  storage layer can evolve without changing functional behavior.

### 9.2 Live-applied changes

- **Theme** changes (Auto / Light / Dark) apply instantly with no restart; in Auto the app live-follows
  the OS color scheme.
- **Logging** changes — diagnostic app-log level and file logging toggle — reconfigure the logger live.
- **History** toggle and max-entries changes take effect on the next recorded run (lowering max-entries
  prunes to the new maximum on the next write).

### 9.3 Settings sections and controls

| Section | Controls (confirmed) |
|---|---|
| **Providers** | Provider list (master-detail); name (unique); kind (five kinds); auth scheme (None/Bearer/Api-Key); credential environment-variable name; base URL; models/completion endpoint overrides; api-version (Azure, optional); model/deployment picker + refresh; custom headers (key/value); custom models (tag input); Verify (Test connection / Test models / Test inference); Set as current; Delete; Save. |
| **Model** | Model picker + refresh; use-temperature switch + slider (0–2) with capability-aware pre-fill; use-context-window switch + slider; token-limit choice (`max_completion_tokens` vs `max_tokens`). |
| **Generation** | Request timeout (seconds, bounded); max retries (bounded; transient only); request-Markdown-output switch (same as the toolbar Format control). |
| **Languages** | Add language; per-language default-input / default-output badges; row menu to set defaults or remove. |
| **Logging** | Task-logging switch (per-step prompts/results to files); diagnostic app-logging switch; log level; log rotation (max size / backups / max age / compress); log directory + open-logs-folder; **history** switch; history max-entries (default 100); clear-history. |
| **About & data** | App version; database path and logs path (copyable); **Factory reset** (confirm). |
| **Appearance** | Theme segmented control (Auto / Light / Dark) — the only theme control; preview swatches. |

### 9.4 History retention

- History keeps the newest **N** entries (default N = 100; configurable; can be disabled entirely).
  Pruning happens on insert.
- Disabling history stops new writes but **preserves existing entries**; the user removes them via
  Clear.
- History stores applied-action labels and final input/output (not prompts; prompts remain in the
  separate diagnostic task log when enabled). Full specification in `06-data-model-database.md`.

### 9.5 Diagnostic logging coexistence

History (the user-facing feature), the per-step diagnostic task log, and the general application logger
are **independent** and can be toggled on or off without affecting each other.

---

## 10. Edge cases

| # | Edge case | Required behavior |
|---|---|---|
| E1 | **Empty input** | Run blocked at pre-flight and disabled in the UI. No LLM call. |
| E2 | **Same-language translate** | No-op pass-through; the step returns its input. If translate is the only step, output equals input. |
| E3 | **Exclusivity violation** | A second action in the same exclusivity group is greyed/replaced in the UI and rejected by the backend as an invalid plan. |
| E4 | **Cap violation** | More than 5 steps or more than 3 inference groups is blocked in the UI and rejected by the backend as an invalid plan. |
| E5 | **Terminal pinning** | Summarize, Translate, and Prompt-Engineering are forced to the end of the pipeline regardless of click order. |
| E6 | **Prompt-Engineering in a multi-step stack** | Prompt-Engineering runs standalone only; it is not chained with prose-rewrite actions. |
| E7 | **Large input/output** | Stored whole in history (retention bounds DB growth); list previews are truncated, the detail view shows full text; the Prompt Inspector shows full prompts scrollable, no truncation. |
| E8 | **Missing credential** | When the credential environment variable is unset/empty and auth is required, a typed `missing_credential` error is surfaced; not retryable. |
| E9 | **Provider unreachable** | Dial/connection failure surfaces `provider_unreachable`; retried as transient below the boundary, then surfaced if still failing. |
| E10 | **Timeout** | A request that exceeds the configured timeout surfaces `timeout`; retried as transient, then surfaced. |
| E11 | **Rate limited** | A 429 surfaces `rate_limited`; retried with backoff honoring `Retry-After`, then surfaced if exhausted. |
| E12 | **Model / deployment not found** | A 404 surfaces `model_not_found`; not retryable. |
| E13 | **Context window exceeded** | Input that exceeds the model's context window surfaces `context_window`; not retryable; the user shortens the input or raises the context size. |
| E14 | **Removed action in a saved stack** | On load, unknown/removed action IDs are dropped with a warning; the saved stack remains usable with its remaining valid steps. |
| E15 | **Removed action on history restore** | Restore always loads the entry's text; if a referenced action no longer exists, the text is restored and an "actions changed" note is shown. |
| E16 | **History disabled** | New runs are not recorded; existing entries are preserved; the history rail shows a "history disabled" empty state; the toolbar history toggle is disabled. |
| E17 | **Fresh install seed** | On a fresh database, default settings are seeded on first launch; no credentials are seeded. |
| E18 | **Delete current provider** | Deleting the current provider repoints "current" to another provider; if no provider remains, no provider is current and runs are blocked with a guiding empty state until a provider is added. |
| E19 | **Factory reset** | Wipes settings, providers, saved stacks, and history, then reseeds defaults; requires a destructive confirmation. |
| E20 | **Cancel mid-run** | The orchestrator stops after the current group and keeps the last good output as partial; an informational toast reports the step after which the run was cancelled. |
| E21 | **Partial failure mid-chain** | The completed output (groups 1…*k*−1) is kept; the failed step index and typed error are reported; prior work is not discarded. |
| E22 | **Empty completion** | A successful response with empty content surfaces `empty_completion`; not retried by default. |
| E23 | **Empty model list** | When discovery returns no models and no custom models are configured, the model picker is empty and the user can type a model id manually. |
| E24 | **Verification without a selected model** | Test inference requires a selected model; if none is set, the user is prompted to pick or refresh first. Local providers with auth "none" skip the credential step in Test connection. |
| E25 | **Concurrent runs / single-flight** | At most one inference runs at a time app-wide. While a run or a provider Test inference is in progress, all run/Test-inference triggers are disabled in the UI, and any concurrent `ProcessPromptChain`/`TestInference` reaching the backend is rejected immediately with the typed `busy` error (no LLM call). The gate releases on done/partial/error/cancel; the `runId` additionally discards stale progress events from a superseded run. |

---

## 11. Confirmed invariants (summary)

1. A single action is the degenerate one-step chain — one code path for single actions and stacks.
2. Action metadata is the single source of truth for ordering, exclusivity, and merging; the backend
   validates and the frontend mirrors.
3. Canonical order, ≤ 5 steps, ≤ 3 inference groups, and one-per-exclusivity-group are enforced
   server-side.
4. Runs are non-streaming; provider, model, and temperature are fixed for the whole chain; the final
   result is rendered once; intermediate text is never shown.
4a. **At most one inference runs at a time across the whole app** (single-flight gate, shared by chain
   runs and provider Test inference); concurrent attempts are rejected with the typed `busy` error and the
   UI disables all run/Test-inference triggers while busy.
5. Cancel stops after the current group and keeps partial output; a step failure keeps the partial
   output and the failed index.
6. Retries happen below the boundary for transient errors only; the user sees an error only after
   retries are exhausted.
7. Credentials are supplied only via environment variables and are never persisted, logged, or placed
   into prompts or error details.
8. The application is single-user and local, with no authentication or roles.
9. The Prompt Inspector reuses the real planner/composer, so a preview never diverges from a real run.
10. Settings, providers, stacks, and history persist in SQLite with defaults seeded on a fresh database;
    theme, logging, and history changes apply live.
