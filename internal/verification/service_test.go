package verification

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/gate"
	"go_text/internal/llms"
	"go_text/internal/settings"

	"resty.dev/v3"
)

// testLogger is a minimal logger.Logger that discards all output.
type testLogger struct{}

func (l *testLogger) Print(msg string)   {}
func (l *testLogger) Trace(msg string)   {}
func (l *testLogger) Debug(msg string)   {}
func (l *testLogger) Info(msg string)    {}
func (l *testLogger) Warning(msg string) {}
func (l *testLogger) Error(msg string)   {}
func (l *testLogger) Fatal(msg string)   {}

// stubSettingsService implements settings.SettingsServiceAPI, exposing only
// GetModelConfig as configurable; every other method is unused by the
// verification package and returns zero values. Defaults GetModelConfig to a
// zero-value ModelConfig (every Use* flag off) so tests that don't care about
// ModelConfig see the pre-fix request shape (no optional fields set).
type stubSettingsService struct {
	modelCfg *settings.ModelConfig
	modelErr error
}

func (s *stubSettingsService) GetModelConfig() (*settings.ModelConfig, error) {
	if s.modelErr != nil {
		return nil, s.modelErr
	}
	if s.modelCfg != nil {
		return s.modelCfg, nil
	}
	return &settings.ModelConfig{}, nil
}
func (s *stubSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	return nil, nil
}
func (s *stubSettingsService) GetSettings() (*settings.Settings, error)            { return nil, nil }
func (s *stubSettingsService) ResetSettingsToDefault() (*settings.Settings, error) { return nil, nil }
func (s *stubSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) CreateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) DeleteProviderConfig(_ string) error { return nil }
func (s *stubSettingsService) SetAsCurrentProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateInferenceBaseConfig(_ *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateModelConfig(_ *settings.ModelConfig) (*settings.ModelConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error) { return nil, nil }
func (s *stubSettingsService) SetDefaultInputLanguage(_ string) error               { return nil }
func (s *stubSettingsService) SetDefaultOutputLanguage(_ string) error              { return nil }
func (s *stubSettingsService) AddLanguage(_ string) ([]string, error)               { return nil, nil }
func (s *stubSettingsService) RemoveLanguage(_ string) ([]string, error)            { return nil, nil }
func (s *stubSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateAppBehaviorConfig(_ *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetUIPreferencesConfig() (*settings.UIPreferencesConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateUIPreferencesConfig(_ *settings.UIPreferencesConfig) (*settings.UIPreferencesConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error) { return nil, nil }
func (s *stubSettingsService) UpdateLoggingConfig(_ *settings.LoggingConfig) (*settings.LoggingConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetWindowSizeConfig() (*settings.WindowSizeConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) SaveWindowSize(_, _ int) error { return nil }

// newTestService builds a Service and finalizes the draft config to point at
// the given httptest server. The returned config is what callers pass to the
// check methods. TestConnection/TestModels read no saved settings;
// TestInference reads ModelConfig via a stub defaulting to all-flags-off (see
// stubSettingsService) unless a test builds a Service literal directly with a
// configured stub.
func newTestService(t *testing.T, baseURL string, kind llms.ProviderKind, cfg settings.ProviderConfig, g *gate.InferenceGate) (*Service, settings.ProviderConfig) {
	t.Helper()
	cfg.BaseURL = baseURL
	cfg.Kind = string(kind)
	return &Service{
		wlog:            &testLogger{},
		factory:         llms.NewProviderFactory(resty.New()),
		settingsService: &stubSettingsService{},
		gate:            g,
	}, cfg
}

func baseProviderCfg(name string) settings.ProviderConfig {
	return settings.ProviderConfig{
		ID:         "p1",
		Name:       name,
		AuthScheme: string(llms.AuthNone),
	}
}

// ─── TestConnection ──────────────────────────────────────────────────────────

func TestService_TestConnection_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[]}`))
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestConnection(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	if outcome.Check != "connection" {
		t.Errorf("expected check=connection, got %q", outcome.Check)
	}
	if outcome.DurationMs < 0 {
		t.Errorf("expected non-negative duration")
	}
}

func TestService_TestConnection_Auth401(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestConnection(cfg)
	if err == nil {
		t.Fatal("expected error for 401, got nil")
	}
	if outcome == nil {
		t.Fatal("expected non-nil outcome on auth failure")
	}
	if outcome.OK {
		t.Error("expected OK=false on auth failure")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeAuth {
		t.Errorf("expected code=auth, got %q", ae.Code)
	}
}

func TestService_TestConnection_Auth403(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestConnection(cfg)
	if err == nil {
		t.Fatal("expected error for 403")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError")
	}
	if ae.Code != apperr.CodeAuth {
		t.Errorf("expected code=auth, got %q", ae.Code)
	}
}

func TestService_TestConnection_Unreachable(t *testing.T) {
	t.Parallel()
	// Point at a port that won't accept connections.
	cfg := baseProviderCfg("TestProv")
	cfg.BaseURL = "http://127.0.0.1:19999"
	cfg.Kind = string(llms.KindOpenAI)
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		gate:    gate.New(),
	}

	outcome, err := svc.TestConnection(cfg)
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeProviderUnreachable {
		t.Errorf("expected code=provider_unreachable, got %q", ae.Code)
	}
}

func TestService_TestConnection_MissingCredential(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := settings.ProviderConfig{
		ID:           "p1",
		Name:         "TestProv",
		Kind:         string(llms.KindOpenAI),
		BaseURL:      srv.URL,
		AuthScheme:   string(llms.AuthBearer),
		APIKeyEnvVar: "TEST_T09_MISSING_KEY_XYZ_UNIQUE",
	}
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		gate:    gate.New(),
	}

	outcome, err := svc.TestConnection(cfg)
	if err == nil {
		t.Fatal("expected missing_credential error")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeMissingCredential {
		t.Errorf("expected code=missing_credential, got %q", ae.Code)
	}
}

func TestService_TestConnection_404_IsReachable(t *testing.T) {
	t.Parallel()
	// 404 from the models endpoint → reachable (server responded), just no models path.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestConnection(cfg)
	if err != nil {
		t.Fatalf("unexpected error for 404 (server reachable): %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true: 404 means server is running")
	}
}

// ─── TestModels ──────────────────────────────────────────────────────────────

func successModelsBody() []byte {
	body := map[string]any{
		"data": []map[string]string{
			{"id": "gpt-4o"},
			{"id": "gpt-3.5-turbo"},
		},
	}
	b, _ := json.Marshal(body)
	return b
}

func TestService_TestModels_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successModelsBody())
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestModels(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	if outcome.Check != "models" {
		t.Errorf("expected check=models, got %q", outcome.Check)
	}
	if outcome.ModelCount != 2 {
		t.Errorf("expected ModelCount=2, got %d", outcome.ModelCount)
	}
	if outcome.Sample != "gpt-4o" {
		t.Errorf("expected Sample=gpt-4o, got %q", outcome.Sample)
	}
}

func TestService_TestModels_EmptyList(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"data":[]}`))
	}))
	defer srv.Close()

	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, baseProviderCfg("TestProv"), gate.New())

	outcome, err := svc.TestModels(cfg)
	if err == nil {
		t.Fatal("expected error for empty model list")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeModelNotFound {
		t.Errorf("expected code=model_not_found, got %q", ae.Code)
	}
}

