# GoText — Data Flow & Communication

> **Version:** v3 · Wails bridge: method bindings + runtime events

Communication between the React frontend and the Go backend uses two channels: **method binding**
(the primary call-response channel) and **runtime events** (used exclusively for chain progress
reporting). Both channels are managed through `frontend/src/logic/adapter/` — components never
touch the raw Wails bridge directly.

---

## 1. Method binding (primary channel)

Go handler methods are exposed to the frontend via Wails `Bind` in `main.go`. Each bound struct
gets a `wailsjs/go/<package>/<Struct>.js` file; all shared types and the `ErrorCode` enum are in
`wailsjs/go/models.ts`.

### 1.1 Binding rules

- Bound methods take **no `context.Context` parameter** (the app `ctx` is stored in the DI container)
- Bound methods return a **concrete Result envelope** (never `(T, error)`) — the JS promise always
  resolves; the frontend reads `res.error`
- `EnumBind` in `main.go` exposes `apperr.ErrorCode` as a real TypeScript enum in `models.ts`
- After any Go method/struct signature change: `wails generate module` regenerates `wailsjs/`

### 1.2 Result envelope semantics

Every bound method returns a concrete non-generic envelope:

| Outcome | `Data` | `Error` |
|---|---|---|
| Success | set | nil |
| Expected failure | nil | `WireError` set |
| Partial (chain) | set (last good output) | `WireError` set |

Partial results (a chain that was cancelled or had a step failure) carry **both** `Data` and `Error`
in the same envelope. The frontend renders the partial output and shows the typed error message.

```typescript
// adapter pattern
const res = await ProcessPromptChain(req);
if (res.error) {
    dispatch(notifyError(res.error));       // typed WireError
}
if (res.data) {
    dispatch(setOutput(res.data.output));   // may coexist with error on partial result
}
```

---

## 2. Runtime events (chain progress)

Long-running chains report progress via Wails runtime events — the frontend subscribes with
`EventsOn` (never polls). These are **Go → frontend** only; the frontend does not emit events back.

| Event | Payload type | Meaning |
|---|---|---|
| `chain:progress` | `StepProgress{runId, groupIndex, totalGroups, family, status}` | Per-group running / done / failed |
| `chain:error` | step/run error context | A step failed (paired with the final envelope's `WireError`) |
| `chain:done` | `ChainResult` | Chain complete (also returned as the call's value) |

**`runId` is always validated** before dispatching a progress update — stale events from an earlier
run are discarded.

The adapter subscribes in the `run` slice's setup and unsubscribes on unmount:

```typescript
// logic/adapter/ — not in components
const unsub = EventsOn("chain:progress", (data: StepProgress) => {
    if (data.runId !== store.getState().run.runId) return;  // stale guard
    dispatch(updateRunProgress(data));
});
// cleanup
return () => unsub();
```

---

## 3. Cancellation

Cancellation is cooperative and id-based:

1. When a chain run starts, `ChainOrchestrator` registers `runId → CancelFunc` in the run registry.
2. The frontend calls `CancelChain(runId)` — a bound handler method.
3. The handler looks up `CancelFunc` in the registry and invokes it, cancelling the child `ctx`.
4. The orchestrator stops after the current inference group, builds a partial result, and removes the
   registry entry.
5. On `OnShutdown`, every registered run is cancelled.

The cancelled run returns a partial envelope: `Data` with the last good output and `Error` with
`WireError{code: "cancelled"}`.

```
Component → dispatch(cancelRun) → adapter.CancelChain(runId) → Go handler
                                                              → registry[runId]()
                                                              → child ctx cancelled
                                                              → Orchestrator stops after group N
                                                              → returns ChainResultEnv{Data: partial, Error: cancelled}
```

---

## 4. Unidirectional data flow

```
component → dispatch(thunk) → adapter → Wails handler → service → provider/repository
                                                  │
            (chain:progress/chain:done events) ◄──┘
component ◄── selector ◄── slice ◄── thunk fulfilled/rejected ◄── adapter (unwrap)
```

All state updates flow through Redux. The adapter unwraps the envelope and dispatches typed actions;
the view layer reads state via selectors only.

---

## 5. Sequence — chain run with progress, cancel, and partial failure

```
Component         Thunk/Adapter        ActionHandler        ChainOrchestrator        Provider
   │ Run()             │                    │                       │                    │
   ├─ dispatch ───────►│                    │                       │                    │
   │                   ├─ ProcessPromptChain(req) ────────────────► │                    │
   │                   │                    │  register runId→cancel│                    │
   │                   │                    │  Planner→plan         │                    │
   │                   │                    │  resolve provider once│                    │
   │ EventsOn ◄────────┼── chain:progress {g0, running} ◄──────────┤                    │
   │ (run slice)       │                    │    Composer→runStep ──┼───────────────────►│
   │                   │                    │                       │◄── content ─────── │
   │ ◄─────────────────┼── chain:progress {g0, done} ◄─────────────┤                    │
   │ Cancel() ────────►│ CancelChain(runId) ┼──► cancel ctx ───────►│ (stop after g0)    │
   │                   │                    │                       ├─ build partial result
   │                   │◄── ChainResultEnv{Data: <partial>, Error: WireError{cancelled}}
   │ ◄── render partial output + toast (cancelled)
   │   (orchestrator records ONE history entry: status = partial/cancelled)
```

---

## 6. Retry behavior

Retries happen **below the handler boundary** (inside the LLM service layer), so the user sees an
error only after retries are exhausted:

- **Transient-only.** Retried codes: `provider_unreachable`, `timeout`, `rate_limited`, `upstream`.
  Non-retried: `auth`, `model_not_found`, `missing_credential`, `validation`.
- **Exponential backoff + Retry-After.** On HTTP 429 the provider's `Retry-After` header is honored.
- **Scope.** `maxRetries` (default 3) and `timeoutSeconds` (default 60) come from inference settings.
  Retries apply per `runStep`; a chain does not restart from the beginning.
- **Surfaced.** A retryable error code may still show a manual **Retry** affordance on the frontend
  for the final surfaced error (since auto-backoff already exhausted).

---

## 7. Context propagation

The Wails app `ctx` is obtained once in `OnStartup` and stored in `ApplicationContextHolder`. This
stored `ctx` is the parent for:

- All `runtime.*` calls (events emit, window ops)
- All service calls that need a cancellable context
- Each chain run's child `ctx` (derived via `context.WithCancel`)

No `context.Background()` appears in request paths.
