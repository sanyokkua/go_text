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
	LoadSettings() (models.Settings, error)
	SaveSettings(models.Settings) error
	ResetToDefaultSettings() (models.Settings, error)
	ValidateConnection(baseUrl string, headers map[string]string) (bool, error)
}

type appUISettingsApiStruct struct {
	utilsService    utils.UtilsService
	settingsService settings.SettingsService
	client          *resty.Client
}

func (a *appUISettingsApiStruct) LoadSettings() (models.Settings, error) {
	return a.settingsService.GetCurrentSettings()
}

func (a *appUISettingsApiStruct) SaveSettings(settings models.Settings) error {
	if strings.TrimSpace(settings.BaseUrl) == "" {
		return fmt.Errorf("cannot save settings: base url is empty")
	}
	if strings.HasSuffix(settings.BaseUrl, "/") {
		return fmt.Errorf("baseUrl must not end with /")
	}
	if !(strings.HasPrefix(settings.BaseUrl, "http://") || strings.HasPrefix(settings.BaseUrl, "https://")) {
		return fmt.Errorf("baseUrl must start with http:// or https://")
	}
	if strings.TrimSpace(settings.ModelName) == "" {
		return fmt.Errorf("modelName must not be empty")
	}
	if strings.TrimSpace(settings.DefaultInputLanguage) == "" {
		return fmt.Errorf("defaultInputLanguage must not be empty")
	}
	if strings.TrimSpace(settings.DefaultOutputLanguage) == "" {
		return fmt.Errorf("defaultOutputLanguage must not be empty")
	}

	isValid, err := a.ValidateConnection(settings.BaseUrl, settings.Headers)
	if !isValid {
		return fmt.Errorf("cannot save settings: base url validation failed: %v", err)
	}
	return a.settingsService.SetSettings(settings)
}

func (a *appUISettingsApiStruct) ResetToDefaultSettings() (models.Settings, error) {
	defaultSettings, err := a.settingsService.GetDefaultSettings()
	if err != nil {
		return models.Settings{}, err
	}
	err = a.settingsService.SetSettings(defaultSettings)
	if err != nil {
		return models.Settings{}, err
	}
	return defaultSettings, nil
}

func (a *appUISettingsApiStruct) ValidateConnection(baseUrl string, headers map[string]string) (bool, error) {
	if a.utilsService.IsBlankString(baseUrl) {
		return false, nil
	}

	_, err := a.utilsService.MakeLLMModelListRequest(a.client, baseUrl, headers)

	return err == nil, err
}

func NewAppUISettingsApi(settingsService settings.SettingsService, client *resty.Client, utilsService utils.UtilsService) AppUISettingsApi {
	return &appUISettingsApiStruct{
		utilsService:    utilsService,
		settingsService: settingsService,
		client:          client,
	}
}
