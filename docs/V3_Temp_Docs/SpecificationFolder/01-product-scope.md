# GoText v3 — Product Scope

> **Document:** 01-product-scope.md
> **Product:** GoText (also referred to as "Text Processing Suite") — a native desktop application for
> LLM-powered text processing.
> **Stack:** Go + Wails v2 backend; React 19 + TypeScript + Redux Toolkit frontend.
> **Status:** Authoritative product scope for the v3 release. This document is self-contained; where a
> capability is specified in detail elsewhere, it is cross-referenced by filename only (for example,
> "see 04-stacks-feature.md").

## 0. Purpose and how to read this document

GoText transforms text through Large Language Models: a user pastes text into an input editor, selects
one or more transforms (proofread, rewrite, restyle, reformat, summarize, translate, build a generation
prompt), runs them, and reads the result in an output editor. v3 keeps that core purpose and rebuilds the
machinery around it: composable multi-action pipelines ("stacks"), a provider layer that supports five
LLM provider kinds, SQLite persistence, a unified typed-error system, structured file logging, and a
modern Radix-based UI.

This document defines the **scope** of v3 as four categories — **Preserved**, **Modified**, **Removed**,
and **New** — each with a summary table and implementation notes, followed by a recap of the v3
high-level goals. It is the entry point to the specification set; detailed behavior lives in the
companion documents referenced throughout.

Architecture invariants assumed throughout (and unchanged by v3):

- **Layered backend:** Wails-bound Handler → Service → Repository, wired by a manual dependency-injection
  container in `internal/application/application.go`.
- **Wails binding rule:** bound handler methods take **no** `context.Context` parameter; the application
  `ctx` captured at startup is the parent for all runtime calls and for inference cancellation.
- **Interfaces at every seam** for testability; integration tests mock LLM providers with
  `net/http/httptest` (no live model required).
- **Module name:** `go_text`. All source paths below are repository-root-relative
  (for example, `internal/llms/service.go`).

---

## 1. PRESERVED — functionality carried forward unchanged in concept

These capabilities remain in v3 as established concepts and user-facing behaviors. Some are re-homed onto
new infrastructure (covered in Section 2), but the capability itself is retained.

| Area | What is preserved | Source location (carried forward) |
|---|---|---|
| Provider configuration | The concept of multiple named provider configurations with a single "current" provider, full CRUD over them, and selection of an active provider for inference. | `internal/settings/`, `internal/llms/` |
| Model selection & discovery | Selecting an active model per provider, fetching a provider's model list from its API, and a manual fallback to a user-typed/static model list. | `internal/llms/service.go` |
| Inference settings | Per-run inference controls: temperature (with enable toggle), request timeout, max retries, context-window hint, token-limit parameter choice, and "request Markdown output." | `internal/settings/settings.go` (`InferenceBaseConfig`, `ModelConfig`) |
| Single-action processing | Running exactly one transform over the input text and rendering the result — the primary everyday flow. | `internal/actions/service.go` |
| Prompt library (as a concept) | A library of ~60 built-in transforms across categories (proofread, rewrite, tone, style, format, document structure, summarize, translate, prompt-engineering), compiled into the binary. | `internal/prompts/`, `internal/prompts/categories/` |
| Template placeholders | The placeholder contract `{{user_text}}`, `{{user_format}}`, `{{input_language}}`, `{{output_language}}` injected into prompts at run time. | `internal/prompts/` |
| Languages | A user-managed list of languages plus a default input and default output language, used by translation transforms. | `internal/settings/settings.go` (`LanguageConfig`) |
| Same-language skip | When input language equals output language, translation is a no-op pass-through. | `internal/actions/`, generalized in 04-stacks-feature.md |
| Diagnostic task logging | Per-step task records (system/user prompt + result) appended to daily JSONL files, gated by an enable toggle. This diagnostic log is retained as-is, alongside the new file logging and action history. | `internal/tasklog/service.go` |
| Reasoning-block sanitization | Stripping `<think>…</think>` (and equivalents) from native local-model output; ignoring Azure-compatible `custom_content` reasoning stages (the `content` field is already clean). | `internal/llms/`, `internal/actions/` |
| Non-streaming inference | Requests are non-streaming (`stream=false`); the final result is rendered once. | `internal/llms/` |
| Wails binding model | Auto-generated JS bindings from Go handler methods; bound methods take no `ctx`; `wails generate module` after Go signature changes. | `frontend/wailsjs/`, `main.go` |
| OpenAI-compatible HTTP client | A thin, hand-rolled, configuration-driven HTTP client speaking the OpenAI chat-completions wire format; no external LLM SDK is introduced in v3. | `internal/llms/` |

