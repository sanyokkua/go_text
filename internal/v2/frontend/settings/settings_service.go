package settingsapi

import (
	"fmt"
	"time"

	"go_text/internal/v2/api"
	"go_text/internal/v2/backend_api"
	"go_text/internal/v2/model/settings"
)

type settingsService struct {
	logger          backend_api.LoggingApi
	settingsService backend_api.SettingsServiceApi
}

func (s *settingsService) GetProviderTypes() ([]string, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetProviderTypes] Fetching available provider types")

	types, err := s.settingsService.GetProviderTypes()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetProviderTypes] Failed to get provider types: %v", err))
		return nil, fmt.Errorf("failed to retrieve provider types: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetProviderTypes] Successfully retrieved %d provider types in %v", len(types), duration))

	return types, nil
}

func (s *settingsService) GetCurrentSettings() (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetCurrentSettings] Fetching current application settings")

	settings, err := s.settingsService.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetCurrentSettings] Failed to get current settings: %v", err))
		return nil, fmt.Errorf("failed to retrieve current settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetCurrentSettings] Successfully retrieved current settings in %v", duration))

	return settings, nil
}

func (s *settingsService) GetDefaultSettings() (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogDebug("[GetDefaultSettings] Fetching default settings configuration")

	settings, err := s.settingsService.GetDefaultSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetDefaultSettings] Failed to get default settings: %v", err))
		return nil, fmt.Errorf("failed to retrieve default settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[GetDefaultSettings] Successfully retrieved default settings in %v", duration))

	return settings, nil
}

func (s *settingsService) SaveSettings(settingsObj *settings.Settings) (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogInfo("[SaveSettings] Saving application settings")

	if settingsObj == nil {
		errorMsg := "settings object cannot be nil"
		s.logger.LogError(fmt.Sprintf("[SaveSettings] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	savedSettings, err := s.settingsService.SaveSettings(settingsObj)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SaveSettings] Failed to save settings: %v", err))
		return nil, fmt.Errorf("failed to save settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[SaveSettings] Successfully saved settings in %v", duration))

	return savedSettings, nil
}

func (s *settingsService) ValidateProvider(config *settings.ProviderConfig) (bool, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Validating provider configuration: %s", config.ProviderName))

	isValid, err := s.settingsService.ValidateProvider(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] Provider validation failed for '%s': %v", config.ProviderName, err))
		return false, fmt.Errorf("provider validation failed: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Provider '%s' validation completed in %v, Valid: %v", config.ProviderName, duration, isValid))

	return isValid, nil
}

func (s *settingsService) CreateNewProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[CreateNewProvider] Creating new provider: %s", config.ProviderName))

	provider, err := s.settingsService.CreateNewProvider(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] Failed to create provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to create provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[CreateNewProvider] Successfully created provider '%s' in %v", provider.ProviderName, duration))

	return provider, nil
}

func (s *settingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[UpdateProvider] Updating provider: %s", config.ProviderName))

	provider, err := s.settingsService.UpdateProvider(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] Failed to update provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to update provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[UpdateProvider] Successfully updated provider '%s' in %v", provider.ProviderName, duration))

	return provider, nil
}

func (s *settingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[DeleteProvider] Deleting provider: %s", config.ProviderName))

	success, err := s.settingsService.DeleteProvider(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] Failed to delete provider '%s': %v", config.ProviderName, err))
		return false, fmt.Errorf("failed to delete provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[DeleteProvider] Successfully deleted provider '%s' in %v, Success: %v", config.ProviderName, duration, success))

	return success, nil
}

func (s *settingsService) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[SelectProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[SelectProvider] Selecting provider: %s", config.ProviderName))

	selectedProvider, err := s.settingsService.SelectProvider(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SelectProvider] Failed to select provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to select provider: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[SelectProvider] Successfully selected provider '%s' in %v", selectedProvider.ProviderName, duration))

	return selectedProvider, nil
}

func (s *settingsService) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[GetModelsList] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[GetModelsList] Fetching models for provider: %s", config.ProviderName))

	models, err := s.settingsService.GetModelsList(config)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetModelsList] Failed to get models for provider '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("failed to retrieve models: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetModelsList] Successfully retrieved %d models for provider '%s' in %v", len(models), config.ProviderName, duration))

	return models, nil
}

func (s *settingsService) GetSettingsFilePath() string {
	startTime := time.Now()
	s.logger.LogDebug("[GetSettingsFilePath] Retrieving settings file path")

	filePath := s.settingsService.GetSettingsFilePath()

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[GetSettingsFilePath] Retrieved settings file path in %v", duration))

	return filePath
}

func NewSettingsApi(logger backend_api.LoggingApi, settingsServiceApi backend_api.SettingsServiceApi) api.SettingsApi {
	return &settingsService{
		logger:          logger,
		settingsService: settingsServiceApi,
	}
}
