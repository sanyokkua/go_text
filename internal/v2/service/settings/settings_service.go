package settings

import (
	"go_text/internal/v2/model/settings"
)

type settingsService struct {
}

func (s settingsService) GetProviderTypes() ([]string, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) GetCurrentSettings() (*settings.Settings, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) GetDefaultSettings() (*settings.Settings, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) SaveSettings(settings *settings.Settings) (*settings.Settings, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) ValidateProvider(config *settings.ProviderConfig) (bool, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) CreateNewProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) DeleteProvider(config *settings.ProviderConfig) (bool, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) GetModelsList() ([]string, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) GetSettingsFilePath() string {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) ValidateSettings(settings *settings.Settings) error {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) ValidateBaseUrl(baseUrl string) (bool, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) ValidateEndpoint(endpoint string) (bool, error) {
	//TODO implement me
	panic("implement me")
}

func (s settingsService) ValidateTemperature(temperature float64) (bool, error) {
	//TODO implement me
	panic("implement me")
}
