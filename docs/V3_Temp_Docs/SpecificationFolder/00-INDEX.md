# GoText v3 — Specification (Master Index)

This folder is the **complete, self-contained specification** for GoText v3 (internal product name
"Text Processing Suite"): a cross-platform desktop application that transforms text with Large Language
Models. A developer or AI agent can implement the entire solution using only the documents in this
folder. There are no external references and no open questions.

**Application at a glance:** Go backend + Wails v2, React 19 + TypeScript + Redux Toolkit + Radix
Primitives frontend. The app runs LLM text transformations against user-configured providers, supports
chaining multiple actions ("stacks"), persists configuration in SQLite, and ships an in-app guide with a
prompt inspector.

---

## Reading order & document map
| # | Document | Purpose |
|---|---|---|
| 00 | `00-INDEX.md` | This index: conventions, glossary, document map. |
| 01 | `01-product-scope.md` | What is preserved, modified, removed, and newly added in v3. |
| 02 | `02-functional-requirements.md` | User & business flows, state transitions, validation, permissions, configuration, error handling, edge cases. |
| 03 | `03-architecture.md` | Backend (layered Go + Wails DI), frontend (Redux + adapters + views), and integration (envelope, events, retries). |
| 04 | `04-providers-inference.md` | Provider kinds, profiles, discovery, verification, inference, error taxonomy & retries. |
| 05 | `05-stacks-actions-engine.md` | Action metadata, family taxonomy, ordering/merge algorithms, orchestrator, events, cancellation. |
| 06 | `06-data-model-database.md` | SQLite entities, ER model, migrations, seeding, repositories. |
| 07 | `07-error-handling-logging.md` | Typed errors + Result envelope, structured logging + rotation, crash resilience. |
| 08 | `08-api-contracts.md` | Every Wails-bound method: request/response/error schemas, envelope types, events. |
| 09 | `09-prompts.md` | The complete prompt set (two-tier system prompts + per-action specs) and starter-stack examples. |
| 10 | `10-ui-ux-specification.md` | Views, elements, patterns, states, accessibility, responsive behavior. |
| 11 | `11-mockup-documentation.md` | Screen-by-screen layout, tokens, widget gallery, component hierarchy — the complete mockup. |
| 12 | `12-ui-implementation.md` | Material UI removal, Radix + cmdk integration, CSS tokens, components to build. |
| 13 | `13-testing-specification.md` | Unit / integration / e2e / regression / edge-case testing, the two frontend run targets (mocked-bridge vs backend-connected dev servers), full FE unit+UI coverage matrix, per-feature acceptance criteria, and the gated verification pipeline. |
| 14 | `14-implementation-plan.md` | AI-agent task breakdown (T00 harness bootstrap, then T01–T31) across phases P-1/P0–P7. |
| 15 | `15-ai-agent-execution-template.md` | Reusable prompt that drives an agent through the full lifecycle for one task. |
| 16 | `16-markdown-rendering.md` | How rendered output is produced: the Markdown library stack, the shared `MarkdownView`, theming consistency, security, performance, and per-view behavior. |
| — | `mockup.html` | The complete, self-contained visual design-system mockup (open in a browser): tokens & themes, widget gallery, overlays, main screens + history rail, stack builder & diff, all settings sections, the Radix map, and the About·Info window. The authoritative visual reference; `11-mockup-documentation.md` is its textual specification. |
| — | `prompts/` | The actual production prompt text (two-tier system prompts + per-action directives/templates) for every shipped action. See `prompts/00-overview.md`. `09-prompts.md` is its specification. |

**Suggested implementation reading:** 01 → 03 → (04, 05, 06, 07) → 08 → 09 → (10, 11, 12) → 02 → 13,
then execute with 14 + 15.

---

## Global conventions
- **Source paths** are repository-root-relative (e.g. `internal/llms/service.go`, `frontend/src/ui/`).
- **Frontend ↔ backend** is the Wails bridge, not REST: exported Go handler methods are exposed as async
  TypeScript functions. Every bound method returns a **Result envelope** (`Data` and/or `Error`); inner
  services keep `(value, error)`. Run `wails generate module` after any Go bound-signature change.
- **Wails rule:** bound methods take no `context.Context` parameter; the context stored from `OnStartup`
  is used for all runtime calls and as the parent for cancellation.
- **Secrets** are never stored or logged. A provider references an **environment-variable name**; the
  secret is read from the environment at request time only.
- **Persistence** is SQLite (`gotext.db` in the OS application-config directory), pure-Go driver, embedded
  versioned migrations, seeded defaults on first run.
- **No token streaming** in v1; inference is request/response. A run's provider, model, and temperature
  are fixed for the whole run.

## Provider categories (provider-agnostic terminology used throughout)
`ollama`, `lmstudio`, `llamacpp` (llama.cpp-compatible), `openai` (OpenAI-compatible — includes generic
OpenAI-compatible HTTP services), `azure` (Azure-compatible, deployment-style URLs). Future native
vendors (Anthropic-compatible, Google-compatible) plug in behind the same Provider interface.

## Glossary
- **Action** — a single user-selectable transform; in v3 it is an atomic directive fragment + metadata.
- **Family** — the system-prompt bucket an action belongs to (Rewrite, Structure, Summarize, Translate,
  Prompt-Engineering); governs guardrails and merge behavior.
- **Stack** — an ordered set of actions run as a pipeline (output feeds the next step). A **saved stack**
  is a named, persisted recipe.
- **Run** — one execution of a stack or a single action, identified by a `runId`.
- **Inference (group)** — one LLM call. After merging same-family steps, a run produces 1–3 inferences.
- **Result envelope** — the uniform `{ data?, error? }` shape every bound method returns.
- **WireError** — the typed, user-safe error shape (`code`, `title`, `message`, `details`, `retryable`).

## Final prompt families (full set in `09-prompts.md`)
- **Rewrite** (content-preserving, mergeable): proofread, rewrite-intent, tone, style sub-groups.
- **Structure** (mergeable within): format + document-structure sub-groups.
- **Summarize** (solo, terminal-class).
- **Translate** (solo, terminal; requires input/output language; same-language input = pass-through).
- **Prompt-Engineering** (solo, terminal): text-prompt tools + parameterized image and video prompt
  builders (target model + goal/paradigm). Composite "message-to-X" items are **starter stacks**, not
  catalog actions.

---

## Compliance statement
This specification contains only confirmed implementation requirements. It has no open questions, no
unresolved decisions, no references outside this folder, no draft/research references, no
production-specific configuration, and no internal/company provider names — all providers are referenced
by abstract category. It covers product scope, functional requirements, UI/UX, the complete mockup,
prompts, architecture, API contracts, the data model and database changes, testing, the implementation
plan, and the AI-agent execution template. It is implementation-ready.
