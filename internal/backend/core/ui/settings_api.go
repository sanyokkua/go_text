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
	ValidateModelsRequest(baseUrl, endpoint string, headers map[string]string) (bool, error)
	ValidateCompletionRequest(baseUrl, endpoint, modelName string, headers map[string]string) (bool, error)
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
	cfg.BaseUrl = strings.TrimSpace(cfg.BaseUrl)
	cfg.ModelName = strings.TrimSpace(cfg.ModelName)
	cfg.ModelsEndpoint = strings.TrimSpace(cfg.ModelsEndpoint)
	cfg.CompletionEndpoint = strings.TrimSpace(cfg.CompletionEndpoint)
	cfg.DefaultInputLanguage = strings.TrimSpace(cfg.DefaultInputLanguage)
	cfg.DefaultOutputLanguage = strings.TrimSpace(cfg.DefaultOutputLanguage)
	if !strings.HasPrefix(cfg.ModelsEndpoint, "/") {
		cfg.ModelsEndpoint = "/" + cfg.ModelsEndpoint
	}
	if !strings.HasPrefix(cfg.CompletionEndpoint, "/") {
		cfg.CompletionEndpoint = "/" + cfg.CompletionEndpoint
	}
	for strings.HasSuffix(cfg.BaseUrl, "/") {
		cfg.BaseUrl = strings.TrimSuffix(cfg.BaseUrl, "/")
	}
	for strings.HasSuffix(cfg.ModelsEndpoint, "/") {
		cfg.ModelsEndpoint = strings.TrimSuffix(cfg.ModelsEndpoint, "/")
	}
	for strings.HasSuffix(cfg.CompletionEndpoint, "/") {
		cfg.CompletionEndpoint = strings.TrimSuffix(cfg.CompletionEndpoint, "/")
	}
	return nil
}
func (a *appUISettingsApiStruct) tryInjectModelIfNeeded(cfg *models.Settings) {
	modelsList, err := a.utilsService.MakeLLMModelListRequest(a.client, cfg.BaseUrl, cfg.ModelsEndpoint, cfg.Headers)
	if err != nil {
		return // List of models can't be returned, so no sense to continue
	}

	if !a.utilsService.IsBlankString(cfg.ModelName) { // If there is a model in config - check if it is available
		for _, item := range modelsList.Data {
			if item.ID == cfg.ModelName {
				// Check that model from config is available in the provider and stop processing if everything is OK
				return
			}
		}
	}

	// Model is blank, so try to get any model from available models
	if len(modelsList.Data) > 0 {
		modelId := modelsList.Data[0].ID
		cfg.ModelName = modelId
	}
	return
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

	isValid, err := a.ValidateModelsRequest(settings.BaseUrl, settings.ModelsEndpoint, settings.Headers)
	if !isValid {
		return fmt.Errorf("cannot save settings: base url validation failed: %v", err)
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

func NewAppUISettingsApi(settingsService settings.SettingsService, client *resty.Client, utilsService utils.UtilsService) AppUISettingsApi {
	return &appUISettingsApiStruct{
		utilsService:    utilsService,
		settingsService: settingsService,
		client:          client,
	}
}
