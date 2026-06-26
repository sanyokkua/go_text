package actions

import (
	"context"
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/llms"
	"go_text/internal/prompts"
	"go_text/internal/settings"

	"github.com/rs/zerolog"
)

// mockVerificationService is a stub for verification.ServiceAPI.
type mockVerificationService struct {
	connOutcome   *apperr.VerifyOutcome
	connErr       error
	modelsOutcome *apperr.VerifyOutcome
	modelsErr     error
	inferOutcome  *apperr.VerifyOutcome
	inferErr      error
}

func (m *mockVerificationService) TestConnection(_ string) (*apperr.VerifyOutcome, error) {
	return m.connOutcome, m.connErr
}
func (m *mockVerificationService) TestModels(_ string) (*apperr.VerifyOutcome, error) {
	return m.modelsOutcome, m.modelsErr
}
func (m *mockVerificationService) TestInference(_ string) (*apperr.VerifyOutcome, error) {
	return m.inferOutcome, m.inferErr
}

func newTestActionHandler(mock *mockVerificationService) *ActionHandler {
	return &ActionHandler{
		logger:              nil,
		zlog:                zerolog.Nop(),
		actionService:       nil,
		verificationService: mock,
		gate:                gate.New(),
	}
}

// ─── TestConnection handler ──────────────────────────────────────────────────

func TestActionHandler_TestConnection_Success(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "connection", OK: true, DurationMs: 42}
	h := newTestActionHandler(&mockVerificationService{connOutcome: outcome})

	res := h.TestConnection("p1")
	if res.Error != nil {
		t.Fatalf("expected no error, got %v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data")
	}
	if !res.Data.OK {
		t.Error("expected OK=true")
	}
}

func TestActionHandler_TestConnection_Failure_PartialResult(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "connection", OK: false, DurationMs: 10}
	mock := &mockVerificationService{
		connOutcome: outcome,
		connErr:     apperr.Auth("TestProv", "401", "", nil),
	}
	h := newTestActionHandler(mock)

	res := h.TestConnection("p1")
	if res.Error == nil {
		t.Fatal("expected error in result")
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data in partial result")
	}
	if res.Data.OK {
		t.Error("expected OK=false in partial result")
	}
	if res.Error.Code != apperr.CodeAuth {
		t.Errorf("expected code=auth, got %q", res.Error.Code)
	}
}

// ─── TestModels handler ──────────────────────────────────────────────────────

func TestActionHandler_TestModels_Success(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "models", OK: true, ModelCount: 3, Sample: "gpt-4o"}
	h := newTestActionHandler(&mockVerificationService{modelsOutcome: outcome})

	res := h.TestModels("p1")
	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil || res.Data.ModelCount != 3 {
		t.Error("expected ModelCount=3")
	}
}

func TestActionHandler_TestModels_Failure_PartialResult(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "models", OK: false, DurationMs: 5}
	mock := &mockVerificationService{
		modelsOutcome: outcome,
		modelsErr:     apperr.ModelNotFound("TestProv", "(none discovered)", nil),
	}
	h := newTestActionHandler(mock)

	res := h.TestModels("p1")
	if res.Data == nil {
		t.Fatal("expected partial Data")
	}
	if res.Error == nil {
		t.Fatal("expected Error in partial result")
	}
	if res.Error.Code != apperr.CodeModelNotFound {
		t.Errorf("expected code=model_not_found, got %q", res.Error.Code)
	}
}

// ─── TestInference handler ───────────────────────────────────────────────────

func TestActionHandler_TestInference_Success(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "inference", OK: true, Sample: "Hello"}
	h := newTestActionHandler(&mockVerificationService{inferOutcome: outcome})

	res := h.TestInference("p1")
	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil || res.Data.Sample != "Hello" {
		t.Error("expected sample in result")
	}
}

func TestActionHandler_TestInference_Busy_PartialResult(t *testing.T) {
	t.Parallel()
	outcome := &apperr.VerifyOutcome{Check: "inference", OK: false, DurationMs: 0}
	mock := &mockVerificationService{
		inferOutcome: outcome,
		inferErr:     apperr.Busy(),
	}
	h := newTestActionHandler(mock)

	res := h.TestInference("p1")
	if res.Error == nil {
		t.Fatal("expected Error for busy")
	}
	if res.Data == nil {
		t.Fatal("expected partial Data")
	}
	if res.Error.Code != apperr.CodeBusy {
		t.Errorf("expected code=busy, got %q", res.Error.Code)
	}
}

func TestActionHandler_TestInference_PanicRecovery(t *testing.T) {
	t.Parallel()
	mock := &mockVerificationService{
		inferErr: errors.New("service panicking unexpectedly"),
	}
	h := newTestActionHandler(mock)

	// Inject a panic via a custom service that panics.
	panicSvc := &panicVerifyService{}
	h.verificationService = panicSvc

	res := h.TestInference("p1")
	if res.Error == nil {
		t.Fatal("expected error after panic recovery")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", res.Error.Code)
	}
}