**Implementation notes**

- The single "current" provider remains the inference source of truth: a run resolves the active
  provider, its `selectedModel`, and global inference settings.
- The OpenAI chat-completions JSON body is the single wire format for all supported provider kinds; kinds
  differ only in URL shape, auth scheme, discovery endpoint, and minor body quirks (see Section 2 and
  04-providers-inference.md).
- Diagnostic task logging is a distinct concern from action history (Section 4): the two have independent
  enable toggles and may be on or off independently.

---

## 2. MODIFIED — functionality that changes shape, structure, or backing store

These capabilities survive into v3 but are restructured. Each row states the v3 form.

| Area | v2 form | v3 form |
|---|---|---|
| Settings organization | Loosely grouped settings views. | Settings are regrouped into **seven sections**: Providers, Model, Generation, Languages, Logging, Appearance, and About & Data. |
| Provider config fields | Provider had a wire-type, base URL, and inline auth-token fields (`authToken` / use-token-from-env pair). | Provider config gains explicit `kind`, `apiKeyEnvVar` (env-var **name**, never the secret), optional `apiVersion`, and `selectedModel` semantics; inline token fields are removed (see Section 3). |
| Provider kinds | OpenAI-compatible plus a few special cases. | Exactly **five kinds**: OpenAI-compatible (`openai`), Azure-compatible (`azure`), Ollama (`ollama`), LM Studio (`lmstudio`), llama.cpp-compatible (`llamacpp`). |
| Action execution path | A dedicated single-action processing method. | The single action becomes a **degenerate one-step chain**: single action and stack run through the same chain orchestrator (one code path). |
| Prompt library shape | One-tier: each action carries a full self-contained prompt. | **Two-tier**: ~5 **family system prompts** + **atomic directive fragments** + per-action **metadata** (family, order rank, exclusivity group, mergeable, terminal, requirements). |
| Persistence | A JSON settings file on disk (`SettingsV2.json`). | **SQLite** database (`gotext.db`) in the app config folder, behind unchanged service/repository interfaces. |
| Logging | A thin zerolog wrapper writing to stdout only (no file, no rotation, no runtime level control). | A configured, structured logger writing to **console and a rotating file**, with runtime-settable level and structured fields (component/op, runId, provider, durations). |
| Error handling | Per-feature ad-hoc errors; frontend string-splitting to extract messages. | A **single typed error** type and a uniform **Result envelope** on every bound method; the frontend renders typed copy keyed by error code. |
| Token-limit parameter | `useLegacyMaxTokens` toggle choosing `max_tokens` vs `max_completion_tokens`. | Retained as an inference setting, optionally pre-filled from discovered model capability hints when available; never auto-forced. |
| Model discovery | Single OpenAI-style discovery path with manual fallback. | **Per-kind discovery strategies** with normalization to a common `ModelInfo` shape, optional capability metadata (`ModelCaps`), per-provider caching, and a manual refresh control. |

**Implementation notes**

