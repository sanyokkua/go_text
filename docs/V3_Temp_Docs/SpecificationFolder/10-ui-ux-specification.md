# 10 — UI/UX Specification (Behavior, States & Patterns)

> **Application:** GoText — *"GoText"* — a desktop text-processing app.
> **Stack:** React 19 + TypeScript + Redux Toolkit, Radix Primitives (+ `cmdk` for searchable
> lists/command palette), and a custom tokenized CSS theme system, rendered inside a Wails webview.
> **Status:** Specification. Self-contained. Confirmed requirements only.

This document specifies the **behavior, states, accessibility, validation, and interaction patterns** of
the GoText user interface. It is the companion to **`11-mockup-documentation.md`**, which covers the
**screen-by-screen visual layout** of every view. Where this document references *what a screen looks
like or how it is composed*, see `11-mockup-documentation.md`; this document defines *how every element
behaves and what states it can be in*.

Other related specifications, cross-referenced by filename:
`02-functional-requirements.md`, `03-architecture.md`, `04-providers-inference.md`,
`05-stacks-actions-engine.md`, `06-data-model-database.md`, `07-error-handling-logging.md`,
`08-api-contracts.md`. Backend handler/method names cited below (e.g. `ProcessPromptChain`,
`SetAsCurrentProviderConfig`) are the Wails-bound contracts defined in `08-api-contracts.md`.

---

## Table of contents

