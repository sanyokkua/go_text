package actions

import (
	"errors"
	"testing"

	"go_text/internal/apperr"
	"go_text/internal/llms"
	"go_text/internal/settings"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

// ── stubs ──────────────────────────────────────────────────────────────────

// stubSettingsService stubs SettingsServiceAPI for GetModelsInfo tests.
// Only GetCurrentProviderConfig and GetProviderConfig are active; all other
// methods are no-ops so the interface is satisfied.
type stubSettingsService struct {
	currentProvider    *settings.ProviderConfig
	currentProviderErr error

	byIDProvider    *settings.ProviderConfig
	byIDErr         error
	capturedByIDArg string // records the providerID passed to GetProviderConfig
}

func (s *stubSettingsService) GetCurrentProviderConfig() (*settings.ProviderConfig, error) {
	return s.currentProvider, s.currentProviderErr
}
func (s *stubSettingsService) GetProviderConfig(providerID string) (*settings.ProviderConfig, error) {
	s.capturedByIDArg = providerID
	return s.byIDProvider, s.byIDErr
}

// ── no-op interface completions for SettingsServiceAPI ─────────────────────

func (s *stubSettingsService) GetAppSettingsMetadata() (*settings.AppSettingsMetadata, error) {
	return nil, nil
}
func (s *stubSettingsService) GetSettings() (*settings.Settings, error)             { return nil, nil }
func (s *stubSettingsService) ResetSettingsToDefault() (*settings.Settings, error)  { return nil, nil }
func (s *stubSettingsService) GetAllProviderConfigs() ([]settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) CreateProviderConfig(cfg *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateProviderConfig(cfg *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) DeleteProviderConfig(_ string) error { return nil }
func (s *stubSettingsService) SetAsCurrentProviderConfig(_ string) (*settings.ProviderConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetInferenceBaseConfig() (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateInferenceBaseConfig(cfg *settings.InferenceBaseConfig) (*settings.InferenceBaseConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetModelConfig() (*settings.ModelConfig, error) { return nil, nil }
func (s *stubSettingsService) UpdateModelConfig(cfg *settings.ModelConfig) (*settings.ModelConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetLanguageConfig() (*settings.LanguageConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) SetDefaultInputLanguage(_ string) error  { return nil }
func (s *stubSettingsService) SetDefaultOutputLanguage(_ string) error { return nil }
func (s *stubSettingsService) AddLanguage(_ string) ([]string, error)  { return nil, nil }
func (s *stubSettingsService) RemoveLanguage(_ string) ([]string, error) {
	return nil, nil
}
func (s *stubSettingsService) GetAppBehaviorConfig() (*settings.AppBehaviorConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) UpdateAppBehaviorConfig(cfg *settings.AppBehaviorConfig) (*settings.AppBehaviorConfig, error) {
	return nil, nil
}
func (s *stubSettingsService) GetLoggingConfig() (*settings.LoggingConfig, error) { return nil, nil }
func (s *stubSettingsService) UpdateLoggingConfig(cfg *settings.LoggingConfig) (*settings.LoggingConfig, error) {
	return nil, nil
}

// stubLLMService stubs LLMServiceAPI for GetModelsInfo tests.
// GetModelsInfoForProvider captures the provider argument so tests can assert
// delegation by pointer identity.
type stubLLMService struct {
	models      []apperr.ModelInfo
	err         error
	called      bool
	gotProvider *settings.ProviderConfig
}

func (s *stubLLMService) GetModelsInfoForProvider(p *settings.ProviderConfig) ([]apperr.ModelInfo, error) {
	s.called = true
	s.gotProvider = p
	return s.models, s.err
}

// ── no-op interface completions for LLMServiceAPI ──────────────────────────

func (s *stubLLMService) GetModelsList() ([]string, error) { return nil, nil }
func (s *stubLLMService) GetCompletionResponse(_ *llms.ChatCompletionRequest) (string, error) {
	return "", nil
}
func (s *stubLLMService) GetModelsListForProvider(_ *settings.ProviderConfig) ([]string, error) {
	return nil, nil
}
func (s *stubLLMService) GetCompletionResponseForProvider(_ *settings.ProviderConfig, _ *llms.ChatCompletionRequest) (string, error) {
	return "", nil
}

// ── helper ─────────────────────────────────────────────────────────────────

// newTestActionService builds an ActionService with only the dependencies
// needed by GetModelsInfo. promptService and taskLogService are intentionally
// nil because GetModelsInfo never touches them.
func newTestActionService(stg *stubSettingsService, llm *stubLLMService) *ActionService {
	return &ActionService{
		logger:          logger.NewDefaultLogger(),
		settingsService: stg,
		llmService:      llm,
	}
}

// ── table-driven: delegation paths ─────────────────────────────────────────

func TestActionService_GetModelsInfo_DelegationPaths(t *testing.T) {
	t.Parallel()

	provider := &settings.ProviderConfig{ID: "p1", Name: "TestProvider"}
	wantModels := []apperr.ModelInfo{
		{ID: "model-a", Label: "Model A"},
		{ID: "model-b", Label: "Model B"},
	}

	tests := []struct {
		name              string
		providerID        string
		currentProvider   *settings.ProviderConfig
		byIDProvider      *settings.ProviderConfig
		wantModels        []apperr.ModelInfo
		wantCurrentCalled bool // GetCurrentProviderConfig should be called
		wantByIDCalled    bool // GetProviderConfig should be called with providerID
		wantByIDArg       string
	}{
		{
			name:              "empty_providerID_uses_current_provider",
			providerID:        "",
			currentProvider:   provider,
			byIDProvider:      nil,
			wantModels:        wantModels,
			wantCurrentCalled: true,
			wantByIDCalled:    false,
		},
		{
			name:              "non_empty_providerID_resolves_by_id",
			providerID:        "p1",
			currentProvider:   nil,
			byIDProvider:      provider,
			wantModels:        wantModels,
			wantCurrentCalled: false,
			wantByIDCalled:    true,
			wantByIDArg:       "p1",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			// Arrange
			stg := &stubSettingsService{
				currentProvider: tt.currentProvider,
				byIDProvider:    tt.byIDProvider,
			}
			llm := &stubLLMService{models: wantModels}
			svc := newTestActionService(stg, llm)

			// Act
			got, err := svc.GetModelsInfo(tt.providerID)

			// Assert — no error
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Assert — models returned verbatim
			if len(got) != len(tt.wantModels) {
				t.Fatalf("want %d models, got %d", len(tt.wantModels), len(got))
			}
			for i, m := range got {
				if m.ID != tt.wantModels[i].ID {
					t.Errorf("models[%d].ID: want %q, got %q", i, tt.wantModels[i].ID, m.ID)
				}
			}

			// Assert — LLM was called with the exact provider pointer (delegation)
			if !llm.called {
				t.Fatal("want GetModelsInfoForProvider called, was not")
			}
			if tt.wantCurrentCalled {
				// current-provider path: provider came from GetCurrentProviderConfig
				if llm.gotProvider != stg.currentProvider {
					t.Error("want provider from GetCurrentProviderConfig passed to LLM, got a different pointer")
				}
			}
			if tt.wantByIDCalled {
				// by-id path: correct ID passed and provider from GetProviderConfig used
				if stg.capturedByIDArg != tt.wantByIDArg {
					t.Errorf("want GetProviderConfig called with %q, got %q", tt.wantByIDArg, stg.capturedByIDArg)
				}
				if llm.gotProvider != stg.byIDProvider {
					t.Error("want provider from GetProviderConfig passed to LLM, got a different pointer")
				}
			}
		})
	}
}

// ── GetProviderConfig error → apperr.CodeValidation ────────────────────────

func TestActionService_GetModelsInfo_ProviderByID_NotFound_ReturnsValidationError(t *testing.T) {
	t.Parallel()

	// Arrange — GetProviderConfig returns any error; service must convert to validation.
	stg := &stubSettingsService{
		byIDErr: errors.New("not found in store"),
	}
	llm := &stubLLMService{}
	svc := newTestActionService(stg, llm)

	// Act
	got, err := svc.GetModelsInfo("unknown-id")

	// Assert — must fail
	if err == nil {
		t.Fatal("want error, got nil")
	}

	// Assert — result slice must be nil on error
	if got != nil {
		t.Errorf("want nil models on error, got %v", got)
	}

	// Assert — error must be *apperr.AppError with CodeValidation
	var ae *apperr.AppError
	if !errors.As(err, &ae) {
		t.Fatalf("want *apperr.AppError, got %T: %v", err, err)
	}
	if ae.Code != apperr.CodeValidation {
		t.Errorf("want code=%q, got %q", apperr.CodeValidation, ae.Code)
	}

	// Assert — LLM must NOT be called when settings lookup fails
	if llm.called {
		t.Error("want LLM NOT called after settings error, but it was")
	}
}

// ── GetCurrentProviderConfig error → plain wrapped error (not validation) ──

func TestActionService_GetModelsInfo_CurrentProvider_Error_ReturnsWrappedError(t *testing.T) {
	t.Parallel()

	// Use a named sentinel so errors.Is can verify %w wrapping.
	sentinel := errors.New("db unavailable")

	// Arrange
	stg := &stubSettingsService{
		currentProviderErr: sentinel,
	}
	llm := &stubLLMService{}
	svc := newTestActionService(stg, llm)

	// Act
	got, err := svc.GetModelsInfo("")

	// Assert — must fail
	if err == nil {
		t.Fatal("want error, got nil")
	}

	// Assert — result slice must be nil on error
	if got != nil {
		t.Errorf("want nil models on error, got %v", got)
	}

	// Assert — sentinel error is preserved via %w wrapping
	if !errors.Is(err, sentinel) {
		t.Errorf("want sentinel wrapped in returned error (errors.Is), but it was not: %v", err)
	}

	// Assert — error must NOT be an *apperr.AppError (plain wrapped, not converted)
	var ae *apperr.AppError
	if errors.As(err, &ae) {
		t.Errorf("want plain wrapped error (not *apperr.AppError), got code=%q", ae.Code)
	}

	// Assert — LLM must NOT be called when settings lookup fails
	if llm.called {
		t.Error("want LLM NOT called after settings error, but it was")
	}
}

// ── LLM error is returned verbatim ─────────────────────────────────────────

func TestActionService_GetModelsInfo_LLMError_IsReturnedVerbatim(t *testing.T) {
	t.Parallel()

	provider := &settings.ProviderConfig{ID: "p2", Name: "ProviderB"}
	llmErr := apperr.Unreachable("ProviderB", "http://dead.invalid/", errors.New("dial timeout"))

	// Arrange
	stg := &stubSettingsService{currentProvider: provider}
	llm := &stubLLMService{err: llmErr}
	svc := newTestActionService(stg, llm)

	// Act
	got, err := svc.GetModelsInfo("")

	// Assert — must fail
	if err == nil {
		t.Fatal("want error from LLM, got nil")
	}

	// Assert — result slice is nil
	if got != nil {
		t.Errorf("want nil models on error, got %v", got)
	}

	// Assert — the exact error value is returned unchanged
	if err != llmErr {
		t.Errorf("want error returned verbatim from LLM stub, got different error: %v", err)
	}
}