- **Settings — seven sections.** Providers (endpoints/auth/models/verification), Model (temperature,
  context window, token-limit parameter), Generation (request timeout, max retries, request Markdown
  output), Languages (list + default input/output), Logging (task logging, app file logging + rotation,
  action history toggle + max entries), **Appearance** (theme: Auto/Light/Dark), and About & Data
  (settings/logs paths, factory reset). The Appearance section is the **sole** location of the theme
  control (see Section 4 and 13-theming.md).
- **Provider config.** Logical fields per provider: `id` (UUID), `name` (unique), `kind`, `baseUrl`
  (normalized to end with `/`), `authScheme` (`none` | `bearer` | `apiKey`, defaulted by kind),
  `apiKeyEnvVar`, `selectedModel` (the deployment id for `azure`), `useCustomModels`, `customModels`,
  `customHeaders`, optional `completionPath` / `modelsPath` overrides, and optional `apiVersion` (Azure
  only). The credential is resolved at request time via `os.Getenv(apiKeyEnvVar)`; an empty/unset env var
  when auth is required yields a typed missing-credential error. Field-by-kind contracts are specified in
  04-providers-inference.md.
- **Single action as one-step chain.** `runStep(ctx, ChatRequest)` is extracted from the former
  single-action processing body and reused by the chain orchestrator; a single action is a chain of one
  step that produces one inference group. See 04-stacks-feature.md.
- **Two-tier prompts.** Per-group composition selects one family system prompt and concatenates the
  group's directive fragments in canonical sub-order into one user prompt; shared run context
  (`{{user_text}}`, `{{user_format}}`, languages) is injected once at the orchestration layer. See
  04-stacks-feature.md and the prompt catalog companion.
- **SQLite persistence.** Hybrid schema — normalized tables for entities (`providers`, `languages`,
  `stacks`, `stack_steps`, `app_state`, `history`) plus a key/value `settings` table for scalar config
  and feature flags. Pure-Go driver (no C toolchain); typed data access via generated query code; embedded
  versioned migrations applied on startup; default data seeded only when the database is empty. The
  service-layer and handler interfaces and the frontend adapters are unchanged. See 08-persistence-sqlite.md.
- **Structured logging.** Built at startup from logging settings (rebuildable on change), with a
  multi-writer (console + rotating file in the app logs folder). Secrets are never logged — only the
  env-var name. Timings are emitted as a structured `duration_ms` field rather than concatenated into
  message strings. See 11-cross-cutting-concerns.md.
- **Unified error handling.** One typed `AppError` (code, title, user message, safe details allowlist,
  internal cause); classification happens once at the source (provider status, transport, validation,
  chain) and mapping to a clean wire error happens once at the handler boundary; every bound method
  returns a concrete (non-generic) Result envelope carrying `Data` and/or `Error`. Retries happen below
  the boundary, so the user sees an error only after retries are exhausted. See 06-error-handling.md.
- **Model discovery.** Each kind has a discovery request and a normalizer; the parser tolerates both
  `{ "data": [ … ] }` and a bare array; rich catalogs are filtered to chat/completion models and may
  populate capability metadata; plain catalogs yield no capabilities and the UI shows manual toggles.
  Discovery results are cached per provider id with a manual refresh; there is no background polling. See
  04-providers-inference.md.

---

## 3. REMOVED — functionality dropped in v3

These are deliberately removed. Because there is **no legacy migration**, a destructive reset of any
pre-v3 state is acceptable.

| Removed item | Reason / replacement |
|---|---|
| Material UI (`@mui/material`, `@mui/icons-material`) and Emotion (`@emotion/react`, `@emotion/styled`) | Replaced by Radix UI primitives + design tokens (single-class theming). The component layer and styling are rebuilt. |
| JSON settings file (`SettingsV2.json`) | Replaced by the SQLite database (`gotext.db`). The JSON read/write path, whole-blob save, and in-memory file cache are removed. |
| Inline-stored API tokens | Credentials are never persisted. Inline token fields and the use-token-from-env pair are removed; a provider references an **env-var name** only and the secret is read from the environment at request time. |
| Composite "message-to-X" catalog actions | Composite contextual transforms (message to manager, message to coworker, apology rewrite, polite-request rewrite, clarification-request rewrite, conflict-safe rewrite, and similar) are removed as standalone catalog actions. They are combinations of base transforms (tone + style + structure + framework) and are expressed as **saved stacks / starter recipes** instead, documented in the in-app guide. |
| Legacy settings migration | No migration path from pre-v3 settings is provided; a fresh install seeds defaults, and a destructive reset of old state is allowed by design. |

