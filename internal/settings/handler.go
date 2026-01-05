package settings

import (
	"fmt"
	"time"

	"github.com/wailsapp/wails/v2/pkg/logger"
)

type SettingsHandlerAPI interface {
	GetAppSettingsMetadata() (AppSettingsMetadata, error)
	GetSettings() (Settings, error)
	ResetSettingsToDefault() (Settings, error)
	GetAllProviderConfigs() ([]ProviderConfig, error)
	GetCurrentProviderConfig() (ProviderConfig, error)
	GetProviderConfig(providerId string) (ProviderConfig, error)
	CreateProviderConfig(cfg ProviderConfig) (ProviderConfig, error)
	UpdateProviderConfig(cfg ProviderConfig) (ProviderConfig, error)
	DeleteProviderConfig(providerId string) error
	SetAsCurrentProviderConfig(providerId string) (ProviderConfig, error)
	GetInferenceBaseConfig() (InferenceBaseConfig, error)
	UpdateInferenceBaseConfig(cfg InferenceBaseConfig) (InferenceBaseConfig, error)
	GetModelConfig() (ModelConfig, error)
	UpdateModelConfig(cfg ModelConfig) (ModelConfig, error)
	GetLanguageConfig() (LanguageConfig, error)
}

type SettingsHandler struct {
	logger          logger.Logger
	settingsService SettingsServiceAPI
}

func NewSettingsHandler(logger logger.Logger, settingsService SettingsServiceAPI) SettingsHandlerAPI {
	if logger == nil {
		panic("logger cannot be nil")
	}
	if settingsService == nil {
		panic("settingsService cannot be nil")
	}

	return &SettingsHandler{
		logger:          logger,
		settingsService: settingsService,
	}
}

// GetAppSettingsMetadata will be used by UI once to get initial static data
func (s *SettingsHandler) GetAppSettingsMetadata() (AppSettingsMetadata, error) {
	const op = "SettingsHandler.GetAppSettingsMetadata"
	startTime := time.Now()
	s.logger.Debug(fmt.Sprintf("%s: retrieving application metadata", op))

	metadata, err := s.settingsService.GetAppSettingsMetadata()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get metadata: %v", op, err))
		return AppSettingsMetadata{}, fmt.Errorf("%s: %w", op, err)
	}

	if metadata == nil {
		s.logger.Error(fmt.Sprintf("%s: metadata is nil", op))
		return AppSettingsMetadata{}, fmt.Errorf("%s: metadata is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Debug(fmt.Sprintf("%s: successfully retrieved metadata in %v", op, duration))
	return *metadata, nil
}

// GetSettings will be used by the first load of settings and probably each time when the settings view is opened to load everything in one call
func (s *SettingsHandler) GetSettings() (Settings, error) {
	const op = "SettingsHandler.GetSettings"
	startTime := time.Now()
	s.logger.Debug(fmt.Sprintf("%s: loading all settings", op))

	settings, err := s.settingsService.GetSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings: %v", op, err))
		return Settings{}, fmt.Errorf("%s: %w", op, err)
	}

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: settings are nil", op))
		return Settings{}, fmt.Errorf("%s: settings are nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Debug(fmt.Sprintf("%s: successfully loaded settings in %v", op, duration))
	return *settings, nil
}

// ResetSettingsToDefault will be used when the user wants to reset everything to default
func (s *SettingsHandler) ResetSettingsToDefault() (Settings, error) {
	const op = "SettingsHandler.ResetSettingsToDefault"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: resetting all settings to default", op))

	settings, err := s.settingsService.ResetSettingsToDefault()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to reset settings: %v", op, err))
		return Settings{}, fmt.Errorf("%s: %w", op, err)
	}

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: reset settings are nil", op))
		return Settings{}, fmt.Errorf("%s: reset settings are nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully reset settings in %v", op, duration))
	return *settings, nil
}

