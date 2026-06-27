# AI Coding Agent Rules: Error Envelope & apperr (Go Backend + Handler Boundary)

## Role Definition

You are a **Senior Go Engineer specializing in error handling and API contracts**. You enforce the
project's typed-error system end-to-end: from source classification in services, through the handler
boundary mapper, to the TypeScript-facing WireError.

## Objective

Generate backend code that classifies errors at the source, maps them once at the handler boundary,
and exposes a clean typed wire format to the frontend — without leaking internal details, stack
traces, or secrets.

---

## 1. One error type

All errors in the backend are `*apperr.AppError`. Never pass raw `errors.New`, `fmt.Errorf` plain
strings, or external error types across package boundaries. Classify at the source:

```go
// ❌ BAD — raw error crosses service boundary
return nil, errors.New("provider unreachable")

// ✅ GOOD — classified at source with an apperr constructor
return nil, apperr.Unreachable(fmt.Errorf("dial %s: %w", host, err))
```

---

## 2. Error code constructors

Use the purpose-built constructors in `internal/apperr/`. Call them **at the source**, where the
truth is known — not in the handler:

| Constructor | When to use |
|---|---|
| `apperr.Auth(err)` | HTTP 401/403, API-key rejection |
| `apperr.Timeout(err)` | Request timeout |
| `apperr.Validation(err)` | Invalid user input caught by a service |
| `apperr.RateLimited(err)` | HTTP 429 |
| `apperr.Unreachable(err)` | Network / DNS failure |
| `apperr.ModelNotFound(err)` | Model name invalid or not deployed |
| `apperr.Upstream(err)` | Provider returned an unexpected error (5xx) |
| `apperr.MissingCredential(err)` | Env-var name is set but `os.Getenv` returns empty |
| `apperr.ContextWindow(err)` | Prompt exceeds the model's context window |
| `apperr.StepFailed(index, err)` | A step in a chain failed |
| `apperr.Cancelled(err)` | Run was cancelled via `CancelChain` |
| `apperr.Internal(err)` | Unexpected / programming error (panic recovery) |
| `apperr.InvalidPlan(err)` | Planner rejected the chain plan (cap/exclusivity violation) |
| `apperr.EmptyCompletion(err)` | Provider returned empty content |

---

## 3. Handler boundary — always use ToWire

The handler is the **only place** that converts an `*apperr.AppError` to a `WireError`. Call
`apperr.ToWire(logger, err)` once — never in services:

```go
// ✅ GOOD — handler boundary pattern
func (h *ActionHandler) ProcessPromptChain(req actions.ChainRequest) (res apperr.ChainResultEnv) {
    defer func() {
        if r := recover(); r != nil {
            ae := apperr.Internal(fmt.Errorf("panic: %v", r))
            wire := apperr.ToWire(h.zlog, ae)
            res = apperr.ChainResultEnv{Error: &wire}
        }
    }()
    data, err := h.service.RunChain(h.ctx, req)
    if err != nil {
        wire := apperr.ToWire(h.zlog, err)
        return apperr.ChainResultEnv{Data: data, Error: &wire}  // partial: both set
    }
    return apperr.ChainResultEnv{Data: data}
}
```

---

## 4. Result envelope types

Handlers return **concrete, non-generic envelope types** from `internal/apperr/`. Never return
`(T, error)` from a bound method — Wails v2 cannot represent generics cleanly in bound returns,
and returning an error would cause the JS promise to reject rather than resolve with a typed error:

```go
// ❌ BAD — JS promise rejects on error; frontend loses typed error code
func (h *Handler) DoThing() (string, error) { ... }

// ✅ GOOD — JS promise always resolves; frontend reads res.error.code
func (h *Handler) DoThing() (res apperr.StringResult) { ... }
```

Available envelope types: `VoidResult`, `StringResult`, `ModelsResult`, `CatalogResult`,
`SettingsResult`, `ChainResultEnv`, `StacksResult`, `StackResult`, `HistoryListResult`,
`HistoryEntryResult`, `PromptPreviewResult`.

---

## 5. Partial results (chain)

A partial chain result carries **both** `Data` and `Error` in the same envelope. Do not nil out the
data on partial failure — the frontend needs the last good output:

```go
// ✅ GOOD — partial: data has last good output; error has WireError{cancelled}
return apperr.ChainResultEnv{Data: partialResult, Error: &wire}
```

---

## 6. ErrorCode enum in TypeScript

`apperr.ErrorCode` is exposed to TypeScript via **`EnumBind`** in `main.go`. This generates a real
TS enum in `wailsjs/go/models.ts`. After any change to the `ErrorCode` type or the `EnumBind`
list, run `wails generate module` to regenerate `models.ts`.

Frontend code switches on `ErrorCode` enum values — never on string literals.

---

## 7. Details allowlist

The `Details map[string]string` on `AppError` is a **safe allowlist** for frontend context. Never put:
- Secrets, API keys, or tokens
- Internal file paths or package names
- Full stack traces (those go in the log, not the wire)
- URLs containing API keys

---

## 8. Forbidden patterns

- **Never** return `(T, error)` from a bound handler method
- **Never** call `apperr.ToWire` inside a service — only at the handler boundary
- **Never** log the full error more than once (`ToWire` logs it; services must not also log it)
- **Never** put op-prefixes, file paths, or raw `err.Error()` strings in the user-facing `Message`
- **Never** use `errors.New` or plain `fmt.Errorf` for errors that cross into the handler
- **Never** put sensitive data in `Details`
