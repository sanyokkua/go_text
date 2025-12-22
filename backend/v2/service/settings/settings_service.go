package settings

import (
	"fmt"
	"strings"
	"time"

	"go_text/backend/v2/backend_api"
	"go_text/backend/v2/constants"
	"go_text/backend/v2/model/llm"
	"go_text/backend/v2/model/settings"
)

type settingsService struct {
	logger           backend_api.LoggingApi
	fileUtilsService backend_api.FileUtilsApi
	llmHttpApi       backend_api.LlmHttpApi
	mapper           backend_api.MapperUtilsApi
}

func (s settingsService) GetProviderTypes() ([]string, error) {
	startTime := time.Now()
	s.logger.LogDebug("[GetProviderTypes] Fetching available provider types")

	providerTypes := []string{
		string(settings.ProviderTypeCustom),
		string(settings.ProviderTypeOllama),
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[GetProviderTypes] Successfully retrieved %d provider types in %v", len(providerTypes), duration))

	return providerTypes, nil
}

func (s settingsService) GetCurrentSettings() (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetCurrentSettings] Loading current settings from file")

	settings, err := s.fileUtilsService.LoadSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetCurrentSettings] Failed to load settings: %v", err))
		return nil, fmt.Errorf("failed to load application settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetCurrentSettings] Successfully loaded settings in %v", duration))

	return settings, nil
}

func (s settingsService) GetDefaultSettings() (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogDebug("[GetDefaultSettings] Retrieving default settings configuration")

	defaultSettings := constants.DefaultSetting
	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[GetDefaultSettings] Successfully retrieved default settings in %v", duration))

	return &defaultSettings, nil
}

func (s settingsService) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	startTime := time.Now()
	s.logger.LogInfo("[SaveSettings] Starting settings save operation")

	if settings == nil {
		errorMsg := "settings cannot be nil"
		s.logger.LogError(fmt.Sprintf("[SaveSettings] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	// Validate settings before saving
	s.logger.LogDebug("[SaveSettings] Validating settings before save")
	err := s.ValidateSettings(settings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SaveSettings] Settings validation failed: %v", err))
		return nil, fmt.Errorf("settings validation failed: %w", err)
	}

	// Save settings
	s.logger.LogDebug("[SaveSettings] Saving validated settings to file")
	err = s.fileUtilsService.SaveSettings(settings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SaveSettings] Failed to save settings: %v", err))
		return nil, fmt.Errorf("failed to persist settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[SaveSettings] Successfully saved settings in %v", duration))

	return settings, nil
}

