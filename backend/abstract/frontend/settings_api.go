package frontend

import (
	"go_text/backend/model/settings"
)

type SettingsApi interface {
	GetSettingsFilePath() string
	GetCurrentSettings() (*settings.Settings, error)
	GetDefaultSettings() (*settings.Settings, error)
	SaveSettings(settings *settings.Settings) (*settings.Settings, error)

	GetProviderTypes() ([]string, error)
	ValidateProvider(config *settings.ProviderConfig, validateHttpCall bool, modelName string) (bool, error)
	CreateNewProvider(config *settings.ProviderConfig, modelName string) (*settings.ProviderConfig, error)
	UpdateProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error)
	DeleteProvider(config *settings.ProviderConfig) (bool, error)
	SelectProvider(config *settings.ProviderConfig) (*settings.ProviderConfig, error)

	GetModelsList(config *settings.ProviderConfig) ([]string, error)
}
