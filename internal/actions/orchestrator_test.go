package actions

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/llms"
	"go_text/internal/logging"
	"go_text/internal/prompts"
	"go_text/internal/settings"
	"go_text/internal/tasklog"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"resty.dev/v3"
)

// ── test helpers ──────────────────────────────────────────────────────────────

// noopTaskLog satisfies tasklog.TaskLogServiceAPI with no side effects.
type noopTaskLog struct{}

func (n *noopTaskLog) LogTaskExecution(_ tasklog.TaskLogEntry) error { return nil }

// captureTaskLog is a spy satisfying tasklog.TaskLogServiceAPI that records every
// entry it receives. It is the observation seam used to verify that RunID threads
// from apperr.ChainRequest through ChatStepRequest into the tasklog entry runStep
// builds — the LLM completion request itself carries no RunID field.
type captureTaskLog struct {
	mu      sync.Mutex
	entries []tasklog.TaskLogEntry
}

func (c *captureTaskLog) LogTaskExecution(entry tasklog.TaskLogEntry) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.entries = append(c.entries, entry)
	return nil
}

func (c *captureTaskLog) capturedEntries() []tasklog.TaskLogEntry {
	c.mu.Lock()
	defer c.mu.Unlock()
	return append([]tasklog.TaskLogEntry(nil), c.entries...)
}

// noopHistoryService satisfies history.HistoryServiceAPI with no side effects.
type noopHistoryService struct{}

func (n *noopHistoryService) Record(_ apperr.HistoryEntry)                   {}
func (n *noopHistoryService) List(_, _ int64) ([]apperr.HistoryEntry, error) { return nil, nil }
func (n *noopHistoryService) Get(_ string) (*apperr.HistoryEntry, error)     { return nil, nil }
func (n *noopHistoryService) Delete(_ string) error                          { return nil }
func (n *noopHistoryService) Clear() error                                   { return nil }
func (n *noopHistoryService) Count() (int64, error)                          { return 0, nil }

// orchestratorSettings is a stubSettingsService variant that returns a real
// *settings.Settings pointing at the given provider URL.
type orchestratorSettings struct {
	stubSettingsService
	cfg *settings.Settings
}

func (s *orchestratorSettings) GetSettings() (*settings.Settings, error) {
	return s.cfg, nil
}

func (s *orchestratorSettings) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	return &s.cfg.CurrentProviderConfig, nil
}

func (s *orchestratorSettings) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	return &s.cfg.InferenceBaseConfig, nil
}

func (s *orchestratorSettings) GetModelConfig() (*settings.ModelConfig, error) {
	return &s.cfg.ModelConfig, nil
}

// testSettingsCfg builds a minimal *settings.Settings aimed at serverURL.
// AuthScheme "none" skips the API key environment variable check in the LLM service.
func testSettingsCfg(serverURL string) *settings.Settings {
	return &settings.Settings{
		CurrentProviderConfig: settings.ProviderConfig{
			Name:           "test-provider",
			Kind:           "openai",
			BaseURL:        serverURL,
			CompletionPath: "/v1/chat/completions",
			AuthScheme:     "none",
		},
		ModelConfig: settings.ModelConfig{
			Name:           "test-model",
			UseTemperature: false,
		},
		InferenceBaseConfig: settings.InferenceBaseConfig{
			UseMarkdownForOutput: false,
		},
	}
}

// completionServerFor creates an httptest.Server that returns each successive
// response string in order, cycling on overrun.
func completionServerFor(t *testing.T, responses []string) *httptest.Server {
	t.Helper()
	var idx int64
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		i := int(atomic.AddInt64(&idx, 1) - 1)
		text := responses[i%len(responses)]
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]any{"role": "assistant", "content": text}},
			},
		})
	}))
}

// newTestChainService creates a real ActionService wired to the given server URL.
func newTestChainService(t *testing.T, serverURL string) ActionServiceAPI {
	t.Helper()
	wlog, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	settingsSvc := &orchestratorSettings{cfg: testSettingsCfg(serverURL)}
	restyClient := resty.New().SetTimeout(10 * time.Second)
	factory := llms.NewProviderFactory(restyClient)
	llmSvc := llms.NewLLMApiService(wlog, factory, settingsSvc)
	promptSvc := prompts.NewPromptService(wlog)
	return NewActionService(wlog, promptSvc, llmSvc, settingsSvc, &noopTaskLog{}, &noopHistoryService{})
}

