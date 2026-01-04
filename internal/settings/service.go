package settings

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/logger"

	"go_text/internal/file"
)

// Helper methods for enum validation

func (pt ProviderType) IsValid() bool {
	switch pt {
	case ProviderTypeOpenAICompatible, ProviderTypeOllama:
		return true
	}
	return false
}

func (at AuthType) IsValid() bool {
	switch at {
	case AuthTypeNone, AuthTypeApiKey, AuthTypeBearer:
		return true
	}
	return false
}

func containsIgnoreCase(list []string, item string) bool {
	lowerItem := strings.ToLower(item)
	for _, i := range list {
		if strings.ToLower(i) == lowerItem {
			return true
		}
	}
	return false
}

// ValidateBaseURL checks URL format, scheme, and trailing slash
func ValidateBaseURL(baseURL string) error {
	if baseURL == "" {
		return errors.New("base URL cannot be empty")
	}

	u, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Errorf("invalid base URL format: %w", err)
	}

	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("invalid URL scheme %q, must be http or https", u.Scheme)
	}

	if !strings.HasSuffix(u.Path, "/") {
		return errors.New("base URL must end with a trailing slash")
	}

	return nil
}

// ValidateEndpoint checks relative path format
func ValidateEndpoint(endpoint string) error {
	if endpoint == "" {
		return nil
	}
	if strings.HasPrefix(endpoint, "/") {
		return errors.New("endpoint must not start with a forward slash")
	}
	return nil
}

// ValidateProviderConfig validates all ProviderConfig fields and relationships
func ValidateProviderConfig(cfg *ProviderConfig) error {
	if cfg == nil {
		return errors.New("provider config is nil")
	}

	if cfg.ProviderName == "" {
		return errors.New("provider name cannot be empty")
	}

	if !cfg.ProviderType.IsValid() {
		return fmt.Errorf("invalid provider type %q", cfg.ProviderType)
	}

	if err := ValidateBaseURL(cfg.BaseUrl); err != nil {
		return fmt.Errorf("invalid base URL: %w", err)
	}

	if cfg.CompletionEndpoint == "" {
		return errors.New("completion endpoint cannot be empty")
	}

	if err := ValidateEndpoint(cfg.CompletionEndpoint); err != nil {
		return fmt.Errorf("invalid completion endpoint: %w", err)
	}

	if !cfg.AuthType.IsValid() {
		return fmt.Errorf("invalid auth type %q", cfg.AuthType)
	}

	// Conditional validations
	if !cfg.UseCustomModels {
		if cfg.ModelsEndpoint == "" {
			return errors.New("models endpoint required when not using custom models")
		}
		if err := ValidateEndpoint(cfg.ModelsEndpoint); err != nil {
			return fmt.Errorf("invalid models endpoint: %w", err)
		}
	}

	if cfg.UseAuthTokenFromEnv {
		if cfg.EnvVarTokenName == "" {
			return errors.New("environment variable name required when loading token from environment")
		}
	} else if cfg.AuthType != AuthTypeNone && cfg.AuthToken == "" {
		return fmt.Errorf("auth token required for auth type %q", cfg.AuthType)
	}

	if cfg.UseCustomModels && len(cfg.CustomModels) == 0 {
		return errors.New("custom models required when using custom models")
	}

	return nil
}

