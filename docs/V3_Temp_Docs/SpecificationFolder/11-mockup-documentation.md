# 11 — Mockup Documentation (Textual Design Reference)

> **Status:** Spec-ready. **Date:** 2026-06-23.
> **App:** GoText — "Text Processing Suite". A Wails desktop app: Go backend, React + Radix
> Primitives front end, fully tokenized CSS theming.
> **Purpose of this document:** This is the *complete textual replacement* for the visual design
> mockup. It re-creates every screen, surface, region, widget, hierarchy, interaction, edge case,
> accessibility requirement, styling rule, and responsive behavior in prose so that a developer can
> implement the entire UI **without ever needing the original graphical mockup**. Read this together
> with `10-ui-ux-specification.md` (UX rationale and flows) and `12-ui-implementation.md`
> (component/state implementation). Backend behavior is governed by the functional/architecture/data
> documents in this folder (provider/inference, stacks engine, data model, error handling).

This document is organized into nine surfaces that mirror the original mockup's nine reference tabs:

1. Design tokens & themes
2. Widget gallery
3. Menus & overlays
4. Main screen — horizontal layout (+ History rail)
5. Main screen — vertical layout
6. Stack builder, diff view, running state & My Stacks Manage grid
7. Settings (all seven section screens)
8. Radix primitive map
9. About · Info window (Guide, catalog, Prompt Inspector)

A final section collects cross-cutting interaction rules, accessibility requirements, and responsive
behavior that apply across all surfaces.

---

## Conventions used in this document

- **Color values** are the literal token hex values; named tokens (e.g. `--teal`, `--ink-2`) are the
  CSS custom properties every component reads. Light/dark switching is achieved by a **single `.dark`
  class on the root element** that re-binds the same token names — components are never re-styled per
  theme.
- **"Inference"** = one LLM round-trip. The product deliberately surfaces *inferences added*, never an
  estimated time in seconds (time depends entirely on model and hardware). This is a hard product rule
  reflected in every stack-related surface.
- **Radix mapping:** where a control's behavior is provided by a Radix Primitive (or `cmdk` for
  searchable lists), that is named. Controls marked **custom CSS** are presentational markup with no
  third-party behavior dependency.
- **Icons** in this document are described by name/glyph (e.g. "gear ⚙", "history clock 🕘"). The
  implementation may use any consistent icon set; glyphs here are indicative only.

---

# 1. Design Tokens & Themes

## 1.1 Screen description (purpose)

The token foundation. A single token set drives two themes. Every widget reads CSS variables, so the
light/dark switch is one class on the root — no duplicated component styling. The teal/purple brand
identity is preserved and modernized. The **active theme is a user setting** — **Auto** (follow OS,
live), **Light**, or **Dark** — set in *Settings · Appearance* (see Section 7.7). The effective theme
(`light` / `dark`) is derived from the `ui.theme` preference.

## 1.2 Brand & accent tokens

| Token | Hex | Role |
|---|---|---|
| `--teal` | `#009688` | Primary brand / primary action fill, accents, focus accent |
| `--teal-dark` | `#00796b` | Primary hover, accent text on light surfaces |
| `--teal-light` | `#4db6ac` | Accent borders, accent text on dark surfaces, brand dot |
| `--teal-50` | `#e0f2f1` (light) / `rgba(0,150,136,.16)` (dark) | Accent fill (selected nav, accent chips, accent selects) |
| `--purple` | `#5e35b1` | Secondary accent (e.g. Summarize family, "stack" badge, purple chips) |
| `--purple-50` | `#ede7f6` (light) / `rgba(94,53,177,.22)` (dark) | Purple chip/badge fill |
| `--purple-line` | `#d1c4e9` (light) / `rgba(149,117,205,.4)` (dark) | Purple chip/badge border |
| `--ok` (success) | `#2e9e6b` | Success state, completed step markers, "done" badges, added-words diff text |
| `--ok-bg` | `#d8f0e3` (light) / `rgba(46,158,107,.22)` (dark) | Success badge fill |
| `--warn` | `#c9821a` | Warning (e.g. rate-limit retry toast) |
| `--err` (danger) | `#d05353` | Destructive actions, error toasts/borders, removed-words diff text |
| `--err-bg` | `#fae3e3` (light) / `rgba(208,83,83,.2)` (dark) | Inline error fill |
| `--add` | `#cdeede` (light) / `rgba(46,158,107,.32)` (dark) | Diff "added word" highlight background |
| `--del` | `#f6d2d2` (light) / `rgba(208,83,83,.3)` (dark) | Diff "removed word" highlight background |

## 1.3 Surface & text tokens (theme-dependent)

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#eef1f1` | `#0e1413` | App/window background |
| `--surface` | `#ffffff` | `#141b1a` | Cards, popovers, primary panels, inputs |
| `--surface-2` | `#f0f4f3` | `#1d2625` | Recessed surfaces: editors, toolbar segs, sidebar, steppers |
| `--line` | `#e2e8e7` | `#2a3635` | All borders, dividers, separators |
| `--ink` | `#16201e` | `#e8f1ef` | Primary text |
| `--ink-2` | `#4a5754` | `#9fb2ae` | Secondary text |
| `--ink-3` | `#7d8b88` | `#6f817d` | Tertiary text, captions, placeholders, carets |

Additional theme-aware tokens:

- `--shadow` — Light: `0 1px 2px rgba(16,32,30,.06), 0 8px 24px rgba(16,32,30,.08)`;
  Dark: `0 1px 2px rgba(0,0,0,.3), 0 10px 30px rgba(0,0,0,.4)`. Used by cards, popovers, the mock app
  chrome.
- Popover/menu elevation overrides shadow to `0 18px 44px rgba(16,32,30,.22)` (light) /
  `0 18px 44px rgba(0,0,0,.5)` (dark).

The dark theme is defined entirely inside the `.dark` selector, which redeclares the variables above
plus `background:var(--surface); color:var(--ink)`. **No component contains a theme-specific rule
beyond the handful of accent-text corrections** (e.g. accent chips switch from `--teal-dark` text on
light to `--teal-light` text on dark) — see Section 7 of the styling rules below.

## 1.4 Typography tokens

- `--font` (UI/body): `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- `--mono` (code/paths/endpoints/model IDs): `'SF Mono', ui-monospace, 'JetBrains Mono', Menlo, monospace`.
- Global body: color `--ink`, background `--bg`, `line-height:1.55`, antialiased.
- Headings (`h1`–`h4`): `font-weight:700; line-height:1.2; letter-spacing:-.01em`.

**Type scale** (role · size/weight):

| Role | Size / weight | Notes |
|---|---|---|
| h1 | 36px / 700 | Window/section masthead (rare in-app; mostly marketing-scale) |
| h2 | 22px / 700 | Section headings |
| Body | 14px / 400 | Editors, panels, default reading text (`line-height` ~1.55–1.6) |
| Label (caps) | 11px / 700, uppercase, `letter-spacing:.1em`, color `--ink-3` | Field labels above controls |
| Caption (`.cap`) | 11px / 600, uppercase, `letter-spacing:.06em`, color `--ink-3` | Small group captions |
| Mono | 13px | Endpoints, paths, model IDs, env-var names |

Within toolbars some segmented-control labels use the same 11px caps label style inline.

## 1.5 Spacing & radii tokens

- **Spacing scale** — exposed as named tokens: `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`,
  `--space-4: 16px`. Use these for gaps and padding (e.g. toolbar `gap:var(--space-2)`, editor padding
  `13`, card padding `13–18`, sidebar item padding `6–9`).
- **Radii scale** — exposed as named tokens spanning `7–14` px plus the pill radius:
  - `--radius-sm: 7px` — segmented-control inner buttons, small preview swatches.
  - `--radius: 9px` — inputs, steppers, selects, icon buttons, chips' container, sidebar items, toasts.
  - `--radius-md: 12px` — buttons, popovers/menus, callout cards, stack cards.
  - `--radius-lg: 14px` — primary content cells/panels.
  - `--radius-xl: 16px` — the app window (mock chrome) outer frame.
  - `--radius-pill: 999px` — fully-pill chips, badges-as-pills, brand pill, the Switch track.

## 1.5a Focus-ring token

- `--focus-ring` — the keyboard-focus outline applied on `:focus-visible` throughout the app, honoring
  the accent: `0 0 0 2px var(--bg), 0 0 0 4px var(--teal)`. It re-binds with the theme like every other
  token (no per-component focus styling).

## 1.6 Component hierarchy

```
:root (token declarations — light)
└─ .dark (token overrides — dark)
   • all descendant components inherit re-bound variables; no per-component theme rules