// newTestChainServiceWithTaskLog is a variant of newTestChainService that wires in
// a caller-supplied tasklog.TaskLogServiceAPI so tests can observe data threaded
// into runStep's ChatStepRequest (e.g. RunID) via the resulting TaskLogEntry.
func newTestChainServiceWithTaskLog(t *testing.T, serverURL string, taskLog tasklog.TaskLogServiceAPI) ActionServiceAPI {
	t.Helper()
	wlog, err := logging.New(logging.DefaultConfig(), false)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	settingsSvc := &orchestratorSettings{cfg: testSettingsCfg(serverURL)}
	restyClient := resty.New().SetTimeout(10 * time.Second)
	factory := llms.NewProviderFactory(restyClient)
	llmSvc := llms.NewLLMApiService(wlog, factory, settingsSvc)
	promptSvc := prompts.NewPromptService(wlog)
	return NewActionService(wlog, promptSvc, llmSvc, settingsSvc, taskLog, &noopHistoryService{})
}

// twoFamilySteps returns action IDs for two steps from different families
// so the Planner creates exactly 2 inference groups.
func twoFamilySteps(t *testing.T, svc ActionServiceAPI) (id0, id1 string) {
	t.Helper()
	catalog := svc.GetActionCatalog()
	families := map[string]string{}
	for _, m := range catalog {
		if _, seen := families[m.Family]; !seen && len(m.Requires) == 0 {
			families[m.Family] = m.ID
		}
		if len(families) >= 2 {
			break
		}
	}
	var fams []string
	for f := range families {
		fams = append(fams, f)
	}
	require.GreaterOrEqual(t, len(fams), 2, "catalog must have at least 2 families")
	return families[fams[0]], families[fams[1]]
}

// oneFamilyStep returns one action ID that requires no extra params.
func oneFamilyStep(t *testing.T, svc ActionServiceAPI) string {
	t.Helper()
	for _, m := range svc.GetActionCatalog() {
		if len(m.Requires) == 0 {
			return m.ID
		}
	}
	t.Fatal("no action without required params in catalog")
	return ""
}

// ── RunChain tests ────────────────────────────────────────────────────────────

func TestRunChain_SingleAction_Success(t *testing.T) {
	t.Parallel()
	server := completionServerFor(t, []string{"transformed output"})
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	actionID := oneFamilyStep(t, svc)

	req := apperr.ChainRequest{
		RunID:     "run-1",
		InputText: "hello world",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}

	result, err := svc.RunChain(context.Background(), req, nil)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "transformed output", result.FinalText)
	assert.Equal(t, 1, result.Completed)
	assert.Nil(t, result.FailedIndex)
}

func TestRunChain_MultiGroup_OutputFeedsInput(t *testing.T) {
	t.Parallel()
	responses := []string{"step0out", "step1out"}
	var callCount int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt64(&callCount, 1)
		resp := responses[n-1]
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"choices": []map[string]any{
				{"message": map[string]any{"role": "assistant", "content": resp}},
			},
		})
	}))
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	id0, id1 := twoFamilySteps(t, svc)

	req := apperr.ChainRequest{
		RunID:     "run-multi",
		InputText: "original",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	}

	result, err := svc.RunChain(context.Background(), req, nil)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "step1out", result.FinalText)
	assert.Equal(t, 2, result.Completed)
	assert.Equal(t, int64(2), atomic.LoadInt64(&callCount), "exactly 2 LLM calls made")
}