func (s settingsService) ValidateProvider(config *settings.ProviderConfig, validateHttpCall bool, modelName string) (bool, error) {
	startTime := time.Now()
	s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Starting provider configuration validation with model: %s", modelName))

	if config == nil {
		errorMsg := "provider config is nil"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if strings.TrimSpace(config.ProviderName) == "" {
		errorMsg := "provider name cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if config.ProviderType == "" {
		errorMsg := "provider type cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if strings.TrimSpace(config.BaseUrl) == "" {
		errorMsg := "baseUrl cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if strings.TrimSpace(config.ModelsEndpoint) == "" {
		errorMsg := "models endpoint cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if strings.TrimSpace(config.CompletionEndpoint) == "" {
		errorMsg := "completion endpoint cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	// Basic URL validation
	if !strings.HasPrefix(config.BaseUrl, "http://") && !strings.HasPrefix(config.BaseUrl, "https://") {
		errorMsg := "baseUrl must start with http:// or https://"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	// Basic endpoint validation
	if !strings.HasPrefix(config.ModelsEndpoint, "/") {
		errorMsg := "models endpoint must start with /"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}
	if !strings.HasPrefix(config.CompletionEndpoint, "/") {
		errorMsg := "completion endpoint must start with /"
		s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	if validateHttpCall {
		// Test actual API endpoints connectivity
		s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Testing API endpoints for provider '%s'", config.ProviderName))

		// Test models endpoint
		modelsResponse, err := s.llmHttpApi.ModelListRequest(config.BaseUrl, config.ModelsEndpoint, config.Headers)
		if err != nil {
			errorMsg := fmt.Sprintf("failed to connect to models endpoint: %v", err)
			s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
			return false, fmt.Errorf("validation error: %s", errorMsg)
		}

		// Extract model list from response
		var modelsList []string
		if modelsResponse.Data != nil {
			for _, model := range modelsResponse.Data {
				modelsList = append(modelsList, model.ID)
			}
		}

		if len(modelsList) == 0 {
			errorMsg := "no models found in models endpoint response"
			s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
			return false, fmt.Errorf("validation error: %s", errorMsg)
		}

		s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Found %d models from models endpoint", len(modelsList)))

		// Test completion endpoint with a model
		// Use provided modelName if available, otherwise use first model from list
		testModel := modelName
		if testModel == "" && len(modelsList) > 0 {
			testModel = modelsList[0]
		}

		if testModel == "" {
			errorMsg := "no model available for completion endpoint testing"
			s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
			return false, fmt.Errorf("validation error: %s", errorMsg)
		}

		completionUrl := fmt.Sprintf("%s%s", strings.TrimSuffix(config.BaseUrl, "/"), config.CompletionEndpoint)
		s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Testing completion endpoint with model '%s': %s", testModel, completionUrl))

		// Create a simple completion request
		completionRequest := &llm.ChatCompletionRequest{
			Model: testModel,
			Messages: []llm.Message{
				{
					Role:    "user",
					Content: "Give me one random word",
				},
			},
		}

		_, err = s.llmHttpApi.CompletionRequest(config.BaseUrl, config.CompletionEndpoint, config.Headers, completionRequest)
		if err != nil {
			errorMsg := fmt.Sprintf("failed to connect to completion endpoint: %v", err)
			s.logger.LogError(fmt.Sprintf("[ValidateProvider] %s", errorMsg))
			return false, fmt.Errorf("validation error: %s", errorMsg)
		}
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateProvider] Successfully validated provider '%s' in %v", config.ProviderName, duration))

	return true, nil
}

func (s settingsService) CreateNewProvider(config *settings.ProviderConfig, modelName string) (*settings.ProviderConfig, error) {
	startTime := time.Now()
	s.logger.LogInfo(fmt.Sprintf("[CreateNewProvider] Creating new provider: %s", config.ProviderName))

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	// Validate the provider
	s.logger.LogDebug(fmt.Sprintf("[CreateNewProvider] Validating provider configuration for '%s'", config.ProviderName))
	isValid, err := s.ValidateProvider(config, true, modelName)
	if !isValid {
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] Provider validation failed for '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("provider validation failed: %w", err)
	}

	// Load current settings
	s.logger.LogDebug("[CreateNewProvider] Loading current settings")
	currentSettings, err := s.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] Failed to load current settings: %v", err))
		return nil, fmt.Errorf("failed to load settings: %w", err)
	}

	// Check if provider with same name already exists
	s.logger.LogDebug(fmt.Sprintf("[CreateNewProvider] Checking for existing provider with name '%s'", config.ProviderName))
	for _, existing := range currentSettings.AvailableProviderConfigs {
		if existing.ProviderName == config.ProviderName {
			errorMsg := fmt.Sprintf("provider with name '%s' already exists", config.ProviderName)
			s.logger.LogError(fmt.Sprintf("[CreateNewProvider] %s", errorMsg))
			return nil, fmt.Errorf("duplicate provider: %s", errorMsg)
		}
	}

	// Add the new provider
	s.logger.LogDebug(fmt.Sprintf("[CreateNewProvider] Adding new provider '%s' to available providers", config.ProviderName))
	currentSettings.AvailableProviderConfigs = append(currentSettings.AvailableProviderConfigs, *config)

	// Save the updated settings
	s.logger.LogDebug("[CreateNewProvider] Saving updated settings with new provider")
	_, err = s.SaveSettings(currentSettings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[CreateNewProvider] Failed to save settings with new provider: %v", err))
		return nil, fmt.Errorf("failed to persist settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[CreateNewProvider] Successfully created provider '%s' in %v", config.ProviderName, duration))

	return config, nil
}

func (s settingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[UpdateProvider] Updating provider: %s", config.ProviderName))

	// Validate the provider
	s.logger.LogDebug(fmt.Sprintf("[UpdateProvider] Validating provider configuration for '%s'", config.ProviderName))
	isValid, err := s.ValidateProvider(config, true, "")
	if !isValid {
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] Provider validation failed for '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("provider validation failed: %w", err)
	}

	// Load current settings
	s.logger.LogDebug("[UpdateProvider] Loading current settings")
	currentSettings, err := s.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] Failed to load current settings: %v", err))
		return nil, fmt.Errorf("failed to load settings: %w", err)
	}

	// Find and update the provider
	s.logger.LogDebug(fmt.Sprintf("[UpdateProvider] Searching for provider '%s' to update", config.ProviderName))
	found := false
	for i, existing := range currentSettings.AvailableProviderConfigs {
		if existing.ProviderName == config.ProviderName {
			s.logger.LogDebug(fmt.Sprintf("[UpdateProvider] Found provider '%s' at index %d, updating configuration", config.ProviderName, i))
			currentSettings.AvailableProviderConfigs[i] = *config
			found = true
			break
		}
	}

	if !found {
		errorMsg := fmt.Sprintf("provider with name '%s' not found", config.ProviderName)
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] %s", errorMsg))
		return nil, fmt.Errorf("provider not found: %s", errorMsg)
	}

	// Save the updated settings
	s.logger.LogDebug("[UpdateProvider] Saving updated settings")
	_, err = s.SaveSettings(currentSettings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[UpdateProvider] Failed to save updated settings: %v", err))
		return nil, fmt.Errorf("failed to persist settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[UpdateProvider] Successfully updated provider '%s' in %v", config.ProviderName, duration))

	return config, nil
}