// ValidateSettings performs holistic validation of the entire configuration
func ValidateSettings(s Settings) error {
	// Provider configs
	providerNames := make(map[string]bool)
	for _, cfg := range s.AvailableProviderConfigs {
		if err := ValidateProviderConfig(&cfg); err != nil {
			return fmt.Errorf("invalid provider %q: %w", cfg.ProviderName, err)
		}
		if providerNames[cfg.ProviderName] {
			return fmt.Errorf("duplicate provider name: %s", cfg.ProviderName)
		}
		providerNames[cfg.ProviderName] = true
	}

	// Current provider must exist in available providers
	currentProviderName := s.CurrentProviderConfig.ProviderName
	if currentProviderName == "" {
		return errors.New("current provider name cannot be empty")
	}
	if !providerNames[currentProviderName] {
		return fmt.Errorf("current provider %q not found in available providers", currentProviderName)
	}

	if err := ValidateProviderConfig(&s.CurrentProviderConfig); err != nil {
		return fmt.Errorf("invalid current provider: %w", err)
	}

	// Base inference config
	if s.InferenceBaseConfig.Timeout < 0 {
		return errors.New("timeout must be non-negative")
	}
	if s.InferenceBaseConfig.MaxRetries < 0 {
		return errors.New("max retries must be non-negative")
	}

	// Model config
	if s.ModelConfig.Name == "" {
		return errors.New("model name cannot be empty")
	}
	if s.ModelConfig.UseTemperature && (s.ModelConfig.Temperature < 0 || s.ModelConfig.Temperature > 2) {
		return errors.New("temperature must be between 0 and 2 when enabled")
	}

	// Language config
	if len(s.LanguageConfig.Languages) == 0 {
		return errors.New("languages list cannot be empty")
	}
	if !containsIgnoreCase(s.LanguageConfig.Languages, s.LanguageConfig.DefaultInputLanguage) {
		return errors.New("default input language not in supported languages list")
	}
	if !containsIgnoreCase(s.LanguageConfig.Languages, s.LanguageConfig.DefaultOutputLanguage) {
		return errors.New("default output language not in supported languages list")
	}

	return nil
}

type SettingsService struct {
	logger       logger.Logger
	settingsRepo *SettingsRepository
	fileUtils    *file.FileUtilsService
}

func NewSettingsService(logger logger.Logger, settingsRepo *SettingsRepository, fileUtils *file.FileUtilsService) *SettingsService {
	if logger == nil {
		panic("logger cannot be nil")
	}
	if settingsRepo == nil {
		panic("settingsRepo cannot be nil")
	}
	if fileUtils == nil {
		panic("fileUtils cannot be nil")
	}

	return &SettingsService{
		logger:       logger,
		settingsRepo: settingsRepo,
		fileUtils:    fileUtils,
	}
}

// saveSettings safely saves settings with validation
func (s *SettingsService) saveSettings(settings *Settings) error {
	const op = "SettingsService.saveSettings"

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: cannot save nil settings", op))
		return fmt.Errorf("%s: cannot save nil settings", op)
	}

	if err := ValidateSettings(*settings); err != nil {
		s.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return fmt.Errorf("%s: settings validation failed: %w", op, err)
	}

	if _, err := s.settingsRepo.SaveSettings(settings); err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to save settings: %v", op, err))
		return fmt.Errorf("%s: %w", op, err)
	}

	return nil
}

// getSettingsWithValidation retrieves settings and validates they exist
func (s *SettingsService) getSettingsWithValidation() (*Settings, error) {
	const op = "SettingsService.getSettingsWithValidation"

	settings, err := s.settingsRepo.GetSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	if settings == nil {
		s.logger.Error(fmt.Sprintf("%s: settings are nil", op))
		return nil, fmt.Errorf("%s: settings are nil", op)
	}

	return settings, nil
}

func (s *SettingsService) InitDefaultSettingsIfAbsent() error {
	return s.settingsRepo.InitDefaultSettingsIfAbsent()
}

func (s *SettingsService) GetAppSettingsMetadata() (*AppSettingsMetadata, error) {
	const op = "SettingsService.GetAppSettingsMetadata"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: retrieving application settings metadata", op))

	folderPath, err := s.fileUtils.GetAppSettingsFolderPath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings folder path: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	filePath, err := s.fileUtils.GetAppSettingsFilePath()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get settings file path: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	metadata := &AppSettingsMetadata{
		AuthTypes:      AuthTypes[:],
		ProviderTypes:  ProviderTypes[:],
		SettingsFolder: folderPath,
		SettingsFile:   filePath,
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully retrieved metadata in %v", op, duration))
	return metadata, nil
}

func (s *SettingsService) GetSettings() (*Settings, error) {
	const op = "SettingsService.GetSettings"
	s.logger.Debug(fmt.Sprintf("%s: retrieving current settings", op))
	return s.settingsRepo.GetSettings()
}

func (s *SettingsService) ResetSettingsToDefault() (*Settings, error) {
	const op = "SettingsService.ResetSettingsToDefault"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: resetting settings to default", op))

	settings, err := s.settingsRepo.SaveSettings(&DefaultSetting)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to save default settings: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully reset settings in %v", op, duration))
	return settings, nil
}

func (s *SettingsService) GetAllProviderConfigs() ([]ProviderConfig, error) {
	const op = "SettingsService.GetAllProviderConfigs"
	s.logger.Debug(fmt.Sprintf("%s: retrieving all provider configurations", op))
	return s.settingsRepo.GetAvailableProviderConfigs()
}

func (s *SettingsService) GetCurrentProviderConfig() (*ProviderConfig, error) {
	const op = "SettingsService.GetCurrentProviderConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving current provider configuration", op))

	config, err := s.settingsRepo.GetCurrentProviderConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get current provider config: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: current provider config is nil", op))
		return nil, fmt.Errorf("%s: current provider config is nil", op)
	}

	return config, nil
}