```

## 1.7 Interaction logic

- The effective theme is set by the application root applying or removing the `.dark` class according
  to `ui.theme` (`auto` resolves against the live OS color-scheme; `light`/`dark` force it). Changing
  the theme is instant and requires no restart (see Section 7.7).
- Tokens are static values; there is no runtime token editing in the product.

## 1.8 Edge cases

- **System theme changes while `ui.theme = auto`:** the root class updates live; all surfaces re-paint
  via the variables with no remount.
- **High-contrast / forced colors (OS):** tokens still apply; the implementation should not rely on
  color alone to convey state (pair color with glyph/text — see Accessibility, Section 10.3).

## 1.9 Accessibility requirements

- Body text (`--ink` on `--surface`/`--bg`) and secondary text (`--ink-2`) must meet WCAG AA contrast
  in both themes. Tertiary `--ink-3` is reserved for non-essential captions/placeholders.
- The teal primary fill uses white text; the danger fill uses white text — both verified for contrast.
- Never use the success/danger colors as the *sole* signal; diff and status surfaces also carry
  glyphs and counts.

## 1.10 Styling rules

- Every color, spacing, and radius value in later sections references these tokens. Components must not
  hardcode theme colors; only the token names appear in component CSS.
- The font stack (`--font`) is applied globally; monospaced contexts use `--mono`.

## 1.11 Responsive behavior

- Tokens are viewport-independent. Layout density (paddings/gaps) stays constant; responsive changes
  happen at the layout level (Sections 4–7), not the token level.

---

# 2. Widget Gallery

## 2.1 Screen description (purpose)

The full library of reusable controls, each shown identically in light and dark (identical markup,
theme by token). This catalog is the single source of truth for control appearance and behavior.
Each entry notes the backing Radix primitive (or **custom CSS**) — the complete mapping is in
Section 8.

## 2.2 Buttons (`native <button>` + CSS — custom)

Variants and their styling tokens:

- **Primary** (`.btn.primary`): fill `--teal`, border `--teal`, white text, elevation
  `0 4px 12px rgba(0,150,136,.28)`; hover fill `--teal-dark`. Used for the principal action (e.g.
  "▶ Run", "Save", "New stack").
- **Default** (`.btn`): fill `--surface`, border `--line`, text `--ink`; hover fill `--surface-2`.
- **Ghost** (`.btn.ghost`): transparent fill/border, text `--ink-2`. Used for secondary actions
  (e.g. "Cancel").
- **Danger** (`.btn.danger`): fill `--err`, border `--err`, white text. Used for destructive confirms
  (e.g. "Reset everything", "Delete…"). A "danger ghost" combination (transparent + danger text) is
  used for low-emphasis destructive triggers such as the provider "Delete…" link.
- **Small** modifier (`.btn.sm`): reduced padding (`6px 11px`), 12.5px text. Used inside dialogs,
  cards, toolbars.
- Base button: `font-weight:600; font-size:13px; border-radius:10px; padding:9px 15px;` inline-flex
  with `gap:7px` for an optional leading glyph.

**Icon button** (`.iconbtn`): `min-width:31px; height:31px; border-radius:9px;` border `--line`, fill
`--surface`, text `--ink-2`; hover fill `--surface-2`. The **"on" state** (`.iconbtn.on`) uses
`--teal-50` fill, `--teal-light` border, and accent text (teal-dark on light, teal-light on dark) — it
marks an active toggle such as the sidebar toggle or the History toggle. Compact icon buttons inside
panes use `height:24px; min-width:24px`.

States for all buttons: `default · hover · focus (visible focus ring) · pressed · disabled (greyed,
non-interactive)`.

## 2.3 Segmented toggles (`Radix ToggleGroup`)

Container `.seg`: inline-flex, fill `--surface-2`, border `--line`, `border-radius:9px`, `padding:2px`.
Inner buttons: borderless, transparent, 12px/600 text, color `--ink-2`, `border-radius:7px`. The
**selected** button (`.on`) gets `--surface` fill (or near-black `#0e1413` in dark), accent text
(teal-dark/teal-light), and a subtle `0 1px 3px` shadow.

Used for mutually-exclusive choices: **Format** (Plain / Markdown), **View** (Preview / Source / Diff),
**Layout** (⊞ Side / ⊟ Stacked), **Auth** (None / Bearer / Api-Key), **Theme** (Auto / Light / Dark).
Exactly one segment is selected at a time.

## 2.4 Switch (`Radix Switch`)

`.sw`: `38×22px` pill, track fill `--line`; knob `18×18px` white circle with subtle shadow, offset
`2px`. **On** (`.sw.on`): track fill `--teal`, knob slides to the right (`left:18px`). Binary
on/off. Used for "Use temperature", "Use context window", "Use custom headers", "Use custom models",
"Request Markdown output", task/diagnostic/history logging, "Compress", and the Inspector "Use current
input" preview toggle.

## 2.5 Slider (`Radix Slider`)

`.sld`: 5px track, fill `--surface-2`, border `--line`, `border-radius:4px`. `.fill`: teal progress
bar from the left. `.knob`: 16px white circle, 2px teal border, subtle shadow, centered on the value
position. Always paired with a live numeric value rendered to its right/above (e.g. "0.3", "131072").
Used for Temperature (0–2 range) and Context window.

## 2.6 Number stepper (`native input` + CSS — custom over native)

`.stepper`: inline-flex, border `--line`, `border-radius:9px`, overflow hidden, fill `--surface`.
Center `<input>`: borderless, 54px wide, centered text, transparent background. Flanking `−` / `+`
buttons: `28px` wide, `34px` tall, fill `--surface-2`, text `--ink-2`. Used for Timeout (s), Retries,
log rotation max-size/backups/age, and history max-entries. Values are bounded (clamped to the valid
range; see edge cases in the relevant sections).

## 2.7 Text input (`native input` + CSS — custom)

`.inp`: 13px text, padding `8px 11px`, border `--line`, `border-radius:9px`, fill `--surface`, text
`--ink`. `.inp.full` spans 100% width. Placeholder text uses `--ink-3`. Inputs hosting endpoints,
base URLs, paths, and env-var names render their value in the same font (mono is used only where the
value is intrinsically code-like, e.g. resolved paths shown as `<code>`).

## 2.8 Radio group (`Radix RadioGroup`)

`.radio`: inline-flex, `gap:8`, 13px text. `.r` indicator: 16px circle, 2px `--ink-3` border;
**selected** (`.radio.on`) → border `--teal` and an inner 8px teal dot. Used for the **Token-limit
parameter** choice (`max_completion_tokens` vs `max_tokens (legacy)`); exactly one is selected.

## 2.9 Checkbox (`Radix Checkbox`)

`.cbx`: 17px box, 2px `--ink-3` border, `border-radius:5px`. **Checked** (`.cbx.on`): `--teal` fill,
`--teal` border, white check glyph. Binary checked/unchecked. Used for standalone boolean options
where a Switch is not the chosen affordance.

## 2.10 Select trigger (`Radix Select`)

`.sel`: inline-flex, `gap:7`, 12.5px/600 text, padding `6px 10px`, `border-radius:9px`, fill
`--surface-2`, border `--line`, text `--ink`, cursor pointer. A leading `.k` "key" label (10px caps,
`--ink-3`) names the field (e.g. "Provider", "Model", "Lang", "Kind"); a trailing `.car` caret
(`▾`, 10px, `--ink-3`) indicates it opens a menu. The **accent** variant (`.sel.accent`) uses
`--teal-50` fill, `--teal-light` border, accent text — used for the **current** provider so it stands
out in the toolbar. A select trigger may span full width (`justify-content:space-between`) in Settings
forms, where the caret pairs with a refresh glyph (`⟳ ▾`).

## 2.11 Chips & removable chips (custom CSS)

`.chip`: inline-flex pill, `gap:6`, 12px/600 text, padding `6px 11px`, `border-radius:999px`, fill
`--surface-2`, border `--line`, text `--ink-2`.

- **Accent** (`.chip.accent`): `--teal-50` fill, `--teal-light` border, accent text — used for armed
  actions, custom-model tags, "Rewrite" family.
- **Purple** (`.chip.purple`): `--purple-50` fill, `--purple-line` border, purple text — used for
  Summarize family and the "stack" tag.
- **Removable**: a trailing `✕` (`.x`, reduced opacity, pointer) removes the chip. Used for build-mode
  steps, custom-model tags, and custom-header-less removable tokens.
- **Add chip**: a dashed-border chip reading "＋ Add step" acts as an affordance/hint rather than a
  data chip.

## 2.12 Badges (custom CSS)

`.badge`: 10.5px/800, uppercase, `letter-spacing:.04em`, padding `3px 7px`, `border-radius:6px`, fill
`--surface-2`, text `--ink-3`, border `--line`. Variants:

- **OK** (`.badge.ok`): `--ok-bg` fill, `--ok` text, no border. ("✓ done", "current", "N inferences").
- **Inline color overrides** for partial/error states reuse `--del` fill + `--err` text (e.g. the
  "partial" history badge, "−9 removed" diff count).

Badges are non-interactive status indicators (e.g. "1 inference", "3 / 5 steps", "100 max", "v3.0.0",
"current", "default input/output").

## 2.13 Tooltip (`Radix Tooltip`)

`.tipbox`: dark fill (`#16201e`, near-black in dark theme), white text, 11.5px/600, padding `5px 9px`,
`border-radius:7px`, with a downward-pointing caret. Appears on hover/focus of icon-only buttons to
label them (e.g. Paste, Clear, Copy, "Use as input"). Tooltip content is also exposed as the
accessible name of the control (see Accessibility).

## 2.14 Tag input (custom CSS over native input)

A bordered container (`border-radius:9px`, `padding:7px`, fill `--surface`) holds wrapped accent chips
plus a borderless inline `<input>`. Typing a name and pressing **↵** adds a chip; each chip's `✕`
removes it; placeholder reads "type a name & ↵…" / "add a model name & press ↵…". Used for **custom
models** in the provider editor (used when discovery is off or unreachable).

## 2.15 Key–value editor (custom CSS over native inputs)

A bordered container with rows; each row is two borderless inputs (name | value) separated by a
vertical `--line`, ending in an icon button. Existing rows end in `✕` (remove); the final empty row
ends in `＋` (add). Used for **custom headers** in the provider editor. Header name/value inputs use
placeholders "Header name" / "Value". The header bag persists as JSON.

## 2.16 Step progress (custom CSS)

A horizontal row of step nodes joined by connector bars. Each node is a 22px circle with a status fill:

- **Completed** — `--ok` fill, white check glyph; connector after it is `--ok` (2px).
- **Active/current** — `--teal` fill, either the step number or an inline spinner (white-tinted).
- Labels (12.5px/600) sit beside each node; family steps may append "· 1 inference".

Used in the running-stack header and the widget-gallery progress sample.

## 2.17 Cards (custom CSS · `Radix ScrollArea` for long lists)

- **Cell** (`.cell`): fill `--surface`, border `--line`, `border-radius:14px`, padding `18px`, plus
  `--shadow`. The general content panel.
- **Stack card** (Manage grid / armed-stack preview): bordered `border-radius:12px` card with an icon
  glyph, name (14px/700), a one-line step description (12px, `--ink-2`), badges ("N steps",
  "N inferences"), and action buttons (Run / Edit) plus a `⋮` menu trigger.

Long scrolling regions (sidebar, history rail, catalog) are wrapped by `Radix ScrollArea`.