func TestRunChain_ProgressEvents_Emitted(t *testing.T) {
	t.Parallel()
	server := completionServerFor(t, []string{"out"})
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	actionID := oneFamilyStep(t, svc)

	var events []apperr.StepProgress
	emitFn := func(p apperr.StepProgress) { events = append(events, p) }

	req := apperr.ChainRequest{
		RunID:     "run-events",
		InputText: "text",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}
	_, err := svc.RunChain(context.Background(), req, emitFn)
	require.NoError(t, err)

	require.Len(t, events, 2) // "running" then "done"
	assert.Equal(t, "running", events[0].Status)
	assert.Equal(t, 0, events[0].GroupIndex)
	assert.Equal(t, 1, events[0].TotalGroups)
	assert.Equal(t, "done", events[1].Status)
	assert.Equal(t, "run-events", events[1].RunID)
}

func TestRunChain_StepFailure_ReturnsPartialAndError(t *testing.T) {
	t.Parallel()
	tmpSvc := newTestChainService(t, "http://placeholder")
	id0, id1 := twoFamilySteps(t, tmpSvc)

	var callCount int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt64(&callCount, 1)
		if n == 1 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"choices": []map[string]any{
					{"message": map[string]any{"role": "assistant", "content": "partial output"}},
				},
			})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":{"message":"fail","type":"server_error"}}`))
		}
	}))
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	req := apperr.ChainRequest{
		RunID:     "run-partial",
		InputText: "original",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	}

	result, err := svc.RunChain(context.Background(), req, nil)

	require.NotNil(t, result, "partial result must be returned even on step failure")
	require.Error(t, err, "error must indicate step failure")

	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, apperr.CodeStepFailed, ae.Code)
	assert.Equal(t, 1, result.Completed)
	assert.Equal(t, "partial output", result.FinalText)
	require.NotNil(t, result.FailedIndex)
	assert.Equal(t, 1, *result.FailedIndex)
}

func TestRunChain_Cancel_KeepsPartialOutput(t *testing.T) {
	t.Parallel()
	tmpSvc := newTestChainService(t, "http://placeholder")
	id0, id1 := twoFamilySteps(t, tmpSvc)

	server := completionServerFor(t, []string{"group0 result", "group1 result"})
	defer server.Close()

	svc := newTestChainService(t, server.URL)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	emitFn := func(p apperr.StepProgress) {
		if p.GroupIndex == 0 && p.Status == "done" {
			cancel()
		}
	}

	req := apperr.ChainRequest{
		RunID:     "run-cancel",
		InputText: "start",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	}
	result, err := svc.RunChain(ctx, req, emitFn)

	require.NotNil(t, result)
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, apperr.CodeCancelled, ae.Code)
	assert.Equal(t, 1, result.Completed)
	assert.Equal(t, "group0 result", result.FinalText)
	assert.Nil(t, result.FailedIndex, "cancel is not a step failure")
}

// TestRunChain_CancelDuringInFlightHTTPCall_AbortsRequest is the T90 repro from the
// 2026-07-03 live-testing report (Finding #9 / P11-T5): cancelling while a group's LLM
// call is already in flight must abort that HTTP request, not let it run to completion.
// The mock server observes r.Context().Done() directly, proving the abort reached the
// transport layer — not just that RunChain returned an error.
func TestRunChain_CancelDuringInFlightHTTPCall_AbortsRequest(t *testing.T) {
	t.Parallel()

	tmpSvc := newTestChainService(t, "http://placeholder")
	actionID := oneFamilyStep(t, tmpSvc)

	serverSawCancellation := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Drain the request body before waiting on r.Context().Done(). Go's net/http
		// server only runs the background read that detects a client disconnect (and
		// thus cancels r.Context()) when it is not blocked waiting on an unread request
		// body. Since the completion request is a POST with a JSON body, an undrained
		// body would suppress close-detection and make this assertion flaky/impossible,
		// independent of whether the app actually aborts the request.
		_, _ = io.Copy(io.Discard, r.Body)
		select {
		case <-r.Context().Done():
			close(serverSawCancellation)
		case <-time.After(5 * time.Second):
			// Only reached if cancellation failed to propagate to the transport.
		}
	}))
	defer server.Close()

	svc := newTestChainService(t, server.URL)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	req := apperr.ChainRequest{
		RunID:     "run-cancel-inflight",
		InputText: "start",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	}

	go func() {
		time.Sleep(100 * time.Millisecond)
		cancel()
	}()

	result, err := svc.RunChain(ctx, req, nil)

	select {
	case <-serverSawCancellation:
		// The in-flight request was genuinely aborted — the fix works.
	case <-time.After(2 * time.Second):
		t.Fatal("mock server never observed request-context cancellation — the HTTP call was not aborted")
	}

	require.NotNil(t, result)
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, apperr.CodeCancelled, ae.Code)
	assert.Equal(t, 0, result.Completed, "the in-flight step never completed")
	assert.Equal(t, "start", result.FinalText, "partial result must keep the pre-step input, not a partial/garbled response")
	assert.Nil(t, result.FailedIndex, "cancel is not a step failure")
}

