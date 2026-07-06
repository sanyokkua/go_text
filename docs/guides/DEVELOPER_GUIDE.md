# Developer Guide

> Practical guide for developing, building, and extending GoText v3.

---

## 1. Installation & Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Go | 1.25+ | https://go.dev/dl/ |
| Node.js | 20+ | https://nodejs.org/ |
| npm | 10+ | bundled with Node.js |
| Wails CLI | 2.x | `go install github.com/wailsapp/wails/v2/cmd/wails@latest` |

**Platform extras:**
- macOS: `xcode-select --install`
- Linux: `sudo apt-get install build-essential libgtk-3-dev libwebkit2gtk-4.1-dev`
- Windows: C++ Build Tools (from Visual Studio Installer) + WebView2 Runtime

> **No SQLite system library needed.** GoText uses `modernc.org/sqlite` — a pure-Go driver with
> no CGO dependency. `wails build` cross-compiles cleanly on all platforms.

### Initial setup

```bash
git clone https://github.com/sanyokkua/go_text.git
cd go_text

# Install frontend dependencies
cd frontend && npm install && cd ..

# Verify Wails setup
wails doctor
```

---

## 2. Running the App

### Full-stack development (recommended)

```bash
wails dev
```

Starts both the Go backend and the Vite dev server. Hot-reload is available:
- Frontend changes reload the WebView automatically
- Go changes recompile and restart the backend

The app is available at `http://localhost:34115` in a WebView window.

### Frontend-only development (bridge mock)

```bash
cd frontend && npm run dev
```

Starts only the Vite dev server with a **bridge mock** (`frontend/src/dev/bridge-mock/`) that
simulates the Wails bridge (`window.go.*` / `window.runtime`). Ideal for rapid UI iteration
without starting the full Go backend. The mock provides deterministic responses for all bound
methods.

### Production build

```bash
wails build
# Output: build/bin/GoText (or .app / .exe on respective platforms)
```

---

## 3. Running Tests

### Backend

```bash
go test -race ./...                          # all tests with race detector (always use -race)
go test ./internal/actions/...               # single package
go test -run TestChainOrchestrator ./internal/actions/  # single test
go test -v ./internal/llms/...               # verbose output
```

Integration tests in `internal/llms/` use `net/http/httptest` to mock LLM providers.
No external LLM is needed for the test suite.

### Frontend

```bash
cd frontend

npm run test                      # Jest (all)
npm run test:coverage             # Jest with coverage report
npm run verify:ui                 # Playwright/Chromium UI tests
```

---

## 4. Working with Prompts

### Prompt locations

The v3 prompt catalog lives entirely in `internal/prompts/v3/` — four files:

| File | Contents |
|---|---|
| `catalog.go` | `buildCatalog()` — the full list of `apperr.ActionMeta` entries, one per action |
| `families.go` | Constants: family names, UI category labels, exclusivity groups, `Requires` token names |
| `system.go` | The system-prompt text for each family (e.g. `SysRewrite`, `SysSummarize`) |
| `catalog_test.go` | Catalog-shape tests (unique IDs, valid family references, etc.) |

Each action is one `apperr.ActionMeta` struct (`internal/apperr/results.go`):

```go
type ActionMeta struct {
    ID               string   // unique action ID, e.g. "rewrite.proofread.basic"
    Name             string   // display name shown in the UI
    Category         string   // UI grouping label (a Cat* constant from families.go)
    Family           string   // which system prompt this action uses (a Family* constant)
    Directive        string   // the action-specific instruction text appended to the system prompt
    OrderRank        int      // sort rank within its group
    ExclusivityGroup string   // actions sharing a group are mutually exclusive in one stack (empty = composable)
    Mergeable        bool     // whether this action can be merged with other same-family actions in a chain
    Terminal         bool     // whether this action must be the last step in a chain
    Requires         []string // runtime parameters the composer must inject (Req* constants)
}
```

A **family** (`FamilyRewrite`, `FamilyStructure`, `FamilySummarize`, `FamilyTranslate`,
`FamilyPromptEng`) determines which system prompt is used. The system prompt itself is not
looked up inside `internal/prompts/v3/` — the mapping from family (and, for `structure`/
`prompteng`, a sub-kind) to its system-prompt constant lives in a `switch` in
`internal/actions/composer.go`. An action's `Directive` field is the user-prompt fragment that
gets appended after the system prompt for its family.

### Adding an action to an existing family

1. Open `internal/prompts/v3/catalog.go` and find the family's section in `buildCatalog()`.
2. Add a new `apperr.ActionMeta{...}` entry: give it a unique `ID`, pick the right `Category`
   (an existing `Cat*` constant, or add one in `families.go`), set `Family` to the existing
   family constant, write the `Directive` text, and set `OrderRank`/`ExclusivityGroup`/
   `Mergeable`/`Terminal`/`Requires` following the pattern of neighboring entries in the same
   group.
3. Restart `wails dev` — the catalog is compiled into the binary, not loaded from disk.