**Implementation notes**

- Removing MUI/Emotion entails rebuilding the views and the styling layer (`frontend/src/ui/`) on Radix
  primitives and CSS-variable design tokens. Theming is by a single root class (see Section 4).
- Removing the JSON store means the settings-file path and constant become unused; they are removed
  (destructive acceptable) or repurposed only for displaying the config-folder path in the About & Data
  section.
- Removing inline tokens enforces the env-only credential rule across the provider layer, the database
  schema (no secret columns), and logging (no secret fields).
- The set of base transforms that the former composites decomposed into (tones, styles, structure
  formats, frameworks) remains available, so the same outcomes are reachable by composing a stack.

---

## 4. NEW — capabilities introduced in v3

| New capability | Summary | Detailed in |
|---|---|---|
| Prompt stacks + chain orchestration | Compose an ordered set of transforms into a pipeline (output → input) with backend-authoritative canonical ordering, exclusivity dedupe, caps (≤5 steps, ≤3 inference groups), and same-family merging. Synchronous run with progress events and cooperative cancel; partial results are returned on cancel/failure. | 04-stacks-feature.md |
| Diff / Source / Preview output views | Three output view modes — rendered **Preview**, raw **Source**, and a word-level **Diff** of input vs output — selectable from the toolbar without auto-switching. | 04-stacks-feature.md |
| Provider verification | Three independent on-demand checks per provider: **Test connection** (reachability + auth), **Test models** (run discovery, report count + sample), **Test inference** (a tiny throwaway completion to the selected model). Each reuses the provider layer, returns a typed Result envelope with a duration, never blocks saving, and is diagnostic-only (not recorded to history or task log). | 04-providers-inference.md |
| Capability-aware discovery | Discovery may surface model capability hints (context-window size, temperature support); when present, the UI pre-fills/greys the temperature toggle and shows a context-window hint, degrading silently to manual controls when absent. | 04-providers-inference.md |
| Saved stacks ("My Stacks") | Named, persisted stack recipes with icon and default format/languages; full CRUD plus duplicate; referenced by action ids with graceful handling of removed actions. | 04-stacks-feature.md, 08-persistence-sqlite.md |
| Action history + history rail | One persisted entry per run (single or stack) with the applied-action snapshot, final/partial I/O, provider/model/languages/format, duration, inference count, and status. A collapsible right-side history rail lists past runs and supports restore. Count-based retention (default 100, configurable, disablable). Coexists with — and is independent of — the preserved diagnostic task log. | 10-action-history.md |
| About · Info window + Prompt Inspector | An in-app guide ("How it works"), a browsable Actions & Stacks catalog, and a **Prompt Inspector** that shows the exact, fully composed system/user prompts and parameters that a run would send (per inference group for stacks), reusing the same plan/compose logic as the orchestrator so it can never drift. | 12-about-prompt-inspector.md |
| Theming (Auto / Light / Dark) | A theme mode the user controls — **Auto** (follow the OS, live-updating), **Light**, or **Dark** — defaulting to Auto, persisted in settings, applied before first paint with no flash. The control lives solely in the Appearance settings section. | 13-theming.md |
| SQLite database | One on-disk database file for all persistence (providers, languages, settings, saved stacks, action history, app state), with embedded versioned migrations, typed query code, and startup seeding. | 08-persistence-sqlite.md |
| Typed errors + Result envelope | A single `AppError`/`WireError` taxonomy and a uniform per-method Result envelope across the whole app; partial chain results travel with their error in the same envelope; one global frontend fallback for unexpected rejections. | 06-error-handling.md |
| Structured logging + crash resilience | Console + rotating-file structured logging with runtime level control and timings; backend goroutine and handler panic recovery; startup-error handling (no silent ignore); a React error boundary and global JS error hooks; graceful `OnShutdown` (cancel runs, flush logs, close DB). | 11-cross-cutting-concerns.md |

