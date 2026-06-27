# GoText — Frontend Architecture

> **Version:** v3 · **Stack:** React 19 + TypeScript + Redux Toolkit + Radix Primitives + cmdk + Vite

The frontend is a React 19 + TypeScript SPA with Redux Toolkit for state. It never imports the
generated Wails bindings directly in components; all backend access goes through
`frontend/src/logic/adapter/`, which wraps the bindings and unwraps the Result envelope.

---

## 1. Framework and dependencies

| Package | Role |
|---|---|
| React 19 | Component rendering |
| TypeScript 5.9 | Type safety |
| Redux Toolkit 2.x | State management and async thunks |
| `radix-ui` | Behavior + accessibility primitives (Dialog, Select, Switch, Tabs, Toast, etc.) |
| `cmdk` | Command palette (⌘K) and searchable pickers |
| Vite 7 | Build tool and dev server |
| `react-markdown` + plugins | Markdown rendering in Output Preview and About guide |
| `lucide-react` | Tree-shakable SVG icons |
| CSS Modules | Component-scoped styles (no Tailwind, no MUI) |

---

## 2. Project structure

```
frontend/src/
  logic/
    adapter/        # backend integration — wraps wailsjs/ bindings; unwraps Result envelope;
                    # subscribes to runtime events (chain:progress, chain:done)
    store/          # Redux Toolkit slices (see §3 below)
    hooks/          # typed useAppDispatch / useAppSelector
    theme/          # theme token utilities (reads/applies .dark class on documentElement)
    utils/          # shared utility functions
  ui/
    AppLayout.tsx   # root layout (wraps Redux Provider; imports tokens.css + base.css)
    RootErrorBoundary.tsx  # catches unhandled React errors
    styles/
      tokens.css    # all CSS custom properties — colors, spacing, radii, fonts, shadows
      base.css      # minimal reset + global element defaults (font, background, color from tokens)
    primitives/     # thin Radix wrappers with co-located *.module.css
                    # Select · Dialog · AlertDialog · Segmented (ToggleGroup) · Switch · Slider
                    # RadioGroup · Tabs · DropdownMenu · Tooltip · Toast · ScrollArea
                    # Combobox (cmdk+Popover) · CommandPalette (cmdk+Dialog)
    components/     # presentational + app-specific components with co-located *.module.css
                    # Button · IconButton · Chip · Badge · Card
                    # EditorPane · MarkdownView · MermaidBlock · DiffView
                    # TagInput · KvEditor · StackBuilderBar · HistoryRail
                    # PromptInspector · StepProgress
    widgets/
      base/         # AppBar · StatusBar · overlays (GlobalLoadingOverlay, NotificationContainer)
      views/        # Editor · Settings (+ section tabs) · About · ManageStacks
  dev/
    bridge-mock/    # dev-only Wails bridge mock — injected only in dev/test builds
                    # lets the UI run without a Go backend (frontend-only Vite dev server)
  main.tsx          # entry point: imports tokens.css, base.css, then mounts React with Redux Provider
  setupTests.ts     # Jest setup (jest-dom matchers, etc.)
  types/            # global TypeScript type declarations (e.g. css-modules.d.ts)
```

---

## 3. Redux slices

State is partitioned into focused slices, all registered in `frontend/src/logic/store/`:

| Slice | Representative state | Purpose |
|---|---|---|
| `settings` | providers list, current provider, model/inference/language/app-behavior config, metadata | Settings and provider management |
| `editor` | input text, output text, view mode, derived diff | Input/output editor content |
| `actions` (catalog) | `ActionMeta[]` grouped by category, load status | Action catalog driving the sidebar and FE-mirrored exclusivity/merge rules |
| `stacks/builder` | ordered `actionIds`, derived plan (groups + inference count), validity, name/icon | Live stack builder |
| `stacks/saved` | saved stacks list, CRUD status | "My Stacks" persistence |
| `run` | `status: idle\|building\|running\|done\|error\|cancelled`, currentGroup, totalGroups, failedIndex, runId | Run lifecycle and progress from `chain:*` events |
| `history` | entries (current page), selectedId, loading, hasMore, total | Action history rail |
| `ui` | viewMode, layout (side/stacked), sidebar/historyRail collapse, theme | View and layout preferences |
| `notifications` | queued notifications (`title?`, `details?`, severity) | Toast / inline error surface |
| `about` | open section, selected item, inspector open/loading, preview-input toggle | About window + Prompt Inspector state |