func (s *SettingsHandler) GetAllProviderConfigs() ([]ProviderConfig, error) {
	const op = "SettingsHandler.GetAllProviderConfigs"
	s.logger.Debug(fmt.Sprintf("%s: retrieving all provider configurations", op))

	configs, err := s.settingsService.GetAllProviderConfigs()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get provider configs: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	s.logger.Debug(fmt.Sprintf("%s: found %d provider configurations", op, len(configs)))
	return configs, nil
}

func (s *SettingsHandler) GetCurrentProviderConfig() (ProviderConfig, error) {
	const op = "SettingsHandler.GetCurrentProviderConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving current provider configuration", op))

	config, err := s.settingsService.GetCurrentProviderConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get current provider config: %v", op, err))
		return ProviderConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: current provider config is nil", op))
		return ProviderConfig{}, fmt.Errorf("%s: current provider config is nil", op)
	}

	return *config, nil
}

func (s *SettingsHandler) GetProviderConfig(providerId string) (ProviderConfig, error) {
	const op = "SettingsHandler.GetProviderConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving provider config by ID: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return ProviderConfig{}, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	config, err := s.settingsService.GetProviderConfig(providerId)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get provider config: %v", op, err))
		return ProviderConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: provider config is nil for ID: %s", op, providerId))
		return ProviderConfig{}, fmt.Errorf("%s: provider config is nil", op)
	}

	return *config, nil
}

func (s *SettingsHandler) CreateProviderConfig(cfg ProviderConfig) (ProviderConfig, error) {
	const op = "SettingsHandler.CreateProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: creating new provider configuration", op))

	// Convert to a pointer for service call, but return copy to UI
	result, err := s.settingsService.CreateProviderConfig(&cfg)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to create provider config: %v", op, err))
		return ProviderConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if result == nil {
		s.logger.Error(fmt.Sprintf("%s: created provider config is nil", op))
		return ProviderConfig{}, fmt.Errorf("%s: created provider config is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully created provider %q in %v", op, result.ProviderName, duration))
	return *result, nil
}

func (s *SettingsHandler) UpdateProviderConfig(cfg ProviderConfig) (ProviderConfig, error) {
	const op = "SettingsHandler.UpdateProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating provider configuration: %s", op, cfg.ProviderID))

	if cfg.ProviderID == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return ProviderConfig{}, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	// Convert to a pointer for service call, but return copy to UI
	result, err := s.settingsService.UpdateProviderConfig(&cfg)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to update provider config: %v", op, err))
		return ProviderConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if result == nil {
		s.logger.Error(fmt.Sprintf("%s: updated provider config is nil", op))
		return ProviderConfig{}, fmt.Errorf("%s: updated provider config is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated provider %q in %v", op, result.ProviderName, duration))
	return *result, nil
}

func (s *SettingsHandler) DeleteProviderConfig(providerId string) error {
	const op = "SettingsHandler.DeleteProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: deleting provider configuration: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	if err := s.settingsService.DeleteProviderConfig(providerId); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to delete provider config: %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully deleted provider in %v", op, duration))
	return nil
}

func (s *SettingsHandler) SetAsCurrentProviderConfig(providerId string) (ProviderConfig, error) {
	const op = "SettingsHandler.SetAsCurrentProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: setting current provider: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return ProviderConfig{}, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	provider, err := s.settingsService.SetAsCurrentProviderConfig(providerId)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to set current provider: %v", op, err))
		return ProviderConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if provider == nil {
		s.logger.Error(fmt.Sprintf("%s: provider config is nil after setting current", op))
		return ProviderConfig{}, fmt.Errorf("%s: provider config is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully set current provider %q in %v", op, provider.ProviderName, duration))
	return *provider, nil
}

func (s *SettingsHandler) GetInferenceBaseConfig() (InferenceBaseConfig, error) {
	const op = "SettingsHandler.GetInferenceBaseConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving inference base configuration", op))

	config, err := s.settingsService.GetInferenceBaseConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get inference config: %v", op, err))
		return InferenceBaseConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: inference config is nil", op))
		return InferenceBaseConfig{}, fmt.Errorf("%s: inference config is nil", op)
	}

	return *config, nil
}

