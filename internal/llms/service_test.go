package llms

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
	"resty.dev/v3"
)

// ── helpers ──────────────────────────────────────────────────────────────────

type stubSettingsService struct {
	inferCfg *settings.InferenceBaseConfig
	inferErr error
}

func (s *stubSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	if s.inferErr != nil {
		return nil, s.inferErr
	}
	if s.inferCfg != nil {
		return s.inferCfg, nil
	}
	return &settings.InferenceBaseConfig{Timeout: 30, MaxRetries: 3}, nil
}
func (s *stubSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	return nil, nil
}
func (s *stubSettingsService) GetSettings() (*settings.Settings, error)                            { return nil, nil }
func (s *stubSettingsService) ResetSettingsToDefault() (*settings.Settings, error)                 { return nil, nil }
func (s *stubSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error)           { return nil, nil }
func (s *stubSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error)         { return nil, nil }
func (s *stubSettingsService) GetProviderConfig(_ string) (*settings.ProviderConfig, error)        { return nil, nil }
func (s *stubSettingsService) CreateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateProviderConfig(_ *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) DeleteProviderConfig(_ string) error                       { return nil }
func (s *stubSettingsService) SetAsCurrentProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateInferenceBaseConfig(_ *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetModelConfig() (*settings.ModelConfig, error)                                   { return nil, nil }
func (s *stubSettingsService) UpdateModelConfig(_ *settings.ModelConfig) (*settings.ModelConfig, error)         { return nil, nil }
func (s *stubSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error)                             { return nil, nil }
func (s *stubSettingsService) SetDefaultInputLanguage(_ string) error                                           { return nil }
func (s *stubSettingsService) SetDefaultOutputLanguage(_ string) error                                          { return nil }
func (s *stubSettingsService) AddLanguage(_ string) ([]string, error)                                           { return nil, nil }
func (s *stubSettingsService) RemoveLanguage(_ string) ([]string, error)                                        { return nil, nil }
func (s *stubSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error)                       { return nil, nil }
func (s *stubSettingsService) UpdateAppBehaviorConfig(_ *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error)                               { return nil, nil }
func (s *stubSettingsService) UpdateLoggingConfig(_ *settings.LoggingConfig) (*settings.LoggingConfig, error)   { return nil, nil }

func newTestLLMService(t *testing.T) *LLMService {
	t.Helper()
	client := resty.New()
	factory := NewProviderFactory(client)
	svc := NewLLMApiService(logger.NewDefaultLogger(), factory, &stubSettingsService{})
	return svc.(*LLMService)
}

func openAIProvider(baseURL string) *settings.ProviderConfig {
	return &settings.ProviderConfig{
		Name:           "test-openai",
		Kind:           "openai",
		BaseURL:        baseURL + "/",
		AuthScheme:     "none",
		CompletionPath: "/v1/chat/completions",
		ModelsPath:     "/v1/models",
	}
}

// ── GetModelsInfoForProvider ──────────────────────────────────────────────────

func TestGetModelsInfoForProvider_CustomModels_SkipsHTTP(t *testing.T) {
	t.Parallel()
	svc := newTestLLMService(t)
	provider := &settings.ProviderConfig{
		Name:            "custom",
		Kind:            "openai",
		BaseURL:         "http://unreachable.invalid/",
		AuthScheme:      "none",
		UseCustomModels: true,
		CustomModels:    []string{"my-model-a", "my-model-b"},
	}

	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 models, got %d", len(got))
	}
	if got[0].ID != "my-model-a" || got[0].Label != "my-model-a" {
		t.Errorf("want ID=Label=my-model-a, got %+v", got[0])
	}
	if got[0].Caps != nil {
		t.Error("want Caps=nil for custom models")
	}
}

