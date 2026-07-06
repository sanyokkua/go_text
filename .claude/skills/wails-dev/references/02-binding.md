# Go Method Binding

## Binding Rules

1. **Pass a pointer to a struct** in `Bind`, never a value or interface directly.
2. **Only exported methods** are bound (start with uppercase).
3. **Optional `context.Context` first param** — Wails strips it from the JS signature; the frontend never sees it.
4. All inputs and outputs must be **JSON-serializable**.

## Valid Return Patterns

```go
func (a *App) MethodA()                      // no return
func (a *App) MethodB() string               // single value
func (a *App) MethodC() error                // error only
func (a *App) MethodD() (string, error)      // value + error (most common)
func (a *App) MethodE(ctx context.Context, input string) (Result, error)
```

All bound calls return `Promise<T>` in TypeScript. Returned `error` causes the Promise to reject.

## Generated Files

Wails auto-generates these from your bound structs — **never edit them manually**:

```
wailsjs/
└── go/
    └── <package>/
        ├── <Struct>.js          # JS bridge (runtime generated)
        └── <Struct>.d.ts        # TypeScript declarations
    └── models.ts                # All shared types + enums
```

Regenerate after any Go struct/method change:
```bash
wails generate module
```

## TypeScript Import Pattern

```typescript
// Import bound methods
import { MyMethod, AnotherMethod } from '../../../wailsjs/go/mypackage/MyStruct'

// Import shared models
import { mypackage } from '../../../wailsjs/go/models'

// Call — always returns a Promise
const result = await MyMethod("input")
```

## Complex Struct Arguments

For complex struct return types, Wails generates a `.createFrom()` static method on the model. Use it when constructing model instances manually (e.g., in tests or when passing complex args):

```typescript
import { mypackage } from '../../../wailsjs/go/models'

// Don't construct raw objects manually:
// const cfg = { host: "localhost", port: 8080 }  // bad

// Use the generated factory:
const cfg = mypackage.Config.createFrom({ host: "localhost", port: 8080 })
await SaveConfig(cfg)
```

## EnumBind

Exposes Go const groups as TypeScript enums in `models.ts`.

**Go side:**
```go
type Priority int
const (
    Low    Priority = 0
    Medium Priority = 1
    High   Priority = 2
)

// In options.App:
EnumBind: []interface{}{
    []interface{}{"Priority", Priority(0)},
}
```

**TypeScript side** (after `wails generate module`):
```typescript
import { mypackage } from '../../../wailsjs/go/models'

// Use enum values
const p: mypackage.Priority = mypackage.Priority.High
await SetTaskPriority(p)
```

## Context Parameter Stripping

A method with `ctx` as first param:

```go
func (a *App) ProcessFile(ctx context.Context, path string) (string, error) {
    // ctx is available here, but hidden from JS
}
```

Generated TypeScript signature:
```typescript
export function ProcessFile(path: string): Promise<string>
```

The `ctx` is injected by Wails automatically — the frontend never passes it.

## Binding Multiple Structs

```go
Bind: []interface{}{
    app,                    // *App
    app.ActionHandler,      // *actions.ActionHandler
    app.SettingsHandler,    // *settings.SettingsHandler
}
```

Each struct gets its own `wailsjs/go/<package>/<Struct>.js` file. Bind only the handler/facade layer — not internal services. See `references/12-patterns.md` pattern #2.

---

## GoText: Result Envelope Pattern

GoText **never** returns `(T, error)` from bound methods. Returning an `error` causes the JS
Promise to reject, which means the frontend receives an untyped exception instead of a structured
`WireError` with a typed `ErrorCode`.

Instead, every bound method returns a concrete `apperr.*Result` envelope. The JS Promise always
**resolves**; the frontend inspects `res.error` to distinguish success from failure:

```go
// ❌ BAD — JS promise rejects; frontend loses typed error code
func (h *Handler) DoThing() (string, error) { ... }

// ✅ GOOD — JS promise always resolves; frontend reads res.error.code
func (h *Handler) DoThing() (res apperr.StringResult) { ... }
```

### Full handler pattern

```go
func (h *XxxHandler) DoThing(req Request) (res apperr.XxxResult) {
    // Panic → Internal error envelope, never a Go panic propagation
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

### Partial results (chain)

A partial chain result carries **both** `Data` and `Error` simultaneously — the last good output
plus the error that caused the chain to stop:

```go
return apperr.ChainResultEnv{Data: partialOutput, Error: &wire}
```

### Frontend consumption

```typescript
// Adapter layer (logic/adapter/)
const res = await ProcessPromptChain(req)    // always resolves
if (res.error) {
    dispatch(setRunError({ code: res.error.code, message: res.error.message }))
    if (res.data) {
        dispatch(setPartialOutput(res.data))  // show last good output
    }
    return
}
dispatch(setOutput(res.data))
```

Never let the caller `.catch()` on a GoText bound method — errors are in `res.error`, not
exceptions. If `res.error.code` equals `apperr.ErrorCode.Cancelled` the chain was user-cancelled.