func TestService_TestModels_Unreachable(t *testing.T) {
	t.Parallel()
	cfg := baseProviderCfg("TestProv")
	cfg.BaseURL = "http://127.0.0.1:19999"
	cfg.Kind = string(llms.KindOpenAI)
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		gate:    gate.New(),
	}

	outcome, err := svc.TestModels(cfg)
	if err == nil {
		t.Fatal("expected error for unreachable host")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError")
	}
	if ae.Code != apperr.CodeProviderUnreachable {
		t.Errorf("expected code=provider_unreachable, got %q", ae.Code)
	}
}

// ─── TestInference ───────────────────────────────────────────────────────────

func successChatBody(content string) []byte {
	type msg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type choice struct {
		Message msg `json:"message"`
	}
	body := map[string]any{
		"choices": []choice{{Message: msg{Role: "assistant", Content: content}}},
	}
	b, _ := json.Marshal(body)
	return b
}

func TestService_TestInference_Success(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody("Hello from the model"))
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, cfg, gate.New())

	outcome, err := svc.TestInference(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	if outcome.Check != "inference" {
		t.Errorf("expected check=inference, got %q", outcome.Check)
	}
	if outcome.Sample == "" {
		t.Error("expected non-empty sample")
	}
}

func TestService_TestInference_GateBusy(t *testing.T) {
	t.Parallel()
	g := gate.New()
	if !g.TryAcquire() {
		t.Fatal("setup: could not acquire gate")
	}
	defer g.Release()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		gate:    g,
	}

	outcome, err := svc.TestInference(cfg)
	if err == nil {
		t.Fatal("expected busy error")
	}
	if outcome == nil {
		t.Fatal("expected non-nil outcome on busy")
	}
	if outcome.OK {
		t.Error("expected OK=false when busy")
	}
	if outcome.Check != "inference" {
		t.Errorf("expected check=inference, got %q", outcome.Check)
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeBusy {
		t.Errorf("expected code=busy, got %q", ae.Code)
	}
}

