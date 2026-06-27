# Event System

## Overview

Events are bidirectional named channels between the Go backend and the TypeScript frontend. Either side can emit or listen. Data payloads are optional and variadic. Event names are arbitrary strings — the convention `"domain:action"` keeps them organized.

```
Go                            Frontend (TS)
runtime.EventsEmit  ────────► EventsOn listener
runtime.EventsOn    ◄──────── EventsEmit
```

**Recommended naming:** `"domain:action"` — e.g. `"file:saved"`, `"data:updated"`, `"user:action"`, `"progress:update"`.

---

## Pattern 1: Frontend Emits → Go Handles

Register the Go listener in `OnStartup` so it's ready before the frontend fires any events.

```go
// Go: register in OnStartup
func (a *App) startup(ctx context.Context) {
    a.ctx = ctx

    runtime.EventsOn(ctx, "user:action", func(data ...interface{}) {
        if len(data) > 0 {
            action, ok := data[0].(string)
            if !ok {
                return
            }
            a.handleUserAction(action)
        }
    })
}
```

```typescript
// TypeScript: emit from frontend
import { EventsEmit } from '@wailsapp/runtime'

EventsEmit("user:action", "save")
```

---

## Pattern 2: Go Emits → Frontend Handles

Go emits from a goroutine; the frontend listens with `EventsOn`.

```go
// Go: emit from a background goroutine
func (a *App) StartProcessing() {
    go func() {
        for i := 0; i <= 100; i += 10 {
            runtime.EventsEmit(a.ctx, "progress:update", i)
            time.Sleep(100 * time.Millisecond)
        }
        runtime.EventsEmit(a.ctx, "progress:complete", "done")
    }()
}
```

```typescript
// TypeScript: listen in a React component
import { EventsOn } from '@wailsapp/runtime'
import { useEffect, useState } from 'react'

function ProgressBar() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const cancelProgress = EventsOn("progress:update", (value: number) => {
            setProgress(value)
        })
        const cancelComplete = EventsOn("progress:complete", () => {
            setProgress(100)
        })
        return () => {
            cancelProgress()
            cancelComplete()
        }
    }, [])

    return <div>{progress}%</div>
}
```

---

## Memory Leak Warning

Always return the cancel function from `useEffect`. Failing to do so leaks listeners that accumulate across component mounts.

```typescript
// Correct — cleanup on unmount
useEffect(() => {
    const cancel = EventsOn("data:updated", handler)
    return cancel
}, [])

// Wrong — leaks on each mount
useEffect(() => {
    EventsOn("data:updated", handler)  // no cleanup!
}, [])
```

---

## Data Typing

Go side: `data ...interface{}` — emit any JSON-serializable value.

TypeScript side: receives `any`. Use type guards or `zod` to validate:

```typescript
EventsOn("file:dropped", (path: unknown) => {
    if (typeof path !== "string") return
    handleFilePath(path)
})
```

For structured payloads, pass a single object:

```go
runtime.EventsEmit(a.ctx, "task:result", map[string]interface{}{
    "id":     taskID,
    "status": "done",
    "output": result,
})
```

```typescript
EventsOn("task:result", (payload: { id: string; status: string; output: string }) => {
    updateTask(payload)
})
```

---

## Goroutine Safety

`runtime.EventsEmit` is safe to call from any goroutine. The Wails event system handles the thread transition internally — no mutex needed around emits.

---

## EventsOnce vs EventsOn

```go
// Fires once, then auto-removes itself
runtime.EventsOnce(ctx, "init:complete", func(data ...interface{}) {
    a.initialized = true
})
```

Useful for one-time handshakes or initialization signals. Equivalent TypeScript: `EventsOnce`.

---

## GoText Chain Progress Events

GoText uses three events to stream chain-run progress from the Go backend to the frontend. These
events are emitted by `ChainOrchestrator` via `runtime.EventsEmit`.

### Event contract

| Event name | Payload shape | When emitted |
|---|---|---|
| `chain:progress` | `{ runId, stepIndex, totalSteps, output }` | After each inference group completes — carries the output so far |
| `chain:error` | `{ runId, stepIndex, error: WireError, output? }` | If a step fails; `output` may be set for partial results |
| `chain:done` | `{ runId, output, cancelled }` | Chain finished or was cancelled — final event, always emitted |

`WireError` shape: `{ code: ErrorCode, message: string, details?: Record<string,string> }`.

### Go emission

```go
// ChainOrchestrator emits after each step
type progressPayload struct {
    RunID      string `json:"runId"`
    StepIndex  int    `json:"stepIndex"`
    TotalSteps int    `json:"totalSteps"`
    Output     string `json:"output"`
}

runtime.EventsEmit(ctx, "chain:progress", progressPayload{
    RunID:      runID,
    StepIndex:  i,
    TotalSteps: total,
    Output:     stepOutput,
})
```

### TypeScript listener (Redux thunk)

```typescript
import { EventsOn } from '@wailsapp/runtime'
import { useAppDispatch } from 'logic/hooks'
import { setProgress, setDone, setError } from 'logic/store/run/slice'

// Register in a useEffect tied to the active runId
useEffect(() => {
    if (!runId) return

    const cancelProgress = EventsOn('chain:progress', (payload) => {
        dispatch(setProgress({ stepIndex: payload.stepIndex, output: payload.output }))
    })
    const cancelError = EventsOn('chain:error', (payload) => {
        dispatch(setError({ error: payload.error, output: payload.output }))
    })
    const cancelDone = EventsOn('chain:done', (payload) => {
        dispatch(setDone({ output: payload.output, cancelled: payload.cancelled }))
        // Clean up listeners — chain is complete
        cancelProgress(); cancelError(); cancelDone()
    })

    return () => {
        cancelProgress(); cancelError(); cancelDone()
    }
}, [runId, dispatch])
```

### Key invariants

- `chain:done` is **always** the last event for a run — fire-and-forget is safe.
- A `chain:progress` event with `stepIndex === totalSteps - 1` does NOT mean the run is done —
  wait for `chain:done`.
- If the frontend calls `CancelChain(runId)`, the backend may still emit one more `chain:progress`
  before emitting `chain:done` with `cancelled: true`. Handle this gracefully.
- Event listeners that aren't cleaned up leak across component mounts. Always return cancel
  functions from `useEffect`.
