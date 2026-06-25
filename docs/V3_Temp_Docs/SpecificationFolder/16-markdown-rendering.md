# GoText v3 — Markdown Rendering Specification

This document defines how rendered output is produced in the frontend: the library stack, the single
shared `MarkdownView` component, theming consistency, security, performance, and the per-view behavior.
It applies wherever the app renders model output or guidance text. It complements
`10-ui-ux-specification.md` (view modes), `12-ui-implementation.md` (component structure), and
`13-testing-specification.md` (tests).

## 1. Where rendering is used
| Location | Renderer | Notes |
|---|---|---|
| **Output pane — Preview view** | `MarkdownView` | The primary case: renders the run result when output format is Markdown. |
| **Output pane — Source view** | raw text (no Markdown) | The exact text in a monospace, read-only block; preserves whitespace/newlines. |
| **Output pane — Diff view** | word-level diff (no Markdown) | Plain-text changed-word highlighting (added/removed), not Markdown rendering. |
| **About · Info — Guide** | `MarkdownView` | The bundled guide content is Markdown; rendered with the same component for visual consistency. |
| **Prompt Inspector** | raw text (no Markdown) | Composed system/user prompts shown verbatim in monospace; never rendered. |

**Single source of truth:** one `MarkdownView` component is used by every Markdown surface so rendering,
theming, and security are identical everywhere. No surface re-implements rendering.

## 2. Library stack (required)
- **`react-markdown`** — the renderer (component-based; does **not** parse to raw HTML).
- **`remark-gfm`** — GitHub-Flavored Markdown: tables, task lists, strikethrough, autolinks, footnotes.
- **`rehype-highlight`** + **`highlight.js`** — syntax highlighting for fenced code blocks.
- **`remark-math`** + **`rehype-katex`** — inline/block math (`$…$`, `$$…$$`). *Supported; enabled by
  default.*
- **`mermaid`** — diagram rendering for ```` ```mermaid ```` fenced blocks via a dedicated async block
  component. *Supported; enabled by default.*

These are added in `frontend/package.json` (see `12-ui-implementation.md` §dependencies). All are
framework-agnostic React/remark/rehype packages and work under Vite + React 19.

## 3. The `MarkdownView` component
A controlled, memoized wrapper around `react-markdown` configured once and reused.

```tsx
// frontend/src/ui/components/MarkdownView.tsx  (shape — illustrative)
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { MermaidBlock } from './MermaidBlock';
import { openExternal } from '../../logic/adapter'; // wraps the Wails BrowserOpenURL runtime call

const components: Components = {
  // fenced code: route ```mermaid to the diagram block; everything else is highlighted by rehype-highlight
  code({ className, children, ...rest }) {
    const lang = /language-(\w+)/.exec(className ?? '')?.[1];
    if (lang === 'mermaid') return <MermaidBlock src={String(children).trim()} />;
    return <code className={className} {...rest}>{children}</code>;
  },
  // links never navigate the app window: open in the OS browser, hardened rel
  a({ href, children, ...rest }) {
    const safe = href && /^(https?:|mailto:)/i.test(href) ? href : undefined;
    return (
      <a {...rest} href={safe} rel="noopener noreferrer"
         onClick={(e) => { e.preventDefault(); if (safe) openExternal(safe); }}>
        {children}
      </a>
    );
  },
};