func (s settingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	startTime := time.Now()
	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}
	s.logger.LogInfo(fmt.Sprintf("[DeleteProvider] Deleting provider: %s", config.ProviderName))

	if strings.TrimSpace(config.ProviderName) == "" {
		errorMsg := "provider name cannot be empty"
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("invalid input: %s", errorMsg)
	}

	// Load current settings
	s.logger.LogDebug("[DeleteProvider] Loading current settings")
	currentSettings, err := s.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] Failed to load current settings: %v", err))
		return false, fmt.Errorf("failed to load settings: %w", err)
	}

	// Check if we're trying to delete the current provider
	s.logger.LogDebug(fmt.Sprintf("[DeleteProvider] Checking if '%s' is the current active provider", config.ProviderName))
	if currentSettings.CurrentProviderConfig.ProviderName == config.ProviderName {
		errorMsg := "cannot delete currently active provider"
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("operation not allowed: %s", errorMsg)
	}

	// Find and remove the provider
	s.logger.LogDebug(fmt.Sprintf("[DeleteProvider] Searching for provider '%s' to delete", config.ProviderName))
	newProviders := make([]settings.ProviderConfig, 0)
	found := false
	for _, provider := range currentSettings.AvailableProviderConfigs {
		if provider.ProviderName == config.ProviderName {
			s.logger.LogDebug(fmt.Sprintf("[DeleteProvider] Found provider '%s' to delete", config.ProviderName))
			found = true
			continue
		}
		newProviders = append(newProviders, provider)
	}

	if !found {
		errorMsg := fmt.Sprintf("provider with name '%s' not found", config.ProviderName)
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] %s", errorMsg))
		return false, fmt.Errorf("provider not found: %s", errorMsg)
	}

	currentSettings.AvailableProviderConfigs = newProviders
	s.logger.LogDebug(fmt.Sprintf("[DeleteProvider] Removed provider '%s', %d providers remaining", config.ProviderName, len(newProviders)))

	// Save the updated settings
	s.logger.LogDebug("[DeleteProvider] Saving updated settings after deletion")
	_, err = s.SaveSettings(currentSettings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[DeleteProvider] Failed to save settings after deletion: %v", err))
		return false, fmt.Errorf("failed to persist settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[DeleteProvider] Successfully deleted provider '%s' in %v", config.ProviderName, duration))

	return true, nil
}

