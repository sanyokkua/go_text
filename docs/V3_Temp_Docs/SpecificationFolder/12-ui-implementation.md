# 12 — UI Implementation (Radix Primitives + cmdk + Tokenized CSS)

> **Application:** GoText — *"Text Processing Suite"*.
> **Frontend stack:** React 19 + TypeScript + Redux Toolkit + Vite.
> **Mandate:** replace **Material UI** with **Radix Primitives + `cmdk` + custom tokenized CSS**.
> **Status:** Specification. Self-contained. Cross-references other spec documents by filename.

This document defines **how** the v3 GoText UI is implemented: the rendering strategy, the step-by-step
removal of Material UI (MUI), the CSS-token architecture, the Radix Primitives + `cmdk` integration
rules, the element-to-implementation map, the component inventory to build, the dependency changes, the
best practices, the target folder structure, and the testing approach.

Related specs: providers & inference (`04-providers-inference.md`), data model & persistence
(`06-data-model-database.md`), error handling (`07-error-handling-logging.md`), API contracts
(`08-api-contracts.md`), the UI/UX behavior & states (`10-ui-ux-specification.md`), the visual design,
Radix element map and **normative design-token table** (`11-mockup-documentation.md` §1),
Markdown rendering (`16-markdown-rendering.md`), and the task breakdown
(`14-implementation-plan.md`).

---

## 1. Strategy (the final decisions)

These choices are **FINAL** and are not open for re-litigation during implementation.

| Decision | Choice | Rationale |
|---|---|---|
| Component framework | **Removed** — no MUI | The redesign requires full control over look via design tokens. |
| Behaviour / accessibility | **Radix Primitives** (NOT Radix Themes) | Primitives ship **zero styles**; we apply our own tokens. Themes ships opinionated styles that fight a custom token system. |
| Package | The unified **`radix-ui`** package | Radix consolidated the many `@radix-ui/*` packages into one tree-shakable `radix-ui` tree. Avoids `node_modules` bloat and version skew. React 19 compatible. |
| Command palette / searchable lists | **`cmdk`** | Unstyled command-menu primitive for ⌘K and for model/language search. |
| Styling | **Custom tokenized CSS** — CSS variables + CSS Modules. **NO Tailwind.** | A single design-token set, two themes; Vite supports `*.module.css` natively. |
| Theming | **One token set, two themes via a single `.dark` class on `document.documentElement`** | The root class means **portaled Radix content inherits the theme** (see §4, gotcha). The canonical token list is the normative table in `11-mockup-documentation.md` §1. |

**Net architecture:** Radix Primitives + `cmdk` provide *behaviour and accessibility*; our tokenized CSS
provides *all visual appearance*. No third-party component theming participates in the look of the app.

---

## 2. Removing Material UI (step-by-step)

### 2.1 Current MUI footprint (confirmed)

MUI and its styling engine (`@emotion`) are present across the frontend:

- **Theme layer:** `frontend/src/ui/theme.ts` — a `createTheme(...)` with palette, typography, and
  per-component `styleOverrides` (`MuiAppBar`, `MuiTabs`, `MuiTab`, `MuiInputBase`, `MuiButton`,
  `MuiSelect`, `MuiSlider`, `MuiSnackbar`, etc.).
- **Provider wrappers:** `frontend/src/ui/AppLayout.tsx` wraps the app in `<ThemeProvider theme={theme}>`
  and renders `<CssBaseline />`.
- **Views / widgets** importing `@mui/material` and using `sx={{…}}` props, e.g.
  `frontend/src/ui/widgets/views/info/InfoView.tsx`, the entire `settings/` tree
  (`SettingsView.tsx`, `SettingsTabs.tsx`, and the `tabs/*` files), the content editor
  (`content/editor/TextPanel.tsx`, `content/editor/InputOutputContainer.tsx`,
  `content/actions/ActionsPanel.tsx`, `content/MainContentWidget.tsx`), base chrome
  (`base/AppBar.tsx`, `base/StatusBar.tsx`, `base/NotificationContainer.tsx`,
  `base/GlobalLoadingOverlay.tsx`), and `components/FlexContainer.tsx`.
- **Icons:** `@mui/icons-material`.
- **Styling engine:** `@emotion/react`, `@emotion/styled` (pulled in by MUI), plus `@fontsource/roboto`.

### 2.2 Removal procedure

1. **Inventory all usages.** Run a guard sweep and capture every hit:
   ```bash
   grep -rn "@mui\|@emotion" frontend/src
   grep -rn "sx=\|styled(" frontend/src
   ```
   Produce the list of components, icons, `sx` props, and `styled` calls to convert.
