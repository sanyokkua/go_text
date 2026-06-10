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