func TestService_TestInference_GateReleasedAfterBusy(t *testing.T) {
	t.Parallel()
	// Verify the gate is still releasable after the busy short-circuit.
	g := gate.New()
	if !g.TryAcquire() {
		t.Fatal("setup: could not acquire gate")
	}

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		gate:    g,
	}

	svc.TestInference(cfg) //nolint:errcheck // we only care about the gate state here
	g.Release()            // release the originally held lock

	// Gate should now be free.
	if !g.TryAcquire() {
		t.Fatal("gate must be free after release")
	}
	g.Release()
}

func TestService_TestInference_Auth401(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, cfg, gate.New())

	outcome, err := svc.TestInference(cfg)
	if err == nil {
		t.Fatal("expected auth error")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError")
	}
	if ae.Code != apperr.CodeAuth {
		t.Errorf("expected code=auth, got %q", ae.Code)
	}
}

func TestService_TestInference_MissingSelectedModel(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	// cfg.SelectedModel intentionally empty — verifies the draft-config contract
	// still rejects an empty model even when called pre-save.
	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, cfg, gate.New())

	outcome, err := svc.TestInference(cfg)
	if err == nil {
		t.Fatal("expected validation error for empty selectedModel")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError")
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("expected code=validation, got %q", ae.Code)
	}
}

func TestService_TestInference_GateReleasedOnError(t *testing.T) {
	t.Parallel()
	// Server returns 500 → gate must still be released.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	g := gate.New()
	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, cfg, g)

	svc.TestInference(cfg) //nolint:errcheck

	// After call the gate must be free again.
	if !g.TryAcquire() {
		t.Fatal("gate must be released after TestInference even on error")
	}
	g.Release()
}

// --- TestInference now applies the saved ModelConfig, mirroring a real chain run (T65) ---

