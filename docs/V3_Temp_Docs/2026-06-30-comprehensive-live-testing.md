# GoText Comprehensive Live Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify every user-facing feature of GoText works end-to-end with real LLM inference using Ollama (gemma3:1b) and LM Studio (smallest Gemma available).

**Architecture:** Phase-based testing using Chrome browser automation at `http://localhost:34115` (Wails dev server). Tests run sequentially; phases 1–4 are setup gates, phases 5–9 are feature verification, phase 10 is cleanup.

**Tech Stack:** Chrome MCP (`mcp__claude-in-chrome__*`), LM Studio at `http://localhost:1234`, Ollama at `http://localhost:11434`, `wails dev` running at `:34115`

## Global Constraints

- Never assert on LLM output text content — only on mechanism (non-empty output, status transitions, no error toast)
- Complete Phase 0 (pre-flight) and Phase 1 (provider config) before any inference test
- Languages: add English + Spanish in Phase 4 (P4-T7) before running Phase 5 translation tests
- Models: `gemma3:1b` on Ollama, smallest available Gemma on LM Studio
- All Chrome MCP tools must be loaded from ToolSearch before use

---

## Reusable Test Samples

Referenced by ID throughout all phases — paste these into InputPane when instructed.

**SAMPLE-A — Grammar errors** (Proofreading tests)
```
The meeting was held on tuesday. We was discussing several importent topic, include the upcoming
product lunch, budget allocation for Q4, and the new remote work policy. Several team member raised
concern about communication gap between department. John suggested to implement weekly cross-department
sync. The decision were made to pilot this for 30 days starting next Monday.
```

**SAMPLE-B — Flat business prose** (Rewriting / Tone / Style tests)
```
We need to get the project done. There are some problems with the timeline. The budget is not enough.
The team has to work harder. We hope to finish by December.
```

**SAMPLE-C — Meeting notes** (Document Structure / Summarization tests)
```
Attendees: Sarah, Mike, John, Lisa. We discussed the Q4 budget which Mike said needs to be finalized
by Oct 15. John raised the new remote work policy questions from three team members. Lisa will handle
onboarding for two new engineers joining next week. Sarah asked about the product launch timeline
— John confirmed it is still on track for Nov 1. Mike will send the budget draft by Friday. Lisa will
prepare onboarding docs by Wednesday. Next meeting: same time next Monday.
```

**SAMPLE-D — Tabular data** (Format > Table tests)
```
Name: John Smith, Role: Backend Engineer, Skills: Go PostgreSQL Docker, Experience: 5 years, Location: Remote.
Name: Sarah Lee, Role: Frontend Engineer, Skills: React TypeScript CSS, Experience: 3 years, Location: New York.
```

**SAMPLE-E — Vocabulary words** (Translation > Dictionary tests)
```
serendipity ephemeral luminescent melancholy nostalgia resilience eloquent proficient tenacious innovate
```

**SAMPLE-F — Weak prompt** (Prompt Engineering tests)
```
Write a summary of the following text. Keep it short.
```

**SAMPLE-G — Long text** (Cancel-during-run tests — long enough that cancel fires before completion)
```
The development team met on Thursday afternoon to discuss the upcoming Q4 product release. The primary
topics covered included the final feature freeze timeline, quality assurance procedures, deployment
strategy, stakeholder communication plan, and post-launch monitoring approach. Sarah from engineering
confirmed that all critical path items are on track and the code freeze will happen as planned on the
15th. Mike from QA outlined the regression testing schedule and mentioned that automation coverage has
improved significantly compared to last quarter. The team discussed the risk of third-party API delays
and agreed to have fallback strategies ready. Lisa from product walked through the go-to-market timeline
and confirmed marketing assets will be ready one week before launch. John from DevOps presented the
deployment runbook and highlighted the new rollback procedure added following the incident last quarter.
The team agreed on a final go or no-go call on the 20th with representatives from all departments.
```

## Assertion Protocol

- **Pass** = run status transitions idle → running → idle, OutputPane is non-empty, no error toast appears
- **Diff view check** = switch to Diff in AppBar; pass if highlighted changes visible vs input
- **Cancel check** = StepProgress disappears, RunBar returns to idle, no crash, no error toast
- **Validation check** = Save/Run button is disabled OR inline error message appears

---

## Phase 0: Environment Pre-flight

### P0-T1: Verify providers and app running

- [ ] Run `curl http://localhost:11434/api/tags` → confirm 200 JSON with `gemma3:1b` in model list
- [ ] Run `curl http://localhost:1234/v1/models` → confirm 200 JSON with at least one model
- [ ] Navigate browser to `http://localhost:34115`
- [ ] Confirm app loads: "GoText" wordmark in AppBar, action category list in left sidebar, input/output panes visible

