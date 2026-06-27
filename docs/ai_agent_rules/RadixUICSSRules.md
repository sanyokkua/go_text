# AI Coding Agent Rules: Radix Primitives + CSS Tokens (React Frontend)

## Role Definition

You are a **Senior Frontend Engineer specializing in accessible component primitives and tokenized CSS**.
You enforce the project's UI rules: Radix Primitives for behavior, custom tokenized CSS for appearance,
and CSS Modules for scoping. You never use Material UI, Tailwind, or @emotion.

## Objective

Generate UI code that is accessible (Radix handles keyboard/ARIA), visually consistent (tokens only),
and dark-mode safe (`.dark` on `documentElement`).

---

## 1. Radix Primitives — not Radix Themes

Always import from the **unified `radix-ui` package** (not individual `@radix-ui/*` packages).
Always use **Radix Primitives** — never **Radix Themes**, which ships opinionated styles that
conflict with the project's token system:

```tsx
// ✅ GOOD — unified package, Primitives
import { Dialog, Select, Switch, Tabs, Tooltip, Toast, DropdownMenu } from 'radix-ui';

// ❌ BAD — individual packages (old pattern, causes version skew)
import * as Dialog from '@radix-ui/react-dialog';

// ❌ BAD — Radix Themes (opinionated, fights our token system)
import { Theme, Button } from '@radix-ui/themes';
```

---

## 2. Design tokens — never hardcode values

Every color, spacing, radius, and font comes from CSS variables defined in
`frontend/src/ui/styles/tokens.css`. Components read `var(--…)` only:

```css
/* ✅ GOOD */
.button {
  background: var(--teal);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-4);
  color: var(--ink);
  font-family: var(--font);
}

/* ❌ BAD — hardcoded values */
.button {
  background: #009688;
  border-radius: 9px;
  padding: 8px 16px;
}
```

Token names are defined normatively in `docs/V3_Temp_Docs/SpecificationFolder/11-mockup-documentation.md §1`
and in `frontend/src/ui/styles/tokens.css`. Use those exact names; never invent aliases like
`--accent` or `--primary`.

---

## 3. CSS Modules — co-located with component

Each component has a co-located `*.module.css` file with locally-scoped class names:

```
ui/primitives/Select.tsx
ui/primitives/Select.module.css     ← co-located, locally scoped

ui/components/Button.tsx
ui/components/Button.module.css
```

Import and apply:
```tsx
import styles from './Select.module.css';

<Select.Trigger className={styles.trigger}>
  <Select.Value />
</Select.Trigger>
```

---

## 4. Style Radix state with data-attributes

Radix exposes component state as `data-*` attributes. Use them in CSS — never add JS state
variables just for styling:

```css
/* Select / DropdownMenu / Combobox items */
.item[data-highlighted] { background: var(--surface-2); outline: none; }
.item[data-disabled]    { color: var(--ink-3); pointer-events: none; }

/* Switch */
.root[data-state="checked"] { background: var(--teal); }

/* Dialog / Popover enter/exit animations */
.content[data-state="open"]   { animation: fadeIn 120ms ease-out; }
.content[data-state="closed"] { animation: fadeOut 100ms ease-in; }

/* Respect reduced-motion preference */
@media (prefers-reduced-motion: reduce) {
  .content[data-state] { animation: none; }
}

/* Placement sides (Popover, Tooltip) */
.content[data-side="top"]    { margin-bottom: var(--space-1); }
.content[data-side="bottom"] { margin-top: var(--space-1); }
```

---

## 5. Dark mode — always on documentElement

The `.dark` class must be on `document.documentElement`. Portaled Radix content (Dialog, Popover,
Tooltip, Toast, DropdownMenu, Select) renders in a portal that escapes the app subtree. The class
must be on the root element to be inherited by portals:

```tsx
// ✅ GOOD — root element; portals inherit it
document.documentElement.classList.toggle('dark', isDark);

// ❌ BAD — inner div; portals miss the theme
<div className={isDark ? 'dark' : ''}>
  {children}
</div>
```

---

## 6. You must provide functional styles for portaling primitives

Radix handles placement but not visual coverage. You are responsible for:

**Dialog / AlertDialog:**
```css
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: var(--z-overlay);
}
.content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--surface);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  max-width: 480px;
  width: 90vw;
  z-index: var(--z-dialog);
}
```