func (s settingsService) SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	startTime := time.Now()

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[SelectProvider] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	s.logger.LogInfo(fmt.Sprintf("[SelectProvider] Selecting provider: %s", config.ProviderName))

	// Validate the provider
	s.logger.LogDebug(fmt.Sprintf("[SelectProvider] Validating provider configuration for '%s'", config.ProviderName))
	isValid, err := s.ValidateProvider(config, false, "")
	if !isValid {
		s.logger.LogError(fmt.Sprintf("[SelectProvider] Provider validation failed for '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("provider validation failed: %w", err)
	}

	// Load current settings
	s.logger.LogDebug("[SelectProvider] Loading current settings")
	currentSettings, err := s.GetCurrentSettings()
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SelectProvider] Failed to load current settings: %v", err))
		return nil, fmt.Errorf("failed to load settings: %w", err)
	}

	// Find and update the provider
	s.logger.LogDebug(fmt.Sprintf("[SelectProvider] Searching for provider '%s' to update", config.ProviderName))
	found := false
	for i, existing := range currentSettings.AvailableProviderConfigs {
		if existing.ProviderName == config.ProviderName {
			s.logger.LogDebug(fmt.Sprintf("[SelectProvider] Found provider '%s' at index %d, updating configuration", config.ProviderName, i))
			found = true
			break
		}
	}

	if !found {
		errorMsg := fmt.Sprintf("provider with name '%s' not found", config.ProviderName)
		s.logger.LogError(fmt.Sprintf("[SelectProvider] %s", errorMsg))
		return nil, fmt.Errorf("provider not found: %s", errorMsg)
	}

	// Provider found then we can assign it to current
	currentSettings.CurrentProviderConfig = *config

	// Save the updated settings
	s.logger.LogDebug("[SelectProvider] Saving updated settings")

	_, err = s.SaveSettings(currentSettings)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[SelectProvider] Failed to save updated settings: %v", err))
		return nil, fmt.Errorf("failed to persist settings: %w", err)
	}

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[SelectProvider] Successfully updated provider '%s' in %v", config.ProviderName, duration))

	return config, nil
}

func (s settingsService) GetModelsList(config *settings.ProviderConfig) ([]string, error) {
	startTime := time.Now()
	s.logger.LogInfo("[GetModelsList] Fetching available models")

	if config == nil {
		errorMsg := "provider config cannot be nil"
		s.logger.LogError(fmt.Sprintf("[GetModelsList] %s", errorMsg))
		return nil, fmt.Errorf("invalid input: %s", errorMsg)
	}

	// Validate the provider
	s.logger.LogDebug(fmt.Sprintf("[GetModelsList] Validating provider configuration for '%s'", config.ProviderName))
	isValid, err := s.ValidateProvider(config, false, "")
	if !isValid {
		s.logger.LogError(fmt.Sprintf("[GetModelsList] Provider validation failed for '%s': %v", config.ProviderName, err))
		return nil, fmt.Errorf("provider validation failed: %w", err)
	}

	models, err := s.llmHttpApi.ModelListRequest(config.BaseUrl, config.ModelsEndpoint, config.Headers)
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[GetModelsList] Failed to get models list: %v", err))
		return nil, fmt.Errorf("failed to get models list: %w", err)
	}

	modelsList := s.mapper.MapModelNames(models)

	duration := time.Since(startTime)
	s.logger.LogInfo(fmt.Sprintf("[GetModelsList] Successfully retrieved %d models in %v", len(modelsList), duration))

	return modelsList, nil
}

func (s settingsService) GetSettingsFilePath() string {
	startTime := time.Now()
	s.logger.LogDebug("[GetSettingsFilePath] Retrieving settings file path")

	filePath := s.fileUtilsService.GetSettingsFilePath()

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[GetSettingsFilePath] Retrieved settings file path in %v", duration))

	return filePath
}