**Expected:** Both curl commands return JSON. App loads without error or blank screen.

---

## Phase 1: Provider Configuration (Settings > Providers)

This is the gate for all inference tests. Complete fully before Phase 5.

### P1-T1: Open Settings and Providers tab

- [ ] Click gear IconButton (aria-label contains "settings") at top-right
- [ ] Confirm Settings view: 7 tabs visible — Appearance, Logging, Providers, Model, Generation, Languages, About & data
- [ ] Click "🔌 Providers" tab (index 2)
- [ ] Confirm ProviderList on left, empty form or placeholder on right

**Expected:** Settings opens. Providers tab renders.

### P1-T2: Create Ollama provider using preset

- [ ] Click "New" button in ProviderList
- [ ] Click "Ollama" preset button (if present) — confirm form auto-fills: Name "Ollama", Base URL `http://localhost:11434/`, Auth "None"
- [ ] If no preset: manually set Name "Ollama Local", Base URL `http://localhost:11434/`, Auth "None"
- [ ] In VerificationPanel at bottom, click "Test connection" → wait → confirm ✓
- [ ] Click "Test models" → confirm ✓
- [ ] Click "Test inference" → confirm ✓ (live inference request)
- [ ] Click "Save"
- [ ] Confirm provider appears in ProviderList
- [ ] Click "Set as current"

**Expected:** All three verification checks show ✓. Provider saved and set as current.

### P1-T3: Create LM Studio provider

- [ ] Click "New"
- [ ] Click "LM Studio" preset (if present) → form fills: Base URL `http://localhost:1234/`, Auth "Bearer"
- [ ] If no preset: set Name "LM Studio Local", Base URL `http://localhost:1234/`, Auth "Bearer"
- [ ] Leave API key env var field empty (local LM Studio accepts Bearer with no key)
- [ ] Click "Test connection" → confirm ✓
- [ ] Click "Test models" → confirm ✓
- [ ] Click "Test inference" → confirm ✓
- [ ] Click "Save"

**Expected:** All three verification checks ✓. LM Studio provider saved.

### P1-T4: Edit provider name

- [ ] Click the Ollama provider in ProviderList
- [ ] Append " (local)" to the Name field
- [ ] Confirm Save button becomes enabled (form dirty)
- [ ] Click Save — confirm name updates in ProviderList

**Expected:** Name update persists.

### P1-T5: Base URL validation — missing trailing slash

- [ ] Click "New"
- [ ] Enter Base URL without trailing slash: `http://localhost:11434`
- [ ] Click Save (or Tab out of field)
- [ ] Confirm Save is blocked or inline validation error appears
- [ ] Click Cancel

**Expected:** Base URL not ending with `/` fails validation. Save blocked.

---

## Phase 2: Model Configuration (Settings > Model)

### P2-T1: Select model for Ollama provider

- [ ] In Settings, click "⚙ Model" tab (index 3)
- [ ] Click ⟳ Refresh button next to Model Select
- [ ] Wait for model list to populate
- [ ] Select `gemma3:1b`
- [ ] Confirm Save button enables → Click Save
- [ ] Confirm success toast

**Expected:** Model list loads, gemma3:1b selectable, saves.

### P2-T2: Temperature switch and slider

- [ ] Toggle "Use temperature" Switch ON
- [ ] Confirm Temperature slider appears (range 0–2, step 0.05)
- [ ] Drag slider to approximately 0.7
- [ ] Click Save → confirm success toast
- [ ] Toggle "Use temperature" OFF → confirm slider disappears → Click Save

**Expected:** Switch shows/hides slider. Values persist.

### P2-T3: Context window switch and slider

- [ ] Toggle "Use context window" Switch ON
- [ ] Confirm slider appears (range 512–131072, step 512)
- [ ] Drag to approximately 4096
- [ ] Click Save
- [ ] Toggle OFF → Click Save

**Expected:** Switch shows/hides slider. Values persist.

### P2-T4: Token limit RadioGroup

- [ ] Click `max_tokens (legacy)` radio → Save
- [ ] Click `max_completion_tokens` radio → Save

**Expected:** RadioGroup persists selection.

---

## Phase 3: AppBar Controls

**Preconditions:** Main editor view. Click X/Close to exit Settings first.

### P3-T1: Sidebar toggle

- [ ] Note current sidebar state (expanded = category list visible)
- [ ] Click sidebar toggle button (PanelLeft icon)
- [ ] Confirm sidebar collapses
- [ ] Click again → confirm expands
- [ ] Confirm aria-label flips (Collapse ↔ Expand)