Template placeholders available inside `Directive` text (substituted by
`internal/actions/composer.go`):
- `{{user_text}}` — the user's input text
- `{{user_format}}` — the chosen output format (Markdown / Plain Text)
- `{{input_language}}` / `{{output_language}}` — source/target language for translation actions
- `{{target_model}}` — target model name for prompt-engineering actions
- `{{goal}}` — free-text goal for prompt-engineering actions

Only list a placeholder in `Requires` (in the `ActionMeta`) if the action actually needs that
runtime parameter — the planner rejects a chain step if a `Requires` entry has no value
supplied.

### Adding a new prompt family

1. Add the family's system prompt as a new constant in `internal/prompts/v3/system.go` (follow
   the existing constants' structure: absolute rules, output discipline, edge cases).
2. Register the family name as a new `Family*` constant in `internal/prompts/v3/families.go`.
3. Add a `case` for the new family in the system-prompt lookup `switch` in
   `internal/actions/composer.go`.
4. Add `ActionMeta` entries in `catalog.go` using the new family constant.

---

## 5. Working with Providers

### Provider communication flow

```
Frontend UI → dispatch(runChain) → adapter → ProcessPromptChain(req)
  → ActionHandler → ChainOrchestrator
    → Planner (canonical ordering, exclusivity, cap ≤ 5 steps, ≤ 3 inference groups)
    → Composer (picks family system prompt, concatenates directive fragments)
    → runStep (per inference group):
        → LLMService.Chat → ProviderFactory.Build → Provider.Chat → HTTP POST
        → response sanitization → per-step tasklog entry
    → chain:progress event emitted after each group
    → history entry written on completion
```

### Provider configuration

Providers are configured in Settings. Each provider config carries:
- `kind`: one of `ollama`, `lmstudio`, `llamacpp`, `openai`, `azure`, or a custom kind
- `baseUrl`: the provider's base URL
- `completionPath`: path to the chat completions endpoint
- `modelsPath`: path to the models listing endpoint
- `authScheme`: `none`, `bearer`, or `api_key_header`
- `apiKeyEnvVar`: name of the environment variable containing the secret (never the secret itself)
- `selectedModel`: the currently selected model
- `customModels`: optional list of model names (used when discovery is unavailable)

### Adding a new provider kind

Provider kinds are implemented by registering a new `ProviderProfile` in `internal/llms/profile.go`
(or equivalent). A profile contains the completion-URL template, discovery endpoint + parser, auth
scheme, and any body quirks specific to that API dialect. The `OpenAICompatibleProvider` struct is
then parameterized by the profile — no new struct is needed for OpenAI-compatible variants.

### Environment variables