func (s *SettingsService) GetProviderConfig(providerId string) (*ProviderConfig, error) {
	const op = "SettingsService.GetProviderConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving provider config by ID: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return nil, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	configs, err := s.settingsRepo.GetAvailableProviderConfigs()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get available provider configs: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	for i, config := range configs {
		if config.ProviderID == providerId {
			return &configs[i], nil
		}
	}

	s.logger.Warning(fmt.Sprintf("%s: provider not found with ID: %s", op, providerId))
	return nil, fmt.Errorf("%s: provider not found with ID %s", op, providerId)
}

func (s *SettingsService) CreateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.CreateProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: creating new provider configuration", op))

	if err := ValidateProviderConfig(cfg); err != nil {
		s.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	// Check for duplicate provider name
	for _, existing := range settings.AvailableProviderConfigs {
		if existing.ProviderName == cfg.ProviderName {
			s.logger.Error(fmt.Sprintf("%s: duplicate provider name: %s", op, cfg.ProviderName))
			return nil, fmt.Errorf("%s: provider name %q already exists", op, cfg.ProviderName)
		}
	}

	// Generate a new I D and set it
	cfg.ProviderID = uuid.NewString()

	// Add to settings
	settings.AvailableProviderConfigs = append(settings.AvailableProviderConfigs, *cfg)

	// Save and return
	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully created provider %q in %v", op, cfg.ProviderName, duration))
	return cfg, nil
}

func (s *SettingsService) UpdateProviderConfig(cfg *ProviderConfig) (*ProviderConfig, error) {
	const op = "SettingsService.UpdateProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating provider configuration: %s", op, cfg.ProviderID))

	if cfg.ProviderID == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return nil, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	if err := ValidateProviderConfig(cfg); err != nil {
		s.logger.Error(fmt.Sprintf("%s: validation failed: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	// Find and update the provider
	found := false
	for i, existing := range settings.AvailableProviderConfigs {
		if existing.ProviderID == cfg.ProviderID {
			// Check for duplicate name with other providers
			for _, other := range settings.AvailableProviderConfigs {
				if other.ProviderID != cfg.ProviderID && other.ProviderName == cfg.ProviderName {
					s.logger.Error(fmt.Sprintf("%s: duplicate provider name: %s", op, cfg.ProviderName))
					return nil, fmt.Errorf("%s: provider name %q already exists", op, cfg.ProviderName)
				}
			}
			settings.AvailableProviderConfigs[i] = *cfg
			found = true
			break
		}
	}

	if !found {
		s.logger.Error(fmt.Sprintf("%s: provider not found with ID: %s", op, cfg.ProviderID))
		return nil, fmt.Errorf("%s: provider not found with ID %s", op, cfg.ProviderID)
	}

	// Update current provider if it matches
	if settings.CurrentProviderConfig.ProviderID == cfg.ProviderID {
		settings.CurrentProviderConfig = *cfg
	}

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated provider %q in %v", op, cfg.ProviderName, duration))
	return cfg, nil
}

func (s *SettingsService) DeleteProviderConfig(providerId string) error {
	const op = "SettingsService.DeleteProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: deleting provider configuration: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return err
	}

	// Check if this is the current provider
	if settings.CurrentProviderConfig.ProviderID == providerId {
		s.logger.Error(fmt.Sprintf("%s: cannot delete current provider: %s", op, providerId))
		return fmt.Errorf("%s: cannot delete current provider %s", op, providerId)
	}

	// Find and remove the provider
	found := false
	newProviders := make([]ProviderConfig, 0, len(settings.AvailableProviderConfigs)-1)
	for _, provider := range settings.AvailableProviderConfigs {
		if provider.ProviderID == providerId {
			found = true
			continue
		}
		newProviders = append(newProviders, provider)
	}

	if !found {
		s.logger.Warning(fmt.Sprintf("%s: provider not found with ID: %s", op, providerId))
		return fmt.Errorf("%s: provider not found with ID %s", op, providerId)
	}

	settings.AvailableProviderConfigs = newProviders

	if err := s.saveSettings(settings); err != nil {
		return err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully deleted provider in %v", op, duration))
	return nil
}

func (s *SettingsService) SetAsCurrentProviderConfig(providerId string) (*ProviderConfig, error) {
	const op = "SettingsService.SetAsCurrentProviderConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: setting current provider: %s", op, providerId))

	if providerId == "" {
		s.logger.Error(fmt.Sprintf("%s: provider ID cannot be empty", op))
		return nil, fmt.Errorf("%s: provider ID cannot be empty", op)
	}

	provider, err := s.GetProviderConfig(providerId)
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get provider config: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	settings.CurrentProviderConfig = *provider

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully set current provider %q in %v", op, provider.ProviderName, duration))
	return provider, nil
}