// panicVerifyService panics on any call — used to test panic recovery.
type panicVerifyService struct{}

func (p *panicVerifyService) TestConnection(_ string) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestConnection")
}
func (p *panicVerifyService) TestModels(_ string) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestModels")
}
func (p *panicVerifyService) TestInference(_ string) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestInference")
}

// mockActionService stubs ActionServiceAPI for GetModels handler tests.
type mockActionService struct {
	models  []apperr.ModelInfo
	err     error
	catalog []apperr.ActionMeta
}

func (m *mockActionService) GetModelsList() ([]string, error) { return nil, nil }
func (m *mockActionService) GetCompletionResponse(_ *llms.ChatCompletionRequest) (string, error) {
	return "", nil
}
func (m *mockActionService) GetModelsListForProvider(_ *settings.ProviderConfig) ([]string, error) {
	return nil, nil
}
func (m *mockActionService) GetModelsInfo(_ string) ([]apperr.ModelInfo, error) {
	return m.models, m.err
}
func (m *mockActionService) GetCompletionResponseForProvider(_ *settings.ProviderConfig, _ *llms.ChatCompletionRequest) (string, error) {
	return "", nil
}
func (m *mockActionService) GetPromptGroups() (*prompts.Prompts, error) { return nil, nil }
func (m *mockActionService) ProcessPromptActionRequest(_ *prompts.PromptActionRequest) (string, error) {
	return "", nil
}
func (m *mockActionService) GetActionCatalog() []apperr.ActionMeta { return m.catalog }
func (m *mockActionService) BuildPlanAndPrompts(_ apperr.PromptPreviewRequest) (*apperr.PromptPreview, error) {
	return nil, nil
}
func (m *mockActionService) RunChain(_ context.Context, _ apperr.ChainRequest, _ func(apperr.StepProgress)) (*apperr.ChainResult, error) {
	return nil, nil
}

func (m *mockActionService) withCatalog(catalog []apperr.ActionMeta) *mockActionService {
	m.catalog = catalog
	return m
}

// ─── GetModels handler ──────────────────────────────────────────────────────

func newModelsActionHandler(svc *mockActionService) *ActionHandler {
	return &ActionHandler{
		logger:              nil,
		zlog:                zerolog.Nop(),
		actionService:       svc,
		verificationService: &mockVerificationService{},
		gate:                gate.New(),
	}
}

func TestActionHandler_GetModels_Success_CurrentProvider(t *testing.T) {
	t.Parallel()
	models := []apperr.ModelInfo{
		{ID: "gpt-4o", Label: "gpt-4o"},
		{ID: "gpt-3.5-turbo", Label: "gpt-3.5-turbo"},
	}
	h := newModelsActionHandler(&mockActionService{models: models})

	res := h.GetModels("")
	if res.Error != nil {
		t.Fatalf("expected no error, got %v", res.Error)
	}
	if len(res.Data) != 2 {
		t.Fatalf("want 2 models, got %d", len(res.Data))
	}
	if res.Data[0].ID != "gpt-4o" {
		t.Errorf("want first model gpt-4o, got %q", res.Data[0].ID)
	}
}

func TestActionHandler_GetModels_Success_SpecificProvider(t *testing.T) {
	t.Parallel()
	trueBool := true
	maxTok := 4096
	models := []apperr.ModelInfo{
		{
			ID:    "azure-gpt-4",
			Label: "GPT-4 Turbo",
			Caps: &apperr.ModelCaps{
				SupportsTemperature: &trueBool,
				MaxPromptTokens:     &maxTok,
			},
		},
	}
	h := newModelsActionHandler(&mockActionService{models: models})

	res := h.GetModels("provider-abc")
	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data) != 1 {
		t.Fatalf("want 1 model, got %d", len(res.Data))
	}
	if res.Data[0].Caps == nil {
		t.Fatal("want non-nil Caps for rich catalog model")
	}
	if res.Data[0].Caps.MaxPromptTokens == nil || *res.Data[0].Caps.MaxPromptTokens != 4096 {
		t.Errorf("want MaxPromptTokens=4096")
	}
}

func TestActionHandler_GetModels_ValidationError(t *testing.T) {
	t.Parallel()
	h := newModelsActionHandler(&mockActionService{
		err: apperr.Validation("providerId", "existing provider id", "bad-id"),
	})

	res := h.GetModels("bad-id")
	if res.Error == nil {
		t.Fatal("expected validation error")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("want code=validation, got %q", res.Error.Code)
	}
}