**Implementation notes**

- **Stacks & orchestration.** Action metadata is the single source for ordering, exclusivity, and
  merging; the backend validates and the frontend mirrors the same rules from the catalog. Provider,
  model, and temperature are fixed for the entire chain. Intermediate step outputs are never rendered;
  only the final result is shown. New backend pieces live under `internal/actions/` (planner, composer,
  orchestrator, run registry) and a `stacks` package for saved-stack CRUD; the frontend gains
  builder/saved/run state and is the app's first consumer of Wails events (chain progress) and cancel.
- **Provider verification.** Exposed as bound handler methods that reuse `runStep` (for Test inference)
  with an isolated minimal request and a short per-check timeout. Test inference requires a selected
  model; local providers with no auth skip the credential step in Test connection; all three are
  read-only and safe to re-run.
- **Action history.** Written by the chain orchestrator once per run after completion (success / partial
  / error); the applied-action snapshot is resolved from the catalog at run time so entries stay readable
  after edits. History never breaks a run — write failures are logged and swallowed. Restore loads
  input/output editors and re-arms the action or stack when it still exists.
- **About · Info / Prompt Inspector.** A read-only `PreviewPrompt` backend method validates, plans
  (canonical order + merge + cap), and composes each group's system/user prompts with current
  parameters, stopping before any LLM call. The Inspector shows `{{user_text}}` as a highlighted
  placeholder (with an optional "use current input" preview) and shows later stack groups as
  "‹output of previous step›". It reflects current settings and contains no credentials.
- **Theming.** Token system themes by toggling a single `.dark` root class; OS detection uses the CSS
  `prefers-color-scheme` media query (no backend needed); the effective theme resolves to light/dark from
  the mode plus OS. Both themes meet WCAG AA contrast.
- **Persistence (SQLite).** Single-writer connection with WAL and foreign keys on; compound operations
  run in transactions; UNIQUE constraints on provider/language/stack names; deleting the current provider
  repoints "current" in the same transaction. Factory reset wipes and reseeds (destructive, allowed).
- **Errors.** Error codes are shared to TypeScript as a real enum; the frontend owns all user-facing copy
  (i18n-ready). Validation errors render inline on the offending field; run/provider errors render as
  toasts; retryable codes may offer a Retry affordance.
- **Crash resilience.** Spawned goroutines run under a recover-and-log helper; handler bodies recover
  panics into an `internal` Result envelope; the startup constructor returns an error that `main` handles
  fatally with a clear message rather than continuing half-initialized.

---

## 5. v3 high-level goals (recap)

1. **Faster single-action path.** The everyday "select one transform, Run, read result" flow is the
   degenerate one-step case of the chain orchestrator — one code path, no extra ceremony, result rendered
   once.
2. **Composable stacks.** Users compose multiple transforms into ordered, mergeable pipelines with
   automatic canonical ordering and inference-minimizing merges, run them, and save them as named recipes —
   with full transparency via the Prompt Inspector.
3. **Modern Radix UI.** Material UI and Emotion are removed in favor of Radix primitives and design
   tokens, with Auto/Light/Dark theming, Diff/Source/Preview output views, a history rail, and an
   About · Info window.
4. **Extensible providers.** A provider-kind profile model (five kinds today: OpenAI-compatible,
   Azure-compatible, Ollama, LM Studio, llama.cpp-compatible) with capability-aware discovery, per-provider
   verification, env-only credentials, and a single extension seam for adding native vendors later —
   all behind SQLite persistence, typed errors, and structured logging.