func (s *SettingsService) GetInferenceBaseConfig() (*InferenceBaseConfig, error) {
	const op = "SettingsService.GetInferenceBaseConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving inference base configuration", op))

	config, err := s.settingsRepo.GetInferenceBaseConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get inference config: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: inference config is nil", op))
		return nil, fmt.Errorf("%s: inference config is nil", op)
	}

	return config, nil
}

func (s *SettingsService) GetModelConfig() (*ModelConfig, error) {
	const op = "SettingsService.GetModelConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving model configuration", op))

	config, err := s.settingsRepo.GetModelConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get model config: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: model config is nil", op))
		return nil, fmt.Errorf("%s: model config is nil", op)
	}

	return config, nil
}

func (s *SettingsService) UpdateInferenceBaseConfig(cfg *InferenceBaseConfig) (*InferenceBaseConfig, error) {
	const op = "SettingsService.UpdateInferenceBaseConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating inference base configuration", op))

	if cfg.Timeout < 1 || cfg.Timeout > 600 {
		s.logger.Error(fmt.Sprintf("%s: invalid timeout value: %d", op, cfg.Timeout))
		return nil, fmt.Errorf("%s: timeout must be between 1 and 600 seconds", op)
	}
	if cfg.MaxRetries < 0 || cfg.MaxRetries > 10 {
		s.logger.Error(fmt.Sprintf("%s: invalid max retries value: %d", op, cfg.MaxRetries))
		return nil, fmt.Errorf("%s: max retries must be between 0 and 10", op)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	settings.InferenceBaseConfig = *cfg

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated inference config in %v", op, duration))
	return cfg, nil
}

