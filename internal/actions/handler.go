package actions

import (
	"fmt"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/verification"

	"github.com/rs/zerolog"
	"github.com/wailsapp/wails/v2/pkg/logger"
)

const panicMsgFmt = "panic: %v"

// ActionHandler is the Wails-bound handler for action-related operations.
// All bound methods must follow the envelope pattern: return apperr.*Result,
// no error return, and include defer/recover for panic safety.
type ActionHandler struct {
	logger              logger.Logger
	zlog                zerolog.Logger
	actionService       ActionServiceAPI
	verificationService verification.ServiceAPI
	// gate is stored here for reuse by the chain orchestrator in T13.
	gate *gate.InferenceGate
}

// NewActionHandler constructs an ActionHandler.
func NewActionHandler(
	wailsLogger logger.Logger,
	zlog zerolog.Logger,
	actionService ActionServiceAPI,
	verificationService verification.ServiceAPI,
	g *gate.InferenceGate,
) *ActionHandler {
	return &ActionHandler{
		logger:              wailsLogger,
		zlog:                zlog,
		actionService:       actionService,
		verificationService: verificationService,
		gate:                g,
	}
}

// TestConnection verifies that the provider endpoint is reachable and
// credentials are valid. Returns a partial VerifyResult on failure so the
// frontend receives both the timing and the typed error code.
func (h *ActionHandler) TestConnection(providerID string) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestConnection(providerID)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// TestModels runs the provider's discovery strategy and reports the model
// count and first model name.
func (h *ActionHandler) TestModels(providerID string) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestModels(providerID)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// TestInference sends a tiny completion to the selected model and acquires
// the InferenceGate. Returns CodeBusy immediately if an inference is
// already in progress.
func (h *ActionHandler) TestInference(providerID string) (res apperr.VerifyResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.VerifyResult{Error: &wire}
		}
	}()
	outcome, err := h.verificationService.TestInference(providerID)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.VerifyResult{Data: outcome, Error: &wire}
	}
	return apperr.VerifyResult{Data: outcome}
}

// GetModels returns the live model list for the given provider.
// An empty providerID uses the current provider.
// Returns ModelsResult.Data as a non-nil slice (may be empty if no models are available).
func (h *ActionHandler) GetModels(providerID string) (res apperr.ModelsResult) {
	defer func() {
		if r := recover(); r != nil {
			ae := apperr.Internal(fmt.Errorf(panicMsgFmt, r))
			wire := apperr.ToWire(h.zlog, ae)
			res = apperr.ModelsResult{Error: &wire}
		}
	}()
	models, err := h.actionService.GetModelsInfo(providerID)
	if err != nil {
		wire := apperr.ToWire(h.zlog, err)
		return apperr.ModelsResult{Error: &wire}
	}
	if models == nil {
		models = []apperr.ModelInfo{}
	}
	return apperr.ModelsResult{Data: models}
}