export const MarkdownView = React.memo(function MarkdownView({ source }: { source: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});
```

Rules:
- The wrapper element always carries the class **`markdown-body`** so the stylesheet (§4) targets it.
- Memoize on `source` so re-renders only occur when the text changes (output is set once per run).
- **No `rehype-raw`** and no `dangerouslySetInnerHTML` in the Markdown path (see §5).

### 3.1 `MermaidBlock`
Renders a `mermaid` fenced block to SVG asynchronously, with loading and error states.
```tsx
// renders src → svg via mermaid; shows "Rendering diagram…" then the SVG, or an inline error.
// 1) initialize mermaid with startOnLoad:false and securityLevel:'strict';
// 2) derive the mermaid theme from the effective app theme (see §4);
// 3) render(uniqueId, src) → set SVG; on failure show the error text (do not crash the view).
```
Each block uses a unique id (e.g. from `useId`) and cancels stale renders on unmount/`src` change. The
SVG returned by mermaid is the only place HTML is injected, and only because mermaid sanitizes its own
output under `securityLevel:'strict'`.

## 4. Theming consistency (must match the app theme exactly)
The Markdown output uses the **same design tokens** as the rest of the app, so light/dark is automatic.
Every token named below is defined in the normative token table in `11-mockup-documentation.md` §1.
- A `markdown-body` stylesheet styles every element — headings, paragraphs, lists, blockquotes, tables,
  inline code, code blocks, links, horizontal rules — using **only `var(--…)` tokens** (no hardcoded
  colors). Example bindings: text → `--ink`; muted → `--ink-2`/`--ink-3`; links → `--teal-dark`
  (`--teal-light` in dark via the token); code background → `--surface-2`; borders → `--line`; blockquote
  accent border → `--teal`; table header background → `--surface-2`. Font: body `--font`, code `--mono`.
- **Code highlighting** ships a light and a dark `highlight.js` theme; the dark theme is scoped under the
  root `.dark` class so it switches with the app theme. The highlight palette is mapped to the design
  tokens where practical, otherwise to a token-compatible theme; code background uses `--surface-2`.
- **Mermaid** theme is derived from the effective app theme: when `document.documentElement` has the
  `.dark` class use mermaid theme `dark`, otherwise `default`. Re-render diagrams on theme change.
- **KaTeX** inherits text color from `--ink`; its stylesheet is included once globally.
- Because the theme class lives on `document.documentElement` (see `12-ui-implementation.md`), Markdown
  rendered inside dialogs/portals (e.g. the Guide) inherits the correct theme automatically.

The result: a rendered document in Preview is visually consistent with the surrounding UI in both themes,
with no separate "markdown skin".

## 5. Security (rendering untrusted model output)
Model output and user input are **untrusted**. The rendering path must not allow script/HTML injection.
- **Raw HTML is not rendered.** `react-markdown` escapes embedded HTML by default and `rehype-raw` is
  **not** used. Any `<script>`, `<img onerror=…>`, etc. in the text is shown as text, not executed.
- **Links are sanitized and externalized.** Only `http:`, `https:`, and `mailto:` URLs are allowed; all
  others are rendered inert. Clicking a link opens it in the OS browser via the bound **`BrowserOpenURL`**
  (open-external) method (`08-api-contracts.md`) — never navigates the app webview — with
  `rel="noopener noreferrer"`. The frontend `openExternal` adapter is the thin wrapper over `BrowserOpenURL`.
- **Mermaid** runs with `securityLevel:'strict'` (no click bindings, HTML sanitized by mermaid).
- **KaTeX** runs with `throwOnError:false` and trust disabled (no `\href`/raw injection).
- No `eval`, no string-to-DOM beyond the controlled mermaid SVG path.

## 6. Plain vs Markdown output
The output format is the user-selected `format` (Plain or Markdown; see `02-functional-requirements.md`).
- **Markdown format** → Preview renders via `MarkdownView`.
- **Plain format** → Preview shows the text in a whitespace-preserving block (`white-space: pre-wrap`),
  **without** Markdown parsing, so Markdown punctuation is shown literally.
- **Source** always shows the raw text regardless of format. **Diff** always operates on plain text.

## 7. Performance
- Output is **non-streaming**: it is set once when a run completes, so the Markdown tree renders once.
  Do not parse Markdown on every keystroke (the input editor is plain text; only the output is rendered).
- `MarkdownView` is memoized on `source`; switching view modes (Preview/Source/Diff) must not re-parse
  unless the text changed.
- Mermaid renders asynchronously and shows a loading state; a failed diagram shows an inline error and
  never blocks the rest of the document.
- For very large outputs, rendering remains a single pass; no virtualization is required at expected
  sizes, but the renderer must not freeze the UI (mermaid/highlight run after paint).

## 8. Copy behavior
- **Copy** (output pane) copies the **raw Markdown source**, not the rendered HTML.
- **Diff → Copy clean** copies the final plain result (no diff markup).
- "Use as input" moves the raw source into the input editor.

## 9. Examples (must render correctly)
The renderer must correctly handle at least:
- **Headings** `#`–`######`, **paragraphs**, **bold/italic/strikethrough**, **blockquotes**, **HR**.
- **Lists**: unordered, ordered, and GFM **task lists** (`- [ ]` / `- [x]`).
- **Tables** (GFM) with alignment.
- **Inline code** and **fenced code blocks** with a language → syntax-highlighted.
- **Links** (autolinked and explicit) → open externally; **images** → rendered (or shown as a safe link
  if the source is non-embeddable).
- **Math**: inline `$E=mc^2$` and block `$$…$$`.
- **Mermaid**: a ```` ```mermaid ```` block → an SVG diagram themed to match.
- **Escaped/raw HTML** in the text → displayed literally, never executed.

## 10. Implementation notes
- New files: `frontend/src/ui/components/MarkdownView.tsx`, `MermaidBlock.tsx`, a
  `frontend/src/ui/styles/markdown.css` (the `markdown-body` token-based stylesheet), and the
  highlight.js + KaTeX theme imports. Wire `MarkdownView` into the Output Preview (in the editor view)
  and the About Guide.
- The link-externalizing adapter (`openExternal`) is the frontend wrapper over the bound `BrowserOpenURL`
  (open-external) method defined in `08-api-contracts.md` (which itself wraps `runtime.BrowserOpenURL`).
- Initialize mermaid once (module load) with `startOnLoad:false`, `securityLevel:'strict'`, and the
  theme resolver; re-initialize/re-render on app theme change.

## 11. Acceptance criteria
- Preview renders GFM (tables, task lists, strikethrough), highlighted code, math, and mermaid diagrams,
  styled entirely with design tokens and visually consistent in light and dark themes.
- Raw HTML and disallowed URL schemes are inert; links open in the OS browser, not the app window.
- Source shows raw text; Diff shows plain-text word diff; Plain format shows literal text; Markdown format
  renders. Copy returns the raw source.
- Switching view modes does not re-parse unchanged output; a failed mermaid diagram does not break the page.
- The same `MarkdownView` is used by the Output Preview and the About Guide.

## 12. Testing (see `13-testing-specification.md`)
- **Unit (RTL):** `MarkdownView` renders each example in §9; a `<script>` in the source is not executed;
  a disallowed-scheme link is inert; an external link click invokes the external-open adapter; mermaid
  block shows loading→SVG (mermaid mocked) and an error state on invalid input.
- **Theme:** snapshot Preview in light and dark (toggle the root class) and assert token-driven colors;
  mermaid theme follows the app theme.
- **UI verification (headless Chromium / Playwright):** on the editor page, run an action that yields
  Markdown, switch to Preview, and assert the rendered structure (a table, a highlighted code block, a
  mermaid SVG) is present, with no console errors and no horizontal overflow, in both themes.
