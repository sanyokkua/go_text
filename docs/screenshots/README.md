# Screenshots (v3)

All screenshots below are real captures of the v3 redesign. Every result shown was produced by genuine local LLM
inference — Ollama (`gemma4:e4b-mlx`, `gemma4:26b-mlx`) and LM Studio (`google/gemma-4-e4b`) — on
realistic, mistake-laden workplace text, not mocked or hand-edited output.

★ marks the six images also embedded in the root [`README.md`](../../README.md).

## Content scenarios used

| Scenario | Input | Action(s) |
|---|---|---|
| Release announcement | Casual, typo-ridden Slack-style message about a Friday prod release | `Enhanced proofreading` |
| Push-back to management | Informal message flagging auth-module tech debt and requesting a deadline extension | `Formal` (Style) |
| Raw meeting notes | Rambling, typo-ridden sync notes | Saved stack **"Proofread + Meeting Notes"** = `Enhanced proofreading` → `Meeting notes / minutes` |
| CI/lint question | Short question about a flaky CI pipeline | `Basic proofreading` |
| Client status update | Short hotfix status note | `Translate text` (English → Ukrainian) |
| Product-launch prompt seed | A rough one-line prompt idea | `Improve a text-LLM prompt` |

## Main interface

- ★ `App_03_Main_Result_SidebarsOpen.png` — Side layout (columns), both the Actions sidebar (with
  the saved "Proofread + Meeting Notes" stack) and the History rail open, showing the completed
  meeting-notes stack result in Preview mode.
- ★ `App_04_Main_Stacked_SidebarsClosed.png` — Stacked layout (input above output, one column),
  both sidebars closed, showing the Formal-style rewrite result.
- `App_01_Main_BeforeProcessing.png` — Same side/sidebars-open view before running: input filled,
  output still showing the "Run to preview →" placeholder.
- `App_02_Main_Processing.png` — Mid-run state (`Generating — rewrite · Step 1 of 1`), captured
  while `gemma4:26b-mlx` was generating — a larger model was used deliberately here so the run took
  long enough to reliably catch the in-flight state.

## Diff and Markdown output

- ★ `App_05_Diff_EnhancedProofreading.png` — Diff view of the release-announcement correction: many
  small, localized word-level fixes (+21 / −19).
- ★ `App_06_Diff_FormalTone.png` — Diff view of the Formal rewrite: a much heavier, sentence-level
  rewrite (+49 / −35) — a deliberate visual contrast with the proofreading diff above.
- ★ `App_07_Markdown_MeetingNotes.png` — Preview of the "Proofread + Meeting Notes" stack output:
  real Markdown headings and bullet lists (Discussion / Decisions / Action Items / Next Meeting).

## Prompt engineering and translation

- `App_08_PromptEngineering.png` — `Improve a text-LLM prompt` turning a one-line seed into a
  structured prompt (numbered requirements, constraints, success criteria).
- `App_09_Translation.png` — `Translate text` turning a short English status update into Ukrainian.

## Settings

- ★ `Settings_01_Providers_Current.png` — Providers tab, current provider (Ollama,
  `http://127.0.0.1:11434/`, model `gemma4:e4b-mlx`).
- `Settings_03_Providers_NewProvider.png` — "+ New provider" flow with the OpenRouter.ai preset
  selected, showing the env-var-only credential design ("the app reads the key from this variable
  at run time and never stores it").
- `Settings_04_ModelConfig.png` — Model configuration tab: temperature slider, context-window and
  max-output-token toggles, and the completion-token-limit parameter choice.