2. **Delete the theme layer.** Remove `frontend/src/ui/theme.ts` entirely. Remove `<ThemeProvider>` and
   `<CssBaseline>` (and any `ScopedCssBaseline`) from `frontend/src/ui/AppLayout.tsx` and any other root.
   Their responsibilities move to `tokens.css` + `base.css` (see §3).
3. **Replace components** with the Radix/custom equivalents per the map in §5. Convert each `sx={{…}}`
   object into a **CSS Module class** that reads tokens (`var(--…)`) — never inline hardcoded values.
   - The old theme's blanket `userSelect: 'none'` becomes a `user-select: none` rule on app chrome
     classes in `base.css` (do **not** disable selection on editor/output text areas).
4. **Replace icons.** Use **inline SVG** components, or a tiny tree-shakable set (`lucide-react`).
   Keep simple glyphs where adequate, real SVGs for crisp icon buttons. Drop `@mui/icons-material`.
   `@fontsource/roboto` may stay if Roboto is the chosen face, but the font family becomes a token.
5. **Uninstall the packages:**
   ```bash
   npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
   ```
   Then `npm install` and confirm **no residual imports** remain.
6. **Verify.** Build passes (`tsc && vite build`), bundle shrinks (MUI + emotion are large), and every
   view smoke-tests in light and dark.
7. **Add a CI guard.** A pipeline step that **fails if `@mui` or `@emotion` reappears** in `frontend/src`
   or `frontend/package.json`:
   ```bash
   ! grep -rq "@mui\|@emotion" frontend/src && \
   ! grep -q "@mui\|@emotion" frontend/package.json
   ```

---

## 3. CSS architecture

Plain CSS using **design tokens (CSS variables)** for theme values and **CSS Modules** for component
scoping. Vite handles `*.module.css` (locally-scoped class names) and global `*.css` natively — no
PostCSS framework, no Tailwind.

### 3.1 Files

| File | Role |
|---|---|
| `frontend/src/ui/styles/tokens.css` | **Single source of truth** for all theme values: `:root { … }` (light) + `.dark { … }` (dark overrides), defining the full token set — colors, surfaces, text, accent (teal), borders, radii, spacing, font stacks, shadows, z-index, focus ring. **No component file may hardcode a color/radius/spacing.** The canonical token list is the normative table in `11-mockup-documentation.md` §1 (and `16-markdown-rendering.md` §4 for the `markdown-body` bindings). |
| `frontend/src/ui/styles/base.css` | Minimal reset + global element defaults: `box-sizing: border-box`, `html, body` base font/background/color (from tokens), a global `:focus-visible` ring (token-driven), scrollbar styling, text selection, and the app-chrome `user-select: none`. Imported once. |
| `frontend/src/ui/**/*.module.css` | Per-component, locally-scoped classes (chips, badges, cards, buttons, editor, diff, stack bar, KV editor, tag input, segmented control, history card, etc.), co-located with the component. |
| Per-primitive `*.module.css` | The **functional CSS** for each Radix wrapper lives next to it (e.g. `Dialog.module.css` styles overlay/content/positioning). |

### 3.2 Token rule

Every component reads `var(--…)`; **zero hardcoded hex** values. A single edit in `tokens.css` re-themes
the entire app. Radii, spacing, font, and shadow are tokens too — not just colors.

The canonical token **names and values** are the normative table in `11-mockup-documentation.md` §1;
the snippet below uses those exact names (do **not** introduce a different naming system). Values shown
mirror §1 and `mockup.html`.

```css
/* tokens.css — canonical names per 11-mockup-documentation.md §1 (single source of truth) */
:root {
  /* accent */
  --teal: #009688;
  --teal-dark: #00796b;
  --teal-light: #4db6ac;
  --teal-50: #e0f2f1;
  /* surfaces & text */
  --bg: #eef1f1;
  --surface: #ffffff;
  --surface-2: #f0f4f3;
  --line: #e2e8e7;
  --ink: #16201e;
  --ink-2: #4a5754;
  --ink-3: #7d8b88;
  /* radii (7–14 + pill) */
  --radius-sm: 7px;
  --radius: 9px;
  --radius-md: 12px;
  --radius-lg: 14px;
  --radius-pill: 999px;
  /* spacing (4 / 8 / 12 / 16) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  /* focus + type */
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--teal);
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --mono: 'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace;
}
.dark {
  --bg: #0e1413;
  --surface: #141b1a;
  --surface-2: #1d2625;
  --line: #2a3635;
  --ink: #e8f1ef;
  --ink-2: #9fb2ae;
  --ink-3: #6f817d;
  --teal-50: rgba(0,150,136,.16);
  /* --teal, radii, spacing, font inherit unless overridden */
}
```

