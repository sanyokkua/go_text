package ui

import (
	"fmt"
	"go_text/internal/backend/core/settings"
	"go_text/internal/backend/core/utils"
	"go_text/internal/backend/models"
	"strings"

	"resty.dev/v3"
)

type AppUISettingsApi interface {
	LoadSettings() (*models.Settings, error)
	SaveSettings(*models.Settings) error
	ResetToDefaultSettings() (*models.Settings, error)

	ValidateProvider(config *models.ProviderConfig, modelName string) (bool, error)

	ValidateModelsRequest(baseUrl, endpoint string, headers map[string]string) (bool, error)
	ValidateCompletionRequest(baseUrl, endpoint, modelName string, headers map[string]string) (bool, error)

	// Custom provider management
	AddCustomProvider(provider *models.ProviderConfig) error
	UpdateCustomProvider(provider *models.ProviderConfig) error
	DeleteCustomProvider(providerName string) error
	GetCustomProviders() ([]models.ProviderConfig, error)
}

type appUISettingsApiStruct struct {
	utilsService    utils.UtilsService
	settingsService settings.SettingsService
	client          *resty.Client
}

func (a *appUISettingsApiStruct) normalizeSettings(cfg *models.Settings) error {
	if cfg == nil {
		return fmt.Errorf("settings cannot be nil")
	}
	cfg.CurrentProviderConfig.BaseUrl = strings.TrimSpace(cfg.CurrentProviderConfig.BaseUrl)
	cfg.CurrentProviderConfig.ModelsEndpoint = strings.TrimSpace(cfg.CurrentProviderConfig.ModelsEndpoint)
	cfg.CurrentProviderConfig.CompletionEndpoint = strings.TrimSpace(cfg.CurrentProviderConfig.CompletionEndpoint)
	cfg.ModelConfig.ModelName = strings.TrimSpace(cfg.ModelConfig.ModelName)
	cfg.LanguageConfig.DefaultInputLanguage = strings.TrimSpace(cfg.LanguageConfig.DefaultInputLanguage)
	cfg.LanguageConfig.DefaultOutputLanguage = strings.TrimSpace(cfg.LanguageConfig.DefaultOutputLanguage)
	if !strings.HasPrefix(cfg.CurrentProviderConfig.ModelsEndpoint, "/") {
		cfg.CurrentProviderConfig.ModelsEndpoint = "/" + cfg.CurrentProviderConfig.ModelsEndpoint
	}
	if !strings.HasPrefix(cfg.CurrentProviderConfig.CompletionEndpoint, "/") {
		cfg.CurrentProviderConfig.CompletionEndpoint = "/" + cfg.CurrentProviderConfig.CompletionEndpoint
	}
	for strings.HasSuffix(cfg.CurrentProviderConfig.BaseUrl, "/") {
		cfg.CurrentProviderConfig.BaseUrl = strings.TrimSuffix(cfg.CurrentProviderConfig.BaseUrl, "/")
	}
	for strings.HasSuffix(cfg.CurrentProviderConfig.ModelsEndpoint, "/") {
		cfg.CurrentProviderConfig.ModelsEndpoint = strings.TrimSuffix(cfg.CurrentProviderConfig.ModelsEndpoint, "/")
	}
	for strings.HasSuffix(cfg.CurrentProviderConfig.CompletionEndpoint, "/") {
		cfg.CurrentProviderConfig.CompletionEndpoint = strings.TrimSuffix(cfg.CurrentProviderConfig.CompletionEndpoint, "/")
	}

	// Set default provider type if not specified
	if cfg.CurrentProviderConfig.ProviderType == "" {
		cfg.CurrentProviderConfig.ProviderType = models.ProviderTypeCustom
	}

	return nil
}
func (a *appUISettingsApiStruct) tryInjectModelIfNeeded(cfg *models.Settings) {
	modelsList, err := a.utilsService.MakeLLMModelListRequest(a.client, cfg.CurrentProviderConfig.BaseUrl, cfg.CurrentProviderConfig.ModelsEndpoint, cfg.CurrentProviderConfig.Headers)
	if err != nil {
		return // List of models can't be returned, so no sense to continue
	}

	if !a.utilsService.IsBlankString(cfg.ModelConfig.ModelName) { // If there is a model in config - check if it is available
		for _, item := range modelsList.Data {
			if item.ID == cfg.ModelConfig.ModelName {
				// Check that model from config is available in the provider and stop processing if everything is OK
				return
			}
		}
	}

	model, err := a.findFirstModel(&cfg.CurrentProviderConfig)
	if err != nil {
		return
	}
	cfg.ModelConfig.ModelName = model
	return
}