- [0. Global state vocabulary](#0-global-state-vocabulary)
- [A. Views](#a-views)
  - [A.1 Editor (main) view](#a1-editor-main-view)
  - [A.2 Settings view (7 sections)](#a2-settings-view-7-sections)
  - [A.3 My Stacks · Manage view](#a3-my-stacks--manage-view)
  - [A.4 About · Info view](#a4-about--info-view)
- [B. UI elements](#b-ui-elements)
  - [B.1 Toolbar elements](#b1-toolbar-elements)
  - [B.2 Sidebar elements](#b2-sidebar-elements)
  - [B.3 Editor panes & per-pane buttons](#b3-editor-panes--per-pane-buttons)
  - [B.4 Run bar & stack builder chip bar](#b4-run-bar--stack-builder-chip-bar)
  - [B.5 History rail](#b5-history-rail)
  - [B.6 Overlays](#b6-overlays)
  - [B.7 Settings controls](#b7-settings-controls)
  - [B.8 Specialized composite controls](#b8-specialized-composite-controls)
  - [B.9 Prompt Inspector blocks](#b9-prompt-inspector-blocks)
- [C. Patterns](#c-patterns)
- [D. Global state vocabulary (reference tables)](#d-global-state-vocabulary-reference-tables)

---

## 0. Global state vocabulary

The whole UI is described with a small, fixed vocabulary of states. Every element table in this document
uses these terms; the consolidated reference tables are in [Section D](#d-global-state-vocabulary-reference-tables).

- **Interaction:** `default · hover · focus · pressed · disabled` (disabled renders greyed/non-interactive).
- **Toggle / selection:** `on / off` (Switch, ToggleGroup segments) · `selected / unselected` (nav items,
  list rows).
- **Async:** `idle · loading (busy/spinner) · success · error`.
- **Data:** `empty / populated` · `valid / invalid` (validation).
- **Collapsible:** `expanded / collapsed`.
- **Run lifecycle (single action or stack):** `idle → running → done | partial | error | cancelled`.
- **Provider:** `current / not-current`. **Language:** `default-input / default-output / plain`.
- **Effective theme:** `light / dark`, resolved from the `ui.theme` mode (`auto | light | dark`).

Cross-cutting rules that apply everywhere:

- Every long-running operation shows a spinner or progress indicator and resolves to `success` or
  `error`; the UI never shows a raw stack trace.
- All errors surface as **typed toasts or inline messages** using the error taxonomy in
  `07-error-handling-logging.md`. All bound calls return the uniform Result envelope defined in
  `08-api-contracts.md`, consumed by the frontend before rendering.
- **Single source of truth:** provider, model, language, format, view mode, layout, and theme each map
  to exactly one Redux slice value. The toolbar and Settings always reflect the same value.

---

## A. Views

GoText is a single-window desktop application. The **Editor** is the home view. **Settings**,
**My Stacks · Manage**, and **About · Info** are full-screen views that replace the editor and return to
it via a `‹ Editor` back control in their header. Transient surfaces (dropdowns, popovers, dialogs,
toasts) overlay the current view rather than replacing it.

### A.1 Editor (main) view

**Purpose.** The primary workspace: enter or paste text, arm a single action or build/run a stack against
a configured provider/model/language, and read the result. It is the only home for *run context*
(provider, model, language, format, view mode, layout). For the visual composition of this screen, see
`11-mockup-documentation.md`.

**Layout.**

- **Top toolbar** (run context): sidebar toggle, brand logo, provider select, model picker + refresh,
  language dual popover, then a right-aligned cluster of Format / View / Layout segmented controls,
  command palette (⌘K), history toggle, info, and settings.
- **Left sidebar:** live search box, **My Stacks** group (with **Manage ›**), then **Actions** grouped by
  category. Collapsible to an icon strip via the toolbar toggle.
- **Center:** two text panes — **Input** and **Output** — each with its own per-pane button row. In
  **Side** layout they sit side by side separated by a splitter; in **Stacked** layout Input is on top,
  Output below, full width.
- **Run bar** at the bottom of the center area: the armed-action chip + inference count, **＋ Build a
  stack**, and **Run ▶**. In Stacked layout the run bar falls naturally between the two panes.
- **History rail** (right, optional): a toggled column listing past runs.

| State | Behavior |
|---|---|
| Default (single action armed) | Toolbar carries run context; one action armed in the run bar; Run enabled when input is non-empty. |
| Build mode | Run bar becomes the stack builder chip bar (see [B.4](#b4-run-bar--stack-builder-chip-bar)); sidebar actions append steps instead of replacing the armed action. |
| Running | Run becomes Cancel; step progress shows above/within the output; output shows a centered spinner with "Generating — *step name*". Intermediate text is never shown. |
| History open | Right rail visible; toggled by the toolbar history button. |

**Loading states.** On first mount, provider/model/language/format/layout/theme hydrate from settings
(`08-api-contracts.md`); the theme class is applied *before first paint* to avoid a flash (see
[C, Configuration pattern](#c-patterns)). Model lists load lazily when the model picker opens or refresh
is pressed. While a run is in progress the output pane shows the generating spinner.

**Empty states.**

- **No input:** input pane empty; Run disabled; Clear disabled.
- **No output yet:** output pane shows the placeholder "Run to preview →".
- **No providers configured:** provider select shows a guiding hint and a primary action linking to
  **Settings · Providers** (see [C, Empty states](#c-patterns)).
- **No models:** model picker shows an empty state with a refresh affordance.

**Error states.** Run failures surface as typed toasts (auth / timeout / rate-limit / not-found / etc.,
per `07-error-handling-logging.md`). A **partial** stack run keeps completed output and names the failed
step. A global render error is caught by the React error boundary, which shows a fallback with a
**Reload** action and reports the failure to the backend via the bound `LogError`
(`08-api-contracts.md`).

**Responsive behavior.**

- **Desktop (primary):** full layout as above; Side layout default.
- **Tablet / narrow window:** the layout does not auto-switch the editor arrangement (Side/Stacked is a
  user choice), but the sidebar collapses to an icon strip and the history rail collapses; the toolbar
  wraps its control clusters onto a second row. Stacked layout is recommended for narrow windows for
  single-column reading.
- **Minimum window size:** the app enforces a minimum width/height below which the sidebar stays
  collapsed and the toolbar segments may wrap; panes never shrink below a legible minimum (content
  scrolls instead).

### A.2 Settings view (7 sections)

**Purpose.** Configure every persistent preference: providers, model parameters, generation, languages,
logging & history, app data & reset, and appearance. Settings persist to SQLite (`06-data-model-database.md`);
theme and logging apply live. The visual layout of each section is documented in `11-mockup-documentation.md`.

**Layout.** A header with `‹ Editor` (close → back to editor) and the title **Settings**, a **vertical
left nav** (Radix Tabs, vertical orientation) listing the seven sections, and a right panel that switches
to the selected section. The seven sections, in order: **Providers · Model · Generation · Languages ·
Logging · About & data · Appearance**.

| Section | Purpose | Key behavior |
|---|---|---|
| **Providers** | Master–detail editor for provider configs. | Select a provider to edit; create/delete; mark current; verify; save. Detailed in [B.7](#b7-settings-controls). |
| **Model** | Per-model inference parameters. | Model picker + refresh; temperature/context toggles + sliders; token-limit radio. Capability-aware pre-fill. |
| **Generation** | Request-level inference base config. | Timeout stepper, max-retries stepper, Markdown-output switch (mirrors the toolbar Format segment). |
| **Languages** | The language list and defaults. | Add language, per-row default-input/default-output/remove via row menu. |
| **Logging** | Task logging, diagnostic file logging + rotation, and history. | Independent switches; level select; rotation steppers + compress; log dir + open folder; history enable + max entries + clear. |
| **About & data** | Version, data paths, factory reset. | Copy DB/logs paths; Factory reset (destructive confirm). |
| **Appearance** | Theme mode. | Segmented Auto / Light / Dark; applies instantly, persists `ui.theme`. |

**Loading states.** Each section reads its current values on entry; the Providers section loads the
provider list (`GetAllProviderConfigs`) and lazily loads model lists when a picker opens. Verification checks run
asynchronously with per-check spinners.

**Empty states.** Providers with **no configured providers** shows a "create your first provider" hint
with **＋ New provider** as the primary action. Languages with only the seeded defaults still shows the
list. Model picker with no discovered models shows an empty state plus refresh.

**Error states.** Save validation failures show **inline** messages on the offending field (see
[C, Form patterns](#c-patterns)); they do not navigate away. Verification failures render a per-check ✗
with a typed reason. A missing API-key environment variable is *not* a settings error — it surfaces at
run time as `ErrMissingCredential` (per `04-providers-inference.md`).

**Responsive behavior.** On a narrow window the vertical Tabs nav can collapse to a compact rail; the
Providers master list and detail panel stack vertically rather than side by side; long forms scroll.

### A.3 My Stacks · Manage view

**Purpose.** Browse, run, edit, duplicate, and delete saved stacks in a card grid, and start a new stack.
See `11-mockup-documentation.md` for the grid layout.

**Layout.** Header with `‹ Editor`, the title **My Stacks**, and a right-aligned **＋ New stack**. Below,
a responsive card grid: one self-describing card per saved stack plus a dashed **＋ Build a new stack**
tile. Each card shows icon, name, a steps-summary line, step/inference badges, and **Run ▶ / Edit ✎** plus
a **⋮** menu (Duplicate / Delete).

**Loading states.** The grid loads from `ListStacks` (`08-api-contracts.md`). Running a card from here triggers a run that
returns the user to the editor with the run in progress. Each card's **Run ▶** is **disabled while any
inference is in progress** (global single-flight; `ui.inferenceRunning`).

**Empty states.** With **no saved stacks**, only the dashed **＋ Build a new stack** tile is shown, acting
as the primary call to action.

**Error states.** Delete is destructive and confirmed via AlertDialog. A failed run surfaces as a typed
toast (per `07-error-handling-logging.md`).

**Responsive behavior.** The grid reflows column count by available width (multi-column on desktop down to
a single column on a narrow window); cards never truncate below their core summary.

### A.4 About · Info view

**Purpose.** In-app help and transparency: a plain-language **Guide**, the full **Actions & Stacks**
catalog, and the **Prompt Inspector** that shows the exact composed prompt(s) sent to the model. Reuses
the real planner/composer (`PreviewPrompt`) so the preview never drifts from what is actually sent; it
makes no model call. Opened from the toolbar **ℹ** button. See `11-mockup-documentation.md` for layout.

**Layout.** Header with `‹ Editor` and the title **About · Info**, a vertical nav with **Guide** and
**Actions & Stacks**. The Actions & Stacks view splits into a left catalog list (search + grouped
actions + My Stacks) and a right **Prompt Inspector** panel for the selected action/stack.

| Sub-view | Purpose | Behavior |
|---|---|---|
| **Guide** | How the app works and what each setting does. | Collapsible sections; dynamic paths/version from `GetAppSettingsMetadata`. |
| **Actions & Stacks** | Catalog + Prompt Inspector. | Click any action/stack row to load its composed prompt(s) into the inspector. |
| **Prompt Inspector** | Read-only composed System + User prompt(s) and parameters per inference. | Single action → one block; stack → one block per inference with a flow connector; per-block **Copy**; **Use current input** toggle; summary line. |

**Loading states.** The inspector shows a brief loading state while `PreviewPrompt` composes the
prompt(s). The catalog loads from `GetActionCatalog` and `ListStacks`. Dynamic guide values come from
`GetAppSettingsMetadata`.

**Empty states.** Catalog search with no matches shows a "no results" hint. With nothing selected, the
inspector shows a neutral "select an action or stack" prompt.

**Error states.** If composition fails, the inspector shows an inline error (typed per
`07-error-handling-logging.md`) rather than a partial block.

**Responsive behavior.** On a narrow window the catalog list and inspector stack vertically; the inspector
panel scrolls independently.

---

## B. UI elements

Each element below documents **Purpose · Logic · States · Accessibility · Validation · Styling guidance ·
Interaction rules**. Accessibility is provided primarily by the backing Radix primitive (focus
management, ARIA roles, keyboard, collision-aware positioning); GoText supplies styling and ensures
`focus-visible` rings and WCAG AA contrast in both themes. Styling is driven by design tokens
(see [C, Configuration pattern](#c-patterns) and `11-mockup-documentation.md`); a single root `.dark`
class flips the entire token set — no per-component theme code.

### B.1 Toolbar elements

The toolbar is the **only** home for run context. There is **no theme toggle in the toolbar** — theme
lives solely in **Settings · Appearance**.

| Element | Purpose | Logic | States | Accessibility |
|---|---|---|---|---|
| **Sidebar toggle ☰** | Show/hide the left sidebar. | Toggles `ui.sidebarCollapsed`. | `on` (expanded) / `off` (collapsed → icon strip); hover/focus/pressed. | Toggle button; `aria-pressed`; tooltip label; keyboard-toggleable; focus-visible ring. |
| **Brand logo** | Static brand mark. | None. | Static. | Decorative; not a focus stop. |
| **Provider select ▾** | Pick the **current** provider; jump to manage. | `GetAllProviderConfigs`; `SetAsCurrentProviderConfig`; "⚙ Manage providers…" opens Settings · Providers. | `closed/open`; trigger shows accent when a current provider is set; per-item selected/hover. | Radix Select: full keyboard nav, ARIA listbox, typeahead, focus trap while open. |
| **Model picker ▾ + refresh ⟳** | Searchable model picker; refresh discovery. | Searchable list (`cmdk` in a Popover); sets selected model via `UpdateModelConfig`; ⟳ re-runs `GetModels` discovery. | `closed/open`; `filtering`; `loading` (during refresh); `empty` (no models); shows "N of M models". | `cmdk` combobox in Radix Popover: arrow-key nav, type-to-filter, Enter to select, Esc to close; refresh is a labeled icon button. |
| **Language dual popover ▾** | Set input + output language; swap. | Reads/writes language config (`06-data-model-database.md`); **⇄ Swap** exchanges input/output. | `closed/open`; per-side selected; swap pressed. | Radix Popover containing two `cmdk` lists; each list keyboard-navigable; swap is a labeled button. |
| **Format segment (Plain / Markdown)** | Choose output format. | Sets `inference.useMarkdownForOutput`; injects the format directive into the prompt. Mirrors **Settings · Generation**. | `Plain-on` / `Markdown-on` (exactly one). | Radix ToggleGroup (single); roving tabindex, arrow-key nav, `aria-pressed`. |
| **View segment (Preview / Source / Diff)** | Switch output rendering. **Preview** renders Markdown via the shared `MarkdownView` (see `16-markdown-rendering.md`); **Source** shows raw text; **Diff** shows the word-level diff. | Sets `editor.viewMode`; Diff requires both input and output. | One selected; **Diff disabled** until output exists. | ToggleGroup (single); disabled Diff is `aria-disabled`; tooltip explains why. |
| **Layout segment (⊞ Side / ⊟ Stacked)** | Editor arrangement. | Sets `ui.layout`; CSS grid direction swap. No auto-switch. | `Side-on` / `Stacked-on`. | ToggleGroup (single); arrow-key nav. |
| **⌘K palette** | Open the command palette. | Opens the `cmdk` Dialog (see [B.6](#b6-overlays)). | — | Icon button; global keyboard shortcut ⌘K; tooltip shows the shortcut. |
| **History 🕘** | Toggle the right history rail. | Toggles `ui.historyOpen`; loads `ListHistory`. | `on` (open) / `off`; **disabled** when history is off in settings. | Toggle button; `aria-pressed`; disabled state explained by tooltip. |
| **Info ℹ** | Open About · Info. | Navigates to the About · Info view. | — | Icon button; tooltip; focus-visible. |
| **Settings ⚙** | Open Settings. | Navigates to the Settings view. | — | Icon button; tooltip; focus-visible. |

**Styling guidance.** Selects/segments use the surface-2 / line / accent tokens; the *current* provider
trigger and *on* segments use the teal accent tokens. Icon buttons are 31px (24px in dense per-pane rows).
**Interaction rules:** changing provider, model, language, format, or layout updates the single source of
truth and is reflected immediately wherever else it appears (Settings, run context).

### B.2 Sidebar elements

| Element | Purpose | Logic | States | Accessibility |
|---|---|---|---|---|
| **Search box** | Live-filter actions & stacks. | Client-side filter over the catalog. | `empty / typing`; `results / no-results`. | Labeled text input; results announced; `Esc` clears. |
| **My Stacks header + Manage ›** | Group label; open the Manage grid. | Opens the My Stacks · Manage view. | Default/hover. | Manage is a button/link; keyboard-activatable. |
| **Saved-stack row** | Arm a stack into the builder; open its menu. | Click → arm the stack into the run bar/builder (`05-stacks-actions-engine.md`); **⋮** opens the context menu. | `selected/armed`; hover; menu open. | Row is a button; ⋮ opens a Radix DropdownMenu (keyboard + ARIA). |
| **Section header (category · count)** | Group actions; show count and a "1 max" hint while building. | From `GetActionCatalog` metadata; the hint appears in build mode for single-per-family categories. | Default; build-mode hint shown. | Heading semantics; not interactive. |
| **Action row** | Arm a single action (run bar) or append a step (build mode). | Catalog metadata; selecting enforces one-per-exclusivity-family, ≤ 5 steps, and canonical order, mirroring the backend planner (`05-stacks-actions-engine.md`). | `selected ✓`; **disabled/greyed** when exclusivity already satisfied or the cap is reached; hover/focus. | Button/option semantics; disabled rows are `aria-disabled` with a tooltip reason. |
| **Collapsed icon strip** | Sidebar in collapsed mode. | `ui.sidebarCollapsed`. | `collapsed`. | Icon buttons retain tooltips/labels. |

**Validation rules.** In build mode, adding a second same-exclusivity action is blocked (the conflicting
rows grey out); exceeding 5 steps or 3 inferences is blocked. These mirror the backend cap/exclusivity
rules in `05-stacks-actions-engine.md`. **Styling guidance:** selected/armed rows use the teal accent
background + border; disabled rows reduce opacity. **Interaction rules:** in single-action mode selecting
an action *replaces* the armed action; in build mode it *appends* a step.

### B.3 Editor panes & per-pane buttons

| Element | Purpose | Logic | States | Accessibility |
|---|---|---|---|---|
| **Input editor** | Type/edit the source text. | Bound to `editor.input`; shows a live word count. | `empty / populated`. | Multiline text area; labeled; standard text-editing keyboard. |
| **Input · Paste 📋** | Paste clipboard into input. | `ClipboardGetText` → `editor.input`. | Default/hover. | Labeled icon button; tooltip; focus-visible. |
| **Input · Clear ✕** | Clear the input. | `editor.input = ''`. | **disabled** when input empty. | Labeled icon button; disabled is `aria-disabled`. |
| **Output editor** | Show the result (Preview / Source / Diff). Preview rendering, theming, and security are defined in `16-markdown-rendering.md`. | Bound to `editor.output` + `viewMode`. | `empty` ("Run to preview →"); `rendered`; **running** (spinner + "Generating — *step*"); `diff`. | Read-only region; live status announced for running/done. |
| **Output · Copy ⧉** | Copy output to clipboard. | `ClipboardSetText`; success toast. | **disabled** when output empty. | Labeled icon button; success announced via toast. |
| **Output · Use as input ↺** | Move output → input (manual chaining). | `editor.input = editor.output`. | **disabled** when output empty. | Labeled icon button; tooltip. |
| **Output · Clear ✕** | Clear the output. | `editor.output = ''`. | **disabled** when output empty. | Labeled icon button. |
| **Pane splitter** | Visually divide the Input and Output panes in Side layout. | A static, non-draggable divider in v3; the two panes are equal-width (the editor grid is `1fr 8px 1fr`). Present only in Side layout. | Default. | Decorative separator; not a focus stop (no resize handle in v3). |

**Validation rules.** None on free text. **Styling guidance.** Editors use the surface-2 background with a
mono font for raw text; the Output Preview uses the prose body font; Diff highlights use the
added/removed tokens (green add, struck red remove). **Interaction rules.** Copy/Clear/Use-as-input are
all gated on their target pane being non-empty.

### B.4 Run bar & stack builder chip bar

The run bar has two modes: **single-action run bar** and **stack builder**.

| Element | Mode | Purpose | Logic | States |
|---|---|---|---|---|
| **Armed-action chip** | single | Shows the armed action + "1 inference". | Reflects the selected action. | `armed / none`. |
| **＋ Build a stack** | single | Switch the run bar into stack builder. | Enters build mode (`05-stacks-actions-engine.md`). | Default. |
| **Run ▶** | both | Execute the single action or the (unsaved) stack. | `ProcessPromptChain` (`04-providers-inference.md`, `05-stacks-actions-engine.md`). | `idle`; **running** (→ becomes **Cancel** with step progress); **disabled** when no action armed or input empty, **or while any other inference is in progress** (global single-flight). |
| **Family group chip(s)** | build | Show merged same-family actions + "*Family* · N inference". | Merge grouping per `05-stacks-actions-engine.md`. | Populated. |
| **Chip remove ✕** | build | Drop a step. | Removes from the builder. | Default/hover. |
| **＋ Add step** | build | Hint to click sidebar actions. | — | Default. |
| **Live counter** | build | "N / 5 steps · M inferences". | Planner mirror (`05-stacks-actions-engine.md`). | `valid`; **invalid** (cap/exclusivity → blocked). |
| **Cancel (builder)** | build | Discard the build. | Clears the builder. | Default. |
| **Save…** | build | Open the Save-stack dialog. | Opens the dialog → `CreateStack` (a new stack) or `UpdateStack` (saving an edited existing stack). | **disabled** when 0 steps. |

**Run lifecycle (shared).** `idle → running → done | partial | error | cancelled`. While **running**, a
step-progress indicator ("Step *i* of *N*", current family name, spinner) appears and **Run** becomes a
**Cancel** control. Intermediate per-step text is never shown; the final result renders once. On
**partial/error**, completed output is kept and the failing step is named via a typed toast. **Cancel**
calls `CancelChain(runId)` — the run stops after the current group and keeps partial output. Progress is
driven by `chain:progress` events; errors are typed (`07-error-handling-logging.md`).

**Single concurrent inference (global single-flight).** At most **one inference runs at a time across the
whole app**. While any inference is in progress — the current run **or** a provider **Test inference** in
Settings — **every** way to start a new inference is disabled: the **Run ▶** button here, the **Run ▶** on
each My Stacks card, the ⌘K palette's run/add-and-run actions, and the **Test inference** button in
Settings · Providers. The only run-related control that stays live during a run is its own **Cancel**. A
single global `ui.inferenceRunning` flag (set while a run or Test inference is active) drives all these
disabled states. This UI gating mirrors the backend single-flight gate (`05-stacks-actions-engine.md
§4.5`); if a call still reaches the backend concurrently it returns the typed `busy` error, surfaced as a
warning toast ("An inference is already running…").

**Accessibility.** Run/Cancel is a single labeled button whose accessible name updates with state; step
progress is announced via a live region. The builder chip bar exposes remove buttons with accessible
names. **Validation rules:** Run is disabled with no armed action or empty input, or while another
inference is in progress; Save is disabled with 0 steps; the live counter blocks when cap/exclusivity is
violated. **Styling guidance:** build mode tints the bar with the teal accent gradient and dashed accent
borders on family groups.

### B.5 History rail

| Element | Purpose | Logic | States | Accessibility |
|---|---|---|---|---|
| **Header (History · "max" badge · Clear)** | Label + retention badge + clear. | **Clear** → AlertDialog confirm → `ClearHistory`. | Default. | Heading; Clear is a button opening an AlertDialog. |
| **Entry card** | Select/inspect a past run. | `ListHistory` (paginated), `GetHistoryEntry`. Shows title · time · status/inference chip · preview. | `selected`; status `success / stack / partial / error`. | Selectable list item; keyboard-navigable; status conveyed by text + color. |
| **Restore ↺** | Load an entry back into the editor. | Restore (`history` design): entry input → input editor, output → output; re-arm the action/stack if still valid. | Default. | Labeled action; drift warning toast if the action was removed. |
| **Delete 🗑** | Remove a single entry. | `DeleteHistoryEntry`. | Default. | Labeled action; immediate (single-entry delete is not gated by AlertDialog). |
| **Empty state** | No runs / history disabled. | Shown when 0 entries or `history.enabled = false`. | `empty`. | Informational text; offers a path to enable history in Settings. |

**Styling guidance.** Selected entries use the teal accent border/background; partial/error chips use the
removed/danger tokens. **Interaction rules.** Restoring an entry whose action no longer exists shows a
drift-warning rather than silently failing.

### B.6 Overlays

All overlays are backed by Radix (or `cmdk` inside Radix) and inherit focus trapping, Esc-to-close,
collision-aware positioning, and ARIA roles. They theme via the root token class.

| Surface | Backed by | Purpose | States | Notes |
|---|---|---|---|---|
| **Provider select** | Radix Select | Choose the current provider; per-item local/cloud badge; "⚙ Manage providers…". | `open · selected · hover`. | Selecting calls `SetAsCurrentProviderConfig`. |
| **Model combobox** | `cmdk` + Radix Popover | Search/filter models; pick; ⟳ refresh; "N of M models". | `open · filtering · loading · empty`. | `GetModels` discovery + `UpdateModelConfig`. |
| **Language popover** | Radix Popover + 2× `cmdk` | Set input lang, output lang, **⇄ Swap**. | `open`; per-side selected. | Swap exchanges the two languages. |
| **Command palette ⌘K** | `cmdk` + Radix Dialog | Search actions; **↵ run** · **⇧↵ add to stack** · ↑↓ navigate · Esc close. | `open · filtering · selected`; the **run** / add-and-run actions are **disabled while an inference is in progress** (global single-flight). | Modal; focus trapped; results grouped. |
| **Save-stack dialog** | Radix Dialog | Name (unique), icon pick, resolved order/inference summary; Cancel / Save. | `open`; name `valid / invalid (duplicate)`; auto-suggested name. | `CreateStack` (new) / `UpdateStack` (edited existing); Save disabled while invalid. |
| **Stack context menu** | Radix DropdownMenu | Run · Edit steps · Duplicate · Delete. | `open`. | Run / load builder / `DuplicateStack` / `DeleteStack` (confirm). |
| **Toasts** | Radix Toast | success / info / error; **typed errors** (auth / timeout / rate-limit / not-found …); progress with cancel; ✕ dismiss + auto-timeout. | per severity. | `notifyError(code → presentation)` per `07-error-handling-logging.md`. |
| **AlertDialog** | Radix AlertDialog | Confirm destructive ops: factory reset · delete provider · delete stack · clear history. | `open`. | Cancel / destructive-confirm; the confirm button is danger-styled. |
| **Tooltips** | Radix Tooltip | Labels for icon buttons on hover/focus. | shown/hidden. | Hover and keyboard-focus triggered. |

**Accessibility.** Dialogs and AlertDialogs are modal with a focus trap, return focus to the trigger on
close, and have an accessible title/description. Menus and selects use roving focus and typeahead. The
command palette announces result counts. **Validation rules.** The Save-stack name must be **non-empty and
unique**; a duplicate name marks the field invalid and disables Save. **Interaction rules.** Esc closes
any overlay; clicking outside closes non-destructive overlays; destructive confirms require an explicit
button press (outside-click cancels, never confirms).

### B.7 Settings controls

#### Providers (master–detail)

| Element | Purpose | Logic | States | Validation |
|---|---|---|---|---|
| **Provider list (master)** | Select to edit; shows **current** badge; **＋ New provider**. | `GetAllProviderConfigs`. | `selected · current`. | — |
| **Name** | Provider label. | — | `valid / invalid (duplicate)`. | Required; unique across providers. |
| **Kind select** (5 kinds) | Pick the provider kind, driving the profile/fields. | Profile selection per `04-providers-inference.md` (categories: local OpenAI-compatible runtimes, generic OpenAI-compatible cloud, and a deployment-in-path cloud variant). | One selected. | Required. |
| **Auth segment (None / Bearer / Api-Key)** | Choose the auth scheme. | Per `04-providers-inference.md`. | One selected. | — |
| **API key — environment variable** | Name of the env var holding the key. | The app reads the key from this variable **at request time and never stores it** (`04-providers-inference.md`). | Required when auth ≠ None. | Required if auth ≠ None; an unset var surfaces `ErrMissingCredential` at run time, not at save. |
| **Base URL** | Endpoint base. | — | `valid / invalid`. | Required; must be a well-formed URL. |
| **Models / Completion endpoints** | Override discovery/completion paths. | Derived-or-override from the kind profile. | derived / overridden. | Optional. |
| **API version (optional)** | Version param for the deployment-in-path variant. | — | optional. | Optional. |
| **Deployment / selected model picker + ⟳** | Pick model/deployment; refresh discovery. | Discovery `GetModels`. | `loading / empty`. | — |
| **Use custom headers switch + KV editor** | Add/remove header name/value rows. | Header bag persisted as JSON (`06-data-model-database.md`). | `on / off`. | Header names non-empty; see [B.8](#b8-specialized-composite-controls). |
| **Use custom models switch + tag input** | Add model names manually. | `customModels` (`04-providers-inference.md`, `06-data-model-database.md`); used when discovery is off/unreachable. | `on / off`; chips. | See [B.8](#b8-specialized-composite-controls). |
| **Verify panel** (Test connection · Test models · Test inference) | Diagnostic checks with results. | `TestConnection` / `TestModels` / `TestInference` (`04-providers-inference.md`). | per-check `idle · running · ✓ · ✗ (with reason + timing)`; **Test inference is disabled while any inference is in progress** (global single-flight; it shares the run gate), and a run is disabled while Test inference is running. Test connection / Test models are unaffected. | Diagnostic only; does not block Save. |
| **Set as current** | Mark this provider current. | `SetAsCurrentProviderConfig`. | — | — |
| **Delete…** | Remove the provider (confirm; repoints current). | `DeleteProviderConfig`. | — | AlertDialog confirm. |
| **Save** | Persist changes. | `CreateProviderConfig` / `UpdateProviderConfig`. | `dirty / saved`; inline validation. | Blocks on invalid fields. |

#### Model

| Element | Purpose | Logic | States |
|---|---|---|---|
| Model picker + ⟳ | Select model; refresh. | Discovery. | `loading / empty`. |
| Use temperature switch + slider + value | Enable + set temperature (0–2). | `UpdateModelConfig`; capability-aware pre-fill. | `on` (slider active) / `off`. |
| Use context window switch + slider + value | Enable + set context size. | `UpdateModelConfig`. | `on / off`. |
| Token-limit radio (`max_completion_tokens` / `max_tokens`) | Choose the token parameter. | `UpdateModelConfig`. | one selected. |

**Validation:** temperature constrained to 0–2 (an out-of-range value shows the inline validation message
"Temperature must be between 0 and 2"); context window bounded to a positive integer.

#### Generation

| Element | Purpose | Logic | States |
|---|---|---|---|
| Timeout stepper (s) | Set request timeout. | `UpdateInferenceBaseConfig`. | bounded. |
| Max retries stepper | Set retries (transient errors only). | same. | bounded. |
| Request Markdown output switch | Toggle Markdown. | same; mirrors the toolbar Format segment. | `on / off`. |

**Behavior note:** retries apply to transient errors only (timeout, rate-limit, 5xx) — never to auth or
not-found — with automatic backoff (`07-error-handling-logging.md`).

#### Languages

| Element | Purpose | Logic | States |
|---|---|---|---|
| Add language (search + ＋ Add) | Add a language to the list. | `AddLanguage`. | — |
| Language row | Shows name; default-input/output badges; **⋮** menu. | — | `default-input / default-output / plain`. |
| Row menu ⋮ | Set default input · set default output · remove. | `SetDefaultInputLanguage` / `SetDefaultOutputLanguage` / `RemoveLanguage`. | — |

#### Logging

| Element | Purpose | Logic | States |
|---|---|---|---|
| Task logging switch | Save each run's prompts/result to JSONL. | `app.enableTaskLogging` (`07-error-handling-logging.md`). | `on / off`. |
| Diagnostic app logging switch | Write app logs to a rotating file. | `log.fileEnabled`. | `on / off`. |
| Level select | trace / debug / info / warn / error. | `log.level`; reconfigures the logger **live**. | one selected. |
| Rotation: max size / backups / max age steppers + Compress switch | Configure file rotation. | rotation params. | bounded / `on-off`. |
| Log directory + Open logs folder | Set dir; open in the OS file manager. | Shared logs dir; resolved paths shown. | — |
| History switch | Enable run history. | `history.enabled`. | `on / off`. |
| Max entries stepper | Retention count (default 100). | `history.maxEntries`. | bounded. |
| Clear history… | Wipe history (confirm). | `ClearHistory` via AlertDialog. | — |

#### About & data

| Element | Purpose | Logic | States |
|---|---|---|---|
| Version | Show app version. | `GetAppSettingsMetadata`. | — |
| DB path / Logs path + copy ⧉ | Show and copy paths (`ClipboardSetText`). | `GetAppSettingsMetadata`. | copy → success toast. |
| Factory reset… | Wipe settings/providers/stacks/history → reseed. | `ResetSettingsToDefault` via AlertDialog. | destructive confirm. |

#### Appearance

| Element | Purpose | Logic | States |
|---|---|---|---|
| **Theme segmented (Auto / Light / Dark)** | Set the theme mode. | Sets `ui.theme` then applies the resolved effective theme; **Auto** follows the OS live. | one selected. |
| Preview swatches | Show a light/dark sample. | Static. | — |

**Theme logic.** `ui.theme` (default `auto`) is persisted in settings. The effective theme is resolved
from the mode (and the OS color scheme when `auto`) and applied by toggling a single `.dark` class on the
document root; in `auto` an OS-change listener re-applies live. Applies instantly with no restart and is
used everywhere in the app. Both themes meet WCAG AA contrast.

**Accessibility (all settings controls).** Switches (Radix Switch) expose `role="switch"` + `aria-checked`;
sliders (Radix Slider) are keyboard-adjustable with `aria-valuenow/min/max`; radios (Radix RadioGroup)
use roving focus; the section nav (Radix Tabs, vertical) supports arrow-key navigation. Every control has
a visible label and a `focus-visible` ring. **Styling guidance:** controls read CSS tokens; `on` switches
and active segments use teal accent tokens; danger actions use the danger token. **Interaction rules:**
inputs are controlled and bound to the store; theme and logging-level changes apply live, other settings
on Save.

### B.8 Specialized composite controls

| Control | Purpose | Logic | States | Validation | Accessibility |
|---|---|---|---|---|---|
| **Tag input (custom models)** | Add/remove model-name chips. | Type a name + **↵** to add; **✕** on a chip to remove. Backs `customModels`. | `empty / populated`; chip hover. | Reject empty/duplicate names; trim whitespace. | Input is labeled; chips are removable buttons; Backspace on empty input removes the last chip; added/removed announced. |
| **KV editor (custom headers)** | Add/remove header name/value rows. | Each row is name + value + remove; a trailing row with **＋** adds. Persists to the header bag (JSON). | per-row populated/empty. | Header name required and non-empty per active row; value may be blank. | Each field labeled; add/remove are labeled buttons; rows keyboard-navigable. |
| **Provider verification panel** | Run connection / models / inference checks. | `TestConnection` / `TestModels` / `TestInference`; shows ✓/✗ + reason + timing. | per-check `idle · running · ✓ · ✗`; **Test inference disabled while any inference is in progress** (shares the global run gate). | Diagnostic only; never blocks Save. | Each check is a labeled button; results announced; spinner has an accessible busy state. |
| **Theme segmented control** | Auto / Light / Dark. | See [Appearance](#appearance) above. | one selected. | — | Radix ToggleGroup (single); arrow-key nav; `aria-pressed`. |

**Styling guidance.** Tag-input and KV-editor are custom CSS over native inputs framed in a single
bordered container; chips use the teal accent tokens. The verification panel rows use the success/danger
badge tokens for ✓/✗.

### B.9 Prompt Inspector blocks

The Prompt Inspector renders the composed prompt(s) read-only via `PreviewPrompt`. For a single action it
shows one inference block; for a stack it shows one block per inference with a flow connector ("output of
inference 1 becomes input of inference 2").

| Block element | Purpose | Logic | States |
|---|---|---|---|
| **Header / summary line** | Name, type (action/stack), step & inference counts, settings echo (format · languages · model · temperature). | Reflects current settings; `PreviewPrompt`. | `loading · single · stack`. |
| **Inference card** | One per inference: a badge ("Inference *n*"), family chip, and the merged-actions note. | Merge grouping per `05-stacks-actions-engine.md`. | populated. |
| **System prompt block** | Read-only composed system prompt + per-block **Copy ⧉**. | `PreviewPrompt`. | populated. |
| **User prompt block** | Read-only composed user prompt; `{{user_text}}` shown as a marker; downstream inputs shown as "‹output of inference n›". | `PreviewPrompt`. | populated. |
| **Parameters row** | Badges: model, temperature, format, token-limit param, `stream false`. | From current settings. | populated. |
| **Flow connector** | "▼ output of inference *n* becomes input of inference *n+1*". | Stack composition. | shown between stack blocks. |
| **Use current input toggle** | Replace `{{user_text}}` with the live editor input in the preview. | Local preview toggle (default **off**). | `on / off`. |

**Accessibility & rules.** Prompt blocks are read-only regions; **Copy** buttons are labeled and confirm
via toast. No model call is made — the preview is composed by the same planner/composer used at run time,
so it never drifts. **Styling guidance:** prompt text uses the mono editor styling inside cards; family
chips use accent (rewrite) and purple (summarize/other) tokens.

---

## C. Patterns

**Navigation patterns.**

- The **toolbar carries run context** (provider, model, language, format, view mode, layout) and is
  present only on the Editor view. Settings, My Stacks · Manage, and About · Info are **full views** that
  replace the editor and return via a `‹ Editor` back control in their header.
- There is no separate browser-style history; navigation is a small set of named views plus overlays.
- Selecting "⚙ Manage providers…" from the provider select deep-links to **Settings · Providers**.

**Keyboard shortcuts.** In v3, **⌘K** (Ctrl+K on Windows/Linux) — open the command palette — is the
**only application-global keyboard shortcut**. Within the command palette: **↵** runs the highlighted
action, **⇧↵** adds it to the stack builder, **↑/↓** navigate, and **Esc** closes. All other keyboard
behavior is the standard per-widget interaction supplied by the backing Radix primitive (arrow-key
navigation in selects/menus/toggles/tabs, **Esc** to close any overlay, **Tab** focus order, Enter/Space
to activate). There is no additional global accelerator map in v3.

**Modal patterns.**

- **Non-destructive modals** (Save-stack dialog, command palette) use **Radix Dialog**: modal, focus
  trapped, Esc/outside-click cancels, focus returns to the trigger.
- **Destructive confirmations** (factory reset, delete provider, delete stack, clear history) use **Radix
  AlertDialog**: an explicit danger-styled confirm button; outside-click and Esc **cancel** but never
  confirm. Single history-entry delete is the one destructive-flavored action that is immediate (not
  gated), because it is low-impact and reversible by re-running.
- Transient feedback uses **Radix Toast**; menus use **Radix DropdownMenu**.

**Form patterns.**

- All inputs are **controlled** and bound to the Redux store (single source of truth).
- **Inline validation** appears on the offending field; invalid forms disable their primary action (e.g.
  Save) rather than navigating away. Validation messages use the inline-error token styling (e.g.
  "Temperature must be between 0 and 2; got 3.5").
- Required/unique constraints: provider name (unique), Base URL (well-formed), API-key env-var name
  (required when auth ≠ None), Save-stack name (non-empty, unique).

**Prompt-editing / Prompt-inspector pattern.** The Prompt Inspector is a **read-only composed-prompt
preview** produced by `PreviewPrompt`, reusing the real planner/composer so what is shown is what gets
sent. Users do not edit the composed prompt; they configure inputs (actions, settings) and inspect the
result. `{{user_text}}` is shown as a marker by default; the **Use current input** toggle substitutes the
live editor input for preview.

**Configuration pattern.** Settings → **SQLite** (`06-data-model-database.md`), accessed over the Wails
bridge (`08-api-contracts.md`). Most settings apply on **Save**; **theme** and **logging level** apply
**live**. Theme is applied by toggling a single root `.dark` class (resolved from `ui.theme`, with OS
auto-follow), applied before first paint to avoid a flash. Design tokens are a single CSS variable set;
light/dark differ only by the root class — no duplicated component styling.

**Desktop / Tablet / Mobile (narrow-window) behavior.**

- **Desktop (primary):** full toolbar, expanded sidebar, side-by-side panes, optional history rail.
- **Tablet / narrow window:** toolbar control clusters wrap onto a second row; the sidebar collapses to an
  icon strip and the history rail collapses; Settings master/detail and About catalog/inspector stack
  vertically; the editor arrangement (Side/Stacked) is **not** auto-switched (it remains a user choice),
  though Stacked is recommended for narrow widths.
- **Minimum window size:** below a defined minimum the sidebar stays collapsed and panes stop shrinking
  (content scrolls). GoText is a desktop app; there is no separate phone form factor — "mobile" here means
  a narrow desktop window.

---

## D. Global state vocabulary (reference tables)

These tables enumerate the canonical states used across this document. Each element table above draws from
this vocabulary.

### D.1 Interaction states

| State | Meaning | Applies to |
|---|---|---|
| `default` | Resting appearance. | All interactive elements. |
| `hover` | Pointer over the element. | Buttons, rows, chips, menu items. |
| `focus` | Keyboard focus; renders a `focus-visible` ring. | All focusable elements. |
| `pressed` | Active/being clicked. | Buttons, segments. |
| `disabled` | Non-interactive, greyed; `aria-disabled`. | Run, Copy/Clear, capped action rows, Save. |

### D.2 Toggle & selection states

| State | Meaning | Applies to |
|---|---|---|
| `on / off` | Binary toggle. | Switches, ToggleGroup segments, toolbar toggles. |
| `selected / unselected` | Chosen vs not within a set. | Nav items, list rows, picker items. |

### D.3 Async states

| State | Meaning | Applies to |
|---|---|---|
| `idle` | Not started. | Runs, verification checks. |
| `loading` | In progress; spinner/progress shown. | Model discovery, runs, verification. |
| `success` | Completed OK. | Runs, copy, verification. |
| `error` | Failed; typed toast/inline message. | Runs, verification, saves. |

### D.4 Data & validation states

| State | Meaning | Applies to |
|---|---|---|
| `empty / populated` | No data vs data present. | Editors, lists, grids, tag input. |
| `valid / invalid` | Passes vs fails validation. | Name/URL/env-var fields, stack name, numeric ranges. |

### D.5 Collapsible & theme states

| State | Meaning | Applies to |
|---|---|---|
| `expanded / collapsed` | Open vs closed. | Sidebar, history rail, Guide sections. |
| `light / dark` (effective) | Resolved theme. | Whole app (root `.dark` class). |

### D.6 Run lifecycle

| State | Meaning | Transitions |
|---|---|---|
| `idle` | Ready to run. | → `running` on Run. |
| `running` | Executing; step progress + Cancel. | → `done` / `partial` / `error` / `cancelled`. |
| `done` | All steps succeeded; final output rendered once. | → `idle`. |
| `partial` | Some steps done, one failed; completed output kept, failed step named. | → `idle`. |
| `error` | Run failed; typed toast. | → `idle`. |
| `cancelled` | Stopped after the current group (`CancelChain`); partial output kept. | → `idle`. |

### D.7 Domain-specific states

| State | Meaning | Applies to |
|---|---|---|
| `current / not-current` | The active provider vs others. | Provider list/select. |
| `default-input / default-output / plain` | A language's default role. | Language rows. |
| `armed / none` | An action/stack is loaded into the run bar. | Run bar. |

---

*End of `10-ui-ux-specification.md`. For the visual, screen-by-screen layout of every view referenced
here, see `11-mockup-documentation.md`.*