> This is an excerpt for orientation only. The **complete** token set (purple/status/diff tokens,
> `--shadow`, the full type scale) is the normative table in `11-mockup-documentation.md` §1 — use those
> names verbatim; never invent `--accent`/`--bg`-style aliases.

### 3.3 Theming mechanics

Light is `:root`; dark is `.dark`. Apply/remove the `.dark` class on **`document.documentElement`**
(the token set and `.dark` override are defined normatively in `11-mockup-documentation.md` §1).
Because the class sits on the root element, **portaled Radix content inherits the theme automatically** —
no per-portal theming is needed (see §4 gotcha).

### 3.4 Import order (in `frontend/src/main.tsx`)

```ts
import './ui/styles/tokens.css';
import './ui/styles/base.css';
// …then the app
```

---

## 4. Radix Primitives + cmdk integration

### 4.1 Install & import

```bash
npm i radix-ui cmdk
```

Import primitives from the **unified package**:

```ts
import {
  Dialog, AlertDialog, Select, Switch, Slider, RadioGroup,
  ToggleGroup, Tabs, DropdownMenu, Tooltip, Toast, ScrollArea, Label,
} from 'radix-ui';
```

### 4.2 Styling pattern (the core idea)

Primitives ship **unstyled**. Style them by:

- your own **`className`** on each part, **plus**
- **Radix state selectors** exposed as data-attributes:
  `[data-state="open"|"closed"|"on"|"checked"|"unchecked"]`, `[data-disabled]`,
  `[data-highlighted]` (active menu/cmdk item), `[data-side]` / `[data-align]` (popover placement),
  `[data-orientation]`.

```css
/* Select.module.css */
.item[data-highlighted] { background: var(--surface-2); outline: none; }
.item[data-disabled]    { color: var(--text-2); pointer-events: none; }

/* Switch.module.css */
.root[data-state="checked"] { background: var(--accent); }
```

### 4.3 You own the functional styles (Radix only ships behaviour)

Radix does **not** apply layout/coverage for you — these are your responsibility:

- **`Dialog` / `AlertDialog`:** the **Overlay must be styled to cover the viewport**
  (`position: fixed; inset: 0`) and the Content positioned/centered. Radix does not do this.
- **`Popover` / `DropdownMenu` / `Tooltip` / `Select` content:** set `width` / `min-width`,
  `max-height`, and `overflow` yourself. Radix handles **collision-aware placement** — do **not**
  reimplement positioning.
- **`Toast`:** provide the `Viewport` placement and width.

### 4.4 `asChild` — avoid wrapper nodes

Use `asChild` to make your own element the trigger/anchor without an extra DOM wrapper:

```tsx
<Dialog.Trigger asChild>
  <button className={styles.btn}>Save stack…</button>
</Dialog.Trigger>
```

Prefer `asChild` to keep markup lean and styling predictable.

### 4.5 Controlled where state must sync

Bind `value` / `checked` + `onValueChange` / `onCheckedChange` of
`Select` / `ToggleGroup` / `Switch` / `Slider` / `Tabs` to **Redux / settings** so toolbar and Settings
never drift (provider, model, format, view, layout, theme, token-param, temperature, etc.). One source
of truth — see the states/behaviors in `10-ui-ux-specification.md` (§0, §C Form patterns).

### 4.6 Accessibility — let Radix own it

Radix provides ARIA roles, **focus trapping** (Dialog), **keyboard navigation** (Menu/Select/Tabs),
and `Label` association. **Do not reimplement these.** Add a visible focus ring via the focus-ring token.

### 4.7 Animation

Drive enter/exit off `[data-state]` (`open` / `closed`) with CSS transitions/keyframes, and respect
reduced motion:

```css
.content[data-state="open"]  { animation: fadeIn 120ms ease-out; }
.content[data-state="closed"] { animation: fadeOut 100ms ease-in; }
@media (prefers-reduced-motion: reduce) {
  .content[data-state] { animation: none; }
}
```

### 4.8 Gotcha — portals + theme

