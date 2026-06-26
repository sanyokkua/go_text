package actions

import (
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/gate"

	"github.com/rs/zerolog"
)

// mockVerificationService is a stub for verification.ServiceAPI.
type mockVerificationService struct {
	connOutcome  *apperr.VerifyOutcome
	connErr      error
	modelsOutcome *apperr.VerifyOutcome
	modelsErr    error
	inferOutcome *apperr.VerifyOutcome
	inferErr     error
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