## 2.18 Toasts (`Radix Toast`)

Transient notification surface, bottom-corner stacked. Variants:

- **Success/info**: dark fill (`#16201e` light / `#000` dark), white text, leading accent ✓ glyph,
  trailing `✕` dismiss. (e.g. "Copied to clipboard", "Stack … saved").
- **Error (typed)**: `--err` fill, white text, leading severity glyph; carries a *typed* message
  (auth / timeout / rate-limit / not-found / validation). (e.g. "Provider unreachable — check Base
  URL".)
- **Warning**: `--warn` fill (e.g. "Rate limited — retrying in 3s…").
- **Progress**: `--surface` fill, border `--line`, with an inline spinner and a "cancel" affordance
  (e.g. "Step 2 of 2 — Key points…").

All toasts: `border-radius:10px`, padding `~11px 14px`, 13px text, auto-dismiss timeout plus manual
`✕`. Error presentation is driven by the typed-error taxonomy (see the error-handling document in this
folder). Full overlay treatment is in Section 3.

## 2.19 Component hierarchy (gallery grouping)

```
WidgetGallery
├─ Buttons (primary · default · ghost · danger · sm · iconbtn[.on])
├─ Toggles (Segmented[ToggleGroup] · Switch)
├─ Inputs (Slider · Stepper · TextInput)
├─ Choice (RadioGroup · Checkbox · Select trigger)
├─ Indicators (Chip[accent|purple|removable] · Badge[ok])
├─ Tooltip
├─ Composite inputs (TagInput · KeyValueEditor)
└─ Feedback (StepProgress · StackCard · Toast)
```

## 2.20 Interaction logic

- Toggle/selection widgets emit `on/off` or `selected/unselected`; choice groups enforce single
  selection.
- Steppers/sliders/inputs emit bounded values and are clamped client-side, mirroring backend bounds.
- Removable chips and KV/tag editors mutate their backing list and persist on save (where applicable).

## 2.21 Edge cases

- **Disabled controls** render greyed and are non-interactive (e.g. Run with no action armed or empty
  input; Copy/Clear with an empty target; Save-stack with zero steps).
- **Slider/stepper out-of-range** input is clamped; invalid free-typed numbers fall back to the last
  valid value.
- **Tag input duplicate** model name is ignored (no duplicate chip).

## 2.22 Accessibility requirements

- All interactive widgets are keyboard-operable and expose correct ARIA roles/state — provided by the
  Radix primitive where mapped (focus management, arrow-key navigation, `aria-checked`/`aria-pressed`,
  etc.).
- Icon-only buttons must have an accessible name (tooltip text doubles as `aria-label`).
- Focus is always visibly indicated (focus ring honoring the accent token).

## 2.23 Styling rules

- All colors/spacing/radii reference Section 1 tokens. The one theme-specific concession is accent text
  color: accent chips/selects/icon-buttons use `--teal-dark` text on light and `--teal-light` text on
  dark; purple chips switch to a lighter purple on dark.

## 2.24 Responsive behavior

- Gallery rows wrap (`flex-wrap`) when horizontal space is constrained; composite inputs (tag/KV) wrap
  their chips/rows. Control sizes are fixed; only their arrangement reflows.

---

# 3. Menus & Overlays

## 3.1 Screen description (purpose)

Every transient surface, documented in its open state: dropdowns, popovers, dialogs, context menus,
toasts, and destructive confirmations. A key product decision: the **language control is a single
popover** that sets *both* input and output languages with a swap, solving the "two languages"
problem in one place. Searchable lists (model picker, ⌘K palette) use `cmdk` inside a Radix
Popover/Dialog; simple lists use Radix Select.

## 3.2 Shared overlay styling (`.pop`)

All popovers/menus/dialog bodies share the `.pop` surface: fill `--surface`, border `--line`,
`border-radius:12px`, elevated shadow (`0 18px 44px …`), overflow hidden. A header row (`.ph`) is
11px caps, `--ink-3`, with a bottom `--line` divider. List items (`.it`) are 13px, padding `8px 13px`,
hover fill `--surface-2`; the **selected** item (`.it.on`) uses `--teal-50` fill + accent text. Dialog
overlays render a scrim (`rgba(16,32,30,.18)` light / darker in dark) behind a centered `.pop`.

## 3.3 Provider select (`Radix Select`)

- **Trigger:** accent select reading `Provider · <name> ▾`.
- **Open content:** header "Provider"; one item per configured provider, each with a leading
  selected-state dot (● current / ○ others) and an optional right-aligned local/cloud tag
  (e.g. "local"). A divider separates a final accent item **"⚙ Manage providers…"** that navigates to
  *Settings · Providers* (Section 7.1).
- **Interaction:** selecting an item sets the **current** provider (persisted) and closes the menu;
  the toolbar trigger updates to the accent style. (Backed by `SetAsCurrentProviderConfig` /
  `GetAllProviderConfigs` — see `08-api-contracts.md`.)

## 3.4 Model picker — searchable (`cmdk` + `Radix Popover`)

- **Trigger:** select reading `Model · <model id> ▾`, optionally followed by a refresh icon button
  (`⟳`).
- **Open content:** a search header with a magnifier and live filter caret, plus a right-aligned
  refresh (`⟳`) that re-runs model discovery. Below: filtered model rows; the selected row shows a
  checkmark/selected state and an optional size tag (e.g. "4.7GB"); a footer line reads "N of M
  models".
- **Interaction:** typing filters live; choosing a row sets the selected model (persisted via the
  model config); `⟳` triggers discovery and shows a loading state. Empty discovery shows a "no models"
  hint (and, if the provider has custom models enabled, those are offered).

## 3.5 Languages popover (`Radix Popover` + 2× `cmdk`)

- **Trigger:** select reading `Lang · <input> → <output> ▾` (e.g. "EN → UK").
- **Open content:** header "Languages" with a right-aligned **"⇄ Swap"** icon button. Body is a
  two-column grid: left column **Input**, right column **Output**, each with a caps caption, a short
  selected/recent list (the current selection marked ✓ and `.on`), and a "⌕ search N…" affordance that
  filters the full language list (each side is its own `cmdk` instance).
- **Interaction:** selecting in the Input column sets the default input language; selecting in the
  Output column sets the default output language; **Swap** exchanges the two in place. Both persist to
  the language configuration. The trigger label updates to the new pair.

## 3.6 Command palette ⌘K (`cmdk` + `Radix Dialog`)

- **Open content:** a centered dialog over a scrim. Search header with magnifier, live caret, and an
  "esc" badge. Result rows are filtered actions; the active row shows a "↵" badge. A footer hint
  reads "↑↓ navigate · ↵ run · ⇧↵ add to stack".
- **Interaction:** typing filters actions; **↵** runs the highlighted action (arms + runs the
  single-action path); **⇧↵** appends it as a step to the stack builder (entering/continuing build
  mode); **↑/↓** move the selection; **esc** closes. Opened via the toolbar **⌘K** button or the
  keyboard shortcut.

## 3.7 Save-stack dialog (`Radix Dialog`)

- **Open content:** title "⊕ Save custom stack"; a **Name** text input (pre-filled with an
  auto-suggested name); an **Icon** picker (a small row of selectable icon swatches, the chosen one
  outlined in teal with `--teal-50` fill); a summary line (`.est`) reading e.g. "▤ 4 steps ·
  2 inferences · within 5-step cap"; a footer with **Cancel** (default button) and **Save** (primary).
- **Interaction:** Save persists the stack (name must be unique; a duplicate name surfaces inline
  validation). The summary reflects the *resolved* step order and inference count (merge grouping
  applied). Save is disabled if the builder has zero steps.

## 3.8 Stack context menu (`Radix DropdownMenu`)

- **Trigger:** the `⋮` on a saved-stack row (sidebar or Manage card).
- **Open content:** items **▶ Run**, **✎ Edit steps**, **⧉ Duplicate**, and a divider before a danger
  **🗑 Delete** (`--err` text).
- **Interaction:** Run executes the stack; Edit steps loads it into the builder; Duplicate clones it;
  Delete opens a destructive AlertDialog confirm (see 3.10).

## 3.9 Toasts — success / error / progress (`Radix Toast`)

A bottom-stacked region (see Section 2.18 for styling). Examples and behavior:

- Success: "Stack 'Message for Manager' saved" — dark fill, ✓, auto-dismiss + `✕`.
- Error: "Provider unreachable — check Base URL" — `--err` fill.
- Progress: "Step 2 of 2 — Key points…" — `--surface` fill with spinner and a "cancel" affordance that
  cancels the running chain.

**Typed error toasts** (driven by the error taxonomy in this folder's error-handling document) carry a
category glyph and a human-readable, provider-named reason — never a raw stack trace. Provider names in
examples are **provider-agnostic** (e.g. an "Azure-compatible" provider, or a local "Ollama"
provider):

- Auth: "🔒 Request to **Azure OpenAI** failed: authentication rejected — token expired".
- Timeout: "⏱ **Ollama** did not respond within 60s. The request was stopped".
- Rate-limit (warning): "⚠ Rate limited — retrying in 3s…".
- **Inline validation** (not a toast): an inline error block (`--err-bg` fill, `--err` border/text)
  shown next to the offending field, e.g. "Temperature must be between 0 and 2; got 3.5".

## 3.10 Destructive confirm (`Radix AlertDialog`)

- **Open content:** title in danger color (e.g. "⚠ Factory reset?"); an explanatory body describing
  the irreversible effect (e.g. "This wipes all settings, providers, saved stacks and history, then
  re-seeds defaults. This can't be undone."); footer with **Cancel** (default) and a **danger** confirm
  button (e.g. "Reset everything").
- **Used for:** factory reset, delete provider, delete stack, clear history. The dialog traps focus;
  the destructive action is never the default focus target.

## 3.11 Component hierarchy (overlays)

```
Overlays
├─ ProviderSelect (Radix Select → items + "Manage providers…")
├─ ModelPicker (Radix Popover › cmdk: search · rows · refresh · "N of M")
├─ LanguagePopover (Radix Popover › header[Swap] · 2 columns × cmdk)
├─ CommandPalette (Radix Dialog › cmdk: search · rows · footer hints)
├─ SaveStackDialog (Radix Dialog › Name · IconPicker · summary · Cancel/Save)
├─ StackContextMenu (Radix DropdownMenu › Run · Edit · Duplicate · Delete)
├─ ToastRegion (Radix Toast › success | error[typed] | warning | progress)
└─ AlertDialog (Radix AlertDialog › title · body · Cancel/Destructive)
```

## 3.12 Interaction logic (shared)

- Opening any overlay is collision-aware (Radix positioning); closing on outside-click, `esc`, or
  selection where appropriate.
- Single-source-of-truth: provider/model/language selections update the shared settings/state slice so
  the toolbar and Settings stay in sync.

## 3.13 Edge cases

- **No providers configured:** the provider select shows only "⚙ Manage providers…" plus an empty-state
  hint.
- **Model discovery fails/unreachable:** the picker shows an error/empty state and falls back to custom
  models if enabled.
- **Duplicate stack name:** Save-stack dialog blocks with inline validation; the dialog stays open.
- **Toast overflow:** stacked toasts queue; older ones auto-dismiss first.

## 3.14 Accessibility requirements

- Radix provides focus traps (dialogs/alerts), roving focus (menus), `aria-expanded`/`aria-haspopup`
  (triggers), labelled dialogs, and `esc`-to-close.
- The command palette is fully keyboard-driven (↑/↓/↵/⇧↵/esc) with an accessible listbox.
- Toasts are announced via an ARIA live region; errors are assertive, info is polite.

## 3.15 Styling rules

- All overlays use `.pop` and the elevated popover shadow tokens; scrims use the documented rgba
  overlays. Selected items use `--teal-50` + accent text; danger items/buttons use `--err`.

## 3.16 Responsive behavior

- Popovers reposition to stay on-screen. The language popover's two-column grid collapses gracefully
  (columns may stack) on very narrow windows. Dialogs are width-capped (~320–330px) and centered.

---

# 4. Main Screen — Horizontal Layout (+ History Rail)

## 4.1 Screen description (purpose)

The default, primary screen. The **toolbar** carries all run context (provider, model, language,
format, view, layout, and global actions). A **collapsible left sidebar** holds Actions + My Stacks.
**Two equal editor panes** sit side by side (input | output), each with its own per-pane content
buttons. A **run bar** spans the bottom and does exactly one job: run the armed action (or, in build
mode, the stack). The default state shows a single armed action — the 90% path.

## 4.2 Layout specification (regions, grid, sizing)

The window is a vertical stack inside the app chrome:

1. **Native title bar** (~34px): traffic-light dots + window title "GoText".
2. **Toolbar** (~one row, wraps if needed; padding `9px 12px`, bottom border `--line`, fill
   `--surface`): left cluster + spacer + right cluster.
3. **Body grid**: `grid-template-columns: 186px 1fr` — fixed-width sidebar | flexible main area
   (`min-height` ~300px).
4. Main area is a column: an editor grid `1fr 8px 1fr` (input | splitter | output) above a **run bar**.

### Toolbar contents (left → right)

- **Sidebar toggle** `☰` (icon button; `.on` when sidebar expanded; collapses sidebar to an icon
  strip).
- **Logo**: a 23px teal gradient mark "G" + wordmark "GoText".
- Vertical separator (`.vsep`).
- **Provider** select (accent — the current provider).
- **Model** select + **refresh** `⟳` icon button.
- **Language** select (`EN → UK`).
- **Spacer** (pushes the right cluster to the edge).
- **Format** segmented (Plain / MD) with an inline "Format" label.
- **View** segmented (Preview / Source / Diff) with an inline "View" label.
- **Layout** segmented (⊞ / ⊟).
- **⌘K** command-palette icon button.
- **History** `🕘` icon button (toggles the right rail; `.on` when open; disabled if history is off).
- **Info** `ℹ` icon button (opens the About · Info window — Section 9).
- **Settings** `⚙` icon button (opens Settings — Section 7).

> The toolbar is the **only** home for run context and view/render mode (never on the pane). There is
> **no theme toggle here** — theme lives in *Settings · Appearance*.

### Sidebar contents (186px)

- **Search box**: "⌕ search actions & stacks…" — filters both actions and stacks live.
- **My Stacks** section header with a right-aligned accent **"Manage ›"** link (opens the Manage grid,
  Section 6.4). Below it, saved-stack rows (`.stk`): icon + name + a right-aligned step count.
- **Actions** sections grouped by category, each with a section header showing the category name and a
  count (e.g. "Tone · 8"). Action rows (`.act`): the **selected/armed** row (`.act.sel`) uses
  `--teal-50` fill, `--teal-light` border, accent text, and a leading ✓.

### Editor panes

Each pane has a **label row** (`.lbl`, 11px caps) on the left with an optional non-caps metadata suffix
(e.g. "· 1,840 words", "· rendered"), and a right cluster of compact icon buttons:

- **Input pane** buttons: **Paste** `📋`, **Clear** `✕`.
- **Output pane** buttons: **Copy** `⧉`, **Use as input** `↺`, **Clear** `✕`.

The editor body (`.editor`) is a recessed surface (`--surface-2`, border `--line`,
`border-radius:11px`, padding `13px`). The **input** editor uses monospaced text; the **output**
editor uses prose styling in Preview (`.prose`), raw text in Source, and changed-word highlighting in
Diff (Section 6.2). An empty output shows a centered hint "Run to preview →".

### Run bar (`.stackbar`)

Bottom strip (padding `11px 14px`, top border `--line`, fill `--surface`). In the single-action
default it contains: the **armed-action chip** (accent, e.g. "✓ Basic proofreading"), an inference
estimate "· 1 inference", a **"＋ Build a stack"** icon button, and a right-aligned **"▶ Run"** primary
button.

## 4.3 Widget descriptions (per control)

| Control | Type | Function |
|---|---|---|
| Sidebar toggle ☰ | icon button (toggle) | Show/hide sidebar; collapsed → icon strip (`ui.sidebarCollapsed`) |
| Provider select | Radix Select (accent) | Pick current provider; "Manage providers…" → Settings |
| Model select + ⟳ | Radix Select + icon button | Searchable model picker; ⟳ re-runs discovery |
| Language select | Radix Popover | Set input+output language + swap |
| Format seg | ToggleGroup | Output format Plain/Markdown (`inference.useMarkdownForOutput`) |
| View seg | ToggleGroup | Output rendering Preview/Source/Diff (`editor.viewMode`); Diff needs output |
| Layout seg | ToggleGroup | Editor arrangement side/stacked (`ui.layout`); no auto-switch |
| ⌘K | icon button | Open command palette |
| History 🕘 | icon button (toggle) | Toggle history rail (`ui.historyOpen`); disabled if history off |
| Info ℹ | icon button | Open About · Info window |
| Settings ⚙ | icon button | Open Settings window |
| Search box | input | Live filter of actions + stacks |
| Saved-stack row | list row + ⋮ | Click → arm stack into builder; ⋮ → context menu |
| Action row | list row | Click → arm single action (run bar) **or** append step (build mode) |
| Input editor | textarea | Type/edit text; shows word count |
| Paste 📋 / Clear ✕ (input) | icon buttons | Paste clipboard → input; clear input (clear disabled if empty) |
| Output editor | rendered/raw/diff | Show result; empty hint when no output; running spinner |
| Copy ⧉ / Use as input ↺ / Clear ✕ (output) | icon buttons | Copy output; move output→input; clear (all disabled if output empty) |
| Pane splitter | divider | Static visual divider in side layout (non-draggable in v3; panes equal-width) |
| Armed-action chip | chip | Shows armed action + "1 inference" |
| ＋ Build a stack | icon button | Switch run bar to stack builder (build mode) |
| Run ▶ | primary button | Execute the single action (a one-step chain) |

## 4.4 Component hierarchy

```
MainScreen (horizontal)
├─ TitleBar
├─ Toolbar
│  ├─ SidebarToggle
│  ├─ Logo
│  ├─ ProviderSelect · ModelSelect+Refresh · LanguagePopover
│  ├─ Spacer
│  ├─ FormatToggle · ViewToggle · LayoutToggle
│  └─ CommandPaletteBtn · HistoryToggle · InfoBtn · SettingsBtn
├─ BodyGrid [sidebar | main]
│  ├─ Sidebar
│  │  ├─ SearchBox
│  │  ├─ MyStacksHeader ("Manage ›")
│  │  ├─ SavedStackRow* (icon · name · count · ⋮)
│  │  └─ ActionCategory* (header[name·count] · ActionRow*[.sel])
│  └─ MainColumn
│     ├─ EditorGrid [InputPane | Splitter | OutputPane]
│     │  ├─ InputPane (label[words] · Paste · Clear · editor)
│     │  └─ OutputPane (label[state] · Copy · UseAsInput · Clear · editor[prose/source/diff])
│     └─ RunBar (ArmedChip · "·1 inference" · BuildStackBtn · RunBtn)
└─ HistoryRail (optional, right; see 4.7)
```

## 4.5 Interaction logic

- **Arming an action:** clicking an action row in normal mode arms it (sidebar row marked ✓; run bar
  shows the chip + "1 inference"). **Run** executes a one-step chain.
- **Build mode:** clicking "＋ Build a stack" switches the run bar to the builder (Section 6.1); action
  rows now *append steps* (enforcing one-per-family, ≤5 steps, ≤3 inferences, canonical order).
- **Run lifecycle:** `idle → running → done | partial | error | cancelled`. While running, the Run
  button becomes a Cancel control and step-progress appears; intermediate text is never shown — the
  final result renders once. (Backed by the chain-processing call; events/errors per the
  stacks-engine and error-handling documents.)
- **Per-pane buttons:** Paste/Copy use the OS clipboard; "Use as input" copies output → input
  (manual chaining); Clear empties the target. Copy/Use/Clear are disabled when the target is empty.
- **Toolbar selections** persist to the shared settings slice and stay in sync with Settings.

## 4.6 Edge cases

- **Run disabled** when no action is armed or the input is empty.
- **Diff view** is unavailable/empty until an output exists (and needs the input for comparison).
- **History toggle disabled** when history is turned off in Settings.
- **Collapsed sidebar** shows an icon strip; arming still works via the command palette.
- **Long input** shows a word count; the editor scrolls (ScrollArea) rather than growing the window.

## 4.7 History rail (right) — open state

Toggled by the toolbar **🕘**. When open, the body grid becomes `1fr 256px` (main area | rail). The
rail (`border-left:1px solid --line`, fill `--surface-2`) is a column:

- **Header**: "History" (bold) + a "max" badge (e.g. "100 max") + a right-aligned **"Clear"** link
  (opens a confirm AlertDialog → wipe history).
- **List** (scrollable): one **entry card** per run. Card shows: a title/leading glyph (action or stack
  name), a right-aligned status/inference chip ("1 inf" / "2 inf" success badge, or a "partial"/error
  badge using `--del`/`--err`), a one-line "input… → output…" preview, and a meta line "Nm ago ·
  <status> · ↺ restore · 🗑". The **selected** card is outlined in `--teal-light` with `--teal-50`
  fill.
- **Card actions:** **↺ Restore** loads the entry's input → input editor and output → output editor and
  re-arms the action/stack if still valid (drift-warns if an action was removed). **🗑 Delete** removes
  the single entry.
- **Empty state:** "no runs yet" (zero entries) or "history disabled" (when history is off).

Statuses seen on cards: `success` (single or stack), `partial` (e.g. "step 1 failed (429)"), `error`.
The selected entry's restored output is reflected in the output pane (label suffix "· restored").

History data is paginated; backing calls list/get/delete/clear history (see the data-model and UX
documents).

## 4.8 Accessibility requirements

- Toolbar controls are a single focus group in logical order; the sidebar and panes are reachable by
  keyboard; the history rail is a labelled region.
- Icon buttons carry tooltips/`aria-label`s (Paste, Copy, etc.).
- Run/Cancel state changes are announced; running progress is exposed via live region.
- History cards are a list with selectable items; Restore/Delete are reachable per card.

## 4.9 Styling rules

- Toolbar fill `--surface`, bottom border `--line`; segmented controls per Section 2.3; the current
  provider uses the accent select. Sidebar fill `--surface-2`, right border `--line`; selected action
  uses `--teal-50`/accent. Editors use `--surface-2`. Run bar fill `--surface`, top border `--line`;
  Run is the primary button. History selected card uses `--teal-50`/`--teal-light`.

## 4.10 Responsive behavior

- The toolbar wraps (`flex-wrap`) on narrow windows; the sidebar can collapse to an icon strip
  (`☰`). When width is very constrained, prefer the **vertical** layout (Section 5) — but note layout
  does **not** auto-switch; it is user-controlled. The history rail's fixed 256px reduces main width;
  on the narrowest windows the rail may overlay rather than push.

---

# 5. Main Screen — Vertical Layout (Stacked)

## 5.1 Screen description (purpose)

The same primary screen with the Layout toggle flipped to **⊟ Stacked**. Input sits on top, output
below, each full width — better for short messages and single-column reading on a narrow window.
Toggled anytime from the toolbar; identical controls, sidebar, and run bar. Nothing new is built — it
is a CSS grid-direction swap.

## 5.2 Layout specification

- Same title bar + toolbar + body grid (`186px 1fr`).
- The main area is a vertical flex column (padding `13px`, `gap:12px`):
  1. **Input** pane (label with word count + Paste/Clear; editor, shorter `min-height` ~88px).
  2. **Run bar** — now a bordered rounded strip (`border:1px solid --line; border-radius:11px`) sitting
     **between** the two panes (armed chip · "· 1 inference" · "＋ Build a stack" · "▶ Run").
  3. **Output** pane (label with state + Copy/Use/Clear; prose editor).
- The Layout segmented control shows **⊟** selected.

## 5.3 Widget descriptions

Identical controls to Section 4.3; only the arrangement differs. The run bar gains a card-like border
because it is now an inline band rather than a bottom strip.

## 5.4 Component hierarchy

```
MainScreen (vertical)
├─ TitleBar · Toolbar (Layout ⊟ selected)
└─ BodyGrid [Sidebar | MainColumn]
   └─ MainColumn (flex-column)
      ├─ InputPane
      ├─ RunBar (bordered band, between panes)
      └─ OutputPane
```

## 5.5 Interaction logic

- Identical to horizontal (Section 4.5). The run bar between panes keeps the action close to both
  input and output.

## 5.6 Edge cases

- Same as Section 4.6. Stacked mode is preferred for short messages and narrow windows but is never
  forced automatically.

## 5.7 Accessibility requirements

- Focus order follows the visual top-to-bottom flow: Input → Run bar → Output. Otherwise identical to
  Section 4.8.

## 5.8 Styling rules

- Same tokens as Section 4.9. The run bar adds a `--line` border and `11px` radius; editors keep
  `--surface-2`.

## 5.9 Responsive behavior

- The stacked layout is itself the narrow-window-friendly arrangement; panes are full width and the
  window scrolls vertically rather than horizontally.

---

# 6. Stack Builder, Diff View, Running State & Manage Grid

## 6.1 Stack builder (build mode)

### 6.1.1 Screen description

Entered via "＋ Build a stack" (or ⇧↵ in the command palette). The run bar becomes a **builder** that
shows **added inferences only — never estimated seconds**. Same-family steps merge into one inference;
a separate family adds one inference. The sidebar's action rows now append steps and enforce the
engine's rules.

### 6.1.2 Layout specification

- Toolbar is unchanged (run context). The body grid is `186px 1fr`.
- **Sidebar in build mode:** the search box hint becomes "⌕ click to add a step…". Category headers
  show counts and, where a family is single-select, a **"1 max"** hint (e.g. "Tone · 8  1 max").
  Selected steps are `.act.sel` (✓). A second same-family action is **greyed/disabled** with an
  explanatory suffix (e.g. "Friendly — one tone added", opacity ~.45). Actions that add a new inference
  show a right-aligned "+1 inference" hint (e.g. "Translate").
- **Editor area:** input editor populated; output shows the centered "Run to preview →" hint until run.
- **Builder bar** (`.stackbar.build`): a teal-tinted band (gradient from `--teal-50` to `--surface`,
  top border `--teal-light`) containing:
  - A **family group** (`.fam`): a dashed-teal-bordered container with a floating caps title
    "Rewrite · 1 inference"; inside it the merged same-family step chips (accent, removable `✕`)
    joined by "·" separators.
  - An **"→"** arrow then a dashed **"＋ Add step"** chip.
  - A right-aligned live counter (`.est`): "▤ N / 5 steps · **M inference(s)**".
  - Buttons: **✕ Cancel** (discard build), **⊕ Save…** (open Save-stack dialog; disabled at 0 steps),
    **▶ Run** (run the unsaved stack).

### 6.1.3 Widget descriptions

| Control | Function |
|---|---|
| Family group chip cluster | Shows merged same-family steps + "<Family> · 1 inference" |
| Step chip ✕ | Remove that step from the build |
| ＋ Add step (dashed chip) | Affordance/hint to click sidebar actions |
| Live counter | "N / 5 steps · M inferences"; turns invalid (blocked) at cap/exclusivity breach |
| ✕ Cancel | Discard the build, return to single-action run bar |
| ⊕ Save… | Open Save-stack dialog (Section 3.7); disabled with 0 steps |
| ▶ Run | Execute the (unsaved) stack |

### 6.1.4 Interaction logic

- Clicking an action appends it as a step, subject to: **one per exclusivity family**, **≤5 steps**,
  **≤3 inferences**, and **canonical order** (the builder mirrors the backend planner — see the
  stacks-engine document). Same-family steps merge into a single inference group; a new family adds a
  group.
- Adding a disallowed step (second same-family / over cap) is **blocked**; the offending sidebar row
  greys out and the live counter signals the invalid state.
- Save opens the dialog (auto-suggested name, icon, resolved summary). Run executes immediately.

### 6.1.5 Edge cases

- **0 steps:** Save disabled; counter "0 / 5 steps · 0 inferences".
- **Cap reached:** further additions blocked; the counter flags it; the sidebar greys remaining
  exclusive options.
- **Removing all chips** returns the counter to empty but keeps build mode until Cancel.

## 6.2 Diff view (changed words)

### 6.2.1 Screen description

The Output **Diff** mode brings back changed-word highlighting. It compares input → output and marks
**added words in green** and **removed words struck through in red**, with counts and a "Copy clean"
action. Diff is only meaningful once an output exists.

### 6.2.2 Layout specification

- A compact toolbar: "Output" label + a View segmented control with **Diff** selected.
- The diff body (`.editor.prose`, `line-height:1.8`) renders the merged text inline:
  - **Added** spans (`.ins`): `--add` background, `--ok` (green) effective text, small radius.
  - **Removed** spans (`.del`): `--del` background, `--err` (red) text, `text-decoration:line-through`,
    reduced opacity.
  - Unchanged text renders normally between them.
- A footer row: an **"+N added"** OK badge, a **"−N removed"** badge (using `--del` fill + `--err`
  text), and a right-aligned **"⧉ Copy clean"** button (copies the final output without diff markup).

### 6.2.3 Interaction logic

- Switching View to Diff renders the highlight; "Copy clean" copies the resolved output text only.
- Counts reflect word-level added/removed tallies.

### 6.2.4 Edge cases

- **No output:** Diff is disabled/empty (the View toggle's Diff segment is inert until output exists).
- **Identical input/output:** zero counts; no highlight spans.

## 6.3 Running state (no streaming · render once)

### 6.3.1 Screen description

While a stack runs, a progress header shows the inference pipeline; intermediate text is never streamed
or shown. The final result renders once on completion.

### 6.3.2 Layout specification

- A compact toolbar: the running stack chip (e.g. "📨 Message for Manager") + a right-aligned
  "⟳ running" estimate with a spinner.
- A **teal-tinted progress band** (`--teal-50`, bottom border `--line`): the **step-progress** row
  (Section 2.16) — completed groups show a green ✓ node and a green connector; the active group shows a
  teal node with an inline spinner and its family label; family groups append "· 1 inference". Below:
  "Step i of N" and a right-aligned **"■ Cancel"** button.
- The output area shows a centered spinner + "Generating — <current family>" placeholder until done.

### 6.3.3 Interaction logic

- **Cancel** stops after the current group and keeps any partial output (backed by the chain-cancel
  call). Progress events drive the step nodes. On completion the final text replaces the placeholder.
- **Partial/error:** the completed output is shown together with which step failed (typed toast).

### 6.3.4 Edge cases

- **Single-step run:** the progress band may show a single active node; behavior is otherwise identical.
- **Cancelled mid-group:** keeps the last completed group's output as partial.

## 6.4 My Stacks · Manage grid

### 6.4.1 Screen description

The "Manage ›" destination from the sidebar: a self-describing grid of stack cards with run / edit /
duplicate / delete, plus a "build a new stack" tile.

### 6.4.2 Layout specification

- A header toolbar: **"‹ Editor"** back button + "My Stacks" title + a right-aligned **"＋ New stack"**
  primary button.
- Body: a `repeat(3, 1fr)` card grid (gap `14px`). Each **stack card** (bordered, `border-radius:12px`,
  padding `14px`) contains: an icon glyph (~20px), the name (14px/700), a one-line step description
  (e.g. "Proofread · Professional · Concise → Key points"), a badge row ("N steps", "N inferences"
  OK badge), and an action row (**▶ Run** primary · **✎ Edit** · right-aligned **⋮** menu).
- A final **dashed-teal tile** "＋ Build a new stack" starts a new build.

### 6.4.3 Widget descriptions

| Control | Function |
|---|---|
| ＋ New stack | Start a new stack in the builder |
| Stack card | Shows icon/name/steps + step & inference badges |
| Card ▶ Run | Run the stack |
| Card ✎ Edit | Load the stack's steps into the builder |
| Card ⋮ menu | Duplicate / Delete (Delete confirms via AlertDialog) |
| "＋ Build a new stack" tile | Start a new build |

### 6.4.4 Interaction logic

- Run/Edit/Duplicate/Delete map to the stacks engine (process chain / load builder / duplicate /
  delete). Delete always confirms. The grid reflects the saved-stacks list.

### 6.4.5 Edge cases

- **No saved stacks:** the grid shows only the "Build a new stack" tile (empty-state guidance).

## 6.5 Component hierarchy (Section 6 surfaces)

```
StackBuilder (build mode run bar)
├─ Sidebar (action rows: .sel / disabled[+suffix] / "+1 inference")
└─ BuilderBar (FamilyGroup* · AddStepChip · Counter · Cancel · Save · Run)

DiffView (ViewToggle[Diff] · prose[.ins/.del spans] · +N/−N badges · Copy clean)

RunningState (RunningChip+spinner · ProgressBand[StepProgress · "Step i/N" · Cancel] · OutputPlaceholder)

ManageGrid (Header[‹Editor · title · New stack] · StackCard* · NewStackTile)
```

## 6.6 Accessibility requirements

- Builder: greyed/disabled actions expose `aria-disabled` with the reason in their accessible name;
  the counter's invalid state is announced.
- Diff: added/removed are conveyed by text decoration + counts, not color alone; spans carry
  appropriate semantics for assistive tech.
- Running: progress and "Step i of N" announced via live region; Cancel is keyboard-reachable.
- Manage grid: cards are a list/grid of items; each action is individually focusable.

## 6.7 Styling rules

- Builder bar uses the teal-tinted gradient + `--teal-light` top border; family groups use a dashed
  `--teal-light` border; step chips are accent. Diff uses `--add`/`--del` backgrounds with `--ok`/
  `--err` text. Running band uses `--teal-50`; completed nodes/connectors `--ok`, active node `--teal`.
  Cards/tiles per Section 2.17.

## 6.8 Responsive behavior

- The builder bar wraps its chips and controls. The Manage grid drops from 3 columns to 2 or 1 as width
  decreases. Diff text reflows naturally.

---

# 7. Settings — All Seven Section Screens

## 7.0 Settings shell

### Screen description

Settings is a full-window view opened from the toolbar **⚙**. Its shell is a back control **"‹ Editor"**
(closes back to the editor) + a "Settings" title, and a **vertical left navigation** (Radix Tabs,
vertical) listing the seven sections. Selecting a nav item swaps the right panel. The seven sections
are: **Providers · Model · Generation · Languages · Logging · About & data · Appearance**.

### Layout specification

- Header toolbar (padding `9px 14px`): "‹ Editor" icon button + bold "Settings".
- Body grid: `172px 1fr` — vertical nav | section panel. Nav items (`.act`) carry an icon + label; the
  selected item uses `--teal-50` fill, `--teal-light` border, accent text.

### Component hierarchy (shell)

```
Settings
├─ Header (‹ Editor · "Settings")
└─ Body [VerticalNav(RadixTabs) | SectionPanel]
   └─ Nav: Providers · Model · Generation · Languages · Logging · About&data · Appearance
```

---

## 7.1 Providers (master–detail)

### 7.1.1 Screen description

Configure connection providers. A master list (left) selects a provider to edit; a detail form (right)
edits all of its fields. Supports **five provider kinds**, **environment-variable API keys** (secrets
are never stored), custom headers, custom models, and a three-check **verification panel**.

### 7.1.2 Layout specification

- Within the section panel, a nested grid `178px 1fr`:
  - **Master list** (left, right border `--line`): a "Providers" caption; one row per provider with a
    selected-state dot (● current / ○ other); the **current** provider shows a right-aligned "current"
    OK badge and is `.sel`. A **"＋ New provider"** small button sits below.
  - **Detail form** (right, padding `15px 16px`, vertical flow, `gap:12px`).

### 7.1.3 Widget descriptions (detail form, top → bottom)

| Field | Control | Notes |
|---|---|---|
| Title row | name (bold) + "current" badge + kind chip (e.g. purple "Azure") | Identifies the edited provider |
| **Kind** | Radix Select (accent) | One of **5 kinds**: Ollama · LM Studio · Llama.cpp · OpenAI-compatible · Azure-compatible. Drives the profile/visible fields. |
| **Auth** | ToggleGroup | **None / Bearer / Api-Key** — one selected |
| **API key — environment variable** | highlighted info field (`--teal-50` band) | Shows the **name** of the env var holding the key (e.g. `AZURE_OPENAI_API_KEY`). The app reads the key from this variable **at run time and never stores it**. Required when Auth ≠ None; a missing variable raises a "missing credential" error at run. |
| **Base URL** | full text input | Endpoint base (e.g. `https://my-resource.openai.azure.com/`) |
| **Models endpoint** | text input | Override the discovery path (e.g. `openai/deployments?api-version=2024-10-21`) |
| **Completion endpoint** | text input | Override the completion path (e.g. `openai/deployments/{deployment}/chat/completions`) |
| **API version** | text input (optional; Azure-compatible) | e.g. `2024-10-21` |
| **Deployment / selected model** | Select + refresh (`⟳ ▾`) | Pick the deployment/model; refresh re-runs discovery (e.g. `gpt-4o`) |
| **Use custom headers** | Switch + KV editor | When on, a key–value editor (Section 2.15) of header name/value rows (e.g. `OpenAI-Organization` / `org-xxxx`). Persists as a JSON header bag. |
| **Use custom models** | Switch + tag input | When on, a tag input (Section 2.14): type a name + ↵ to add (e.g. `gpt-4o`, `gpt-4o-mini`, `o3-mini`); used when discovery is off or unreachable. |
| **Verify provider** | three buttons + results panel | **🔌 Test connection · 📋 Test models · 💬 Test inference**, with a running indicator and a results table |
| Footer | **Set as current** · **Delete…** (danger ghost) · **Save** (primary) | Persist / repoint current / remove |

### 7.1.4 Verification panel

Three checks, each producing a row in a bordered results table: an OK/✗ badge, a check name
(fixed-width label), a result message, and a timing. Examples:

- **Connection & auth** — "✓ Reachable, key accepted · 128 ms".
- **Model discovery** — "✓ 14 chat models found · 96 ms".
- **Test inference** — "✓ round-trip OK — 'Hello! …' · 842 ms".

A caption clarifies: *Test inference* sends a tiny throw-away completion ("Say hi") to the **selected
model** to confirm the whole path. A failed check shows a **typed reason** (auth · not found ·
timeout) instead of ✓. These checks are diagnostic only (backed by the test-connection/test-models/
test-inference calls in the providers/inference document).

### 7.1.5 Interaction logic

- Selecting a master-list row loads its detail form. **Kind** drives which fields/profile apply (e.g.
  Azure-compatible exposes api-version and deployment-in-path). **Save** validates (name unique; Base
  URL valid; required fields present) and persists (create/update provider). **Set as current** marks
  the provider current. **Delete…** confirms via AlertDialog and repoints the current provider if
  needed. Verification runs the three checks and shows live ✓/✗ + timing.

### 7.1.6 Edge cases

- **Duplicate name:** inline validation blocks Save.
- **Auth ≠ None but env var unset:** allowed to save (it's just a name), but a run raises a typed
  "missing credential" error; the field may warn.
- **Deleting the current provider:** confirm dialog, then current repoints to another provider (or
  none, surfacing an empty-state).
- **Discovery unreachable:** the deployment/model picker shows empty; custom models (if enabled) are
  used.

### 7.1.7 Accessibility

- Master list is a labelled, single-select list; the detail form is a labelled form; the env-var info
  band is described text, not an editable secret. Verification results are announced. Radix Tabs/Select/
  ToggleGroup/Switch supply ARIA + keyboard.

### 7.1.8 Styling rules

- Env-var band: `--teal-50` fill, `--teal-light` border, accent text, mono var name. Current badge:
  OK badge. Kind chip: purple chip for Azure-compatible. Results table: bordered, `--line` dividers,
  OK badges; Delete is danger-ghost; Save is primary.

---

## 7.2 Model

### 7.2.1 Screen description

Per-model generation parameters for the selected model.

### 7.2.2 Layout specification

Section panel (max-width ~460px, vertical `gap:14px`):

- **Model** — a full-width searchable select with refresh (`⟳ ▾`) (e.g. `claude-sonnet-4@20250514`),
  captioned "searchable (+ refresh from provider)".
- **Use temperature** — Switch + right-aligned value (e.g. "0.3") + a Slider below (range 0–2).
- **Use context window** — Switch + value (e.g. "131072") + Slider below.
- **Token-limit parameter** — a RadioGroup: `max_completion_tokens` (selected) vs
  `max_tokens (legacy)`.
- A caption notes capability-awareness: when the provider's catalog exposes it (e.g. Azure-compatible,
  LM Studio), the temperature toggle and context hint **pre-fill from the selected model**.

### 7.2.3 Interaction logic

- Toggling a switch enables its slider; the slider sets the value within range; the radio chooses the
  token parameter. All persist to the model config; refresh re-runs discovery.

### 7.2.4 Edge cases / accessibility / styling

- Disabled sliders (switch off) are greyed. Radio is single-select. Values are clamped to valid
  ranges. Controls map to Radix Switch/Slider/RadioGroup (ARIA + keyboard). Tokens per Sections 2.4–2.8.

---

## 7.3 Generation

### 7.3.1 Screen description

Request-level generation settings shared across runs.

### 7.3.2 Layout specification

Section panel (max-width ~420px, `gap:14px`):

- **Request timeout (seconds)** — label + Stepper (e.g. 600).
- **Max retries (transient only)** — label + Stepper (e.g. 3).
- **Request Markdown output** — Switch. (Same setting as the toolbar Format control.)
- Caption: retries apply to **transient errors only** (timeout, 429, 5xx) — never to auth or
  "not found"; backoff is automatic.

### 7.3.3 Interaction / edge cases / accessibility / styling

- Steppers are bounded; values persist to the inference base config. The Markdown switch mirrors the
  toolbar's Format toggle (single source of truth). Standard Switch/stepper accessibility; tokens per
  Sections 2.4/2.6.

---

## 7.4 Languages

### 7.4.1 Screen description

Manage the available languages and the default input/output choices.

### 7.4.2 Layout specification

Section panel (max-width ~440px):

- An **"⌕ add a language…"** search box + a **"＋ Add"** button (adds a language to the list).
- A list of language rows; each row shows the name plus optional **default badges**: "default input"
  (teal-tinted badge) and "default output" (purple badge). A right-aligned **⋮** row menu offers: set
  as default input · set as default output · remove.
- Caption restates the row-menu options.

### 7.4.3 Interaction logic

- Add appends a language; the ⋮ menu sets defaults (mutually-exclusive per direction) or removes the
  row. Backed by the language add/set-default/remove calls. These defaults feed the toolbar language
  popover (Section 3.5).

### 7.4.4 Edge cases / accessibility / styling

- A language can be both lists' default only if explicitly set per direction; removing a default
  language prompts choosing a new default (or clears it). Row menu is a DropdownMenu (ARIA + keyboard).
  Default-input badge uses teal tokens; default-output badge uses purple tokens.

---

## 7.5 Logging (task logging + diagnostic file logging + rotation + history)

### 7.5.1 Screen description

The expanded logging section combines three independent concerns: **task logging** (per-run prompts/
result), **diagnostic app logging** (rotating file), and **History** (run-history retention).

### 7.5.2 Layout specification

Section panel (max-width ~520px, divided into bordered groups):

- **Task logging** — Switch + caption "saves each run's prompts & result to JSONL".
- **Diagnostic app logging (file)** — Switch; when on, a wrapping row of controls:
  - **Level** select (trace/debug/info/warn/error; e.g. "info").
  - **Max size (MB)** stepper (e.g. 10).
  - **Max backups** stepper (e.g. 5).
  - **Max age (days)** stepper (e.g. 30).
  - **Compress** switch.
- **Log directory (shared by task + app logs)** — a text input (placeholder "(OS default)") + a
  **"📂 Open logs folder"** button; a resolved-path line shows the actual directory and file names
  (e.g. `…/GoTextApp/logs` · `app.log` + `tasks-*.jsonl`) in mono.
- **History** — Switch + caption "stores past runs for the history rail"; when on, a **Max entries**
  stepper (default 100) and a **"Clear history…"** danger button (confirms via AlertDialog).

### 7.5.3 Interaction logic

- Each toggle is independent. Level changes reconfigure the logger live. Rotation parameters configure
  the file logger. "Open logs folder" opens the directory in the OS. History enable/max persists;
  "Clear history…" wipes after confirm. (Backed by the logging/history settings and clear-history
  call.)

### 7.5.4 Edge cases / accessibility / styling

- With diagnostic logging off, its rotation controls are hidden/greyed. With history off, the toolbar
  History toggle is disabled (Section 4.6) and the rail shows "history disabled". Steppers bounded.
  Switches/steppers/select are Radix (ARIA + keyboard). Clear is danger; resolved paths in mono.

---

## 7.6 About & data

### 7.6.1 Screen description

App metadata, data/file locations, and the factory-reset danger zone. (The user-facing *guide* and
Prompt Inspector live in the separate **About · Info** window — Section 9 — not here.)

### 7.6.2 Layout specification

Section panel (max-width ~560px):

- Title row: "GoText" + a version badge (e.g. "v3.0.0") + a tech caption.
- **Data & file locations**: a "Database" path row and a "Logs folder" path row, each with the path in
  mono `<code>` and a **copy** `⧉` icon button.
- **Danger zone**: a description of factory reset + a **"Factory reset…"** danger button.

### 7.6.3 Interaction logic

- Copy buttons copy the path to the clipboard. **Factory reset…** confirms via AlertDialog, then wipes
  all settings/providers/stacks/history and re-seeds defaults (backed by the reset-to-defaults call).
  Version/paths come from the app-settings metadata.

### 7.6.4 Edge cases / accessibility / styling

- Paths are read-only, copyable, and resolved at runtime. Factory reset is irreversible and always
  confirmed. Copy buttons carry tooltips/`aria-label`s. Danger button uses `--err`.

---

## 7.7 Appearance

### 7.7.1 Screen description

Theme selection with a live preview. New in this redesign.

### 7.7.2 Layout specification

Section panel (max-width ~520px):

- **Theme** — a ToggleGroup: **🌓 Auto / ☀ Light / 🌙 Dark** (one selected). Caption: *Auto* follows the
  OS and switches live; *Light*/*Dark* override the OS; applies instantly — no restart.
- **Preview** — two side-by-side mini cards showing a Light sample and a Dark sample, each rendering a
  small surface with "Aa" + an accent word, using the literal light/dark token values.
- Caption: applies instantly and persists (`ui.theme`); the chosen theme is used everywhere.

### 7.7.3 Interaction logic

- Selecting a segment sets `ui.theme` and applies the theme by toggling the root `.dark` class
  (Auto resolves against the live OS preference). No restart; the whole app re-themes via tokens.

### 7.7.4 Edge cases / accessibility / styling

- In **Auto**, an OS theme change updates the app live. The segmented control is single-select (Radix
  ToggleGroup, ARIA + keyboard). Preview swatches are static, non-interactive, illustrative.

## 7.8 Settings — responsive behavior

- The `172px` nav stays fixed; section panels are max-width-capped and left-aligned, so they remain
  readable on wide windows and wrap their control rows (`flex-wrap`) on narrow ones. The Providers
  master/detail nested grid collapses (master above detail) on the narrowest widths.

---

# 8. Radix Primitive Map

## 8.1 Screen description (purpose)

The implementation mapping: which UI element is backed by which Radix Primitive (or `cmdk`), and which
elements remain plain styled markup (**custom CSS**). Radix covers the behavior-heavy,
accessibility-sensitive widgets (focus, keyboard, ARIA, positioning); `cmdk` adds searchable
combobox/command behavior; everything else is presentational CSS over native elements. This is how the
product drops a heavyweight component framework (e.g. MUI) without losing the look — the tokens fully
control appearance.

## 8.2 Mapping table

| UI element | Backed by | You build / style |
|---|---|---|
| Provider / kind / auth pickers | `Radix Select` · `Radix ToggleGroup` | Styling only |
| Model picker & language lists (searchable) | `cmdk` in `Radix Popover` | List items + filter UI |
| Command palette ⌘K | `cmdk` + `Radix Dialog` | Result rows, grouping |
| Save-stack & confirm dialogs | `Radix Dialog` / `Radix AlertDialog` | Form fields |
| Format / View / Layout / Theme / Auth toggles | `Radix ToggleGroup` | Segment styling |
| Switches, sliders, radios, checkboxes | `Radix Switch` · `Slider` · `RadioGroup` · `Checkbox` | Styling only |
| Settings navigation | `Radix Tabs` (vertical) | Styling only |
| Stack context menu (run/edit/duplicate/delete) | `Radix DropdownMenu` | Items |
| Tooltips on icon buttons | `Radix Tooltip` | Styling only |
| Toasts / notifications | `Radix Toast` | Styling only |
| Long lists (sidebar, history, catalog) | `Radix ScrollArea` | Styling only |
| Chips, badges, cards, editors, diff highlight, stack bar, step progress | **custom CSS** | Pure markup + CSS |
| Key–value editor, tag input | **custom CSS** (over native inputs) | Small custom logic |
| Buttons / icon buttons | native `<button>` + CSS | Styling only |

## 8.3 Footprint

Approximately **eleven Radix primitives** + **`cmdk`** for search/palette; everything else is CSS. The
custom set is small and largely static (presentational), which keeps maintenance low. No third-party
component framework's visual layer is involved; the Section 1 tokens fully control the look in both
themes.

## 8.4 Rationale notes

- **Accessibility where it's hard:** focus traps, keyboard nav, ARIA roles, collision-aware positioning
  are owned by Radix — exactly the parts not worth hand-rolling.
- **Unstyled = your design:** Radix ships no visuals, so tokens drive everything; no override-fighting.
- **`cmdk` closes the gap:** Radix has no combobox/command primitive, so `cmdk` (same ecosystem) powers
  model search and the ⌘K palette.
- **Custom set is tiny & static:** chips, cards, the diff highlighter, the stack bar, and step progress
  are presentational with no behavior to maintain.

See `12-ui-implementation.md` for concrete component wiring and state slices.

---

# 9. About · Info Window

## 9.1 Screen description (purpose)

Opened from the toolbar **ℹ** (next to Settings). A plain-language manual of how the app works and what
every setting does, the full catalog of built-in actions and saved stacks, and — central to this
window — a **Prompt Inspector** that shows the **exact prompt(s) sent to the LLM**: system prompt, user
prompt, parameters, and (for stacks) the per-inference composition and flow. It reuses the real
planner/composer, so what is shown is what gets sent (no drift; no LLM call is made to preview).

## 9.2 Layout specification

- Header toolbar: **"‹ Editor"** back button + "About · Info" title + a right-aligned version badge.
- Body grid: `168px 1fr` — a left **vertical nav** (Radix Tabs) with two items: **📖 Guide** and
  **🧩 Actions & Stacks** — and the content area.
- For **Actions & Stacks**, the content is itself a `240px 1fr` grid:
  - **Catalog list** (left, right border `--line`): an "⌕ search actions & stacks…" box; a **My Stacks**
    group (saved-stack rows with an "N inf" tag; the selected one outlined teal); then **action
    categories** (header "name · count") with action rows (selected row `.sel`).
  - **Prompt Inspector** (right): the detail panel for the selected action/stack.

## 9.3 Guide section

A scrollable, plain-language manual: how the app works and what each setting changes; how to add/edit/
remove a provider (keys come from **environment variables**, never stored); the action/stack model
(merge → inferences). Sections are collapsible; dynamic values (paths, version) come from the
app-settings metadata. (Backed by static content + metadata.)

## 9.4 Prompt Inspector (detail panel)

The Prompt Inspector is the **right-hand detail panel** of the About · Info window's **Actions & Stacks**
two-column grid (the `240px 1fr` layout in Section 9.2) — it is **not** a Dialog. For the selected action
or stack, the inspector shows:

- A **title row**: icon + name + a "stack" purple chip (for stacks) + a summary estimate
  ("▤ N steps · **M inferences**") + a right-aligned **"⧉ Copy all"** button.
- A **flow line**: "Runs as **M inferences**: <Family-1 chip> → <Family-2 chip> …" and a note that it
  reflects current settings (e.g. "Markdown · EN→UK · llama3.1:8b · temp 0.5").
- One **inference group cell** per inference, each containing:
  - A header: an "Inference N" OK badge + a family chip (accent/purple) + a note of what it merges or
    that it is terminal (e.g. "merges: Enhanced proofreading · Professional · Concise" /
    "terminal: Key points").
  - **System prompt** (caption + a read-only mono editor block).
  - **User prompt** (caption + a read-only mono editor block) — with the **`{{user_text}}`** placeholder
    highlighted as a marker.
  - **Parameters** (caption + a row of badges, e.g. "model llama3.1:8b", "temperature 0.5",
    "format Markdown", "max_completion_tokens", "stream false").
- Between groups, a centered note: "▼ output of inference 1 becomes input of inference 2".
- A footer row: a **"Use current editor input as a preview"** switch (default **off**) and a note that
  "`{{user_text}}` is replaced by your input at run time".

### 9.4.1 Interaction logic

- Selecting an action/stack in the catalog loads its composed prompts. The inspector is built by the
  **same composer the run uses** (`PreviewPrompt`), so it never drifts. **Copy all** (and per-block
  copy) copies the composed text via `ClipboardSetText`. The "Use current input" toggle substitutes the editor's current input
  for `{{user_text}}` in the preview (other placeholders resolve from current settings). **No LLM call**
  is made.

### 9.4.2 Edge cases

- **Single action:** the inspector shows a single inference group (no "→" flow line beyond the family).
- **Empty catalog / no stacks:** the My Stacks group is empty; built-in actions still list.
- **"Use current input" with empty editor:** the placeholder marker remains visible.

## 9.5 Component hierarchy

```
AboutInfo
├─ Header (‹ Editor · "About · Info" · version badge)
└─ Body [Nav(RadixTabs: Guide | Actions&Stacks) | Content]
   ├─ Guide (collapsible sections · dynamic paths/version)
   └─ Actions&Stacks [Catalog | PromptInspector]
      ├─ Catalog (Search · MyStacks rows · ActionCategory*)
      └─ PromptInspector
         ├─ TitleRow (name · stack chip · summary · Copy all)
         ├─ FlowLine
         ├─ InferenceGroup* (header · System · User[{{user_text}}] · Params)
         └─ Footer (UseCurrentInput switch · placeholder note)
```

## 9.6 Accessibility requirements

- Nav is Radix Tabs (ARIA + keyboard). The catalog is a labelled, searchable list. Prompt blocks are
  read-only regions with accessible copy buttons. The "Use current input" switch is labelled. Collapsible
  guide sections expose expanded/collapsed state.

## 9.7 Styling rules

- Inference group cells use `.cell` (surface, `--line`, radius 14, shadow). Family chips: accent
  (Rewrite) / purple (Summarize). "Inference N" uses the OK badge. Prompt blocks use the recessed
  editor surface with mono text; `{{user_text}}` highlighted with the `--add` marker style. Parameters
  are badges.

## 9.8 Responsive behavior

- On narrow windows the catalog/inspector two-column grid collapses (catalog above inspector); the
  inspector's parameter badges and flow chips wrap.

---

# 10. Cross-Cutting Rules (apply to all surfaces)

## 10.1 Global window chrome & state

- **Native title bar:** move/min/max/close (Wails window).
- **App theme:** the root `.dark` class is set from `ui.theme` (Section 1.7).
- **Global error boundary:** catches render/panic, reports via the bound `LogError`
  (`08-api-contracts.md`), and offers a "Reload" fallback.
- **Toast region:** shows transient messages by severity (Section 3.9).
- All long-running operations show a spinner/progress; all errors are **typed** (never a raw stack
  trace) per the error-handling document; all bound backend calls return a result envelope consumed
  uniformly.

## 10.2 Disabled / enabled logic

- **Run** disabled when no action is armed or input is empty.
- **Save** (stack) disabled with 0 steps.
- **Copy / Clear / Use-as-input** disabled when the target is empty.
- **History toggle** disabled when history is off.
- **Diff** view inert until an output exists.
- Destructive actions (factory reset, delete provider/stack, clear history) **always** confirm via a
  Radix AlertDialog, and the destructive button is never the default focus.

## 10.3 Accessibility (global)

- **Keyboard:** ⌘K (Ctrl+K) opens the palette (↵ run · ⇧↵ add to stack · ↑↓ navigate · esc close) and is
  the **only application-global shortcut** in v3; standard focus order throughout. Radix supplies ARIA
  roles, focus traps (dialogs/alerts), roving focus (menus/toggles), and `esc` handling.
- **Color independence:** state is conveyed by glyph/text/counts in addition to color (status badges,
  diff decoration, success/error toasts), so the UI is usable in high-contrast/forced-colors modes and
  by color-blind users.
- **Names for icon-only controls:** every icon button has an accessible name (tooltip text = label).
- **Announcements:** async progress and errors use ARIA live regions (assertive for errors, polite for
  info); selection changes in lists/nav are announced.
- **Contrast:** primary/secondary text and accent-on-fill combinations meet WCAG AA in both themes
  (Section 1.9).

## 10.4 Single source of truth

- Provider / model / language / format / layout / theme all reflect **one** settings/state slice, so the
  toolbar and Settings always stay in sync. The Generation "Request Markdown output" switch is the same
  setting as the toolbar Format toggle.

## 10.5 Empty states (global)

- No providers / no models / no stacks / no history each show a guiding hint plus a primary action
  (e.g. "Manage providers…", "Build a new stack", "no runs yet / history disabled").

## 10.6 Responsive behavior (global)

- Toolbars and control rows wrap (`flex-wrap`) under width pressure; the sidebar can collapse to an
  icon strip; the history rail reduces main width (or overlays at the narrowest widths); multi-column
  grids (Manage, Inspector, language popover, Providers master/detail) collapse to fewer columns or
  stack. Layout (side vs stacked) is **user-controlled and never auto-switched**. Token values are
  viewport-independent; only arrangement reflows.

## 10.7 Confirmed v3 UI rules (no open items)

- The **pane splitter** is a **static, non-draggable visual divider** in v3; the Input and Output panes
  are equal-width (editor grid `1fr 8px 1fr`). There is no resize handle.
- The **Prompt Inspector** is the **right-hand detail panel** of the About · Info window's
  Actions & Stacks grid (Section 9.4) — never a Dialog. Its "Use current input" preview toggle defaults
  **off**.
- **⌘K** (Ctrl+K) is the **only application-global keyboard shortcut** in v3 (it opens the command
  palette; inside it, ↵ run · ⇧↵ add to stack · ↑↓ navigate · esc close). All other keyboard behavior is
  the standard per-widget interaction provided by the backing Radix primitive. See
  `10-ui-ux-specification.md` (§C, Keyboard shortcuts).

---

*End of 11 — Mockup Documentation. This document is self-contained: it fully specifies the GoText UI —
tokens, widgets, overlays, the main horizontal/vertical screens, the history rail, the stack builder,
diff and running states, the Manage grid, all seven Settings sections, the Radix map, and the About ·
Info window — so the interface can be implemented without the original graphical mockup. For UX
rationale see `10-ui-ux-specification.md`; for component/state implementation see
`12-ui-implementation.md`.*