**Expected:** Sidebar toggles. Label updates.

### P3-T2: ProviderPicker

- [ ] Click ProviderPicker in AppBar
- [ ] Confirm both providers listed (Ollama, LM Studio)
- [ ] Click "LM Studio Local" → confirm picker label updates
- [ ] Switch back to Ollama

**Expected:** Provider switches. Label reflects selection.

### P3-T3: ModelPicker

- [ ] Click ModelPicker in AppBar
- [ ] Confirm model list shows for current provider
- [ ] Select or re-select `gemma3:1b`

**Expected:** ModelPicker reflects current model.

### P3-T4: Plain / MD output format toggle

- [ ] Locate "Plain | MD" Segmented in AppBar right side
- [ ] Click "MD" — note output format switches
- [ ] Click "Plain" — switches back

**Expected:** Selection updates immediately, no Save required.

### P3-T5: Output view mode (Preview / Source / Diff)

- [ ] Click "Diff" → confirm OutputPane layout changes (diff view)
- [ ] Click "Source" → raw source view
- [ ] Click "Preview" → rendered preview

**Expected:** View mode toggles without error.

### P3-T6: Layout mode (Side / Stacked)

- [ ] Click "⊟ Stacked" → confirm input pane on top, output pane below
- [ ] Click "⊞ Side" → confirm side-by-side layout

**Expected:** Layout switch works.

### P3-T7: History rail toggle

- [ ] Click History IconButton (aria-label contains "history")
- [ ] Confirm history rail panel opens on right side
- [ ] Click again → confirm rail closes

**Expected:** History rail toggles.

### P3-T8: About / Info view navigation

- [ ] Click Info IconButton (aria-label contains "About" or "info")
- [ ] Confirm: "‹ Editor" back button, "Guide" tab, "Actions & Stacks" tab
- [ ] Click "Actions & Stacks" tab → confirm CatalogList renders with action names
- [ ] Click any action in list → confirm PromptInspector detail panel opens with prompt preview
- [ ] Click "‹ Editor" back button → confirm return to main editor view

**Expected:** Info view renders catalog. Inspector shows prompt. Back navigation works.

---

## Phase 4: Settings — All Remaining Tabs

### P4-T1: Appearance tab — theme switching

- [ ] In Settings, click "🎨 Appearance" tab (index 0)
- [ ] Confirm Theme Segmented: "Auto | Light | Dark"
- [ ] Click "Dark" → confirm app background switches to dark immediately
- [ ] Click "Light" → confirm light theme
- [ ] Click "Auto" → confirm follows OS
- [ ] Confirm preview cards (Light preview, Dark preview) visible below

**Expected:** Theme changes instantly on each click.

### P4-T2: Logging tab — file logging controls

- [ ] Click "🗒 Logging" tab (index 1)
- [ ] Toggle "Write logs to file" switch ON
- [ ] Confirm "Log level" Select and "Max file size (MB)" NumberStepper become enabled
- [ ] Change Log level from "Info" to "Debug"
- [ ] Change Max file size from 10 to 20 (click + button or keyboard)
- [ ] Toggle "Write logs to file" OFF → confirm controls become disabled (grayed out)

**Expected:** Controls enable/disable with the switch. Changes auto-save.

### P4-T3: Logging tab — task logging switch

- [ ] Toggle "Task logging" switch ON → confirm toast
- [ ] Toggle OFF → confirm toast

**Expected:** Auto-saves on each toggle.

### P4-T4: Logging tab — history max entries and Clear

- [ ] Confirm "History" switch is ON
- [ ] Locate "Max entries" NumberStepper (range 10–10000)
- [ ] Click + to increment by 10 (e.g., 500 → 510)
- [ ] Confirm Save button enables → Click Save → confirm toast
- [ ] Click "Clear history…" button
- [ ] Confirm AlertDialog: title "Clear history?", Cancel and Confirm buttons
- [ ] Click Cancel → confirm no change
- [ ] Click "Clear history…" again → click Confirm
- [ ] Confirm toast "All history entries have been removed."

**Expected:** Max entries requires explicit Save. AlertDialog guards accidental clear.

### P4-T5: Logging tab — Open logs folder

- [ ] Click "📁 Open logs folder" button
- [ ] Confirm OS file manager opens at logs directory

**Expected:** Logs folder opens.

### P4-T6: Generation tab — all controls