func (s settingsService) ValidateSettings(settings *settings.Settings) error {
	startTime := time.Now()
	s.logger.LogDebug("[ValidateSettings] Starting comprehensive settings validation")

	if settings == nil {
		errorMsg := "settings cannot be nil"
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	// Validate current provider
	s.logger.LogDebug("[ValidateSettings] Validating current provider configuration")
	_, err := s.ValidateProvider(&settings.CurrentProviderConfig, false, "")
	if err != nil {
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] Current provider validation failed: %v", err))
		return fmt.Errorf("current provider validation failed: %w", err)
	}

	// Validate available providers
	s.logger.LogDebug(fmt.Sprintf("[ValidateSettings] Validating %d available providers", len(settings.AvailableProviderConfigs)))
	for _, provider := range settings.AvailableProviderConfigs {
		s.logger.LogDebug(fmt.Sprintf("[ValidateSettings] Validating provider '%s'", provider.ProviderName))
		_, err := s.ValidateProvider(&provider, false, "")
		if err != nil {
			s.logger.LogError(fmt.Sprintf("[ValidateSettings] Provider '%s' validation failed: %v", provider.ProviderName, err))
			return fmt.Errorf("provider '%s' validation failed: %w", provider.ProviderName, err)
		}
	}

	// Validate model config
	s.logger.LogDebug("[ValidateSettings] Validating model configuration")
	if settings.ModelConfig.IsTemperatureEnabled {
		s.logger.LogDebug(fmt.Sprintf("[ValidateSettings] Validating temperature value: %.2f", settings.ModelConfig.Temperature))
		_, err := s.ValidateTemperature(settings.ModelConfig.Temperature)
		if err != nil {
			s.logger.LogError(fmt.Sprintf("[ValidateSettings] Temperature validation failed: %v", err))
			return fmt.Errorf("temperature validation failed: %w", err)
		}
	}

	// Validate language config
	s.logger.LogDebug("[ValidateSettings] Validating language configuration")
	if len(settings.LanguageConfig.Languages) == 0 {
		errorMsg := "at least one language must be configured"
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	if strings.TrimSpace(settings.LanguageConfig.DefaultInputLanguage) == "" {
		errorMsg := "default input language cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	if strings.TrimSpace(settings.LanguageConfig.DefaultOutputLanguage) == "" {
		errorMsg := "default output language cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	// Check if default languages are in the available languages list
	s.logger.LogDebug("[ValidateSettings] Verifying default languages exist in available languages")
	inputLangFound := false
	outputLangFound := false
	for _, lang := range settings.LanguageConfig.Languages {
		if lang == settings.LanguageConfig.DefaultInputLanguage {
			inputLangFound = true
		}
		if lang == settings.LanguageConfig.DefaultOutputLanguage {
			outputLangFound = true
		}
	}

	if !inputLangFound {
		errorMsg := fmt.Sprintf("default input language '%s' not found in available languages", settings.LanguageConfig.DefaultInputLanguage)
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	if !outputLangFound {
		errorMsg := fmt.Sprintf("default output language '%s' not found in available languages", settings.LanguageConfig.DefaultOutputLanguage)
		s.logger.LogError(fmt.Sprintf("[ValidateSettings] %s", errorMsg))
		return fmt.Errorf("validation error: %s", errorMsg)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateSettings] Successfully validated all settings in %v", duration))

	return nil
}

func (s settingsService) ValidateBaseUrl(baseUrl string) (bool, error) {
	startTime := time.Now()
	s.logger.LogDebug(fmt.Sprintf("[ValidateBaseUrl] Validating base URL: %.50s", baseUrl))

	if strings.TrimSpace(baseUrl) == "" {
		errorMsg := "baseUrl cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateBaseUrl] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	if !strings.HasPrefix(baseUrl, "http://") && !strings.HasPrefix(baseUrl, "https://") {
		errorMsg := "baseUrl must start with http:// or https://"
		s.logger.LogError(fmt.Sprintf("[ValidateBaseUrl] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateBaseUrl] Successfully validated base URL in %v", duration))

	return true, nil
}

func (s settingsService) ValidateEndpoint(endpoint string) (bool, error) {
	startTime := time.Now()
	s.logger.LogDebug(fmt.Sprintf("[ValidateEndpoint] Validating endpoint: %.50s", endpoint))

	if strings.TrimSpace(endpoint) == "" {
		errorMsg := "endpoint cannot be blank"
		s.logger.LogError(fmt.Sprintf("[ValidateEndpoint] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	if !strings.HasPrefix(endpoint, "/") {
		errorMsg := "endpoint must start with /"
		s.logger.LogError(fmt.Sprintf("[ValidateEndpoint] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateEndpoint] Successfully validated endpoint in %v", duration))

	return true, nil
}

func (s settingsService) ValidateTemperature(temperature float64) (bool, error) {
	startTime := time.Now()
	s.logger.LogDebug(fmt.Sprintf("[ValidateTemperature] Validating temperature value: %.2f", temperature))

	// Temperature should be between 0 and 1 (typical range for LLM temperature)
	if temperature < 0 || temperature > 1 {
		errorMsg := "temperature must be between 0 and 1"
		s.logger.LogError(fmt.Sprintf("[ValidateTemperature] %s", errorMsg))
		return false, fmt.Errorf("validation error: %s", errorMsg)
	}

	duration := time.Since(startTime)
	s.logger.LogDebug(fmt.Sprintf("[ValidateTemperature] Successfully validated temperature in %v", duration))

	return true, nil
}

func NewSettingsService(
	logger backend_api.LoggingApi,
	fileUtilsService backend_api.FileUtilsApi,
	llmHttpApi backend_api.LlmHttpApi,
	mapper backend_api.MapperUtilsApi) backend_api.SettingsServiceApi {
	return &settingsService{
		logger:           logger,
		fileUtilsService: fileUtilsService,
		llmHttpApi:       llmHttpApi,
		mapper:           mapper,
	}
}
