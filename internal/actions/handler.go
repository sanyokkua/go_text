package actions

import (
	"context"
	"fmt"
	"sync"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/logging"
	"go_text/internal/settings"
	"go_text/internal/verification"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const panicMsgFmt = "panic: %v"

// StackLookupAPI is the minimal contract ActionHandler needs to resolve a StackID
// to its saved-stack definition when handling PreviewPrompt (T15).
// Implemented by *stacks.StackHandler — defined here to avoid an import cycle.
type StackLookupAPI interface {
	GetStack(id string) apperr.StackResult
}

// ActionHandler is the Wails-bound handler for action-related operations.
// All bound methods must follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
type ActionHandler struct {
	appLogger           *logging.Logger
	actionService       ActionServiceAPI
	verificationService verification.ServiceAPI
	gate                *gate.InferenceGate

	// stackLookup is wired in application.Init after the stacks repo is open.
	// Nil before Init; PreviewPrompt returns an internal error if called before Init.
	stackLookup StackLookupAPI

	// Run lifecycle: Wails runtime context for event emission and
	// run registry mapping runId → cancel function.
	appCtx context.Context
	mu     sync.Mutex
	runs   map[string]context.CancelFunc
}

// NewActionHandler constructs an ActionHandler.
func NewActionHandler(
	appLogger *logging.Logger,
	actionService ActionServiceAPI,
	verificationService verification.ServiceAPI,
	g *gate.InferenceGate,
) *ActionHandler {
	return &ActionHandler{
		appLogger:           appLogger,
		actionService:       actionService,
		verificationService: verificationService,
		gate:                g,
		runs:                make(map[string]context.CancelFunc),
	}
}

// liveZlog returns a live snapshot of the app logger's current writer, or a
// no-op logger if appLogger has not been wired (e.g. bare struct-literal
// tests exercising panic recovery).
func (h *ActionHandler) liveZlog() zerolog.Logger {
	if h.appLogger != nil {
		return h.appLogger.ZeroLogger()
	}
	return zerolog.Nop()
}

// SetContext stores the Wails runtime context so that ProcessPromptChain can
// emit chain:progress / chain:done / chain:error events. Called by
// ApplicationContextHolder.SetContext during OnStartup.
func (h *ActionHandler) SetContext(ctx context.Context) {
	h.appCtx = ctx
}

// SetStackLookup wires the stack repository accessor needed by PreviewPrompt.
// Called from ApplicationContextHolder.Init after the SQLite repo is open.
func (h *ActionHandler) SetStackLookup(lookup StackLookupAPI) {
	h.stackLookup = lookup
}

// PreviewPrompt returns a read-only view of the composed prompts and inference parameters
// for the given action, steps, or saved stack — without making an LLM call.
// Reuses the same Planner + Composer as ProcessPromptChain to guarantee parity.
//
// Exactly one of req.ActionID, req.Steps, or req.StackID must be set.
func (h *ActionHandler) PreviewPrompt(req apperr.PromptPreviewRequest) (res apperr.PromptPreviewResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.PromptPreviewResult{Error: &wire}
		}
	}()

	specifiers := countPreviewSpecifiers(req)
	if specifiers != 1 {
		ae := apperr.Validation("request",
			"exactly one of actionId, steps, stackId",
			fmt.Sprintf("%d specifier(s) set", specifiers))
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.PromptPreviewResult{Error: &wire}
	}

	if req.StackID != "" {
		if errResult := h.resolveStackID(&req); errResult != nil {
			return *errResult
		}
	}

	preview, err := h.actionService.BuildPlanAndPrompts(req)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.PromptPreviewResult{Error: &wire}
	}
	return apperr.PromptPreviewResult{Data: preview}
}

// countPreviewSpecifiers counts how many of actionId/steps/stackId are set in the request.
func countPreviewSpecifiers(req apperr.PromptPreviewRequest) int {
	count := 0
	if req.ActionID != "" {
		count++
	}
	if len(req.Steps) > 0 {
		count++
	}
	if req.StackID != "" {
		count++
	}
	return count
}

// resolveStackID resolves req.StackID to a Steps slice, mutating req in place.
// Returns a non-nil result carrying an error if resolution fails; nil on success.
func (h *ActionHandler) resolveStackID(req *apperr.PromptPreviewRequest) *apperr.PromptPreviewResult {
	if h.stackLookup == nil {
		ae := apperr.Internal(fmt.Errorf("stack lookup not configured"))
		wire := apperr.ToWire(h.liveZlog(), ae)
		res := apperr.PromptPreviewResult{Error: &wire}
		return &res
	}
	stackResult := h.stackLookup.GetStack(req.StackID)
	if stackResult.Error != nil {
		res := apperr.PromptPreviewResult{Error: stackResult.Error}
		return &res
	}
	if stackResult.Data == nil {
		ae := apperr.Validation("stackId", "a known stack ID", req.StackID)
		wire := apperr.ToWire(h.liveZlog(), ae)
		res := apperr.PromptPreviewResult{Error: &wire}
		return &res
	}
	steps := make([]apperr.ChainStep, len(stackResult.Data.Steps))
	for i, id := range stackResult.Data.Steps {
		steps[i] = apperr.ChainStep{ActionID: id}
	}
	req.Steps = steps
	req.StackID = ""
	return nil
}

