package actions

import (
	"context"
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/llms"
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

func (m *mockVerificationService) TestConnection(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	return m.connOutcome, m.connErr
}
func (m *mockVerificationService) TestModels(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	return m.modelsOutcome, m.modelsErr
}
func (m *mockVerificationService) TestInference(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
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

	res := h.TestConnection(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestConnection(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestModels(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestModels(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestInference(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestInference(settings.ProviderConfig{ID: "p1"})
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

	res := h.TestInference(settings.ProviderConfig{ID: "p1"})
	if res.Error == nil {
		t.Fatal("expected error after panic recovery")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", res.Error.Code)
	}
}

// panicVerifyService panics on any call — used to test panic recovery.
type panicVerifyService struct{}

func (p *panicVerifyService) TestConnection(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestConnection")
}
func (p *panicVerifyService) TestModels(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestModels")
}
func (p *panicVerifyService) TestInference(_ settings.ProviderConfig) (*apperr.VerifyOutcome, error) {
	panic("test panic in TestInference")
}

// mockActionService stubs ActionServiceAPI for GetModels handler tests.
type mockActionService struct {
	models        []apperr.ModelInfo
	err           error
	catalog       []apperr.ActionMeta
	previewResult *apperr.PromptPreview
	previewErr    error
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
func (m *mockActionService) GetActionCatalog() []apperr.ActionMeta { return m.catalog }
func (m *mockActionService) BuildPlanAndPrompts(_ apperr.PromptPreviewRequest) (*apperr.PromptPreview, error) {
	return m.previewResult, m.previewErr
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

// ─── PreviewPrompt helpers ───────────────────────────────────────────────────

type mockStackLookup struct {
	result apperr.StackResult
}

func (m *mockStackLookup) GetStack(_ string) apperr.StackResult {
	return m.result
}

func newPreviewHandler(svc *mockActionService, lookup *mockStackLookup) *ActionHandler {
	h := &ActionHandler{
		zlog:                zerolog.Nop(),
		actionService:       svc,
		verificationService: &mockVerificationService{},
		gate:                gate.New(),
	}
	if lookup != nil {
		h.stackLookup = lookup
	}
	return h
}

func defaultPreview() *apperr.PromptPreview {
	return &apperr.PromptPreview{
		Kind:       "single",
		Inferences: 1,
		Groups: []apperr.PreviewGroup{
			{
				Index:  0,
				Family: "Rewrite",
				AppliedActions: []apperr.AppliedAction{
					{ID: "rewrite.proofread.basic", Name: "Basic proofreading", Category: "rewrite"},
				},
				SystemPrompt: "You are a proofreader.",
				UserPrompt:   "Proofread the text.",
				Parameters:   apperr.PreviewParams{Model: "gpt-4o", Format: "plain", TokenParam: "max_completion_tokens"},
			},
		},
		Summary: "1 step(s) · 1 inference(s)",
	}
}

// ─── PreviewPrompt: happy paths ──────────────────────────────────────────────

func TestActionHandler_PreviewPrompt_SingleActionID_Success(t *testing.T) {
	t.Parallel()
	svc := &mockActionService{previewResult: defaultPreview()}
	h := newPreviewHandler(svc, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{ActionID: "rewrite.proofread.basic"})

	if res.Error != nil {
		t.Fatalf("expected no error, got %v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data")
	}
	if res.Data.Kind != "single" {
		t.Errorf("Kind = %q, want %q", res.Data.Kind, "single")
	}
	if res.Data.Inferences != 1 {
		t.Errorf("Inferences = %d, want 1", res.Data.Inferences)
	}
}

func TestActionHandler_PreviewPrompt_Steps_Success(t *testing.T) {
	t.Parallel()
	chainPreview := &apperr.PromptPreview{Kind: "chain", Inferences: 2, Groups: []apperr.PreviewGroup{{}, {}}}
	svc := &mockActionService{previewResult: chainPreview}
	h := newPreviewHandler(svc, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{
		Steps: []apperr.ChainStep{{ActionID: "rewrite.proofread.basic"}, {ActionID: "summarize.summary"}},
	})

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data")
	}
	if res.Data.Kind != "chain" {
		t.Errorf("Kind = %q, want %q", res.Data.Kind, "chain")
	}
}

func TestActionHandler_PreviewPrompt_StackID_ResolvesAndSucceeds(t *testing.T) {
	t.Parallel()
	savedStack := &apperr.SavedStack{
		ID:    "stack-1",
		Name:  "My Stack",
		Steps: []string{"rewrite.proofread.basic"},
	}
	lookup := &mockStackLookup{result: apperr.StackResult{Data: savedStack}}
	svc := &mockActionService{previewResult: defaultPreview()}
	h := newPreviewHandler(svc, lookup)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{StackID: "stack-1"})

	if res.Error != nil {
		t.Fatalf("unexpected error: %v", res.Error)
	}
	if res.Data == nil {
		t.Fatal("expected non-nil Data")
	}
}

// ─── PreviewPrompt: validation errors ────────────────────────────────────────

func TestActionHandler_PreviewPrompt_ZeroSpecifiers_ValidationError(t *testing.T) {
	t.Parallel()
	h := newPreviewHandler(&mockActionService{}, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{})

	if res.Error == nil {
		t.Fatal("expected validation error for 0 specifiers")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected code=validation, got %q", res.Error.Code)
	}
}

func TestActionHandler_PreviewPrompt_TwoSpecifiers_ValidationError(t *testing.T) {
	t.Parallel()
	h := newPreviewHandler(&mockActionService{}, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{
		ActionID: "rewrite.proofread.basic",
		Steps:    []apperr.ChainStep{{ActionID: "rewrite.proofread.basic"}},
	})

	if res.Error == nil {
		t.Fatal("expected validation error for 2 specifiers")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected code=validation, got %q", res.Error.Code)
	}
}

func TestActionHandler_PreviewPrompt_ThreeSpecifiers_ValidationError(t *testing.T) {
	t.Parallel()
	h := newPreviewHandler(&mockActionService{}, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{
		ActionID: "x",
		Steps:    []apperr.ChainStep{{ActionID: "y"}},
		StackID:  "z",
	})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for 3 specifiers, got %v", res.Error)
	}
}

// ─── PreviewPrompt: StackID error paths ──────────────────────────────────────

func TestActionHandler_PreviewPrompt_StackID_NilLookup_InternalError(t *testing.T) {
	t.Parallel()
	h := newPreviewHandler(&mockActionService{}, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{StackID: "any-id"})

	if res.Error == nil {
		t.Fatal("expected internal error when stackLookup is nil")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", res.Error.Code)
	}
}

func TestActionHandler_PreviewPrompt_StackID_LookupReturnsError(t *testing.T) {
	t.Parallel()
	wire := apperr.WireError{Code: apperr.CodeValidation, Title: "not found", Message: "stack not found"}
	lookup := &mockStackLookup{result: apperr.StackResult{Error: &wire}}
	h := newPreviewHandler(&mockActionService{}, lookup)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{StackID: "missing-id"})

	if res.Error == nil {
		t.Fatal("expected error propagated from stack lookup")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected code=validation, got %q", res.Error.Code)
	}
}

func TestActionHandler_PreviewPrompt_StackID_LookupReturnsNilData_ValidationError(t *testing.T) {
	t.Parallel()
	lookup := &mockStackLookup{result: apperr.StackResult{Data: nil}}
	h := newPreviewHandler(&mockActionService{}, lookup)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{StackID: "some-id"})

	if res.Error == nil || res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected validation error for nil Data, got %v", res.Error)
	}
}

// ─── PreviewPrompt: service error + panic ────────────────────────────────────

func TestActionHandler_PreviewPrompt_ServiceError_ReturnsError(t *testing.T) {
	t.Parallel()
	svc := &mockActionService{previewErr: apperr.Validation("steps", "at least one step", "0 steps provided")}
	h := newPreviewHandler(svc, nil)

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{ActionID: "rewrite.proofread.basic"})

	if res.Error == nil {
		t.Fatal("expected error from service, got nil")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("expected code=validation, got %q", res.Error.Code)
	}
}

func TestActionHandler_PreviewPrompt_PanicRecovery(t *testing.T) {
	t.Parallel()
	h := &ActionHandler{
		zlog:                zerolog.Nop(),
		actionService:       &panicActionService{},
		verificationService: &mockVerificationService{},
		gate:                gate.New(),
	}

	res := h.PreviewPrompt(apperr.PromptPreviewRequest{ActionID: "x"})

	if res.Error == nil || res.Error.Code != apperr.CodeInternal {
		t.Errorf("expected internal error from panic recovery, got %v", res.Error)
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
func (p *panicActionService) GetActionCatalog() []apperr.ActionMeta {
	panic("panic GetActionCatalog")
}
func (p *panicActionService) BuildPlanAndPrompts(_ apperr.PromptPreviewRequest) (*apperr.PromptPreview, error) {
	panic("panic BuildPlanAndPrompts")
}
func (p *panicActionService) RunChain(_ context.Context, _ apperr.ChainRequest, _ func(apperr.StepProgress)) (*apperr.ChainResult, error) {
	panic("panic RunChain")
}

// ─── CancelAllRuns ───────────────────────────────────────────────────────────

func TestActionHandler_CancelAllRuns_CancelsAndClearsRegistry(t *testing.T) {
	t.Parallel()

	var run1Cancelled, run2Cancelled bool
	h := &ActionHandler{
		zlog: zerolog.Nop(),
		runs: map[string]context.CancelFunc{
			"run-1": func() { run1Cancelled = true },
			"run-2": func() { run2Cancelled = true },
		},
	}

	h.CancelAllRuns()

	if !run1Cancelled || !run2Cancelled {
		t.Errorf("expected every registered run to be cancelled: run1=%v run2=%v", run1Cancelled, run2Cancelled)
	}
	if len(h.runs) != 0 {
		t.Errorf("expected the run registry to be cleared, got %d entries", len(h.runs))
	}
}

func TestActionHandler_CancelAllRuns_EmptyRegistryIsNoOp(t *testing.T) {
	t.Parallel()

	h := &ActionHandler{zlog: zerolog.Nop()}

	h.CancelAllRuns()
}

// ─── SetContext ──────────────────────────────────────────────────────────────

func TestActionHandler_SetContext_StoresContext(t *testing.T) {
	t.Parallel()

	h := &ActionHandler{zlog: zerolog.Nop()}
	ctx := context.Background()

	h.SetContext(ctx)

	if h.appCtx != ctx {
		t.Errorf("appCtx not stored: want %v, got %v", ctx, h.appCtx)
	}
}