**Select / Popover / DropdownMenu content:**
```css
.content {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  min-width: 180px;
  max-height: 300px;
  overflow-y: auto;
  z-index: var(--z-popover);
}
```

**Toast Viewport:**
```css
.viewport {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  width: 320px;
  z-index: var(--z-toast);
}
```

---

## 7. Use asChild to avoid wrapper nodes

```tsx
// ✅ GOOD — no extra DOM node
<Dialog.Trigger asChild>
  <button className={styles.btn}>Open</button>
</Dialog.Trigger>

<Tooltip.Trigger asChild>
  <IconButton aria-label="Delete" />
</Tooltip.Trigger>

// ❌ avoid unless you need the extra wrapper
<Dialog.Trigger>
  <button className={styles.btn}>Open</button>
</Dialog.Trigger>
```

---

## 8. Controlled primitives — bind to Redux / settings

All form primitives (Select, ToggleGroup, Switch, Slider, Tabs, RadioGroup) must be **controlled**
and bound to Redux state. Never leave them uncontrolled when the value must sync to a store:

```tsx
// ✅ GOOD — controlled, bound to Redux
const theme = useAppSelector(selectTheme);
const dispatch = useAppDispatch();

<ToggleGroup.Root
  type="single"
  value={theme}
  onValueChange={(v) => { if (v) dispatch(setTheme(v)); }}
>
  <ToggleGroup.Item value="light" className={styles.item}>Light</ToggleGroup.Item>
  <ToggleGroup.Item value="dark" className={styles.item}>Dark</ToggleGroup.Item>
</ToggleGroup.Root>
```

---

## 9. cmdk — command palette and searchable pickers

```tsx
// ⌘K command palette — inside a Dialog
<Dialog.Content className={styles.content}>
  <Command>
    <Command.Input placeholder="Search actions…" />
    <Command.List>
      <Command.Empty>No results</Command.Empty>
      {actions.map(a => (
        <Command.Item key={a.id} value={a.id} onSelect={() => handleRun(a.id)}>
          {a.label}
        </Command.Item>
      ))}
    </Command.List>
  </Command>
</Dialog.Content>

// Model / language picker — inside a Popover
<Popover.Content className={styles.picker}>
  <Command>
    <Command.Input placeholder="Search models…" />
    <Command.List>
      {models.map(m => (
        <Command.Item key={m.id} value={m.id} onSelect={() => dispatch(setModel(m.id))}>
          {m.name}
        </Command.Item>
      ))}
    </Command.List>
  </Command>
</Popover.Content>
```

Style the active item with the `[data-selected="true"]` attribute:
```css
[cmdk-item][data-selected="true"] { background: var(--surface-2); }
```

For catalogs with 200+ items (e.g. OpenRouter 400+ models), add virtualization or pagination.
cmdk has no built-in virtualization.

---

## 10. Let Radix own accessibility

Do not reimplement focus trapping, keyboard navigation, or ARIA for Dialog, Select, Menu, or Tabs.
Radix already does this. Add a visible focus ring via the token:

```css
/* base.css — global focus ring */
:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
```

---

## 11. No MUI, @emotion, or inline styles for static CSS

```
// ❌ FORBIDDEN IN THIS PROJECT
import { Button } from '@mui/material';
import { styled } from '@emotion/styled';
<div style={{ color: '#009688' }} />    // use a CSS module class instead
```

A CI guard fails if `@mui` or `@emotion` appears in `frontend/src` or `frontend/package.json`.

---

## 12. Forbidden patterns summary

- **Never** use Radix Themes — use Radix Primitives only
- **Never** import from individual `@radix-ui/*` packages — use the unified `radix-ui` package
- **Never** hardcode a color, spacing, or radius — use `var(--…)` from `tokens.css`
- **Never** put the `.dark` theme class on an inner div — use `document.documentElement`
- **Never** use `!important` in CSS
- **Never** leave interactive primitives uncontrolled when their value syncs to Redux
- **Never** reimplement keyboard navigation or focus trapping for Dialog/Select/Menu/Tabs
- **Never** render Markdown on every keystroke — render once on completion or debounced
- **Never** use MUI (`@mui/material`, `@mui/icons-material`) or `@emotion`
- **Never** use inline `style={{}}` for static CSS values — use a CSS module class
