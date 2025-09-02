package ui

import (
	"fmt"
	llmConstants "go_text/internal/backend/constants/llm"
	settingsInterface "go_text/internal/backend/interfaces/settings"
	"go_text/internal/backend/interfaces/ui"
	"go_text/internal/backend/models/llm"
	"go_text/internal/backend/models/settings"
	"strings"
	"time"

	"resty.dev/v3"
)

type appUISettingsApiStruct struct {
	settingsService settingsInterface.SettingsService
}

func (a *appUISettingsApiStruct) LoadSettings() (settings.Settings, error) {
	currentSettings, err := a.settingsService.GetCurrentSettings()
	if err != nil {
		return settings.Settings{}, err
	}

	return currentSettings, nil
}

func (a *appUISettingsApiStruct) SaveSettings(settings settings.Settings) error {
	err := a.settingsService.SetSettings(settings)
	if err != nil {
		return err
	}
	return nil
}

func (a *appUISettingsApiStruct) ResetToDefaultSettings() (settings.Settings, error) {
	defaultSettings, err := a.settingsService.GetDefaultSettings()
	if err != nil {
		return settings.Settings{}, err
	}
	err = a.settingsService.SetSettings(defaultSettings)
	if err != nil {
		return settings.Settings{}, err
	}
	return defaultSettings, nil
}

func (a *appUISettingsApiStruct) ValidateConnection(baseUrl string, headers map[string]string) (bool, error) {
	if strings.TrimSpace(baseUrl) == "" {
		return false, nil
	}

	fullUrl := baseUrl + llmConstants.OpenAICompatibleGetModels

	client := resty.New()
	defer func(client *resty.Client) {
		err := client.Close()
		if err != nil {

		}
	}(client)

	var response llm.ModelListResponse

	// Make the POST request
	resp, err := client.R().
		// Set content type and accept headers
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetHeaders(headers).
		SetTimeout(time.Minute).
		// Set the response object to unmarshal into
		SetResult(&response).
		// Make the Get request
		Get(fullUrl)

	if err != nil {
		return false, err
	}

	// Check for non-2xx status codes
	if resp.IsError() {
		return false, fmt.Errorf("API request failed with status %d", resp.StatusCode())
	}

	return true, nil
}

func NewAppUISettingsApi(settingsService settingsInterface.SettingsService) ui.AppUISettingsApi {
	return &appUISettingsApiStruct{
		settingsService: settingsService,
	}
}