- [ ] Click "✍ Generation" tab (index 4)
- [ ] Increment "Request timeout" by 10 (e.g., 60 → 70) → Save button enables
- [ ] Increment "Max retries" by 1 → Save still enabled
- [ ] Toggle "Request Markdown output" ON
- [ ] Click Save → confirm success toast
- [ ] Toggle "Request Markdown output" OFF → Save

**Expected:** All three controls make form dirty. Save persists all.

### P4-T7: Languages tab — add languages and set defaults

- [ ] Click "🌐 Languages" tab (index 5)
- [ ] Type "English" in add-language input → press Enter (or click "+ Add")
- [ ] Confirm "English" appears in list
- [ ] Type "Spanish" → click "+ Add" → confirm "Spanish" appears
- [ ] Click ⋮ next to "English" → "Set as default input" → confirm default-input badge shows
- [ ] Click ⋮ next to "Spanish" → "Set as default output" → confirm default-output badge shows
- [ ] Close Settings (click X)
- [ ] Confirm LanguagePicker appears in AppBar (visible once languages are configured)
- [ ] Click LanguagePicker → confirm English and Spanish listed

**Expected:** Languages add. Defaults set. LanguagePicker visible in AppBar.

### P4-T8: About & data tab — paths and buttons

- [ ] Click "ℹ About & data" tab (index 6)
- [ ] Confirm: "GoText" heading, version badge (e.g., v0.x.x), "Wails · Go · React + Radix" label
- [ ] Confirm three path rows: App folder, Logs folder, Database
- [ ] Click ⧉ (Copy app folder path) → confirm toast "Path copied to clipboard."
- [ ] Click 📁 (Open app folder) → confirm OS file manager opens
- [ ] Click 📁 (Open logs folder) → confirm logs folder opens

**Expected:** Version shows. Paths display. Copy and Open buttons work.

---

## Phase 5: Single Action Runs (2–3 per category)

**Preconditions:** Main editor view. Ollama set as current provider. `gemma3:1b` selected. History enabled. English = default input, Spanish = default output (set in P4-T7). Output format: "Plain" for most tests, switch to "MD" for markdown-output actions.

---

### Category 1: Proofreading

#### P5-T1: Basic proofreading

- [ ] Paste SAMPLE-A into InputPane
- [ ] In sidebar, expand "Proofreading" → click "Basic proofreading"
- [ ] Confirm RunBar shows action name + "1 inference"
- [ ] Click ▶ Run
- [ ] Wait for completion (StepProgress disappears, status idle)
- [ ] Confirm OutputPane is non-empty
- [ ] Switch view mode to "Diff" → confirm highlighted corrections visible
- [ ] Switch back to "Preview"

**Expected:** Non-empty corrected output. Diff shows changes.

#### P5-T2: Readability improvement

- [ ] Keep SAMPLE-A in InputPane
- [ ] Click "Readability improvement" in sidebar
- [ ] Click ▶ Run → wait → confirm non-empty output

**Expected:** Non-empty output. No error toast.

---

### Category 2: Rewriting

#### P5-T3: Concise

- [ ] Paste SAMPLE-B into InputPane
- [ ] Click "Concise" in sidebar (under "Rewriting")
- [ ] Click ▶ Run → wait → confirm non-empty output, shorter than SAMPLE-B
- [ ] Click ⧉ Copy button in OutputPane → confirm toast

**Expected:** Shorter output. Copy button works.

#### P5-T4: Humanize (or Expanded Rewrite if Humanize not in catalog)

- [ ] Keep SAMPLE-B in InputPane
- [ ] Click "Humanize" in sidebar
- [ ] Click ▶ Run → confirm completion and non-empty output

**Expected:** Non-empty. No error.

#### P5-T5: Use-as-input chain test

- [ ] After P5-T4 completes with non-empty output, click ↺ "Use as input" button in OutputPane
- [ ] Confirm InputPane now contains the previous output text
- [ ] Click "Neutral" (under Tone category) in sidebar
- [ ] Click ▶ Run → confirm new output generated from chained input

**Expected:** Use-as-input chains correctly.

---

### Category 3: Tone

#### P5-T6: Professional

- [ ] Paste SAMPLE-B into InputPane
- [ ] Click "Professional" in sidebar (under "Tone")
- [ ] Click ▶ Run → confirm non-empty output

**Expected:** Non-empty. No error.

#### P5-T7: Friendly

- [ ] Click "Friendly" in sidebar
- [ ] Click ▶ Run → confirm non-empty output

**Expected:** Non-empty. No error.

---

### Category 4: Style

#### P5-T8: Executive (BLUF) or Formal

- [ ] Paste SAMPLE-C into InputPane
- [ ] Click "Executive (BLUF)" or "Formal" in sidebar (under "Style")
- [ ] Click ▶ Run → confirm non-empty output

