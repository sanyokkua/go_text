package settings

import (
	"errors"
	"testing"

	"github.com/rs/zerolog"
	"go_text/internal/apperr"
)

// ─── Minimal mock ─────────────────────────────────────────────────────────

type mockSettingsService struct {
	getSettingsErr error
	getMetaErr     error
}

func (m *mockSettingsService) InitDefaultSettingsIfAbsent() error { return nil }
func (m *mockSettingsService) GetAppSettingsMetadata() (*AppSettingsMetadata, error) {
	if m.getMetaErr != nil {
		return nil, m.getMetaErr
	}
	return &AppSettingsMetadata{}, nil
}
func (m *mockSettingsService) GetSettings() (*Settings, error) {
	if m.getSettingsErr != nil {
		return nil, m.getSettingsErr
	}
	return &Settings{}, nil
}
func (m *mockSettingsService) ResetSettingsToDefault() (*Settings, error) { return &Settings{}, nil }
func (m *mockSettingsService) GetAllProviderConfigs() ([]ProviderConfig, error) {
	return nil, nil
}
func (m *mockSettingsService) GetCurrentProviderConfig() (*ProviderConfig, error) {
	return &ProviderConfig{}, nil
}
func (m *mockSettingsService) GetProviderConfig(_ string) (*ProviderConfig, error) {
	return &ProviderConfig{}, nil
}
func (m *mockSettingsService) CreateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	return cfg, nil
}
func (m *mockSettingsService) UpdateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	return cfg, nil
}
func (m *mockSettingsService) DeleteProviderConfig(_ string) error { return nil }
func (m *mockSettingsService) SetAsCurrentProviderConfig(_ string) (*ProviderConfig, error) {
	return &ProviderConfig{}, nil
}
func (m *mockSettingsService) GetInferenceBaseConfig() (*InferenceBaseConfig, error) {
	return &InferenceBaseConfig{}, nil
}
func (m *mockSettingsService) UpdateInferenceBaseConfig(cfg *InferenceBaseConfig) (*InferenceBaseConfig, error) {
	return cfg, nil
}
func (m *mockSettingsService) GetModelConfig() (*ModelConfig, error) { return &ModelConfig{}, nil }
func (m *mockSettingsService) UpdateModelConfig(cfg *ModelConfig) (*ModelConfig, error) {
	return cfg, nil
}
func (m *mockSettingsService) GetLanguageConfig() (*LanguageConfig, error) {
	return &LanguageConfig{}, nil
}
func (m *mockSettingsService) SetDefaultInputLanguage(_ string) error  { return nil }
func (m *mockSettingsService) SetDefaultOutputLanguage(_ string) error { return nil }
func (m *mockSettingsService) AddLanguage(_ string) ([]string, error)  { return nil, nil }
func (m *mockSettingsService) RemoveLanguage(_ string) ([]string, error) {
	return nil, nil
}
func (m *mockSettingsService) GetAppBehaviorConfig() (*AppBehaviorConfig, error) {
	return &AppBehaviorConfig{}, nil
}
func (m *mockSettingsService) UpdateAppBehaviorConfig(cfg *AppBehaviorConfig) (*AppBehaviorConfig, error) {
	return cfg, nil
}

func newTestHandler(svc SettingsServiceAPI) *SettingsHandler {
	return NewSettingsHandler(nil, zerolog.Nop(), svc)
}

// ─── Error path: service error maps to WireError.Code ────────────────────

func TestSettingsHandler_GetSettings_ServiceError_ReturnsErrorCode(t *testing.T) {
	svc := &mockSettingsService{getSettingsErr: apperr.Validation("x", "y", "z")}
	h := newTestHandler(svc)

	res := h.GetSettings()

	if res.Error == nil {
		t.Fatal("expected non-nil Error in envelope")
	}
	if res.Error.Code != apperr.CodeValidation {
		t.Errorf("Code: got %q want %q", res.Error.Code, apperr.CodeValidation)
	}
	if res.Data != nil {
		t.Error("Data should be nil on error")
	}
}

func TestSettingsHandler_GetSettings_UnclassifiedError_ReturnsInternal(t *testing.T) {
	svc := &mockSettingsService{getSettingsErr: errors.New("unexpected db error")}
	h := newTestHandler(svc)

	res := h.GetSettings()

	if res.Error == nil {
		t.Fatal("expected non-nil Error in envelope")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("Code: got %q want CodeInternal", res.Error.Code)
	}
}

// ─── Panic recovery ───────────────────────────────────────────────────────

// panicSettingsService panics inside GetSettings to test handler recovery.
type panicSettingsService struct{ mockSettingsService }

func (p *panicSettingsService) GetSettings() (*Settings, error) {
	panic("simulated handler panic")
}

func TestSettingsHandler_GetSettings_Panic_ReturnsInternalEnvelope(t *testing.T) {
	h := newTestHandler(&panicSettingsService{})

	res := h.GetSettings()

	if res.Error == nil {
		t.Fatal("panic must produce non-nil Error in envelope")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("panic Code: got %q want CodeInternal", res.Error.Code)
	}
}

// ─── Happy path: data returned, no error ─────────────────────────────────

func TestSettingsHandler_GetSettings_Success_ReturnsData(t *testing.T) {
	h := newTestHandler(&mockSettingsService{})

	res := h.GetSettings()

	if res.Error != nil {
		t.Errorf("unexpected Error: %v", res.Error)
	}
	if res.Data == nil {
		t.Error("Data should be non-nil on success")
	}
}

func TestSettingsHandler_GetAppSettingsMetadata_ServiceError(t *testing.T) {
	svc := &mockSettingsService{getMetaErr: apperr.Internal(errors.New("meta fail"))}
	h := newTestHandler(svc)

	res := h.GetAppSettingsMetadata()

	if res.Error == nil {
		t.Fatal("expected Error in envelope")
	}
	if res.Error.Code != apperr.CodeInternal {
		t.Errorf("Code: got %q want CodeInternal", res.Error.Code)
	}
}
