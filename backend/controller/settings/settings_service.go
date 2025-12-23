package frontend

import (
	"fmt"
	"go_text/backend/abstract/backend"
	"go_text/backend/abstract/frontend"
	"go_text/backend/model/settings"
	"time"
)

type settingsService struct {
	logger          backend.LoggingApi
	settingsService backend.SettingsServiceApi
}

func (s *settingsService) GetProviderTypes() ([]string, error) {
	startTime := time.Now()

	s.logger.Info("[settingsService.GetProviderTypes] Starting provider types retrieval")

	types, err := s.settingsService.GetProviderTypes()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[settingsService.GetProviderTypes] Provider types retrieval failed, error=%v, error_type=%T", err, err))
		return nil, fmt.Errorf("failed to retrieve provider types: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[settingsService.GetProviderTypes] Successfully retrieved %d provider types, duration_ms=%d", len(types), duration.Milliseconds()))

	return types, nil
}

func (s *settingsService) GetCurrentSettings() (*settings.Settings, error) {
	startTime := time.Now()

	s.logger.Info("[settingsService.GetCurrentSettings] Starting current settings retrieval")

	settings, err := s.settingsService.GetCurrentSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[settingsService.GetCurrentSettings] Current settings retrieval failed, error=%v, error_type=%T", err, err))
		return nil, fmt.Errorf("failed to retrieve current settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[settingsService.GetCurrentSettings] Successfully retrieved current settings, duration_ms=%d, provider=%s", duration.Milliseconds(), settings.CurrentProviderConfig.ProviderName))

	return settings, nil
}

func (s *settingsService) GetDefaultSettings() (*settings.Settings, error) {
	startTime := time.Now()

	s.logger.Trace("[settingsService.GetDefaultSettings] Starting default settings retrieval")

	settings, err := s.settingsService.GetDefaultSettings()
	if err != nil {
		s.logger.Error(fmt.Sprintf("[settingsService.GetDefaultSettings] Default settings retrieval failed, error=%v, error_type=%T", err, err))
		return nil, fmt.Errorf("failed to retrieve default settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Trace(fmt.Sprintf("[settingsService.GetDefaultSettings] Successfully retrieved default settings, duration_ms=%d, provider_count=%d", duration.Milliseconds(), len(settings.AvailableProviderConfigs)))

	return settings, nil
}

func (s *settingsService) SaveSettings(settingsObj *settings.Settings) (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.Info("[SaveSettings] Saving application settings")

	if settingsObj == nil {
		errorMsg := "settings object cannot be nil"
		s.logger.Error(fmt.Sprintf("[SaveSettings] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	savedSettings, err := s.settingsService.SaveSettings(settingsObj)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[SaveSettings] Failed to save settings: %v", err))
		return nil, fmt.Errorf("failed to save settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[SaveSettings] Successfully saved settings in %v", duration))

	return savedSettings, nil
}

func (s *settingsService) ValidateProvider(config *settings.ProviderConfig, validateHttpCall bool, modelName string) (bool, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Trace(fmt.Sprintf("[ValidateProvider] Validating provider configuration: %s with model: %s", config.ProviderName, modelName))

	isValid, err := s.settingsService.ValidateProvider(config, validateHttpCall, modelName)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[ValidateProvider] Provider validation failed for '%s': %v", config.ProviderName, err))
		return false, fmt.Errorf("provider validation failed: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Trace(fmt.Sprintf("[ValidateProvider] Provider '%s' validation completed in %v, Valid: %v", config.ProviderName, duration, isValid))

	return isValid, nil
}

func (s *settingsService) CreateNewProvider(config *settings.ProviderConfig, modelName string) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[CreateNewProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Info(fmt.Sprintf("[CreateNewProvider] Creating new provider: %s", config.ProviderName))

	provider, err := s.settingsService.CreateNewProvider(config, modelName)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[CreateNewProvider] Failed to create provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[CreateNewProvider] Successfully created provider '%s' in %v", provider.ProviderName, duration))

	return provider, nil
}

func (s *settingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[UpdateProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Info(fmt.Sprintf("[UpdateProvider] Updating provider: %s", config.ProviderName))

	provider, err := s.settingsService.UpdateProvider(config)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[UpdateProvider] Failed to update provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to update provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[UpdateProvider] Successfully updated provider '%s' in %v", provider.ProviderName, duration))

	return provider, nil
}

func (s *settingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Info(fmt.Sprintf("[DeleteProvider] Deleting provider: %s", config.ProviderName))

	success, err := s.settingsService.DeleteProvider(config)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[DeleteProvider] Failed to delete provider '%s': %v", config.ProviderName, err))
		return false, fmt.Errorf("failed to delete provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[DeleteProvider] Successfully deleted provider '%s' in %v, Success: %v", config.ProviderName, duration, success))

	return success, nil
}

func (s *settingsService) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[SelectProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Info(fmt.Sprintf("[SelectProvider] Selecting provider: %s", config.ProviderName))

	selectedProvider, err := s.settingsService.SelectProvider(config)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[SelectProvider] Failed to select provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to select provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[SelectProvider] Successfully selected provider '%s' in %v", selectedProvider.ProviderName, duration))

	return selectedProvider, nil
}

func (s *settingsService) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.Error(fmt.Sprintf("[GetModelsList] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.Info(fmt.Sprintf("[GetModelsList] Fetching models for provider: %s", config.ProviderName))

	models, err := s.settingsService.GetModelsList(config)
	if err != nil {
		s.logger.Error(fmt.Sprintf("[GetModelsList] Failed to get models for provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to retrieve models: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.Info(fmt.Sprintf("[GetModelsList] Successfully retrieved %d models for provider '%s' in %v", len(models), config.ProviderName, duration))

	return models, nil
}

func (s *settingsService) GetSettingsFilePath() string {
	startTime := time.Now()
	s.logger.Trace("[GetSettingsFilePath] Retrieving settings file path")

	filePath := s.settingsService.GetSettingsFilePath()

	duration := time.Since(startTime)
	s.logger.Trace(fmt.Sprintf("[GetSettingsFilePath] Retrieved settings file path in %v", duration))

	return filePath
}

func NewSettingsApi(logger backend.LoggingApi, settingsServiceApi backend.SettingsServiceApi) frontend.SettingsApi {
	return &settingsService{
		logger:          logger,
		settingsService: settingsServiceApi,
	}
}