// emit dispatches a Wails event. No-op if the runtime context is not yet set
// (e.g. during unit tests that do not wire a Wails context).
func (h *ActionHandler) emit(name string, data any) {
	if h.appCtx == nil {
		return
	}
	runtime.EventsEmit(h.appCtx, name, data)
}

// CancelAllRuns cancels all registered in-flight runs. Called from
// ApplicationContextHolder.CancelAllRuns on shutdown.
func (h *ActionHandler) CancelAllRuns() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for id, cancel := range h.runs {
		cancel()
		delete(h.runs, id)
	}
}

// TestConnection verifies that the provider endpoint is reachable and
// credentials are valid. Returns a partial VerifyResult on failure so the
// frontend receives both the timing and the typed error code.
func (h *ActionHandler) TestConnection(cfg settings.ProviderConfig) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestConnection(cfg)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// TestModels runs the provider's discovery strategy and reports the model
// count and first model name.
func (h *ActionHandler) TestModels(cfg settings.ProviderConfig) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestModels(cfg)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// TestInference sends a tiny completion to the selected model and acquires
// the InferenceGate. Returns CodeBusy immediately if an inference is
// already in progress.
func (h *ActionHandler) TestInference(cfg settings.ProviderConfig) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestInference(cfg)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// GetActionCatalog returns the full v3 action catalog.
func (h *ActionHandler) GetActionCatalog() (res apperr.CatalogResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.CatalogResult{Error: &wire}
		}
	}()
	catalog := h.actionService.GetActionCatalog()
	if catalog == nil {
		catalog = []apperr.ActionMeta{}
	}
	return apperr.CatalogResult{Data: catalog}
}

// GetModels returns the live model list for the given provider.
// An empty providerID uses the current provider.
// Returns ModelsResult.Data as a non-nil slice (may be empty if no models are available).
func (h *ActionHandler) GetModels(providerID string) (res apperr.ModelsResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.ModelsResult{Error: &wire}
		}
	}()
	models, err := h.actionService.GetModelsInfo(providerID)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		return apperr.ModelsResult{Error: &wire}
	}
	if models == nil {
		models = []apperr.ModelInfo{}
	}
	return apperr.ModelsResult{Data: models}
}

// ProcessPromptChain runs a multi-step (or single-step) chain sequentially.
//
// Single-flight: if the InferenceGate is already held (by another chain run or
// by TestInference), returns immediately with Data:nil + Error.code="busy".
//
// Events emitted:
//   - "chain:progress" (StepProgress) per group: running → done or running → failed
//   - "chain:done"  (*ChainResult) on full success
//   - "chain:error" (WireError) on failure or cancel
//
// Partial failure: both Data (last good output) and Error (step_failed) are set.
// Cancel:         both Data (last good output) and Error (cancelled) are set.
func (h *ActionHandler) ProcessPromptChain(req apperr.ChainRequest) (res apperr.ChainResultEnv) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.ChainResultEnv{Error: &wire}
		}
	}()

	if !h.gate.TryAcquire() {
		ae := apperr.Busy()
		wire := apperr.ToWire(h.liveZlog(), ae)
		return apperr.ChainResultEnv{Error: &wire}
	}
	defer h.gate.Release()

	// Fall back to Background when appCtx is nil (unit tests without Wails lifecycle).
	baseCtx := h.appCtx
	if baseCtx == nil {
		baseCtx = context.Background()
	}
	ctx, cancel := context.WithCancel(baseCtx)
	h.mu.Lock()
	h.runs[req.RunID] = cancel
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.runs, req.RunID)
		h.mu.Unlock()
		cancel()
	}()

	emitProgress := func(p apperr.StepProgress) {
		h.emit("chain:progress", p)
	}

	result, err := h.actionService.RunChain(ctx, req, emitProgress)
	if err != nil {
		wire := apperr.ToWire(h.liveZlog(), err)
		h.emit("chain:error", wire)
		if result != nil {
			return apperr.ChainResultEnv{Data: result, Error: &wire}
		}
		return apperr.ChainResultEnv{Error: &wire}
	}
	h.emit("chain:done", result)
	return apperr.ChainResultEnv{Data: result}
}

// CancelChain cancels the chain run identified by runID. Idempotent: an unknown
// or already-finished runID is a silent no-op.
func (h *ActionHandler) CancelChain(runID string) (res apperr.VoidResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.liveZlog(), ae)
			res = apperr.VoidResult{Error: &wire}
		}
	}()
	h.mu.Lock()
	defer h.mu.Unlock()
	if cancel, ok := h.runs[runID]; ok {
		cancel()
	}
	return apperr.VoidResult{}
}