`Dialog` / `Popover` / `DropdownMenu` / `Tooltip` / `Toast` / `Select` content render in a **portal**
(it escapes the app subtree). Because the `.dark` class is on `document.documentElement`, portals
inherit it. **Keep the theme class on the root element**, never on an inner app `<div>`, or dark mode
will leak/break in overlays.

### 4.9 cmdk specifics

- `cmdk` is the unstyled command menu.
- **⌘K palette** renders `<Command>` inside a Radix **`Dialog.Content`** (esc closes; ↵ runs;
  ⇧↵ adds to stack).
- **Model / language searchable lists** render `<Command>` inside a Radix **`Popover.Content`**
  (the `container` prop can target the portal).
- Controlled via `value` / `onValueChange`; style the active item with `[cmdk-item][data-selected="true"]`.
- **No built-in virtualization.** Fine for ≤ ~2–3k items. For very large catalogs (e.g. OpenRouter
  400+ models — see `04-providers-inference.md`), **add virtualization (BYO), or cap / paginate**.

---

## 5. Element → implementation map

(From the mockup / Radix map — see `11-mockup-documentation.md`.)

| UI element | Implement with | Notes |
|---|---|---|
| Provider / Kind / Auth pickers | Radix **`Select`**, **`ToggleGroup`** | `Select` for the 5-kind list; `ToggleGroup` for 2–3 segmented (Auth, Type). |
| Model picker · language lists (searchable) | **`cmdk` in Radix `Popover`** | + refresh button; empty/loading states. |
| Command palette ⌘K | **`cmdk` + Radix `Dialog`** | ↵ run · ⇧↵ add to stack · esc close. |
| Save-stack / confirm dialogs | Radix **`Dialog`** / **`AlertDialog`** | `AlertDialog` for destructive (reset / delete / clear). |
| Format / View / Layout / **Theme** toggles | Radix **`ToggleGroup`** | styled segments; controlled value. |
| Switch · Slider · RadioGroup | Radix (same names) | temperature/context sliders, token-param radio, all boolean toggles use **`Switch`** (no `Checkbox` in v3). |
| Settings navigation | Radix **`Tabs` (vertical)** | the Settings sections. |
| Stack / history / Manage context menus | Radix **`DropdownMenu`** | run / edit / duplicate / delete. |
| Tooltips on icon buttons | Radix **`Tooltip`** | |
| Toasts / notifications | Radix **`Toast`** | typed error toasts — see `07-error-handling-logging.md`. |
| Long lists (sidebar, history rail, catalog) | Radix **`ScrollArea`** (+ virtualization if huge) | |
| **Chips, badges, cards, buttons** | **Custom CSS** (native `<button>` / `<span>`) | pure presentation. |
| **Editor panes (input / output)** | **Custom** | `<textarea>` input; output = rendered container. |
| **Markdown preview** | **`react-markdown` + `remark-gfm` + `remark-math`/`rehype-katex` + `rehype-highlight`/`highlight.js` + `mermaid`** (the shared `MarkdownView`) | Output Preview + the About Guide; render once on completion. Full rules, theming, security, and examples in `16-markdown-rendering.md`. |
| **Diff view** | **diff lib** (word-level) + **custom** spans (`.ins` / `.del`) | added = green, removed = struck red. |
| **Stack builder chip bar** | **Custom** | chips + family groups + inference badges; reads merge plan. |
| **History rail** | **Custom** (cards) inside `ScrollArea` | |
| **Prompt Inspector** | **Custom** (prompt blocks + copy) — the **detail panel** of the About · Info view's Actions & Stacks two-column grid (not a `Dialog`) | composed read-only via `PreviewPrompt`; see `10-ui-ux-specification.md` §A.4 / `11-mockup-documentation.md` §9.4. |
| **Key–value editor** (custom headers) | **Custom** (controlled rows of inputs) | add / remove rows. |
| **Tag input** (custom model names) | **Custom** (chips + input, ↵ add, ✕ remove) | small custom logic. |
| **Step-progress indicator** | **Custom** (dots + connector + spinner) | from `chain:progress` events. |

> Net: ~11 Radix primitives + `cmdk` cover everything behaviour-heavy; the rest is **static
> presentational markup + CSS**. Build small **styled wrappers** over each Radix primitive
> (`ui/primitives/Select.tsx`, etc.) so views import a consistent, pre-styled component.

---

## 6. Components to build

### 6.1 Thin Radix wrappers — `frontend/src/ui/primitives/`