// VerifyProviderAvailability checks if a provider is available by testing the models endpoint
func (a *appUISettingsApiStruct) VerifyProviderAvailability(baseUrl, modelsEndpoint string, headers map[string]string) (bool, error) {
	if a.utilsService.IsBlankString(baseUrl) {
		return false, fmt.Errorf("baseUrl cannot be blank")
	}
	if a.utilsService.IsBlankString(modelsEndpoint) {
		return false, fmt.Errorf("models endpoint cannot be blank")
	}

	_, err := a.utilsService.MakeLLMModelListRequest(a.client, baseUrl, modelsEndpoint, headers)
	return err == nil, err
}

func (a *appUISettingsApiStruct) LoadSettings() (*models.Settings, error) {
	currentSettings, err := a.settingsService.GetCurrentSettings()
	if err != nil {
		return &models.Settings{}, err
	}
	err = a.normalizeSettings(currentSettings)
	if err != nil {
		return &models.Settings{}, err
	}

	// Handle backward compatibility: if ProviderType is not set, assume custom
	if currentSettings.CurrentProviderConfig.ProviderType == "" {
		currentSettings.CurrentProviderConfig.ProviderType = models.ProviderTypeCustom
	}

	a.tryInjectModelIfNeeded(currentSettings)
	return currentSettings, err
}
func (a *appUISettingsApiStruct) SaveSettings(settings *models.Settings) error {
	err := a.normalizeSettings(settings)
	if err != nil {
		return err
	}

	isValidSettings, err := a.utilsService.IsSettingsValid(settings)
	if !isValidSettings {
		return err
	}

	return a.settingsService.SetSettings(settings)
}
func (a *appUISettingsApiStruct) ResetToDefaultSettings() (*models.Settings, error) {
	defaultSettings, err := a.settingsService.GetDefaultSettings()
	if err != nil {
		return &models.Settings{}, err
	}
	err = a.settingsService.SetSettings(defaultSettings)
	if err != nil {
		return &models.Settings{}, err
	}

	a.tryInjectModelIfNeeded(defaultSettings)
	return defaultSettings, nil
}
func (a *appUISettingsApiStruct) ValidateModelsRequest(baseUrl, endpoint string, headers map[string]string) (bool, error) {
	if a.utilsService.IsBlankString(baseUrl) {
		return false, fmt.Errorf("baseUrl cannot be blank")
	}
	if a.utilsService.IsBlankString(endpoint) {
		return false, fmt.Errorf("models endpoint cannot be blank")
	}

	_, err := a.utilsService.MakeLLMModelListRequest(a.client, baseUrl, endpoint, headers)

	return err == nil, err

}
func (a *appUISettingsApiStruct) ValidateCompletionRequest(baseUrl, endpoint, modelName string, headers map[string]string) (bool, error) {
	if a.utilsService.IsBlankString(baseUrl) {
		return false, fmt.Errorf("baseUrl cannot be blank")
	}
	if a.utilsService.IsBlankString(endpoint) {
		return false, fmt.Errorf("completion endpoint cannot be blank")
	}

	request := models.NewChatCompletionRequest(modelName, "Say: Hello World", "You are an echo server", 0, true)
	_, err := a.utilsService.MakeLLMCompletionRequest(a.client, baseUrl, endpoint, headers, &request)

	return err == nil, err
}

func (a *appUISettingsApiStruct) findFirstModel(config *models.ProviderConfig) (string, error) {
	var _, err = a.ValidateModelsRequest(config.ModelsEndpoint, config.ModelsEndpoint, config.Headers)
	if err != nil {
		return "", err // List of models can't be returned, so no sense to continue
	}

	modelsList, err := a.utilsService.MakeLLMModelListRequest(a.client, config.BaseUrl, config.ModelsEndpoint, config.Headers)

	if err != nil {
		return "", err
	}

	if len(modelsList.Data) == 0 {
		return "", fmt.Errorf("no models found")
	}

	if a.utilsService.IsBlankString(modelsList.Data[0].ID) {
		return "", fmt.Errorf("model name/id is blank")
	}

	return modelsList.Data[0].ID, nil
}