GoText itself defines no fixed environment variables — there's no `.env` file to set up and
nothing to configure via the shell before running the app. The only place `os.Getenv` is called
is inside the provider layer, and even there it's indirect: each provider config stores the
**name** of an environment variable (`apiKeyEnvVar`, set by the user in Settings), and the actual
secret is read from that named variable only at request time — never persisted to the database
or written to a log (see `ErrorEnvelopeRules.md`'s "log the env-var name, never the value" rule).
The frontend has no build-time or runtime environment variables of its own either (no
`import.meta.env`/`process.env` usage in `frontend/src`).

During development, `wails dev` runs inside your terminal, so a shell-session `export` is enough —
the dev process inherits it directly. Testing the **built** binary/app bundle (`wails build` output)
is different: that binary is normally launched outside any shell (double-clicked, or run from
Dock/Start Menu/a desktop icon), so it needs the OS-global, persistent env var mechanisms described
in the main [README](../../README.md#setting-provider-api-keys-as-persistent-environment-variables)
("Setting Provider API Keys as Persistent Environment Variables"), not a shell profile `export`.

---

## 6. Working with SQLite / Goose / sqlc

### Database lifecycle

`internal/db` opens the SQLite database at startup via `db.Open`:
1. Opens `gotext.db` in the app config folder (resolved by `internal/file`)
2. Applies connection pragmas (WAL, foreign keys, busy timeout)
3. Restricts to a single writer (`SetMaxOpenConns(1)`)
4. Runs all pending goose migrations from `internal/db/migrations/`
5. Seeds default data if the database is empty

### Adding a migration

Create `internal/db/migrations/NNNN_description.sql` (goose-formatted):

```sql
-- +goose Up
ALTER TABLE providers ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

-- +goose Down
-- SQLite ALTER TABLE is limited; document the reverse procedure here as a comment
```

Rules:
- Number sequentially (e.g. `0003_add_display_order.sql`)
- Always include a `-- +goose Down` section (even if limited by SQLite)
- Never modify an existing migration file — always add a new one
- The migration runs automatically on the next app startup

### Adding or changing a query

1. Edit `internal/db/queries/*.sql`:
   ```sql
   -- name: GetProviderByID :one
   SELECT * FROM providers WHERE id = ?;
   ```
2. Run `sqlc generate` from the repo root to regenerate `internal/db/store/*.go`
3. The updated `Queries` struct is immediately available to services

**Never hand-edit `internal/db/store/`** — it is always overwritten by `sqlc generate`.

### Transaction pattern

Use `q.WithTx(tx)` for compound writes:

```go
tx, err := db.Begin()
if err != nil { return err }
defer tx.Rollback()
qtx := queries.WithTx(tx)
// ... multiple writes using qtx ...
return tx.Commit()
```

---

## 7. Working with the UI (Radix Primitives + CSS Tokens)

### CSS token system

All theme values are CSS custom properties in `frontend/src/ui/styles/tokens.css`. Every component
reads `var(--…)` — no hardcoded colors, radii, or spacing in component CSS files.

```css
/* tokens.css defines (among others): */
--teal: #009688;       /* accent */
--bg: #eef1f1;         /* app background */
--surface: #ffffff;    /* card / panel surface */
--radius: 9px;         /* default border radius */
--space-4: 16px;       /* base spacing unit */
```

Dark mode is toggled by adding/removing the `.dark` class on `document.documentElement`.

### Radix Primitives pattern

Radix provides behavior and accessibility; you provide the visual styles:

```tsx
import { Select } from 'radix-ui';
import styles from './Select.module.css';

<Select.Root value={value} onValueChange={onChange}>
  <Select.Trigger className={styles.trigger}>
    <Select.Value />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content className={styles.content}>
      <Select.Viewport>
        {items.map(item => (
          <Select.Item key={item.value} value={item.value} className={styles.item}>
            <Select.ItemText>{item.label}</Select.ItemText>
          </Select.Item>
        ))}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>
```

Style using Radix `data-*` attributes:

```css
.item[data-highlighted] { background: var(--surface-2); }
.trigger[data-state="open"] { border-color: var(--teal); }
```

### Adding a new interactive component

1. Create the component in `frontend/src/ui/primitives/` (for Radix wrappers) or
   `frontend/src/ui/components/` (for app-specific components)
2. Create a co-located `ComponentName.module.css` that styles it using tokens
3. Export a clean controlled API (bind `value` / `onValueChange` to Redux state)
4. Never import from `wailsjs/` in components — use `logic/adapter/` instead

---

## 8. Adding a New Service

1. Create `internal/myfeature/` with the service interface and implementation:
   ```go
   type MyFeatureServiceAPI interface {
       DoThing(ctx context.Context, req Request) (Result, error)
   }

   type MyFeatureService struct { /* dependencies */ }

   func (s *MyFeatureService) DoThing(ctx context.Context, req Request) (Result, error) {
       // classify errors at the source with apperr constructors
       // keep (T, error) signature — no envelope here
   }
   ```
2. Create `internal/myfeature/handler.go` if the frontend needs to call it:
   ```go
   type MyFeatureHandler struct {
       ctx     context.Context
       zlog    zerolog.Logger
       service MyFeatureServiceAPI
   }

   func (h *MyFeatureHandler) DoThing(req Request) (res apperr.MyResult) {
       // use the handler boundary pattern (defer/recover, apperr.ToWire)
   }
   ```
3. Add the service and handler to `ApplicationContextHolder` in `internal/application/application.go`
   following the construction order (bottom-up: repos → services → handlers)
4. Add the handler to the Wails `Bind` list in `main.go`
5. Run `wails generate module` to regenerate TypeScript bindings
6. Write tests for the service (unit) and handler (integration if needed)

---

## 9. Debugging

### Backend logs

```bash
wails dev   # logs appear in the terminal at DEBUG level
```

Log files (WARNING level and above in production), stored alongside settings and the database:
- macOS: `~/Library/Application Support/GoTextApp/logs/`
- Linux: `~/.config/GoTextApp/logs/`
- Windows: `%APPDATA%\GoTextApp\logs\`

### Frontend state

Right-click the app window → **Inspect** to open DevTools. Install the
[Redux DevTools extension](https://github.com/reduxjs/redux-devtools) to inspect slices and actions.

### SQLite inspection

The database file is at `[config folder]/gotext.db`. Open it with any SQLite browser
(e.g. DB Browser for SQLite, TablePlus) for live inspection of providers, stacks, and history.

### Common issues

| Symptom | Solution |
|---|---|
| TypeScript errors about missing bound methods | Run `wails generate module` |
| "Context missing" panic | Verify `app.SetContext(ctx)` in `OnStartup` in `main.go` |
| History entries not appearing | Check history service wiring in `application.go` |
| Dark mode not applying to Dialog/Popover | Ensure `.dark` class is on `document.documentElement`, not an inner div |
| SQLite "database is locked" | Check `SetMaxOpenConns(1)` is set after `db.Open` |
| `sqlc generate` fails | Verify `sqlc.yaml` configuration; check query syntax |
| Migration not applied | Confirm file is in `internal/db/migrations/` with correct goose header |
