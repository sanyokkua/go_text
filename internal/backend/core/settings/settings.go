package settings

import (
	"fmt"
	"go_text/internal/backend/constants"
	"go_text/internal/backend/core/utils/file_utils"
	"go_text/internal/backend/models"
)

type SettingsService interface {
	GetDefaultSettings() (*models.Settings, error)
	GetCurrentSettings() (*models.Settings, error)
	SetSettings(settings *models.Settings) error

	GetProviders() ([]models.ProviderConfig, error)
	GetCurrentProvider() (*models.ProviderConfig, error)
	GetModelConfig() (*models.ModelConfig, error)
	GetLanguageConfig() (*models.LanguageConfig, error)
	GetUseMarkdownForOutput() (bool, error)

	// Custom provider management
	AddCustomProvider(provider *models.ProviderConfig) error
	UpdateCustomProvider(provider *models.ProviderConfig) error
	DeleteCustomProvider(providerName string) error
	GetCustomProviders() ([]models.ProviderConfig, error)
}

type settingsServiceStruct struct {
}

func (s *settingsServiceStruct) GetProviders() ([]models.ProviderConfig, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return make([]models.ProviderConfig, 0), err
	}
	return settings.AvailableProviderConfigs, nil
}

func (s *settingsServiceStruct) GetCurrentProvider() (*models.ProviderConfig, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return &models.ProviderConfig{}, err
	}
	return &settings.CurrentProviderConfig, nil
}

func (s *settingsServiceStruct) GetModelConfig() (*models.ModelConfig, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return &models.ModelConfig{}, err
	}
	return &settings.ModelConfig, nil
}

func (s *settingsServiceStruct) GetLanguageConfig() (*models.LanguageConfig, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return &models.LanguageConfig{}, err
	}
	return &settings.LanguageConfig, nil
}

func (s *settingsServiceStruct) GetDefaultSettings() (*models.Settings, error) {
	return &constants.DefaultSetting, nil
}

func (s *settingsServiceStruct) GetCurrentSettings() (*models.Settings, error) {
	settings, err := file_utils.LoadSettings()
	if err != nil {
		return &models.Settings{}, err
	}
	return settings, nil
}

func (s *settingsServiceStruct) SetSettings(settings *models.Settings) error {
	return file_utils.SaveSettings(settings)
}

func (s *settingsServiceStruct) GetBaseUrl() (string, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return "", err
	}
	return settings.CurrentProviderConfig.BaseUrl, nil
}

func (s *settingsServiceStruct) GetUseMarkdownForOutput() (bool, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return false, err
	}
	return settings.UseMarkdownForOutput, nil
}

// Custom provider management methods
func (s *settingsServiceStruct) AddCustomProvider(provider *models.ProviderConfig) error {
	if provider == nil {
		return fmt.Errorf("provider cannot be nil")
	}
	if provider.ProviderType != models.ProviderTypeCustom {
		return fmt.Errorf("only custom providers can be added")
	}
	if provider.ProviderName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}

	settings, err := s.GetCurrentSettings()
	if err != nil {
		return err
	}

	// Check if provider with same name already exists
	for _, existing := range settings.AvailableProviderConfigs {
		if existing.ProviderName == provider.ProviderName {
			return fmt.Errorf("provider with name '%s' already exists", provider.ProviderName)
		}
	}

	// Add the new provider
	settings.AvailableProviderConfigs = append(settings.AvailableProviderConfigs, *provider)
	return s.SetSettings(settings)
}

func (s *settingsServiceStruct) UpdateCustomProvider(provider *models.ProviderConfig) error {
	if provider == nil {
		return fmt.Errorf("provider cannot be nil")
	}
	if provider.ProviderType != models.ProviderTypeCustom {
		return fmt.Errorf("only custom providers can be updated")
	}
	if provider.ProviderName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}

	settings, err := s.GetCurrentSettings()
	if err != nil {
		return err
	}

	// Find and update the provider
	found := false
	for i, existing := range settings.AvailableProviderConfigs {
		if existing.ProviderName == provider.ProviderName {
			settings.AvailableProviderConfigs[i] = *provider
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("provider with name '%s' not found", provider.ProviderName)
	}

	return s.SetSettings(settings)
}

func (s *settingsServiceStruct) DeleteCustomProvider(providerName string) error {
	if providerName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}

	settings, err := s.GetCurrentSettings()
	if err != nil {
		return err
	}

	// Check if we're trying to delete the current provider
	if settings.CurrentProviderConfig.ProviderName == providerName {
		return fmt.Errorf("cannot delete currently active provider")
	}

	// Find and remove the provider
	newProviders := make([]models.ProviderConfig, 0)
	found := false
	for _, provider := range settings.AvailableProviderConfigs {
		if provider.ProviderName == providerName && provider.ProviderType == models.ProviderTypeCustom {
			found = true
			continue
		}
		newProviders = append(newProviders, provider)
	}

	if !found {
		return fmt.Errorf("custom provider with name '%s' not found", providerName)
	}

	settings.AvailableProviderConfigs = newProviders
	return s.SetSettings(settings)
}

func (s *settingsServiceStruct) GetCustomProviders() ([]models.ProviderConfig, error) {
	settings, err := s.GetCurrentSettings()
	if err != nil {
		return nil, err
	}

	customProviders := make([]models.ProviderConfig, 0)
	for _, provider := range settings.AvailableProviderConfigs {
		if provider.ProviderType == models.ProviderTypeCustom {
			customProviders = append(customProviders, provider)
		}
	}

	return customProviders, nil
}

func NewSettingsService() SettingsService {
	return &settingsServiceStruct{}
}