The store is configured in `frontend/src/logic/store/index.ts`, which composes these reducers and
exports typed `useAppDispatch` / `useAppSelector` hooks (never use the untyped defaults from
`react-redux` directly in components).

---

## 4. CSS architecture

### 4.1 Design tokens

All theme values live in `frontend/src/ui/styles/tokens.css` as CSS custom properties:

```css
:root {
  --teal: #009688;          /* accent */
  --bg: #eef1f1;            /* app background */
  --surface: #ffffff;       /* card / panel surface */
  --ink: #16201e;           /* primary text */
  --radius: 9px;            /* default border radius */
  --space-4: 16px;          /* base spacing unit */
  --font: 'Inter', -apple-system, sans-serif;
  /* ... full list in tokens.css and 11-mockup-documentation.md §1 */
}
.dark {
  --bg: #0e1413;
  --surface: #141b1a;
  --ink: #e8f1ef;
  /* accent, radii, spacing inherit unless overridden */
}
```

**Every component reads `var(--…)`** — no hardcoded hex/px values in CSS modules.

### 4.2 CSS Modules

Each component has a co-located `*.module.css` file with locally-scoped class names:

```
ui/primitives/Select.tsx
ui/primitives/Select.module.css   ← co-located, locally scoped
```

### 4.3 Dark mode mechanics

The `.dark` class lives on `document.documentElement`. Because the class is on the root element,
portaled Radix content (Dialog, Popover, Toast, DropdownMenu — which escape the app subtree) inherits
the theme automatically. Never put the theme class on an inner `<div>`.

---

## 5. Radix Primitives + cmdk

Radix Primitives provide **behavior and accessibility**: keyboard navigation, focus trapping, ARIA
roles, collision-aware placement for Popovers and Select content. They ship zero visual styles.

Our custom CSS provides **all visual appearance** via tokens and CSS Modules.

The `radix-ui` **unified package** is used (not individual `@radix-ui/*` packages):

```tsx
import { Dialog, Select, Switch, Tabs, Tooltip, Toast } from 'radix-ui';
```

`cmdk` provides the unstyled command menu:
- **⌘K command palette** — `<Command>` inside a Radix `<Dialog.Content>`
- **Model / language pickers** — `<Command>` inside a Radix `<Popover.Content>`

Radix state is exposed as `data-*` attributes for CSS styling:
```css
.item[data-highlighted] { background: var(--surface-2); }
.switch[data-state="checked"] { background: var(--teal); }
```

---

## 6. Adapter isolation rule

**Components never import from `wailsjs/` directly.** All backend access goes through
`frontend/src/logic/adapter/`, which:

1. Wraps the auto-generated Wails JS bindings (`frontend/wailsjs/`)
2. Unwraps the Result envelope (`unwrap` / `tryUnwrap`)
3. Subscribes to runtime events (`EventsOn`) and dispatches into slices
4. Maps unexpected rejections (panics, serialization failures) to an `internal` error notification

The adapter is the only file that imports from `wailsjs/`.

---

## 7. Component / data-flow diagram

```
┌───────────────┐   dispatch    ┌───────────────┐   call    ┌───────────────────┐
│  Component     │ ────────────► │  Redux thunk   │ ───────► │  logic/adapter     │
│ (views/*)      │ ◄──────────── │ (slice/thunks) │ ◄─────── │  (wraps bindings)  │
└──────┬─────────┘   selector    └───────────────┘  envelope └─────────┬─────────┘
       │ render                                                         │ Wails bridge
       ▼                                                                ▼
┌───────────────┐                                            ┌───────────────────┐
│  Redux store   │ ◄── reducer ── thunk(fulfilled/rejected)  │  Wails Handler (Go) │
│  (slices)      │                                            └─────────┬─────────┘
└───────────────┘                                                       ▼
       ▲   chain:progress / chain:error / chain:done events    ┌───────────────────┐
       └───────────────────────────────────────────────────── │  Service → Provider │
                       (EventsOn → run slice)                  │    / Repository     │
                                                               └───────────────────┘
```

---

## 8. Dev targets

| Target | Command | Bridge |
|---|---|---|
| Frontend-only (mock bridge) | `cd frontend && npm run dev` | `dev/bridge-mock/` simulates `window.go.*` and `window.runtime` — no Go backend needed |
| Full backend | `wails dev` | Live Go backend at `http://localhost:34115`; use for journeys that exercise real inference, events, or cancellation |

The bridge mock lets the UI run deterministically in CI and enables rapid frontend iteration without
starting the full Wails app.
