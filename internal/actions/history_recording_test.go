package actions

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/llms"
	"go_text/internal/prompts"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"resty.dev/v3"
)

// recordingHistoryService captures Record() calls.
// It always records (no enabled-check) — simulates history enabled at the service layer.
type recordingHistoryService struct {
	recorded []apperr.HistoryEntry
}

func (r *recordingHistoryService) Record(e apperr.HistoryEntry)                   { r.recorded = append(r.recorded, e) }
func (r *recordingHistoryService) List(_, _ int64) ([]apperr.HistoryEntry, error) { return nil, nil }
func (r *recordingHistoryService) Get(_ string) (*apperr.HistoryEntry, error)     { return nil, nil }
func (r *recordingHistoryService) Delete(_ string) error                          { return nil }
func (r *recordingHistoryService) Clear() error                                   { return nil }
func (r *recordingHistoryService) Count() (int64, error)                          { return 0, nil }

// newChainServiceWithRecording wires a real ActionService with a recording history service.
// Reuses orchestratorSettings and testSettingsCfg from orchestrator_test.go (same package).
func newChainServiceWithRecording(t *testing.T, serverURL string, hist *recordingHistoryService) ActionServiceAPI {
	t.Helper()
	wlog := logger.NewDefaultLogger()
	settingsSvc := &orchestratorSettings{cfg: testSettingsCfg(serverURL)}
	restyClient := resty.New().SetTimeout(10 * time.Second)
	factory := llms.NewProviderFactory(restyClient)
	llmSvc := llms.NewLLMApiService(wlog, factory, settingsSvc)
	promptSvc := prompts.NewPromptService(wlog)
	return NewActionService(wlog, promptSvc, llmSvc, settingsSvc, &noopTaskLog{}, hist)
}

// errorServerFor returns an httptest.Server that always responds HTTP 500.
func errorServerFor(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":{"message":"server error","type":"server_error"}}`))
	}))
}

func TestRunChain_RecordsHistory_Success_SingleStep(t *testing.T) {
	t.Parallel()
	srv := completionServerFor(t, []string{"improved text"})
	defer srv.Close()

	hist := &recordingHistoryService{}
	svc := newChainServiceWithRecording(t, srv.URL, hist)
	actionID := oneFamilyStep(t, svc)

	result, err := svc.RunChain(context.Background(), apperr.ChainRequest{
		RunID:     "run-hist-1",
		InputText: "test input",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}, nil)
	if err != nil {
		t.Fatalf("RunChain error: %v", err)
	}
	if result == nil {
		t.Fatal("nil result")
	}
	if len(hist.recorded) != 1 {
		t.Fatalf("expected 1 history entry, got %d", len(hist.recorded))
	}
	e := hist.recorded[0]
	if e.ID != "run-hist-1" {
		t.Errorf("id = %q, want run-hist-1", e.ID)
	}
	if e.Status != "success" {
		t.Errorf("status = %q, want success", e.Status)
	}
	if e.Kind != "single" {
		t.Errorf("kind = %q, want single", e.Kind)
	}
	if e.InputText != "test input" {
		t.Errorf("inputText = %q, want \"test input\"", e.InputText)
	}
	if e.Inferences != 1 {
		t.Errorf("inferences = %d, want 1", e.Inferences)
	}
	if e.DurationMs < 0 {
		t.Errorf("durationMs = %d, want >= 0", e.DurationMs)
	}
}

func TestRunChain_RecordsHistory_StepFailed_StatusError(t *testing.T) {
	t.Parallel()
	errSrv := errorServerFor(t)
	defer errSrv.Close()

	hist := &recordingHistoryService{}
	svc := newChainServiceWithRecording(t, errSrv.URL, hist)
	actionID := oneFamilyStep(t, svc)

	_, _ = svc.RunChain(context.Background(), apperr.ChainRequest{
		RunID:     "run-hist-fail",
		InputText: "input",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}, nil)

	if len(hist.recorded) != 1 {
		t.Fatalf("expected 1 entry on step failure, got %d", len(hist.recorded))
	}
	e := hist.recorded[0]
	// First step failed → completed=0 → status="error"
	if e.Status != "error" {
		t.Errorf("status = %q, want error (completed=0)", e.Status)
	}
	if e.ErrorCode == "" {
		t.Error("expected non-empty errorCode on failure")
	}
}

func TestRunChain_RecordsHistory_MultiStep_KindStack(t *testing.T) {
	t.Parallel()
	srv := completionServerFor(t, []string{"step1 output", "step2 output"})
	defer srv.Close()

	hist := &recordingHistoryService{}
	svc := newChainServiceWithRecording(t, srv.URL, hist)
	id0, id1 := twoFamilySteps(t, svc)

	_, _ = svc.RunChain(context.Background(), apperr.ChainRequest{
		RunID:     "run-hist-multi",
		InputText: "input",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	}, nil)

	if len(hist.recorded) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(hist.recorded))
	}
	if hist.recorded[0].Kind != "stack" {
		t.Errorf("kind = %q, want stack (two steps)", hist.recorded[0].Kind)
	}
}

func TestRunChain_RecordsHistory_Cancelled_NoPanic(t *testing.T) {
	t.Parallel()
	srv := completionServerFor(t, []string{"output"})
	defer srv.Close()

	hist := &recordingHistoryService{}
	svc := newChainServiceWithRecording(t, srv.URL, hist)
	actionID := oneFamilyStep(t, svc)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel immediately before any step runs

	_, _ = svc.RunChain(ctx, apperr.ChainRequest{
		RunID:     "run-hist-cancel",
		InputText: "input",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}, nil)
	// Must not panic. Entry may or may not be recorded depending on cancellation timing.
}
