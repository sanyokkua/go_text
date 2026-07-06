---
name: wails-dev
description: >
  Reference for Wails v2 Go desktop application development. Load when working with:
  Wails, wails.json, wails dev, wails build, wails generate module, options.App,
  OnStartup, OnDomReady, OnShutdown, OnBeforeClose, AssetServer, embed.FS,
  Bind, EnumBind, wailsjs/, wailsjs/go/, runtime.EventsEmit, runtime.EventsOn,
  EventsOn, EventsEmit, WindowSetTitle, WindowMaximise, ClipboardGetText,
  BrowserOpenURL, menu.NewMenuFromItems, SingleInstanceLock, DragAndDrop,
  Go desktop app, Go + React desktop, Go frontend binding. Covers lifecycle hooks,
  method binding, Go + TypeScript runtime APIs, event system, menus, platform
  options, asset embedding, testing, and debugging.
---

# Wails v2 Developer Reference

Wails v2 is a framework for building desktop applications using Go for the backend and any web technology (React, Vue, Svelte, etc.) for the frontend. The Go backend is compiled into a native binary; the frontend runs in an embedded WebView. Wails generates a JavaScript/TypeScript binding layer (`wailsjs/`) so the frontend can call Go methods directly as async functions. Communication flows via the Wails runtime — not a WebSocket or HTTP server — making it opaque to the web developer but efficient at runtime.

## Quick-Start Wiring

```go
//go:embed all:frontend/dist
var assets embed.FS

type App struct{ ctx context.Context }

func (a *App) startup(ctx context.Context) { a.ctx = ctx }  // STORE CTX HERE

func main() {
    app := &App{}
    wails.Run(&options.App{
        Title:  "My App",
        Width:  1024,
        Height: 768,
        AssetServer: &assetserver.Options{Assets: assets},
        OnStartup:  app.startup,
        OnDomReady: func(ctx context.Context) { /* DOM ready, safe for UI ops */ },
        OnShutdown: func(ctx context.Context) { /* cleanup */ },
        OnBeforeClose: func(ctx context.Context) bool {
            return false  // return TRUE to CANCEL the close
        },
        Bind: []interface{}{app},
    })
}
```

## The Golden Rule

**`ctx` from `OnStartup` is the only valid context for ALL `runtime.*` calls.**

Store it immediately in the struct. Never call runtime functions before `OnStartup` fires or with a context obtained any other way. Passing `nil` or a plain `context.Background()` will cause a fatal log and crash.

```go
type App struct{ ctx context.Context }
func (a *App) startup(ctx context.Context) { a.ctx = ctx }
```

## Quick-Reference

| Operation | Go | TypeScript |
|---|---|---|
| Emit event to frontend | `runtime.EventsEmit(a.ctx, "name", data)` | — |
| Listen for event in Go | `runtime.EventsOn(ctx, "name", func(data ...any){})` | — |
| Emit event to Go | — | `EventsEmit("name", data)` |
| Listen for event in TS | — | `EventsOn("name", (data) => {})` |
| Open file dialog | `runtime.OpenFileDialog(a.ctx, opts)` | — |
| Show message dialog | `runtime.MessageDialog(a.ctx, opts)` | — |
| Set window title | `runtime.WindowSetTitle(a.ctx, "title")` | `WindowSetTitle("title")` |
| Maximize window | `runtime.WindowMaximise(a.ctx)` | `WindowMaximise()` |
| Minimize window | `runtime.WindowMinimise(a.ctx)` | `WindowMinimise()` |
| Quit app | `runtime.Quit(a.ctx)` | `Quit()` |
| Open URL in browser | `runtime.BrowserOpenURL(a.ctx, url)` | `BrowserOpenURL(url)` |
| Get clipboard | `runtime.ClipboardGetText(a.ctx)` | `ClipboardGetText()` |
| Set clipboard | `runtime.ClipboardSetText(a.ctx, text)` | `ClipboardSetText(text)` |

## Reference Index

| Topic | Reference File |
|---|---|
| App options & lifecycle hooks | `references/01-app-setup.md` |
| Go method binding rules | `references/02-binding.md` |
| Go runtime API (complete) | `references/03-go-runtime-api.md` |
| Frontend TypeScript API | `references/04-frontend-ts-api.md` |
| Event system patterns | `references/05-event-system.md` |
| Menu system | `references/06-menu-system.md` |
| Platform options (Mac/Win/Linux) | `references/07-platform-options.md` |
| Asset server & embedding | `references/08-asset-server.md` |
| Single instance, drag/drop, context menus | `references/09-advanced-features.md` |
| Testing patterns | `references/10-testing.md` |
| Debugging & tooling | `references/11-debugging.md` |
| Common patterns & best practices | `references/12-patterns.md` |