func TestGetModelsInfoForProvider_DiscoverySuccess_ReturnsCaps(t *testing.T) {
	t.Parallel()
	body := map[string]any{
		"data": []map[string]any{
			{
				"id":           "azure-gpt-4",
				"display_name": "GPT-4 Turbo",
				"capabilities": map[string]bool{"chat_completion": true},
				"features":     map[string]any{"temperature": true},
				"limits":       map[string]any{"max_prompt_tokens": 8192},
			},
		},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(body)
	}))
	defer srv.Close()

	svc := newTestLLMService(t)
	provider := &settings.ProviderConfig{
		Name:       "azure-test",
		Kind:       "azure",
		BaseURL:    srv.URL + "/",
		AuthScheme: "none",
		ModelsPath: "/v1/models",
	}

	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("want 1 model, got %d", len(got))
	}
	m := got[0]
	if m.ID != "azure-gpt-4" {
		t.Errorf("want ID=azure-gpt-4, got %q", m.ID)
	}
	if m.Label != "GPT-4 Turbo" {
		t.Errorf("want Label=GPT-4 Turbo, got %q", m.Label)
	}
	if m.Caps == nil {
		t.Fatal("want non-nil Caps for rich catalog")
	}
	if m.Caps.SupportsTemperature == nil || !*m.Caps.SupportsTemperature {
		t.Error("want SupportsTemperature=true")
	}
	if m.Caps.MaxPromptTokens == nil || *m.Caps.MaxPromptTokens != 8192 {
		t.Errorf("want MaxPromptTokens=8192, got %v", m.Caps.MaxPromptTokens)
	}
}

func TestGetModelsInfoForProvider_PlainCatalog_NilCaps(t *testing.T) {
	t.Parallel()
	body := `{"data":[{"id":"gpt-4o"},{"id":"gpt-3.5-turbo"}]}`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	svc := newTestLLMService(t)
	provider := openAIProvider(srv.URL)

	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 models, got %d", len(got))
	}
	for _, m := range got {
		if m.Caps != nil {
			t.Errorf("want Caps=nil for plain catalog, got %+v for model %q", m.Caps, m.ID)
		}
	}
}

func TestGetModelsInfoForProvider_DiscoveryFails_FallsBackToCustom(t *testing.T) {
	t.Parallel()
	// Server returns 500 to simulate discovery failure
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer srv.Close()

	svc := newTestLLMService(t)
	provider := &settings.ProviderConfig{
		Name:         "fallback-test",
		Kind:         "openai",
		BaseURL:      srv.URL + "/",
		AuthScheme:   "none",
		ModelsPath:   "/v1/models",
		CustomModels: []string{"fallback-model"},
	}

	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 || got[0].ID != "fallback-model" {
		t.Errorf("want fallback-model, got %v", got)
	}
	if got[0].Caps != nil {
		t.Error("want Caps=nil for fallback custom model")
	}
}

func TestGetModelsInfoForProvider_DiscoveryFails_NoCustomModels_ReturnsEmpty(t *testing.T) {
	t.Parallel()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "server error", http.StatusInternalServerError)
	}))
	defer srv.Close()

	svc := newTestLLMService(t)
	provider := &settings.ProviderConfig{
		Name:       "no-fallback",
		Kind:       "openai",
		BaseURL:    srv.URL + "/",
		AuthScheme: "none",
		ModelsPath: "/v1/models",
	}

	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil {
		t.Error("want non-nil empty slice, got nil")
	}
	if len(got) != 0 {
		t.Errorf("want empty slice, got %v", got)
	}
}

func TestGetModelsInfoForProvider_MissingCredential_SilentFallback(t *testing.T) {
	t.Parallel()
	svc := newTestLLMService(t)
	provider := &settings.ProviderConfig{
		Name:         "auth-test",
		Kind:         "openai",
		BaseURL:      "http://irrelevant.invalid/",
		AuthScheme:   "bearer",
		APIKeyEnvVar: "NONEXISTENT_API_KEY_XYZ_T10",
	}

	// With no CustomModels fallback, missing credential should ultimately return empty
	// (the credential error is silently swallowed and falls back to custom models = []).
	got, err := svc.GetModelsInfoForProvider(provider)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// No custom models → empty non-nil slice
	if got == nil {
		t.Error("want non-nil slice")
	}
}

func TestGetModelsInfoForProvider_NilProvider_ReturnsError(t *testing.T) {
	t.Parallel()
	svc := newTestLLMService(t)
	_, err := svc.GetModelsInfoForProvider(nil)
	if err == nil {
		t.Fatal("want error for nil provider")
	}
}