func TestRunChain_EmptyInput_ReturnsValidationError(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")
	actionID := oneFamilyStep(t, svc)
	req := apperr.ChainRequest{RunID: "run-empty", InputText: "   ", Steps: []apperr.ChainStep{{ActionID: actionID}}}

	result, err := svc.RunChain(context.Background(), req, nil)

	assert.Nil(t, result)
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, apperr.CodeValidation, ae.Code)
}

// TestRunChain_MissingRequirement_ReturnsInvalidPlanError uses the real production
// catalog (via newTestChainService) so translate.text's real Requires values are
// exercised. The "http://unused" server URL means any accidental LLM call would
// fail with a network error instead of the expected code, proving zero LLM calls
// were made without needing an explicit call counter.
func TestRunChain_MissingRequirement_ReturnsInvalidPlanError(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")

	req := apperr.ChainRequest{
		RunID:     "run-missing-req",
		InputText: "hello world",
		Steps:     []apperr.ChainStep{{ActionID: "translate.text"}},
		// InputLanguageID / OutputLanguageID deliberately left empty.
	}

	result, err := svc.RunChain(context.Background(), req, nil)

	assert.Nil(t, result)
	var ae *apperr.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, apperr.CodeInvalidPlan, ae.Code)
}

// TestRunChain_RunID_FlowsIntoTaskLogEntry verifies that apperr.ChainRequest.RunID
// is threaded into ChatStepRequest.RunID for every step runStep executes. The
// LLM completion request itself carries no RunID field, so the tasklog entry
// (built directly from ChatStepRequest inside runStep) is the observable seam.
func TestRunChain_RunID_FlowsIntoTaskLogEntry(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		runID string
	}{
		{name: "non_empty_run_id", runID: "run-correlation-42"},
		{name: "empty_run_id", runID: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			server := completionServerFor(t, []string{"transformed output"})
			defer server.Close()

			capture := &captureTaskLog{}
			svc := newTestChainServiceWithTaskLog(t, server.URL, capture)
			actionID := oneFamilyStep(t, svc)

			req := apperr.ChainRequest{
				RunID:     tt.runID,
				InputText: "hello world",
				Steps:     []apperr.ChainStep{{ActionID: actionID}},
			}

			// Act
			result, err := svc.RunChain(context.Background(), req, nil)

			// Assert
			require.NoError(t, err)
			require.NotNil(t, result)

			entries := capture.capturedEntries()
			require.Len(t, entries, 1, "one tasklog entry expected for a single-group chain")
			assert.Equal(t, tt.runID, entries[0].RunID, "tasklog entry RunID must match ChainRequest.RunID")
		})
	}
}

// TestRunChain_RunID_FlowsIntoEachGroupsTaskLogEntry verifies RunID is threaded
// consistently across every group in a multi-group chain, not just the first.
func TestRunChain_RunID_FlowsIntoEachGroupsTaskLogEntry(t *testing.T) {
	t.Parallel()

	// Arrange
	server := completionServerFor(t, []string{"step0out", "step1out"})
	defer server.Close()

	capture := &captureTaskLog{}
	svc := newTestChainServiceWithTaskLog(t, server.URL, capture)
	id0, id1 := twoFamilySteps(t, svc)

	const wantRunID = "run-multi-correlation"
	req := apperr.ChainRequest{
		RunID:     wantRunID,
		InputText: "original",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	}

	// Act
	result, err := svc.RunChain(context.Background(), req, nil)

	// Assert
	require.NoError(t, err)
	require.NotNil(t, result)

	entries := capture.capturedEntries()
	require.Len(t, entries, 2, "one tasklog entry expected per completed group")
	for i, e := range entries {
		assert.Equal(t, wantRunID, e.RunID, "tasklog entry %d must carry the chain's RunID", i)
	}
}