---

## GoText Application Notes

These constraints and patterns apply specifically to the **GoText** codebase on top of standard
Wails v2 rules.

### No `context.Context` parameter in bound methods

GoText handler methods take **no `ctx` parameter**. The `ctx` stored in `OnStartup` is held by the
`ApplicationContextHolder` and passed to services internally:

```go
// ✅ GoText pattern — no ctx param
func (h *ActionHandler) ProcessPromptChain(req actions.ChainRequest) (res apperr.ChainResultEnv) {
    data, err := h.service.RunChain(h.ctx, req)  // ctx comes from the handler struct
    ...
}

// ❌ Wrong for GoText — ctx shows up in the TS binding and confuses the frontend
func (h *ActionHandler) ProcessPromptChain(ctx context.Context, req actions.ChainRequest) (res apperr.ChainResultEnv) {
```

### Result envelope return pattern

**Never** return `(T, error)` from a bound method. Instead, return a concrete `apperr.*Result`
envelope. The JS Promise always resolves; the frontend checks `res.error` to detect failures:

```go
// ✅ GoText — envelope; JS always resolves
func (h *XxxHandler) DoThing(req Request) (res apperr.XxxResult) {
    defer func() {
        if r := recover(); r != nil {
            ae := apperr.Internal(fmt.Errorf("panic: %v", r))
            wire := apperr.ToWire(h.zlog, ae)
            res = apperr.XxxResult{Error: &wire}
        }
    }()
    data, err := h.service.DoThing(h.ctx, req)
    if err != nil {
        wire := apperr.ToWire(h.zlog, err)
        return apperr.XxxResult{Error: &wire}
    }
    return apperr.XxxResult{Data: data}
}
```

See `references/02-binding.md §GoText: Result Envelope Pattern` for full details.

### EnumBind for ErrorCode

GoText exposes `apperr.ErrorCode` as a real TypeScript enum in `models.ts` via `EnumBind`:

```go
// main.go
wails.Run(&options.App{
    EnumBind: []interface{}{
        []interface{}{"ErrorCode", apperr.ErrorCode("")},
    },
    ...
})
```

After any change to `apperr.ErrorCode` or the `EnumBind` list, run `wails generate module`.
Frontend code switches on `apperr.ErrorCode.Auth`, `apperr.ErrorCode.Timeout`, etc. — never on
raw string literals.

### chain:* progress events contract

Chain run progress flows from Go to frontend via three events. See
`references/05-event-system.md §GoText Chain Progress Events` for the full contract.

| Event | Payload | When |
|---|---|---|
| `chain:progress` | `{ runId, stepIndex, totalSteps, output }` | After each inference group completes |
| `chain:error` | `{ runId, stepIndex, error: WireError }` | If a step fails (partial output may also be set) |
| `chain:done` | `{ runId, output, cancelled }` | Final event — chain finished or cancelled |

### Id-based cooperative cancellation

Each chain run is tracked by a `runId` string. The frontend dispatches `CancelChain(runId)` to
request cancellation; the handler signals the run's `context.CancelFunc` stored in the run
registry. The chain emits `chain:done` with `cancelled: true` when the cancellation takes effect.

```typescript
// Frontend — cancel a running chain
await CancelChain(runId)   // from wailsjs/go/actions/ActionHandler
```

```go
// Go — run registry pattern
type runRegistry struct {
    mu      sync.Mutex
    cancels map[string]context.CancelFunc
}

func (r *runRegistry) register(runId string, cancel context.CancelFunc) {
    r.mu.Lock()
    r.cancels[runId] = cancel
    r.mu.Unlock()
}

func (r *runRegistry) cancel(runId string) {
    r.mu.Lock()
    if fn, ok := r.cancels[runId]; ok {
        fn()
        delete(r.cancels, runId)
    }
    r.mu.Unlock()
}
```

On `OnShutdown`, cancel all in-flight runs by iterating the registry.

### No-CGO SQLite constraint

GoText uses `modernc.org/sqlite` — a pure-Go, CGO-free SQLite driver. Never substitute
`github.com/mattn/go-sqlite3` or any other CGO driver. CGO breaks `wails build` cross-compilation.

```go
import _ "modernc.org/sqlite"
db, err := sql.Open("sqlite", dbFilePath)
```