**Expected:** Non-empty. No error.

#### P5-T9: Instructional or Technical

- [ ] Keep SAMPLE-C in InputPane
- [ ] Click "Instructional" or "Technical" in sidebar
- [ ] Click ▶ Run → confirm output contains structured steps or technical language

**Expected:** Non-empty. No error.

---

### Category 5: Format

#### P5-T10: To Markdown

- [ ] Paste SAMPLE-C into InputPane
- [ ] Click "To Markdown" in sidebar (under "Format")
- [ ] In AppBar, switch output format to "MD"
- [ ] Click ▶ Run → wait
- [ ] Switch view to "Source" → confirm Markdown syntax visible (##, -, **)
- [ ] Switch to "Preview" → confirm Markdown renders (headers, lists)
- [ ] Switch output format back to "Plain"

**Expected:** Output contains Markdown. Preview renders it.

#### P5-T11: Bullet list

- [ ] Keep SAMPLE-C in InputPane
- [ ] Click "Bullet list" in sidebar
- [ ] Click ▶ Run → confirm output shows bullet-point list

**Expected:** Bulleted output. No error.

#### P5-T12: Table

- [ ] Paste SAMPLE-D into InputPane
- [ ] Click "Table" in sidebar
- [ ] Switch output format to "MD"
- [ ] Click ▶ Run → confirm output contains table structure (| columns |)
- [ ] Switch to "Preview" → confirm table renders
- [ ] Switch output format back to "Plain"

**Expected:** Table output. Preview renders it.

---

### Category 6: Document Structure

#### P5-T13: FAQ

- [ ] Paste SAMPLE-C into InputPane
- [ ] Click "FAQ" in sidebar (under "Document Structure")
- [ ] Click ▶ Run → confirm output shows Q&A format

**Expected:** FAQ-structured output. No error.

#### P5-T14: Meeting notes / minutes

- [ ] Keep SAMPLE-C in InputPane
- [ ] Click "Meeting notes / minutes" in sidebar
- [ ] Click ▶ Run → confirm output contains: attendees, decisions, action items sections

**Expected:** Structured meeting minutes output. No error.

#### P5-T15: Email (format)

- [ ] Paste SAMPLE-B into InputPane
- [ ] Click "Email (format)" in sidebar
- [ ] Click ▶ Run → confirm output has greeting, body, closing structure

**Expected:** Email-formatted output. No error.

---

### Category 7: Summarization

Note: Summarization actions are terminal — cannot be chained before other actions in a stack.

#### P5-T16: Summary

- [ ] Paste SAMPLE-C into InputPane
- [ ] Click "Summary" in sidebar (under "Summarization")
- [ ] Click ▶ Run → confirm condensed output, shorter than input

**Expected:** Non-empty summary. No error.

#### P5-T17: TL;DR

- [ ] Paste SAMPLE-G into InputPane
- [ ] Click "TL;DR" in sidebar
- [ ] Click ▶ Run → confirm output is 1–3 sentences

**Expected:** Very short summary. No error.

#### P5-T18: Key points

- [ ] Paste SAMPLE-C into InputPane
- [ ] Click "Key points" in sidebar
- [ ] Click ▶ Run → confirm bullet list of key points

**Expected:** Bulleted key points output. No error.

---

### Category 8: Translation

Note: Translate, Localize, Dictionary table require English (input) → Spanish (output) — set in P4-T7.

#### P5-T19: Translate text

- [ ] Paste into InputPane: `Good morning. The project deadline is next Friday. Please review the attached document and send your feedback by Thursday.`
- [ ] Click "Translate text" in sidebar (under "Translation")
- [ ] Click ▶ Run → confirm output is in Spanish

**Expected:** Spanish-language output. No error.

#### P5-T20: Dictionary table (glossary)

- [ ] Paste SAMPLE-E into InputPane
- [ ] Click "Dictionary table (glossary)" in sidebar
- [ ] Click ▶ Run → confirm output is a table mapping English words → Spanish

**Expected:** Glossary table output. No error.

#### P5-T21: Example sentences

- [ ] Paste into InputPane: `cat dog house run jump`
- [ ] Click "Example sentences" in sidebar
- [ ] Click ▶ Run → confirm output contains one Spanish example sentence per word

**Expected:** Example sentences in Spanish. No error.

---

### Category 9: Prompt Engineering

#### P5-T22: Improve a text-LLM prompt

- [ ] Paste SAMPLE-F into InputPane
- [ ] Click "Improve a text-LLM prompt" in sidebar (under "Prompt Engineering")
- [ ] Click ▶ Run → confirm output is an expanded, more detailed prompt

**Expected:** Richer prompt in output. Non-empty. No error.

#### P5-T23: Compress a prompt

- [ ] Paste into InputPane: `Please carefully analyze the text that I am going to provide to you below and write a very concise and short summary of the most important key points that are contained within it, making sure not to miss anything important.`
- [ ] Click "Compress a prompt" in sidebar
- [ ] Click ▶ Run → confirm output is a shorter compressed version

**Expected:** Shorter prompt output. No error.

---

## Phase 6: Stack Operations

### P6-T1: Enter stack build mode

- [ ] Click "＋ Build a stack" button in sidebar (or in RunBar)
- [ ] Confirm StackBuilderBar appears at top of editor area
- [ ] Confirm sidebar actions show inference-count hints
- [ ] Confirm RunBar area shows "click to add a step…" hint

**Expected:** Build mode activated.

### P6-T2: Add steps — exclusivity and composability

- [ ] Click "Basic proofreading" → confirm chip appears in StackBuilderBar
- [ ] Confirm counter: "1 / 5 steps · 1 inference"
- [ ] Click "Concise" (Rewriting) → confirm added as chip 2; counter "2 / 5 · 2 inferences"
- [ ] Click "Enhanced proofreading" (same Proofreading exclusivity group) → confirm it REPLACES "Basic proofreading" chip (not added as a 3rd step)
- [ ] Click "To Markdown" (Format, no exclusivity constraint) → confirm added as new chip
- [ ] Confirm counter: "3 / 5 steps · 3 inferences"

**Expected:** Exclusivity group enforced. Composable actions stack. Counter updates.

### P6-T3: Remove a step from builder

- [ ] Click ✕ on "Enhanced proofreading" chip
- [ ] Confirm chip removed, counter decrements

**Expected:** Step removed. Counter updates.

### P6-T4: Save stack dialog

Preconditions: Builder has "Concise" + "To Markdown" steps

- [ ] Click ⊕ "Save…" button in StackBuilderBar
- [ ] Confirm SaveStackDialog opens with: Name field, icon picker grid, summary "2 steps · 2 inferences"
- [ ] Clear Name field → type "Concise + Markdown"
- [ ] Click any emoji in picker → confirm icon input updates
- [ ] Confirm Save button is enabled (name non-empty, not duplicate)
- [ ] Click Save
- [ ] Confirm dialog closes
- [ ] Confirm "Concise + Markdown" stack appears in sidebar "My Stacks" section

**Expected:** Stack saved. Appears in sidebar.

### P6-T5: Duplicate name validation

- [ ] Enter build mode, add any action
- [ ] Click ⊕ Save…
- [ ] Type "Concise + Markdown" in Name → confirm error "Name already exists" and Save disabled
- [ ] Change name to "Test Stack 2" → confirm error clears, Save enabled
- [ ] Click Cancel

**Expected:** Duplicate name blocked. Cancel dismisses without saving.

### P6-T6: Run a saved stack

Preconditions: "Concise + Markdown" saved. SAMPLE-A in InputPane.

- [ ] In sidebar "My Stacks" section, click "Concise + Markdown"
- [ ] Confirm RunBar shows stack name + step/inference count
- [ ] Click ▶ Run
- [ ] Confirm StepProgress shows sequential step progress (step 1, then step 2)
- [ ] Wait for completion → confirm non-empty output
- [ ] Switch to Diff view → confirm changes vs original

**Expected:** Both inferences run sequentially. Non-empty output.

### P6-T7: Cancel during multi-step stack run

- [ ] Paste SAMPLE-G into InputPane
- [ ] Arm "Concise + Markdown" stack → Click ▶ Run
- [ ] Within 1–2 seconds, click ✕ Cancel
- [ ] Confirm inference stops, StepProgress disappears
- [ ] Confirm RunBar returns to non-running state, no crash

**Expected:** Cancel works mid-run. App stable.

### P6-T8: Manage Stacks view

- [ ] In sidebar, click "Manage ›" link next to "My Stacks"
- [ ] Confirm: "‹ Editor" back button, "My Stacks" title, "＋ New stack" button, StackCards grid
- [ ] Click Duplicate on "Concise + Markdown" → confirm copy appears in grid
- [ ] Click Edit on original "Concise + Markdown" → confirm navigates to main view with builder populated
- [ ] Click ✕ Cancel in StackBuilderBar to exit builder without saving
- [ ] Return to Manage Stacks
- [ ] Click Delete on the duplicate → confirm AlertDialog appears
- [ ] Click Cancel in AlertDialog → confirm stack NOT deleted
- [ ] Click Delete again → click Confirm → confirm stack removed from grid

**Expected:** All CRUD operations work. Delete AlertDialog guards deletion.

### P6-T9: Terminal action stack constraint

- [ ] Enter build mode
- [ ] Click "Summary" (Summarization — terminal action) → confirm added as step 1
- [ ] Attempt to add "Concise" (Rewriting) after the terminal step
- [ ] Confirm constraint is enforced: "Concise" either cannot be added, is grayed out, or an error appears

**Expected:** Terminal constraint blocks chaining after terminal action.

---

## Phase 7: History Rail

Preconditions: History enabled. At least 3 successful runs completed (from Phase 5).

### P7-T1: View history entries

- [ ] Click History IconButton (aria-label contains "history")
- [ ] Confirm history rail opens listing HistoryEntryCard items
- [ ] Confirm each card shows: action name, truncated input, timestamp
- [ ] Confirm entries are ordered most-recent first

**Expected:** History entries listed correctly.

### P7-T2: Restore history entry

- [ ] Click a HistoryEntryCard (from an earlier Phase 5 run)
- [ ] Confirm InputPane restores to that run's input text
- [ ] Confirm OutputPane restores to that run's output
- [ ] Confirm RunBar re-arms the action (if it still exists in catalog)

**Expected:** History entry restores full run state.

### P7-T3: Delete individual history entry

- [ ] Hover over a HistoryEntryCard → confirm delete (✕) button appears
- [ ] Click delete → confirm AlertDialog or immediate deletion
- [ ] Confirm entry removed from list

**Expected:** Individual entry deletion works.

### P7-T4: Clear history from history rail

- [ ] In history rail header, click "Clear all" button
- [ ] Confirm AlertDialog appears (title: "Clear history?")
- [ ] Click Cancel → confirm entries remain
- [ ] Click "Clear all" again → click Confirm
- [ ] Confirm history rail shows empty state

**Expected:** AlertDialog guards accidental clear.

---

## Phase 8: Command Palette (⌘K)

### P8-T1: Open and browse

- [ ] Click ⌘K IconButton in AppBar OR press Cmd+K
- [ ] Confirm palette opens with search input auto-focused
- [ ] Confirm actions listed, grouped by category headings

**Expected:** Palette opens. All categories visible.

### P8-T2: Search and arm action via Enter

- [ ] Type "concise" in palette search
- [ ] Confirm filtered results show only "Concise" (Rewriting)
- [ ] Press Enter
- [ ] Confirm palette closes
- [ ] Confirm RunBar shows "✓ Concise · 1 inference"

**Expected:** Search filters. Enter arms action.

### P8-T3: No results state

- [ ] Open palette (⌘K)
- [ ] Type "xyzzynotarealaction"
- [ ] Confirm "No results." empty state shown

**Expected:** Empty state appears.

### P8-T4: Shift+Enter adds to stack builder

- [ ] Click "＋ Build a stack" to enter build mode
- [ ] Open palette (⌘K) → search "bullet list" → press Shift+Enter
- [ ] Confirm palette closes
- [ ] Confirm "Bullet list" chip added in StackBuilderBar (added to builder, not armed as solo run)
- [ ] Click ✕ Cancel to exit builder

**Expected:** Shift+Enter adds to builder.

### P8-T5: Escape closes palette

- [ ] Open palette (⌘K) → press Escape
- [ ] Confirm palette closes

**Expected:** Escape dismisses palette.

---

## Phase 9: Error / Edge Cases

### P9-T1: Run disabled with empty input

- [ ] Click ✕ Clear in InputPane to empty it
- [ ] Click any action in sidebar to arm it
- [ ] Confirm ▶ Run button in RunBar is disabled (grayed out, not clickable)

**Expected:** Run button disabled when input is empty.

### P9-T2: Run disabled with no action armed

- [ ] Paste SAMPLE-B into InputPane
- [ ] Ensure no action is armed (RunBar shows "Select an action from the sidebar" or similar)
- [ ] Confirm ▶ Run button is disabled

**Expected:** Run button disabled without an armed action.

### P9-T3: Wrong provider URL — VerificationPanel failure

- [ ] Settings → Providers → New
- [ ] Name: "Unreachable Test", Base URL: `http://localhost:9999/`, Auth: None
- [ ] Click "Test connection"
- [ ] Confirm status shows ✗ with error message (connection refused / timeout)
- [ ] Click Cancel (do NOT Save)

**Expected:** VerificationPanel shows failure for unreachable URL.

### P9-T4: Controls disabled during inference

- [ ] Paste SAMPLE-G into InputPane → arm "Basic proofreading"
- [ ] Click ▶ Run
- [ ] While StepProgress is visible, verify ALL of these are disabled/unclickable:
  - Plain / MD Segmented (AppBar)
  - Preview / Source / Diff Segmented (AppBar)
  - Side / Stacked Segmented (AppBar)
  - ⌘K IconButton (AppBar)
  - InputPane ✕ Clear button
- [ ] Wait for completion

**Expected:** All controls locked during inference. No crash.

### P9-T5: Sidebar search filter

- [ ] Locate search input in sidebar
- [ ] Type "proofread" → confirm only Proofreading category actions visible
- [ ] Type "summary" → confirm only Summarization actions visible
- [ ] Clear search input → confirm all categories and stacks restored

**Expected:** Real-time filter works. Clear restores full sidebar.

### P9-T6: History disabled — AppBar button disabled

- [ ] Settings → Logging tab → toggle "History" switch OFF
- [ ] Return to main view
- [ ] Confirm History IconButton in AppBar is disabled (not clickable)
- [ ] Hover → confirm tooltip explains it is disabled in Settings
- [ ] Settings → Logging → re-enable History

**Expected:** History button disabled and tooltip explains why.

### P9-T7: Stack max-steps constraint

- [ ] Enter build mode
- [ ] Add 5 different non-terminal actions as steps (one per exclusivity group or composable)
- [ ] Attempt to add a 6th step
- [ ] Confirm constraint: either 6th step is blocked or error appears

**Expected:** Max 5 steps enforced.

### P9-T8: LanguagePicker in AppBar — switch mid-session

Preconditions: English + Spanish configured in Languages settings.

- [ ] In AppBar, click LanguagePicker (input language)
- [ ] Switch input from English to Spanish
- [ ] Confirm picker label updates
- [ ] Click "Translate text" in sidebar → Click ▶ Run with any short text
- [ ] Confirm run completes (language override applies)
- [ ] Switch input language back to English

**Expected:** LanguagePicker switches update inference language parameters.

---

## Phase 10: Cleanup / Destructive Tests (Run Last)

### P10-T1: Delete test-only providers

- [ ] Settings → Providers tab
- [ ] Select any provider created only for testing (e.g., "Unreachable Test" if accidentally saved)
- [ ] Click "Delete…" → AlertDialog → Confirm
- [ ] Confirm removed from list

**Expected:** Provider deleted cleanly.

### P10-T2: Clear all history (final cleanup)

- [ ] Settings → Logging → "Clear history…" → Confirm
- [ ] Confirm empty history rail afterward

**Expected:** History cleared.

### P10-T3: Delete test stacks

- [ ] Sidebar → Manage › → delete any stacks created only for testing
- [ ] Confirm via AlertDialog each time

**Expected:** Stacks deleted cleanly.

### P10-T4: Factory reset (OPTIONAL — IRREVERSIBLE)

> ⚠️ **WARNING:** Wipes ALL providers, stacks, history, and settings. All Phase 1–9 setup is destroyed. Run only if clean-slate verification is the explicit goal.

- [ ] Settings → ℹ About & data tab
- [ ] Click "Factory reset…"
- [ ] Confirm AlertDialog: title "Factory reset?", confirm button "Reset everything"
- [ ] Click "Reset everything"
- [ ] Confirm toast "All settings have been restored to defaults."
- [ ] Confirm: provider list empty or default-seeded, stacks empty, history empty

**Expected:** Full reset. App returns to initial-install state.

---

## Coverage Summary

| Phase | Area Covered | Tests |
|---|---|---|
| 0 | Environment pre-flight | 1 |
| 1 | Provider setup + VerificationPanel (3 checks each) | 5 |
| 2 | Model config (temperature, context window, token limit) | 4 |
| 3 | AppBar controls (sidebar, pickers, view modes, layout, history, info) | 8 |
| 4 | All 7 settings tabs, every control (theme, logging, providers, model, generation, languages, about) | 8 |
| 5 | All 9 action categories, 2–3 representative actions each (24 action runs) | 24 |
| 6 | Stack build mode, save, run, cancel, manage (CRUD), constraints | 9 |
| 7 | History rail: view, restore, delete, clear | 4 |
| 8 | Command palette: search, Enter, Shift+Enter, no-results, Escape | 5 |
| 9 | Error/edge cases: empty input, no action, bad URL, controls locked during inference, sidebar search, history disabled, max-steps constraint, language picker | 8 |
| 10 | Cleanup + optional factory reset | 4 |

**Total: 80 test cases**