func TestActionHandler_GetModels_Unreachable_ReturnsError(t *testing.T) {
	t.Parallel()
	h := newModelsActionHandler(&mockActionService{
		err: apperr.Unreachable("test-provider", "http://dead.invalid/", errors.New("dial tcp")),
	})

	res := h.GetModels("")
	if res.Error == nil {
		t.Fatal("expected error for unreachable provider")
	}
	if res.Error.Code != apperr.CodeProviderUnreachable {
		t.Errorf("want code=provider_unreachable, got %q", res.Error.Code)
	}
	if !res.Error.Retryable {
		t.Error("want Retryable=true for provider_unreachable")
	}
}

func TestActionHandler_GetModels_EmptyResult_NonNilSlice(t *testing.T) {
	t.Parallel()
	h := newModelsActionHandler(&mockActionService{models: []apperr.ModelInfo{}})

	res := h.GetModels("")
	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("want non-nil empty slice, got nil")
	}
	if len(res.Data) != 0 {
		t.Errorf("want 0 models, got %d", len(res.Data))
	}
}

func TestActionHandler_GetActionCatalog_ReturnsCatalog(t *testing.T) {
	t.Parallel()
	catalog := []apperr.ActionMeta{
		{ID: "rewrite.proofread.basic", Name: "Basic proofreading", Family: "rewrite"},
		{ID: "summarize.summary", Name: "Summary", Family: "summarize"},
	}
	h := newModelsActionHandler((&mockActionService{}).withCatalog(catalog))

	res := h.GetActionCatalog()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if len(res.Data) != 2 {
		t.Fatalf("want 2 actions, got %d", len(res.Data))
	}
	if res.Data[0].ID != "rewrite.proofread.basic" {
		t.Errorf("Data[0].ID = %q, want %q", res.Data[0].ID, "rewrite.proofread.basic")
	}
}

func TestActionHandler_GetActionCatalog_NilBecomesEmptySlice(t *testing.T) {
	t.Parallel()
	h := newModelsActionHandler(&mockActionService{catalog: nil})

	res := h.GetActionCatalog()

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("Data must not be nil when service returns nil")
	}
	if len(res.Data) != 0 {
		t.Errorf("want empty slice, got %d items", len(res.Data))
	}
}

func TestActionHandler_GetActionCatalog_PanicRecovery(t *testing.T) {
	t.Parallel()
	h := &ActionHandler{
		logger:              nil,
		zlog:                zerolog.Nop(),
		actionService:       &panicActionService{},
		verificationService: &mockVerificationService{},
		gate:                gate.New(),
	}

	res := h.GetActionCatalog()

	if res.Error == nil {
		t.Fatal("expected error after panic recovery")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", res.Error.Code)
	}
}

func TestActionHandler_GetModels_PanicRecovery(t *testing.T) {
	t.Parallel()
	panicSvc := &panicActionService{}
	h := &ActionHandler{
		logger:              nil,
		zlog:                zerolog.Nop(),
		actionService:       panicSvc,
		verificationService: &mockVerificationService{},
		gate:                gate.New(),
	}

	res := h.GetModels("")
	if res.Error == nil {
		t.Fatal("expected error after panic recovery")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", res.Error.Code)
	}
}

// panicActionService panics on any call — used to test panic recovery.
type panicActionService struct{}

func (p *panicActionService) GetModelsList() ([]string, error) { panic("panic GetModelsList") }
func (p *panicActionService) GetCompletionResponse(_ *llms.ChatCompletionRequest) (string, error) {
	panic("panic GetCompletionResponse")
}
func (p *panicActionService) GetModelsListForProvider(_ *settings.ProviderConfig) ([]string, error) {
	panic("panic GetModelsListForProvider")
}
func (p *panicActionService) GetModelsInfo(_ string) ([]apperr.ModelInfo, error) {
	panic("panic GetModelsInfo")
}
func (p *panicActionService) GetCompletionResponseForProvider(_ *settings.ProviderConfig, _ *llms.ChatCompletionRequest) (string, error) {
	panic("panic GetCompletionResponseForProvider")
}
func (p *panicActionService) GetPromptGroups() (*prompts.Prompts, error) {
	panic("panic GetPromptGroups")
}
func (p *panicActionService) ProcessPromptActionRequest(_ *prompts.PromptActionRequest) (string, error) {
	panic("panic ProcessPromptActionRequest")
}
func (p *panicActionService) GetActionCatalog() []apperr.ActionMeta {
	panic("panic GetActionCatalog")
}
func (p *panicActionService) BuildPlanAndPrompts(_ apperr.PromptPreviewRequest) (*apperr.PromptPreview, error) {
	panic("panic BuildPlanAndPrompts")
}
func (p *panicActionService) RunChain(_ context.Context, _ apperr.ChainRequest, _ func(apperr.StepProgress)) (*apperr.ChainResult, error) {
	panic("panic RunChain")
}