`Select`, `Dialog`, `AlertDialog`, `Segmented` (`ToggleGroup`), `Switch`, `Slider`, `RadioGroup`,
`Tabs`, `DropdownMenu`, `Tooltip`, `Toast`, `ScrollArea`, `Combobox` (cmdk + Popover),
`CommandPalette` (cmdk + Dialog). Each = behaviour from Radix/cmdk + a co-located CSS module reading
tokens + a clean **controlled API**. (No `Checkbox` wrapper: every boolean in v3 is a `Switch`.)

### 6.2 Presentational — `frontend/src/ui/components/`

`Button`, `IconButton`, `Chip`, `Badge`, `Card`. Native elements + CSS module; no Radix needed.

### 6.3 App-specific custom (the real work) — `frontend/src/ui/components/`

| Component | Behaviour & tricky bits |
|---|---|
| **`EditorPane`** | Input (`<textarea>`, controlled, word count, Paste via `ClipboardGetText` / Clear) and output (renders Preview/Source/Diff; Copy via `ClipboardSetText` / Use-as-input / Clear). Clipboard methods are bound in `08-api-contracts.md`. Output **Preview** uses the shared **`MarkdownView`** (see `16-markdown-rendering.md`); render **once on completion**, never mid-stream. |
| **`MarkdownView`** | Shared Markdown renderer (`react-markdown` + GFM + math + code-highlight + mermaid), token-themed, raw-HTML disabled, links externalized via the bound `BrowserOpenURL` (open-external; `08-api-contracts.md`). Used by the Output Preview and the About Guide. See `16-markdown-rendering.md`. |
| **`MermaidBlock`** | Async render of ```` ```mermaid ```` blocks to themed SVG with loading/error states (`securityLevel:'strict'`). See `16-markdown-rendering.md`. |
| **`TagInput`** | Controlled chips; ↵ adds (trim + dedupe), Backspace removes last, ✕ removes one. Used for **custom model names**. |
| **`KvEditor`** | Controlled list of `{ key, value }` rows; add / remove. Used for **custom headers** (replaces `HeadersEditor.tsx`). |
| **`DiffView`** | Word-level diff (diff lib) → wrap added/removed in `.ins` / `.del` spans + counts + "Copy clean". Lazy-load the diff lib. |
| **`StackBuilderBar`** | Chips grouped by family with inference badges; live `N/5 · M inferences`; Cancel / Save… / Run. Reflects the planner — see `04-providers-inference.md` and `05-stacks-actions-engine.md`. |
| **`HistoryRail`** | Entry cards (status / inference chips, preview), restore / delete, inside `ScrollArea`. Use stable ids as keys. |
| **`PromptInspector`** | Per-inference prompt blocks (system / user, params, applied actions, flow, per-block copy via `ClipboardSetText`) rendered as the **right-hand detail panel** of the About · Info view's Actions & Stacks grid (**not** a `Dialog`). Composed read-only via `PreviewPrompt` (`08-api-contracts.md`); see `11-mockup-documentation.md` §9.4. |
| **`StepProgress`** | Running indicator (dots + connector + spinner) from `chain:progress` events (see `08-api-contracts.md`). |

---

## 7. Dependencies (`frontend/package.json`)

| Action | Packages |
|---|---|
| **Add** | `radix-ui` (unified, ~1.5.x), `cmdk`, `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `rehype-highlight`, `highlight.js`, `katex`, `mermaid`, a diff lib (e.g. `diff`), optional `lucide-react` (icons). |
| **Remove** | `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`. (`@fontsource/roboto` may stay if Roboto remains the type face — referenced via a token.) |
| **Keep / confirm** | React 19, Redux Toolkit, Vite 7, TypeScript 5.9, Jest 30. Add `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jest-axe`, and **`playwright`** (headless-Chromium UI tests) for the testing approach in §10 and `13-testing-specification.md` (§1.5, §4, §11). |

> **Two frontend run targets (for development and UI tests).** The UI can be served two ways, both
> covered by the test suite: **(A)** the **frontend-only** Vite dev server (`cd frontend && npm run dev`)
> with a dev-only **browser bridge mock** (`frontend/src/dev/bridge-mock/`, injected only in dev/test
> builds) that stands in for `window.go.*` / `window.runtime` so the UI runs deterministically with no Go
> backend; and **(B)** the **backend-connected** `wails dev` server (live bridge at
> `http://localhost:34115`) for end-to-end journeys through the real backend. See
> `13-testing-specification.md` §1.5. The harness for both is set up in task **T00**
> (`14-implementation-plan.md`).