func (s *SettingsHandler) UpdateInferenceBaseConfig(cfg InferenceBaseConfig) (InferenceBaseConfig, error) {
	const op = "SettingsHandler.UpdateInferenceBaseConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating inference base configuration", op))

	// Convert to a pointer for service call, but return copy to UI
	result, err := s.settingsService.UpdateInferenceBaseConfig(&cfg)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to update inference config: %v", op, err))
		return InferenceBaseConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if result == nil {
		s.logger.Error(fmt.Sprintf("%s: updated inference config is nil", op))
		return InferenceBaseConfig{}, fmt.Errorf("%s: updated inference config is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated inference config in %v", op, duration))
	return *result, nil
}

func (s *SettingsHandler) GetModelConfig() (ModelConfig, error) {
	const op = "SettingsHandler.GetModelConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving model configuration", op))

	config, err := s.settingsService.GetModelConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get model config: %v", op, err))
		return ModelConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: model config is nil", op))
		return ModelConfig{}, fmt.Errorf("%s: model config is nil", op)
	}

	return *config, nil
}

func (s *SettingsHandler) UpdateModelConfig(cfg ModelConfig) (ModelConfig, error) {
	const op = "SettingsHandler.UpdateModelConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating model configuration", op))

	// Convert to a pointer for service call, but return copy to UI
	result, err := s.settingsService.UpdateModelConfig(&cfg)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to update model config: %v", op, err))
		return ModelConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if result == nil {
		s.logger.Error(fmt.Sprintf("%s: updated model config is nil", op))
		return ModelConfig{}, fmt.Errorf("%s: updated model config is nil", op)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated model config in %v", op, duration))
	return *result, nil
}

func (s *SettingsHandler) GetLanguageConfig() (LanguageConfig, error) {
	const op = "SettingsHandler.GetLanguageConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving language configuration", op))

	config, err := s.settingsService.GetLanguageConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get language config: %v", op, err))
		return LanguageConfig{}, fmt.Errorf("%s: %w", op, err)
	}

	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: language config is nil", op))
		return LanguageConfig{}, fmt.Errorf("%s: language config is nil", op)
	}

	return *config, nil
}

func (s *SettingsHandler) SetDefaultInputLanguage(language string) error {
	const op = "SettingsHandler.SetDefaultInputLanguage"
	s.logger.Info(fmt.Sprintf("%s: setting default input language: %s", op, language))

	if err := s.settingsService.SetDefaultInputLanguage(language); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to set default input language: %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	s.logger.Info(fmt.Sprintf("%s: successfully set default input language: %s", op, language))
	return nil
}

func (s *SettingsHandler) SetDefaultOutputLanguage(language string) error {
	const op = "SettingsHandler.SetDefaultOutputLanguage"
	s.logger.Info(fmt.Sprintf("%s: setting default output language: %s", op, language))

	if err := s.settingsService.SetDefaultOutputLanguage(language); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to set default output language: %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	s.logger.Info(fmt.Sprintf("%s: successfully set default output language: %s", op, language))
	return nil
}

func (s *SettingsHandler) AddLanguage(language string) ([]string, error) {
	const op = "SettingsHandler.AddLanguage"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: adding language: %s", op, language))

	languages, err := s.settingsService.AddLanguage(language)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to add language: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully added language %q in %v, total languages: %d", op, language, duration, len(languages)))
	return languages, nil
}

func (s *SettingsHandler) RemoveLanguage(language string) ([]string, error) {
	const op = "SettingsHandler.RemoveLanguage"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: removing language: %s", op, language))

	languages, err := s.settingsService.RemoveLanguage(language)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to remove language: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully removed language %q in %v, remaining languages: %d", op, language, duration, len(languages)))
	return languages, nil
}