func (s *SettingsService) UpdateModelConfig(cfg *ModelConfig) (*ModelConfig, error) {
	const op = "SettingsService.UpdateModelConfig"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: updating model configuration", op))

	if strings.TrimSpace(cfg.Name) == "" {
		s.logger.Error(fmt.Sprintf("%s: model name cannot be empty", op))
		return nil, fmt.Errorf("%s: model name cannot be empty", op)
	}
	if cfg.UseTemperature && (cfg.Temperature < 0 || cfg.Temperature > 2) {
		s.logger.Error(fmt.Sprintf("%s: invalid temperature value: %f", op, cfg.Temperature))
		return nil, fmt.Errorf("%s: temperature must be between 0 and 2 when enabled", op)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	settings.ModelConfig = *cfg

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully updated model config in %v", op, duration))
	return cfg, nil
}

func (s *SettingsService) GetLanguageConfig() (*LanguageConfig, error) {
	const op = "SettingsService.GetLanguageConfig"
	s.logger.Debug(fmt.Sprintf("%s: retrieving language configuration", op))

	config, err := s.settingsRepo.GetLanguageConfig()
	if err != nil {
		s.logger.Error(fmt.Sprintf("%s: failed to get language config: %v", op, err))
		return nil, fmt.Errorf("%s: %w", op, err)
	}
	if config == nil {
		s.logger.Error(fmt.Sprintf("%s: language config is nil", op))
		return nil, fmt.Errorf("%s: language config is nil", op)
	}

	return config, nil
}

func (s *SettingsService) validateLanguage(language string, operation string) error {
	language = strings.TrimSpace(language)
	if language == "" {
		s.logger.Error(fmt.Sprintf("%s: language cannot be empty", operation))
		return fmt.Errorf("%s: language cannot be empty", operation)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return err
	}

	// Validate language exists in the supported list - CASE-INSENSITIVE
	if !containsIgnoreCase(settings.LanguageConfig.Languages, language) {
		s.logger.Error(fmt.Sprintf("%s: language %q not in supported languages", operation, language))
		return fmt.Errorf("%s: language %q not in supported languages list", operation, language)
	}

	return nil
}

func (s *SettingsService) SetDefaultInputLanguage(language string) error {
	const op = "SettingsService.SetDefaultInputLanguage"
	s.logger.Info(fmt.Sprintf("%s: setting default input language: %s", op, language))

	err := s.validateLanguage(language, op)
	if err != nil {
		return err
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return err
	}

	settings.LanguageConfig.DefaultInputLanguage = language

	return s.saveSettings(settings)
}

func (s *SettingsService) SetDefaultOutputLanguage(language string) error {
	const op = "SettingsService.SetDefaultOutputLanguage"
	s.logger.Info(fmt.Sprintf("%s: setting default output language: %s", op, language))

	err := s.validateLanguage(language, op)
	if err != nil {
		return err
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return err
	}

	settings.LanguageConfig.DefaultOutputLanguage = language

	return s.saveSettings(settings)
}

func (s *SettingsService) AddLanguage(language string) ([]string, error) {
	const op = "SettingsService.AddLanguage"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: adding language: %s", op, language))

	language = strings.TrimSpace(language)
	if language == "" {
		s.logger.Error(fmt.Sprintf("%s: language cannot be empty", op))
		return nil, fmt.Errorf("%s: language cannot be empty", op)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	// Check if the language already exists
	lowerLanguage := strings.ToLower(language)
	for _, lang := range settings.LanguageConfig.Languages {
		lower := strings.ToLower(lang)
		if lower == lowerLanguage {
			s.logger.Info(fmt.Sprintf("%s: language %q already exists, skipping", op, language))
			return settings.LanguageConfig.Languages, nil
		}
	}

	settings.LanguageConfig.Languages = append(settings.LanguageConfig.Languages, language)

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully added language %q in %v", op, language, duration))
	return settings.LanguageConfig.Languages, nil
}

func (s *SettingsService) RemoveLanguage(language string) ([]string, error) {
	const op = "SettingsService.RemoveLanguage"
	startTime := time.Now()
	s.logger.Info(fmt.Sprintf("%s: removing language: %s", op, language))

	language = strings.TrimSpace(language)
	if language == "" {
		s.logger.Error(fmt.Sprintf("%s: language cannot be empty", op))
		return nil, fmt.Errorf("%s: language cannot be empty", op)
	}

	settings, err := s.getSettingsWithValidation()
	if err != nil {
		return nil, err
	}

	// Check if a language exists and is not a default language
	if strings.ToLower(language) == strings.ToLower(settings.LanguageConfig.DefaultInputLanguage) {
		s.logger.Error(fmt.Sprintf("%s: cannot remove default input language: %s", op, language))
		return nil, fmt.Errorf("%s: cannot remove default input language %q", op, language)
	}
	if strings.ToLower(language) == strings.ToLower(settings.LanguageConfig.DefaultOutputLanguage) {
		s.logger.Error(fmt.Sprintf("%s: cannot remove default output language: %s", op, language))
		return nil, fmt.Errorf("%s: cannot remove default output language %q", op, language)
	}

	found := false
	newLanguages := make([]string, 0, len(settings.LanguageConfig.Languages)-1)
	for _, lang := range settings.LanguageConfig.Languages {
		if strings.ToLower(lang) == strings.ToLower(language) {
			found = true
			continue
		}
		newLanguages = append(newLanguages, lang)
	}

	if !found {
		s.logger.Warning(fmt.Sprintf("%s: language %q not found in supported languages", op, language))
		return settings.LanguageConfig.Languages, nil
	}

	settings.LanguageConfig.Languages = newLanguages

	if err := s.saveSettings(settings); err != nil {
		return nil, err
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("%s: successfully removed language %q in %v", op, language, duration))
	return settings.LanguageConfig.Languages, nil
}