Canonical library references:
- Radix Primitives — styling guide & overview: <https://www.radix-ui.com/primitives/docs/guides/styling>,
  <https://www.radix-ui.com/primitives/docs/overview/releases>
- `cmdk`: <https://github.com/pacocoursey/cmdk>, <https://www.npmjs.com/package/cmdk>

---

## 8. Best practices, what to avoid, common mistakes

### 8.1 Best practices

- **Tokens only.** Never hardcode a color / radius / spacing in a component — use `var(--…)`. One edit
  in `tokens.css` re-themes everything.
- **Theme by a single root class** (`.dark` on `document.documentElement`); never duplicate component CSS
  per theme.
- **`asChild`** to compose your own buttons/links as Radix triggers — fewer wrapper nodes.
- **Controlled** the form / run-context primitives (bind to Redux/settings) — one source of truth.
- **Let Radix own a11y** (focus traps, keyboard, ARIA); add a visible focus-ring token; meet WCAG AA.
- **Import only what you use** from `radix-ui` (tree-shaking); co-locate CSS modules with components.
- **Respect `prefers-reduced-motion`** in animations.
- **Render markdown / diff lazily** (on completion / debounced), not on every keystroke.
- **Surface errors via the typed envelope** (see `07-error-handling-logging.md`) → toasts / inline;
  never show raw strings.

### 8.2 What to avoid / common mistakes

| Avoid | Why |
|---|---|
| Radix **Themes** when you need full token control | Closed, opinionated styles — use **Primitives**. |
| Forgetting **functional styles** | Dialog overlay won't cover the screen; Popover/Select content has no width/max-height until you add them. Behaviour ≠ presentation. |
| Theme class on an **inner div** | Portaled overlays (Dialog/Popover/Toast) miss the theme. Put it on `documentElement`. |
| **Reimplementing keyboard/focus** for Select/Menu/Dialog/Tabs | Radix already does it, and better. |
| Leaving `@mui` / `@emotion` "just for one component" | Remove fully; the CI guard fails otherwise. |
| **Hardcoded hex** colors / per-component theme branches | Defeats the single token set. |
| `index` as a React **key** in dynamic lists (stacks, history, KV rows) | Use stable ids. |
| **Uncontrolled** primitives where the value must sync to settings | Toolbar ↔ Settings drift. |
| `cmdk` without **virtualization** for huge catalogs (OpenRouter 400+) | Cap / paginate / virtualize. |
| **Mid-stream Markdown** rendering or heavy synchronous diff on each keypress | Kills typing responsiveness. |
| Shipping icons via a **heavy icon font/lib** | Prefer inline SVG or a tree-shakable set. |

---

## 9. Suggested folder structure (`frontend/src/ui`)

```
ui/styles/        tokens.css · base.css
ui/primitives/    Select.tsx · Dialog.tsx · AlertDialog.tsx · Segmented.tsx · Switch.tsx
                  Slider.tsx · RadioGroup.tsx · Tabs.tsx · DropdownMenu.tsx
                  Tooltip.tsx · Toast.tsx · ScrollArea.tsx · Combobox.tsx · CommandPalette.tsx
                  (+ a co-located *.module.css for each)
ui/components/    Button · IconButton · Chip · Badge · Card
                  TagInput · KvEditor · DiffView · EditorPane
                  StackBuilderBar · HistoryRail · PromptInspector · StepProgress
                  (+ a co-located *.module.css for each)
ui/widgets/views/ Editor · Settings (+ sections) · About · ManageStacks   (compose the above)
```

---

## 10. Testing & verification

- **Accessibility:** run `jest-axe` against each `ui/primitives/*` wrapper and the key views; do a
  keyboard walk of Dialog / Select / Menu / Tabs (Tab order, arrow keys, Esc, focus trap/return).
- **Theme & portals:** snapshot light + dark by toggling the root `.dark` class; **verify portaled
  overlays inherit the theme** (Dialog/Popover/Toast render correctly in dark mode).
- **Behaviour:** controlled value sync (`Select` / `ToggleGroup` ↔ store); `TagInput` / `KvEditor`
  add / remove; `DiffView` output spans + counts; `cmdk` filtering plus ↵ / ⇧↵.
- **Build guard (CI):** the pipeline **fails if `@mui` or `@emotion` is present** in `frontend/src` or
  `frontend/package.json` (see §2.2 step 7); run a visual smoke per view.

> Test stack: React Testing Library (`@testing-library/react` + `user-event`) for interaction,
> `jest-axe` for accessibility assertions, Jest snapshots for theme/portal rendering.