func TestService_TestInference_AppliesModelConfig_OpenAICompatible(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody("ok"))
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	cfg.BaseURL = srv.URL
	cfg.Kind = string(llms.KindOpenAI)
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		settingsService: &stubSettingsService{modelCfg: &settings.ModelConfig{
			UseTemperature:     true,
			Temperature:        0.7,
			UseMaxOutputTokens: true,
			MaxOutputTokens:    256,
			UseLegacyMaxTokens: true,
		}},
		gate: gate.New(),
	}

	outcome, err := svc.TestInference(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	if capturedBody["temperature"] != 0.7 {
		t.Errorf("want temperature=0.7, got %v", capturedBody["temperature"])
	}
	if capturedBody["max_tokens"] != float64(256) {
		t.Errorf("want max_tokens=256, got %v", capturedBody["max_tokens"])
	}
	if _, ok := capturedBody["max_completion_tokens"]; ok {
		t.Error("max_completion_tokens must not be set when UseLegacyMaxTokens is true")
	}
}

func TestService_TestInference_AppliesModelConfig_OllamaNative(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successNativeChatBody("ok"))
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "llama3"
	cfg.BaseURL = srv.URL
	cfg.Kind = string(llms.KindOllama)
	svc := &Service{
		wlog:    &testLogger{},
		factory: llms.NewProviderFactory(resty.New()),
		settingsService: &stubSettingsService{modelCfg: &settings.ModelConfig{
			UseTemperature:   true,
			Temperature:      0.3,
			UseContextWindow: true,
			ContextWindow:    8192,
		}},
		gate: gate.New(),
	}

	outcome, err := svc.TestInference(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	if _, ok := capturedBody["temperature"]; ok {
		t.Error("temperature must not be a top-level field for the native endpoint")
	}
	options, ok := capturedBody["options"].(map[string]any)
	if !ok {
		t.Fatalf("expected options object, got body: %v", capturedBody)
	}
	if options["temperature"] != 0.3 {
		t.Errorf("want options.temperature=0.3, got %v", options["temperature"])
	}
	if options["num_ctx"] != float64(8192) {
		t.Errorf("want options.num_ctx=8192, got %v", options["num_ctx"])
	}
}

func TestService_TestInference_ModelConfigDisabled_OmitsFields(t *testing.T) {
	t.Parallel()
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&capturedBody); err != nil {
			t.Fatalf("decode request body: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write(successChatBody("ok"))
	}))
	defer srv.Close()

	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	svc, cfg := newTestService(t, srv.URL, llms.KindOpenAI, cfg, gate.New())

	outcome, err := svc.TestInference(cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !outcome.OK {
		t.Error("expected OK=true")
	}
	for _, field := range []string{"temperature", "max_tokens", "max_completion_tokens", "options"} {
		if _, ok := capturedBody[field]; ok {
			t.Errorf("want %q omitted when ModelConfig has every Use* flag off, got: %v", field, capturedBody[field])
		}
	}
}

func TestService_TestInference_ModelConfigFetchError(t *testing.T) {
	t.Parallel()
	g := gate.New()
	cfg := baseProviderCfg("TestProv")
	cfg.SelectedModel = "gpt-4o"
	cfg.Kind = string(llms.KindOpenAI)
	svc := &Service{
		wlog:            &testLogger{},
		factory:         llms.NewProviderFactory(resty.New()),
		settingsService: &stubSettingsService{modelErr: errors.New("db unavailable")},
		gate:            g,
	}

	outcome, err := svc.TestInference(cfg)
	if err == nil {
		t.Fatal("expected error when ModelConfig cannot be read")
	}
	if outcome.OK {
		t.Error("expected OK=false")
	}
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("expected *apperr.AppError, got %T", err)
	}
	if ae.Code != apperr.CodeInternal {
		t.Errorf("expected code=internal, got %q", ae.Code)
	}

	// The gate must still be released even though the check failed before the LLM call.
	if !g.TryAcquire() {
		t.Fatal("gate must be released after a ModelConfig fetch error")
	}
	g.Release()
}

// successNativeChatBody builds a minimal Ollama native /api/chat response body.
func successNativeChatBody(content string) []byte {
	type msg struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	body := map[string]any{
		"message":     msg{Role: "assistant", Content: content},
		"done_reason": "stop",
	}
	b, _ := json.Marshal(body)
	return b
}