func TestRunChain_SameLanguageTranslate_NoLLMCall(t *testing.T) {
	t.Parallel()
	var called int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt64(&called, 1)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	svc := newTestChainService(t, server.URL)

	var translateID string
	for _, m := range svc.GetActionCatalog() {
		if m.Family == "translate" {
			translateID = m.ID
			break
		}
	}
	if translateID == "" {
		t.Skip("no translate action in catalog")
	}

	req := apperr.ChainRequest{
		RunID:            "run-same-lang",
		InputText:        "bonjour",
		Steps:            []apperr.ChainStep{{ActionID: translateID}},
		InputLanguageID:  "fr",
		OutputLanguageID: "fr",
	}
	result, err := svc.RunChain(context.Background(), req, nil)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "bonjour", result.FinalText, "input unchanged for same-language translate")
	assert.Equal(t, int64(0), atomic.LoadInt64(&called), "no LLM call made")
}

// ── Handler-level tests ───────────────────────────────────────────────────────

func TestActionHandler_ProcessPromptChain_Success(t *testing.T) {
	t.Parallel()
	server := completionServerFor(t, []string{"result text"})
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	h := NewActionHandler(
		nil,
		svc,
		&mockVerificationService{},
		gate.New(),
	)

	actionID := oneFamilyStep(t, svc)
	res := h.ProcessPromptChain(apperr.ChainRequest{
		RunID:     "h-success",
		InputText: "input",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	})

	assert.Nil(t, res.Error)
	require.NotNil(t, res.Data)
	assert.Equal(t, "result text", res.Data.FinalText)
}

func TestActionHandler_ProcessPromptChain_BusyWhenGateHeld(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")
	g := gate.New()
	h := NewActionHandler(
		nil,
		svc,
		&mockVerificationService{},
		g,
	)

	acquired := g.TryAcquire()
	require.True(t, acquired)
	defer g.Release()

	actionID := oneFamilyStep(t, svc)
	res := h.ProcessPromptChain(apperr.ChainRequest{
		RunID:     "h-busy",
		InputText: "text",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	})

	assert.Nil(t, res.Data, "Data must be nil on busy")
	require.NotNil(t, res.Error)
	assert.Equal(t, string(apperr.CodeBusy), string(res.Error.Code))
}

// TestActionHandler_ProcessPromptChain_MissingRequirement_ReturnsInvalidPlanError
// exercises ProcessPromptChain — the actual Wails-bound method the frontend calls —
// directly, satisfying T88's acceptance criterion.
func TestActionHandler_ProcessPromptChain_MissingRequirement_ReturnsInvalidPlanError(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")
	h := NewActionHandler(
		nil,
		svc,
		&mockVerificationService{},
		gate.New(),
	)

	res := h.ProcessPromptChain(apperr.ChainRequest{
		RunID:     "h-missing-req",
		InputText: "hello world",
		Steps:     []apperr.ChainStep{{ActionID: "translate.text"}},
	})

	assert.Nil(t, res.Data, "Data must be nil when planning rejects the request")
	require.NotNil(t, res.Error)
	assert.Equal(t, string(apperr.CodeInvalidPlan), string(res.Error.Code))
}

func TestActionHandler_ProcessPromptChain_GateReleasedAfterCompletion(t *testing.T) {
	t.Parallel()
	server := completionServerFor(t, []string{"ok"})
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	g := gate.New()
	h := NewActionHandler(nil, svc, &mockVerificationService{}, g)

	actionID := oneFamilyStep(t, svc)
	req := apperr.ChainRequest{RunID: "h-gate-release", InputText: "hello", Steps: []apperr.ChainStep{{ActionID: actionID}}}

	res1 := h.ProcessPromptChain(req)
	assert.Nil(t, res1.Error, "first run must succeed")

	server2 := completionServerFor(t, []string{"ok2"})
	defer server2.Close()
	svc2 := newTestChainService(t, server2.URL)
	h2 := NewActionHandler(nil, svc2, &mockVerificationService{}, g)

	res2 := h2.ProcessPromptChain(req)
	assert.Nil(t, res2.Error, "gate must be released so second run can proceed")
}