func (a *appUISettingsApiStruct) ValidateProvider(config *models.ProviderConfig, modelName string) (bool, error) {
	if config == nil {
		return false, fmt.Errorf("provider config is nil")
	}
	if a.utilsService.IsBlankString(config.ProviderName) {
		return false, fmt.Errorf("provider name cannot be blank")
	}
	if a.utilsService.IsBlankString(string(config.ProviderType)) {
		return false, fmt.Errorf("provider type cannot be blank")
	}
	if a.utilsService.IsBlankString(config.BaseUrl) {
		return false, fmt.Errorf("baseUrl cannot be blank")
	}
	if a.utilsService.IsBlankString(config.ModelsEndpoint) {
		return false, fmt.Errorf("models endpoint cannot be blank")
	}
	if a.utilsService.IsBlankString(config.CompletionEndpoint) {
		return false, fmt.Errorf("completion endpoint cannot be blank")
	}

	var _, err = a.ValidateModelsRequest(config.ModelsEndpoint, config.ModelsEndpoint, config.Headers)
	if err != nil {
		return false, err
	}

	var modelId string
	if a.utilsService.IsBlankString(modelName) {
		modelId, err = a.findFirstModel(config)
		if err != nil {
			return false, err
		}
	}
	_, err = a.ValidateCompletionRequest(config.BaseUrl, config.CompletionEndpoint, modelId, config.Headers)
	if err != nil {
		return false, err
	}

	return true, nil
}

// Custom provider management methods
func (a *appUISettingsApiStruct) AddCustomProvider(provider *models.ProviderConfig) error {
	// Validate the provider first
	if provider == nil {
		return fmt.Errorf("provider cannot be nil")
	}

	// Ensure it's a custom provider
	if provider.ProviderType != models.ProviderTypeCustom {
		return fmt.Errorf("only custom providers can be added")
	}

	// Validate required fields
	if provider.ProviderName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}
	if provider.BaseUrl == "" {
		return fmt.Errorf("base URL cannot be empty")
	}
	if provider.ModelsEndpoint == "" {
		return fmt.Errorf("models endpoint cannot be empty")
	}
	if provider.CompletionEndpoint == "" {
		return fmt.Errorf("completion endpoint cannot be empty")
	}

	// Validate that the provider is actually reachable
	isValid, err := a.VerifyProviderAvailability(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers)
	if !isValid {
		return fmt.Errorf("provider validation failed: %v", err)
	}

	// Delegate to settings service
	return a.settingsService.AddCustomProvider(provider)
}

func (a *appUISettingsApiStruct) UpdateCustomProvider(provider *models.ProviderConfig) error {
	// Validate the provider first
	if provider == nil {
		return fmt.Errorf("provider cannot be nil")
	}

	// Ensure it's a custom provider
	if provider.ProviderType != models.ProviderTypeCustom {
		return fmt.Errorf("only custom providers can be updated")
	}

	// Validate required fields
	if provider.ProviderName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}
	if provider.BaseUrl == "" {
		return fmt.Errorf("base URL cannot be empty")
	}
	if provider.ModelsEndpoint == "" {
		return fmt.Errorf("models endpoint cannot be empty")
	}
	if provider.CompletionEndpoint == "" {
		return fmt.Errorf("completion endpoint cannot be empty")
	}

	// Validate that the provider is actually reachable
	isValid, err := a.VerifyProviderAvailability(provider.BaseUrl, provider.ModelsEndpoint, provider.Headers)
	if !isValid {
		return fmt.Errorf("provider validation failed: %v", err)
	}

	// Delegate to settings service
	return a.settingsService.UpdateCustomProvider(provider)
}

func (a *appUISettingsApiStruct) DeleteCustomProvider(providerName string) error {
	if providerName == "" {
		return fmt.Errorf("provider name cannot be empty")
	}

	// Delegate to settings service
	return a.settingsService.DeleteCustomProvider(providerName)
}

func (a *appUISettingsApiStruct) GetCustomProviders() ([]models.ProviderConfig, error) {
	// Delegate to settings service
	return a.settingsService.GetCustomProviders()
}

func NewAppUISettingsApi(settingsService settings.SettingsService, client *resty.Client, utilsService utils.UtilsService) AppUISettingsApi {
	return &appUISettingsApiStruct{
		utilsService:    utilsService,
		settingsService: settingsService,
		client:          client,
	}
}