func TestActionHandler_ProcessPromptChain_GateReleasedAfterStepFailure(t *testing.T) {
	t.Parallel()
	tmpSvc := newTestChainService(t, "http://unused")
	id0, id1 := twoFamilySteps(t, tmpSvc)

	var callCount int64
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if atomic.AddInt64(&callCount, 1) == 1 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"choices": []map[string]any{
					{"message": map[string]any{"role": "assistant", "content": "partial"}},
				},
			})
		} else {
			w.WriteHeader(http.StatusInternalServerError)
		}
	}))
	defer server.Close()

	svc := newTestChainService(t, server.URL)
	g := gate.New()
	h := NewActionHandler(nil, svc, &mockVerificationService{}, g)

	res := h.ProcessPromptChain(apperr.ChainRequest{
		RunID:     "h-fail",
		InputText: "in",
		Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
	})
	require.NotNil(t, res.Error)
	assert.Equal(t, string(apperr.CodeStepFailed), string(res.Error.Code))

	assert.True(t, g.TryAcquire(), "gate must be released after failed run")
	g.Release()
}

func TestActionHandler_CancelChain_StopsAfterCurrentGroup(t *testing.T) {
	t.Parallel()
	tmpSvc := newTestChainService(t, "http://placeholder")
	id0, id1 := twoFamilySteps(t, tmpSvc)

	startedCh := make(chan struct{})
	var groupCalls int64
	slowServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := atomic.AddInt64(&groupCalls, 1)
		if n == 1 {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"choices": []map[string]any{
					{"message": map[string]any{"role": "assistant", "content": "g0 done"}},
				},
			})
			close(startedCh)
		} else {
			time.Sleep(2 * time.Second)
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer slowServer.Close()

	g := gate.New()
	svc2 := newTestChainService(t, slowServer.URL)
	h2 := NewActionHandler(nil, svc2, &mockVerificationService{}, g)

	runID := "h-cancel"
	resultCh := make(chan apperr.ChainResultEnv, 1)
	go func() {
		req := apperr.ChainRequest{
			RunID:     runID,
			InputText: "start",
			Steps:     []apperr.ChainStep{{ActionID: id0}, {ActionID: id1}},
		}
		resultCh <- h2.ProcessPromptChain(req)
	}()

	select {
	case <-startedCh:
	case <-time.After(5 * time.Second):
		t.Fatal("group 0 did not complete within timeout")
	}
	h2.CancelChain(runID)

	var res apperr.ChainResultEnv
	select {
	case res = <-resultCh:
	case <-time.After(10 * time.Second):
		t.Fatal("ProcessPromptChain did not return within timeout after cancel")
	}

	require.NotNil(t, res.Error, "cancel must set Error")
	assert.Equal(t, string(apperr.CodeCancelled), string(res.Error.Code))
}

func TestActionHandler_CancelChain_UnknownIDIsNoOp(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")
	h := NewActionHandler(nil, svc, &mockVerificationService{}, gate.New())

	res := h.CancelChain("non-existent-run-id")
	assert.Nil(t, res.Error)
}

func TestActionHandler_RunAndTestInference_MutuallyExclusive(t *testing.T) {
	t.Parallel()
	svc := newTestChainService(t, "http://unused")
	g := gate.New()
	acquired := g.TryAcquire()
	require.True(t, acquired)
	defer g.Release()

	h := NewActionHandler(nil, svc, &mockVerificationService{}, g)

	actionID := oneFamilyStep(t, svc)
	res := h.ProcessPromptChain(apperr.ChainRequest{
		RunID:     "h-mutual",
		InputText: "x",
		Steps:     []apperr.ChainStep{{ActionID: actionID}},
	})
	require.NotNil(t, res.Error)
	assert.Equal(t, string(apperr.CodeBusy), string(res.Error.Code))
}
